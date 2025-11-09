import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { makeCors } from "../_shared/cors.ts";
import { Counter, Histogram, Gauge, startTimer } from "../_shared/metrics.ts";

const cors = makeCors();

const verifyRequestsTotal = new Counter("audit_verify_requests_total");
const verifyDuration = new Histogram("audit_verify_duration_seconds");
const chainIntegrityStatus = new Gauge("audit_chain_integrity");
const entriesVerified = new Gauge("audit_entries_verified");

interface AuditEntry {
  id: number
  timestamp: string
  actor_id: string | null
  action: string
  resource: string
  resource_id: string | null
  details: Record<string, unknown>
  prev_hash: string | null
  hash: string
}

interface VerifyResult {
  intact: boolean
  totalEntries: number
  verifiedEntries: number
  error?: string
  brokenAtEntry?: number
  details?: {
    expected: string
    actual: string
  }
}

async function computeHash(
  prevHash: string,
  actorId: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  details: Record<string, unknown>,
  timestamp: string,
  secret: string,
): Promise<string> {
  const payload = `${prevHash}${actorId ?? "null"}${action}${resource}${resourceId ?? "null"}${JSON.stringify(details)}${timestamp}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(cors.wrap(async (req) => {
  const end = startTimer();
  verifyRequestsTotal.inc();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auditSecret = Deno.env.get("AUDIT_SECRET") || "default-audit-secret-CHANGE";
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: user, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: roleRow, error: roleErr } = await supabase.from("users").select("role").eq("id", user.user?.id).single();
    if (roleErr || roleRow?.role !== "admin") throw new Error("Insufficient permissions");

    const { data: entries, error: fetchErr } = await supabase.from("audit_chain").select("*").order("id", { ascending: true });
    if (fetchErr) throw fetchErr;

    if (!entries || entries.length === 0) {
      chainIntegrityStatus.set(1);
      entriesVerified.set(0);
      verifyDuration.observe(end());
      return cors.json({ intact: true, totalEntries: 0, verifiedEntries: 0, message: "No audit entries to verify" } as VerifyResult);
    }

    let verified = 0;
    let prev = "";
    for (const e of entries as AuditEntry[]) {
      if ((e.prev_hash ?? "") !== prev) {
        chainIntegrityStatus.set(0);
        entriesVerified.set(verified);
        verifyDuration.observe(end());
        return cors.json({ intact: false, totalEntries: entries.length, verifiedEntries: verified,
          error: "Chain broken: prev_hash mismatch", brokenAtEntry: e.id,
          details: { expected: prev, actual: e.prev_hash ?? "null" } } as VerifyResult);
      }
      const expected = await computeHash(e.prev_hash ?? "", e.actor_id, e.action, e.resource, e.resource_id, e.details, e.timestamp, auditSecret);
      if (expected !== e.hash) {
        chainIntegrityStatus.set(0);
        entriesVerified.set(verified);
        verifyDuration.observe(end());
        return cors.json({ intact: false, totalEntries: entries.length, verifiedEntries: verified,
          error: "Chain broken: hash mismatch", brokenAtEntry: e.id,
          details: { expected, actual: e.hash } } as VerifyResult);
      }
      verified++; prev = e.hash;
    }

    chainIntegrityStatus.set(1);
    entriesVerified.set(verified);
    verifyDuration.observe(end());
    return cors.json({ intact: true, totalEntries: entries.length, verifiedEntries: verified } as VerifyResult);

  } catch (e) {
    verifyDuration.observe(end());
    const errorMsg = e instanceof Error ? e.message : String(e);
    return cors.json({ intact: false, totalEntries: 0, verifiedEntries: 0, error: errorMsg } as VerifyResult, { status: 500 });
  }
}));
