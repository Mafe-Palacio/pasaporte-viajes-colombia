/**
 * Sincroniza los viajes con el servidor.
 *
 * La pantalla guarda cada cambio al instante en memoria (por eso el uso se siente rápido) y este motor
 * espera un momento a que el usuario termine de escribir, compara con lo que ya hay en el servidor y
 * envía solo lo que cambió: viaje, gastos y fotos.
 */
import type { TripEntry, TripPhoto } from '../types';
import * as api from './api';
import { getTrackedFile, releaseTrackedFile } from './photoFiles';

interface Snapshot {
    scalars: string; // el viaje serializado, para detectar cambios
    expenses: Map<string, string>; // id -> huella del gasto
    photoIds: Set<string>;
}

interface Deps {
    getTrip: (id: string) => TripEntry | undefined;
    getAllTripIds: () => string[];
    codeById: Map<string, string>;
    /** Cuando una foto local se sube, reemplazarla en el estado por la foto del servidor. */
    onPhotoUploaded: (tripId: string, localPhotoId: string, saved: TripPhoto) => void;
    onError: (error: unknown) => void;
    onPendingChange: (count: number) => void;
}

const DEBOUNCE_MS = 700;
const RETRY_MS = 5000;

export class TripSync {
    private snapshots = new Map<string, Snapshot>();
    private timers = new Map<string, ReturnType<typeof setTimeout>>();
    private chains = new Map<string, Promise<void>>();
    private pending = new Set<string>();

    constructor(private deps: Deps) { }

    /** Registra lo que ya está guardado en el servidor (después de cargar los viajes). */
    seed(trips: TripEntry[]) {
        this.clear();
        for (const trip of trips) {
            this.snapshots.set(trip.id, {
                scalars: JSON.stringify(api.tripToWrite(trip, this.deps.codeById)),
                expenses: new Map(trip.expenses.map((e) => [e.id, this.fingerprint(e, trip.tripDate)])),
                photoIds: new Set(trip.photos.map((p) => p.id))
            });
        }
    }

    /** Programa el envío de un viaje (con espera para agrupar cambios seguidos). */
    schedule(tripId: string, delay = DEBOUNCE_MS) {
        const existing = this.timers.get(tripId);
        if (existing) clearTimeout(existing);
        this.markPending(tripId, true);
        this.timers.set(
            tripId,
            setTimeout(() => {
                this.timers.delete(tripId);
                this.enqueue(tripId);
            }, delay)
        );
    }

    /** Reintenta todo lo que haya cambiado (por ejemplo al volver la conexión). */
    retryAll() {
        this.deps.getAllTripIds().forEach((id) => this.schedule(id, 0));
    }

    /** Envía ya todo lo pendiente y espera a que termine. */
    async flushAll(): Promise<void> {
        this.deps.getAllTripIds().forEach((id) => {
            const t = this.timers.get(id);
            if (t) clearTimeout(t);
            this.timers.delete(id);
            this.enqueue(id);
        });
        await Promise.allSettled([...this.chains.values()]);
    }

    /** Borra el viaje en el servidor. */
    async remove(tripId: string): Promise<void> {
        const t = this.timers.get(tripId);
        if (t) clearTimeout(t);
        this.timers.delete(tripId);
        this.markPending(tripId, true);

        const run = (this.chains.get(tripId) ?? Promise.resolve()).then(async () => {
            if (this.snapshots.has(tripId)) {
                await api.deleteTrip(tripId);
                this.snapshots.delete(tripId);
            }
        });
        this.track(tripId, run, () => this.remove(tripId));
    }

    clear() {
        this.timers.forEach((t) => clearTimeout(t));
        this.timers.clear();
        this.chains.clear();
        this.snapshots.clear();
        this.pending.clear();
        this.deps.onPendingChange(0);
    }

    pendingCount() {
        return this.pending.size;
    }

    // ───────────── interno ─────────────

