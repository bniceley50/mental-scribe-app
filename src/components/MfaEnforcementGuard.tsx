import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface MfaEnforcementGuardProps {
  children: React.ReactNode;
}

/**
 * MfaEnforcementGuard Component
 * 
 * SECURITY: Enforces MFA enrollment for admin users
 * - Checks if user has admin role
 * - Verifies MFA enrollment status via is_mfa_enrolled() RPC
 * - Redirects to /settings?tab=security if admin without MFA
 * - Shows dismissible warning dialog (not blocking, but persistent)
 * 
 * PLACEMENT: Wrap around app content after ProtectedRoute
 */
export function MfaEnforcementGuard({ children }: MfaEnforcementGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMfaWarning, setShowMfaWarning] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkMfaRequirement();
  }, [location.pathname]);

  const checkMfaRequirement = async () => {
    try {
      // Skip check on auth/settings pages
      if (location.pathname === '/auth' || location.pathname === '/settings') {
        setIsChecking(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Check if user is admin
      const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin', {
        _user_id: user.id
      });

      if (roleError) {
        console.error('Failed to check admin status:', roleError);
        setIsChecking(false);
        return;
      }

      // Only enforce MFA for admins
      if (!isAdmin) {
        setIsChecking(false);
        return;
      }

      // Check MFA enrollment status
      const { data: isMfaEnrolled, error: mfaError } = await supabase.rpc('is_mfa_enrolled', {
        _user_id: user.id
      });

      if (mfaError) {
        console.error('Failed to check MFA status:', mfaError);
        setIsChecking(false);
        return;
      }

      // Show warning if admin without MFA
      if (!isMfaEnrolled) {
        setShowMfaWarning(true);
      }

      setIsChecking(false);
    } catch (error) {
      console.error('MFA enforcement check failed:', error);
      setIsChecking(false);
    }
  };

  const handleEnableMfa = () => {
    setShowMfaWarning(false);
    navigate('/settings?tab=security');
    toast.warning('MFA required for admin access', {
      description: 'Please enroll in Multi-Factor Authentication to secure your admin account.'
    });
  };

  const handleDismiss = () => {
    setShowMfaWarning(false);
    toast.warning('MFA enrollment recommended', {
      description: 'Admin accounts should use MFA. You can enable it later in Security Settings.'
    });
  };

  // Don't block rendering, just show warning
  if (isChecking) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      <AlertDialog open={showMfaWarning} onOpenChange={setShowMfaWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Shield className="w-6 h-6 text-warning" />
              </div>
              <AlertDialogTitle>MFA Required for Admin Access</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              Your account has administrative privileges. For security compliance,
              Multi-Factor Authentication (MFA) is required for all admin accounts.
              <br /><br />
              Please enroll in MFA to continue accessing admin features securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleDismiss}>
              Remind Me Later
            </Button>
            <Button onClick={handleEnableMfa}>
              Enable MFA Now
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
