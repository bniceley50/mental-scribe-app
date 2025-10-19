import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ok, err } from "../_shared/http.ts";
import { redactPHI } from "../_shared/phi-redactor.ts";

const BAA_SIGNED = (Deno.env.get("BAA_SIGNED") ?? "false").toLowerCase() === "true";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MODEL = Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-4o-mini";

type AnalysisRequest = {
  noteText?: string;
  prompt?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return ok(req, {});
  if (req.method !== "POST") return err(req, "Method not allowed", 405);

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return err(req, "Unauthorized", 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user?.id) return err(req, "Invalid session", 401);

  let body: AnalysisRequest;
  try {
    body = await req.json();
  } catch {
    return err(req, "Invalid JSON body", 400);
  }

  const noteText = (body.noteText ?? "").trim();
  if (!noteText) return err(req, "noteText is required", 400);

  const prompt =
    (body.prompt ?? "Provide a concise clinical summary that avoids PHI unless the BAA is signed.")
      .toString()
      .trim();

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { data: okRL } = await admin.rpc("check_ai_rate_limit", {
      _user_id: userRes.user.id,
      _endpoint: "analyze-clinical-notes",
      _max_requests: 10,
      _window_minutes: 1,
    });
    if (okRL === false) return err(req, "Too many requests", 429);
  } catch {
    // rate limit infrastructure optional; ignore failures
  }

  const { redacted, hadPHI } = redactPHI(noteText);
  const payload = BAA_SIGNED ? noteText : redacted;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a clinical documentation assistant. Provide structured insights suitable for charting. Do not include direct identifiers unless explicitly instructed and allowed.",
        },
        {
          role: "user",
          content: `${prompt}\n\n---\n${payload}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "OpenAI call failed");
    return err(req, `OpenAI error (${response.status}): ${text}`, 502);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content ?? "";

  try {
    await admin.from("audit_logs").insert({
      actor_user_id: userRes.user.id,
      action: "ai_analyze_notes",
      resource: "clinical_notes",
      success: true,
      metadata: { hadPHI, redactionApplied: !BAA_SIGNED && hadPHI, model: MODEL },
    });
  } catch {
    // auditing optional; failures should not break the response
  }

  return ok(req, {
    analysis: content,
    redactionApplied: !BAA_SIGNED && hadPHI,
    model: MODEL,
  });
});
