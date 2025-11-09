import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Database, RefreshCw, Gauge, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QuotaData {
  quota_type: string;
  limit_value: number;
  current_usage: number;
  reset_at: string;
}

export default function SystemHealth() {
  // Fetch quota status directly from tenant_quotas
  const { data: quotas } = useQuery({
    queryKey: ['quota-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_quotas')
        .select('*')
        .order('quota_type');
      
      if (error) throw error;
      return data as QuotaData[];
    },
    refetchInterval: 30000,
  });

  const getUsagePercent = (quota: QuotaData) => {
    return (quota.current_usage / quota.limit_value) * 100;
  };

  const getRemaining = (quota: QuotaData) => {
    return quota.limit_value - quota.current_usage;
  };

  const getQuotaColor = (percent: number) => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (percent: number) => {
    if (percent > 90) return <Badge className="bg-red-500">Critical</Badge>;
    if (percent > 75) return <Badge className="bg-yellow-500">Warning</Badge>;
    return <Badge className="bg-green-500">Healthy</Badge>;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">Monitor quota usage and system status</p>
        </div>
      </div>

      {/* Quota Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {quotas?.map((quota) => {
          const percent = getUsagePercent(quota);
          const remaining = getRemaining(quota);
          
          return (
            <Card key={quota.quota_type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize">
                  {quota.quota_type.replace(/_/g, ' ')}
                </CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {remaining.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {quota.current_usage.toLocaleString()} / {quota.limit_value.toLocaleString()} used
                </p>
                <div className="mt-2">
                  {getStatusBadge(percent)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Quota Usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <CardTitle>Quota Details</CardTitle>
          </div>
          <CardDescription>Your current usage across all quota types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quotas && quotas.length > 0 ? (
            quotas.map((quota) => {
              const percent = getUsagePercent(quota);
              const remaining = getRemaining(quota);
              
              return (
                <div key={quota.quota_type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {quota.quota_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {quota.current_usage.toLocaleString()} / {quota.limit_value.toLocaleString()}
                        {' '}({remaining.toLocaleString()} remaining)
                      </p>
                    </div>
                    <Badge variant="outline">
                      {percent.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${getQuotaColor(percent)}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Resets {formatDistanceToNow(new Date(quota.reset_at), { addSuffix: true })}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No quota data available</p>
          )}
        </CardContent>
      </Card>

      {/* Infrastructure Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Infrastructure Status</CardTitle>
          </div>
          <CardDescription>Database and background job health</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Materialized View Refresh</span>
            </div>
            <div className="text-right">
              <p className="text-sm">Every 5 minutes</p>
              <p className="text-xs text-muted-foreground">Via pg_cron</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Audit Chain Verification</span>
            </div>
            <div className="text-right">
              <p className="text-sm">Hourly</p>
              <p className="text-xs text-muted-foreground">Automated via cron</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Audit Log Immutability</span>
            </div>
            <Badge className="bg-green-500">Enforced</Badge>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Quota Security</span>
            </div>
            <Badge className="bg-green-500">Hardened</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
