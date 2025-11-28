import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { redactPHI } from "../_shared/phi-redactor.ts";
import { makeCors } from "../_shared/cors.ts";

const cors = makeCors("POST,OPTIONS");

serve(cors.wrap(async (req) => {
  if (req.method !== 'POST') {
    return new Response('data: {"error": "Method not allowed"}\n\n', {
      status: 405,
      headers: { ...cors.headers, 'Content-Type': 'text/event-stream' }
    });
  }

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
      _increment: 2000
    });

    if (!quotaOk) {
      return new Response('data: {"error": "Quota exceeded"}\n\n', {
        status: 429,
        headers: { ...cors.headers, 'Content-Type': 'text/event-stream' }
      });
    }

    const { content, type = 'soap' } = await req.json();

    // Redact PHI
    const { redacted, hadPHI } = redactPHI(content);

    const systemPrompt = type === 'soap'
      ? 'You are a medical scribe. Generate a SOAP note from the clinical content. Be concise and professional.'
      : 'You are a medical AI assistant. Summarize the clinical content clearly and professionally.';

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
          { role: 'user', content: redacted }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    // Stream the response
    const stream = openAIResponse.body;
    if (!stream) {
      throw new Error('No response stream');
    }

    const reader = stream.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Log to audit
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'content_summarized',
            resource_type: 'ai_analysis',
            data_classification: 'standard_phi',
            pii_redacted: hadPHI,
            metadata: {
              summary_type: type,
              model: 'gpt-4o-mini'
            }
          });

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        ...cors.headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in summarize:', error);
    return new Response(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`, {
      status: 500,
      headers: { ...cors.headers, 'Content-Type': 'text/event-stream' }
    });
  }
}));
