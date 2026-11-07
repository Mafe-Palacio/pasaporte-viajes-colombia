import React from 'react';
import { Compass, BookOpen, Heart, LogOut, Code2, BarChart3 } from 'lucide-react';

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
  if (
    !isAuthenticated ||
    currentRoute === '/login' ||
    currentRoute === '/explorador' ||
    currentRoute.startsWith('/departamento') ||
    currentRoute === 'regional'
  ) {
    return null;
  }

  // Reactividad estricta según la ruta activa (useRoute().path / currentRoute)
  const isBitacoraActive =
    currentRoute === 'municipality' ||
    currentRoute === 'bitacora' ||
    currentRoute.startsWith('/municipio');

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

  return (
    <header className="w-full px-2 pt-2 flex flex-col items-center sticky top-2 z-40 pointer-events-none">
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

        {/* Salir en Desktop (anclado con ml-2 en pantallas sm:) */}
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
  );
};
