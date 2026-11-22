import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import colombiaDepartamentosRaw from '../data/colombiaDepartamentos.json';
import { hexToRgb, rgbToHex } from './colorUtils';

export interface DeptFeatureProperties {
  code: string;
  name: string;
}

export type ColombiaDeptFeature = Feature<Geometry, DeptFeatureProperties>;
export type ColombiaDeptFeatureCollection = FeatureCollection<Geometry, DeptFeatureProperties>;

const FALLBACK_GEOJSON_URL =
  'https://raw.githubusercontent.com/caticoa3/colombia_mapa/master/co_2018_MGN_DPTO_POLITICO.geojson';
const SESSION_STORAGE_KEY = 'pasaporte_colombia_dept_geojson_v1';
const FETCH_TIMEOUT_MS = 8000;

let memoryCache: ColombiaDeptFeatureCollection | null = null;

export function mapPolygonCodeToDepartmentCode(polygonCode: string): string {
  const normalized = String(polygonCode || '').trim().padStart(2, '0');
  // Bogotá D.C. ("11") is represented inside Cundinamarca ("25") in the app
  return normalized === '11' ? '25' : normalized;
}

export function normalizeDeptGeoJson(raw: unknown): ColombiaDeptFeatureCollection | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { type?: string; features?: unknown[] };
  if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features)) {
    return null;
  }

  const features: ColombiaDeptFeature[] = [];
  for (const item of candidate.features) {
    if (!item || typeof item !== 'object') continue;
    const f = item as {
      type?: string;
      properties?: Record<string, unknown>;
      geometry?: Geometry | null;
    };
    if (f.type !== 'Feature' || !f.geometry) continue;

    const props = f.properties || {};
    const rawCode = props.code ?? props.DPTO_CCDGO ?? props.dpto_ccdgo ?? '';
    const code = String(rawCode).trim().padStart(2, '0');
    if (!code || code === '00') continue;

    const rawName = props.name ?? props.DPTO_CNMBR ?? props.dpto_cnmbr ?? `Departamento ${code}`;
    const name = String(rawName).trim();

    features.push({
      type: 'Feature',
      properties: { code, name },
      geometry: f.geometry
    });
  }

  if (features.length === 0) return null;

  return {
    type: 'FeatureCollection',
    features
  };
}

export function getBundledColombiaGeoJson(): ColombiaDeptFeatureCollection | null {
  if (memoryCache) return memoryCache;
  const normalized = normalizeDeptGeoJson(colombiaDepartamentosRaw);
  if (normalized) {
    memoryCache = normalized;
  }
  return normalized;
}

export async function loadColombiaDepartmentsGeoJson(): Promise<ColombiaDeptFeatureCollection | null> {
  const bundled = getBundledColombiaGeoJson();
  if (bundled) return bundled;

  if (typeof window !== 'undefined') {
    try {
      const cached = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (cached) {
        const parsed = normalizeDeptGeoJson(JSON.parse(cached));
        if (parsed) {
          memoryCache = parsed;
          return parsed;
        }
      }
    } catch {
      // Ignore sessionStorage parse/access errors
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(FALLBACK_GEOJSON_URL, {
      signal: controller.signal
    });
    if (!response.ok) return null;

    const json = await response.json();
    const normalized = normalizeDeptGeoJson(json);
    if (!normalized) return null;

    memoryCache = normalized;

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
      } catch {
        // Ignore storage quota errors
      }
    }

    return normalized;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getRingAreaAndCentroid(ring: Position[]): { absArea: number; lat: number; lng: number } | null {
  if (!ring || ring.length < 3) return null;

  let twiceArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % ring.length];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  const absArea = Math.abs(twiceArea) / 2;
  if (absArea < 1e-8) {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return {
      absArea: 0,
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2
    };
  }

  const factor = 1 / (3 * twiceArea);
  return {
    absArea,
    lng: cx * factor,
    lat: cy * factor
  };
}

export function getGeometryLabelCenter(geometry: Geometry): [number, number] | null {
  if (geometry.type === 'Polygon') {
    const res = getRingAreaAndCentroid(geometry.coordinates[0]);
    return res ? [res.lat, res.lng] : null;
  }

  if (geometry.type === 'MultiPolygon') {
    let best: { absArea: number; lat: number; lng: number } | null = null;
    for (const poly of geometry.coordinates) {
      const candidate = getRingAreaAndCentroid(poly[0]);
      if (candidate && (!best || candidate.absArea > best.absArea)) {
        best = candidate;
      }
    }
    return best ? [best.lat, best.lng] : null;
  }

  return null;
}

export interface MapThemeColors {
  isDark: boolean;
  accent: string;
  accentDarker: string;
  panelBg: string;
  baseBorder: string;
  homeBorder: string;
  pendingFill: string;
  pendingHoverBorder: string;
}

export function readMapThemeColors(): MapThemeColors {
  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

  let accent = '#F44566';
  if (typeof document !== 'undefined') {
    const cssAccent = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent')
      .trim();
    if (cssAccent) {
      accent = cssAccent;
    }
  }

  const rgb = hexToRgb(accent);
  const accentDarker = rgb
    ? rgbToHex(
        Math.round(rgb.r * 0.62),
        Math.round(rgb.g * 0.62),
        Math.round(rgb.b * 0.62)
      )
    : '#B91C1C';

  return {
    isDark,
    accent,
    accentDarker,
    panelBg: isDark ? '#1E2228' : '#FFFFFF',
    baseBorder: isDark ? '#1E2228' : '#FFFFFF',
    homeBorder: isDark ? '#F4F4F5' : accentDarker,
    pendingFill: isDark ? '#64748B' : '#94A3B8',
    pendingHoverBorder: isDark ? '#CBD5E1' : '#475569'
  };
}
