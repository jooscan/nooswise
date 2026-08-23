/**
 * Real shareable link generator.
 * Builds the actual working URL to a group's page on the deployed app,
 * e.g. https://nooswise.netlify.app/split-1755959999999
 * (parseCurrentRoute in storage.ts reads a bare path segment as the group id,
 * so this URL routes straight to that group when opened.)
 */

const memoryCache = new Map<string, string>();

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'https://nooswise.netlify.app';
}

/** Extract a bare group id from a raw id, or a previously-built URL/hash/query form of it. */
function extractGroupId(groupIdOrUrl: string): string {
  let id = groupIdOrUrl.trim();
  if (id.includes('?s=')) {
    id = id.split('?s=')[1].split('&')[0];
  } else if (id.includes('/#s=')) {
    id = id.split('/#s=')[1].split('&')[0];
  } else if (id.includes('/s/')) {
    id = id.split('/s/')[1].split('/')[0];
  } else if (id.includes('://')) {
    const afterHost = id.split('://')[1].split('/').slice(1).join('/');
    id = afterHost || id;
  } else if (id.includes('/')) {
    const parts = id.split('/').filter(Boolean);
    id = parts[parts.length - 1] || id;
  }
  return decodeURIComponent(id);
}

/**
 * Real, clickable link to a group's page (includes protocol).
 */
export function getInstantShortUrl(groupIdOrUrl: string): string {
  if (!groupIdOrUrl) return getBaseUrl();
  const id = extractGroupId(groupIdOrUrl);
  return `${getBaseUrl()}/${id}`;
}

/**
 * Shorten URL with a persistent in-memory cache (kept for API compatibility).
 */
export async function shortenUrl(longUrl: string): Promise<string> {
  if (!longUrl || typeof longUrl !== 'string') return getBaseUrl();
  if (memoryCache.has(longUrl)) {
    return memoryCache.get(longUrl)!;
  }
  const shortUrl = getInstantShortUrl(longUrl);
  memoryCache.set(longUrl, shortUrl);
  return shortUrl;
}

/**
 * Get synchronously cached short URL if already computed.
 */
export function getCachedShortUrl(longUrl: string): string {
  if (!longUrl) return getBaseUrl();
  if (memoryCache.has(longUrl)) {
    return memoryCache.get(longUrl)!;
  }
  const short = getInstantShortUrl(longUrl);
  memoryCache.set(longUrl, short);
  return short;
}
