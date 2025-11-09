/**
 * Redis caching - TEMPORARILY DISABLED due to denopkg.com import restrictions
 * 
 * Once Supabase resolves the denopkg.com access restriction, re-enable with:
 * import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";
 * 
 * SECURITY RULES when enabled:
 * - ONLY cache non-PHI data (tenant settings, feature flags, metadata)
 * - NEVER cache clinical content, notes, or patient data
 * - Use short TTLs (60-300s) for consistency
 */

// Passthrough implementation - no caching
export async function cacheGetOrSet<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  console.log(`[Cache DISABLED] Passthrough for ${key}`);
  return await fn();
}

export async function cacheInvalidate(key: string): Promise<void> {
  // No-op
}

export function getCacheStats() {
  return {
    enabled: false,
    provider: "Disabled (awaiting denopkg.com resolution)",
    mode: "passthrough",
  };
}
