import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export function AuditVerification() {
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch recent verification runs
  const { data: verificationRuns, isLoading } = useQuery({
    queryKey: ['audit-verification-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_verify_runs')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Subscribe to real-time updates for new verification runs
  useEffect(() => {
    const channel = supabase
      .channel('audit-verify-runs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_verify_runs'
        },
        (payload) => {
          console.log('New audit verification run:', payload);
          
          // Invalidate and refetch the query to show the new run
          queryClient.invalidateQueries({ queryKey: ['audit-verification-runs'] });
          
          // Show a toast notification
          toast({
            title: 'New Verification Complete',
            description: `Audit chain verification ${payload.new.intact ? 'passed' : 'failed'}`,
            variant: payload.new.intact ? 'default' : 'destructive',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Trigger manual verification
  const verifyMutation = useMutation({
    mutationFn: async () => {
      setIsVerifying(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await supabase.functions.invoke('audit-verify', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Audit Verification Triggered',
        description: data.kicked 
          ? `Batch verification started at ${data.ts}`
          : 'Verification completed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['audit-verification-runs'] });
      setIsVerifying(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsVerifying(false);
    },
  });

  const getStatusBadge = (intact: boolean | null) => {
    if (intact === null) return <Badge variant="outline">Pending</Badge>;
    if (intact) {
      return (
        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
          <CheckCircle className="mr-1 h-3 w-3" />
          Intact
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Broken
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Audit Chain Verification
            </CardTitle>
            <CardDescription>
              Manually trigger audit chain verification and view recent results
            </CardDescription>
          </div>
          <Button
            onClick={() => verifyMutation.mutate()}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Run Verification
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : verificationRuns && verificationRuns.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Total Entries</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verificationRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{getStatusBadge(run.intact)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(run.run_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{run.total_entries ?? '-'}</TableCell>
                    <TableCell>{run.verified_entries ?? '-'}</TableCell>
                    <TableCell>
                      {run.broken_at_id && (
                        <div className="flex items-center gap-1 text-sm">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="font-mono text-xs">
                            {run.broken_at_id.slice(0, 8)}...
                          </span>
                        </div>
                      )}
                      {run.details && (
                        <div className="text-xs text-muted-foreground">
                          {typeof run.details === 'object' 
                            ? JSON.stringify(run.details).slice(0, 50) + '...'
                            : run.details}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No verification runs found. Click "Run Verification" to start.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
