/**
 * Enhanced PHI Redactor (Sprint B)
 * 
 * P0 FIX: Prevents PHI leakage to console logs, Deno logs, and telemetry
 * 
 * Redacts multiple types of PHI/PII using regex patterns:
 * - SSN (Social Security Numbers)
 * - DOB (Dates of Birth)
 * - Phone numbers
 * - Email addresses
 * - Medical Record Numbers (MRN)
 * - Names (basic pattern)
 * - IP addresses
 * - Credit card numbers
 * - Addresses (basic pattern)
 * 
 * USAGE:
 *   import { safeLog, safeError, redactObject } from "../_shared/phi-redactor.ts";
 *   
 *   // Safe logging with automatic redaction
 *   safeLog.error("Processing failed", { transcript, error });
 *   
 *   // Redact objects manually
 *   const safe = redactObject({ transcript, user });
 */

export interface RedactionResult {
  redacted: string;
  hadPHI: boolean;
  redactionCount: number;
  types: string[];
}

export function redactPHI(text: string): RedactionResult {
  const rules = [
    { name: 'SSN', r: /\b\d{3}-\d{2}-\d{4}\b/g },
    { name: 'DOB', r: /\b(0[1-9]|1[0-2])[\/-](0[1-9]|[12]\d|3[01])[\/-](19|20)\d{2}\b/g },
    { name: 'Phone', r: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
    { name: 'Email', r: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
    { name: 'MRN', r: /\b(MRN|Medical Record)[ :#-]*[A-Z0-9]{6,}\b/gi },
    { name: 'Name', r: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g },
    { name: 'IP', r: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
    { name: 'CreditCard', r: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
    { name: 'Address', r: /\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi },
  ];

  let redacted = text;
  let totalRedactions = 0;
  const typesFound: Set<string> = new Set();

  for (const { name, r } of rules) {
    const matches = redacted.match(r);
    if (matches && matches.length > 0) {
      totalRedactions += matches.length;
      typesFound.add(name);
      redacted = redacted.replace(r, '[REDACTED]');
    }
  }

  return {
    redacted,
    hadPHI: totalRedactions > 0,
    redactionCount: totalRedactions,
    types: Array.from(typesFound)
  };
}

// Simple backward compatibility
export function redactPHISimple(text: string): { redacted: string; hadPHI: boolean } {
  const result = redactPHI(text);
  return { redacted: result.redacted, hadPHI: result.hadPHI };
}

/**
 * P0 FIX: Object-level PHI redaction for logging
 * Redacts sensitive fields from objects before logging
 */

// Fields that may contain PHI
const PHI_OBJECT_FIELDS = new Set([
  'transcript',
  'transcription',
  'transcription_text',
  'content',
  'message',
  'text',
  'clinical_impression',
  'treatment_plan',
  'safety_assessment',
  'client_perspective',
  'response_to_interventions',
  'soap',
  'subjective',
  'objective',
  'assessment',
  'plan',
  'differential_diagnosis',
  'processed_content',
  'file_content',
  'recording',
  'audio',
  'name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'dob',
  'date_of_birth',
  'ssn',
  'medical_record_number',
]);

// Sensitive auth fields
const AUTH_FIELDS = new Set([
  'password',
  'token',
  'api_key',
  'secret',
  'authorization',
  'access_token',
  'refresh_token',
  'session_token',
  'bearer',
  'apikey',
  'auth',
  'credentials',
  'private_key',
]);

/**
 * Redact PHI and sensitive fields from an object for safe logging
 */
export function redactObject(obj: unknown, maxDepth = 5): unknown {
  if (maxDepth <= 0) return '[MAX_DEPTH]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.length > 200) {
      return obj.slice(0, 200) + '... [TRUNCATED]';
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, maxDepth - 1));
  }
  
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: '[REDACTED]',
    };
  }
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (PHI_OBJECT_FIELDS.has(lowerKey) || AUTH_FIELDS.has(lowerKey)) {
      if (typeof value === 'string') {
        result[key] = `[REDACTED: string, ${value.length} chars]`;
      } else if (value !== null && typeof value === 'object') {
        result[key] = `[REDACTED: object]`;
      } else {
        result[key] = '[REDACTED]';
      }
    } else {
      result[key] = redactObject(value, maxDepth - 1);
    }
  }
  
  return result;
}

/**
 * Safe logger that automatically redacts PHI
 * Drop-in replacement for console
 */
export const safeLog = {
  log: (...args: unknown[]) => {
    console.log(...args.map(arg => redactObject(arg)));
  },
  
  info: (...args: unknown[]) => {
    console.info(...args.map(arg => redactObject(arg)));
  },
  
  warn: (...args: unknown[]) => {
    console.warn(...args.map(arg => redactObject(arg)));
  },
  
  error: (...args: unknown[]) => {
    console.error(...args.map(arg => redactObject(arg)));
  },
  
  debug: (...args: unknown[]) => {
    console.debug(...args.map(arg => redactObject(arg)));
  },
};

/**
 * Format error for safe logging
 */
export function safeError(error: unknown, context?: Record<string, unknown>): {
  message: string;
  name: string;
  context?: unknown;
} {
  const err = error instanceof Error ? error : new Error(String(error));
  
  return {
    name: err.name,
    message: err.message,
    context: context ? redactObject(context) : undefined,
  };
}
