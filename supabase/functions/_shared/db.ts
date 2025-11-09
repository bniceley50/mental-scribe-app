/**
 * Database client routing for read replicas via Supabase REST API
 * 
 * SETUP REQUIRED:
 * 1. Create read replica in Supabase Dashboard → Database → Read Replicas  
 * 2. No additional secrets needed - uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 
 * ROUTING RULES:
 * - Use getWriteClient() for INSERT, UPDATE, DELETE, read-your-writes
 * - Use getReadClient() for safe reads (dashboards, lists, analytics)
 * 
 * NOTE: For Edge Functions, use Supabase client methods, not raw SQL.
 * Read replica routing is configured at the Supabase project level.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
}

// Create clients for read/write routing
// Note: Actual replica routing is handled by Supabase's infrastructure
// when you mark RPC functions as STABLE and use { get: true }
export function getWriteClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

export function getReadClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

// Helper for timing read operations
export async function withReadTimed<T>(
  fn: () => Promise<T>,
  metricName: string
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    console.log(`[DB Read] ${metricName}: ${duration.toFixed(2)}ms`);
  }
}
