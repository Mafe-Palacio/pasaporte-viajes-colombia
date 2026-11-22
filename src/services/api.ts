/**
 * Cliente de la API en C# (ASP.NET Core).
 * - Guarda la sesión (JWT + refresh token) y renueva el token cuando vence.
 * - Detecta cuándo el servidor no responde y lo avisa a la app (onConnectionChange).
 * - NO guarda datos de viajes en el navegador: todo vive en el servidor.
 */
import type { ExpenseLog, TripEntry, TripPhoto } from '../types';

// ───────────────────────── Configuración ─────────────────────────

const rawBase = (import.meta.env.VITE_API_URL ?? '').trim() || 'https://localhost:7080';
/** Origen del servidor sin "/api" al final. */
export const API_ORIGIN = rawBase.replace(/\/+$/, '').replace(/\/api$/i, '');
const API_BASE = `${API_ORIGIN}/api`;

export const NO_CONNECTION_MESSAGE =
    'No hay conexión con el servidor. Revisa que el backend esté encendido.';

export class ApiError extends Error {
    status: number;
    isNetwork: boolean;
    constructor(status: number, message: string, isNetwork = false) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.isNetwork = isNetwork;
    }
}

export function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Respaldo para contextos no seguros (http)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// ───────────────────────── Sesión ─────────────────────────

export interface SessionUser {
    id: string;
    name: string;
    email: string;
    homeMunicipalityId?: string | null;
}

interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAtUtc: string;
    user: SessionUser;
}

const SESSION_KEY = 'pasaporte.session';
let session: Session | null = readSession();

function readSession(): Session | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Session;
        return parsed?.accessToken && parsed?.refreshToken ? parsed : null;
    } catch {
        return null;
    }
}

function writeSession(next: Session | null) {
    session = next;
    try {
        if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        else localStorage.removeItem(SESSION_KEY);
    } catch {
        /* navegador sin almacenamiento: la sesión vive solo en memoria */
    }
}

export const hasSession = () => session !== null;
export const getSessionUser = () => session?.user ?? null;
export const clearSession = () => writeSession(null);

/** Borra lo que dejó la versión anterior (login falso y datos en localStorage). */
export function purgeLegacyStorage() {
    const legacy = [
        'auth_token',
        'auth_user',
        'pasaporte_departments',
        'pasaporte_municipalities',
        'pasaporte_trips',
        'pasaporte_home_municipality_id',
        'pasaporte_visited_cleared_v6_divipola'
    ];
    try {
        legacy.forEach((k) => localStorage.removeItem(k));
    } catch {
        /* ignorar */
    }
}

// ───────────────────────── Eventos ─────────────────────────

let online = true;
const connectionListeners = new Set<(online: boolean) => void>();
const expiredListeners = new Set<() => void>();

function setOnline(value: boolean) {
    if (value !== online) {
        online = value;
        connectionListeners.forEach((l) => l(value));
    }
}

export const isServerOnline = () => online;

export function onConnectionChange(cb: (online: boolean) => void) {
    connectionListeners.add(cb);
    return () => {
        connectionListeners.delete(cb);
    };
}

export function onSessionExpired(cb: () => void) {
    expiredListeners.add(cb);
    return () => {
        expiredListeners.delete(cb);
    };
}

// ───────────────────────── HTTP ─────────────────────────

async function rawFetch(path: string, init: RequestInit, auth: boolean): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    // Evita la página intermedia de advertencia del plan gratuito de ngrok
    headers.set('ngrok-skip-browser-warning', 'true');
    if (auth && session) headers.set('Authorization', `Bearer ${session.accessToken}`);

    let res: Response;
    try {
        res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    } catch {
        setOnline(false);
        throw new ApiError(0, NO_CONNECTION_MESSAGE, true);
    }

    // 502/503/504 o error propio de ngrok = el túnel está arriba pero el backend no responde
    if ([502, 503, 504].includes(res.status) || res.headers.get('ngrok-error-code')) {
        setOnline(false);
        throw new ApiError(res.status, NO_CONNECTION_MESSAGE, true);
    }

    setOnline(true);
    return res;
}

async function readError(res: Response): Promise<string> {
    try {
        const data = await res.clone().json();
        if (typeof data?.message === 'string') return data.message;
        if (data?.errors && typeof data.errors === 'object') {
            const first = Object.values(data.errors as Record<string, string[]>)[0];
            if (Array.isArray(first) && first[0]) return first[0];
        }
        if (typeof data?.title === 'string') return data.title;
    } catch {
        /* no era JSON */
    }
    return `Error ${res.status} del servidor.`;
}

let refreshing: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
    if (!session) return Promise.resolve(false);
    if (!refreshing) {
        const token = session.refreshToken;
        refreshing = (async () => {
            try {
                const res = await rawFetch(
                    '/auth/refresh',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken: token })
                    },
                    false
                );
                if (!res.ok) return false;
                applyAuth(await res.json());
                return true;
            } finally {
                refreshing = null;
            }
        })();
    }
    return refreshing;
}

