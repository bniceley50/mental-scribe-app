import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Hook to check if current user has admin access
 * Checks for 'admin' or 'superadmin' role in JWT claims
 */
export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAdminAccess();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await checkAdminAccess();
        } else if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkAdminAccess() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setUser(null);
        return;
      }

      setUser(user);

      // Check role from user_roles table using RLS-safe function
      const { data: hasRole, error: roleError } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (roleError) {
        console.error('Failed to check role:', roleError);
        setIsAdmin(false);
      } else {
        setIsAdmin(hasRole || false);
      }
    } catch (error) {
      console.error('Failed to check admin access:', error);
      setIsAdmin(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  return { isAdmin, loading, user };
}
