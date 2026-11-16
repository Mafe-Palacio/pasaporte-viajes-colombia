/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { AppNavbar } from './components/AppNavbar';
import { AuthScreen } from './components/AuthScreen';
import { CountryExplorer } from './components/CountryExplorer';
import { RegionalExplorer } from './components/RegionalExplorer';
import { MunicipalityDetail } from './components/MunicipalityDetail';
import { ArchitectureModal } from './components/ArchitectureModal';
import { MemoriesWall } from './components/MemoriesWall';
import { TravelReports } from './components/TravelReports';
import { ThemeFloatingMenu } from './components/ThemeFloatingMenu';
import { ConnectionBanner } from './components/ConnectionBanner';
import {
    DEPARTMENTS_MOCK,
    MUNICIPALITIES_MOCK,
    getMunicipalitiesForDepartment
} from './data/colombiaData';
import { Municipality, TripEntry, TripPhoto } from './types';
import * as api from './services/api';
import { TripSync } from './services/tripSync';

// Catálogo oficial (DIVIPOLA) embebido. El front usa "id" (a veces un nombre corto como "salento")
// y el backend usa el código de 5 dígitos, así que guardamos la equivalencia en ambos sentidos.
const BASE_MUNICIPALITIES: Municipality[] = MUNICIPALITIES_MOCK.map((m) => ({
    ...m,
    isVisited: false,
    isHome: false
}));
const CODE_BY_ID = new Map<string, string>(MUNICIPALITIES_MOCK.map((m) => [m.id, m.code || m.id]));
const ID_BY_CODE = new Map<string, string>(MUNICIPALITIES_MOCK.map((m) => [m.code || m.id, m.id]));

type AuthPhase = 'checking' | 'offline' | 'anon' | 'authed';

