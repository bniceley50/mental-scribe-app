import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { makeCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { redactPHI } from "../_shared/phi-redactor.ts";

const cors = makeCors("POST,OPTIONS");

// Zod-like validation
interface DifferentialDiagnosisItem {
  condition: string;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
  codes: string[];
}

interface DiagnosisRequest {
  clinicalPresentation: string;
  patientHistory?: string;
  symptoms?: string[];
}

Deno.serve(cors.wrap(async (req) => {
  const preflight = cors.preflight(req);
  if (preflight) return preflight;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check quota (function derives user from auth.uid())
    const { data: quotaOk } = await supabase.rpc('check_and_increment_quota', {
      _quota_type: 'llm_tokens',
      _increment: 1500
    });

    if (!quotaOk) {
      return cors.json({ error: 'Quota exceeded' }, {
        status: 429
      });
    }

    const body: DiagnosisRequest = await req.json();
    
    // Redact PHI before sending to LLM
    const { redacted: redactedPresentation, hadPHI: presentationPHI } = redactPHI(body.clinicalPresentation);
    const { redacted: redactedHistory, hadPHI: historyPHI } = redactPHI(body.patientHistory || '');

    const systemPrompt = `You are a medical AI assistant generating differential diagnoses. Return ONLY a JSON array with this exact structure:
[
  {
    "condition": "Condition Name",
    "rationale": "Brief clinical rationale",
    "confidence": "low|medium|high",
    "codes": ["ICD-10 code"]
  }
]
Return 3-5 differential diagnoses ranked by likelihood. Be concise.`;

    const userPrompt = `Clinical Presentation: ${redactedPresentation}
${redactedHistory ? `Patient History: ${redactedHistory}` : ''}
${body.symptoms ? `Symptoms: ${body.symptoms.join(', ')}` : ''}

Generate differential diagnoses.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiData = await openAIResponse.json();
    const content = aiData.choices[0].message.content;

    // Parse and validate response
    let diagnoses: DifferentialDiagnosisItem[];
    try {
      diagnoses = JSON.parse(content);
      
      // Basic validation
      if (!Array.isArray(diagnoses)) {
        throw new Error('Response is not an array');
      }
      
      diagnoses.forEach((dx, idx) => {
        if (!dx.condition || !dx.rationale || !dx.confidence || !Array.isArray(dx.codes)) {
          throw new Error(`Invalid diagnosis structure at index ${idx}`);
        }
        if (!['low', 'medium', 'high'].includes(dx.confidence)) {
          throw new Error(`Invalid confidence level at index ${idx}`);
        }
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('AI returned invalid JSON format');
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'differential_diagnosis_generated',
      resource_type: 'ai_analysis',
      data_classification: 'standard_phi',
      metadata: {
        had_phi: presentationPHI || historyPHI,
        diagnosis_count: diagnoses.length,
        model: 'gpt-4o-mini'
      }
    });

    return cors.json({ 
      diagnoses,
      metadata: {
        redacted: presentationPHI || historyPHI,
        model: 'gpt-4o-mini'
      }
    });

  } catch (error) {
    console.error('Error in differential-diagnosis:', error);
    return cors.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, {
      status: 500
    });
  }
}));
