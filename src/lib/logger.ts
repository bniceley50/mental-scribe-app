/**
 * Production-ready centralized logger with PII/PHI redaction
 * - JSON output in production for log aggregation
 * - Pretty output in development
 * - Automatic redaction of sensitive patterns
 */
/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

const ENV = import.meta.env.MODE ?? 'development';

// Patterns to redact from logs (SSN, MRN, emails, etc.)
const REDACT_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/g,                          // SSN
  /\b\d{9}\b/g,                                       // MRN-like patterns
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,    // Emails
  /\b(?:password|token|secret|key|auth)\s*[:=]\s*\S+/gi, // Credentials
];

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  
  const stringified = typeof value === 'string' ? value : JSON.stringify(value);
  const redacted = REDACT_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, '[REDACTED]'),
    stringified
  );
  
  try {
    return JSON.parse(redacted);
  } catch {
    return redacted;
  }
}

function baseLog(level: LogLevel, message: string, context?: LogContext): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && {
      context: Object.fromEntries(
        Object.entries(context).map(([key, value]) => [key, redact(value)])
      ),
    }),
  };

  if (ENV === 'development') {
    // Pretty dev output
    const prefix = `[${payload.timestamp}] ${level.toUpperCase()}:`;
    const msg = `${prefix} ${message}`;
    
    if (level === 'error') {
      console.error(msg, context || '');
    } else if (level === 'warn') {
      console.warn(msg, context || '');
    } else if (level === 'info') {
      console.info(msg, context || '');
    } else {
      console.log(msg, context || '');
    }
  } else {
    // Structured JSON for production log aggregation
    const json = JSON.stringify(payload);
    
    if (level === 'error') {
      console.error(json);
    } else if (level === 'warn') {
      console.warn(json);
    } else {
      console.log(json);
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext): void => {
    if (ENV === 'development') {
      baseLog('debug', message, context);
    }
  },
  
  info: (message: string, context?: LogContext): void => {
    baseLog('info', message, context);
  },
  
  warn: (message: string, context?: LogContext): void => {
    baseLog('warn', message, context);
  },
  
  error: (message: string, error?: Error | unknown, context?: LogContext): void => {
    const errorContext: LogContext = { ...context };
    
    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext.error = error;
    }
    
    baseLog('error', message, errorContext);
  },
  
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...baseContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(message, error, { ...baseContext, ...context }),
  }),
};
