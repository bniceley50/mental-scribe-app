// supabase/functions/audit-verify/index.ts
import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const cors = makeCors();

Deno.serve(cors.wrap(async (req) => {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "OPTIONS") {
    return cors.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service-role only
    { auth: { persistSession: false } }
  );

  // ---- Admin auth check (no secrets to client) ----
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return cors.json({ ok: false, error: "Missing bearer token" }, { status: 401 });
  }
  
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: who, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !who?.user?.id) {
    return cors.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // P0 FIX: Check admin using dedicated is_admin() function (read-only membership check)
  const { data: isAdmin, error: roleErr } = await supabase.rpc("is_admin", {
    uid: who.user.id
  });
  
  if (roleErr || !isAdmin) {
    return cors.json({ ok: false, error: "Forbidden - admin role required" }, { status: 403 });
  }

  // Optional filter: ?user_id=... to verify a single user chain
  const userId = new URL(req.url).searchParams.get("user_id");

  // ---- Call DB-side verifier (SECURITY DEFINER, service role) ----
  const { data: result, error } = await supabase.rpc("verify_audit_chain", {
    p_user_id: userId || null,
  });
  
  if (error) {
    console.error("Verification RPC error:", error);
    return cors.json({ ok: false, error: error.message }, { status: 500 });
  }

  // ---- Best-effort logging ----
  try {
    const row = Array.isArray(result) ? result[0] : result;
    
    await supabase.from("audit_verify_runs").insert({
      intact: row?.intact ?? false,
      total_entries: row?.total_entries ?? 0,
      verified_entries: row?.verified_entries ?? 0,
      broken_at_id: row?.broken_at_id ?? null,
      details: {
        expected: row?.expected ?? null,
        actual: row?.actual ?? null,
        user_id: userId ?? null,
        source: "edge"
      },
    });
  } catch (logErr) {
    // Best-effort logging
    console.error("Failed to log verification run:", logErr);
  }

  return cors.json({ ok: true, result });
}));
