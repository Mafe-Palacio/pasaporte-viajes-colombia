import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Search, MapPin, Compass, AlertCircle, RefreshCw, ChevronRight, Layers, Heart, LogOut, BarChart3 } from 'lucide-react';
import { Department } from '../types';
import { COLOMBIA_GEOJSON } from '../data/geoJsonData';
import { DestinationRouletteModal, RouletteItem } from './DestinationRouletteModal';
import { PassportDesktopHeader, syncPassportVisitStats } from './AppNavbar';

interface CountryExplorerProps {
  departments: Department[];
  homeDepartmentId?: string | null;
  onSelectDepartment: (deptId: string) => void;
  onNavigateToRecuerdos?: () => void;
  onNavigateToReportes?: () => void;
  onLogout?: () => void;
}

export const CountryExplorer: React.FC<CountryExplorerProps> = ({
  departments,
  homeDepartmentId,
  onSelectDepartment,
  onNavigateToRecuerdos,
  onNavigateToReportes,
  onLogout
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'visited' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [mapFailed, setMapFailed] = useState(false);
  const [hoveredDept, setHoveredDept] = useState<Department | null>(null);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const visitedCount = departments.filter((d) => d.isVisited).length;
  const totalCount = departments.length;

  useEffect(() => {
    syncPassportVisitStats(visitedCount, totalCount);
  }, [visitedCount, totalCount]);

  // Filtered list by search query
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.capital.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Departments to display based on selected tab ('all' by default to show all 32)
  const displayedDepartments = filteredDepartments.filter((d) => {
    if (filterTab === 'visited') return d.isVisited;
    if (filterTab === 'pending') return !d.isVisited;
    return true; // Default: show all 32 departments of Colombia
  });

  // Initialize Leaflet Map (only on desktop screens to save mobile resources)
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return;
    }

    let timer: NodeJS.Timeout | null = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      // Clean up previous instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // 3.5-second fallback timer if map fails or hangs
      timer = setTimeout(() => {
        if (!mapInstanceRef.current) {
          setMapFailed(true);
          setViewMode('grid');
        }
      }, 3500);

      // Create map centered on Colombia
      const map = L.map(mapContainerRef.current, {
        center: [4.5709, -74.2973],
        zoom: 6,
        minZoom: 5,
        maxZoom: 9,
        zoomControl: true,
        attributionControl: false
      });

      mapInstanceRef.current = map;

      // Ensure Leaflet resizes correctly when container bounds stabilize
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);

      // Clean, open OpenStreetMap tile layer (100% free and open, no API key required)
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });

      tileLayer.addTo(map);

      // Eliminar polígonos GeoJSON / Bounding boxes visuales para conservar exclusivamente centroides circulares
      const geoLayer = L.geoJSON(COLOMBIA_GEOJSON, {
        style: {
          opacity: 0,
          fillOpacity: 0,
          stroke: false
        }
      });
      // Conservar referencia sin agregarlo visualmente al mapa
      geoJsonLayerRef.current = geoLayer;

      // Add Centroid Circle Button Markers (32 departamentos de Colombia)
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      departments.forEach((dept) => {
        const isHomeDept = homeDepartmentId === dept.id;
        const statusClass = isHomeDept ? 'home' : dept.isVisited ? 'visited' : 'pending';

        // Custom circular button marker (100% circular, sin recuadros oscuros)
        const customIcon = L.divIcon({
          className: 'custom-centroid-marker',
          html: `
            <div class="centroid-dot ${statusClass}" 
                 id="dept-centroid-${dept.id}"
                 title="${dept.name} (${dept.visitedMunicipalities}/${dept.totalMunicipalities} municipios)${isHomeDept ? ' • Departamento Hogar' : ''}">
              ${isHomeDept ? '🏠' : ''}
            </div>
          `,
          iconSize: isHomeDept ? [28, 28] : [24, 24],
          iconAnchor: isHomeDept ? [14, 14] : [12, 12]
        });

        const marker = L.marker([dept.latitude, dept.longitude], {
          icon: customIcon
        });

        marker.on('click', () => {
          onSelectDepartment(dept.id);
        });

        marker.on('mouseover', () => {
          setHoveredDept(dept);
        });

        marker.on('mouseout', () => {
          setHoveredDept(null);
        });

        marker.bindTooltip(
          `<strong>${dept.name}</strong>${isHomeDept ? ' 🏠 (Tu Departamento Hogar)' : ''}<br/>${dept.visitedMunicipalities} de ${dept.totalMunicipalities} municipios visitados`,
          {
            direction: 'top',
            offset: [0, -10]
          }
        );

        markersGroup.addLayer(marker);
      });

      // Fit map to Colombia bounds safely
      map.fitBounds([
        [-4.2, -79.0],
        [12.5, -67.0]
      ]);

      if (timer) clearTimeout(timer);
    } catch (err) {
      console.error('Error loading Leaflet map:', err);
      setMapFailed(true);
      setViewMode('grid');
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (timer) clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, departments]);

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-[#FFF0F3] dark:bg-[#121417] text-slate-800 dark:text-zinc-100 flex flex-col transition-colors"
      style={{
        backgroundImage: 'linear-gradient(180deg, var(--color-accent-soft) 0%, transparent 45%)'
      }}
    >
      {/* Encabezado compacto de una sola fila en Tablet/Escritorio (>= 768 px) */}
      <PassportDesktopHeader
        activeTab="explorador"
        sectionTitle="Explorador Nacional"
        visitedCount={visitedCount}
        totalCount={totalCount}
        onSelectExplorador={() => {}}
        onSelectRecuerdos={onNavigateToRecuerdos}
        onSelectReportes={onNavigateToReportes}
        onLogout={onLogout}
      />

      {/* Header Móvil (< 768 px): se mantiene intacto en dos niveles */}
      <header className="md:hidden w-full bg-white/80 dark:bg-[#1E2228]/90 backdrop-blur-md border-b border-rose-100 dark:border-zinc-800 flex-shrink-0 z-20 px-3 sm:px-6 py-2 sm:py-3 transition-colors">
        {/* Fila Superior (Barra de Utilidades): Título a la izquierda y Botón Salir en el extremo superior derecho */}
        <div className="flex items-center justify-between w-full mb-2 sm:mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg flex-shrink-0">🇨🇴</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-bold text-accent-primary tracking-wider uppercase">
                  Pasaporte Colombia
                </span>
                <span
                  style={{
                    backgroundColor: 'var(--color-accent-light)',
                    color: 'var(--color-accent)'
                  }}
                  className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                >
                  {visitedCount}/{totalCount} visitados
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-100 truncate">
                Explorador Nacional
              </h1>
            </div>
          </div>

          {/* Botón Salir en el extremo superior derecho (sin competir por el ancho de los botones principales) */}
          {onLogout && (
            <button
              id="header-logout-btn"
              type="button"
              onClick={onLogout}
              className="flex-shrink-0 ml-auto px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 bg-white dark:bg-[#1E2228] border border-gray-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-zinc-800 flex items-center gap-1 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>Salir</span>
            </button>
          )}
        </div>

        {/* Fila de Navegación Principal: Cápsula horizontal exclusivamente para las tres secciones principales */}
        <nav
          className="w-full sm:w-auto sm:inline-flex bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full p-1 border border-gray-200/80 dark:border-zinc-800 shadow-sm"
          aria-label="Navegación principal de explorador"
        >
          <div className="grid grid-cols-3 gap-1 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5">
            {/* 🧭 Explorador */}
            <button
              id="country-nav-explorer-btn"
              type="button"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff'
              }}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-medium whitespace-nowrap shadow-sm flex items-center justify-center gap-1 flex-shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 flex-shrink-0 text-white" />
              <span>Explorador</span>
            </button>

            {/* ❤️ Recuerdos */}
            {onNavigateToRecuerdos && (
              <button
                id="country-nav-recuerdos-btn"
                type="button"
                onClick={onNavigateToRecuerdos}
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-medium whitespace-nowrap text-slate-600 dark:text-zinc-300 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1 flex-shrink-0 cursor-pointer"
                title="Ir al Muro de Recuerdos de la Familia Palacio"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 flex-shrink-0" />
                <span>Recuerdos</span>
              </button>
            )}

            {/* 📊 Reportes */}
            {onNavigateToReportes && (
              <button
                id="country-nav-reportes-btn"
                type="button"
                onClick={onNavigateToReportes}
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-medium whitespace-nowrap text-slate-600 dark:text-zinc-300 hover:text-accent-primary dark:hover:text-zinc-100 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1 flex-shrink-0 cursor-pointer"
                title="Ver Reportes Globales y Métricas"
              >
                <BarChart3 className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <span>Reportes</span>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content Area: Map Canvas (hidden on mobile) and Department Cards Panel */}
      <div className="flex-1 px-3 sm:px-6 md:px-8 pt-3 sm:pt-4 pb-4 sm:pb-6 min-h-0 flex flex-col md:flex-row gap-4 sm:gap-6">
        {/* Left: Map Canvas - Oculto en pantallas móviles (< md) para máximo rendimiento */}
        <div className="hidden md:flex flex-1 h-full min-h-0 bg-white dark:bg-[#1E2228] rounded-3xl overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-[#FFF0F3] dark:border-zinc-800 relative flex-col">
          {viewMode === 'map' && !mapFailed ? (
            <div 
              id="colombia-leaflet-map"
              ref={mapContainerRef} 
              className="w-full h-full z-10 map-pastel-filter dark:invert-[0.88] dark:hue-rotate-180 dark:contrast-[0.95] dark:brightness-[0.9]"
              style={{ minHeight: '100%' }}
            />
          ) : (
            /* Directory Grid (user-selected or real map fallback) */
            <div className="w-full h-full overflow-y-auto px-6 py-6 pb-28 sm:pb-20 z-10 animate-in fade-in">
              {mapFailed && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>No se pudo cargar el mapa. Te mostramos el directorio de departamentos.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMapFailed(false);
                      setViewMode('map');
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-accent-primary hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reintentar Mapa
                  </button>
                </div>
              )}

              <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 mb-4">
                Directorio Departamental de Colombia ({visitedCount}/{totalCount})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {displayedDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    onClick={() => onSelectDepartment(dept.id)}
                    className="bg-white dark:bg-[#282D35] rounded-3xl p-5 shadow-[0_10px_25px_-10px_rgba(0,0,0,0.1)] border border-[#FFF0F3] dark:border-zinc-700 hover:border-accent-soft hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 dark:text-zinc-100 group-hover:text-accent-primary transition-colors">
                          {dept.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">Capital: {dept.capital}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        dept.isVisited
                          ? 'bg-[#FFE8ED] dark:bg-zinc-700 text-accent-primary'
                          : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-200'
                      }`}>
                        {dept.isVisited ? 'Explorado' : 'Pendiente'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-2 mb-4">
                      {dept.description}
                    </p>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                        <span>Municipios:</span>
                        <span>{dept.visitedMunicipalities} de {dept.totalMunicipalities} ({dept.progressPercentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${dept.progressPercentage}%`,
                            backgroundColor: 'var(--color-accent)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map Legend at bottom-left */}
          {viewMode === 'map' && !mapFailed && (
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-[#1E2228]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-[#FFE4EA] dark:border-zinc-700 flex flex-wrap items-center gap-3 text-xs pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#FEA38E] border border-white inline-block shadow-sm" />
                <span className="text-slate-600 dark:text-zinc-200 font-medium">Explorado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#E2E8F0] dark:bg-zinc-600 border border-white inline-block shadow-sm" />
                <span className="text-slate-600 dark:text-zinc-200 font-medium">Pendiente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full bg-white border-2 inline-block shadow-sm"
                  style={{ borderColor: 'var(--color-accent)' }}
                />
                <span className="text-slate-600 dark:text-zinc-200 font-medium">Centroide interactivo</span>
              </div>
              {homeDepartmentId && (
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center border border-white shadow-sm">
                    🏠
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">Hogar</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel de Departamentos (100% de ancho en móvil, panel lateral en desktop) */}
        <div className="w-full md:w-96 flex-1 md:flex-initial h-full flex flex-col bg-white dark:bg-[#1E2228] rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)] border border-[#FFF0F3] dark:border-zinc-800 min-h-0 animate-in slide-in-from-right-5 duration-300">
          {/* Buscador en píldora superior */}
          <div className="relative mb-3 sm:mb-4 flex-shrink-0">
            <input
              id="search-department-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar departamento o capital..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#FFFBFB] dark:bg-[#282D35] border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 shadow-sm transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 sm:top-3.5 pointer-events-none" />
          </div>

          {/* Tarjeta de progreso pastel: "X / 32 Departamentos" */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)'
            }}
            className="text-white p-4 sm:p-5 rounded-3xl shadow-md mb-3 sm:mb-4 text-center relative overflow-hidden flex-shrink-0"
          >
            <div className="relative z-10">
              <span className="block text-2xl sm:text-4xl font-extrabold tracking-tight">
                {visitedCount} / {totalCount}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase opacity-95">
                Departamentos visitados
              </span>
            </div>
            {/* Soft decorative background ring */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/15 pointer-events-none" />
          </div>

          {/* Píldoras de filtro (Todos / Visitados / Pendientes) y Ruleta */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 flex-shrink-0">
            <div className="flex items-center gap-1 bg-[#FFF5F7] dark:bg-[#282D35] p-1 rounded-full text-[10px] sm:text-[11px] font-semibold border border-[#FFE4EA] dark:border-zinc-700 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                style={
                  filterTab === 'all'
                    ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                    : undefined
                }
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  filterTab === 'all'
                    ? 'text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary'
                }`}
              >
                Todos ({departments.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('visited')}
                style={
                  filterTab === 'visited'
                    ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                    : undefined
                }
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  filterTab === 'visited'
                    ? 'text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary'
                }`}
              >
                Visitados ({visitedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                style={
                  filterTab === 'pending'
                    ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                    : undefined
                }
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  filterTab === 'pending'
                    ? 'text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary'
                }`}
              >
                Pendientes ({totalCount - visitedCount})
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Botón Píldora: 🎰 ¿A dónde ir? (Ruleta de Departamentos) */}
              <button
                id="country-roulette-trigger-btn"
                type="button"
                onClick={() => setIsRouletteOpen(true)}
                className="px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-white dark:bg-[#282D35] text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-2xs hover:shadow-md hover:bg-rose-50 dark:hover:bg-zinc-800 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap group hover:-translate-y-0.5 active:translate-y-0"
                title="🎰 ¿A dónde ir? (Ruleta de Departamentos)"
              >
                <span className="text-xs transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">🎰</span>
                <span>¿A dónde ir?</span>
              </button>

              {/* Toggle 'Ver Mapa / Ver Cuadrícula' oculto en versión móvil con hidden md:flex */}
              <button
                type="button"
                onClick={() => {
                  if (viewMode === 'grid') {
                    setMapFailed(false);
                    setViewMode('map');
                  } else {
                    setMapFailed(false);
                    setViewMode('grid');
                  }
                }}
                className="hidden md:flex text-[11px] font-semibold text-accent-primary hover:underline items-center gap-1 cursor-pointer flex-shrink-0 ml-1"
              >
                <Layers className="w-3 h-3" />
                {viewMode === 'grid' ? 'Ver Mapa' : 'Ver Cuadrícula'}
              </button>
            </div>
          </div>

          {/* Listado vertical de tarjetas de todos los departamentos (con clic directo) */}
          <div className="overflow-y-auto space-y-2 sm:space-y-2.5 pr-2.5 sm:pr-3 pb-28 sm:pb-20 flex-1 min-h-0">
            {displayedDepartments.map((dept) => (
              <div
                key={dept.id}
                onClick={() => onSelectDepartment(dept.id)}
                className="p-3 bg-[#FFFBFB] dark:bg-[#282D35] hover:bg-[#FFF3F5] dark:hover:bg-[#2c323b] rounded-2xl border border-[#FFE8ED] dark:border-zinc-700 transition-all cursor-pointer flex items-center gap-3 group shadow-xs"
              >
                {/* Icono / Mini badge del departamento */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                    dept.isVisited
                      ? 'bg-[#FFE4EA] dark:bg-zinc-700 text-accent-primary'
                      : 'bg-slate-100 dark:bg-zinc-700/70 text-slate-500 dark:text-zinc-300'
                  }`}
                >
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                {/* Nombre, Capital y Progreso */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5 gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 truncate group-hover:text-accent-primary transition-colors flex items-center gap-1.5">
                      <span className="truncate">{dept.name}</span>
                      {homeDepartmentId === dept.id && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-700/60 flex items-center gap-0.5 flex-shrink-0">
                          🏠 Hogar
                        </span>
                      )}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      dept.isVisited
                        ? 'bg-[#FFE8ED] dark:bg-zinc-700 text-accent-primary'
                        : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-200'
                    }`}>
                      {dept.isVisited ? 'Explorado' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-zinc-300 mb-1">
                    <span className="truncate">Capital: {dept.capital}</span>
                    <span className="flex-shrink-0 font-medium">
                      {dept.visitedMunicipalities}/{dept.totalMunicipalities} ({dept.progressPercentage}%)
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${dept.progressPercentage}%`,
                        backgroundColor: 'var(--color-accent)'
                      }}
                    />
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-400 group-hover:text-accent-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            ))}

            {displayedDepartments.length === 0 && (
              <div className="text-center py-12 px-4 bg-[#FFFBFB] dark:bg-[#282D35] rounded-2xl border border-dashed border-[#FFE4EA] dark:border-zinc-700">
                <MapPin className="w-8 h-8 text-slate-300 dark:text-zinc-500 mx-auto mb-2" />
                {searchQuery.trim() !== '' ? (
                  <p className="text-xs text-slate-500 dark:text-zinc-300 font-medium">
                    No se encontraron departamentos que coincidan con "{searchQuery}".
                  </p>
                ) : filterTab === 'visited' ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-zinc-100">
                      Aún no tienes departamentos visitados
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Selecciona la pestaña "Todos" para comenzar a explorar y registrar tus viajes en Colombia.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFilterTab('all')}
                      className="text-xs font-bold text-[#F44566] hover:underline pt-1 inline-block cursor-pointer"
                    >
                      Ver todos los 32 departamentos
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-zinc-300 font-medium">
                    No hay departamentos disponibles en este filtro.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Interactivo de la Ruleta de Departamentos */}
      <DestinationRouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        mode="departments"
        items={departments.map((d) => ({
          id: d.id,
          name: d.name,
          isVisited: d.isVisited,
          subtitle: d.capital,
          color: d.color,
          totalMunicipalities: d.totalMunicipalities
        }))}
        onSelectWinner={(id) => onSelectDepartment(id)}
      />
    </div>
  );
};
