import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { makeCors } from "../_shared/cors.ts";
import { Counter, Histogram, Gauge, startTimer } from "../_shared/metrics.ts";

const cors = makeCors();

const verifyRequestsTotal = new Counter("audit_verify_requests_total");
const verifyDuration = new Histogram("audit_verify_duration_seconds");
const chainIntegrityStatus = new Gauge("audit_chain_integrity");
const entriesVerified = new Gauge("audit_entries_verified");

interface VerifyResult {
  intact: boolean
  totalEntries: number
  verifiedEntries: number
  error?: string
  brokenAtEntry?: string
  details?: {
    expected: string
    actual: string
  }
}

serve(cors.wrap(async (req) => {
  const end = startTimer();
  verifyRequestsTotal.inc();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: user, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user?.user) throw new Error("Unauthorized");

    // Check admin role using has_role function
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: user.user.id,
      _role: "admin"
    });
    
    if (roleErr || !isAdmin) throw new Error("Insufficient permissions - admin role required");

    // Call DB-side verifier function
    const { data: verifyResult, error: verifyErr } = await supabase.rpc("verify_audit_chain");
    
    if (verifyErr) {
      throw new Error(`Verification failed: ${verifyErr.message}`);
    }

    // DB function returns array with single result row
    const result = Array.isArray(verifyResult) ? verifyResult[0] : verifyResult;
    
    if (!result) {
      throw new Error("No verification result returned");
    }

    // Update metrics
    chainIntegrityStatus.set(result.intact ? 1 : 0);
    entriesVerified.set(result.verified_entries || 0);
    verifyDuration.observe(end());
    
    // Return formatted result
    const response: VerifyResult = {
      intact: result.intact,
      totalEntries: result.total_entries,
      verifiedEntries: result.verified_entries
    };

    if (!result.intact && result.broken_at_id) {
      response.brokenAtEntry = result.broken_at_id;
      response.details = {
        expected: result.expected || '',
        actual: result.actual || ''
      };
      response.error = `Chain broken at entry ${result.broken_at_id}`;
    }

    return cors.json(response);

  } catch (e) {
    verifyDuration.observe(end());
    chainIntegrityStatus.set(0);
    const errorMsg = e instanceof Error ? e.message : String(e);
    return cors.json({ 
      intact: false, 
      totalEntries: 0, 
      verifiedEntries: 0, 
      error: errorMsg 
    } as VerifyResult, { status: 500 });
  }
}));
