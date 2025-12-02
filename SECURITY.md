# Security Overview

This project handles sensitive clinical and behavioral health data. Security, privacy, and auditability are treated as first-class requirements, not optional add-ons.

## Threat Model

- **Data domain:** Clinical notes, risk assessments, diagnoses, and other PHI/PII.
- **Primary risks:** Unauthorized access, misconfiguration of auth/RLS, data exfiltration via APIs, injection vulnerabilities, misused API keys, and information disclosure via logs or error messages.
- **Environment:** Supabase (Postgres, Auth, Edge Functions) + Vite/React frontends + Lovable Cloud environment.

## Controls & Practices

### 1. Secrets & Environment Hygiene

- `.env` is **not tracked** in git; secrets are stored in managed secret stores only.
- `verify-security.sh` runs **gitleaks** when available to detect committed secrets.
- Supabase keys are now unified under `VITE_SUPABASE_PUBLISHABLE_KEY` and validated to reference a single project ID.
- Historical leaked env values have been rotated or removed; the repo is monitored for new leaks.

### 2. Authentication, Authorization & RLS

- High-risk edge functions (e.g. `audit-verify-incremental`, `audit-verify-full`) are protected via a dedicated shared secret header (`x-audit-secret`) and return `403` on missing/invalid credentials.
- Supabase Row-Level Security (RLS) is enforced for all PHI/PII tables; helper functions such as `has_active_part2_consent_for_conversation` are marked `VOLATILE` to avoid stale cached decisions.
- Role checks (`has_role`, `is_admin`) are implemented as `SECURITY DEFINER` functions with constrained search paths to avoid privilege escalation.

### 3. CORS & Edge Function Hardening

- All edge functions use a centralized CORS helper (`_shared/cors.ts`) via `makeCors()` and `cors.wrap()`.
- Wildcard origins (`*`) have been removed; allowed origins are driven by `CORS_ORIGIN` and default to the Supabase project URL.
- Unhandled errors in edge functions are caught in `cors.wrap()` and return generic `500` JSON responses without leaking stack traces in production.

### 4. Logging, PII Redaction & Prototype Pollution Defense

- A dedicated log sanitizer (`src/utils/logSanitizer.ts`) is used to:
  - Strip control characters and newlines from log entries.
  - Redact likely secrets/tokens, long numeric IDs, and sensitive keys (password, token, email, ssn, etc.).
  - Defend against **prototype pollution** by explicitly stripping `__proto__`, `constructor`, and `prototype` keys in `redactPII`.
- Realtime audio and other high-volume/log-sensitive paths use `sanitizeLogInput` and `redactPII` to prevent raw PHI or dangerous structures from being logged.

### 5. Input Validation & Abuse Protection

- `analyze-clinical-notes` enforces a hard **100 KB note size limit** and returns `413 Payload Too Large` when exceeded, **before** any OpenAI/API calls or quota increments.
- Oversized attempts are logged with structured warnings for monitoring.
- Consent-related and Part 2–protected flows are implemented to avoid time-of-check/time-of-use (TOCTOU) races by always querying fresh consent state.

### 6. Timing & Side-Channel Mitigation

- Role/privilege helper functions include a small constant-time delay (`pg_sleep(0.02)`) to normalize response times and make user/enumeration via timing impractical.
- Where applicable, functions were converted from `sql` to `plpgsql` to allow explicit timing control.

### 7. Static Analysis (CodeQL) & Secret Scanning

- **CodeQL** is integrated into CI and runs on:
  - Pushes to `main`
  - Pull requests targeting `main`
  - Scheduled runs
- CodeQL is configured to:
  - **Include:** `src/**`, `supabase/**`, `apps/**`, `packages/**`
  - **Exclude:** `scripts/**`, `dist/**`, `build/**`, test artifacts, and `**/*.test.*` / `**/*.spec.*`
- All known **High/Critical CodeQL alerts** have been remediated:
  - `js/remote-property-injection` in `logSanitizer.ts` (prototype pollution) → fixed.
  - `js/stack-trace-exposure` in `cors.ts` → fixed.
  - Script-level issues in `security-check.js` → fixed.
- CSP Hardening:
  - `script-src` wildcard (`https:`) removed; policy is now strict `'nonce-...' 'strict-dynamic'`.
- Secret scanning:
  - `verify-security.sh` + gitleaks are used locally/CI to catch future leaks early.

### 8. Monitoring, Logging & Audit Trail

- Security-sensitive events are logged with structured metadata:
  - Unauthorized audit verification attempts (`x-audit-secret` failures).
  - Note size violations (size, timestamp).
  - Consent changes and Part 2 revocations.
- Audit logs can be queried for:
  - Brute force attempts on audit endpoints.
  - Abnormal volume of 413 responses.
  - Consent changes within time windows.

## Known Deferred Items

- **CSP `unsafe-inline` for styles** is currently allowed to support Tailwind/shadcn UI. This is tracked as a low-risk item to be addressed in a future major UI refactor (nonce-based CSP).
- Native Supabase Have I Been Pwned (HIBP) checks should be enabled in the Lovable Cloud console as a defense-in-depth backup to the existing custom HIBP integration.

## Security Review & Re-Testing

- Last adversarial review: **2025-11-28 → C+ → remediated to B+**
- CodeQL hardening & clean scan: **2025-12-01** (0 open High/Critical alerts).
- Next recommended review: **Within 30–90 days of major feature changes that touch auth, storage, or PHI flows.**

