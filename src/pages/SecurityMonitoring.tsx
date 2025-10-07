import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Shield, Activity, Users } from "lucide-react";
import { toast } from "sonner";

interface SuspiciousPattern {
  accessed_by: string;
  access_count: number;
  unique_clients: number;
  access_types: unknown;
  access_methods: unknown;
}

// Helper to safely parse JSON arrays
const parseJsonArray = (data: unknown): string[] => {
  if (Array.isArray(data)) return data.map(String);
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export default function SecurityMonitoring() {
  const [patterns, setPatterns] = useState<SuspiciousPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityData();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadSecurityData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the security function to get suspicious access patterns
      const { data, error } = await supabase.rpc('get_suspicious_access_patterns', {
        _hours_lookback: 24,
        _access_threshold: 10
      });

      if (error) throw error;

      setPatterns(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load security data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Monitoring Dashboard
        </h1>
        <p className="text-muted-foreground">
          Real-time monitoring of suspicious access patterns and security alerts
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patterns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.length}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patterns.filter(p => p.access_count > 50).length}
            </div>
            <p className="text-xs text-muted-foreground">&gt;50 accesses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(patterns.map(p => p.accessed_by)).size}
            </div>
            <p className="text-xs text-muted-foreground">Flagged users</p>
          </CardContent>
        </Card>
      </div>

      {patterns.length === 0 && !loading && !error && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>All Clear</AlertTitle>
          <AlertDescription>
            No suspicious access patterns detected in the last 24 hours.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {patterns.map((pattern, idx) => (
          <Card key={idx} className="border-l-4 border-l-destructive">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    Suspicious Activity Detected
                  </CardTitle>
                  <CardDescription>
                    User ID: <code className="text-xs">{pattern.accessed_by}</code>
                  </CardDescription>
                </div>
                <Badge variant={pattern.access_count > 50 ? "destructive" : "secondary"}>
                  {pattern.access_count > 50 ? "High Risk" : "Medium Risk"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium mb-1">Access Statistics</p>
                  <ul className="text-sm space-y-1">
                    <li>Total Accesses: <strong>{pattern.access_count}</strong></li>
                    <li>Unique Clients: <strong>{pattern.unique_clients}</strong></li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Access Types</p>
                  <div className="flex flex-wrap gap-1">
                    {parseJsonArray(pattern.access_types).map((type, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium mb-1 mt-2">Access Methods</p>
                  <div className="flex flex-wrap gap-1">
                    {parseJsonArray(pattern.access_methods).map((method, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
