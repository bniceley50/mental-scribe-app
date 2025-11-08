# Logging Contract

## Overview

Mental Scribe uses a centralized logger (`src/lib/logger/`) with automatic PII/PHI redaction, structured output for production log aggregation, and pluggable sinks (console, HTTP POST, Sentry).

## Rules

### ✅ DO

- **Always use the logger** for all application logging
  ```typescript
  import { logger } from '@/lib/logger';
  
  logger.info('User action completed', { action: 'export', format: 'pdf' });
  logger.error('Failed to process', error, { userId: '123' });
  ```

- **Use appropriate log levels**
  - `debug`: Development-only verbose info (not logged in production)
  - `info`: Normal application events (exports, user actions)
  - `warn`: Recoverable issues (validation failures, retries)
  - `error`: Unrecoverable failures requiring attention

- **Provide context objects** for structured logging
  ```typescript
  logger.error('API call failed', error, {
    endpoint: '/api/clients',
    statusCode: 500,
    userId: user.id
  });
  ```

- **Use child loggers** for scoped context
  ```typescript
  const sessionLogger = logger.child({ sessionId: 'abc123' });
  sessionLogger.info('Session started');
  ```

- **Use the LoggerProvider for session correlation**
  ```typescript
  import { useLogger } from '@/lib/logger/LoggerProvider';
  
  function MyComponent() {
    const { logger } = useLogger();
    logger.info('Component mounted'); // includes sessionId + route automatically
  }
  ```

### ❌ DON'T

- **Never use console.*** directly
  ```typescript
  // ❌ WRONG - ESLint will block this
  console.log('Debug info');
  console.error('Error:', error);
  
  // ✅ CORRECT
  logger.debug('Debug info');
  logger.error('Error occurred', error);
  ```

- **Never log raw PHI/PII**
  ```typescript
  // ❌ WRONG - Will be redacted but avoid if possible
  logger.info('User email', { email: 'patient@example.com' });
  
  // ✅ CORRECT - Use identifiers instead
  logger.info('User action', { userId: '123' });
  ```

- **Never log credentials or secrets**
  ```typescript
  // ❌ WRONG
  logger.debug('API response', { apiKey: 'secret123' });
  
  // ✅ CORRECT
  logger.debug('API response received', { statusCode: 200 });
  ```

## Automatic Redaction

The logger automatically redacts:
- Social Security Numbers (SSN): `123-45-6789`
- Phone numbers: `(555) 123-4567`
- Email addresses
- Medical Record Numbers (MRN): 9-digit patterns

**Whitelisted keys** (not redacted):
- `feature`
- `route`
- `sessionId`
- `requestId`

## Log Sinks

### Console Sink (always active)
- **Development**: Pretty, human-readable output with context
- **Production**: Structured JSON for log aggregation

### HTTP POST Sink (optional)
Configure via env vars:
```env
VITE_LOG_POST_URL=https://logs.example.com/ingest
VITE_LOG_POST_AUTH=Bearer abc123
```

- Minimum level: `info`
- Fire-and-forget with 2.5s timeout
- Uses `keepalive` for reliability

### Sentry Sink (optional)
Configure via env var:
```env
VITE_SENTRY_DSN=https://<key>@oXXXX.ingest.sentry.io/XXXX
```

- Minimum level: `error`
- Lazy-loads @sentry/react (no bundle weight in dev)
- Includes session/route correlation in extras

## Session Correlation

Every log from components wrapped in `LoggerProvider` includes:
- **sessionId**: Unique per browser session (generated via `crypto.randomUUID()`)
- **route**: Current React Router path

```typescript
// Automatic correlation in main.tsx
<LoggerProvider>
  <App />
</LoggerProvider>

// All logs now include sessionId + route
logger.info('User clicked button'); 
// → { ts, level, msg, sessionId: "abc-123", route: "/dashboard", ... }
```

## Output Format

### Development
Pretty, human-readable console output:
```
[2025-01-08T20:00:00.000Z] INFO: User logged in {"userId":"123"} sessionId=abc-123 route=/dashboard
```

### Production
Structured JSON for log aggregation:
```json
{
  "ts": "2025-01-08T20:00:00.000Z",
  "level": "info",
  "msg": "User logged in",
  "ctx": { "userId": "123" },
  "sessionId": "abc-123",
  "route": "/dashboard"
}
```

## Log Level Control

Set via env var (defaults to `debug` in dev, `info` in prod):
```env
VITE_LOG_LEVEL=warn  # Only warn+ logs emitted
```

## Enforcement

- **ESLint**: Blocks any direct `console.*` calls (except in logger internals)
- **Pre-commit hook**: Scans for stray console calls before commit
- **CI workflow**: Fails builds with console violations

## Testing

When testing components that use the logger:

```typescript
import { logger } from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

test('logs error on failure', () => {
  // ... trigger error
  expect(logger.error).toHaveBeenCalledWith(
    expect.stringContaining('error message'),
    expect.any(Error)
  );
});
```

## Architecture

```
src/lib/logger/
├── index.ts              # Main logger factory + sink orchestration
├── types.ts              # LogEvent, LogSink, Level types
├── redact.ts             # PII/PHI redaction + allowlist
├── LoggerProvider.tsx    # React context for session/route correlation
├── sinks/
│   ├── console.ts        # Console output (dev pretty, prod JSON)
│   ├── http.ts           # HTTP POST sink with timeout/keepalive
│   └── sentry.ts         # Sentry error tracking (lazy-loaded)
└── __tests__/
    └── sinks.test.ts     # Unit tests for sinks + redaction
```

## Next Steps (Future PRs)

- **Expanded redaction**: Add more PHI patterns (diagnosis codes, medications)
- **Custom sinks**: DataDog, CloudWatch, etc.
- **Performance metrics**: Attach timing info to structured logs
- **Log sampling**: Reduce volume in high-traffic scenarios
