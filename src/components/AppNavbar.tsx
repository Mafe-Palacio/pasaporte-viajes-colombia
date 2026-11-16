import React, { useEffect, useState } from 'react';
import { Compass, Heart, LogOut, Code2, BarChart3, ArrowLeft } from 'lucide-react';

interface VisitStats {
  visitedCount: number;
  totalCount: number;
}

let cachedVisitStats: VisitStats = {
  visitedCount: 0,
  totalCount: 32
};

const visitStatsListeners = new Set<(stats: VisitStats) => void>();

export function syncPassportVisitStats(visitedCount: number, totalCount: number) {
  if (
    cachedVisitStats.visitedCount === visitedCount &&
    cachedVisitStats.totalCount === totalCount
  ) {
    return;
  }
  cachedVisitStats = { visitedCount, totalCount };
  visitStatsListeners.forEach((listener) => listener(cachedVisitStats));
}

export interface PassportDesktopHeaderProps {
  activeTab: 'explorador' | 'recuerdos' | 'reportes' | 'other';
  sectionTitle?: string;
  eyebrowLabel?: string;
  visitedCount: number;
  totalCount: number;
  onBack?: () => void;
  backTitle?: string;
  onSelectExplorador: () => void;
  onSelectRecuerdos?: () => void;
  onSelectReportes?: () => void;
  onLogout?: () => void;
}

