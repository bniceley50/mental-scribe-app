import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { XCircle, X, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BrokenChainAlertBannerProps {
  brokenChain: {
    id: number;
    run_at: string;
    broken_at_id: string | null;
    verified_entries: number;
    total_entries: number;
  };
  onDismiss: () => void;
}

export function BrokenChainAlertBanner({ brokenChain, onDismiss }: BrokenChainAlertBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <Alert 
        variant="destructive" 
        className="rounded-none border-l-0 border-r-0 border-t-0 border-b-4 border-destructive shadow-lg bg-destructive/95 backdrop-blur supports-[backdrop-filter]:bg-destructive/90"
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative">
              <XCircle className="h-6 w-6 text-destructive-foreground" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </div>
            <div className="flex-1">
              <AlertTitle className="text-lg font-bold text-destructive-foreground mb-1 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                CRITICAL: Audit Chain Integrity Breach Detected
              </AlertTitle>
              <AlertDescription className="text-destructive-foreground/90 space-y-1">
                <p className="font-medium">
                  A broken link was detected in the audit chain {formatDistanceToNow(new Date(brokenChain.run_at), { addSuffix: true })}.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    <strong>Verified:</strong> {brokenChain.verified_entries} / {brokenChain.total_entries} entries
                  </span>
                  {brokenChain.broken_at_id && (
                    <span className="font-mono">
                      <strong>Break at:</strong> {brokenChain.broken_at_id.slice(0, 8)}...
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold mt-2">
                  ⚠️ This indicates potential data tampering. Immediate investigation required for HIPAA compliance.
                </p>
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-destructive-foreground hover:bg-destructive-foreground/10 shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}
