// Admin-gated audit verifier — incremental per user or all users
import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const cors = makeCors("GET,POST,OPTIONS");

Deno.serve(cors.wrap(async (req) => {
  if (!["GET","POST","OPTIONS"].includes(req.method)) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Bearer user token required
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return cors.json({ ok: false, error: "Missing bearer token" }, { status: 401 });
  }
  const token = auth.replace(/^Bearer\s+/i, "");
  const who = await supabase.auth.getUser(token);
  if (who.error || !who.data?.user?.id) {
    return cors.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = who.data.user.id;
  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", { _user_id: uid });
  if (adminErr) return cors.json({ ok: false, error: adminErr.message }, { status: 500 });
  if (!isAdmin) return cors.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // Optional user_id query param to verify one user incrementally
  const params = new URL(req.url).searchParams;
  const userId = params.get("user_id");

  if (userId) {
    const { data, error } = await supabase.rpc("verify_audit_chain_incremental", { p_user_id: userId });
    if (error) return cors.json({ ok: false, error: error.message }, { status: 500 });
    return cors.json({ ok: true, result: data });
  }

  // Otherwise, kick the hourly batch ad-hoc from UI
  const { error } = await supabase.rpc("run_incremental_for_all_users");
  if (error) return cors.json({ ok: false, error: error.message }, { status: 500 });
  return cors.json({ ok: true, kicked: true, ts: new Date().toISOString() });
}));
