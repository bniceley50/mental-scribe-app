/**
 * Example: Cached tenant settings endpoint (non-PHI data)
 * 
 * Demonstrates:
 * - Redis cache-aside pattern
 * - Read replica routing
 * - Non-PHI data caching (safe)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cacheGetOrSet } from "../_shared/cache.ts";
import { withRead } from "../_shared/db.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenant_id required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache key format: entity:id:version
    const cacheKey = `tenant:${tenantId}:settings:v1`;

    // Cache for 120 seconds
    const settings = await cacheGetOrSet(cacheKey, 120, async () => {
      console.log(`[DB] Fetching tenant settings for ${tenantId}`);
      
      // Use read replica for this safe read
      const result = await withRead(async (client) => {
        return await client.queryObject`
          SELECT 
            id,
            name,
            plan,
            created_at
          FROM tenants
          WHERE id = ${tenantId}
        `;
      });

      return result.rows[0] || null;
    });

    if (!settings) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: settings }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache-Key': cacheKey
        } 
      }
    );

  } catch (error) {
    console.error("[Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
