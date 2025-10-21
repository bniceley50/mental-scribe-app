import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Initialize Supabase client for CLI operations
 */
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    );
  }

  return createClient(url, key);
}

/**
 * Get service role client for admin operations
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase admin credentials. Set SUPABASE_SERVICE_ROLE_KEY environment variable.'
    );
  }

  return createClient(url, key);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString();
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Exit with error message
 */
export function exitWithError(message: string, code = 1): never {
  console.error(`❌ Error: ${message}`);
  process.exit(code);
}
