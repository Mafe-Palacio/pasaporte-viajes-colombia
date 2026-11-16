const STORAGE_PREFIX = 'passport_muni_wiki_v2:';
const REQUEST_TIMEOUT_MS = 6500;
const MAX_CONCURRENT_REQUESTS = 3;

export interface MunicipalityWikiData {
  imageUrl: string | null;
  extract: string | null;
}

const EMPTY_WIKI_DATA: MunicipalityWikiData = {
  imageUrl: null,
  extract: null
};

const memoryCache = new Map<string, MunicipalityWikiData>();
const inFlightRequests = new Map<string, Promise<MunicipalityWikiData>>();

let activeRequestCount = 0;
const requestQueue: Array<() => void> = [];

function enqueueRequest<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const execute = () => {
      activeRequestCount += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeRequestCount -= 1;
          const next = requestQueue.shift();
          if (next) next();
        });
    };

    if (activeRequestCount < MAX_CONCURRENT_REQUESTS) {
      execute();
    } else {
      requestQueue.push(execute);
    }
  });
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMunicipalityName(name: string): string {
  return (name || '')
    .replace(/,\s*d\.?\s*c\.?$/i, '')
    .replace(/\(\s*d\.?\s*c\.?\s*\)/i, '')
    .trim();
}

function cleanDepartmentName(name: string): string {
  return (name || '')
    .replace(/,\s*d\.?\s*c\.?$/i, '')
    .trim();
}

const AMBIGUOUS_OR_CAPITAL_NAMES = new Set([
  'medellin',
  'bogota',
  'cartagena',
  'cartagena de indias',
  'cordoba',
  'santa marta',
  'armenia',
  'cali',
  'santiago de cali',
  'pasto',
  'san juan de pasto',
  'monteria',
  'barranquilla',
  'bucaramanga',
  'pereira',
  'manizales',
  'cucuta',
  'san jose de cucuta',
  'ibague',
  'neiva',
  'popayan',
  'tunja',
  'valledupar',
  'riohacha',
  'sincelejo',
  'quibdo',
  'villavicencio',
  'yopal',
  'arauca',
  'mocoa',
  'florencia',
  'inirida',
  'mitu',
  'leticia',
  'san andres',
  'puerto carreno',
  'san jose del guaviare',
  'valencia',
  'granada',
  'sevilla',
  'toledo',
  'madrid',
  'zaragoza',
  'barcelona',
  'salamanca',
  'santiago',
  'concepcion',
  'el cairo',
  'palermo',
  'san pablo',
  'san luis',
  'san pedro',
  'santa rosa',
  'santa barbara',
  'san carlos',
  'san juan',
  'san martin',
  'san francisco',
  'san antonio',
  'san jose',
  'san vicente',
  'la union',
  'la palma',
  'la victoria',
  'puerto rico',
  'buenos aires',
  'bolivar',
  'sucre',
  'caldas',
  'narino'
]);

export function truncateExtract(rawExtract: string, maxLength = 140): string | null {
  const cleaned = (rawExtract || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLength) return cleaned;

  const sliced = cleaned.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  const cutoff = lastSpace >= Math.floor(maxLength * 0.45) ? lastSpace : maxLength;
  const trimmed = sliced.slice(0, cutoff).replace(/[\s,;:\-]+$/, '');
  return trimmed ? `${trimmed}…` : null;
}

export function buildMunicipalityImageCacheKey(
  municipalityId: string,
  municipalityName: string,
  departmentName: string
): string {
  const idPart = (municipalityId || '').trim();
  const namePart = `${normalizeForMatch(municipalityName)}:${normalizeForMatch(departmentName)}`;
  return idPart ? `${idPart}:${namePart}` : namePart;
}

export function getCachedMunicipalityWikiData(
  municipalityId: string,
  municipalityName: string,
  departmentName: string
): MunicipalityWikiData | undefined {
  const key = buildMunicipalityImageCacheKey(municipalityId, municipalityName, departmentName);

  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as Partial<MunicipalityWikiData>;
        const value: MunicipalityWikiData = {
          imageUrl:
            typeof parsed?.imageUrl === 'string' && parsed.imageUrl.trim().length > 0
              ? parsed.imageUrl
              : null,
          extract:
            typeof parsed?.extract === 'string' && parsed.extract.trim().length > 0
              ? parsed.extract
              : null
        };
        memoryCache.set(key, value);
        return value;
      }
    } catch {
      // Ignore sessionStorage read/parse errors
    }
  }

  return undefined;
}

export function getCachedMunicipalityImage(
  municipalityId: string,
  municipalityName: string,
  departmentName: string
): string | null | undefined {
  const cached = getCachedMunicipalityWikiData(municipalityId, municipalityName, departmentName);
  return cached === undefined ? undefined : cached.imageUrl;
}

