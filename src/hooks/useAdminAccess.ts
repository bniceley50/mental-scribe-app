import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string;
  };
  app_metadata?: {
    role?: string;
  };
}

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

      // Check role from user metadata or app metadata
      const role =
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        'user';

      const hasAdminAccess = role === 'admin' || role === 'superadmin';
      setIsAdmin(hasAdminAccess);
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
