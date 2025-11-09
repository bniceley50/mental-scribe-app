/**
 * HIBP Range Proxy Edge Function
 * 
 * Securely proxies Have I Been Pwned API requests using k-anonymity model.
 * Only accepts hash prefix (5 chars), never the full password.
 * 
 * Security features:
 * - Only accepts 5-character SHA-1 prefix
 * - Validates input format
 * - No logging of sensitive data
 * - Fail-closed on errors
 * - Rate limiting via HIBP API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  prefix: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request
    const body: RequestBody = await req.json();
    const { prefix } = body;

    // SECURITY: Validate prefix format (must be exactly 5 hex chars)
    if (!prefix || typeof prefix !== "string") {
      console.error("HIBP proxy: Missing prefix parameter");
      return new Response(
        JSON.stringify({ error: "Missing required parameter: prefix" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!/^[A-F0-9]{5}$/i.test(prefix)) {
      console.error("HIBP proxy: Invalid prefix format");
      return new Response(
        JSON.stringify({ error: "Invalid prefix format. Must be 5 hex characters." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call HIBP API with k-anonymity model
    console.log(`HIBP proxy: Checking range for prefix ${prefix}`);
    
    const hibpResponse = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix.toUpperCase()}`,
      {
        method: "GET",
        headers: {
          "Add-Padding": "true", // Additional privacy protection
          "User-Agent": "Mental-Scribe-HIBP-Proxy/1.0",
        },
      }
    );

    if (!hibpResponse.ok) {
      console.error(`HIBP API error: ${hibpResponse.status}`);
      
      // Fail closed: treat as potentially leaked
      return new Response(
        JSON.stringify({ 
          error: "HIBP service unavailable",
          failClosed: true 
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return raw range data (format: SUFFIX:COUNT per line)
    const rangeData = await hibpResponse.text();
    
    return new Response(rangeData, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("HIBP proxy error:", error);
    
    // Fail closed on errors
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        failClosed: true 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
