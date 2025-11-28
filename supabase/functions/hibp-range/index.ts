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
import { makeCors } from "../_shared/cors.ts";

const { json, wrap, headers: corsBase } = makeCors("POST,OPTIONS");

interface RequestBody {
  prefix: string;
}

serve(
  wrap(async (req) => {
    try {
      if (req.method !== "POST") {
        return json(
          { error: "Method not allowed" },
          { status: 405 }
        );
      }

      const body: RequestBody = await req.json();
      const { prefix } = body;

      if (!prefix || typeof prefix !== "string") {
        console.error("HIBP proxy: Missing prefix parameter");
        return json(
          { error: "Missing required parameter: prefix" },
          { status: 400 }
        );
      }

      if (!/^[A-F0-9]{5}$/i.test(prefix)) {
        console.error("HIBP proxy: Invalid prefix format");
        return json(
          { error: "Invalid prefix format. Must be 5 hex characters." },
          { status: 400 }
        );
      }

      console.log(`HIBP proxy: Checking range for prefix ${prefix}`);

      const hibpResponse = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix.toUpperCase()}`,
        {
          method: "GET",
          headers: {
            "Add-Padding": "true",
            "User-Agent": "Mental-Scribe-HIBP-Proxy/1.0",
          },
        }
      );

      if (!hibpResponse.ok) {
        console.error(`HIBP API error: ${hibpResponse.status}`);
        return json(
          {
            error: "HIBP service unavailable",
            failClosed: true,
          },
          { status: 503 }
        );
      }

      const rangeData = await hibpResponse.text();

      return new Response(rangeData, {
        status: 200,
        headers: { ...corsBase, "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("HIBP proxy error:", error);
      return json(
        {
          error: "Internal server error",
          failClosed: true,
        },
        { status: 500 }
      );
    }
  })
);
