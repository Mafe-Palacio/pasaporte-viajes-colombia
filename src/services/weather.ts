import { useEffect, useState } from 'react';
import type { Municipality } from '../types';

export type ThermalFloor = 'caliente' | 'templado' | 'frio' | 'paramo';

export type WeatherIconName =
    | 'sun'
    | 'cloud-sun'
    | 'cloud'
    | 'cloud-fog'
    | 'cloud-drizzle'
    | 'cloud-rain'
    | 'snowflake'
    | 'cloud-lightning';

export interface TripWeather {
    tempMax: number;
    tempMin: number;
    tempMean: number;
    precipitationMm: number;
    windMax: number;
    weatherCode: number;
    description: string;
    icon: WeatherIconName;
    elevationM: number | null;
}

export interface UseTripWeatherResult {
    data: TripWeather | null;
    loading: boolean;
    error: string | null;
}

const REQUEST_TIMEOUT_MS = 8000;
const SESSION_CACHE_PREFIX = 'pasaporte.weather.v1:';
const DAILY_FIELDS =
    'weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max';

const MONTH_MAP: Record<string, number> = {
    ene: 1,
    enero: 1,
    jan: 1,
    feb: 2,
    febrero: 2,
    mar: 3,
    marzo: 3,
    abr: 4,
    abril: 4,
    apr: 4,
    may: 5,
    mayo: 5,
    jun: 6,
    junio: 6,
    jul: 7,
    julio: 7,
    ago: 8,
    agosto: 8,
    aug: 8,
    sep: 9,
    sept: 9,
    septiembre: 9,
    set: 9,
    oct: 10,
    octubre: 10,
    nov: 11,
    noviembre: 11,
    dic: 12,
    diciembre: 12,
    dec: 12
};

const memoryCache = new Map<string, TripWeather>();
const inflightRequests = new Map<string, Promise<TripWeather | null>>();

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Convierte fechas como "13/Oct/2026" o "2026-10-13" a formato ISO YYYY-MM-DD.
 * Devuelve null si la fecha no es válida.
 */
export function tripDateToIso(value?: string | null): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T|\s)/);
    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        const day = Number(isoMatch[3]);
        return isValidCalendarDate(year, month, day) ? `${year}-${pad2(month)}-${pad2(day)}` : null;
    }

    const slashMatch = trimmed.match(/^(\d{1,2})[/-]([A-Za-záéíóúÁÉÍÓÚñÑ.]+)[/-](\d{4})$/);
    if (slashMatch) {
        const day = Number(slashMatch[1]);
        const rawMonth = slashMatch[2].replace(/\./g, '').toLowerCase();
        const year = Number(slashMatch[3]);
        const month = /^\d+$/.test(rawMonth) ? Number(rawMonth) : MONTH_MAP[rawMonth];
        if (month && isValidCalendarDate(year, month, day)) {
            return `${year}-${pad2(month)}-${pad2(day)}`;
        }
    }

    return null;
}

function getTodayBogotaIso(): string {
    try {
        const formatted = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
        if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) return formatted;
    } catch {
        /* fallback below */
    }
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function diffDaysFromToday(isoDate: string): number {
    const todayIso = getTodayBogotaIso();
    const [ty, tm, td] = todayIso.split('-').map(Number);
    const [vy, vm, vd] = isoDate.split('-').map(Number);
    const todayMs = Date.UTC(ty, tm - 1, td);
    const visitMs = Date.UTC(vy, vm - 1, vd);
    return Math.round((todayMs - visitMs) / 86_400_000);
}

function hasValidCoordinates(lat?: number | null, lng?: number | null): lat is number {
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (lat === 0 && lng === 0) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function buildCacheKey(lat: number, lng: number, isoDate: string): string {
    return `${lat.toFixed(4)},${lng.toFixed(4)},${isoDate}`;
}

function readFromCache(key: string): TripWeather | null {
    const inMemory = memoryCache.get(key);
    if (inMemory) return inMemory;

    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
        const raw = window.sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as TripWeather;
        if (parsed && typeof parsed.tempMax === 'number' && typeof parsed.description === 'string') {
            memoryCache.set(key, parsed);
            return parsed;
        }
    } catch {
        /* ignorar fallos de almacenamiento */
    }
    return null;
}

