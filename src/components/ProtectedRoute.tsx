import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * SECURITY: Ensures user is authenticated before rendering protected content
 * - Checks for valid session on mount
 * - Redirects to /auth if no session or session expired
 * - Listens for auth state changes (logout, token expiry)
 * - Shows loading state during auth check (prevents flash of protected content)
 * 
 * CRITICAL: All routes containing PHI must be wrapped with this component
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth check error:', error);
          navigate('/auth', { replace: true });
          return;
        }
        
        if (!session) {
          navigate('/auth', { replace: true });
          return;
        }
        
        // Additional check: verify session is not expired
        const expiresAt = session.expires_at;
        if (expiresAt && expiresAt * 1000 < Date.now()) {
          console.warn('Session expired, signing out');
          await supabase.auth.signOut();
          navigate('/auth', { replace: true });
          return;
        }
        
        // Session is valid
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Unexpected auth error:', error);
        navigate('/auth', { replace: true });
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false);
          navigate('/auth', { replace: true });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsAuthenticated(true);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
  // Show loading state while checking auth
  // SECURITY: Prevents flash of protected content before redirect
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }
  
  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
}
