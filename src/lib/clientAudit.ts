// Lightweight UI-level audit helper for client/profile views.
// Adjust supabase client import if your path differs.
import { supabase } from '../lib/supabaseClient';

export async function logClientView(clientId: string) {
  if (!clientId) return;
  const { error } = await supabase.rpc('log_client_view', { client_id: clientId });
  if (error) console.warn('[audit] log_client_view failed:', error.message);
}
