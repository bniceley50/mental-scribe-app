/**
 * Redis caching with Upstash (cache-aside pattern)
 * 
 * TEMPORARILY DISABLED: Upstash Redis import causes denopkg.com access error in Supabase Edge Functions
 * TO RE-ENABLE: Uncomment the Redis import and related code
 * 
 * SECURITY RULES:
 * - ONLY cache non-PHI data (tenant settings, feature flags, metadata)
 * - NEVER cache clinical content, notes, or patient data
 * - Use short TTLs (60-300s) for consistency
 */

// TEMPORARILY DISABLED - causes build errors
// import { Redis } from "https://deno.land/x/upstash_redis@v1.19.3/mod.ts";

const redis: null = null;

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Redis temporarily disabled - always fetch fresh
  return await fetcher();
}

export async function cacheInvalidate(key: string): Promise<void> {
  // Redis temporarily disabled
  return;
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  // Redis temporarily disabled
  return;
}

export function getCacheStats() {
  return {
    enabled: false,
    provider: "Disabled (Redis import causes build errors)",
    mode: "passthrough",
  };
}
