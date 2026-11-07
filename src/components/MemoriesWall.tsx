import React, { useState, useMemo, useEffect } from 'react';
import { 
  Heart, 
  MapPin, 
  Calendar, 
  Maximize2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Compass, 
  Plus, 
  Sparkles, 
  Camera, 
  BookOpen,
  Share2,
  Check,
  Star
} from 'lucide-react';
import { TripEntry, Municipality, Department } from '../types';

export interface MemoryPhotoItem {
  id: string;
  url: string;
  caption: string;
  tripDate: string;
  municipalityId: string;
  municipalityName: string;
  departmentName: string;
  locationBadge: string; // e.g. "Guatapé, Antioquia", "Villa de Leyva, Boyacá"
  rating?: number;
  likes?: number;
  heightClass?: string;
}

interface MemoriesWallProps {
  trips: TripEntry[];
  municipalities: Municipality[];
  departments: Department[];
  onNavigateToMunicipality: (municipalityId: string) => void;
  onNavigateToMap: () => void;
  onAddNewMemory?: (tripId: string, photoUrl: string, caption: string, date: string) => void;
}

export const MemoriesWall: React.FC<MemoriesWallProps> = ({
  trips,
  municipalities,
  departments,
  onNavigateToMunicipality,
  onNavigateToMap
}) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [likedPhotoIds, setLikedPhotoIds] = useState<Set<string>>(() => new Set(['photo-gtp-1', 'photo-vdl-1']));
  const [copiedLink, setCopiedLink] = useState(false);

  // Compile all memories across trips
  const allMemories: MemoryPhotoItem[] = useMemo(() => {
    const list: MemoryPhotoItem[] = [];
    const seenUrls = new Set<string>();

    // 1. Gather photos from user trip logs
    trips.forEach((trip) => {
      if (trip.photos && trip.photos.length > 0) {
        trip.photos.forEach((photo, idx) => {
          if (!seenUrls.has(photo.url)) {
            seenUrls.add(photo.url);
            list.push({
              id: photo.id || `${trip.id}-photo-${idx}`,
              url: photo.url,
              caption: photo.caption || trip.summary || `Recuerdo familiar en ${trip.municipalityName}`,
              tripDate: photo.uploadedAt || trip.tripDate,
              municipalityId: trip.municipalityId,
              municipalityName: trip.municipalityName,
              departmentName: trip.departmentName,
              locationBadge: `${trip.municipalityName}, ${trip.departmentName}`,
              rating: trip.rating || 5,
              likes: 12 + (idx * 5)
            });
          }
        });
      }
    });

    return list;
  }, [trips]);

  // Extract unique departments present in the memories
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    allMemories.forEach((m) => set.add(m.departmentName));
    return ['todos', ...Array.from(set)];
  }, [allMemories]);

  // Filtered memories list
  const filteredMemories = useMemo(() => {
    return allMemories.filter((item) => {
      const matchesDept = 
        selectedDeptFilter === 'todos' || 
        item.departmentName.toLowerCase() === selectedDeptFilter.toLowerCase();
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        item.locationBadge.toLowerCase().includes(q) ||
        item.caption.toLowerCase().includes(q) ||
        item.municipalityName.toLowerCase().includes(q) ||
        item.departmentName.toLowerCase().includes(q);

      return matchesDept && matchesSearch;
    });
  }, [allMemories, selectedDeptFilter, searchQuery]);

  // Lightbox keyboard navigation (Esc, Arrow Left, Arrow Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeLightboxIndex === null) return;

      if (e.key === 'Escape') {
        setActiveLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setActiveLightboxIndex((prev) => 
          prev !== null ? (prev + 1) % filteredMemories.length : 0
        );
      } else if (e.key === 'ArrowLeft') {
        setActiveLightboxIndex((prev) => 
          prev !== null ? (prev - 1 + filteredMemories.length) % filteredMemories.length : 0
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, filteredMemories.length]);

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const activeLightboxItem = activeLightboxIndex !== null ? filteredMemories[activeLightboxIndex] : null;

  return (
    <div className="min-h-screen bg-[#FDF8F7] text-slate-800 pt-24 pb-28 sm:pb-20 px-4 sm:px-6 lg:px-10">
      {/* Top Banner & Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-gradient-to-br from-white via-[#FFF9FA] to-[#FFF0F3] p-6 sm:p-8 rounded-3xl border border-[#FFE4EA]/80 shadow-[0_15px_35px_-10px_rgba(244,69,102,0.1)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFE4EA] text-[#F44566]">
                <Heart className="w-3.5 h-3.5 fill-[#F44566]" />
                Familia Palacio
              </span>
              <span className="text-xs font-semibold text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">Fototeca &amp; Muro de Recuerdos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Muro Visual de Viajes Familiares
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
              Colección fotográfica de cada municipio y departamento explorado por la Familia Palacio en Colombia. Haz clic en cualquier tarjeta para verla en pantalla completa o acceder a su bitácora.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#FFE4EA] shadow-sm">
              <div className="text-center">
                <span className="block text-lg font-black text-[#F44566] leading-none">
                  {allMemories.length}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Fotos
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center">
                <span className="block text-lg font-black text-slate-800 leading-none">
                  {new Set(allMemories.map((m) => m.municipalityId)).size}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Municipios
                </span>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white rounded-2xl border border-[#FFE4EA] text-xs font-bold text-slate-700 hover:text-[#F44566] hover:border-[#F44566] shadow-sm transition-all cursor-pointer"
              title="Copiar enlace de los recuerdos"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Compartir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Department Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {departmentOptions.map((dept) => {
              const isSelected = selectedDeptFilter.toLowerCase() === dept.toLowerCase();
              return (
                <button
                  key={dept}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#F44566] text-white shadow-md shadow-[#F44566]/20'
                      : 'bg-white text-slate-600 border border-[#FFE4EA] hover:border-[#F44566] hover:text-[#F44566]'
                  }`}
                >
                  {dept === 'todos' ? 'Todos los Departamentos' : dept}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por municipio o lugar..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full bg-white border border-[#FFE4EA] focus:outline-none focus:ring-2 focus:ring-[#F44566]/20 focus:border-[#F44566] transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Masonry / Feed Photo Grid */}
      <div className="max-w-7xl mx-auto">
        {allMemories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#FFE4EA] p-8 shadow-[0_15px_30px_-10px_rgba(244,69,102,0.12)] max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#FFF0F3] text-[#F44566] flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">¡Tu muro de recuerdos está listo!</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Aún no has registrado viajes ni fotos familiares. Explora los departamentos y municipios de Colombia, registra tus visitas y guarda tus mejores momentos aquí.
            </p>
            <button
              onClick={onNavigateToMap}
              className="mt-6 px-6 py-3 bg-[#F44566] text-white rounded-full text-xs font-bold hover:bg-[#e03757] transition-all shadow-md shadow-[#F44566]/25 inline-flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Explorar Mapa de Colombia</span>
            </button>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#FFE4EA] p-8 shadow-sm">
            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No se encontraron recuerdos</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Intenta cambiar el término de búsqueda o selecciona &quot;Todos los Departamentos&quot;.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDeptFilter('todos');
              }}
              className="mt-4 px-4 py-2 bg-[#FFF0F3] text-[#F44566] rounded-full text-xs font-bold hover:bg-[#FFE0E6] transition-colors cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMemories.map((item, index) => {
              const isLiked = likedPhotoIds.has(item.id);
              const currentLikes = (item.likes || 10) + (isLiked ? 1 : 0);

              return (
                <article
                  key={item.id}
                  id={`memory-card-${item.id}`}
                  onClick={() => setActiveLightboxIndex(index)}
                  className="bg-white rounded-3xl overflow-hidden border border-[#FFF0F3] shadow-[0_12px_30px_-10px_rgba(244,69,102,0.12)] hover:shadow-[0_20px_45px_-10px_rgba(244,69,102,0.22)] transition-all duration-300 group hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  {/* Photo Container with Rounded Corners and Subtle Pastel Badge */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                    <img
                      src={item.url}
                      alt={item.caption}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Gradient Overlay on bottom for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity" />

                    {/* Subtle Pastel Badge on Top of Photo (ej. "Guatapé, Antioquia", "Villa de Leyva, Boyacá") */}
                    <div 
                      id={`memory-badge-${item.id}`}
                      className="absolute top-3.5 left-3.5 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#FFE4EA] shadow-sm flex items-center gap-1.5 transition-transform group-hover:scale-105"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#F44566]" />
                      <span className="text-xs font-bold text-slate-800 tracking-tight">
                        {item.locationBadge}
                      </span>
                    </div>

                    {/* Fullscreen / Lightbox Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLightboxIndex(index);
                      }}
                      className="absolute top-3.5 right-3.5 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Ver en pantalla completa"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Trip Date Pastel Tag at bottom of photo */}
                    <div className="absolute bottom-3 left-3.5 z-10 flex items-center gap-1.5 text-white/95 text-xs font-semibold drop-shadow-md">
                      <Calendar className="w-3.5 h-3.5 text-[#FFBDC9]" />
                      <span>{item.tripDate}</span>
                    </div>

                    {/* Family Heart Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleLike(item.id, e)}
                      className={`absolute bottom-3 right-3.5 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md transition-all cursor-pointer ${
                        isLiked
                          ? 'bg-[#F44566] text-white shadow-sm'
                          : 'bg-black/40 hover:bg-black/60 text-white/90'
                      }`}
                      title={isLiked ? 'Te gusta este recuerdo' : 'Marcar como favorito familiar'}
                    >
                      <Heart className={`w-3 h-3 ${isLiked ? 'fill-white' : ''}`} />
                      <span>{currentLikes}</span>
                    </button>
                  </div>

                  {/* Card Content / Caption / Actions */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-relaxed">
                        {item.caption}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-amber-500 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>5.0</span>
                        <span className="text-slate-400 text-[10px]">• Familia Palacio</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToMunicipality(item.municipalityId);
                        }}
                        className="font-bold text-[#F44566] hover:text-[#D63050] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Ver Bitácora</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {activeLightboxItem && (
        <div 
          id="memory-lightbox-modal"
          className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-lg flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveLightboxIndex(null)}
        >
          {/* Lightbox Top Header Bar */}
          <div 
            className="flex items-center justify-between z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Location Badge pastel & Date */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#FFE4EA] shadow-md flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#F44566]" />
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {activeLightboxItem.locationBadge}
                </span>
              </div>

              <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-xs font-medium flex items-center gap-1.5 border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-[#FFBDC9]" />
                <span>{activeLightboxItem.tripDate}</span>
              </div>
            </div>

            {/* Close & Lightbox actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onNavigateToMunicipality(activeLightboxItem.municipalityId);
                  setActiveLightboxIndex(null);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F44566] hover:bg-[#E03455] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ir a la Bitácora</span>
              </button>

              <button
                type="button"
                id="lightbox-close-btn"
                onClick={() => setActiveLightboxIndex(null)}
                className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center: Image Stage with Prev / Next Navigation */}
          <div 
            className="relative flex-1 flex items-center justify-center my-2 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Photo Button */}
            <button
              type="button"
              id="lightbox-prev-btn"
              onClick={() => {
                setActiveLightboxIndex((prev) => 
                  prev !== null ? (prev - 1 + filteredMemories.length) % filteredMemories.length : 0
                );
              }}
              className="absolute left-2 sm:left-6 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 transition-all z-20 cursor-pointer shadow-lg"
              title="Foto anterior (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* High Resolution Image */}
            <div className="max-w-5xl max-h-[72vh] flex items-center justify-center p-2">
              <img
                id="lightbox-active-img"
                src={activeLightboxItem.url}
                alt={activeLightboxItem.caption}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border border-white/10 animate-in zoom-in-95 duration-200"
              />
            </div>

            {/* Next Photo Button */}
            <button
              type="button"
              id="lightbox-next-btn"
              onClick={() => {
                setActiveLightboxIndex((prev) => 
                  prev !== null ? (prev + 1) % filteredMemories.length : 0
                );
              }}
              className="absolute right-2 sm:right-6 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 transition-all z-20 cursor-pointer shadow-lg"
              title="Siguiente foto (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Bottom Footer Bar with Caption & Counter */}
          <div 
            className="z-20 max-w-3xl mx-auto w-full text-center bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed">
              &ldquo;{activeLightboxItem.caption}&rdquo;
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-4 text-[11px] text-white/60">
              <span>Familia Palacio • Registro fotográfico</span>
              <span>•</span>
              <span>Foto {(activeLightboxIndex || 0) + 1} de {filteredMemories.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
