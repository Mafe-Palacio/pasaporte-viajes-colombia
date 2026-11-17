export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number; // 0 - 360
  s: number; // 0 - 100
  v: number; // 0 - 100
}

export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const PRESET_PASTEL_COLORS: ColorPreset[] = [
  { id: 'rose', name: 'Rosa Pastel', hex: '#F44566' },
  { id: 'cyan', name: 'Celeste Pastel', hex: '#59F7FF' },
  { id: 'mint', name: 'Menta / Esmeralda', hex: '#48BB78' },
  { id: 'lavender', name: 'Lavanda Pastel', hex: '#9F7AEA' },
  { id: 'peach', name: 'Durazno / Coral', hex: '#ED8936' }
];

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const normS = Math.max(0, Math.min(100, s)) / 100;
  const normV = Math.max(0, Math.min(100, v)) / 100;
  const c = normV * normS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = normV - c;
  let r1 = 0, g1 = 0, b1 = 0;

  if (h >= 0 && h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (h >= 60 && h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (h >= 120 && h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (h >= 180 && h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (h >= 240 && h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
  } else if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
  }
  return null;
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const normR = r / 255;
  const normG = g / 255;
  const normB = b / 255;
  const max = Math.max(normR, normG, normB);
  const min = Math.min(normR, normG, normB);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case normR:
        h = (normG - normB) / d + (normG < normB ? 6 : 0);
        break;
      case normG:
        h = (normB - normR) / d + 2;
        break;
      case normB:
        h = (normR - normG) / d + 4;
        break;
    }
    h = h * 60;
  }

  return {
    h: Math.round(h) % 360,
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

export function getColorToneName(hex: string, rgb: RGB, hsv: HSV): string {
  const upper = hex.toUpperCase();
  const preset = PRESET_PASTEL_COLORS.find(p => p.hex.toUpperCase() === upper);
  if (preset) return preset.name;

  const { h, s, v } = hsv;
  if (v < 18) return 'Carbón Oscuro';
  if (s < 10 && v > 85) return 'Blanco Suave';
  if (s < 12) return 'Gris Neutro';

  let tone = '';
  if (h >= 345 || h < 15) tone = 'Rosa';
  else if (h >= 15 && h < 45) tone = 'Durazno / Coral';
  else if (h >= 45 && h < 70) tone = 'Ámbar Cálido';
  else if (h >= 70 && h < 165) tone = 'Menta';
  else if (h >= 165 && h < 200) tone = 'Celeste / Cian';
  else if (h >= 200 && h < 255) tone = 'Azul Océano';
  else if (h >= 255 && h < 290) tone = 'Lavanda';
  else if (h >= 290 && h < 345) tone = 'Magenta';

  if (v > 75 && s < 65) return `${tone} Pastel`;
  if (v > 65 && s >= 65) return `${tone} Intenso`;
  if (v <= 65) return `${tone} Profundo`;
  return tone;
}

export function applyAccentColor(hex: string) {
  if (typeof document === 'undefined') return;
  const rgb = hexToRgb(hex);
  if (!rgb) return;

  const selectedHex = hex.toUpperCase();
  const softHex = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
  const lightHex = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;
  const hoverHex = `rgba(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)}, 1)`;
  const ringHex = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;

  const relativeLuminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  let readableHex = selectedHex;
  if (relativeLuminance > 0.62) {
    const scale = 0.44 / relativeLuminance;
    readableHex = rgbToHex(
      Math.round(rgb.r * scale),
      Math.round(rgb.g * scale),
      Math.round(rgb.b * scale)
    );
  }

  const root = document.documentElement;

  // Exact names requested by USER_REQUEST
  root.style.setProperty('--color-accent', selectedHex);
  root.style.setProperty('--color-accent-soft', softHex);
  root.style.setProperty('--color-accent-light', lightHex);
  root.style.setProperty('--color-accent-hover', hoverHex);
  root.style.setProperty('--color-accent-readable', readableHex);

  // Backward-compat aliases
  root.style.setProperty('--accent-primary', selectedHex);
  root.style.setProperty('--accent-soft', softHex);
  root.style.setProperty('--accent-light', lightHex);
  root.style.setProperty('--accent-border', softHex);
  root.style.setProperty('--accent-hover', hoverHex);
  root.style.setProperty('--accent-ring', ringHex);

  localStorage.setItem('theme-accent-color', selectedHex);
  localStorage.setItem('theme_palette', selectedHex);
  localStorage.setItem('theme-color', selectedHex);
}

export function applyDarkMode(isDark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
  document.body.classList.toggle('dark', isDark);
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.classList.toggle('dark', isDark);
  }
  localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
  localStorage.setItem('theme_mode', isDark ? 'dark' : 'light');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theme-mode-changed', { detail: { isDark } }));
  }
}
