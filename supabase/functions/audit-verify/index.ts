// supabase/functions/audit-verify/index.ts
import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const cors = makeCors();

Deno.serve(cors.wrap(async (req) => {
  if (!["GET", "POST", "OPTIONS"].includes(req.method)) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // ---- Admin auth check ----
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return cors.json({ ok: false, error: "Missing bearer" }, { status: 401 });
  }
  
  const token = auth.replace(/^Bearer\s+/i, "");
  const { data: who } = await supabase.auth.getUser(token);
  if (!who?.user?.id) {
    return cors.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", {
    _user_id: who.user.id
  });
  
  if (adminErr) {
    return cors.json({ ok: false, error: adminErr.message }, { status: 500 });
  }
  if (!isAdmin) {
    return cors.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Optional filter: ?user_id=... to verify single user, or run all
  const params = new URL(req.url).searchParams;
  const userId = params.get("user_id");

  if (userId) {
    // Single user incremental verification
    const { data, error } = await supabase.rpc("verify_audit_chain_incremental", {
      p_user_id: userId
    });
    
    if (error) {
      return cors.json({ ok: false, error: error.message }, { status: 500 });
    }
    
    return cors.json({ ok: true, result: data });
  } else {
    // Admin manual kick: run incremental for all users
    const { error } = await supabase.rpc("run_incremental_for_all_users");
    
    if (error) {
      return cors.json({ ok: false, error: error.message }, { status: 500 });
    }
    
    return cors.json({ ok: true, kicked: true });
  }
}));
