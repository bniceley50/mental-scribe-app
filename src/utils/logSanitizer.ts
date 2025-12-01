// src/utils/logSanitizer.ts
// Small log sanitizer to reduce log injection and accidental PII/PHI leakage.
//
// Usage:
//   import { sanitizeLogInput, redactPII } from "./logSanitizer";
//
//   logger.error("event", { input: sanitizeLogInput(userInput) });
//   logger.info("event", { payload: redactPII(payload) });

const MAX_LEN = 1024;

function toStringSafe(value: unknown): string {
  try {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function stripControlChars(s: string): string {
  // Remove ASCII control characters including CR/LF to reduce log injection risk
  return s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

function truncate(s: string, len = MAX_LEN): string {
  if (s.length <= len) return s;
  return s.slice(0, len) + "…[truncated]";
}

function redactLikelySecrets(s: string): string {
  // Redact long hex / base64-like tokens
  const tokenRegex = /\b([A-Fa-f0-9]{32,}|[A-Za-z0-9-_]{32,})\b/g;
  s = s.replace(tokenRegex, "[REDACTED_TOKEN]");

  // Partially redact emails
  s = s.replace(
    /([A-Za-z0-9.%+-]{2})[A-Za-z0-9.%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    "$1…@$2"
  );

  // Redact long numeric sequences (simple heuristic for IDs / CC-like numbers)
  s = s.replace(/\b\d{12,}\b/g, "[REDACTED_NUMBER]");

  return s;
}

export function sanitizeLogInput(value: unknown): string {
  const raw = toStringSafe(value);
  let out = stripControlChars(raw);
  out = redactLikelySecrets(out);
  out = truncate(out, MAX_LEN);
  return out;
}

const SENSITIVE_KEYS = [
  "password",
  "pass",
  "token",
  "access_token",
  "refresh_token",
  "ssn",
  "email",
  "dob",
];

export function redactPII<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  try {
    const clone: any = Array.isArray(obj) ? [...(obj as any[])] : { ...(obj as any) };

    for (const key of Object.keys(clone)) {
      const lower = key.toLowerCase();

      if (SENSITIVE_KEYS.some((k) => lower.includes(k))) {
        clone[key] = "[REDACTED]";
        continue;
      }

      if (typeof clone[key] === "string") {
        clone[key] = sanitizeLogInput(clone[key]);
      }
    }

    return clone;
  } catch {
    return "[unserializable]" as unknown as T;
  }
}
