// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: Consent-validated disclosures (Part 2 aware)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type UUID = string;

type DisclosurePayload = {
  consentId?: UUID; // Required if any resource is part2_protected
  conversationIds?: UUID[];
  noteIds?: UUID[]; // structured_notes
  fileIds?: UUID[]; // uploaded_files
};

type ResourceRow = {
  id: UUID;
  program_id: UUID | null;
  data_classification: "standard_phi" | "part2_protected";
  // ... (we don't need PHI content to disclose; client/export layer will format)
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// SECURITY FIX: Explicit default origin, reject requests without origin
const defaultOrigins = Deno.env.get("SUPABASE_URL") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("DISCLOSE_CORS_ORIGINS") ?? defaultOrigins)
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Feature flags (keep you safe during rollout)
const DISCLOSURE_GATE_ENABLED = (Deno.env.get("DISCLOSURE_GATE_ENABLED") ?? "true") === "true";

function allowCors(req: Request, res: Response) {
  const origin = req.headers.get("Origin") ?? "";
  // SECURITY FIX: Require origin header and match against allowed list
  const allow = origin && ALLOWED_ORIGINS.includes(origin);
  const hdrs = new Headers(res.headers);
  if (allow) {
    hdrs.set("Access-Control-Allow-Origin", origin);
    hdrs.set("Vary", "Origin");
    hdrs.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    hdrs.set("Access-Control-Allow-Headers", "authorization, content-type, x-disclosure-purpose");
    hdrs.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; object-src 'none';");
    hdrs.set("X-Content-Type-Options", "nosniff");
    hdrs.set("X-Frame-Options", "DENY");
  }
  return new Response(res.body, { status: res.status, headers: hdrs });
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function sanitizeErr(status: number, message: string) {
  return json(status, { error: message });
}

// Basic schema check (avoid external deps)
function parsePayload(obj: any): DisclosurePayload | null {
  if (typeof obj !== "object" || obj === null) return null;
  const p: DisclosurePayload = {};
  if (obj.consentId !== undefined && typeof obj.consentId === "string") p.consentId = obj.consentId;
  for (const key of ["conversationIds", "noteIds", "fileIds"] as const) {
    if (obj[key] !== undefined) {
      if (!Array.isArray(obj[key]) || !obj[key].every((v: any) => typeof v === "string")) return null;
      (p as any)[key] = obj[key];
    }
  }
  return p;
}

function getClientWithAuth(req: Request) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });
  return supabase;
}
function getAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

function getIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || (req as any).ip
      || undefined;
}

