import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SecurityAlert {
  id: number;
  run_at: string;
  broken_at_id: string | null;
  verified_entries: number;
  total_entries: number;
  details: any;
}

export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_verify_runs'
        },
        (payload) => {
          if (payload.new && !payload.new.intact) {
            const newAlert = payload.new as SecurityAlert;
            setAlerts(prev => [newAlert, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('audit_verify_runs')
        .select('*')
        .eq('intact', false)
        .order('run_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setAlerts(data || []);
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const clearAlert = (id: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return {
    alerts,
    unreadCount,
    isLoading,
    markAllAsRead,
    clearAlert,
    refetch: fetchAlerts,
  };
}
