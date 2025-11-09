import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * SECURITY: Ensures user is authenticated before rendering protected content
 * - Stores complete session object (not just user) for proper token refresh
 * - Sets up auth listener FIRST, then checks session (correct initialization order)
 * - Never calls Supabase functions inside onAuthStateChange (prevents deadlocks)
 * - Uses setTimeout(0) to defer async operations from auth callback
 * - Shows loading state during auth check (prevents flash of protected content)
 * 
 * CRITICAL: All routes containing PHI must be wrapped with this component
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  // CRITICAL: Store complete session object, not just user
  const [session, setSession] = useState<Session | null>(null);
  
  useEffect(() => {
    // STEP 1: Set up auth state listener FIRST (correct initialization order)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // CRITICAL: Only synchronous state updates in this callback
        // Never call other Supabase functions here (prevents deadlock)
        setSession(newSession);
        
        // Use setTimeout(0) to defer navigation (async operation)
        if (event === 'SIGNED_OUT' || !newSession) {
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 0);
        } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          // Session is valid, component will re-render with new session
          setTimeout(() => {
            setIsChecking(false);
          }, 0);
        }
      }
    );
    
    // STEP 2: THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      if (error) {
        logger.error('Auth check error', error);
        setSession(null);
        navigate('/auth', { replace: true });
        setIsChecking(false);
        return;
      }
      
      if (!existingSession) {
        setSession(null);
        navigate('/auth', { replace: true });
        setIsChecking(false);
        return;
      }
      
      // Additional check: verify session is not expired
      const expiresAt = existingSession.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        logger.warn('Session expired');
        setSession(null);
        // Defer sign out to avoid calling Supabase during initialization
        setTimeout(() => {
          supabase.auth.signOut();
          navigate('/auth', { replace: true });
        }, 0);
        setIsChecking(false);
        return;
      }
      
      // Session is valid
      setSession(existingSession);
      setIsChecking(false);
    }).catch((error) => {
      logger.error('Unexpected auth error', error as Error);
      setSession(null);
      navigate('/auth', { replace: true });
      setIsChecking(false);
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);
  
  // Show loading state while checking auth
  // SECURITY: Prevents flash of protected content before redirect
  if (isChecking || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }
  
  // Only render children if we have a valid session
  return <>{children}</>;
}
