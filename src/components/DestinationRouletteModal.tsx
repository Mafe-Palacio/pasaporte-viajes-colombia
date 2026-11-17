import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Sparkles, Compass, RotateCw, CheckCircle2, Clock, Award, ChevronDown, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface RouletteItem {
  id: string;
  name: string;
  isVisited: boolean;
  subtitle?: string; // Capital for department, or department name for municipality
  color?: string;
  code?: string;
  totalMunicipalities?: number;
}

interface DestinationRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'departments' | 'municipalities';
  title?: string;
  items: RouletteItem[];
  onSelectWinner: (id: string) => void;
}

const PASTEL_PALETTE = [
  '#FFE4E6', // Rose pastel
  '#FEF3C7', // Amber pastel
  '#DCFCE7', // Emerald pastel
  '#E0F2FE', // Sky pastel
  '#F3E8FF', // Purple pastel
  '#FCE7F3', // Pink pastel
  '#FFEDD5', // Orange pastel
  '#EDE9FE'  // Indigo pastel
];

export const COLOMBIA_REGIONS: Record<string, string[]> = {
  'Andina': [
    'antioquia', 'boyaca', 'caldas', 'cundinamarca', 'huila',
    'norte-de-santander', 'quindio', 'risaralda', 'santander', 'tolima', 'bogota'
  ],
  'Caribe': [
    'atlantico', 'bolivar', 'cesar', 'cordoba', 'la-guajira',
    'magdalena', 'sucre', 'san-andres'
  ],
  'Pacífica': [
    'choco', 'valle-del-cauca', 'cauca', 'narino'
  ],
  'Orinoquía': [
    'arauca', 'casanare', 'meta', 'vichada'
  ],
  'Amazonía': [
    'amazonas', 'caqueta', 'guainia', 'guaviare', 'putumayo', 'vaupes'
  ]
};

export const DEPT_ABBR: Record<string, string> = {
  'amazonas': 'AMA',
  'antioquia': 'ANT',
  'arauca': 'ARA',
  'atlantico': 'ATL',
  'bogota': 'BOG',
  'bolivar': 'BOL',
  'boyaca': 'BOY',
  'caldas': 'CAL',
  'caqueta': 'CAQ',
  'casanare': 'CAS',
  'cauca': 'CAU',
  'cesar': 'CES',
  'choco': 'CHO',
  'cordoba': 'COR',
  'cundinamarca': 'CUN',
  'guainia': 'GNA',
  'guaviare': 'GVR',
  'huila': 'HUI',
  'la-guajira': 'GUA',
  'magdalena': 'MAG',
  'meta': 'MET',
  'narino': 'NAR',
  'norte-de-santander': 'NDS',
  'putumayo': 'PUT',
  'quindio': 'QUI',
  'risaralda': 'RIS',
  'san-andres': 'SAP',
  'santander': 'SAN',
  'sucre': 'SUC',
  'tolima': 'TOL',
  'valle-del-cauca': 'VAL',
  'vaupes': 'VAU',
  'vichada': 'VIC'
};

