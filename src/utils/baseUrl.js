/**
 * Helper to produce a BASE_URL-aware absolute URL for browser usage and
 * relative fallback during build-time.
 */
export function getAbsoluteBaseUrl() {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  if (typeof window === "undefined" || !window.location?.origin) {
    return base;
  }
  return `${window.location.origin}${base}`;
}

