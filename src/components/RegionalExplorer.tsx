import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Search, ArrowLeft, CheckCircle2, Clock, MapPin, ChevronRight, Heart, LogOut, AlertCircle, RefreshCw, Compass, BarChart3 } from 'lucide-react';
import { Department, Municipality, TripEntry } from '../types';
import { getMunicipalitiesForDepartment } from '../data/colombiaData';
import { DestinationRouletteModal, RouletteItem } from './DestinationRouletteModal';
import { PassportDesktopHeader, syncPassportVisitStats } from './AppNavbar';
import { useMunicipalityImage } from '../hooks/useMunicipalityImage';

interface MunicipalityPhotoCardProps {
  muni: Municipality;
  departmentName: string;
  userPhotoUrl?: string;
  visitCount: number;
  isHome: boolean;
  onSelect: (municipalityId: string) => void;
}

const MunicipalityPhotoCard: React.FC<MunicipalityPhotoCardProps> = ({
  muni,
  departmentName,
  userPhotoUrl,
  visitCount,
  isHome,
  onSelect
}) => {
  const {
    ref,
    imageUrl,
    description,
    isLoading,
    isDescriptionLoading,
    onImageError
  } = useMunicipalityImage({
    municipalityId: muni.id,
    municipalityName: muni.name,
    departmentName,
    userPhotoUrl,
    curatedDescription: muni.description
  });

  const initial = muni.name.trim().charAt(0).toUpperCase() || 'M';
  const visitLabel =
    visitCount === 0
      ? 'Sin visitas'
      : visitCount === 1
      ? '1 visita'
      : `${visitCount} visitas`;
  const visibleTags = (muni.tags ?? []).slice(0, 2);

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(muni.id);
    }
  };

  return (
    <article
      ref={ref}
      tabIndex={0}
      aria-label={`Abrir bitácora de ${muni.name}`}
      onClick={() => onSelect(muni.id)}
      onKeyDown={handleCardKeyDown}
      className="relative aspect-[3/4] min-h-[256px] sm:min-h-0 w-full rounded-[28px] overflow-hidden shadow-[0_14px_34px_-12px_rgba(15,23,42,0.22)] dark:shadow-[0_18px_38px_-14px_rgba(0,0,0,0.55)] border border-white/60 dark:border-zinc-800/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-14px_rgba(15,23,42,0.3)] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 select-none"
    >
      {/* Full-bleed background: loading skeleton, photo, or soft accent gradient + initial */}
      <div className="absolute inset-0 bg-white dark:bg-zinc-900 overflow-hidden">
        {isLoading ? (
          <div
            className="w-full h-full animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 flex items-center justify-center"
            aria-label={`Cargando imagen de ${muni.name}`}
          >
            <div className="w-12 h-12 rounded-full bg-white/50 dark:bg-zinc-600/50" />
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={muni.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={onImageError}
          />
        ) : (
          <div
            className="w-full h-full relative flex items-center justify-center overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-accent-light) 100%)'
            }}
          >
            <div
              className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20 pointer-events-none"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span
              className="text-7xl sm:text-8xl font-bold tracking-tight opacity-25 -translate-y-8 transition-transform duration-500 ease-out group-hover:scale-105"
              style={{ color: 'var(--color-accent)' }}
              aria-hidden="true"
            >
              {initial}
            </span>
          </div>
        )}
      </div>

      {/* Bottom-to-top dark scrim for guaranteed text legibility */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Top-right status pill */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
        {isHome ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center gap-1">
            <span>🏠</span> Hogar
          </span>
        ) : (
          <span
            style={
              muni.isVisited
                ? { backgroundColor: 'var(--color-accent)' }
                : undefined
            }
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md ${
              muni.isVisited
                ? 'text-white'
                : 'bg-white/90 dark:bg-zinc-900/90 text-slate-700 dark:text-zinc-200 backdrop-blur-md'
            }`}
          >
            {muni.isVisited ? 'Visitado' : 'Pendiente'}
          </span>
        )}
      </div>

      {/* Bottom overlay content */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3.5 sm:p-4 flex flex-col">
        {/* Title + visits count pill */}
        <div className="flex items-center justify-between gap-1.5">
          <h3 className="font-bold text-white text-sm sm:text-lg leading-tight truncate drop-shadow-sm">
            {muni.name}
          </h3>
          <span className="shrink-0 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 whitespace-nowrap">
            {visitLabel}
          </span>
        </div>

        {/* Short description (max 2 lines) or 2 skeleton lines while loading */}
        {isDescriptionLoading ? (
          <div className="mt-1.5 space-y-1.5" aria-hidden="true">
            <div className="h-2.5 w-full rounded-full bg-white/25 animate-pulse" />
            <div className="h-2.5 w-3/4 rounded-full bg-white/25 animate-pulse" />
          </div>
        ) : (
          <p className="mt-1 text-[11px] sm:text-xs text-white/85 line-clamp-2 leading-snug">
            {description}
          </p>
        )}

        {/* Up to 2 translucent tag chips (hidden if none) */}
        {visibleTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white/95 border border-white/20 truncate max-w-[115px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Full-width pill CTA button */}
        <button
          id={`view-bitacora-${muni.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(muni.id);
          }}
          style={
            muni.isVisited
              ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
              : undefined
          }
          className={`mt-3 w-full py-2 px-3 rounded-full text-xs font-bold transition-all text-center cursor-pointer shadow-md ${
            muni.isVisited
              ? 'hover:brightness-110'
              : 'bg-white text-slate-900 hover:bg-white/90'
          }`}
        >
          Ver Bitácora
        </button>
      </div>
    </article>
  );
};