interface RequestOptions {
    method?: string;
    body?: unknown;
    form?: FormData;
    auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const auth = opts.auth ?? true;
    const build = (): RequestInit => ({
        method: opts.method ?? 'GET',
        headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined)
    });

    let res = await rawFetch(path, build(), auth);

    if (res.status === 401 && auth && session) {
        const refreshed = await tryRefresh();
        if (refreshed) res = await rawFetch(path, build(), auth);
        if (!refreshed || res.status === 401) {
            clearSession();
            expiredListeners.forEach((l) => l());
            throw new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
        }
    }

    if (!res.ok) throw new ApiError(res.status, await readError(res));
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

// ───────────────────────── Auth ─────────────────────────

interface AuthResponseDto {
    token: string;
    refreshToken: string;
    expiresAtUtc: string;
    user: SessionUser;
}

function applyAuth(a: AuthResponseDto) {
    writeSession({
        accessToken: a.token,
        refreshToken: a.refreshToken,
        expiresAtUtc: a.expiresAtUtc,
        user: a.user
    });
}

export async function login(email: string, password: string): Promise<SessionUser> {
    const a = await request<AuthResponseDto>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false
    });
    applyAuth(a);
    return a.user;
}

export async function register(name: string, email: string, password: string): Promise<SessionUser> {
    const a = await request<AuthResponseDto>('/auth/register', {
        method: 'POST',
        body: { name, email, password },
        auth: false
    });
    applyAuth(a);
    return a.user;
}

export async function logout(): Promise<void> {
    try {
        if (session) await rawFetch('/auth/logout', { method: 'POST' }, true);
    } catch {
        /* si no hay conexión igual cerramos la sesión local */
    } finally {
        clearSession();
    }
}

export async function fetchMe(): Promise<SessionUser> {
    const user = await request<SessionUser>('/auth/me');
    if (session) writeSession({ ...session, user });
    return user;
}

/** true si el servidor responde. Nunca lanza error. */
export async function checkHealth(): Promise<boolean> {
    try {
        const res = await rawFetch('/health', {}, false);
        return res.ok;
    } catch {
        return false;
    }
}

// ───────────────────────── Viajes ─────────────────────────

export interface ApiExpense {
    id: string;
    tripEntryId: string;
    category: string;
    amountCop: number;
    date: string;
    notes?: string | null;
}

export interface ApiPhoto {
    id: string;
    tripEntryId: string;
    url: string;
    caption?: string | null;
    uploadedAt: string;
}

export interface ApiTrip {
    id: string;
    municipalityId: string;
    municipalityName: string;
    departmentId: string;
    departmentName: string;
    tripDate: string;
    label: string;
    rating: number;
    summary?: string | null;
    foodReview?: string | null;
    favoriteDish?: string | null;
    doNotForgetNotes?: string | null;
    transportMode?: string | null;
    roadCondition?: string | null;
    transportNotes?: string | null;
    tollCount: number;
    climateFeeling?: string | null;
    climateNotes?: string | null;
    expenses: ApiExpense[];
    photos: ApiPhoto[];
}

export interface TripWrite {
    id?: string;
    municipalityId: string;
    tripDate: string;
    label: string;
    rating: number;
    summary: string;
    foodReview: string;
    favoriteDish: string;
    doNotForgetNotes: string;
    transportMode: string;
    roadCondition: string;
    transportNotes: string;
    tollCount: number;
    climateFeeling: string | null;
    climateNotes: string | null;
}

export interface ExpenseWrite {
    id?: string;
    category: string;
    amountCop: number;
    date: string;
    notes: string;
}

export const getTrips = () => request<ApiTrip[]>('/trips');
export const createTrip = (body: TripWrite) => request<ApiTrip>('/trips', { method: 'POST', body });
export const updateTrip = (id: string, body: TripWrite) =>
    request<ApiTrip>(`/trips/${id}`, { method: 'PUT', body });
export const deleteTrip = (id: string) => request<void>(`/trips/${id}`, { method: 'DELETE' });

export const createExpense = (tripId: string, body: ExpenseWrite) =>
    request<ApiExpense>(`/trips/${tripId}/expenses`, { method: 'POST', body });
export const updateExpense = (tripId: string, expenseId: string, body: ExpenseWrite) =>
    request<ApiExpense>(`/trips/${tripId}/expenses/${expenseId}`, { method: 'PUT', body });
