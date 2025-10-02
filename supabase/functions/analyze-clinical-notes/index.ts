import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

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
  action: "soap_note" | "session_summary" | "key_points" | "progress_report";
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
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Audit log the AI analysis request
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'ai_analysis_request',
      resource_type: 'clinical_notes',
      metadata: { action, notes_length: notes?.length || 0, has_file: !!file_content },
      ip_address: ipAddress,
      user_agent: userAgent
    });

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

    console.log("Calling OpenAI API with action:", action);

    // Call OpenAI API with streaming
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7,
        max_completion_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
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
    console.error("Error in analyze-clinical-notes function:", error);
    
    // Sanitize error messages for security
    let userMessage = "An error occurred during analysis";
    if (error.message?.includes("API key")) {
      userMessage = "Service configuration error. Please contact support.";
    } else if (error.message?.includes("OpenAI") || error.message?.includes("rate limit")) {
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
