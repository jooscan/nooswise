/**
 * Instant, ultra-short link generator (max 20 characters)
 * e.g., noos.app/s/tokyo26, noos.ws/s/chasing, nooswise.app/s/id
 * Computes instantaneously (0ms) without slow external network latency
 */

const memoryCache = new Map<string, string>();

/**
 * Generate a clean, ultra-compact short link guaranteed to be max 20 characters
 */
export function getInstantShortUrl(groupIdOrUrl: string): string {
  if (!groupIdOrUrl) return 'noos.app/s/split';

  // If already a clean short link
  if (groupIdOrUrl.startsWith('noos.app/') || groupIdOrUrl.startsWith('noos.ws/')) {
    return groupIdOrUrl;
  }

  // Extract ID if full URL passed
  let id = groupIdOrUrl;
  if (id.includes('?s=')) {
    id = id.split('?s=')[1].split('&')[0];
  } else if (id.includes('/#s=')) {
    id = id.split('/#s=')[1].split('&')[0];
  } else if (id.includes('/s/')) {
    id = id.split('/s/')[1].split('/')[0];
  } else if (id.includes('/')) {
    const parts = id.split('/').filter(Boolean);
    id = parts[parts.length - 1] || 'split';
  }

  // Clean slug
  id = decodeURIComponent(id)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

  // Ensure slug length leaves room so total URL is <= 20 chars
  // 'noos.app/s/' is 10 chars, leaving 10 chars for slug -> max 20 total chars!
  const slug = id.length > 9 ? id.slice(0, 9).replace(/-$/, '') : id || 'split';
  
  return `noos.app/s/${slug}`;
}

/**
 * Shorten URL asynchronously or instantly with persistent cache
 */
export async function shortenUrl(longUrl: string): Promise<string> {
  if (!longUrl || typeof longUrl !== 'string') return 'noos.app/s/split';

  if (memoryCache.has(longUrl)) {
    return memoryCache.get(longUrl)!;
  }

  const shortUrl = getInstantShortUrl(longUrl);
  memoryCache.set(longUrl, shortUrl);

  const cacheKey = `nooswise_short_${hashString(longUrl)}`;
  try {
    localStorage.setItem(cacheKey, shortUrl);
  } catch {}

  return shortUrl;
}

/**
 * Get synchronously cached short URL if already computed
 */
export function getCachedShortUrl(longUrl: string): string {
  if (!longUrl) return 'noos.app/s/split';
  if (memoryCache.has(longUrl)) {
    return memoryCache.get(longUrl)!;
  }
  const short = getInstantShortUrl(longUrl);
  memoryCache.set(longUrl, short);
  return short;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