export const deleteExpense = (tripId: string, expenseId: string) =>
    request<void>(`/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' });

export function uploadPhoto(tripId: string, file: File, caption?: string) {
    const form = new FormData();
    form.append('File', file);
    if (caption) form.append('Caption', caption.slice(0, 255));
    return request<ApiPhoto>(`/trips/${tripId}/photos`, { method: 'POST', form });
}
export const deletePhoto = (tripId: string, photoId: string) =>
    request<void>(`/trips/${tripId}/photos/${photoId}`, { method: 'DELETE' });

export const setHome = (municipalityCode: string) =>
    request<void>(`/geo/home/${municipalityCode}`, { method: 'PUT' });
export const clearHome = () => request<void>('/geo/home', { method: 'DELETE' });

// ───────────────────────── Conversión front <-> API ─────────────────────────

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number | string) => String(n).padStart(2, '0');

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "08/Sep/2026" -> "2026-09-08" */
export function passportToIso(value?: string): string {
    if (!value) return todayIso();
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const m = value.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (m) {
        const mon = m[2].toLowerCase();
        let i = MONTHS_ES.findIndex((x) => x.toLowerCase() === mon);
        if (i < 0) i = MONTHS_EN.indexOf(mon);
        if (i >= 0) return `${m[3]}-${pad(i + 1)}-${pad(m[1])}`;
    }
    return todayIso();
}

/** "2026-09-08" -> "08/Sep/2026" */
export function isoToPassport(iso: string): string {
    const [y, mo, d] = iso.slice(0, 10).split('-');
    const i = parseInt(mo, 10) - 1;
    return `${pad(d)}/${MONTHS_ES[i] ?? 'Ene'}/${y}`;
}

/** Las fotos locales ya vienen con ruta relativa (/uploads/..) si el backend guarda en disco. */
export function resolvePhotoUrl(url: string): string {
    return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const VALID_CLIMATE_FEELINGS = new Set(['caliente', 'templado', 'frio', 'paramo']);

export function tripToWrite(trip: TripEntry, codeById: Map<string, string>): TripWrite {
    const tollCount = trip.transport?.tollCount ?? trip.tollCount ?? 0;
    const rawClimateFeeling = (trip.climateFeeling ?? '').trim();
    const climateFeeling = VALID_CLIMATE_FEELINGS.has(rawClimateFeeling) ? rawClimateFeeling : null;
    const climateNotes =
        trip.climateNotes && trip.climateNotes.trim().length > 0
            ? trip.climateNotes.slice(0, 1000)
            : null;
    return {
        municipalityId: codeById.get(trip.municipalityId) ?? trip.municipalityId,
        tripDate: passportToIso(trip.tripDate),
        label: (trip.label || 'Visita').slice(0, 100),
        rating: clamp(Math.round(trip.rating || 5), 1, 5),
        summary: trip.summary ?? '',
        foodReview: trip.foodReview ?? '',
        favoriteDish: trip.favoriteDish ?? '',
        doNotForgetNotes: trip.doNotForgetNotes ?? '',
        transportMode: trip.transport?.transportMode ?? trip.transportMode ?? 'Carro propio',
        roadCondition: trip.transport?.roadCondition ?? trip.roadCondition ?? 'Buena',
        transportNotes: trip.transport?.notes ?? trip.transportNotes ?? '',
        tollCount: clamp(Math.round(tollCount || 0), 0, 100),
        climateFeeling,
        climateNotes
    };
}

export function expenseToWrite(exp: ExpenseLog, tripDate: string): ExpenseWrite {
    return {
        id: exp.id,
        category: exp.category || 'Otros',
        amountCop: Math.max(0, Number(exp.amountCop) || 0),
        date: passportToIso(exp.date || tripDate),
        notes: (exp.notes ?? '').slice(0, 500)
    };
}

export function apiPhotoToFront(p: ApiPhoto): TripPhoto {
    return {
        id: p.id,
        tripEntryId: p.tripEntryId,
        url: resolvePhotoUrl(p.url),
        caption: p.caption ?? '',
        uploadedAt: isoToPassport(p.uploadedAt)
    };
}

export function apiTripToFront(
    t: ApiTrip,
    idByCode: Map<string, string>,
    userId: string
): TripEntry {
    const tollCount = t.tollCount ?? 0;
    const roadCondition = t.roadCondition ?? 'Buena';
    const transportMode = t.transportMode ?? 'Carro propio';
    const transportNotes = t.transportNotes ?? '';
    const climateFeeling = (
        t.climateFeeling && VALID_CLIMATE_FEELINGS.has(t.climateFeeling) ? t.climateFeeling : ''
    ) as TripEntry['climateFeeling'];
    return {
        id: t.id,
        municipalityId: idByCode.get(t.municipalityId) ?? t.municipalityId,
        municipalityName: t.municipalityName,
        departmentName: t.departmentName,
        userId,
        tripDate: isoToPassport(t.tripDate),
        label: t.label,
        rating: t.rating,
        summary: t.summary ?? '',
        foodReview: t.foodReview ?? '',
        favoriteDish: t.favoriteDish ?? '',
        transportNotes,
        roadCondition,
        hasTolls: tollCount > 0,
        tollCount,
        transportMode,
        transport: { roadCondition, tollCount, hasTolls: tollCount > 0, transportMode, notes: transportNotes },
        doNotForgetNotes: t.doNotForgetNotes ?? '',
        climateFeeling,
        climateNotes: t.climateNotes ?? '',
        expenses: t.expenses.map((e) => ({
            id: e.id,
            tripEntryId: e.tripEntryId,
            category: e.category,
            amountCop: e.amountCop,
            date: isoToPassport(e.date),
            notes: e.notes ?? ''
        })),
        photos: t.photos.map(apiPhotoToFront)
    };
}
