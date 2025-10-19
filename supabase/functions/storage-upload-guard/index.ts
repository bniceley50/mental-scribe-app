import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ok, err } from "../_shared/http.ts";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = new Set(["application/pdf", "text/plain"]);

function isPdf(buf: Uint8Array) {
  const header = new TextDecoder().decode(buf.slice(0, 4));
  return header === "%PDF";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return ok(req, {});
  if (req.method !== "POST") return err(req, "Method not allowed", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const path = String(form.get("path") ?? "");
  if (!file || !path) return err(req, "Missing file/path", 400);
  if (file.size > MAX_SIZE) return err(req, "File too large", 413);

  const type = file.type || "application/octet-stream";
  if (!ALLOWED.has(type)) return err(req, "Invalid file type", 400);

  const buf = new Uint8Array(await file.arrayBuffer());
  if (type === "application/pdf" && !isPdf(buf)) return err(req, "Invalid PDF", 400);

  const { error } = await admin
    .storage
    .from("clinical-documents")
    .upload(path, buf, { contentType: type, upsert: false });

  if (error) return err(req, error.message, 400);

  return ok(req, { ok: true, path }, 200);
});
