/**
 * Base path helpers for subpath deployments (e.g. GitHub Pages: /repo-name/).
 * When Vite `base` is '/', BASE is ''. When `base` is '/repo-name/', BASE is '/repo-name'.
 */
export const BASE: string = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');

/**
 * Prefixes an app-internal route (e.g. '/explorador') with BASE for pushState/replaceState/href.
 */
export function toUrl(route: string): string {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return `${BASE}${normalized}`;
}

/**
 * Reads window.location.pathname (or a given pathname) without the BASE prefix.
 * Returns '/' if empty.
 */
export function fromLocation(pathname?: string): string {
  const rawPath =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');

  let stripped = rawPath;
  if (BASE && (rawPath === BASE || rawPath.startsWith(`${BASE}/`))) {
    stripped = rawPath.slice(BASE.length);
  }

  if (!stripped || stripped === '/') {
    return '/';
  }

  const withLeadingSlash = stripped.startsWith('/') ? stripped : `/${stripped}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, '')
    : withLeadingSlash;
}

/**
 * Resolves a static asset path from public/ using import.meta.env.BASE_URL.
 */
export function assetUrl(relativePath: string): string {
  const baseWithSlash = import.meta.env.BASE_URL ?? '/';
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `${baseWithSlash}${cleanPath}`;
}
