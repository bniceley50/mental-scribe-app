import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { redactPHI } from "../_shared/phi-redactor.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BAA_SIGNED = (Deno.env.get("BAA_SIGNED") ?? "false").toLowerCase() === "true";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MODEL = Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-4o-mini";

type AnalysisRequest = {
  notes?: string;
  action?: string;
  conversation_history?: Array<{ role: string; content: string }>;
};

Deno.serve(async (req) => {
  console.log("[ENTRY] analyze-clinical-notes called", { method: req.method });
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    
    if (userErr || !user?.id) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: AnalysisRequest = await req.json();
    const noteText = (body.notes ?? "").trim();
    
    console.log("[BODY] Received:", {
      action: body.action,
      notesLength: noteText.length,
      hasHistory: !!body.conversation_history?.length,
    });
    
    if (!noteText) {
      return new Response(JSON.stringify({ error: "notes is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const action = body.action ?? "clinical_summary";

    // Build prompt based on action type
    let systemPrompt = "You are a clinical documentation assistant providing structured insights.";
    let userPrompt = noteText;

    if (action === "medical_entities") {
      systemPrompt = "Extract medical entities from clinical notes. Return ONLY valid JSON with this structure: {\"diagnoses\":[],\"medications\":[],\"symptoms\":[],\"procedures\":[],\"vitals\":[],\"risk_factors\":[],\"mental_status\":{\"mood\":\"\",\"affect\":\"\",\"thought_process\":\"\",\"orientation\":\"\"},\"clinical_concerns\":[]}";
      userPrompt = `Extract all medical entities from these clinical notes:\n\n${noteText}`;
    } else if (action === "clinical_summary") {
      systemPrompt = "Provide a comprehensive clinical summary with assessment and recommendations.";
      userPrompt = `Create a detailed clinical summary of:\n\n${noteText}`;
    } else if (action === "risk_assessment") {
      systemPrompt = "Assess clinical risk factors and safety considerations. Include protective factors.";
      userPrompt = `Provide a thorough risk assessment for:\n\n${noteText}`;
    }

    const { redacted, hadPHI } = redactPHI(noteText);
    const payload = BAA_SIGNED ? userPrompt : redacted;

    console.log("[STREAM] Starting SSE relay to OpenAI");
    
    // Stream response from OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: payload },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "OpenAI call failed");
      console.error("[ERROR] OpenAI error:", response.status, text);
      return new Response(JSON.stringify({ error: `AI service error: ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("[STREAM] OpenAI response OK, relaying to client");

    // Log to audit (non-blocking - fire and forget)
    try {
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "ai_clinical_analysis",
        resource_type: "clinical_note",
        resource_id: crypto.randomUUID(),
        metadata: { 
          analysis_type: action,
          hadPHI, 
          redactionApplied: !BAA_SIGNED && hadPHI, 
          model: MODEL 
        },
      });
    } catch (auditError) {
      console.error("Audit log failed (non-blocking):", auditError);
    }

    // Stream response back to client
    const streamResponse = new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
    console.log("[STREAM] Completed successfully");
    return streamResponse;
  } catch (error) {
    console.error("[ERROR] analyze-clinical-notes error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
