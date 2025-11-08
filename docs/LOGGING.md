# Logging Contract

## Overview

Mental Scribe uses a centralized logger (`src/lib/logger.ts`) with automatic PII/PHI redaction and structured output for production log aggregation.

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
- Medical Record Numbers (MRN): 9-digit patterns
- Email addresses
- Credentials: `password=`, `token=`, `secret=`, etc.

## Output Format

### Development
Pretty, human-readable console output:
```
[2025-01-08T20:00:00.000Z] INFO: User logged in { userId: '123' }
```

### Production
Structured JSON for log aggregation:
```json
{
  "timestamp": "2025-01-08T20:00:00.000Z",
  "level": "info",
  "message": "User logged in",
  "context": { "userId": "123" }
}
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

## Next Steps (PR-2)

Future enhancements planned:
- Log sink adapters (Sentry, HTTP POST)
- Session/request correlation IDs
- Runtime log level control via env vars
- Expanded PII allowlist configuration
