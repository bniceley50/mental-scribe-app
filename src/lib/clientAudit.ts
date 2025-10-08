/**
 * Client Audit Logging Utilities
 * HIPAA REQUIREMENT: All client data access must be logged
 * 
 * This module provides centralized functions for logging client data access
 * to the client_access_logs table via the log_client_view() RPC function.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Access method types for client view logging
 */
type AccessMethod = 'direct_owner' | 'clinical_staff' | 'admin' | 'unknown';

/**
 * Log a client data view event
 * 
 * PERFORMANCE NOTE: This function now uses server-side RPC to avoid N+1 queries.
 * The RPC function detects access method internally using security definer context.
 * 
 * @param clientId - UUID of the client being viewed
 * @returns Promise that resolves when logging is complete
 * 
 * @example
 * ```typescript
 * // In ClientProfile.tsx on mount:
 * await logClientView(clientId);
 * 
 * // In ClientsList.tsx - use batch function instead:
 * await batchLogClientViews(clientIds);
 * ```
 */
export async function logClientView(
  clientId: string
): Promise<void> {
  try {
    // Call optimized RPC - server determines access method to avoid N+1 queries
    const { error } = await supabase.rpc('log_client_view', {
      _client_id: clientId,
      _access_method: 'ui_view' // Server will detect actual method
    });

    if (error) {
      // Log error but don't block UI - auditing is non-blocking
      console.error('Failed to log client view:', error);
      
      // TODO: Send to error tracking service (Sentry, etc.)
      return;
    }

    console.debug(`Client view logged: ${clientId}`);
  } catch (err) {
    // Catch any unexpected errors to ensure UI is never blocked
    console.error('Unexpected error in logClientView:', err);
    // TODO: Send to error tracking service
  }
}

/**
 * DEPRECATED: Access method detection moved to server-side RPC for performance.
 * This function performed N+1 queries and increased attack surface.
 * 
 * The log_client_view() RPC now handles access method detection internally
 * using security definer context, reducing database round-trips from 4+ to 1.
 */

/**
 * Batch log multiple client views (useful for list views)
 * 
 * PERFORMANCE: Uses Promise.all for parallel execution instead of sequential awaits.
 * Failures are aggregated and logged but don't block the operation.
 * 
 * @param clientIds - Array of client UUIDs being viewed
 * @returns Promise that resolves when all logging attempts complete
 * 
 * @example
 * ```typescript
 * // In ClientsList.tsx when list is loaded:
 * useEffect(() => {
 *   if (clients.length > 0) {
 *     batchLogClientViews(clients.map(c => c.id));
 *   }
 * }, [clients]);
 * ```
 */
export async function batchLogClientViews(
  clientIds: string[]
): Promise<void> {
  if (!clientIds || clientIds.length === 0) return;

  // Execute all logging calls in parallel (not sequential)
  const results = await Promise.allSettled(
    clientIds.map(id => logClientView(id))
  );

  // Aggregate failures for monitoring
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`Batch audit logging: ${failures.length}/${clientIds.length} failed`);
    // TODO: Send aggregated failure metrics to monitoring service
  }
}

/**
 * Hook-style wrapper for React components
 * Call this in useEffect when a client profile is mounted
 * 
 * @param clientId - UUID of the client being viewed
 * 
 * @example
 * ```typescript
 * useEffect(() => {
 *   if (clientId) {
 *     useClientViewLogger(clientId);
 *   }
 * }, [clientId]);
 * ```
 */
export function useClientViewLogger(clientId: string | undefined): void {
  if (!clientId) return;
  
  // Fire and forget - don't block component rendering
  logClientView(clientId).catch(err => {
    console.error('Client view logging failed:', err);
  });
}
