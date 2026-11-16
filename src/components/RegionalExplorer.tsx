import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Search, ArrowLeft, CheckCircle2, Clock, MapPin, ChevronRight, Heart, LogOut, AlertCircle, RefreshCw, Compass, BarChart3 } from 'lucide-react';
import { Department, Municipality } from '../types';
import { QUINDIO_MUNICIPALITIES_GEOJSON, ANTIOQUIA_MUNICIPALITIES_GEOJSON } from '../data/geoJsonData';
import { getMunicipalitiesForDepartment } from '../data/colombiaData';
import { DestinationRouletteModal, RouletteItem } from './DestinationRouletteModal';

interface RegionalExplorerProps {
  department: Department;
  departments?: Department[];
  municipalities: Municipality[];
  homeMunicipalityId?: string | null;
  onBackToCountry: () => void;
  onSelectMunicipality: (municipalityId: string) => void;
  onSelectDepartment?: (deptId: string) => void;
  onNavigateToRecuerdos?: () => void;
  onNavigateToReportes?: () => void;
  onLogout?: () => void;
}

export const RegionalExplorer: React.FC<RegionalExplorerProps> = ({
  department,
  departments = [],
  municipalities,
  homeMunicipalityId,
  onBackToCountry,
  onSelectMunicipality,
  onSelectDepartment,
  onNavigateToRecuerdos,
  onNavigateToReportes,
  onLogout
}) => {
  const [filter, setFilter] = useState<'all' | 'visited' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [mapFailed, setMapFailed] = useState(false);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Guarantee that municipalities are never empty for any department
  const effectiveMunicipalities = useMemo(() => {
    if (municipalities && municipalities.length > 0) return municipalities;
    return getMunicipalitiesForDepartment(department.id);
  }, [municipalities, department.id]);

  const visitedMunicipalitiesCount = useMemo(
    () => effectiveMunicipalities.filter((m) => m.isVisited).length,
    [effectiveMunicipalities]
  );
  const totalMunicipalitiesCount = effectiveMunicipalities.length;
  const progressPercentage = totalMunicipalitiesCount > 0
    ? Math.round((visitedMunicipalitiesCount / totalMunicipalitiesCount) * 100)
    : 0;

  // Search filter across municipalities of the active department reacting in real-time
  const filteredMunicipalities = useMemo(() => {
    return effectiveMunicipalities.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'visited') return m.isVisited;
      if (filter === 'pending') return !m.isVisited;
      return true;
    });
  }, [effectiveMunicipalities, searchQuery, filter]);

  const visitedCount = visitedMunicipalitiesCount;
  const totalCount = totalMunicipalitiesCount;

  const rouletteMunicipalities: RouletteItem[] = useMemo(() => {
    return effectiveMunicipalities.map((m) => ({
      id: m.id,
      name: m.name,
      isVisited: m.isVisited,
      subtitle: department.name,
      code: m.code
    }));
  }, [effectiveMunicipalities, department.name]);

  useEffect(() => {
    if (viewMode !== 'map') return;
    if (!mapContainerRef.current) return;
    let resizeObserver: ResizeObserver | null = null;
    let timer: NodeJS.Timeout | null = null;

    try {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Contingency timer: switch to grid view if leaflet stalls
      timer = setTimeout(() => {
        if (!mapInstanceRef.current && viewMode === 'map') {
          console.warn('Map initialization timeout in regional view, triggering fallback grid.');
          setMapFailed(true);
          setViewMode('grid');
        }
      }, 3500);

      // Centered around the department coordinates
      const map = L.map(mapContainerRef.current, {
        center: [department.latitude, department.longitude],
        zoom: 10,
        minZoom: 8,
        maxZoom: 13,
        zoomControl: true,
        attributionControl: false
      });

      mapInstanceRef.current = map;

      // Observe size changes to ensure leaflet tiles render smoothly
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

      // Calculate bounds if GeoJSON is available, but NEVER add polygon visually to map
      const geojsonData = department.id === 'quindio'
        ? QUINDIO_MUNICIPALITIES_GEOJSON
        : department.id === 'antioquia'
        ? ANTIOQUIA_MUNICIPALITIES_GEOJSON
        : null;

      if (geojsonData) {
        try {
          const geoLayer = L.geoJSON(geojsonData, {
            style: {
              opacity: 0,
              fillOpacity: 0,
              stroke: false
            }
          });
          map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
        } catch {
          map.setView([department.latitude, department.longitude], 10);
        }
      } else {
        // If no geojson available, fit bounds using the municipality coordinates
        const validPoints = effectiveMunicipalities
          .map((m) => [m.latitude ?? m.lat, m.longitude ?? m.lng])
          .filter((pt): pt is [number, number] => pt[0] !== undefined && pt[1] !== undefined);

        if (validPoints.length > 0) {
          try {
            const bounds = L.latLngBounds(validPoints);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
          } catch {
            map.setView([department.latitude, department.longitude], 9);
          }
        } else {
          map.setView([department.latitude, department.longitude], 9);
        }
      }

      // Render exclusively circular centroid markers for all municipalities
      const markersGroup = L.layerGroup().addTo(map);

      effectiveMunicipalities.forEach((muni) => {
        const lat = muni.latitude ?? muni.lat;
        const lng = muni.longitude ?? muni.lng;
        if (lat === undefined || lng === undefined) return;

        const isMuniHome = muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code));
        const statusClass = isMuniHome ? 'home' : muni.isVisited ? 'visited' : 'pending';

        // Marcador circular puro (sin recuadros ni sombras rectangulares)
        const customIcon = L.divIcon({
          className: 'custom-centroid-marker',
          html: `
            <div class="centroid-dot muni-dot ${statusClass}" 
                 id="muni-centroid-${muni.id}"
                 title="${muni.name}${isMuniHome ? ' • Tu Ciudad Hogar' : muni.isVisited ? ' • Visitado' : ' • Pendiente'}">
              ${isMuniHome ? '🏠' : ''}
            </div>
          `,
          iconSize: isMuniHome ? [26, 26] : [20, 20],
          iconAnchor: isMuniHome ? [13, 13] : [10, 10]
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        // Redirigir directamente a la ficha del municipio al hacer clic
        marker.on('click', () => {
          onSelectMunicipality(muni.id);
        });

        marker.bindTooltip(
          `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px 4px;">
            <div style="font-weight: 800; font-size: 12px;">${isMuniHome ? '🏠 ' : ''}${muni.name}</div>
            <div style="font-size: 10px; font-weight: 600; margin-top: 1px; color: ${muni.isVisited || isMuniHome ? '#F44566' : '#64748b'};">
              ${isMuniHome ? '★ Ciudad Hogar / Residencia' : muni.isVisited ? '✓ Visitado' : '○ Pendiente'} • Ver bitácora
            </div>
          </div>`,
          {
            direction: 'top',
            offset: [0, isMuniHome ? -14 : -10]
          }
        );

        markersGroup.addLayer(marker);
      });

      if (timer) clearTimeout(timer);
    } catch (err) {
      console.error('Error initializing Regional Leaflet map:', err);
      setMapFailed(true);
      setViewMode('grid');
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [department, effectiveMunicipalities, viewMode]);

  return (
    <div
      className="min-h-screen bg-[#FDF8F7] dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 pt-4 sm:pt-6 pb-28 sm:pb-24 px-4 sm:px-8 transition-colors"
      style={{
        backgroundImage: 'linear-gradient(180deg, var(--color-accent-soft) 0%, transparent 45%)'
      }}
    >
      {/* Top Header Row matching mobile specification without absolute/fixed positioning */}
      <header className="max-w-7xl mx-auto mb-4 flex items-center justify-between w-full px-1 sm:px-0">
        {/* Back and Department Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            id="back-to-country-btn"
            onClick={onBackToCountry}
            className="p-1.5 sm:p-2 bg-white dark:bg-zinc-900 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-accent-primary transition-colors border border-[#FFE4EA] dark:border-zinc-800 cursor-pointer flex-shrink-0"
            title="Volver al mapa nacional"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-bold text-accent-primary tracking-wider uppercase">
                Departamento
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
            <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-800 dark:text-zinc-100 truncate">
              {department.name}
            </h1>
          </div>
        </div>

        {/* Right: Botón Salir sin posiciones absolutas (flex-shrink-0) */}
        {onLogout && (
          <button
            id="regional-header-logout-btn"
            type="button"
            onClick={onLogout}
            className="flex-shrink-0 ml-auto px-3 py-1.5 rounded-full text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-zinc-800 flex items-center gap-1 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span>Salir</span>
          </button>
        )}
      </header>

      {/* Fila de Navegación Principal: Cápsula idéntica a la del Explorador Nacional para consistencia visual */}
      <div className="max-w-7xl mx-auto mb-4 w-full px-1 sm:px-0">
        <nav
          className="w-full sm:w-auto sm:inline-flex bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full p-1 border border-gray-200/80 dark:border-zinc-800 shadow-sm"
          aria-label="Navegación principal de departamento"
        >
          <div className="grid grid-cols-3 gap-1 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5">
            {/* 🧭 Explorador (Vuelve al mapa nacional) */}
            <button
              id="regional-nav-explorer-btn"
              type="button"
              onClick={onBackToCountry}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff'
              }}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-medium whitespace-nowrap shadow-sm flex items-center justify-center gap-1 flex-shrink-0 cursor-pointer"
              title="Volver al Explorador Nacional"
            >
              <Compass className="w-3.5 h-3.5 flex-shrink-0 text-white" />
              <span>Explorador</span>
            </button>

            {/* ❤️ Recuerdos */}
            {onNavigateToRecuerdos && (
              <button
                id="regional-nav-recuerdos-btn"
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
                id="regional-nav-reportes-btn"
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
      </div>

      {/* Filter and Controls Row */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Pills */}
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-full shadow-[0_10px_25px_-10px_rgba(0,0,0,0.15)] border border-[#FFE4EA] dark:border-zinc-800 flex items-center gap-1">
            <button
              id="filter-all-btn"
              onClick={() => setFilter('all')}
              style={
                filter === 'all'
                  ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                  : undefined
              }
              className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                filter === 'all'
                  ? 'text-white shadow-md'
                  : 'bg-[#F6EBD0] dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-[#f0dfb7] dark:hover:bg-zinc-750'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              id="filter-visited-btn"
              onClick={() => setFilter('visited')}
              style={
                filter === 'visited'
                  ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                  : undefined
              }
              className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                filter === 'visited'
                  ? 'text-white shadow-md'
                  : 'bg-[#F6EBD0] dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-[#f0dfb7] dark:hover:bg-zinc-750'
              }`}
            >
              Visitados ({visitedCount})
            </button>
            <button
              id="filter-pending-btn"
              onClick={() => setFilter('pending')}
              style={
                filter === 'pending'
                  ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                  : undefined
              }
              className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                filter === 'pending'
                  ? 'text-white shadow-md'
                  : 'bg-[#F6EBD0] dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-[#f0dfb7] dark:hover:bg-zinc-750'
              }`}
            >
              Pendientes ({totalCount - visitedCount})
            </button>
          </div>

          {/* Selector de Vista (Toggle en Cápsula): 🗺️ Ver Mapa / 🗂️ Ver Cuadrícula */}
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-full shadow-[0_10px_25px_-10px_rgba(0,0,0,0.15)] border border-[#FFE4EA] dark:border-zinc-800 flex items-center gap-1">
            <button
              id="view-mode-map-btn"
              type="button"
              onClick={() => {
                setMapFailed(false);
                setViewMode('map');
              }}
              style={
                viewMode === 'map' && !mapFailed
                  ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                viewMode === 'map' && !mapFailed
                  ? 'text-white shadow-md'
                  : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary hover:bg-[#FFF5F7] dark:hover:bg-zinc-800'
              }`}
              title="Ver mapa interactivo"
            >
              <span>🗺️</span>
              <span>Ver Mapa</span>
            </button>
            <button
              id="view-mode-grid-btn"
              type="button"
              onClick={() => {
                setMapFailed(false);
                setViewMode('grid');
              }}
              style={
                viewMode === 'grid'
                  ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-soft)' }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                viewMode === 'grid'
                  ? 'text-white shadow-md'
                  : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary hover:bg-[#FFF5F7] dark:hover:bg-zinc-800'
              }`}
              title="Ver cuadrícula de municipios"
            >
              <span>🗂️</span>
              <span>Ver Cuadrícula</span>
            </button>
          </div>

          {/* 🎰 Ruleta de Pueblos (Botón Píldora Interactivo) */}
          <button
            id="regional-roulette-header-btn"
            type="button"
            onClick={() => setIsRouletteOpen(true)}
            className="px-3.5 py-2 rounded-full text-xs font-bold bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-[0_10px_25px_-10px_rgba(0,0,0,0.15)] border border-rose-200 dark:border-zinc-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap group hover:-translate-y-0.5 active:translate-y-0"
            title="🎰 Ruleta de Pueblos"
          >
            <span className="text-xs transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">🎰</span>
            <span>Ruleta de Pueblos</span>
          </button>
        </div>

        {onNavigateToRecuerdos && (
          <button
            id="regional-nav-recuerdos-btn"
            type="button"
            onClick={onNavigateToRecuerdos}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full shadow-sm border border-[#FFE4EA] dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-accent-primary hover:bg-[#FFF5F7] dark:hover:bg-zinc-800 transition-all cursor-pointer whitespace-nowrap"
            title="Ir al Muro de Recuerdos de la Familia Palacio"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 flex-shrink-0" />
            <span className="hidden sm:inline">Familia Palacio (Recuerdos)</span>
            <span className="sm:hidden">Recuerdos</span>
          </button>
        )}
      </div>

      {/* Contingency Mode Banner ONLY when map actually fails */}
      {mapFailed && (
        <div className="max-w-7xl mx-auto bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>No se pudo cargar el mapa. Te mostramos el directorio de municipios.</span>
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

      {/* Main Content Area: Conditional rendering based on viewMode */}
      {viewMode === 'map' && !mapFailed ? (
        <>
          {/* Panel Lateral Separado del Mapa matching Layout Instructions */}
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 mb-8">
            {/* Left: Interactive Department Map Canvas */}
            <div className="flex-1 h-[480px] bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-[#FFF0F3] dark:border-zinc-800 relative">
              <div
                id="department-leaflet-map"
                ref={mapContainerRef}
                className="w-full h-full z-10 map-pastel-filter"
                style={{ filter: 'saturate(0.7) brightness(1.05)' }}
              />
              {/* Map Legend Overlay */}
              <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-[#1E2228]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-[#FFE4EA] dark:border-zinc-700 flex items-center gap-3 text-xs pointer-events-none">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white inline-block shadow-sm"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  />
                  <span className="text-slate-600 dark:text-zinc-200 font-medium">Visitado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-700 border-2 border-dashed border-[#D1D5DB] dark:border-zinc-500 inline-block shadow-sm" />
                  <span className="text-slate-600 dark:text-zinc-200 font-medium">Pendiente</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-[11px] text-accent-primary font-medium">● Clic para ver ficha</span>
                </div>
              </div>
            </div>

            {/* Right: Separated Floating White Card (rounded-3xl) */}
            <div className="w-full lg:w-96 h-[480px] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)] border border-[#FFF0F3] dark:border-zinc-800 flex-shrink-0 animate-in slide-in-from-right-5 duration-300">
              {/* Barra de búsqueda reactiva de municipios del departamento y Ruleta de Pueblos */}
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <div className="relative flex-1 min-w-0">
                  <input
                    id="search-regional-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Buscar municipio de ${department.name}...`}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FFFBFB] dark:bg-zinc-800 border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 shadow-sm transition-all"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                {/* 🎰 Ruleta de Pueblos */}
                <button
                  id="regional-roulette-sidebar-btn"
                  type="button"
                  onClick={() => setIsRouletteOpen(true)}
                  className="px-3 py-2.5 rounded-full text-xs font-bold bg-[#FFF0F3] dark:bg-[#282D35] text-rose-600 dark:text-rose-400 border border-rose-200/90 dark:border-rose-900/60 shadow-2xs hover:shadow-md hover:bg-rose-100/60 dark:hover:bg-zinc-750 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap group hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
                  title="🎰 Ruleta de Pueblos"
                >
                  <span className="text-xs transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">🎰</span>
                  <span className="hidden sm:inline">Ruleta</span>
                </button>
              </div>

              {/* Tarjeta de Progreso Regional (Nivel Departamento) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)'
                }}
                className="text-white p-4.5 rounded-3xl shadow-md mb-4 text-center relative overflow-hidden flex-shrink-0"
              >
                <div className="relative z-10">
                  <span className="block text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {visitedMunicipalitiesCount} / {totalMunicipalitiesCount}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase opacity-95 block mt-0.5">
                    MUNICIPIOS VISITADOS EN {department.name.toUpperCase()}
                  </span>
                  {/* Barra de porcentaje y texto sutil de avance */}
                  <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-col gap-1.5">
                    <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-white h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium opacity-95">
                      {progressPercentage}% completado
                    </span>
                  </div>
                </div>
                {/* Soft decorative background ring */}
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/15 pointer-events-none" />
              </div>

              {/* Section title & counter badge */}
              <div className="flex justify-between items-center mb-2.5 px-1 flex-shrink-0">
                <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Municipios
                </h3>
                <span
                  style={{
                    backgroundColor: 'var(--color-accent-light)',
                    color: 'var(--color-accent)'
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                >
                  {filteredMunicipalities.length} de {totalMunicipalitiesCount}
                </span>
              </div>

              {/* Scrollable list */}
              <div className="overflow-y-auto space-y-2 pr-2.5 sm:pr-3 pb-28 sm:pb-20 flex-1 min-h-0">
                {filteredMunicipalities.length > 0 ? (
                  filteredMunicipalities.map((muni) => (
                    <div
                      key={muni.id}
                      onClick={() => onSelectMunicipality(muni.id)}
                      className="p-2.5 bg-[#FFFBFB] dark:bg-zinc-800/80 hover:bg-[#FFF3F5] dark:hover:bg-zinc-800 rounded-2xl border border-[#FFE8ED] dark:border-zinc-700 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            (muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code)))
                              ? 'bg-rose-500 text-white shadow-xs'
                              : muni.isVisited
                              ? 'bg-[#FFE4EA] dark:bg-zinc-700 text-accent-primary'
                              : 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-300'
                          }`}
                        >
                          {(muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code))) ? (
                            <span className="text-xs">🏠</span>
                          ) : muni.isVisited ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 group-hover:text-accent-primary truncate block">
                              {muni.name}
                            </span>
                            {(muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code))) && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-700/60 flex-shrink-0">
                                Hogar
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                            {(muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code)))
                              ? 'Ciudad Hogar / Residencia'
                              : muni.isVisited
                              ? 'Visitado'
                              : 'Pendiente'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-accent-primary group-hover:underline flex-shrink-0">
                        Ver Bitácora →
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 px-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-300">
                      No se encontraron municipios con ese criterio en {department.name}.
                    </p>
                    {(searchQuery || filter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilter('all');
                        }}
                        className="mt-2 text-[11px] font-semibold text-accent-primary hover:underline cursor-pointer"
                      >
                        Restablecer filtros
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fast Access Photographic Grid matching Screenshot 3 */}
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <span>Municipios de {department.name}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-[#FFE4EA] dark:border-zinc-800 text-slate-600 dark:text-zinc-300">
                  {filteredMunicipalities.length} resultados
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMunicipalities.map((muni) => (
                <div
                  key={muni.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-[0_10px_25px_-10px_rgba(0,0,0,0.12)] border border-[#FFF0F3] dark:border-zinc-800 hover:shadow-lg transition-all duration-200 flex flex-col group"
                >
                  {/* Photo or pastel placeholder */}
                  <div className="relative h-32 w-full bg-[#FFDFEC] dark:bg-zinc-800 overflow-hidden">
                    {muni.coverPhoto ? (
                      <img
                        src={muni.coverPhoto}
                        alt={muni.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#FFDFEC] dark:bg-zinc-800 text-accent-primary">
                        <MapPin className="w-8 h-8 opacity-60" />
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      {(muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code))) ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center gap-1">
                          <span>🏠</span> Hogar
                        </span>
                      ) : (
                        <span
                          style={
                            muni.isVisited
                              ? { backgroundColor: 'var(--color-accent)' }
                              : undefined
                          }
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                            muni.isVisited
                              ? 'text-white'
                              : 'bg-white/90 dark:bg-zinc-800/90 text-slate-600 dark:text-zinc-300 backdrop-blur-sm'
                          }`}
                        >
                          {muni.isVisited ? 'Visitado' : 'Pendiente'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div className="mb-2">
                      <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm truncate group-hover:text-accent-primary transition-colors flex items-center gap-1">
                        <span className="truncate">{muni.name}</span>
                        {(muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code))) && (
                          <span className="text-xs" title="Tu Ciudad Hogar">🏠</span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                        {muni.description}
                      </p>
                    </div>

                    {/* Action Pill matching screenshot: "Ver Bitácora" */}
                    <button
                      id={`view-bitacora-${muni.id}`}
                      onClick={() => onSelectMunicipality(muni.id)}
                      style={
                        muni.isVisited
                          ? { backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)' }
                          : undefined
                      }
                      className={`w-full py-1.5 px-3 rounded-full text-xs font-bold transition-all text-center cursor-pointer ${
                        (muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code)))
                          ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white'
                          : muni.isVisited
                          ? 'hover:opacity-90'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-[#FFE8ED] dark:hover:bg-zinc-750 hover:text-accent-primary'
                      }`}
                    >
                      Ver Bitácora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Cuadrícula / Directorio Completo de Municipios (Modo Grid o Contingencia) */
        <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
          {/* Barra de Búsqueda Reactiva y Progreso en Modo Cuadrícula */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-[#FFE4EA] dark:border-zinc-800 shadow-[0_10px_25px_-10px_rgba(0,0,0,0.12)]">
            <div className="relative flex-1 max-w-md">
              <input
                id="grid-search-municipality-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar municipio de ${department.name}...`}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFBFB] dark:bg-zinc-800 border border-[#FAD2DA] dark:border-zinc-700 rounded-full text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 shadow-sm transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">
                Mostrando <strong className="text-slate-800 dark:text-zinc-100">{filteredMunicipalities.length}</strong> de <strong className="text-slate-800 dark:text-zinc-100">{totalMunicipalitiesCount}</strong> municipios
              </span>
              <span
                style={{
                  backgroundColor: 'var(--color-accent-light)',
                  color: 'var(--color-accent)'
                }}
                className="font-bold px-3 py-1 rounded-full text-[11px] whitespace-nowrap"
              >
                {visitedMunicipalitiesCount}/{totalMunicipalitiesCount} visitados ({progressPercentage}%)
              </span>
            </div>
          </div>

          {/* Grid responsivo de municipios (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredMunicipalities.map((muni) => (
              <div
                key={muni.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)] border border-[#FFF0F3] dark:border-zinc-800 hover:border-accent-soft hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Cabecera: Nombre del municipio en negrita y badge pastel a la derecha */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-zinc-100 group-hover:text-accent-primary transition-colors truncate flex items-center gap-1.5">
                        <span className="truncate">{muni.name}</span>
                        {(muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code))) && (
                          <span className="text-xs" title="Tu Ciudad Hogar">🏠</span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                        {department.name} {muni.code ? `• Cód. ${muni.code}` : ''}
                      </p>
                    </div>
                    <span
                      style={
                        muni.isVisited && !(muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code)))
                          ? { backgroundColor: 'var(--color-accent)' }
                          : undefined
                      }
                      className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-2xs ${
                        (muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code)))
                          ? 'bg-rose-500 text-white'
                          : muni.isVisited
                          ? 'text-white'
                          : 'bg-[#F6EBD0] dark:bg-zinc-800 text-slate-700 dark:text-zinc-200'
                      }`}
                    >
                      {(muni.isHome || (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code)))
                        ? '🏠 Hogar'
                        : muni.isVisited
                        ? 'Visitado'
                        : 'Pendiente'}
                    </span>
                  </div>

                  {/* Detalle rápido: Un dato clave o descripción corta */}
                  <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-3 mb-3.5 leading-relaxed">
                    {muni.description || 'Tierra de cafetales, hospitalidad y arquitectura tradicional.'}
                  </p>

                  {/* Tags representativos */}
                  {muni.tags && muni.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {muni.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF5F7] dark:bg-zinc-800 text-accent-primary border border-[#FFE4EA] dark:border-zinc-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta: Botón en píldora: "Abrir Bitácora →" */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 mt-2">
                  <button
                    id={`open-bitacora-${muni.id}`}
                    onClick={() => onSelectMunicipality(muni.id)}
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      borderColor: 'var(--color-accent-soft)'
                    }}
                    className="w-full py-2.5 px-4 rounded-full text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer text-white shadow-xs hover:opacity-90"
                  >
                    <span>Abrir Bitácora</span>
                    <span className="group-hover:translate-x-0.5 transition-transform font-bold">→</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Empty state if search/filters return 0 results */}
            {filteredMunicipalities.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm rounded-3xl border border-[#FFE4EA] dark:border-zinc-800 p-8">
                <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300">
                  No se encontraron municipios con ese criterio en {department.name}.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                  style={{
                    backgroundColor: 'var(--color-accent)'
                  }}
                  className="mt-3 px-4 py-2 text-white text-xs font-bold rounded-full hover:opacity-90 transition-all cursor-pointer"
                >
                  Restablecer búsqueda y filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Interactivo de la Ruleta de Pueblos */}
      <DestinationRouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        mode="municipalities"
        title={`🎰 Ruleta de Pueblos (${department.name})`}
        items={rouletteMunicipalities}
        onSelectWinner={(muniId) => onSelectMunicipality(muniId)}
      />
    </div>
  );
};
