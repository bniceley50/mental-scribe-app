// Simple redact helpers; expand for PHI/PII as needed.
const PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/g,                                   // SSN
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // phone
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi               // email
];

const ALLOW_KEYS = new Set(['feature', 'route', 'sessionId', 'requestId']);

export function redactValue(v: unknown, key?: string): unknown {
  if (key && ALLOW_KEYS.has(key)) return v;
  const s = typeof v === 'string' ? v : safeStringify(v);
  const red = PATTERNS.reduce((acc, rx) => acc.replace(rx, '[REDACTED]'), s);
  try { return JSON.parse(red); } catch { return red; }
}

export function redactCtx(ctx?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!ctx) return undefined;
  return Object.fromEntries(Object.entries(ctx).map(([k, v]) => [k, redactValue(v, k)]));
}

export function safeStringify(v: unknown): string {
  try { return JSON.stringify(v); } catch { return String(v); }
}
