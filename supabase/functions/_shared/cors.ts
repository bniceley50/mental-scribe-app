/**
 * CORS helper for Edge Functions
 * P0 FIX: Restricts CORS to specific origins (no wildcard)
 * Provides preflight handling, JSON responses, and request wrapping with CORS headers
 */

export function makeCors(
  methods = "GET,POST,OPTIONS",
  origin = Deno.env.get("CORS_ORIGIN") ?? "https://bmtzgeffbzmcwmnprxmx.supabase.co",
  allowHeaders = "authorization, x-client-info, apikey, content-type"
) {
  const base = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": allowHeaders,
  } as const;

  const preflight = (req: Request): Response | null =>
    req.method === "OPTIONS" ? new Response(null, { headers: base }) : null;

  // Helper to safely serialize data, removing stack traces in production
  const safeStringify = (data: unknown): string => {
    const isProd = Deno.env.get("ENVIRONMENT") === "production" || Deno.env.get("DENO_ENV") === "production";
    
    if (!isProd) {
      return JSON.stringify(data);
    }

    // In production, strip 'stack' from objects if present
    const replacer = (key: string, value: unknown) => {
      if (key === "stack" && typeof value === "string") {
        return undefined;
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          // Explicitly exclude stack
        };
      }
      return value;
    };

    return JSON.stringify(data, replacer);
  };

  const json = (data: unknown, init: ResponseInit = {}) =>
    new Response(safeStringify(data), {
      ...init,
      headers: { "content-type": "application/json; charset=utf-8", ...base, ...(init.headers || {}) },
    });

  const wrap = (handler: (req: Request) => Promise<Response> | Response) =>
    async (req: Request): Promise<Response> => {
      const pf = preflight(req); if (pf) return pf;
      
      try {
        const res = await handler(req);
        const h = new Headers(res.headers);
        for (const [k, v] of Object.entries(base)) if (!h.has(k)) h.set(k, v);
        return new Response(res.body, { status: res.status, headers: h });
      } catch (err) {
        // Catch unhandled errors to prevent runtime stack trace leakage
        console.error("Unhandled error in Edge Function:", err);
        
        const isProd = Deno.env.get("ENVIRONMENT") === "production" || Deno.env.get("DENO_ENV") === "production";
        const errorBody = isProd 
          ? { error: "Internal server error" } 
          : { error: String(err), stack: (err as Error)?.stack };

        return json(errorBody, { status: 500 });
      }
    };

  return { preflight, json, wrap, headers: base } as const;
}
