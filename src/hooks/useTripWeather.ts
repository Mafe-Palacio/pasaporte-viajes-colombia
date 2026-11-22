import { useCallback, useEffect, useState } from 'react';
import type { Municipality } from '../types';
import {
    getTripWeather,
    tripDateToIso,
    type TripWeather
} from '../services/weather';

export interface UseTripWeatherResult {
    data: TripWeather | null;
    loading: boolean;
    error: string | null;
    retry: () => void;
    isFuture: boolean;
    hasCoordinates: boolean;
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
        /* fallback */
    }
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${m}-${d}`;
}

function hasValidCoordinates(lat?: number | null, lng?: number | null): lat is number {
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (lat === 0 && lng === 0) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function useTripWeather(
    municipality: Pick<Municipality, 'latitude' | 'longitude' | 'lat' | 'lng'> | null | undefined,
    tripDate?: string | null
): UseTripWeatherResult {
    const lat = municipality?.latitude ?? municipality?.lat;
    const lng = municipality?.longitude ?? municipality?.lng;
    const validCoords = hasValidCoordinates(lat, lng);
    const isoDate = tripDateToIso(tripDate);
    const isFuture = Boolean(isoDate && isoDate > getTodayBogotaIso());

    const [attempt, setAttempt] = useState(0);
    const [data, setData] = useState<TripWeather | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const retry = useCallback(() => {
        setAttempt((n) => n + 1);
    }, []);

    useEffect(() => {
        if (!validCoords || !isoDate || isFuture) {
            setData(null);
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
                if (result) {
                    setData(result);
                    setError(null);
                } else {
                    setData(null);
                    setError('No se pudo obtener el clima');
                }
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setData(null);
                setError('No se pudo obtener el clima');
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [validCoords, lat, lng, isoDate, isFuture, attempt]);

    return {
        data,
        loading,
        error,
        retry,
        isFuture,
        hasCoordinates: validCoords
    };
}