function writeCache(
  key: string,
  data: MunicipalityWikiData,
  persistToSession: boolean
): void {
  memoryCache.set(key, data);
  if (!persistToSession || typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // Ignore quota/private-mode storage errors
  }
}

interface WikipediaPageResult {
  index?: number;
  title?: string;
  extract?: string;
  thumbnail?: {
    source?: string;
  };
}

interface WikipediaQueryResponse {
  query?: {
    pages?: Record<string, WikipediaPageResult>;
  };
}

function isHeraldicOrSymbolTitle(normalizedTitle: string): boolean {
  return (
    normalizedTitle.startsWith('bandera ') ||
    normalizedTitle.startsWith('escudo ') ||
    normalizedTitle.startsWith('simbolos ') ||
    normalizedTitle.startsWith('himno ') ||
    normalizedTitle.startsWith('anexo ')
  );
}

function buildWikipediaSearchQuery(municipalityName: string, departmentName: string): string {
  const cleanMuni = cleanMunicipalityName(municipalityName);
  const cleanDept = cleanDepartmentName(departmentName);
  const normMuni = normalizeForMatch(cleanMuni);
  const normDept = normalizeForMatch(cleanDept);

  if (normMuni === 'bogota' || (normDept && normMuni === normDept)) {
    return `${cleanMuni} Colombia`;
  }

  if (AMBIGUOUS_OR_CAPITAL_NAMES.has(normMuni)) {
    return `${cleanMuni} ${cleanDept} Colombia`;
  }

  return `${cleanMuni} ${cleanDept} municipio`;
}

export async function fetchMunicipalityWikipediaData(params: {
  municipalityId: string;
  municipalityName: string;
  departmentName: string;
}): Promise<MunicipalityWikiData> {
  const { municipalityId, municipalityName, departmentName } = params;
  const cacheKey = buildMunicipalityImageCacheKey(
    municipalityId,
    municipalityName,
    departmentName
  );

  const cached = getCachedMunicipalityWikiData(municipalityId, municipalityName, departmentName);
  if (cached !== undefined) {
    return cached;
  }

  const existingPromise = inFlightRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = enqueueRequest(async () => {
    const controller = new AbortController();
    const timeoutId =
      typeof window !== 'undefined'
        ? window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        : undefined;

    try {
      const cleanMuni = cleanMunicipalityName(municipalityName);
      const normalizedMuni = normalizeForMatch(cleanMuni);
      const searchQuery = buildWikipediaSearchQuery(municipalityName, departmentName);

      const endpoint =
        `https://es.wikipedia.org/w/api.php?action=query&generator=search` +
        `&gsrsearch=${encodeURIComponent(searchQuery)}` +
        `&gsrlimit=3&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=700&exintro=1&explaintext=1&exsentences=2&format=json&origin=*`;

      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) {
        return EMPTY_WIKI_DATA;
      }

      const data = (await response.json()) as WikipediaQueryResponse;
      const pages = Object.values(data?.query?.pages || {}).sort(
        (a, b) => (a.index ?? 999) - (b.index ?? 999)
      );

      if (pages.length === 0 || !normalizedMuni) {
        writeCache(cacheKey, EMPTY_WIKI_DATA, true);
        return EMPTY_WIKI_DATA;
      }

      const matchedPage = pages.find((page) => {
        const normalizedTitle = normalizeForMatch(page?.title || '');
        if (!normalizedTitle || isHeraldicOrSymbolTitle(normalizedTitle)) {
          return false;
        }
        return normalizedTitle.includes(normalizedMuni);
      });

      if (!matchedPage) {
        writeCache(cacheKey, EMPTY_WIKI_DATA, true);
        return EMPTY_WIKI_DATA;
      }

      const source = matchedPage?.thumbnail?.source;
      const resolvedUrl =
        typeof source === 'string' && source.trim().length > 0 ? source.trim() : null;
      const resolvedExtract = truncateExtract(matchedPage?.extract || '', 140);

      const result: MunicipalityWikiData = {
        imageUrl: resolvedUrl,
        extract: resolvedExtract
      };

      writeCache(cacheKey, result, true);
      return result;
    } catch {
      return EMPTY_WIKI_DATA;
    } finally {
      if (timeoutId !== undefined && typeof window !== 'undefined') {
        window.clearTimeout(timeoutId);
      }
      inFlightRequests.delete(cacheKey);
    }
  });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export async function fetchMunicipalityWikipediaImage(params: {
  municipalityId: string;
  municipalityName: string;
  departmentName: string;
}): Promise<string | null> {
  const data = await fetchMunicipalityWikipediaData(params);
  return data.imageUrl;
}
