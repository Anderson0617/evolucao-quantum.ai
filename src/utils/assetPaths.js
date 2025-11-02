/**
 * Utility helpers for resolving files served from Vite's public directory.
 */
export function resolvePublicAsset(relPath = "") {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = relPath.startsWith("/") ? relPath.slice(1) : relPath;
  return normalizedBase + normalizedPath;
}

export function resolvePublicAssetBusted(relPath = "") {
  const url = resolvePublicAsset(relPath);
  if (import.meta.env.DEV) {
    return `${url}?t=${Date.now()}`;
  }
  return url;
}
