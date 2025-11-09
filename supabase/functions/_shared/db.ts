/**
 * Database connection routing for read replicas
 * 
 * SETUP REQUIRED:
 * 1. Create read replica in Supabase Dashboard → Database → Read Replicas
 * 2. Add secrets:
 *    supabase secrets set DB_PRIMARY_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
 *    supabase secrets set DB_REPLICA_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
 * 
 * ROUTING RULES:
 * - Use withWrite() for INSERT, UPDATE, DELETE, read-your-writes scenarios
 * - Use withRead() for safe reads (dashboards, lists, analytics)
 */

import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const WRITE_DSN = Deno.env.get("DB_PRIMARY_URL");
const READ_DSN = Deno.env.get("DB_REPLICA_URL") || WRITE_DSN; // Fallback to primary if no replica

if (!WRITE_DSN) {
  throw new Error("DB_PRIMARY_URL environment variable not set");
}

// Single connection pools (Supavisor handles pooling at the proxy layer)
const writePool = new Pool(WRITE_DSN, 1, true);
const readPool = new Pool(READ_DSN!, 1, true);

export async function withWrite<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const client = await writePool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withRead<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const client = await readPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

// Utility for logging query performance (optional)
export async function withReadTimed<T>(
  fn: (client: any) => Promise<T>,
  metricName: string
): Promise<T> {
  const start = performance.now();
  try {
    return await withRead(fn);
  } finally {
    const duration = performance.now() - start;
    console.log(`[DB Read] ${metricName}: ${duration.toFixed(2)}ms`);
  }
}
