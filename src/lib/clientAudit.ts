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
 * @param clientId - UUID of the client being viewed
 * @param accessMethod - How the user is accessing the client data (optional, auto-detected if omitted)
 * @returns Promise that resolves when logging is complete
 * 
 * @example
 * ```typescript
 * // In ClientProfile.tsx on mount:
 * await logClientView(clientId);
 * 
 * // In ClientsList.tsx on click:
 * await logClientView(clientId, 'clinical_staff');
 * ```
 */
export async function logClientView(
  clientId: string,
  accessMethod?: AccessMethod
): Promise<void> {
  try {
    // Detect access method if not provided
    const method = accessMethod || await detectAccessMethod(clientId);

    // Call the RPC function to log the view
    const { error } = await supabase.rpc('log_client_view', {
      _client_id: clientId,
      _access_method: method
    });

    if (error) {
      // Log error but don't block UI - auditing is non-blocking
      console.error('Failed to log client view:', error);
      
      // In production, you might want to send this to an error tracking service
      // but never show errors to end users for audit logging failures
      return;
    }

    // Success - audit log created
    console.debug(`Client view logged: ${clientId} via ${method}`);
  } catch (err) {
    // Catch any unexpected errors to ensure UI is never blocked
    console.error('Unexpected error in logClientView:', err);
  }
}

/**
 * Auto-detect the access method based on the current user's roles and relationship to the client
 * 
 * @param clientId - UUID of the client being accessed
 * @returns Promise<AccessMethod> - The detected access method
 */
async function detectAccessMethod(clientId: string): Promise<AccessMethod> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'unknown';

    // Check if user is the direct owner of the client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('user_id, program_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) return 'unknown';

    // Direct owner check
    if (client.user_id === user.id) {
      return 'direct_owner';
    }

    // Check if user is an admin
    const { data: adminRole, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminError && adminRole) {
      return 'admin';
    }

    // Check if user is clinical staff assigned to this client
    if (client.program_id) {
      const { data: membership, error: memberError } = await supabase
        .from('user_program_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('program_id', client.program_id)
        .in('role', ['treating_provider', 'care_team'])
        .maybeSingle();

      if (!memberError && membership) {
        // Verify they're actually assigned to this patient
        const { data: assignment, error: assignError } = await supabase
          .from('patient_assignments')
          .select('id')
          .eq('staff_user_id', user.id)
          .eq('client_id', clientId)
          .is('revoked_at', null)
          .maybeSingle();

        if (!assignError && assignment) {
          return 'clinical_staff';
        }
      }
    }

    // If we can't determine, mark as unknown (this may indicate a security issue)
    return 'unknown';
  } catch (err) {
    console.error('Error detecting access method:', err);
    return 'unknown';
  }
}

/**
 * Batch log multiple client views (useful for list views)
 * 
 * @param clientIds - Array of client UUIDs being viewed
 * @param accessMethod - How the user is accessing the clients (optional)
 * @returns Promise that resolves when all logging is complete
 * 
 * @example
 * ```typescript
 * // In ClientsList.tsx when list is loaded:
 * await batchLogClientViews(clientIds);
 * ```
 */
export async function batchLogClientViews(
  clientIds: string[],
  accessMethod?: AccessMethod
): Promise<void> {
  // Don't await - fire and forget to avoid blocking UI
  // Logs are processed in parallel
  const promises = clientIds.map(id => logClientView(id, accessMethod));
  
  // Wait for all to complete but catch any errors
  await Promise.allSettled(promises);
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
