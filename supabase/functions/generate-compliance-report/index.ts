import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { makeCors } from "../_shared/cors.ts";

const cors = makeCors();

interface ComplianceReportData {
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
    resourceTypes: number;
    actionTypes: number;
  }>;
  verificationHistory: Array<{
    runAt: string;
    intact: boolean;
    totalEntries: number;
    verifiedEntries: number;
    brokenAtId?: string;
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
}

serve(cors.wrap(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { 
      auth: { persistSession: false } 
    });

    // Verify authentication and admin role
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: user, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user?.user) throw new Error("Unauthorized");

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: user.user.id,
      _role: "admin"
    });
    
    if (roleErr || !isAdmin) {
      throw new Error("Insufficient permissions - admin role required");
    }

    // Parse request parameters
    const url = new URL(req.url);
    const startDate = url.searchParams.get("start_date") || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = url.searchParams.get("end_date") || 
      new Date().toISOString().split('T')[0];
    const reportType = url.searchParams.get("report_type") || "hipaa_audit_trail";

    // Fetch daily stats from materialized view
    const { data: dailyStats, error: statsErr } = await supabase
      .from("mv_audit_daily_stats")
      .select("*")
      .gte("day", startDate)
      .lte("day", endDate)
      .order("day", { ascending: false });

    if (statsErr) throw new Error(`Failed to fetch daily stats: ${statsErr.message}`);

    // Fetch verification history
    const { data: verificationHistory, error: verifyErr } = await supabase
      .from("audit_verify_runs")
      .select("*")
      .gte("run_at", startDate)
      .lte("run_at", endDate + "T23:59:59")
      .order("run_at", { ascending: false });

    if (verifyErr) throw new Error(`Failed to fetch verification history: ${verifyErr.message}`);

    // Fetch action and resource breakdowns
    const { data: actionBreakdown, error: actionErr } = await supabase.rpc(
      "get_audit_action_breakdown",
      { p_start_date: startDate, p_end_date: endDate }
    ).then(result => {
      // If RPC doesn't exist, fall back to direct query
      if (result.error?.code === '42883') {
        return supabase
          .from("audit_logs")
          .select("action")
          .gte("created_at", startDate)
          .lte("created_at", endDate + "T23:59:59");
      }
      return result;
    });

    const { data: resourceBreakdown, error: resourceErr } = await supabase.rpc(
      "get_audit_resource_breakdown",
      { p_start_date: startDate, p_end_date: endDate }
    ).then(result => {
      // If RPC doesn't exist, fall back to direct query
      if (result.error?.code === '42883') {
        return supabase
          .from("audit_logs")
          .select("resource_type")
          .gte("created_at", startDate)
          .lte("created_at", endDate + "T23:59:59");
      }
      return result;
    });

    // Calculate breakdowns manually if needed
    let actionCounts: Record<string, number> = {};
    let resourceCounts: Record<string, number> = {};
    
    if (actionBreakdown && Array.isArray(actionBreakdown)) {
      if (actionBreakdown.length > 0 && 'action' in actionBreakdown[0]) {
        // Raw data - need to count
        actionBreakdown.forEach((row: any) => {
          actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
        });
      } else {
        // Aggregated data from RPC
        actionBreakdown.forEach((row: any) => {
          actionCounts[row.action] = row.count;
        });
      }
    }

    if (resourceBreakdown && Array.isArray(resourceBreakdown)) {
      if (resourceBreakdown.length > 0 && 'resource_type' in resourceBreakdown[0]) {
        // Raw data - need to count
        resourceBreakdown.forEach((row: any) => {
          resourceCounts[row.resource_type] = (resourceCounts[row.resource_type] || 0) + 1;
        });
      } else {
        // Aggregated data from RPC
        resourceBreakdown.forEach((row: any) => {
          resourceCounts[row.resource_type] = row.count;
        });
      }
    }

    const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0);
    const totalResources = Object.values(resourceCounts).reduce((a, b) => a + b, 0);

    // Build report data
    const totalEntries = dailyStats?.reduce((sum, stat) => sum + (stat.total_entries || 0), 0) || 0;
    const uniqueUsers = Math.max(...(dailyStats?.map(s => s.unique_users || 0) || [0]));
    const failedVerifications = verificationHistory?.filter(v => !v.intact).length || 0;

    const reportData: ComplianceReportData = {
      summary: {
        startDate,
        endDate,
        totalAuditEntries: totalEntries,
        uniqueUsers,
        chainIntegrityChecks: verificationHistory?.length || 0,
        failedVerifications
      },
      dailyStats: (dailyStats || []).map(stat => ({
        day: stat.day,
        totalEntries: stat.total_entries || 0,
        uniqueUsers: stat.unique_users || 0,
        resourceTypes: stat.resource_types || 0,
        actionTypes: stat.action_types || 0
      })),
      verificationHistory: (verificationHistory || []).map(v => ({
        runAt: v.run_at,
        intact: v.intact,
        totalEntries: v.total_entries,
        verifiedEntries: v.verified_entries,
        brokenAtId: v.broken_at_id
      })),
      actionBreakdown: Object.entries(actionCounts).map(([action, count]) => ({
        action,
        count,
        percentage: totalActions > 0 ? Math.round((count / totalActions) * 100) : 0
      })).sort((a, b) => b.count - a.count),
      resourceBreakdown: Object.entries(resourceCounts).map(([resourceType, count]) => ({
        resourceType,
        count,
        percentage: totalResources > 0 ? Math.round((count / totalResources) * 100) : 0
      })).sort((a, b) => b.count - a.count),
      complianceStatus: {
        auditLogsImmutable: true, // Enforced by trigger
        chainIntegrityVerified: failedVerifications === 0,
        automatedMonitoring: (verificationHistory?.length || 0) > 0,
        retentionCompliant: totalEntries > 0
      }
    };

    // Store report in compliance_reports table
    const { data: reportRecord, error: insertErr } = await supabase
      .from("compliance_reports")
      .insert({
        generated_by: user.user.id,
        start_date: startDate,
        end_date: endDate,
        report_type: reportType,
        report_data: reportData
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to store report:", insertErr);
      // Continue even if storage fails
    }

    return cors.json({
      success: true,
      reportId: reportRecord?.id,
      data: reportData
    });

  } catch (e) {
    console.error("Error generating compliance report:", e);
    const errorMsg = e instanceof Error ? e.message : String(e);
    return cors.json({ 
      success: false,
      error: errorMsg 
    }, { status: 500 });
  }
}));
