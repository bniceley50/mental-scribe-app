import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

// Allowed origins for CORS
const allowedOrigins = [
  "https://mental-scribe-app.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = userRequestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  userLimit.count++;
  return true;
}

interface AnalysisRequest {
  notes: string;
  action: "soap_note" | "session_summary" | "key_points" | "progress_report" | "medical_entities" | "clinical_summary" | "risk_assessment";
  file_content?: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

const getSystemPrompt = (action: string): string => {
  const prompts = {
    soap_note: `You are a clinical documentation assistant for mental health professionals. 
Analyze the following session notes and create a properly formatted SOAP note.

SOAP Note Format:
S (Subjective): Patient's reported experience, symptoms, concerns
O (Objective): Observable behaviors, mental status, appearance
A (Assessment): Clinical interpretation, diagnosis considerations
P (Plan): Treatment recommendations, next steps, interventions

Be professional, concise, and clinically appropriate. Use proper medical terminology.`,

    session_summary: `You are a clinical documentation assistant. Create a concise session summary from the provided clinical notes. Include:
- Main topics discussed
- Patient's emotional state and progress
- Key insights or breakthroughs
- Therapist observations
- Homework or action items

Keep it professional and clinically appropriate.`,

    key_points: `You are a clinical documentation assistant. Extract and list the most important clinical points from the session notes:
- Critical statements or revelations
- Risk factors or safety concerns
- Progress indicators
- Treatment targets

Present as a bulleted list with clear, concise points.`,

    progress_report: `You are a clinical documentation assistant. Generate a progress report based on the session notes. Include:
- Current status and functioning level
- Progress toward treatment goals
- Challenges or setbacks
- Recommended adjustments to treatment plan

Be thorough and professional.`,

    medical_entities: `You are an expert clinical NLP system. Extract and categorize all medical entities from the clinical notes.

Extract the following in a structured JSON format:
{
  "diagnoses": ["list of mentioned diagnoses, conditions, or suspected conditions"],
  "medications": ["list of medications with dosages if mentioned"],
  "symptoms": ["list of reported symptoms"],
  "procedures": ["list of procedures, treatments, or interventions"],
  "vitals": ["list of vital signs if mentioned"],
  "risk_factors": ["list of identified risk factors"],
  "mental_status": {
    "mood": "description",
    "affect": "description",
    "thought_process": "description",
    "orientation": "description"
  },
  "clinical_concerns": ["list of immediate clinical concerns"]
}

Be thorough and accurate. Only include entities explicitly mentioned in the notes.`,

    clinical_summary: `You are a clinical AI assistant. Provide a comprehensive yet concise clinical summary.

Create a structured summary with the following sections:

**Chief Complaint/Presenting Problem:**
Brief overview of primary concern

**Clinical Assessment:**
- Current mental status
- Symptom severity and progression
- Functional impairment level
- Risk assessment (self-harm, harm to others)

**Treatment Progress:**
- Response to current interventions
- Adherence to treatment plan
- Barriers to progress

**Clinical Recommendations:**
- Continue current interventions
- Modifications needed
- Additional referrals or consultations
- Follow-up timeline

Use professional clinical language and be evidence-based.`,

    risk_assessment: `You are a clinical risk assessment specialist. Perform a comprehensive risk assessment based on the provided notes.

Analyze and provide:

**Immediate Risk Factors:**
- Suicidal ideation (passive/active)
- Self-harm behaviors
- Harm to others
- Substance use concerns
- Medical urgency

**Protective Factors:**
- Social support
- Coping skills
- Reasons for living
- Treatment engagement

**Risk Level:** (Low/Moderate/High)

**Recommendations:**
- Safety planning needs
- Level of care appropriate
- Immediate interventions required
- Follow-up urgency

Be thorough and err on the side of caution for safety.`,
  };

  return prompts[action as keyof typeof prompts] || prompts.session_summary;
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("AI service not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth client for user validation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { notes, action, file_content, conversation_history }: AnalysisRequest = await req.json();

    // Audit log using service role (bypasses RLS for audit_logs table)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'ai_analysis_request',
      resource_type: 'clinical_notes',
      metadata: { action, notes_length: notes?.length || 0, has_file: !!file_content },
      ip_address: ipAddress,
      user_agent: userAgent
    });
    
    if (auditError) {
      console.error('Audit log failed:', auditError.message);
    }

    if (!notes && !file_content) {
      throw new Error("Either notes or file_content is required");
    }

    // Combine notes and file content if both exist
    const fullNotes = [notes, file_content].filter(Boolean).join("\n\n");

    // Build messages array
    const messages = [
      {
        role: "system",
        content: getSystemPrompt(action),
      },
    ];

    // Add conversation history if provided
    if (conversation_history && conversation_history.length > 0) {
      messages.push(...conversation_history);
    }

    // Add current notes
    messages.push({
      role: "user",
      content: `Session Notes:\n\n${fullNotes}`,
    });

    console.log(`AI analysis request: action=${action}, user=${user.id}, notes_length=${notes?.length || 0}`);

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Free during promo period
        messages: messages,
        temperature: action === "medical_entities" ? 0.3 : 0.7,
        max_tokens: action === "clinical_summary" || action === "risk_assessment" ? 3000 : 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Gateway error: status=${response.status}, body=${errorText}`);
      
      // Handle specific AI Gateway errors
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits depleted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Return the stream directly to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    // Log sanitized error info without exposing sensitive data
    console.error(`Error in analyze-clinical-notes: type=${error.name || 'unknown'}, message=${error.message}`);
    
    // Sanitize error messages for security
    let userMessage = "An error occurred during analysis";
    if (error.message?.includes("API key") || error.message?.includes("not configured")) {
      userMessage = "Service configuration error. Please contact support.";
    } else if (error.message?.includes("Gateway") || error.message?.includes("rate limit")) {
      userMessage = "AI service temporarily unavailable. Please try again.";
    } else if (error.message?.includes("Authentication") || error.message?.includes("Unauthorized")) {
      userMessage = "Authentication error. Please sign in again.";
    }

    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
