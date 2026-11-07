import React, { useState, useEffect, useRef } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
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

  // Click outside to close popover
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
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
      className="fixed bottom-5 right-4 sm:bottom-auto sm:top-4 sm:right-4 z-50 select-none font-sans"
    >
      {/* Cápsula Flotante Compacta (Inferior en Móvil, Superior en Escritorio) */}
      <div className="rounded-full bg-white/95 dark:bg-zinc-850/95 dark:bg-zinc-800/95 backdrop-blur-md px-3 py-1.5 shadow-lg border border-gray-100 dark:border-zinc-700 flex items-center gap-2 transition-all">
        {/* Toggle Modo Oscuro con icono Sol/Luna */}
        <button
          id="theme-toggle-dark-btn"
          type="button"
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Cambiar a modo claro (☀️)' : 'Cambiar a modo oscuro (🌙)'}
          aria-label="Alternar modo oscuro o claro"
          className="p-1 rounded-full text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer flex items-center justify-center active:scale-90"
        >
          {isDarkMode ? (
            <span className="text-sm leading-none select-none">☀️</span>
          ) : (
            <span className="text-sm leading-none select-none">🌙</span>
          )}
        </button>

        {/* Divisor vertical suave */}
        <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700" />

        {/* Botón Paleta / Selector con icono 🎨 */}
        <button
          id="theme-color-picker-trigger"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Personalizar color de acento"
          aria-label="Abrir selector de color personalizado"
          className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 group relative"
        >
          <span className="text-sm leading-none transition-transform group-hover:scale-110">🎨</span>
          {/* Microindicador del color activo */}
          <span
            className="w-3 h-3 rounded-full ring-1 ring-white dark:ring-zinc-800 shadow-xs inline-block"
            style={{ backgroundColor: currentHex }}
          />
        </button>
      </div>

      {/* Popover con Selector de Color Completo (Se abre hacia arriba en móvil y hacia abajo en desktop) */}
      {isOpen && (
        <div
          id="theme-color-picker-popover"
          className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-72 max-h-[80vh] overflow-y-auto no-scrollbar rounded-3xl p-4 shadow-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 animate-in fade-in zoom-in-95 duration-200 z-50 text-slate-800 dark:text-zinc-100"
        >
          {/* Header del Popover con Nombre de Tono */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: currentHex }}
              />
              Color de Acento
            </span>
            {/* Badge con el nombre del tono seleccionado */}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs"
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
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold px-0.5">
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
              <span className="text-[10px] font-semibold text-slate-400">Valores de precisión</span>
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
                  <span className="text-[10px] text-slate-400 font-semibold">R</span>
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
                  <span className="text-[10px] text-slate-400 font-semibold">G</span>
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
                  <span className="text-[10px] text-slate-400 font-semibold">B</span>
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
            <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 px-0.5">
              Tonos Pasteles Favoritos
            </span>
            <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-slate-100 dark:border-zinc-750">
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
  );
};
