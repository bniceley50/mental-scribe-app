import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ok, err } from "../_shared/http.ts";

async function sha1Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function isPasswordLeaked(pw: string) {
  const hex = await sha1Hex(pw);
  const prefix = hex.slice(0, 5);
  const suffix = hex.slice(5);
  const r = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  if (!r.ok) return true; // fail-closed
  return (await r.text()).split("\n").some((line) => line.startsWith(suffix));
}

function strong(pw: string) {
  return typeof pw === "string"
    && pw.length >= 12
    && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return ok(req, {});
  if (req.method !== "POST") return err(req, "Method not allowed", 405);

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return err(req, "Unauthorized", 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE);
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });

  const { data: userRes } = await userClient.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return err(req, "Invalid session", 401);

  const { newPassword } = await req.json().catch(() => ({}));
  if (!strong(newPassword)) {
    try { await admin.from("password_reset_attempts").insert({ user_id: uid, ok: false }); } catch { /* ignore logging failure */ }
    return err(req, "Weak password (min 12 + upper/lower/number/special).", 400);
  }

  const { data: okRL } = await admin.rpc("check_password_reset_rate_limit", {
    _user_id: uid, _max_requests: 5, _window_minutes: 15,
  });
  if (!okRL) {
    try { await admin.from("password_reset_attempts").insert({ user_id: uid, ok: false }); } catch { /* ignore logging failure */ }
    return err(req, "Too many attempts", 429);
  }

  if (await isPasswordLeaked(newPassword)) {
    try { await admin.from("password_reset_attempts").insert({ user_id: uid, ok: false }); } catch { /* ignore logging failure */ }
    return err(req, "Password appears in breach data.", 400);
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(uid, { password: newPassword });
  if (updErr) {
    try { await admin.from("password_reset_attempts").insert({ user_id: uid, ok: false }); } catch { /* ignore logging failure */ }
    return err(req, "Password update failed", 500);
  }

  try { await admin.auth.admin.signOut(uid); } catch { /* ignore session revoke failure */ }
  try { await admin.from("password_reset_attempts").insert({ user_id: uid, ok: true }); } catch { /* ignore logging failure */ }
  return ok(req, { ok: true });
});