    private enqueue(tripId: string) {
        const run = (this.chains.get(tripId) ?? Promise.resolve()).then(() => this.sync(tripId));
        this.track(tripId, run, () => this.schedule(tripId, RETRY_MS));
    }

    /** Encadena la operación por viaje (nunca dos a la vez) y maneja errores. */
    private track(tripId: string, run: Promise<void>, retry: () => void) {
        const chained = run
            .then(() => {
                if (!this.timers.has(tripId)) this.markPending(tripId, false);
            })
            .catch((err) => {
                if (err instanceof api.ApiError && err.isNetwork) {
                    retry(); // sin conexión: reintenta solo
                } else if (err instanceof api.ApiError && err.status === 401) {
                    this.markPending(tripId, false); // la sesión expiró; la app se encarga
                } else {
                    this.markPending(tripId, false);
                    this.deps.onError(err);
                }
            })
            .finally(() => {
                if (this.chains.get(tripId) === chained) this.chains.delete(tripId);
            });
        this.chains.set(tripId, chained);
    }

    private markPending(tripId: string, value: boolean) {
        const before = this.pending.size;
        if (value) this.pending.add(tripId);
        else this.pending.delete(tripId);
        if (this.pending.size !== before) this.deps.onPendingChange(this.pending.size);
    }

    private fingerprint(e: TripEntry['expenses'][number], tripDate: string) {
        return JSON.stringify(api.expenseToWrite(e, tripDate));
    }

    private async sync(tripId: string): Promise<void> {
        const trip = this.deps.getTrip(tripId);
        if (!trip) return;

        // 1) El viaje
        const body = api.tripToWrite(trip, this.deps.codeById);
        const bodyJson = JSON.stringify(body);
        let snap = this.snapshots.get(tripId);
        if (!snap) {
            await api.createTrip({ ...body, id: tripId });
            snap = { scalars: bodyJson, expenses: new Map(), photoIds: new Set() };
            this.snapshots.set(tripId, snap);
        } else if (snap.scalars !== bodyJson) {
            await api.updateTrip(tripId, body);
            snap.scalars = bodyJson;
        }

        // 2) Gastos
        const expenseIds = new Set(trip.expenses.map((e) => e.id));
        for (const exp of trip.expenses) {
            const fp = this.fingerprint(exp, trip.tripDate);
            const known = snap.expenses.get(exp.id);
            if (known === undefined) {
                await api.createExpense(tripId, api.expenseToWrite(exp, trip.tripDate));
                snap.expenses.set(exp.id, fp);
            } else if (known !== fp) {
                await api.updateExpense(tripId, exp.id, api.expenseToWrite(exp, trip.tripDate));
                snap.expenses.set(exp.id, fp);
            }
        }
        for (const knownId of [...snap.expenses.keys()]) {
            if (!expenseIds.has(knownId)) {
                await api.deleteExpense(tripId, knownId);
                snap.expenses.delete(knownId);
            }
        }

        // 3) Fotos: primero se borran las quitadas, luego se suben las nuevas
        const latest = this.deps.getTrip(tripId) ?? trip;
        const currentPhotoIds = new Set(latest.photos.map((p) => p.id));
        for (const knownId of [...snap.photoIds]) {
            if (!currentPhotoIds.has(knownId)) {
                await api.deletePhoto(tripId, knownId);
                snap.photoIds.delete(knownId);
            }
        }
        for (const photo of latest.photos) {
            if (snap.photoIds.has(photo.id)) continue;
            const file = getTrackedFile(photo.url);
            if (!file) continue; // no es una foto local nueva
            const saved = await api.uploadPhoto(tripId, file, photo.caption);
            snap.photoIds.add(saved.id);
            releaseTrackedFile(photo.url);
            this.deps.onPhotoUploaded(tripId, photo.id, api.apiPhotoToFront(saved));
        }
    }
}
