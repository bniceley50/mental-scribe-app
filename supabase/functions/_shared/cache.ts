/**
 * Redis caching with Upstash (cache-aside pattern)
 * 
 * SETUP REQUIRED:
 * 1. Create Upstash Redis database at https://console.upstash.com/
 * 2. Add secrets:
 *    supabase secrets set UPSTASH_REDIS_REST_URL="https://[region].upstash.io"
 *    supabase secrets set UPSTASH_REDIS_REST_TOKEN="[token]"
 * 
 * SECURITY RULES:
 * - ONLY cache non-PHI data (tenant settings, feature flags, metadata)
 * - NEVER cache clinical content, notes, or patient data
 * - Use short TTLs (60-300s) for consistency
 */

import { Redis } from "https://deno.land/x/upstash_redis@v1.19.3/mod.ts";

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

let redis: Redis | null = null;

if (REDIS_URL && REDIS_TOKEN) {
  redis = new Redis({
    url: REDIS_URL,
    token: REDIS_TOKEN,
  });
  console.log("[Cache] Redis client initialized");
} else {
  console.warn("[Cache] Redis not configured - caching disabled (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)");
}

/**
 * Cache-aside pattern: check cache, fallback to fetcher, populate cache
 * 
 * @param key - Unique cache key (format: "entity:id:version")
 * @param ttlSeconds - Time to live in seconds
 * @param fetcher - Function to fetch data on cache miss
 * @returns Cached or fresh data
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // If Redis not configured, always fetch fresh
  if (!redis) {
    return await fetcher();
  }

  try {
    // Try cache hit
    const cached = await redis.get<string>(key);
    if (cached) {
      console.log(`[Cache HIT] ${key}`);
      return JSON.parse(cached);
    }

    // Cache miss - fetch fresh data
    console.log(`[Cache MISS] ${key}`);
    const fresh = await fetcher();

    // Populate cache (fire-and-forget to avoid blocking response)
    redis.set(key, JSON.stringify(fresh), { ex: ttlSeconds }).catch((err) => {
      console.error(`[Cache] Failed to set ${key}:`, err);
    });

    return fresh;
  } catch (error) {
    console.error(`[Cache] Error for ${key}:`, error);
    // On cache error, fallback to fetcher
    return await fetcher();
  }
}

/**
 * Invalidate cached entry
 */
export async function cacheInvalidate(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
    console.log(`[Cache INVALIDATE] ${key}`);
  } catch (error) {
    console.error(`[Cache] Failed to invalidate ${key}:`, error);
  }
}

/**
 * Invalidate multiple keys matching a pattern
 * WARNING: Use sparingly - SCAN is expensive on large keyspaces
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!redis) return;

  try {
    // Note: Upstash REST API doesn't support SCAN, so this is a placeholder
    // For pattern invalidation, use specific keys or implement via Edge Function + pg_notify
    console.warn(`[Cache] Pattern invalidation not supported in REST mode: ${pattern}`);
  } catch (error) {
    console.error(`[Cache] Pattern invalidation error:`, error);
  }
}

/**
 * Get cache statistics (hit rate, etc.)
 */
export function getCacheStats() {
  return {
    enabled: redis !== null,
    provider: "Upstash Redis",
    mode: "cache-aside",
  };
}