interface MunicipalityDirectoryCardProps {
  muni: Municipality;
  departmentName: string;
  userPhotoUrl?: string;
  isHome: boolean;
  onSelect: (municipalityId: string) => void;
}

const MunicipalityDirectoryCard: React.FC<MunicipalityDirectoryCardProps> = ({
  muni,
  departmentName,
  userPhotoUrl,
  isHome,
  onSelect
}) => {
  const { ref, description, isDescriptionLoading } = useMunicipalityImage({
    municipalityId: muni.id,
    municipalityName: muni.name,
    departmentName,
    userPhotoUrl,
    curatedDescription: muni.description
  });

  const visibleTags = (muni.tags ?? []).slice(0, 2);

  return (
    <div
      ref={ref}
      className="bg-white dark:bg-[#282D35] rounded-3xl p-5 shadow-[0_10px_25px_-10px_rgba(0,0,0,0.12)] border border-[#FFF0F3] dark:border-zinc-700 hover:border-accent-soft hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 group-hover:text-accent-primary transition-colors truncate flex items-center gap-1.5">
              <span className="truncate">{muni.name}</span>
              {isHome && (
                <span className="text-xs" title="Tu Ciudad Hogar">🏠</span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              {departmentName} {muni.code ? `• Cód. ${muni.code}` : ''}
            </p>
          </div>
          <span
            style={
              muni.isVisited && !isHome
                ? { backgroundColor: 'var(--color-accent)' }
                : undefined
            }
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-2xs ${
              isHome
                ? 'bg-rose-500 text-white'
                : muni.isVisited
                ? 'text-white'
                : 'bg-[#F6EBD0] dark:bg-zinc-700 text-slate-700 dark:text-zinc-200'
            }`}
          >
            {isHome ? '🏠 Hogar' : muni.isVisited ? 'Visitado' : 'Pendiente'}
          </span>
        </div>

        {isDescriptionLoading ? (
          <div className="space-y-1.5 mb-3.5" aria-hidden="true">
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-3 w-4/5 rounded-full bg-slate-200 dark:bg-zinc-700 animate-pulse" />
          </div>
        ) : (
          <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-3 mb-3.5 leading-relaxed">
            {description}
          </p>
        )}

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {visibleTags.map((tag, idx) => (
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

      <div className="pt-3 border-t border-slate-100 dark:border-zinc-700 mt-2">
        <button
          id={`open-bitacora-${muni.id}`}
          type="button"
          onClick={() => onSelect(muni.id)}
          style={{
            backgroundColor: 'var(--color-accent)',
            borderColor: 'var(--color-accent-soft)'
          }}
          className="w-full py-2 px-4 rounded-full text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer text-white shadow-xs hover:opacity-90"
        >
          <span>Abrir Bitácora</span>
          <span className="group-hover:translate-x-0.5 transition-transform font-bold">→</span>
        </button>
      </div>
    </div>
  );
};

interface RegionalExplorerProps {
  department: Department;
  departments?: Department[];
  municipalities: Municipality[];
  trips?: TripEntry[];
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
  trips = [],
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
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectMuniRef = useRef(onSelectMunicipality);
  onSelectMuniRef.current = onSelectMunicipality;

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

  useEffect(() => {
    if (departments.length > 0) {
      syncPassportVisitStats(
        departments.filter((d) => d.isVisited).length,
        departments.length
      );
    }
  }, [departments]);

  const rouletteMunicipalities: RouletteItem[] = useMemo(() => {
    return effectiveMunicipalities.map((m) => ({
      id: m.id,
      name: m.name,
      isVisited: m.isVisited,
      subtitle: department.name,
      code: m.code
    }));
  }, [effectiveMunicipalities, department.name]);

  const userPhotoByMuni = useMemo(() => {
    const map = new Map<string, string>();
    trips.forEach((t) => {
      if (!map.has(t.municipalityId) && t.photos && t.photos.length > 0 && t.photos[0]?.url) {
        map.set(t.municipalityId, t.photos[0].url);
      }
    });
    return map;
  }, [trips]);

  const visitCountByMuni = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach((t) => {
      map.set(t.municipalityId, (map.get(t.municipalityId) ?? 0) + 1);
    });
    return map;
  }, [trips]);

  const effectiveMunisRef = useRef(effectiveMunicipalities);
  effectiveMunisRef.current = effectiveMunicipalities;

  useEffect(() => {
    if (viewMode !== 'map' || mapFailed) return;
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

      // Centered around the department coordinates with zoom at bottom-left to avoid top-left segmented toggle
      const map = L.map(mapContainerRef.current, {
        center: [department.latitude, department.longitude],
        zoom: 10,
        minZoom: 8,
        maxZoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomleft' }).addTo(map);
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

      // Fit bounds using the department's municipality coordinates
      const validPoints = effectiveMunisRef.current
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

      // Layer group for reactive municipality markers
      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;

      if (timer) clearTimeout(timer);
    } catch (err) {
      console.error('Error initializing Regional Leaflet map:', err);
      setMapFailed(true);
      setViewMode('grid');
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      markersLayerRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [department, viewMode, mapFailed]);

  // Update map centroid markers dynamically whenever filter, search query, or municipalities change
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (viewMode !== 'map' || mapFailed || !markersGroup) return;

    markersGroup.clearLayers();

    filteredMunicipalities.forEach((muni) => {
      const lat = muni.latitude ?? muni.lat;
      const lng = muni.longitude ?? muni.lng;
      if (lat === undefined || lng === undefined) return;

      const isMuniHome =
        muni.isHome ||
        (homeMunicipalityId && (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code));
      const statusClass = isMuniHome ? 'home' : muni.isVisited ? 'visited' : 'pending';

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

      marker.on('click', () => {
        onSelectMuniRef.current(muni.id);
      });

      marker.bindTooltip(
        `<div style="font-family: var(--font-sans); padding: 2px 4px;">
          <div style="font-weight: 700; font-size: 12px;">${isMuniHome ? '🏠 ' : ''}${muni.name}</div>
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
  }, [filteredMunicipalities, homeMunicipalityId, viewMode, mapFailed, department.id]);

  return (
    <div
      className="min-h-screen bg-[#FDF8F7] dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 transition-colors"
      style={{
        backgroundImage: 'linear-gradient(180deg, var(--color-accent-soft) 0%, transparent 45%)'
      }}
    >
      {/* Encabezado compacto unificado para Tablet/Escritorio (>= 768 px) */}
      <div className="hidden md:block sticky top-0 z-40 w-full">
        <PassportDesktopHeader
          activeTab="explorador"
          eyebrowLabel="Departamento"
          sectionTitle={department.name}
          visitedCount={visitedCount}
          totalCount={totalCount}
          onBack={onBackToCountry}
          backTitle="Volver al mapa nacional"
          onSelectExplorador={onBackToCountry}
          onSelectRecuerdos={onNavigateToRecuerdos}
          onSelectReportes={onNavigateToReportes}
          onLogout={onLogout}
        />
      </div>

      <div className="pt-3 sm:pt-4 pb-24 px-3 sm:px-6 md:px-8">
        {/* Top Header Row en Móvil (< 768 px): se mantiene sin cambios */}
        <header className="md:hidden max-w-7xl mx-auto mb-3 flex items-center justify-between w-full px-1 sm:px-0">
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
                  className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap tabular-nums"
                >
                  {visitedCount}/{totalCount} visitados
                </span>
              </div>
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-zinc-100 truncate">
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

        {/* Fila de Navegación Principal en Móvil (< 768 px): oculta en tablet/escritorio */}
        <div className="md:hidden max-w-7xl mx-auto mb-3.5 w-full px-1 sm:px-0">
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

        {/* Área Principal Unificada: Mapa/Cuadrícula (Izquierda) + Panel Derecho (Mismo orden que Explorador Nacional) */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 sm:gap-6 mb-8 md:h-[calc(100vh-110px)] md:min-h-[500px]">
          {/* Left / Main Area: Map or Grid Directory with floating top-left segmented toggle */}
          <div
            className={`flex-1 min-h-0 bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] border border-[#FFF0F3] dark:border-zinc-800 relative flex flex-col ${
              viewMode === 'map' && !mapFailed
                ? 'h-[380px] sm:h-[440px] md:h-full'
                : 'min-h-[380px] max-h-[65vh] md:max-h-none md:h-full'
            }`}
          >
            {/* Interruptor segmentado flotante arriba a la izquierda: Ver Mapa / Ver Cuadrícula */}
            <div className="absolute top-3.5 left-3.5 z-20 inline-flex items-center gap-1 p-1 rounded-full bg-white/95 dark:bg-[#1E2228]/95 backdrop-blur-md shadow-[0_10px_25px_-10px_rgba(0,0,0,0.22)] border border-[#FFE4EA] dark:border-zinc-700">
              <button
                id="view-mode-map-btn"
                type="button"
                aria-pressed={viewMode === 'map' && !mapFailed}
                onClick={() => {
                  setMapFailed(false);
                  setViewMode('map');
                }}
                style={
                  viewMode === 'map' && !mapFailed
                    ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  viewMode === 'map' && !mapFailed
                    ? 'shadow-sm'
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
                aria-pressed={viewMode === 'grid' || mapFailed}
                onClick={() => {
                  setMapFailed(false);
                  setViewMode('grid');
                }}
                style={
                  viewMode === 'grid' || mapFailed
                    ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  viewMode === 'grid' || mapFailed
                    ? 'shadow-sm'
                    : 'text-slate-700 dark:text-zinc-300 hover:text-accent-primary hover:bg-[#FFF5F7] dark:hover:bg-zinc-800'
                }`}
                title="Ver cuadrícula de municipios"
              >
                <span>🗂️</span>
                <span>Ver Cuadrícula</span>
              </button>
            </div>

            {viewMode === 'map' && !mapFailed ? (
              <>
                <div
                  id="department-leaflet-map"
                  ref={mapContainerRef}
                  className="w-full h-full z-10 map-pastel-filter"
                  style={{ filter: 'saturate(0.7) brightness(1.05)' }}
                />
                {/* Map Legend Overlay offset beside the bottom-left zoom control */}
                <div className="absolute bottom-3 left-14 right-3 sm:right-auto w-fit max-w-[calc(100%-4.5rem)] z-20 bg-white/95 dark:bg-[#1E2228]/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-md border border-[#FFE4EA] dark:border-zinc-700 flex flex-wrap items-center gap-2.5 text-xs pointer-events-none">
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
                  <div className="hidden lg:flex items-center gap-1.5">
                    <span className="text-[11px] text-accent-primary font-medium">● Clic para ver ficha</span>
                  </div>
                </div>
              </>
            ) : (
              /* Cuadrícula / Directorio Completo de Municipios (Modo Grid o Contingencia) */
              <div className="w-full h-full overflow-y-auto px-4 sm:px-6 pt-[68px] pb-6 z-10 animate-in fade-in duration-300">
                {mapFailed && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl mb-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
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

                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-zinc-100">
                    Directorio de {department.name} ({visitedCount}/{totalCount})
                  </h2>
                  <span
                    style={{
                      backgroundColor: 'var(--color-accent-light)',
                      color: 'var(--color-accent)'
                    }}
                    className="text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap"
                  >
                    Mostrando {filteredMunicipalities.length} de {totalMunicipalitiesCount}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredMunicipalities.map((muni) => {
                    const isHome = Boolean(
                      muni.isHome ||
                        (homeMunicipalityId &&
                          (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code))
                    );
                    const userPhotoUrl =
                      userPhotoByMuni.get(muni.id) ??
                      muni.trips?.find((t) => t.photos && t.photos.length > 0)?.photos[0]?.url;

                    return (
                      <MunicipalityDirectoryCard
                        key={muni.id}
                        muni={muni}
                        departmentName={department.name}
                        userPhotoUrl={userPhotoUrl}
                        isHome={isHome}
                        onSelect={onSelectMunicipality}
                      />
                    );
                  })}

                  {filteredMunicipalities.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-[#FFFBFB] dark:bg-[#282D35] rounded-3xl border border-dashed border-[#FFE4EA] dark:border-zinc-700 p-8">
                      <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300">
                        No se encontraron municipios con ese criterio en {department.name}.
                      </p>
                      <button
                        type="button"
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
          </div>

          {/* Right: Panel de Municipios (mismo orden que el Explorador Nacional) */}
          <div className="w-full md:w-[340px] lg:w-96 h-[480px] md:h-full min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 md:p-0 md:overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)] border border-[#FFF0F3] dark:border-zinc-800 flex-shrink-0 animate-in slide-in-from-right-5 duration-300">
            {/* 1. Fila fija arriba: Buscador (flex-1) + Botón Ruleta (auto) con fondo sólido del panel */}
            <div className="flex items-center gap-2 mb-3 md:mb-0 md:px-5 lg:px-6 md:pt-5 lg:pt-6 md:pb-3 bg-white dark:bg-zinc-900 md:z-10 flex-shrink-0">
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
                <span>Ruleta</span>
              </button>
            </div>

            {/* Contenedor único con scroll debajo del buscador en >= 768 px */}
            <div className="flex-1 min-h-0 flex flex-col md:block md:overflow-y-auto md:px-5 lg:px-6 md:pt-1 md:pb-24">
              {/* 2. Recuadro rosa con contador y progreso */}
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)'
                }}
                className="text-white p-4 rounded-3xl shadow-md mb-3 text-center relative overflow-hidden flex-shrink-0"
              >
                <div className="relative z-10">
                  <span className="block text-2xl sm:text-4xl font-bold tracking-tight tabular-nums">
                    {visitedMunicipalitiesCount} / {totalMunicipalitiesCount}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase opacity-95 block mt-0.5">
                    MUNICIPIOS VISITADOS EN {department.name.toUpperCase()}
                  </span>
                  <div className="mt-2 pt-2 border-t border-white/20 flex flex-col gap-1.5">
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
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/15 pointer-events-none" />
              </div>

              {/* 3. Píldoras de filtro justo debajo del recuadro rosa (Todos / Visitados / Pendientes) */}
              <div className="mb-3 flex-shrink-0">
                <div className="grid grid-cols-3 gap-1 bg-[#FFF5F7] dark:bg-[#282D35] p-1 rounded-full text-[11px] font-semibold border border-[#FFE4EA] dark:border-zinc-700">
                  <button
                    id="filter-all-btn"
                    type="button"
                    onClick={() => setFilter('all')}
                    style={
                      filter === 'all'
                        ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                        : undefined
                    }
                    className={`px-2 py-1.5 rounded-full transition-all cursor-pointer truncate text-center ${
                      filter === 'all'
                        ? 'shadow-xs font-bold'
                        : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary'
                    }`}
                  >
                    Todos ({totalCount})
                  </button>
                  <button
                    id="filter-visited-btn"
                    type="button"
                    onClick={() => setFilter('visited')}
                    style={
                      filter === 'visited'
                        ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                        : undefined
                    }
                    className={`px-2 py-1.5 rounded-full transition-all cursor-pointer truncate text-center ${
                      filter === 'visited'
                        ? 'shadow-xs font-bold'
                        : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary'
                    }`}
                  >
                    Visitados ({visitedCount})
                  </button>
                  <button
                    id="filter-pending-btn"
                    type="button"
                    onClick={() => setFilter('pending')}
                    style={
                      filter === 'pending'
                        ? { backgroundColor: 'var(--color-accent)', color: '#ffffff' }
                        : undefined
                    }
                    className={`px-2 py-1.5 rounded-full transition-all cursor-pointer truncate text-center ${
                      filter === 'pending'
                        ? 'shadow-xs font-bold'
                        : 'text-slate-600 dark:text-zinc-300 hover:text-accent-primary'
                    }`}
                  >
                    Pendientes ({totalCount - visitedCount})
                  </button>
                </div>
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

              {/* 4. Listado de municipios: scroll propio únicamente en móvil (< 768 px) */}
              <div className="overflow-y-auto md:overflow-visible space-y-2 pr-2 md:pr-0 pb-4 md:pb-0 flex-1 md:flex-none min-h-0">
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
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-700/60 flex-shrink-0">
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
                        type="button"
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
        </div>

        {/* Fast Access Photographic Grid shown below map+panel in Map mode */}
        {viewMode === 'map' && !mapFailed && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <span>Municipios de {department.name}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-[#FFE4EA] dark:border-zinc-800 text-slate-600 dark:text-zinc-300">
                  {filteredMunicipalities.length} resultados
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMunicipalities.map((muni) => {
                const isHome = Boolean(
                  muni.isHome ||
                    (homeMunicipalityId &&
                      (homeMunicipalityId === muni.id || homeMunicipalityId === muni.code))
                );
                const userPhotoUrl =
                  userPhotoByMuni.get(muni.id) ??
                  muni.trips?.find((t) => t.photos && t.photos.length > 0)?.photos[0]?.url;
                const visitCount = visitCountByMuni.get(muni.id) ?? muni.trips?.length ?? 0;

                return (
                  <MunicipalityPhotoCard
                    key={muni.id}
                    muni={muni}
                    departmentName={department.name}
                    userPhotoUrl={userPhotoUrl}
                    visitCount={visitCount}
                    isHome={isHome}
                    onSelect={onSelectMunicipality}
                  />
                );
              })}
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
    </div>
  );
};
