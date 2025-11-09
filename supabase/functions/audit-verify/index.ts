// supabase/functions/audit-verify/index.ts
import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const cors = makeCors();

Deno.serve(cors.wrap(async (req) => {
  if (!["GET", "POST", "OPTIONS"].includes(req.method)) {
    return cors.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // ---- Admin auth check ----
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return cors.json({ ok: false, error: "Missing bearer token" }, { status: 401 });
  }
  
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: who, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !who?.user?.id) {
    return cors.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: isAdmin, error: roleErr } = await supabase.rpc("is_admin", {
    uid: who.user.id
  });
  
  if (roleErr || !isAdmin) {
    return cors.json({ ok: false, error: "Forbidden - admin role required" }, { status: 403 });
  }

  // Optional filter: ?user_id=... to verify a single user, or run all
  const userId = new URL(req.url).searchParams.get("user_id");
  let result;

  if (userId) {
    // Single user incremental verification
    const { data, error } = await supabase.rpc("verify_audit_chain_incremental", {
      p_user_id: userId
    });
    
    if (error) {
      console.error("Incremental verification error:", error);
      return cors.json({ ok: false, error: error.message }, { status: 500 });
    }
    
    result = data;
  } else {
    // Admin manual kick: run incremental for all users
    const { error } = await supabase.rpc("run_incremental_for_all_users");
    
    if (error) {
      console.error("Bulk verification error:", error);
      return cors.json({ ok: false, error: error.message }, { status: 500 });
    }
    
    result = { kicked: true };
  }

  return cors.json({ ok: true, result });
}));
