/**
 * P1 FIX: Full Weekly Audit Chain Verification
 * 
 * Runs weekly (Sundays 2 AM UTC) to do a complete chain verification.
 * Catches any cursor corruption or gaps missed by incremental scans.
 * 
 * SECURITY: Service role only (called by CI/CD cron)
 */

import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { safeLog, safeError } from "../_shared/phi-redactor.ts";

const cors = makeCors();

Deno.serve(cors.wrap(async (req) => {
  if (req.method !== "POST" && req.method !== "OPTIONS") {
    return cors.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    safeLog.info("Starting FULL weekly audit chain verification...");

    // Call the full weekly verification function (DB-side)
    const { error } = await supabase.rpc("verify_audit_chain_full_weekly");

    if (error) {
      safeLog.error("Full verification failed:", error);
      return cors.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Get summary of this week's verifications
    const { data: recentRuns, error: runsErr } = await supabase
      .from("audit_verify_runs")
      .select("*")
      .gte("run_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("run_at", { ascending: false });

    if (runsErr) {
      safeLog.warn("Failed to fetch recent runs:", runsErr);
    }

    const failedRuns = recentRuns?.filter(r => !r.intact) || [];
    const totalRuns = recentRuns?.length || 0;

    safeLog.info(`Weekly verification complete: ${totalRuns} total runs, ${failedRuns.length} failures`);

    return cors.json({
      ok: failedRuns.length === 0,
      summary: {
        total_runs: totalRuns,
        failed_runs: failedRuns.length,
        success_rate: totalRuns > 0 ? ((totalRuns - failedRuns.length) / totalRuns * 100).toFixed(2) + '%' : 'N/A',
      },
      failed_runs: failedRuns.map(r => ({
        run_at: r.run_at,
        broken_at_id: r.broken_at_id,
        details: r.details,
      })),
    });
  } catch (error) {
    const safe = safeError(error);
    safeLog.error("Full verification error:", safe);
    return cors.json({ ok: false, error: safe.message }, { status: 500 });
  }
}));