async function requireUser(req: Request) {
  const supabase = getClientWithAuth(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("AUTH_REQUIRED");
  return user;
}

// SECURITY FIX: Use database-backed rate limiting instead of in-memory
async function checkRateLimit(userId: string): Promise<boolean> {
  const admin = getAdmin();
  const { data, error } = await admin.rpc('check_rate_limit', {
    _user_id: userId,
    _endpoint: 'disclose',
    _max_requests: 10,
    _window_minutes: 1
  });
  
  if (error) {
    console.error('Rate limit check failed:', error);
    return false; // Fail closed
  }
  
  return data === true;
}

async function loadResources(req: Request, ids: DisclosurePayload) {
  const client = getClientWithAuth(req);

  const [convos, notes, files] = await Promise.all([
    (async () => {
      if (!ids.conversationIds?.length) return [] as ResourceRow[];
      const { data, error } = await client
        .from("conversations")
        .select("id, program_id, data_classification")
        .in("id", ids.conversationIds);
      if (error) throw new Error("LOAD_CONVERSATIONS_FAILED");
      return data as ResourceRow[];
    })(),
    (async () => {
      if (!ids.noteIds?.length) return [] as ResourceRow[];
      const { data, error } = await client
        .from("structured_notes")
        .select("id, program_id, data_classification")
        .in("id", ids.noteIds);
      if (error) throw new Error("LOAD_NOTES_FAILED");
      return data as ResourceRow[];
    })(),
    (async () => {
      if (!ids.fileIds?.length) return [] as ResourceRow[];
      const { data, error } = await client
        .from("uploaded_files")
        .select("id, program_id, data_classification")
        .in("id", ids.fileIds);
      if (error) throw new Error("LOAD_FILES_FAILED");
      return data as ResourceRow[];
    })(),
  ]);

  return { convos, notes, files };
}

type ConsentRow = {
  id: UUID;
  scope: Record<string, unknown>;
  valid_from: string;
  valid_until: string | null;
  revoked_at: string | null;
};

function idsCovered(scope: any, allIds: UUID[]) {
  // Supports scope like: { conversation_ids:[], note_ids:[], file_ids:[], program_id:"..." }
  if (!scope || typeof scope !== "object") return false;

  const byList = ["conversation_ids", "note_ids", "file_ids"].some((k) => {
    const arr = Array.isArray((scope as any)[k]) ? (scope as any)[k] as string[] : [];
    return allIds.every((id) => arr.includes(id));
  });

  return byList;
}

function programsCovered(scope: any, programs: (UUID | null)[]) {
  if (!scope || typeof scope !== "object") return false;
  const programId = (scope as any)["program_id"];
  if (typeof programId !== "string") return false;
  // All part2 rows must be from that program
  return programs.every((p) => p === programId);
}

function isWithinWindow(row: ConsentRow, now = new Date()) {
  const from = new Date(row.valid_from);
  const until = row.valid_until ? new Date(row.valid_until) : null;
  if (now < from) return false;
  if (until && now > until) return false;
  if (row.revoked_at) return false;
  return true;
}

// SECURITY FIX: Sanitize audit metadata before writing
async function writeAudit(
  admin: ReturnType<typeof getAdmin>,
  log: {
    user_id: string;
    action: "disclosure_denied" | "disclosure_export";
    resource_ids: UUID[];
    data_classification: "standard_phi" | "part2_protected";
    program_id: UUID | null;
    consent_id: UUID | null;
    purpose: string | null;
    ip: string | undefined;
    ua: string | null;
    meta?: Record<string, unknown>;
  },
) {
  // Sanitize metadata to remove sensitive keys
  const sanitizedMeta = log.meta ? 
    await admin.rpc('sanitize_audit_metadata', { meta: log.meta }).then(r => r.data || {}) :
    {};

  const { error } = await admin.from("audit_logs").insert([{
    user_id: log.user_id,
    action: log.action,
    resource_type: "mixed",
    resource_id: log.resource_ids,
    data_classification: log.data_classification,
    program_id: log.program_id,
    consent_id: log.consent_id,
    purpose: log.purpose,
    ip_address: log.ip,
    user_agent: log.ua,
    metadata: sanitizedMeta,
  }]);
  if (error) {
    // Sanitize: don't bubble details
    console.error("audit_insert_failed", { status: error.code });
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return allowCors(req, new Response(null, { status: 204 }));
  }

  try {
    if (req.method !== "POST") {
      return allowCors(req, sanitizeErr(405, "Method not allowed"));
    }

    // Auth
    const user = await requireUser(req);
    
    // SECURITY FIX: Use database-backed rate limiting
    const allowed = await checkRateLimit(user.id);
    if (!allowed) {
      return allowCors(req, sanitizeErr(429, "Too many requests"));
    }

    // Purpose header (optional but recommended)
    const purpose = (req.headers.get("x-disclosure-purpose") ?? "").toLowerCase() || null;

    // Parse
    const body = await req.json().catch(() => null);
    const payload = parsePayload(body);
    if (!payload) return allowCors(req, sanitizeErr(400, "Invalid payload"));

    const idsAll = [
      ...(payload.conversationIds ?? []),
      ...(payload.noteIds ?? []),
      ...(payload.fileIds ?? []),
    ];
    if (idsAll.length === 0) {
      return allowCors(req, sanitizeErr(400, "No resource IDs provided"));
    }

    // Load (RLS applies)
    const { convos, notes, files } = await loadResources(req, payload);
    const rows: ResourceRow[] = [...convos, ...notes, ...files];

    // Ensure caller actually has RLS access to all requested rows
    const fetchedIds = new Set(rows.map(r => r.id));
    const missing = idsAll.filter(id => !fetchedIds.has(id));
    if (missing.length) {
      return allowCors(req, sanitizeErr(403, "One or more resources are not accessible"));
    }

    // Determine classification & program set
    const anyPart2 = rows.some(r => r.data_classification === "part2_protected");
    const part2Programs = Array.from(new Set(rows
      .filter(r => r.data_classification === "part2_protected")
      .map(r => r.program_id)));

    // Consent validation if Part 2
    let consentRow: ConsentRow | null = null;
    const admin = getAdmin();

    if (DISCLOSURE_GATE_ENABLED && anyPart2) {
      if (!payload.consentId) {
        await writeAudit(admin, {
          user_id: user.id,
          action: "disclosure_denied",
          resource_ids: idsAll,
          data_classification: "part2_protected",
          program_id: part2Programs.length === 1 ? (part2Programs[0] ?? null) : null,
          consent_id: null,
          purpose,
          ip: getIp(req),
          ua: req.headers.get("user-agent"),
          meta: { reason: "missing_consent" },
        });
        return allowCors(req, sanitizeErr(403, "Valid consent required for Part 2 disclosures"));
      }

      const { data, error } = await admin
        .from("disclosure_consents")
        .select("id, scope, valid_from, valid_until, revoked_at")
        .eq("id", payload.consentId)
        .limit(1)
        .maybeSingle();

      if (error || !data || !isWithinWindow(data)) {
        await writeAudit(admin, {
          user_id: user.id,
          action: "disclosure_denied",
          resource_ids: idsAll,
          data_classification: "part2_protected",
          program_id: part2Programs.length === 1 ? (part2Programs[0] ?? null) : null,
          consent_id: payload.consentId ?? null,
          purpose,
          ip: getIp(req),
          ua: req.headers.get("user-agent"),
          meta: { reason: "invalid_or_expired_consent" },
        });
        return allowCors(req, sanitizeErr(403, "Consent is invalid, expired, or revoked"));
      }

      const allIds = idsAll;
      const allPrograms = rows.filter(r => r.data_classification === "part2_protected").map(r => r.program_id);
      const covered = idsCovered(data.scope, allIds) || programsCovered(data.scope, allPrograms);

      if (!covered) {
        await writeAudit(admin, {
          user_id: user.id,
          action: "disclosure_denied",
          resource_ids: idsAll,
          data_classification: "part2_protected",
          program_id: part2Programs.length === 1 ? (part2Programs[0] ?? null) : null,
          consent_id: payload.consentId ?? null,
          purpose,
          ip: getIp(req),
          ua: req.headers.get("user-agent"),
          meta: { reason: "scope_not_covered" },
        });
        return allowCors(req, sanitizeErr(403, "Consent scope does not cover requested records"));
      }

      consentRow = data;
    }

    // Audit ALLOWED export
    const overallClass: "standard_phi" | "part2_protected" = anyPart2 ? "part2_protected" : "standard_phi";
    await writeAudit(getAdmin(), {
      user_id: user.id,
      action: "disclosure_export",
      resource_ids: idsAll,
      data_classification: overallClass,
      program_id: part2Programs.length === 1 ? (part2Programs[0] ?? null) : null,
      consent_id: consentRow?.id ?? null,
      purpose,
      ip: getIp(req),
      ua: req.headers.get("user-agent"),
      meta: {
        counts: { conversations: (payload.conversationIds ?? []).length, notes: (payload.noteIds ?? []).length, files: (payload.fileIds ?? []).length },
      },
    });

    // Return a neutral export payload (no PHI content here).
    // Your frontend/exporter can fetch/format content client-side or you can generate server-side files.
    return allowCors(req, json(200, {
      ok: true,
      classification: overallClass,
      ids: {
        conversations: payload.conversationIds ?? [],
        notes: payload.noteIds ?? [],
        files: payload.fileIds ?? [],
      },
      // Optionally: include minimal metadata needed to drive an export UI flow
    }));
  } catch (e) {
    if ((e as Error).message === "AUTH_REQUIRED") {
      return allowCors(req, sanitizeErr(401, "Unauthorized"));
    }
    // Sanitized server log
    console.error("disclose_unhandled", { msg: (e as Error).message });
    return allowCors(req, sanitizeErr(500, "Unexpected error"));
  }
});