export const DestinationRouletteModal: React.FC<DestinationRouletteModalProps> = ({
  isOpen,
  onClose,
  mode,
  title,
  items,
  onSelectWinner
}) => {
  // Filter toggle: Solo destinos pendientes por visitar (activado por defecto)
  const [onlyPending, setOnlyPending] = useState<boolean>(true);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [winner, setWinner] = useState<RouletteItem | null>(null);

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize selected IDs on open or items change
  useEffect(() => {
    if (isOpen && items.length > 0) {
      setSelectedIds(new Set(items.map((it) => it.id)));
      setWinner(null);
      setIsSpinning(false);
    } else {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    }
  }, [isOpen, items]);

  // Selected pool based on checkboxes
  const selectedCandidates = useMemo(() => {
    return items.filter((it) => selectedIds.has(it.id));
  }, [items, selectedIds]);

  // Active pool taking into account "onlyPending"
  const activeCandidates = useMemo(() => {
    if (onlyPending) {
      return selectedCandidates.filter((it) => !it.isVisited);
    }
    return selectedCandidates;
  }, [selectedCandidates, onlyPending]);

  const pendingCount = useMemo(() => {
    return items.filter((item) => !item.isVisited).length;
  }, [items]);

  const validationWarning = useMemo(() => {
    if (selectedIds.size < 2) {
      return mode === 'departments'
        ? 'Selecciona al menos 2 departamentos para girar'
        : 'Selecciona al menos 2 destinos para girar';
    }
    if (onlyPending && activeCandidates.length < 2) {
      if (activeCandidates.length === 0) {
        return 'Todos los departamentos seleccionados ya fueron visitados. Desmarca "Solo pendientes" o agrega más.';
      }
      return 'Solo tienes 1 departamento pendiente seleccionado. Selecciona al menos 2 o desmarca "Solo pendientes".';
    }
    return null;
  }, [selectedIds.size, onlyPending, activeCandidates.length, mode]);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 75,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#F44566', '#FEA38E', '#FFDFEC', '#FBD38D', '#93C5FD', '#A7F3D0']
        });
      }
    } catch {
      // safe fallback
    }
  };

  const handleSpin = () => {
    if (isSpinning || activeCandidates.length < 2) return;

    setIsSpinning(true);
    setWinner(null);

    const N = activeCandidates.length;
    // Pick random index
    const winnerIndex = Math.floor(Math.random() * N);
    const chosenWinner = activeCandidates[winnerIndex];

    // Calculate rotation to place winning slice at top (0 deg / 12 o'clock)
    const anglePerSlice = 360 / N;
    const sliceMidAngle = winnerIndex * anglePerSlice + anglePerSlice / 2;
    const spins = 6; // 6 full turns
    const currentModulo = rotation % 360;
    const neededOffset = (360 - sliceMidAngle - currentModulo + 360) % 360;
    const nextRotation = rotation + spins * 360 + neededOffset;

    setRotation(nextRotation);

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false);
      setWinner(chosenWinner);
      triggerConfetti();
    }, 4000);
  };

  const modalTitle = title || (mode === 'departments' ? '🎰 Ruleta de Departamentos' : '🎰 Ruleta de Pueblos');
  const modalSubtitle = mode === 'departments'
    ? '¿Indeciso? Deja que la suerte elija tu próxima aventura colombiana'
    : 'Descubre el próximo rincón mágico para sellar en tu pasaporte';

  const N = activeCandidates.length;
  const anglePerSlice = N > 0 ? 360 / N : 360;

  const getSliceText = (item: RouletteItem, count: number) => {
    if (count <= 8) {
      return item.name.length > 9 ? `${item.name.slice(0, 8)}…` : item.name;
    }
    if (count <= 12) {
      return item.name.length > 7 ? `${item.name.slice(0, 6)}…` : item.name;
    }
    // More than 12: use short abbreviation so text does not distort or overcrowd
    if (DEPT_ABBR[item.id]) {
      return DEPT_ABBR[item.id];
    }
    const clean = item.name.replace(/^(de|del|la|los|el|san|santa)\s+/i, '').trim();
    return clean.slice(0, 3).toUpperCase();
  };

  const getTextY = (count: number) => {
    if (count <= 8) return 100 - 58;
    if (count <= 12) return 100 - 61;
    if (count <= 20) return 100 - 65;
    return 100 - 68;
  };

  const getTextClass = (count: number) => {
    if (count <= 8) return 'text-[9px] font-bold fill-slate-700';
    if (count <= 12) return 'text-[8px] font-bold fill-slate-700';
    if (count <= 20) return 'text-[7px] font-bold fill-slate-800';
    return 'text-[6px] font-bold fill-slate-800';
  };

  return (
    <div
      id="roulette-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSpinning) {
          onClose();
        }
      }}
    >
      <div
        id="roulette-modal-card"
        className="rounded-3xl p-5 sm:p-6 pb-8 bg-white dark:bg-zinc-900 shadow-2xl max-w-md w-full text-center border border-rose-100 dark:border-zinc-800 relative transition-all duration-300 max-h-[88vh] sm:max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          id="close-roulette-btn"
          type="button"
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 cursor-pointer"
          aria-label="Cerrar ruleta"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-3 pr-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF0F3] dark:bg-zinc-800 text-accent-primary border border-rose-200 dark:border-zinc-700 mb-1.5">
            <span>🎲</span>
            <span>Destino Aleatorio</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-zinc-100">
            {modalTitle}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
            {modalSubtitle}
          </p>
        </div>

        {/* Filtro Inteligente previo al giro: Switch / Checkbox sutil */}
        <div className="mb-2.5 flex items-center justify-center">
          <label
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
              onlyPending
                ? 'bg-rose-50 dark:bg-zinc-800 border-rose-200 dark:border-zinc-700 text-rose-700 dark:text-rose-400 shadow-2xs'
                : 'bg-slate-50 dark:bg-[#1E2228] border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
            }`}
          >
            <input
              type="checkbox"
              checked={onlyPending}
              disabled={isSpinning}
              onChange={(e) => {
                setOnlyPending(e.target.checked);
                setWinner(null);
              }}
              className="w-3.5 h-3.5 text-accent-primary rounded-md focus:ring-0 border-gray-300 cursor-pointer"
            />
            <span>Solo pendientes por visitar ({pendingCount})</span>
          </label>
        </div>

        {/* Filtro Desplegable de Departamentos Participantes */}
        <div className="mb-4">
          <button
            id="toggle-roulette-filter-btn"
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            disabled={isSpinning}
            className="inline-flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer w-full max-w-xs mx-auto"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span>🎯</span>
              <span>
                {mode === 'departments'
                  ? `Elegir departamentos en juego (${selectedIds.size} seleccionados)`
                  : `Elegir pueblos en juego (${selectedIds.size} seleccionados)`}
              </span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="mt-2.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-[#1E2228]/90 border border-slate-200 dark:border-zinc-700 text-left animate-in fade-in zoom-in-95 duration-150">
                {/* Botones de acción rápida */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(new Set(items.map((it) => it.id)));
                      setWinner(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shadow-2xs ${
                      selectedIds.size === items.length
                        ? 'bg-rose-500 text-white border-rose-600 dark:bg-rose-600 dark:border-rose-500'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    Seleccionar todos ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(new Set());
                      setWinner(null);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    Limpiar selección
                  </button>

                  {mode === 'departments' && (
                    <div className="w-full mt-1.5">
                      <div className="text-xs font-semibold tracking-wider text-gray-500 dark:text-zinc-400 uppercase mb-1.5">
                        Solo región:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(COLOMBIA_REGIONS).map(([regionName, deptIds]) => {
                          const availableRegionIds = items
                            .filter((it) => deptIds.includes(it.id))
                            .map((it) => it.id);
                          const isRegionActive =
                            availableRegionIds.length > 0 &&
                            selectedIds.size === availableRegionIds.length &&
                            availableRegionIds.every((id) => selectedIds.has(id));

                          return (
                            <button
                              key={regionName}
                              type="button"
                              onClick={() => {
                                setSelectedIds(new Set(availableRegionIds));
                                setWinner(null);
                              }}
                              style={
                                isRegionActive
                                  ? {
                                      backgroundColor: 'var(--color-accent, #F44566)',
                                      borderColor: 'transparent'
                                    }
                                  : undefined
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                                isRegionActive
                                  ? 'text-white font-semibold shadow-sm'
                                  : 'bg-white hover:bg-rose-50 border border-gray-200 text-gray-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:border-zinc-700 dark:text-zinc-200 hover:dark:text-white font-medium'
                              }`}
                            >
                              {regionName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              {/* Lista compacta de chips/checkboxes en cuadrícula */}
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-800 border-rose-300 dark:border-rose-900/60 text-slate-800 dark:text-zinc-100 shadow-2xs'
                          : 'bg-slate-100/70 dark:bg-[#1E2228]/60 border-slate-200 dark:border-zinc-700/80 text-slate-500 dark:text-zinc-300 opacity-85'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isSpinning}
                        onChange={() => {
                          const next = new Set(selectedIds);
                          if (next.has(item.id)) {
                            next.delete(item.id);
                          } else {
                            next.add(item.id);
                          }
                          setSelectedIds(next);
                          setWinner(null);
                        }}
                        className="w-3.5 h-3.5 accent-rose-500 rounded text-accent-primary focus:ring-0 border-gray-300 cursor-pointer"
                      />
                      <span className="truncate">{item.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rueda Gráfica / Contenedor de Giro */}
        <div className="relative mx-auto my-2 w-[230px] h-[230px] flex items-center justify-center">
          {/* Top Indicator Arrow */}
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 drop-shadow-md pointer-events-none"
            style={{ color: 'var(--color-accent, #F44566)' }}
          >
            <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12,22 4,6 20,6" />
            </svg>
          </div>

          {/* Exterior Ring Frame */}
          <div className="w-full h-full rounded-full p-2 bg-gradient-to-tr from-rose-200 via-pink-100 to-rose-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 shadow-inner flex items-center justify-center">
            {/* Rotating SVG Wheel */}
            <div
              className="w-full h-full rounded-full overflow-hidden relative shadow-md"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none'
              }}
            >
              <svg className="w-full h-full" viewBox="0 0 200 200">
                {N >= 2 ? (
                  activeCandidates.map((item, i) => {
                    const startAngle = (i * anglePerSlice - 90) * (Math.PI / 180);
                    const endAngle = ((i + 1) * anglePerSlice - 90) * (Math.PI / 180);
                    const radius = 100;
                    const cx = 100;
                    const cy = 100;

                    const x1 = cx + radius * Math.cos(startAngle);
                    const y1 = cy + radius * Math.sin(startAngle);
                    const x2 = cx + radius * Math.cos(endAngle);
                    const y2 = cy + radius * Math.sin(endAngle);

                    const largeArcFlag = anglePerSlice > 180 ? 1 : 0;
                    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                    let color = PASTEL_PALETTE[i % PASTEL_PALETTE.length];
                    if (i === N - 1 && color === PASTEL_PALETTE[0] && N > 1) {
                      color = PASTEL_PALETTE[1];
                    }

                    const midAngleDeg = i * anglePerSlice + anglePerSlice / 2;
                    const label = getSliceText(item, N);
                    const textY = getTextY(N);
                    const strokeW = N > 20 ? 0.75 : (N > 12 ? 1 : 1.5);

                    return (
                      <g key={item.id + i}>
                        <path d={pathData} fill={color} stroke="#FFFFFF" strokeWidth={strokeW} />
                        <text
                          x={cx}
                          y={textY}
                          transform={`rotate(${midAngleDeg}, ${cx}, ${cy})`}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className={`${getTextClass(N)} pointer-events-none select-none`}
                          style={{
                            textShadow: '0 1px 1px rgba(255,255,255,0.85)'
                          }}
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  // Neutral placeholder when fewer than 2
                  <g>
                    <circle cx="100" cy="100" r="100" fill="#FFE4E6" />
                    <text
                      x="100"
                      y="100"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[10px] font-bold fill-rose-700"
                    >
                      Elige al menos 2
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Central Pin / Button Hub (WITHOUT overlapping tooltip) */}
            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning || activeCandidates.length < 2}
              className="absolute w-14 h-14 rounded-full bg-white dark:bg-zinc-800 border-3 shadow-lg flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-10 disabled:opacity-50 disabled:cursor-not-allowed group"
              style={{ borderColor: 'var(--color-accent, #F44566)' }}
            >
              <RotateCw className={`w-4 h-4 text-accent-primary transition-transform ${isSpinning ? 'animate-spin' : 'group-hover:rotate-45'}`} />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200 mt-0.5">
                {isSpinning ? '...' : 'Girar'}
              </span>
            </button>
          </div>
        </div>

        {/* Spin Button or Validation Banner or Winner Card */}
        {!winner ? (
          <div className="mt-4">
            {validationWarning ? (
              <div className="w-full py-2.5 px-3.5 rounded-2xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-2 text-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{validationWarning}</span>
              </div>
            ) : (
              <button
                id="spin-roulette-btn"
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || activeCandidates.length < 2}
                style={{
                  backgroundColor: 'var(--color-accent, #F44566)',
                  color: '#ffffff'
                }}
                className="w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSpinning ? 'Girando la ruleta...' : '¡Girar Ruleta!'}</span>
              </button>
            )}
          </div>
        ) : (
          /* Tarjeta Destacada con el Destino Ganador */
          <div
            id="roulette-winner-card"
            className="mt-4 p-4 rounded-2xl bg-gradient-to-b from-rose-50/80 to-pink-50/30 dark:from-zinc-800/80 dark:to-[#1E2228]/90 border border-rose-200 dark:border-rose-900/40 text-center animate-in zoom-in-95 duration-300 shadow-sm"
          >
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent-primary mb-1">
              <Award className="w-3.5 h-3.5" />
              <span>¡Destino Seleccionado!</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 truncate">
              {winner.name}
            </h3>

            {winner.subtitle && (
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                {mode === 'departments' ? `Capital: ${winner.subtitle}` : `En ${winner.subtitle}`}
              </p>
            )}

            <div className="my-2 flex items-center justify-center gap-1.5">
              {winner.isVisited ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" /> Visitado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <Clock className="w-3 h-3" /> Pendiente por explorar
                </span>
              )}
            </div>

            {/* Main Action Button: ✨ ¡Vamos a explorar [Nombre]! */}
            <div className="mt-3 flex flex-col gap-2">
              <button
                id="roulette-explore-winner-btn"
                type="button"
                onClick={() => {
                  onSelectWinner(winner.id);
                  onClose();
                }}
                style={{
                  backgroundColor: 'var(--color-accent, #F44566)',
                  color: '#ffffff'
                }}
                className="w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>✨ ¡Vamos a explorar {winner.name}!</span>
              </button>

              <button
                type="button"
                onClick={handleSpin}
                className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-accent-primary transition-colors cursor-pointer py-1"
              >
                🔄 Girar de nuevo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
