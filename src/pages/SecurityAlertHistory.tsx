import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Eye, FileText, Filter, Loader2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

interface AlertWithAcknowledgment {
  id: number;
  run_at: string;
  intact: boolean;
  broken_at_id: string | null;
  verified_entries: number;
  total_entries: number;
  details: any;
  acknowledgment?: {
    id: string;
    acknowledged_by: string;
    acknowledged_at: string;
    status: string;
    resolution_notes: string | null;
    resolved_at: string | null;
  };
}

export default function SecurityAlertHistory() {
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertWithAcknowledgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertWithAcknowledgment | null>(null);
  const [showAckDialog, setShowAckDialog] = useState(false);
  const [ackStatus, setAckStatus] = useState<string>("acknowledged");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin role required",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (isAdmin) {
      fetchAlerts();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);

      // Fetch all broken chain alerts
      const { data: alertData, error: alertError } = await supabase
        .from("audit_verify_runs")
        .select("*")
        .eq("intact", false)
        .order("run_at", { ascending: false });

      if (alertError) throw alertError;

      // Fetch acknowledgments for these alerts
      const { data: ackData, error: ackError } = await supabase
        .from("security_alert_acknowledgments")
        .select("*")
        .order("acknowledged_at", { ascending: false });

      if (ackError) throw ackError;

      // Merge alerts with their acknowledgments
      const mergedData = alertData.map((alert) => {
        const acknowledgment = ackData?.find((ack) => ack.alert_id === alert.id);
        return {
          ...alert,
          acknowledgment: acknowledgment || undefined,
        };
      });

      setAlerts(mergedData);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      toast({
        title: "Error",
        description: "Failed to load alert history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("security_alert_acknowledgments")
        .insert({
          alert_id: selectedAlert.id,
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
          status: ackStatus,
          resolution_notes: resolutionNotes || null,
          resolved_at: ackStatus === "resolved" || ackStatus === "false_positive" ? new Date().toISOString() : null,
        });

      if (error) throw error;

      toast({
        title: "Alert Acknowledged",
        description: "Security alert has been acknowledged successfully",
      });

      setShowAckDialog(false);
      setSelectedAlert(null);
      setResolutionNotes("");
      setAckStatus("acknowledged");
      fetchAlerts();
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openAckDialog = (alert: AlertWithAcknowledgment) => {
    setSelectedAlert(alert);
    setAckStatus(alert.acknowledgment?.status || "acknowledged");
    setResolutionNotes(alert.acknowledgment?.resolution_notes || "");
    setShowAckDialog(true);
  };

  const getStatusBadge = (alert: AlertWithAcknowledgment) => {
    if (!alert.acknowledgment) {
      return <Badge variant="destructive">Unacknowledged</Badge>;
    }

    switch (alert.acknowledgment.status) {
      case "acknowledged":
        return <Badge variant="secondary">Acknowledged</Badge>;
      case "investigating":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Investigating</Badge>;
      case "resolved":
        return <Badge variant="default" className="bg-green-500">Resolved</Badge>;
      case "false_positive":
        return <Badge variant="outline">False Positive</Badge>;
      default:
        return <Badge variant="secondary">{alert.acknowledgment.status}</Badge>;
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "unacknowledged") return !alert.acknowledgment;
    return alert.acknowledgment?.status === statusFilter;
  });

  if (adminLoading || !isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Security Alert History
            </h1>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-muted-foreground">
            Complete audit trail of security alert acknowledgments for compliance reporting
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit Chain Breach History</CardTitle>
            <CardDescription>
              All detected audit chain integrity breaches with acknowledgment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <p className="text-lg font-medium">No alerts found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {statusFilter === "all"
                    ? "No security alerts have been detected"
                    : `No alerts with status: ${statusFilter}`}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Detected</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification Stats</TableHead>
                      <TableHead>Break Location</TableHead>
                      <TableHead>Acknowledged By</TableHead>
                      <TableHead>Acknowledged At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">
                          {format(new Date(alert.run_at), "MMM d, yyyy HH:mm")}
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.run_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(alert)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm">
                              {alert.verified_entries} / {alert.total_entries}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {alert.broken_at_id ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {alert.broken_at_id.slice(0, 8)}...
                            </code>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {alert.acknowledgment ? (
                            <span className="text-sm">Admin User</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {alert.acknowledgment ? (
                            <div>
                              <div className="text-sm">
                                {format(new Date(alert.acknowledgment.acknowledged_at), "MMM d, yyyy HH:mm")}
                              </div>
                              {alert.acknowledgment.resolved_at && (
                                <div className="text-xs text-muted-foreground">
                                  Resolved: {format(new Date(alert.acknowledgment.resolved_at), "MMM d, yyyy")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAckDialog(alert)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {alert.acknowledgment ? "View" : "Acknowledge"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acknowledgment Dialog */}
        <Dialog open={showAckDialog} onOpenChange={setShowAckDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAlert?.acknowledgment ? "Alert Details" : "Acknowledge Security Alert"}
              </DialogTitle>
              <DialogDescription>
                {selectedAlert?.acknowledgment
                  ? "View or update acknowledgment details"
                  : "Record your acknowledgment and resolution notes"}
              </DialogDescription>
            </DialogHeader>

            {selectedAlert && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Detected</p>
                    <p className="text-sm">{format(new Date(selectedAlert.run_at), "PPpp")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Verification</p>
                    <p className="text-sm">
                      {selectedAlert.verified_entries} / {selectedAlert.total_entries} entries
                    </p>
                  </div>
                  {selectedAlert.broken_at_id && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Break Location</p>
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {selectedAlert.broken_at_id}
                      </code>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={ackStatus}
                    onValueChange={setAckStatus}
                    disabled={!!selectedAlert.acknowledgment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="false_positive">False Positive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter investigation findings, resolution steps, or false positive justification..."
                    rows={5}
                    disabled={!!selectedAlert.acknowledgment}
                  />
                </div>

                {selectedAlert.acknowledgment && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Acknowledgment History</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Acknowledged:</span>{" "}
                        {format(new Date(selectedAlert.acknowledgment.acknowledged_at), "PPpp")}
                      </div>
                      {selectedAlert.acknowledgment.resolved_at && (
                        <div>
                          <span className="text-muted-foreground">Resolved:</span>{" "}
                          {format(new Date(selectedAlert.acknowledgment.resolved_at), "PPpp")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAckDialog(false)}>
                {selectedAlert?.acknowledgment ? "Close" : "Cancel"}
              </Button>
              {!selectedAlert?.acknowledgment && (
                <Button onClick={handleAcknowledge} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Acknowledge Alert
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
