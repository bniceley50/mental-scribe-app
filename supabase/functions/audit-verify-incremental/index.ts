/**
 * P0 FIX: Incremental Audit Chain Verification
 * 
 * Runs hourly to verify only new audit entries since last cursor.
 * Much faster than full scan for large audit logs.
 * 
 * SECURITY FIX (SEC-HIGH-001): 
 * - Requires AUDIT_CRON_SECRET header for authentication
 * - Called by CI/CD cron jobs only
 * - Returns 403 if secret missing or invalid
 */

import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { safeLog, safeError } from "../_shared/phi-redactor.ts";

const cors = makeCors();
const AUDIT_CRON_SECRET = Deno.env.get("AUDIT_CRON_SECRET");

Deno.serve(cors.wrap(async (req) => {
  if (req.method !== "POST" && req.method !== "OPTIONS") {
    return cors.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  }

  // SEC-HIGH-001: Validate shared secret for cron authentication
  const providedSecret = req.headers.get("x-audit-secret");
  if (!AUDIT_CRON_SECRET || !providedSecret || providedSecret !== AUDIT_CRON_SECRET) {
    safeLog.warn("Unauthorized audit verification attempt", { 
      hasSecret: !!providedSecret,
      secretConfigured: !!AUDIT_CRON_SECRET 
    });
    return cors.json({ 
      ok: false, 
      error: "Unauthorized: Invalid or missing x-audit-secret header" 
    }, { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // Get all distinct users with audit logs
    const { data: users, error: usersErr } = await supabase
      .from("audit_logs")
      .select("user_id")
      .not("user_id", "is", null);

    if (usersErr) {
      safeLog.error("Failed to fetch users:", usersErr);
      return cors.json({ ok: false, error: "Failed to fetch users" }, { status: 500 });
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(users.map(u => u.user_id))];
    safeLog.info(`Verifying audit chains for ${uniqueUserIds.length} users (incremental)`);

    const results = [];
    let totalVerified = 0;
    let totalFailed = 0;

    // Verify each user's chain incrementally
    for (const userId of uniqueUserIds) {
      const { data: result, error } = await supabase.rpc("verify_audit_chain_incremental", {
        p_user_id: userId
      });

      if (error) {
        safeLog.error(`Verification failed for user ${userId}:`, error);
        totalFailed++;
        results.push({
          user_id: userId,
          intact: false,
          error: error.message,
        });
        continue;
      }

      const row = Array.isArray(result) ? result[0] : result;
      
      if (!row?.intact) {
        safeLog.error(`CHAIN BREAK detected for user ${userId}:`, {
          broken_at_id: row?.broken_at_id,
          expected: row?.expected,
          actual: row?.actual,
        });
        totalFailed++;
      } else {
        totalVerified += row?.verified_entries || 0;
      }

      results.push({
        user_id: userId,
        intact: row?.intact,
        verified_entries: row?.verified_entries,
        broken_at_id: row?.broken_at_id,
      });

      // Log to audit_verify_runs
      await supabase.from("audit_verify_runs").insert({
        intact: row?.intact ?? false,
        total_entries: row?.verified_entries || 0,
        verified_entries: row?.verified_entries || 0,
        broken_at_id: row?.broken_at_id || null,
        details: {
          type: "incremental",
          user_id: userId,
          expected: row?.expected || null,
          actual: row?.actual || null,
          source: "cron",
        },
      });
    }

    safeLog.info(`Incremental verification complete: ${totalVerified} entries verified, ${totalFailed} failures`);

    return cors.json({
      ok: totalFailed === 0,
      summary: {
        users_checked: uniqueUserIds.length,
        total_verified: totalVerified,
        failures: totalFailed,
      },
      results,
    });
  } catch (error) {
    const safe = safeError(error);
    safeLog.error("Incremental verification error:", safe);
    return cors.json({ ok: false, error: safe.message }, { status: 500 });
  }
}));
