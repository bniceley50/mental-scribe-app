import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Database, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { AuditVerification } from "@/components/admin/AuditVerification";

interface VerifyResult {
  intact: boolean;
  totalEntries: number;
  verifiedEntries: number;
  error?: string;
  brokenAtEntry?: number;
  details?: {
    expected: string;
    actual: string;
  };
  message?: string;
}

export default function AuditDashboard() {
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const navigate = useNavigate();
  const [verificationResult, setVerificationResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied: Admin role required");
      navigate("/");
      return;
    }

    if (isAdmin) {
      verifyAuditChain();
      // Auto-refresh every 5 minutes
      const interval = setInterval(verifyAuditChain, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, adminLoading, navigate]);

  const verifyAuditChain = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await supabase.functions.invoke("audit-verify", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      setVerificationResult(response.data);
      setLastChecked(new Date());

      if (response.data.intact) {
        toast.success("Audit chain verified successfully");
      } else {
        toast.error("Audit chain integrity compromised!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify audit chain";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getStatusColor = () => {
    if (!verificationResult) return "secondary";
    return verificationResult.intact ? "default" : "destructive";
  };

  const getStatusIcon = () => {
    if (!verificationResult) return AlertTriangle;
    return verificationResult.intact ? CheckCircle2 : XCircle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Audit Chain Verification
          </h1>
          <p className="text-muted-foreground">
            Cryptographic verification of immutable audit log integrity
          </p>
        </div>

        {/* Status Overview Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chain Status</CardTitle>
              <StatusIcon className={`h-4 w-4 ${verificationResult?.intact ? "text-green-500" : "text-destructive"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {verificationResult?.intact ? "Intact" : verificationResult ? "Broken" : "Unknown"}
              </div>
              <p className="text-xs text-muted-foreground">
                {lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : "Not yet verified"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {verificationResult?.totalEntries ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">In audit chain</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {verificationResult?.verifiedEntries ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {verificationResult && verificationResult.totalEntries > 0
                  ? `${Math.round((verificationResult.verifiedEntries / verificationResult.totalEntries) * 100)}%`
                  : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <div className="mb-6">
          <Button
            onClick={verifyAuditChain}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Verifying..." : "Verify Now"}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verification Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {verificationResult && verificationResult.intact && !verificationResult.error && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-600 dark:text-green-400">Chain Integrity Verified</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              {verificationResult.message || "All audit entries have been cryptographically verified. No tampering detected."}
            </AlertDescription>
          </Alert>
        )}

        {/* Broken Chain Details */}
        {verificationResult && !verificationResult.intact && (
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    Audit Chain Integrity Compromised
                  </CardTitle>
                  <CardDescription>
                    Critical security alert - immediate investigation required
                  </CardDescription>
                </div>
                <Badge variant="destructive">Critical</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Error Details</p>
                  <Alert variant="destructive">
                    <AlertDescription>
                      {verificationResult.error || "Chain verification failed"}
                    </AlertDescription>
                  </Alert>
                </div>

                {verificationResult.brokenAtEntry && (
                  <div>
                    <p className="text-sm font-medium mb-2">Break Location</p>
                    <p className="text-sm">
                      Chain broken at entry ID: <code className="bg-muted px-2 py-1 rounded">{verificationResult.brokenAtEntry}</code>
                    </p>
                  </div>
                )}

                {verificationResult.details && (
                  <div>
                    <p className="text-sm font-medium mb-2">Hash Mismatch</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Expected:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                          {verificationResult.details.expected}
                        </code>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Actual:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                          {verificationResult.details.actual}
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Recommended Actions</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Investigate the audit_chain table for tampering</li>
                    <li>Review database access logs for unauthorized modifications</li>
                    <li>Check if RLS policies on audit_chain are properly enforced</li>
                    <li>Escalate to security team immediately</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historical Verification Runs */}
        <div className="mt-8">
          <AuditVerification />
        </div>

        {/* Information Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">About Audit Chain Verification</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              The audit chain uses cryptographic hashing (HMAC-SHA256) to create an immutable log of all security-relevant actions.
              Each entry contains a hash of the previous entry, making tampering detectable.
            </p>
            <p>
              <strong>How it works:</strong> Each audit entry includes a hash computed from its content and the previous entry's hash.
              If any entry is modified, the hash chain breaks and verification fails.
            </p>
            <p>
              <strong>Security guarantee:</strong> This verification ensures that audit logs cannot be retroactively modified without detection,
              meeting HIPAA's audit trail integrity requirements.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
