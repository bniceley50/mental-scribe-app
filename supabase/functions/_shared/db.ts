/**
 * Database routing helper - Supabase client-based (no postgres Pool to avoid denopkg issues)
 * 
 * SETUP: These use the standard Supabase client. For true read replica routing,
 * you'll need to set up separate connection strings and use postgres Pool once
 * the denopkg.com import issue is resolved by Supabase.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// Placeholder for write operations - use standard client
export async function withWrite<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const client = getClient();
  return await fn(client);
}

// Placeholder for read operations - use standard client
// TODO: Once denopkg issue resolved, replace with postgres Pool for true replica routing
export async function withRead<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const client = getClient();
  return await fn(client);
}
