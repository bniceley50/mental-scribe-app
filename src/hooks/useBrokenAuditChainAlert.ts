import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BrokenChainAlert {
  id: number;
  run_at: string;
  broken_at_id: string | null;
  verified_entries: number;
  total_entries: number;
}

export function useBrokenAuditChainAlert() {
  const [brokenChain, setBrokenChain] = useState<BrokenChainAlert | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check for any existing broken chains on mount
    const checkExistingBrokenChains = async () => {
      const { data, error } = await supabase
        .from('audit_verify_runs')
        .select('*')
        .eq('intact', false)
        .order('run_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setBrokenChain(data);
        setIsDismissed(false);
      }
    };

    checkExistingBrokenChains();

    // Subscribe to real-time updates for new verification runs
    const channel = supabase
      .channel('audit-chain-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_verify_runs'
        },
        (payload) => {
          // Check if the new run detected a broken chain
          if (payload.new && !payload.new.intact) {
            setBrokenChain(payload.new as BrokenChainAlert);
            setIsDismissed(false); // Reset dismissal on new broken chain
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismiss = () => {
    setIsDismissed(true);
  };

  return {
    brokenChain: isDismissed ? null : brokenChain,
    dismiss,
  };
}
