import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Users,
  Shield,
  Activity
} from "lucide-react";
import { format } from "date-fns";

interface ComplianceReport {
  id: string;
  generated_by: string;
  start_date: string;
  end_date: string;
  report_type: string;
  report_data: {
    summary: {
      startDate: string;
      endDate: string;
      totalAuditEntries: number;
      uniqueUsers: number;
      chainIntegrityChecks: number;
      failedVerifications: number;
    };
    dailyStats: Array<{
      day: string;
      totalEntries: number;
      uniqueUsers: number;
    }>;
    verificationHistory: Array<{
      runAt: string;
      intact: boolean;
    }>;
    actionBreakdown: Array<{
      action: string;
      count: number;
      percentage: number;
    }>;
    resourceBreakdown: Array<{
      resourceType: string;
      count: number;
      percentage: number;
    }>;
    complianceStatus: {
      auditLogsImmutable: boolean;
      chainIntegrityVerified: boolean;
      automatedMonitoring: boolean;
      retentionCompliant: boolean;
    };
  };
  created_at: string;
}

export default function ComplianceReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);

  // Fetch existing reports
  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["compliance-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as ComplianceReport[];
    }
  });

  // Generate new report
  const generateReport = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("generate-compliance-report", {
        body: { start_date: startDate, end_date: endDate },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: "Compliance report created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["compliance-reports"] });
      if (data.data) {
        // Create a temporary report object to display
        setSelectedReport({
          id: data.reportId || "temp",
          generated_by: "current_user",
          start_date: startDate,
          end_date: endDate,
          report_type: "hipaa_audit_trail",
          report_data: data.data,
          created_at: new Date().toISOString()
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message
      });
    }
  });

  const downloadReport = (report: ComplianceReport) => {
    const blob = new Blob([JSON.stringify(report.report_data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${report.start_date}-to-${report.end_date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ComplianceStatusBadge = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
      {status ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-destructive" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">HIPAA Compliance Reports</h1>
          <p className="text-muted-foreground">
            Generate and review audit trail compliance reports for regulatory requirements
          </p>
        </div>

        {/* Generate New Report */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Report</CardTitle>
            <CardDescription>
              Create a comprehensive audit trail report for a specific date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => generateReport.mutate()}
                  disabled={generateReport.isPending}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {generateReport.isPending ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Report Details */}
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Report Details</h2>
              <Button onClick={() => downloadReport(selectedReport)} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Audit Entries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {selectedReport.report_data.summary.totalAuditEntries.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unique Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {selectedReport.report_data.summary.uniqueUsers}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Integrity Checks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {selectedReport.report_data.summary.chainIntegrityChecks}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Failed Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {selectedReport.report_data.summary.failedVerifications === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className="text-2xl font-bold">
                      {selectedReport.report_data.summary.failedVerifications}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>
                  HIPAA audit control requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ComplianceStatusBadge 
                    status={selectedReport.report_data.complianceStatus.auditLogsImmutable}
                    label="Audit Logs Immutable"
                  />
                  <ComplianceStatusBadge 
                    status={selectedReport.report_data.complianceStatus.chainIntegrityVerified}
                    label="Chain Integrity Verified"
                  />
                  <ComplianceStatusBadge 
                    status={selectedReport.report_data.complianceStatus.automatedMonitoring}
                    label="Automated Monitoring Active"
                  />
                  <ComplianceStatusBadge 
                    status={selectedReport.report_data.complianceStatus.retentionCompliant}
                    label="Retention Compliant"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Action Breakdown</CardTitle>
                <CardDescription>
                  Distribution of audit actions during reporting period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedReport.report_data.actionBreakdown.slice(0, 10).map((action) => (
                    <div key={action.action} className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="font-medium">{action.action}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{action.count}</span>
                        <span className="text-sm font-medium">{action.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resource Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Breakdown</CardTitle>
                <CardDescription>
                  Distribution of resource access during reporting period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedReport.report_data.resourceBreakdown.slice(0, 10).map((resource) => (
                    <div key={resource.resourceType} className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="font-medium">{resource.resourceType}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{resource.count}</span>
                        <span className="text-sm font-medium">{resource.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>
              Previously generated compliance reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReports ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(report.start_date), "MMM d, yyyy")} - {format(new Date(report.end_date), "MMM d, yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Generated {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadReport(report);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No compliance reports generated yet. Create your first report above.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