export const PassportDesktopHeader: React.FC<PassportDesktopHeaderProps> = ({
  activeTab,
  sectionTitle = 'Explorador Nacional',
  eyebrowLabel = 'Pasaporte Colombia',
  visitedCount,
  totalCount,
  onBack,
  backTitle = 'Volver al mapa nacional',
  onSelectExplorador,
  onSelectRecuerdos,
  onSelectReportes,
  onLogout
}) => {
  const TitleTag = activeTab === 'explorador' ? 'h1' : 'p';

  return (
    <header className="hidden md:block w-full bg-white/85 dark:bg-[#1E2228]/90 backdrop-blur-md border-b border-rose-100 dark:border-zinc-800 flex-shrink-0 z-40 px-4 md:px-6 transition-colors">
      <div className="w-full h-[60px] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        {/* Izquierda: Volver o Bandera + Eyebrow X/Y visitados + Título */}
        <div className="flex items-center gap-2.5 min-w-0 justify-self-start">
          {onBack ? (
            <button
              id="back-to-country-desktop-btn"
              type="button"
              onClick={onBack}
              className="p-1.5 bg-white dark:bg-[#282D35] rounded-full shadow-xs hover:bg-rose-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-accent-primary transition-colors border border-[#FFE4EA] dark:border-zinc-700 cursor-pointer flex-shrink-0"
              title={backTitle}
              aria-label={backTitle}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-lg leading-none flex-shrink-0" aria-hidden="true">
              🇨🇴
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] lg:text-[11px] font-bold text-accent-primary tracking-wider uppercase leading-tight">
                {eyebrowLabel}
              </span>
              <span
                style={{
                  backgroundColor: 'var(--color-accent-light)',
                  color: 'var(--color-accent)'
                }}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap leading-none"
              >
                {visitedCount}/{totalCount} visitados
              </span>
            </div>
            <TitleTag className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 truncate leading-tight mt-0.5">
              {sectionTitle}
            </TitleTag>
          </div>
        </div>

        {/* Centro: Píldora con Explorador / Recuerdos / Reportes */}
        <nav
          className="justify-self-center bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full p-1 border border-gray-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-1 transition-colors"
          aria-label="Navegación principal"
        >
          <button
            id={activeTab === 'explorador' ? 'country-nav-explorer-btn' : 'nav-country-btn'}
            type="button"
            onClick={onSelectExplorador}
            style={
              activeTab === 'explorador'
                ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                : undefined
            }
            className={`shrink-0 whitespace-nowrap px-3 lg:px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'explorador'
                ? 'text-white shadow-sm'
                : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-rose-50 dark:hover:bg-zinc-800'
            }`}
            title="Explorador Nacional"
            aria-label="Explorador"
          >
            <Compass
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                activeTab === 'explorador' ? 'text-white' : ''
              }`}
            />
            <span className="hidden lg:inline">Explorador</span>
          </button>

          {onSelectRecuerdos && (
            <button
              id={activeTab === 'explorador' ? 'country-nav-recuerdos-btn' : 'nav-profile-btn'}
              type="button"
              onClick={onSelectRecuerdos}
              style={
                activeTab === 'recuerdos'
                  ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                  : undefined
              }
              className={`shrink-0 whitespace-nowrap px-3 lg:px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'recuerdos'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-rose-50 dark:hover:bg-zinc-800'
              }`}
              title="Muro de Recuerdos - Familia Palacio"
              aria-label="Recuerdos"
            >
              <Heart
                className="w-3.5 h-3.5 flex-shrink-0"
                style={
                  activeTab === 'recuerdos'
                    ? { fill: '#ffffff', color: '#ffffff' }
                    : { fill: 'var(--color-accent)', color: 'var(--color-accent)' }
                }
              />
              <span className="hidden lg:inline">Recuerdos</span>
            </button>
          )}

          {onSelectReportes && (
            <button
              id={activeTab === 'explorador' ? 'country-nav-reportes-btn' : 'nav-reports-btn'}
              type="button"
              onClick={onSelectReportes}
              style={
                activeTab === 'reportes'
                  ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                  : undefined
              }
              className={`shrink-0 whitespace-nowrap px-3 lg:px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'reportes'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-rose-50 dark:hover:bg-zinc-800'
              }`}
              title="Reportes & Métricas de Viaje"
              aria-label="Reportes"
            >
              <BarChart3
                className="w-3.5 h-3.5 flex-shrink-0"
                style={
                  activeTab === 'reportes'
                    ? { color: '#ffffff' }
                    : { color: 'var(--color-accent)' }
                }
              />
              <span className="hidden lg:inline">Reportes</span>
            </button>
          )}
        </nav>

        {/* Derecha: Botón Salir */}
        <div className="flex items-center justify-end justify-self-end">
          {onLogout && (
            <button
              id={activeTab === 'explorador' ? 'header-logout-btn' : 'nav-logout-btn'}
              type="button"
              onClick={onLogout}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 bg-white dark:bg-[#282D35] border border-gray-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
              <span>Salir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

interface AppNavbarProps {
  currentRoute: string; // 'login' | 'explorador' | 'regional' | 'municipality' | '/municipio/:id' | '/recuerdos'
  onNavigate: (route: string) => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  onOpenArchitecture: () => void;
  isArchitectureOpen?: boolean;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  currentRoute,
  onNavigate,
  isAuthenticated,
  onLogout,
  onOpenArchitecture,
  isArchitectureOpen = false
}) => {
  const [visitStats, setVisitStats] = useState<VisitStats>(() => cachedVisitStats);

  useEffect(() => {
    setVisitStats(cachedVisitStats);
    const listener = (stats: VisitStats) => setVisitStats(stats);
    visitStatsListeners.add(listener);
    return () => {
      visitStatsListeners.delete(listener);
    };
  }, []);

  if (
    !isAuthenticated ||
    currentRoute === '/login' ||
    currentRoute === '/explorador' ||
    currentRoute.startsWith('/departamento') ||
    currentRoute === 'regional'
  ) {
    return null;
  }

  const isCountryActive =
    currentRoute === 'explorador' ||
    currentRoute === 'country' ||
    currentRoute === '/explorador' ||
    currentRoute.startsWith('/departamento') ||
    currentRoute === 'regional';

  const isRecuerdosActive =
    currentRoute === 'recuerdos' ||
    currentRoute === '/recuerdos';

  const isReportesActive =
    currentRoute === 'reportes' ||
    currentRoute === '/reportes';

  const isArchitectureActive =
    isArchitectureOpen ||
    currentRoute === 'architecture' ||
    currentRoute === '/arquitectura';

  const desktopActiveTab: 'explorador' | 'recuerdos' | 'reportes' | 'other' = isCountryActive
    ? 'explorador'
    : isRecuerdosActive
    ? 'recuerdos'
    : isReportesActive
    ? 'reportes'
    : 'other';

  const desktopTitle = isRecuerdosActive
    ? 'Muro de Recuerdos'
    : isReportesActive
    ? 'Reportes Globales'
    : 'Bitácora Municipal';

  return (
    <>
      {/* Encabezado unificado para Tablet/Escritorio (>= 768 px) */}
      <div className="hidden md:block sticky top-0 z-40 w-full">
        <PassportDesktopHeader
          activeTab={desktopActiveTab}
          sectionTitle={desktopTitle}
          visitedCount={visitStats.visitedCount}
          totalCount={visitStats.totalCount}
          onSelectExplorador={() => onNavigate('explorador')}
          onSelectRecuerdos={() => onNavigate('/recuerdos')}
          onSelectReportes={() => onNavigate('/reportes')}
          onLogout={onLogout}
        />
      </div>

      {/* Móvil (< 768 px): se mantiene sin cambios */}
      <header className="md:hidden w-full px-2 pt-2 flex flex-col items-center sticky top-2 z-40 pointer-events-none">
        {/* Fila Superior (Barra de Utilidades en Móvil): Título a la izquierda y Botón Salir al extremo superior derecho */}
        <div className="sm:hidden w-full max-w-sm flex items-center justify-between px-2 pb-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1">
              🇨🇴 Pasaporte Colombia
            </span>
          </div>
          {isAuthenticated && (
            <button
              id="nav-logout-mobile-btn"
              type="button"
              onClick={onLogout}
              className="shrink-0 whitespace-nowrap px-2.5 py-1 text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-zinc-800 rounded-full transition-all flex items-center gap-1 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
              <span>Salir</span>
            </button>
          )}
        </div>

        {/* Fila de Navegación Principal: Cápsula horizontal exclusivamente para las tres secciones principales */}
        <nav
          className="pointer-events-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full p-1 shadow-md sm:shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between sm:justify-start gap-1 sm:gap-2 w-full max-w-sm sm:max-w-fit mx-auto transition-colors"
          aria-label="Navegación principal"
        >
          <div className="grid grid-cols-3 gap-1 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5">
            {/* Explorador / Mapa País */}
            <button
              id="nav-country-btn"
              type="button"
              onClick={() => onNavigate('explorador')}
              style={
                isCountryActive
                  ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                  : undefined
              }
              className={`shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer ${
                isCountryActive
                  ? 'text-white shadow-md'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
              title="Explorador Nacional"
            >
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>Explorador</span>
            </button>

            {/* Familia Palacio (Muro de Recuerdos) - Activo en /recuerdos */}
            {isAuthenticated && (
              <button
                id="nav-profile-btn"
                type="button"
                onClick={() => onNavigate('/recuerdos')}
                style={
                  isRecuerdosActive
                    ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                    : undefined
                }
                className={`shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isRecuerdosActive
                    ? 'text-white shadow-md'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
                title="Muro de Recuerdos - Familia Palacio"
              >
                <Heart
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
                  style={
                    isRecuerdosActive
                      ? { fill: '#ffffff', color: '#ffffff' }
                      : { fill: 'var(--color-accent)', color: 'var(--color-accent)' }
                  }
                />
                <span>Recuerdos</span>
              </button>
            )}

            {/* Reportes & Métricas de Viaje - Activo en /reportes */}
            {isAuthenticated && (
              <button
                id="nav-reports-btn"
                type="button"
                onClick={() => onNavigate('/reportes')}
                style={
                  isReportesActive
                    ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                    : undefined
                }
                className={`shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isReportesActive
                    ? 'text-white shadow-md'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
                title="Reportes & Métricas de Viaje"
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>Reportes</span>
              </button>
            )}

            {/* Architecture & Code Review Modal - Oculto en pantallas móviles (< sm) con hidden sm:flex */}
            <button
              id="nav-architecture-btn"
              type="button"
              onClick={onOpenArchitecture}
              style={
                isArchitectureActive
                  ? {
                      color: 'var(--color-accent)',
                      backgroundColor: 'var(--color-accent-light)',
                      borderColor: 'var(--color-accent-soft)'
                    }
                  : undefined
              }
              className={`hidden sm:flex items-center gap-1.5 shrink-0 whitespace-nowrap px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer ${
                isArchitectureActive
                  ? 'border shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-transparent'
              }`}
              title="Ver Arquitectura .NET 10, EF Core, Pinia y CI/CD"
            >
              <Code2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Arquitectura</span>
            </button>
          </div>

          {/* Salir en rango sm (< md) */}
          {isAuthenticated && (
            <button
              id="nav-logout-btn"
              type="button"
              onClick={onLogout}
              className="hidden sm:flex shrink-0 whitespace-nowrap ml-2 px-3 py-2 text-xs sm:text-sm font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-zinc-800 rounded-full transition-all items-center gap-1 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
              <span>Salir</span>
            </button>
          )}
        </nav>
      </header>
    </>
  );
};

