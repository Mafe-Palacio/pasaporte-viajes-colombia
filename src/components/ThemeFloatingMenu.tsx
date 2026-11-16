import React, { useState, useEffect, useRef } from 'react';
import { Settings, Sun, Moon, ChevronRight, ArrowLeft } from 'lucide-react';
import {
  RGB,
  HSV,
  PRESET_PASTEL_COLORS,
  hsvToRgb,
  rgbToHex,
  hexToRgb,
  rgbToHsv,
  getColorToneName,
  applyAccentColor,
  applyDarkMode
} from '../utils/colorUtils';

export const ThemeFloatingMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'menu' | 'color'>('menu');
  const [inputFormat, setInputFormat] = useState<'HEX' | 'RGB'>('HEX');

  // Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('theme-mode') || localStorage.getItem('theme_mode');
      if (savedMode) return savedMode === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Current selected HEX color
  const [currentHex, setCurrentHex] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('theme-accent-color') ||
        localStorage.getItem('theme_palette') ||
        localStorage.getItem('theme-color');
      if (saved && saved.startsWith('#')) return saved.toUpperCase();
      if (saved === 'mint') return '#48BB78';
      if (saved === 'lavender') return '#9F7AEA';
      if (saved === 'peach') return '#ED8936';
      return '#F44566';
    }
    return '#F44566';
  });

  // Initial RGB and HSV
  const initialRgb = hexToRgb(currentHex) || { r: 244, g: 69, b: 102 };
  const [rgb, setRgb] = useState<RGB>(initialRgb);
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b));
  const [hexInputString, setHexInputString] = useState<string>(currentHex.replace('#', ''));

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const spectrumRef = useRef<HTMLDivElement>(null);
  const isDraggingSpectrum = useRef<boolean>(false);

  // Initialize theme mode and color on mount
  useEffect(() => {
    applyDarkMode(isDarkMode);
    applyAccentColor(currentHex);
  }, []);

  // Sync color changes to CSS variables
  const updateColorFromHsv = (newH: number, newS: number, newV: number) => {
    const clampedH = (newH % 360 + 360) % 360;
    const clampedS = Math.max(0, Math.min(100, newS));
    const clampedV = Math.max(0, Math.min(100, newV));

    const nextHsv = { h: clampedH, s: clampedS, v: clampedV };
    const nextRgb = hsvToRgb(clampedH, clampedS, clampedV);
    const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);

    setHsv(nextHsv);
    setRgb(nextRgb);
    setCurrentHex(nextHex);
    setHexInputString(nextHex.replace('#', ''));
    applyAccentColor(nextHex);
  };

  const updateColorFromHex = (newHex: string) => {
    const parsedRgb = hexToRgb(newHex);
    if (parsedRgb) {
      const cleanHex = newHex.startsWith('#') ? newHex.toUpperCase() : `#${newHex.toUpperCase()}`;
      const nextHsv = rgbToHsv(parsedRgb.r, parsedRgb.g, parsedRgb.b);
      setRgb(parsedRgb);
      setHsv(nextHsv);
      setCurrentHex(cleanHex);
      setHexInputString(cleanHex.replace('#', ''));
      applyAccentColor(cleanHex);
    }
  };

  const updateColorFromRgb = (field: keyof RGB, value: number) => {
    const clampedVal = Math.max(0, Math.min(255, isNaN(value) ? 0 : value));
    const nextRgb = { ...rgb, [field]: clampedVal };
    const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    const nextHsv = rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b);

    setRgb(nextRgb);
    setHsv(nextHsv);
    setCurrentHex(nextHex);
    setHexInputString(nextHex.replace('#', ''));
    applyAccentColor(nextHex);
  };

  // 2D Spectrum canvas pointer calculations
  const calculateSpectrumPosition = (clientX: number, clientY: number) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);
    updateColorFromHsv(hsv.h, s, v);
  };

  const handleSpectrumPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSpectrum.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    calculateSpectrumPosition(e.clientX, e.clientY);
  };

  const handleSpectrumPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSpectrum.current) {
      calculateSpectrumPosition(e.clientX, e.clientY);
    }
  };

  const handleSpectrumPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSpectrum.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const closeMenu = () => {
    setIsOpen(false);
    setActiveView('menu');
  };

  // Click/touch outside & Escape key to close popover
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
        triggerButtonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Dark mode toggle
  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    applyDarkMode(nextMode);
  };

  // Computed tone name
  const toneName = getColorToneName(currentHex, rgb, hsv);

  return (
    <div
      ref={menuContainerRef}
      className="fixed bottom-5 right-4 z-[210] select-none font-sans"
    >
      {/* Botón Único Circular con Icono de Tuerca */}
      <button
        ref={triggerButtonRef}
        id="theme-settings-trigger"
        type="button"
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            setActiveView('menu');
            setIsOpen(true);
          }
        }}
        title="Configuración de apariencia"
        aria-label="Abrir configuración de apariencia"
        aria-expanded={isOpen}
        aria-controls="theme-color-picker-popover"
        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md shadow-lg hover:shadow-xl border border-gray-200/80 dark:border-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
      >
        <Settings
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
          style={{ color: 'var(--color-accent, ' + currentHex + ')' }}
          aria-hidden="true"
        />
      </button>

      {/* Popover Unificado (siempre hacia arriba desde la esquina inferior derecha) */}
      {isOpen && (
        <div
          id="theme-color-picker-popover"
          role="dialog"
          aria-label="Configuración de apariencia"
          className="absolute right-0 bottom-full mb-2.5 w-[min(18rem,calc(100vw-2rem))] max-h-[80vh] overflow-y-auto no-scrollbar rounded-3xl p-4 shadow-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 animate-in fade-in zoom-in-95 duration-200 z-[210] text-slate-800 dark:text-zinc-100"
        >
          {activeView === 'menu' ? (
            <div className="space-y-2.5">
              <div className="px-1 pb-1 border-b border-gray-100 dark:border-zinc-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                  Apariencia
                </span>
              </div>

              {/* Opción a: Modo oscuro con interruptor deslizable tipo pill */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/70 border border-slate-100 dark:border-zinc-700/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
                    {isDarkMode ? (
                      <Moon className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 dark:text-zinc-100 leading-tight">
                      Modo oscuro
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {isDarkMode ? 'Activado' : 'Desactivado'}
                    </span>
                  </div>
                </div>

                <button
                  id="theme-toggle-dark-btn"
                  type="button"
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label="Modo oscuro"
                  onClick={toggleDarkMode}
                  style={isDarkMode ? { backgroundColor: currentHex } : undefined}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 ${
                    isDarkMode ? '' : 'bg-slate-300 dark:bg-zinc-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      isDarkMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Opción b: Color de acento */}
              <button
                id="theme-accent-nav-btn"
                type="button"
                onClick={() => setActiveView('color')}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 border border-slate-100 dark:border-zinc-700/70 transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-700 shadow-xs flex-shrink-0"
                    style={{ backgroundColor: currentHex }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 dark:text-zinc-100 leading-tight">
                      Color de acento
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                      {toneName}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-400 flex-shrink-0" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div>
              {/* Header del Selector de Color con botón ← Volver y Nombre de Tono */}
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-zinc-800">
                <button
                  id="theme-color-back-btn"
                  type="button"
                  onClick={() => setActiveView('menu')}
                  className="inline-flex items-center gap-1 px-2 py-1 -ml-1 rounded-full text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:focus-visible:ring-zinc-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Volver</span>
                </button>

                {/* Badge con el nombre del tono seleccionado */}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs truncate max-w-[130px]"
                  style={{
                    backgroundColor: 'var(--color-accent-light)',
                    color: currentHex,
                    border: '1px solid var(--color-accent-soft)'
                  }}
                >
                  {toneName}
                </span>
              </div>

          {/* Lienzo de Color / Gradiente (Área 2D) con Espectro */}
          <div
            ref={spectrumRef}
            onPointerDown={handleSpectrumPointerDown}
            onPointerMove={handleSpectrumPointerMove}
            onPointerUp={handleSpectrumPointerUp}
            className="relative w-full h-32 rounded-2xl cursor-crosshair overflow-hidden shadow-inner border border-slate-200/60 dark:border-zinc-700/60 touch-none mb-3"
            style={{
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
              backgroundImage: `
                linear-gradient(to top, #000 0%, transparent 100%),
                linear-gradient(to right, #FFF 0%, transparent 100%)
              `
            }}
          >
            {/* Selector circular arrastrable */}
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform active:scale-125"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: currentHex
              }}
            />
          </div>

          {/* Barra Deslizadora (Slider de Matiz / Hue) */}
          <div className="mb-3.5 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-zinc-400 font-semibold px-0.5">
              <span>Matiz</span>
              <span className="font-mono">{hsv.h}°</span>
            </div>
            <div className="relative flex items-center">
              <input
                id="color-picker-hue-slider"
                type="range"
                min="0"
                max="360"
                value={hsv.h}
                onChange={(e) => updateColorFromHsv(Number(e.target.value), hsv.s, hsv.v)}
                className="w-full h-3 rounded-full appearance-none cursor-pointer outline-none shadow-inner"
                style={{
                  background:
                    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                }}
              />
            </div>
          </div>

          {/* Inputs de Precisión con Selector Desplegable / Tabs (HEX / RGB) */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">Valores de precisión</span>
              {/* Selector de formato HEX / RGB */}
              <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-slate-200 dark:border-zinc-700 text-[10px]">
                <button
                  type="button"
                  onClick={() => setInputFormat('HEX')}
                  className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                    inputFormat === 'HEX'
                      ? 'bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                  }`}
                >
                  HEX
                </button>
                <button
                  type="button"
                  onClick={() => setInputFormat('RGB')}
                  className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                    inputFormat === 'RGB'
                      ? 'bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                  }`}
                >
                  RGB
                </button>
              </div>
            </div>

            {inputFormat === 'HEX' ? (
              /* Input Hexadecimal */
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400 dark:text-zinc-500 font-mono font-bold text-xs">#</span>
                <input
                  id="color-picker-hex-input"
                  type="text"
                  maxLength={6}
                  value={hexInputString}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                    setHexInputString(val);
                    if (val.length === 6) {
                      updateColorFromHex(`#${val}`);
                    }
                  }}
                  onBlur={() => {
                    if (hexInputString.length === 6) {
                      updateColorFromHex(`#${hexInputString}`);
                    } else {
                      setHexInputString(currentHex.replace('#', ''));
                    }
                  }}
                  className="w-full bg-transparent font-mono font-bold text-slate-800 dark:text-white uppercase outline-none text-xs"
                  placeholder="F44566"
                />
                <span
                  className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10 flex-shrink-0"
                  style={{ backgroundColor: currentHex }}
                />
              </div>
            ) : (
              /* Inputs Numéricos RGB */
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {/* R */}
                <div className="flex flex-col items-center bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-1.5 py-1">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">R</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb.r}
                    onChange={(e) => updateColorFromRgb('r', Number(e.target.value))}
                    className="w-full text-center bg-transparent font-mono font-bold text-slate-800 dark:text-white outline-none text-xs"
                  />
                </div>
                {/* G */}
                <div className="flex flex-col items-center bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-1.5 py-1">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">G</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb.g}
                    onChange={(e) => updateColorFromRgb('g', Number(e.target.value))}
                    className="w-full text-center bg-transparent font-mono font-bold text-slate-800 dark:text-white outline-none text-xs"
                  />
                </div>
                {/* B */}
                <div className="flex flex-col items-center bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-1.5 py-1">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">B</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb.b}
                    onChange={(e) => updateColorFromRgb('b', Number(e.target.value))}
                    className="w-full text-center bg-transparent font-mono font-bold text-slate-800 dark:text-white outline-none text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Presets Rápidos en Píldora (Tonos Pasteles Favoritos) */}
          <div>
            <span className="block text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 px-0.5">
              Tonos Pasteles Favoritos
            </span>
            <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-slate-100 dark:border-zinc-700">
              {PRESET_PASTEL_COLORS.map((preset) => {
                const isSelected = currentHex.toUpperCase() === preset.hex.toUpperCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateColorFromHex(preset.hex)}
                    title={preset.name}
                    aria-label={`Seleccionar preset ${preset.name}`}
                    style={{ backgroundColor: preset.hex }}
                    className={`w-7 h-7 rounded-full shadow-sm cursor-pointer hover:scale-110 transition-all flex items-center justify-center ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-zinc-300 ring-offset-white dark:ring-offset-zinc-900 scale-110'
                        : 'hover:opacity-90'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
