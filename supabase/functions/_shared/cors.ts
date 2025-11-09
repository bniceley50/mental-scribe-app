/**
 * CORS helper for Edge Functions
 * Provides preflight handling, JSON responses, and request wrapping with CORS headers
 */

export function makeCors(origin = "*") {
  const base = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  const preflight = (req: Request): Response | null => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: base });
    }
    return null;
  };

  const json = (data: unknown, init: ResponseInit = {}) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...base,
        ...(init.headers || {}),
      },
    });

  const wrap = (
    handler: (req: Request) => Promise<Response> | Response,
  ) => async (req: Request): Promise<Response> => {
    const pf = preflight(req);
    if (pf) return pf;
    const res = await handler(req);
    // ensure CORS headers are present
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(base)) if (!h.has(k)) h.set(k, v);
    return new Response(res.body, { status: res.status, headers: h });
  };

  return { preflight, json, wrap, headers: base } as const;
}