export default function App() {
    // Navigation Route State: starts strictly at '/login' unless already authenticated
    const [currentRoute, setCurrentRoute] = useState<string>('/login');
    // La sesión real la valida el servidor (JWT). Si hay un token guardado se verifica antes de entrar.
    const [phase, setPhase] = useState<AuthPhase>(() => (api.hasSession() ? 'checking' : 'anon'));
    const isAuthenticated = phase === 'authed';
    const [userEmail, setUserEmail] = useState<string>(() => api.getSessionUser()?.email ?? '');
    const [authNotice, setAuthNotice] = useState<string | null>(null);
    const authRef = useRef<boolean>(false);

    // Conexión con el servidor y avisos
    const [serverOnline, setServerOnline] = useState<boolean>(api.isServerOnline());
    const [pendingChanges, setPendingChanges] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const needsInitialLoadRef = useRef<boolean>(false);

    // Reactive dark mode state synced with DOM and localStorage
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme-mode') || localStorage.getItem('theme_mode');
            if (saved) return saved === 'dark';
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    useEffect(() => {
        const handleThemeChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ isDark: boolean }>;
            if (customEvent.detail && typeof customEvent.detail.isDark === 'boolean') {
                setIsDarkMode(customEvent.detail.isDark);
            } else if (typeof document !== 'undefined') {
                setIsDarkMode(document.documentElement.classList.contains('dark'));
            }
        };
        window.addEventListener('theme-mode-changed', handleThemeChange);
        return () => window.removeEventListener('theme-mode-changed', handleThemeChange);
    }, []);

    useEffect(() => {
        authRef.current = isAuthenticated;
    }, [isAuthenticated]);

    // Selected entities
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('quindio');
    const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('salento');

    // ───────────── Datos: viven en el servidor, aquí solo hay una copia en memoria ─────────────
    const [trips, setTrips] = useState<TripEntry[]>([]);
    const tripsRef = useRef<TripEntry[]>([]);
    const [homeMunicipalityId, setHomeMunicipalityId] = useState<string | null>(null);

    const commitTrips = useCallback((next: TripEntry[]) => {
        tripsRef.current = next;
        setTrips(next);
    }, []);

    const reportError = useCallback((err: unknown) => {
        if (err instanceof api.ApiError && (err.isNetwork || err.status === 401)) return; // ya se avisa aparte
        setErrorMessage(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    }, []);

    const syncRef = useRef<TripSync | null>(null);
    if (!syncRef.current) {
        syncRef.current = new TripSync({
            getTrip: (id) => tripsRef.current.find((t) => t.id === id),
            getAllTripIds: () => tripsRef.current.map((t) => t.id),
            codeById: CODE_BY_ID,
            onPhotoUploaded: (tripId: string, localPhotoId: string, saved: TripPhoto) => {
                commitTrips(
                    tripsRef.current.map((t) =>
                        t.id === tripId
                            ? { ...t, photos: t.photos.map((p) => (p.id === localPhotoId ? saved : p)) }
                            : t
                    )
                );
            },
            onError: reportError,
            onPendingChange: setPendingChanges
        });
    }
    const sync = syncRef.current;

    // Un municipio cuenta como visitado si tiene al menos un viaje o es "Mi hogar".
    const visitedKey = useMemo(
        () => [...new Set(trips.map((t) => t.municipalityId))].sort().join('|'),
        [trips]
    );
    const municipalities = useMemo<Municipality[]>(() => {
        const visited = new Set(visitedKey ? visitedKey.split('|') : []);
        return BASE_MUNICIPALITIES.map((m) => {
            const isHome = m.id === homeMunicipalityId;
            return visited.has(m.id) || isHome ? { ...m, isVisited: true, isHome } : m;
        });
    }, [visitedKey, homeMunicipalityId]);

    // El avance por departamento se calcula a partir de lo anterior (igual que lo hace el backend).
    const departments = useMemo(
        () =>
            DEPARTMENTS_MOCK.map((dept) => {
                const visited = municipalities.filter((m) => m.departmentId === dept.id && m.isVisited).length;
                const total = dept.totalMunicipalities || 1;
                return {
                    ...dept,
                    visitedMunicipalities: visited,
                    isVisited: visited > 0,
                    progressPercentage: Math.min(100, Math.round((visited / total) * 100))
                };
            }),
        [municipalities]
    );

    const loadServerData = useCallback(async (): Promise<boolean> => {
        try {
            const [me, apiTrips] = await Promise.all([api.fetchMe(), api.getTrips()]);
            const list = apiTrips.map((t) => api.apiTripToFront(t, ID_BY_CODE, me.id));
            sync.seed(list);
            commitTrips(list);
            setHomeMunicipalityId(
                me.homeMunicipalityId ? ID_BY_CODE.get(me.homeMunicipalityId) ?? me.homeMunicipalityId : null
            );
            setUserEmail(me.email);
            needsInitialLoadRef.current = false;
            return true;
        } catch (err) {
            if (err instanceof api.ApiError && err.isNetwork) {
                needsInitialLoadRef.current = true;
            } else {
                reportError(err);
            }
            throw err;
        }
    }, [sync, commitTrips, reportError]);

    // Architecture Modal
    const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);

    // Map explorer routes where AppNavbar is strictly hidden
    const isMapExplorerRoute =
        currentRoute === '/explorador' ||
        currentRoute.startsWith('/departamento') ||
        currentRoute === 'regional';

    // Navigation router with strict authentication guard
    const navigateTo = (targetRoute: string, bypassAuthCheck = false) => {
        const isUserAuth = bypassAuthCheck || authRef.current;

        if (!isUserAuth && targetRoute !== '/login') {
            setCurrentRoute('/login');
            setAuthNotice('Debes iniciar sesión para acceder al mapa y bitácora.');
            window.history.replaceState(null, '', '/login');
            return;
        }

        setAuthNotice(null);
        let normalized = targetRoute;
        if (targetRoute === 'explorador' || targetRoute === 'country') {
            normalized = '/explorador';
        } else if (targetRoute === 'municipality' || targetRoute === 'bitacora') {
            normalized = `/municipio/${selectedMunicipalityId}`;
        } else if (targetRoute === 'recuerdos' || targetRoute === '/recuerdos') {
            normalized = '/recuerdos';
        } else if (targetRoute === 'reportes' || targetRoute === '/reportes') {
            normalized = '/reportes';
        }

        setCurrentRoute(normalized);
        window.history.pushState(null, '', normalized);
    };

    // ───────────── Sesión ─────────────

    const resetLocalData = useCallback(() => {
        sync.clear();
        commitTrips([]);
        setHomeMunicipalityId(null);
        setUserEmail('');
    }, [sync, commitTrips]);

    const verifySession = useCallback(async () => {
        setPhase('checking');
        try {
            await loadServerData();
            authRef.current = true;
            setPhase('authed');
            navigateTo('/explorador', true);
        } catch (err) {
            if (err instanceof api.ApiError && err.isNetwork) {
                setPhase('offline'); // hay sesión guardada pero el servidor no responde
            } else {
                api.clearSession();
                setPhase('anon');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadServerData]);

    // Al abrir la app: limpiar restos de la versión anterior y validar la sesión guardada
    useEffect(() => {
        api.purgeLegacyStorage();
        if (api.hasSession()) void verifySession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Guard: sin sesión siempre se ve el login
    useEffect(() => {
        if (phase === 'anon') {
            setCurrentRoute('/login');
            if (window.location.pathname !== '/login') {
                window.history.replaceState(null, '', '/login');
            }
        }
    }, [phase]);

    const handleLogout = async (notice?: string) => {
        authRef.current = false;
        setPhase('anon');
        setAuthNotice(notice ?? null);
        navigateTo('/login', true);
        try {
            await Promise.race([sync.flushAll(), new Promise((r) => setTimeout(r, 3000))]);
        } catch {
            /* si falla, igual cerramos sesión */
        }
        await api.logout();
        resetLocalData();
    };

    const handleLoginSuccess = async (email: string) => {
        setUserEmail(email);
        try {
            await loadServerData();
        } catch {
            /* si no hay conexión, el aviso rojo se muestra y se reintenta al volver */
        }
        authRef.current = true;
        setPhase('authed');
        setAuthNotice(null);
        navigateTo('/explorador', true);
    };

    // El servidor dijo que la sesión ya no sirve
    useEffect(
        () =>
            api.onSessionExpired(() => {
                authRef.current = false;
                setPhase('anon');
                setAuthNotice('Tu sesión expiró. Inicia sesión de nuevo.');
                resetLocalData();
            }),
        [resetLocalData]
    );

    // Estado de la conexión: cuando vuelve, se reanuda lo pendiente
    useEffect(
        () =>
            api.onConnectionChange((online) => {
                setServerOnline(online);
                if (!online) return;
                if (phase === 'offline') {
                    void verifySession();
                } else if (phase === 'authed') {
                    if (needsInitialLoadRef.current) void loadServerData().catch(() => undefined);
                    sync.retryAll();
                }
            }),
        [phase, verifySession, loadServerData, sync]
    );

    // Mientras el servidor no responde, lo consultamos cada 5 segundos
    useEffect(() => {
        if (serverOnline) return;
        const id = window.setInterval(() => void api.checkHealth(), 5000);
        return () => window.clearInterval(id);
    }, [serverOnline]);

    // Avisar si intenta cerrar la pestaña con cambios sin guardar
    useEffect(() => {
        if (pendingChanges === 0) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [pendingChanges]);

    // ───────────── Handlers ─────────────
    const handleSelectDepartment = (deptId: string) => {
        if (!isAuthenticated) {
            navigateTo('/login');
            return;
        }
        setSelectedDepartmentId(deptId);
        navigateTo(`/departamento/${deptId}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSelectMunicipality = (muniId: string) => {
        if (!isAuthenticated) {
            navigateTo('/login');
            return;
        }
        setSelectedMunicipalityId(muniId);
        const m = municipalities.find((item) => item.id === muniId);
        if (m) {
            setSelectedDepartmentId(m.departmentId);
        }
        navigateTo(`/municipio/${muniId}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Synchronize route if user hits a direct link or goes back
    useEffect(() => {
        if (currentRoute.startsWith('/departamento/')) {
            const deptId = currentRoute.replace('/departamento/', '').split('/')[0];
            if (deptId && deptId !== selectedDepartmentId) {
                setSelectedDepartmentId(deptId);
            }
        } else if (currentRoute.startsWith('/municipio/')) {
            const muniId = currentRoute.replace('/municipio/', '').split('/')[0];
            if (muniId && muniId !== selectedMunicipalityId) {
                setSelectedMunicipalityId(muniId);
                const m = municipalities.find((item) => item.id === muniId);
                if (m && m.departmentId !== selectedDepartmentId) {
                    setSelectedDepartmentId(m.departmentId);
                }
            }
        }
    }, [currentRoute, municipalities, selectedDepartmentId, selectedMunicipalityId]);

    // Cada cambio se refleja al instante en pantalla y se envía al servidor en segundo plano
    const handleSaveTrip = (savedTrip: TripEntry) => {
        const prev = tripsRef.current;
        const idx = prev.findIndex((t) => t.id === savedTrip.id);
        const next = idx >= 0 ? prev.map((t, i) => (i === idx ? savedTrip : t)) : [...prev, savedTrip];
        commitTrips(next);
        sync.schedule(savedTrip.id);
    };

    const handleDeleteTrip = (_municipalityId: string, tripId: string) => {
        commitTrips(tripsRef.current.filter((t) => t.id !== tripId));
        void sync.remove(tripId);
    };

    const handleSetHomeMunicipality = (muniId: string | null) => {
        const previous = homeMunicipalityId;
        setHomeMunicipalityId(muniId);
        const request = muniId ? api.setHome(CODE_BY_ID.get(muniId) ?? muniId) : api.clearHome();
        request.catch((err) => {
            setHomeMunicipalityId(previous); // no se pudo guardar: volvemos al valor anterior
            reportError(err);
        });
    };

    const homeDepartmentId = useMemo(() => {
        if (!homeMunicipalityId) return null;
        const m = municipalities.find((item) => item.id === homeMunicipalityId);
        return m?.departmentId || null;
    }, [homeMunicipalityId, municipalities]);

    const activeDepartment =
        departments.find((d) => d.id === selectedDepartmentId) || departments[0];

    const activeDepartmentMunicipalities = useMemo(() => {
        const list = municipalities.filter((m) => m.departmentId === selectedDepartmentId);
        if (list.length > 0) return list;
        return getMunicipalitiesForDepartment(selectedDepartmentId);
    }, [municipalities, selectedDepartmentId]);

    const activeMunicipality = useMemo(() => {
        return (
            municipalities.find((m) => m.id === selectedMunicipalityId) ||
            activeDepartmentMunicipalities.find((m) => m.id === selectedMunicipalityId) ||
            activeDepartmentMunicipalities[0] ||
            municipalities[0]
        );
    }, [municipalities, selectedMunicipalityId, activeDepartmentMunicipalities]);

    const activeMunicipalityTrips = trips.filter(
        (t) => t.municipalityId === selectedMunicipalityId
    );

    return (
        <div
            id="app"
            className={`min-h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-[#121417] text-zinc-100' : 'bg-[#FFF0F3] text-slate-800'
                } font-sans antialiased selection:bg-[#FFBDC9] selection:text-[#F44566] relative`}
            style={{
                backgroundImage: isDarkMode
                    ? 'linear-gradient(180deg, rgba(30, 34, 40, 0.7) 0%, transparent 50%)'
                    : 'linear-gradient(180deg, var(--color-accent-soft) 0%, transparent 45%)'
            }}
        >
            {/* Global Centered Floating Pill Navbar - ONLY visible on detail / bitácora (strictly NOT on /login, /explorador or /departamento/:id) */}
            {isAuthenticated && !isMapExplorerRoute && currentRoute !== '/login' && (
                <AppNavbar
                    currentRoute={currentRoute}
                    onNavigate={(route) => {
                        if (route === 'bitacora' || route === 'municipality' || route.startsWith('/municipio')) {
                            navigateTo(`/municipio/${selectedMunicipalityId}`);
                        } else if (route === 'country' || route === 'explorador' || route === '/explorador') {
                            navigateTo('/explorador');
                        } else {
                            navigateTo(route);
                        }
                    }}
                    isAuthenticated={isAuthenticated}
                    onLogout={() => void handleLogout()}
                    onOpenArchitecture={() => setIsArchitectureOpen(true)}
                    isArchitectureOpen={isArchitectureOpen}
                />
            )}

            {/* Screen Routing with Guard */}
            <main>
                {phase === 'anon' && (
                    <AuthScreen
                        onLoginSuccess={handleLoginSuccess}
                        authRequiredNotice={authNotice}
                    />
                )}

                {(phase === 'checking' || phase === 'offline') && (
                    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
                        {phase === 'checking' ? (
                            <>
                                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
                                <p className="text-sm font-semibold">Conectando con el servidor…</p>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-10 h-10 text-[#B42318]" />
                                <h1 className="text-xl font-bold">No hay conexión con el servidor</h1>
                                <p className="text-sm max-w-md opacity-80">
                                    No podemos abrir tu pasaporte sin el servidor. Revisa que el backend esté encendido; esta pantalla se
                                    actualiza sola cuando vuelva.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void verifySession()}
                                    className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white cursor-pointer"
                                    style={{ backgroundColor: 'var(--color-accent)' }}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Reintentar
                                </button>
                            </>
                        )}
                    </div>
                )}

                {isAuthenticated && currentRoute === '/explorador' && (
                    <CountryExplorer
                        departments={departments}
                        homeDepartmentId={homeDepartmentId}
                        onSelectDepartment={handleSelectDepartment}
                        onNavigateToRecuerdos={() => navigateTo('/recuerdos')}
                        onNavigateToReportes={() => navigateTo('/reportes')}
                        onLogout={() => void handleLogout()}
                    />
                )}

                {isAuthenticated && (currentRoute.startsWith('/departamento') || currentRoute === 'regional') && activeDepartment && (
                    <RegionalExplorer
                        department={activeDepartment}
                        departments={departments}
                        municipalities={activeDepartmentMunicipalities}
                        trips={trips}
                        homeMunicipalityId={homeMunicipalityId}
                        onBackToCountry={() => navigateTo('/explorador')}
                        onSelectMunicipality={handleSelectMunicipality}
                        onSelectDepartment={handleSelectDepartment}
                        onNavigateToRecuerdos={() => navigateTo('/recuerdos')}
                        onNavigateToReportes={() => navigateTo('/reportes')}
                        onLogout={() => void handleLogout()}
                    />
                )}

                {isAuthenticated && (currentRoute.startsWith('/municipio') || currentRoute === 'municipality') && activeMunicipality && (
                    <MunicipalityDetail
                        municipality={activeMunicipality}
                        trips={activeMunicipalityTrips}
                        homeMunicipalityId={homeMunicipalityId}
                        onSetHomeMunicipality={handleSetHomeMunicipality}
                        onBack={() => navigateTo(`/departamento/${selectedDepartmentId}`)}
                        onSaveTrip={handleSaveTrip}
                        onDeleteTrip={handleDeleteTrip}
                        onNavigateToReportes={() => navigateTo('/reportes')}
                    />
                )}

                {isAuthenticated && (currentRoute === '/recuerdos' || currentRoute === 'recuerdos') && (
                    <MemoriesWall
                        trips={trips}
                        municipalities={municipalities}
                        departments={departments}
                        onNavigateToMunicipality={handleSelectMunicipality}
                        onNavigateToMap={() => navigateTo('/explorador')}
                    />
                )}

                {isAuthenticated && (currentRoute === '/reportes' || currentRoute === 'reportes') && (
                    <TravelReports
                        departments={departments}
                        municipalities={municipalities}
                        trips={trips}
                        homeMunicipalityId={homeMunicipalityId}
                        onNavigateToMunicipality={handleSelectMunicipality}
                        onNavigateToDepartment={handleSelectDepartment}
                        onNavigateToMap={() => navigateTo('/explorador')}
                    />
                )}
            </main>

            {phase !== 'offline' && phase !== 'checking' && (
                <ConnectionBanner
                    online={serverOnline}
                    pendingChanges={pendingChanges}
                    errorMessage={errorMessage}
                    onRetry={() => void api.checkHealth()}
                    onDismissError={() => setErrorMessage(null)}
                />
            )}

            {/* Full Technical Architecture & Code Deliverables Modal */}
            <ArchitectureModal
                isOpen={isArchitectureOpen}
                onClose={() => setIsArchitectureOpen(false)}
            />

            {/* Menú Flotante Desplegable para Tema (Modo Oscuro y Paletas Pastel) */}
            <ThemeFloatingMenu />
        </div>
    );
}
