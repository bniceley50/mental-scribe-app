const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const ALLOWED_ORIGINS = new Set(ORIGINS);

const DEFAULT_ORIGIN = Deno.env.get("DEFAULT_ORIGIN") ?? "http://localhost:5173";

export function corsFor(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none';",
  };
}

export function ok(req: Request, data: unknown, status = 200) {
  const h = corsFor(req);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...h,
      "Content-Type": "application/json",
      Vary: "Origin",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function err(req: Request, message: string, status = 400) {
  return ok(req, { error: message }, status);
}
