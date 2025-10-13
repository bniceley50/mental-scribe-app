import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { redactPHI } from "../utils/redactPHI.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fieldName, fieldLabel, currentValue, conversationContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create field-specific prompts
    const fieldPrompts: Record<string, string> = {
      client_perspective: "Based on the conversation, write the client's perspective in their own words about their current problems, issues, needs, and progress. Use first-person language as if the client is speaking.",
      current_status: "Document the client's current status, assessed needs, and interventions used during this session. Present the provision of services in an understandable manner.",
      response_to_interventions: "Describe the client's response to interventions. Include what steps need to be taken and/or completed by the next scheduled session.",
      new_issues_details: "Provide specific details about the new issues or significant changes that have occurred in the client's life.",
      goals_progress: "Document the client's progress toward established treatment goals. Be specific about what has improved or remained challenging.",
      safety_assessment: "Document safety concerns, risk factors, and protective factors. Include any suicide ideation, self-harm, or harm to others assessment.",
      clinical_impression: "Provide a clinical assessment and diagnostic impressions based on the session content and client presentation.",
      treatment_plan: "Document any updates or modifications to the treatment plan based on today's session.",
      next_steps: "Document homework assignments, action items, and follow-up plans for the client before the next session.",
    };

    const systemPrompt = `You are a clinical documentation assistant helping mental health professionals create accurate, professional clinical notes. 

Guidelines:
- Be professional and use clinical language
- Focus on observable behaviors and reported symptoms
- Maintain client confidentiality
- Use evidence-based terminology
- Be concise but thorough
- ${currentValue ? 'Enhance and expand the existing content with additional clinical details' : 'Generate comprehensive content based on the conversation'}

Field: ${fieldLabel}
Task: ${fieldPrompts[fieldName] || 'Generate appropriate clinical documentation for this field'}`;

    // SECURITY: Redact PHI before sending to external LLM
    const redactedCurrentValue = currentValue ? redactPHI(currentValue) : '';
    const redactedContext = redactPHI(conversationContext);

    const userPrompt = currentValue 
      ? `Current content:\n${redactedCurrentValue}\n\nConversation context:\n${redactedContext}\n\nPlease enhance and expand this content with clinical details based on the conversation.`
      : `Conversation context:\n${redactedContext}\n\nPlease generate clinical documentation for the "${fieldLabel}" field based on this conversation.`;

    console.log('Analyzing field:', fieldName);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content;

    if (!suggestion) {
      throw new Error('No suggestion generated');
    }

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-field function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