function writeToCache(key: string, value: TripWeather, persistSession: boolean): void {
    memoryCache.set(key, value);
    if (!persistSession || typeof window === 'undefined' || !window.sessionStorage) return;
    try {
        window.sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${key}`, JSON.stringify(value));
    } catch {
        /* ignorar cuota o modo privado */
    }
}

export function suggestThermalFloor(elevationM?: number | null): ThermalFloor | null {
    if (typeof elevationM !== 'number' || !Number.isFinite(elevationM)) return null;
    if (elevationM < 1000) return 'caliente';
    if (elevationM <= 2000) return 'templado';
    if (elevationM <= 3000) return 'frio';
    return 'paramo';
}

export function getThermalFloorLabel(floor?: ThermalFloor | string | null): string {
    switch (floor) {
        case 'caliente':
            return 'Tierra caliente';
        case 'templado':
            return 'Tierra templada';
        case 'frio':
            return 'Tierra fría';
        case 'paramo':
            return 'Páramo';
        default:
            return '';
    }
}

function mapWmoWeather(code: number): { base: string; icon: WeatherIconName } {
    if (code === 0) return { base: 'Despejado', icon: 'sun' };
    if (code === 1) return { base: 'Mayormente despejado', icon: 'cloud-sun' };
    if (code === 2) return { base: 'Parcialmente nublado', icon: 'cloud-sun' };
    if (code === 3) return { base: 'Nublado', icon: 'cloud' };
    if (code >= 45 && code <= 48) return { base: 'Niebla', icon: 'cloud-fog' };
    if (code >= 51 && code <= 57) return { base: 'Llovizna', icon: 'cloud-drizzle' };
    if (code >= 61 && code <= 67) return { base: 'Lluvia', icon: 'cloud-rain' };
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
        return { base: 'Nieve', icon: 'snowflake' };
    }
    if (code >= 80 && code <= 82) return { base: 'Chubascos', icon: 'cloud-rain' };
    if (code >= 95 && code <= 99) return { base: 'Tormenta eléctrica', icon: 'cloud-lightning' };
    return { base: 'Parcialmente nublado', icon: 'cloud-sun' };
}

export function describeWeather(
    weatherCode: number,
    windMax: number,
    precipitationMm: number
): { description: string; icon: WeatherIconName } {
    const { base, icon } = mapWmoWeather(weatherCode);
    const extras: string[] = [];
    if (windMax >= 25) extras.push('con brisa');
    if (precipitationMm >= 5) extras.push('con lluvias');
    const description = extras.length > 0 ? `${base} ${extras.join(' y ')}` : base;
    return { description, icon };
}

interface OpenMeteoDailyResponse {
    elevation?: number | null;
    daily?: {
        time?: string[];
        weather_code?: Array<number | null>;
        temperature_2m_max?: Array<number | null>;
        temperature_2m_min?: Array<number | null>;
        temperature_2m_mean?: Array<number | null>;
        precipitation_sum?: Array<number | null>;
        wind_speed_10m_max?: Array<number | null>;
    };
}

function parseOpenMeteoResponse(payload: OpenMeteoDailyResponse): TripWeather | null {
    const daily = payload?.daily;
    if (!daily) return null;

    const rawMax = daily.temperature_2m_max?.[0];
    const rawMin = daily.temperature_2m_min?.[0];
    const rawMean = daily.temperature_2m_mean?.[0];
    const rawCode = daily.weather_code?.[0];
    const rawPrecip = daily.precipitation_sum?.[0];
    const rawWind = daily.wind_speed_10m_max?.[0];

    const hasMax = typeof rawMax === 'number' && Number.isFinite(rawMax);
    const hasMin = typeof rawMin === 'number' && Number.isFinite(rawMin);
    const hasMean = typeof rawMean === 'number' && Number.isFinite(rawMean);

    if (!hasMax && !hasMin && !hasMean) {
        return null;
    }

    const tempMean = hasMean
        ? rawMean
        : hasMax && hasMin
            ? (rawMax + rawMin) / 2
            : hasMax
                ? rawMax
                : (rawMin as number);
    const tempMax = hasMax ? rawMax : tempMean;
    const tempMin = hasMin ? rawMin : tempMean;
    const precipitationMm =
        typeof rawPrecip === 'number' && Number.isFinite(rawPrecip) ? Math.max(0, rawPrecip) : 0;
    const windMax = typeof rawWind === 'number' && Number.isFinite(rawWind) ? Math.max(0, rawWind) : 0;
    const weatherCode =
        typeof rawCode === 'number' && Number.isFinite(rawCode) ? Math.round(rawCode) : 0;
    const elevationM =
        typeof payload.elevation === 'number' && Number.isFinite(payload.elevation)
            ? Math.round(payload.elevation)
            : null;

    const { description, icon } = describeWeather(weatherCode, windMax, precipitationMm);

    return {
        tempMax: Math.round(tempMax * 10) / 10,
        tempMin: Math.round(tempMin * 10) / 10,
        tempMean: Math.round(tempMean * 10) / 10,
        precipitationMm: Math.round(precipitationMm * 10) / 10,
        windMax: Math.round(windMax * 10) / 10,
        weatherCode,
        description,
        icon,
        elevationM
    };
}

async function fetchOpenMeteo(
    baseUrl: string,
    lat: number,
    lng: number,
    isoDate: string
): Promise<TripWeather | null> {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        start_date: isoDate,
        end_date: isoDate,
        daily: DAILY_FIELDS,
        timezone: 'America/Bogota'
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(`${baseUrl}?${params.toString()}`, {
            method: 'GET',
            signal: controller.signal
        });
        if (!res.ok) return null;
        const json = (await res.json()) as OpenMeteoDailyResponse;
        return parseOpenMeteoResponse(json);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export async function getTripWeather(
    lat: number | null | undefined,
    lng: number | null | undefined,
    dateInput: string | null | undefined
): Promise<TripWeather | null> {
    if (!hasValidCoordinates(lat, lng)) return null;

    const isoDate = tripDateToIso(dateInput);
    if (!isoDate) return null;

    const daysAgo = diffDaysFromToday(isoDate);
    if (daysAgo < 0) return null; // Fecha futura: aún no disponible

    const cacheKey = buildCacheKey(lat, lng, isoDate);
    const cached = readFromCache(cacheKey);
    if (cached) return cached;

    const inflight = inflightRequests.get(cacheKey);
    if (inflight) return inflight;

    const task = (async (): Promise<TripWeather | null> => {
        let result: TripWeather | null = null;

        if (daysAgo > 7) {
            result = await fetchOpenMeteo(
                'https://archive-api.open-meteo.com/v1/archive',
                lat,
                lng,
                isoDate
            );
            if (!result) {
                result = await fetchOpenMeteo(
                    'https://api.open-meteo.com/v1/forecast',
                    lat,
                    lng,
                    isoDate
                );
            }
        } else {
            result = await fetchOpenMeteo(
                'https://api.open-meteo.com/v1/forecast',
                lat,
                lng,
                isoDate
            );
        }

        if (result) {
            writeToCache(cacheKey, result, daysAgo >= 1);
        }
        return result;
    })();

    inflightRequests.set(cacheKey, task);
    try {
        return await task;
    } finally {
        inflightRequests.delete(cacheKey);
    }
}

export function useTripWeather(
    municipality: Pick<Municipality, 'latitude' | 'longitude' | 'lat' | 'lng'> | null | undefined,
    tripDate?: string | null
): UseTripWeatherResult {
    const lat = municipality?.latitude ?? municipality?.lat;
    const lng = municipality?.longitude ?? municipality?.lng;
    const isoDate = tripDateToIso(tripDate);
    const isPastOrToday = Boolean(isoDate && diffDaysFromToday(isoDate) >= 0);
    const validCoords = hasValidCoordinates(lat, lng);

    const [data, setData] = useState<TripWeather | null>(() => {
        if (!validCoords || !isoDate || !isPastOrToday) return null;
        return readFromCache(buildCacheKey(lat as number, lng as number, isoDate));
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!validCoords || !isoDate || !isPastOrToday) {
            setData(null);
            setLoading(false);
            setError(null);
            return;
        }

        const key = buildCacheKey(lat as number, lng as number, isoDate);
        const cached = readFromCache(key);
        if (cached) {
            setData(cached);
            setLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        getTripWeather(lat, lng, isoDate)
            .then((result) => {
                if (cancelled) return;
                setData(result);
                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                setData(null);
                setLoading(false);
                setError(err instanceof Error ? err.message : 'No se pudo consultar el clima.');
            });

        return () => {
            cancelled = true;
        };
    }, [validCoords, lat, lng, isoDate, isPastOrToday]);

    return { data, loading, error };
}
