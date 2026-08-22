/**
 * URL Shortening Service with multi-provider fallback & persistent caching
 * Generates clean, ultra-short links (e.g., https://tinyurl.com/xyz, https://spoo.me/abc)
 */

const memoryCache = new Map<string, string>();

/**
 * Attempt to shorten long URL using backend server (TinyURL) or fast CORS APIs
 */
export async function shortenUrl(longUrl: string): Promise<string> {
  if (!longUrl || typeof longUrl !== 'string') return '';
  if (longUrl.length < 35 && !longUrl.includes('#s=')) return longUrl;

  // 1. Check memory cache
  if (memoryCache.has(longUrl)) {
    return memoryCache.get(longUrl)!;
  }

  // 2. Check localStorage cache
  const cacheKey = `nooswise_short_${hashString(longUrl)}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached && (cached.startsWith('https://') || cached.startsWith('http://'))) {
      memoryCache.set(longUrl, cached);
      return cached;
    }
  } catch {}

  // 3. Primary Provider: Backend /api/shorten (Calls TinyURL server-side without CORS limits)
  try {
    const response = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: longUrl }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.shortUrl && (data.shortUrl.startsWith('https://') || data.shortUrl.startsWith('http://'))) {
        const shortUrl = String(data.shortUrl).trim();
        saveToCache(longUrl, shortUrl, cacheKey);
        return shortUrl;
      }
    }
  } catch (e) {
    // Continue to next provider
  }

  // 4. Provider 2: spoo.me
  try {
    const response = await fetch('https://spoo.me/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({ url: longUrl }).toString(),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.short_url) {
        const shortUrl = String(data.short_url).trim();
        saveToCache(longUrl, shortUrl, cacheKey);
        return shortUrl;
      }
    }
  } catch (e) {
    // Continue to next provider
  }

  // 5. Provider 3: TinyURL direct
  try {
    const tinyEndpoint = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
    const gatewayUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(tinyEndpoint)}`;
    const response = await fetch(gatewayUrl);
    if (response.ok) {
      const text = await response.text();
      if (text && (text.startsWith('https://tinyurl.com/') || text.startsWith('http://tinyurl.com/'))) {
        const shortUrl = text.trim();
        saveToCache(longUrl, shortUrl, cacheKey);
        return shortUrl;
      }
    }
  } catch (e) {
    // Continue to next fallback
  }

  // Fallback to longUrl if completely offline
  return longUrl;
}

/**
 * Get synchronously cached short URL if already computed
 */
export function getCachedShortUrl(longUrl: string): string | null {
  if (!longUrl) return null;
  if (memoryCache.has(longUrl)) {
    return memoryCache.get(longUrl)!;
  }
  const cacheKey = `nooswise_short_${hashString(longUrl)}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      memoryCache.set(longUrl, cached);
      return cached;
    }
  } catch {}
  return null;
}

function saveToCache(longUrl: string, shortUrl: string, cacheKey: string) {
  memoryCache.set(longUrl, shortUrl);
  try {
    localStorage.setItem(cacheKey, shortUrl);
  } catch {}
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
