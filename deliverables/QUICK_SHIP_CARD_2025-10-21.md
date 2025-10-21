# Quick Ship Card — Mental Scribe App (2025-10-21)

Status: GO (A+, 96/100)
Scope: Auth • RLS • CSP • PHI redaction • Uploads • Pagination • Audit • Rate limits

## 1) GO / NO-GO

- GO, with two optional hardening items:
  - Enable Supabase Leaked Password Protection (backup HIBP)
  - Consider nonce-based styles (remove unsafe-inline in style-src)

## 2) Critical Controls (PASS)

- RLS: FORCE on PHI tables; Part 2 consent checks
- Auth: HIBP k-anonymity (fail-closed), password policy, rate limits
- Sessions: inactivity timeout; logout cleanup
- PHI redaction default unless BAA_SIGNED=true
- Upload guard: magic bytes + sanitization
- CSP headers: nonce + strict-dynamic
- Audit logs immutable; policy-protected
- Pagination: keyset with index

## 3) Fast Pre-flight

```pwsh
npm run build
npm run preview
npm run test:smoke:preview
```

Expect: 1/1 smoke passing; app renders with no blocking CSP violations.

## 4) Post-deploy Spot Check

```pwsh
# Replace with your deployment host
curl -I https://<your-app>.vercel.app
```

Expect headers: CSP, HSTS, X-Frame-Options, COOP, CORP, Referrer-Policy, Permissions-Policy

## 5) Ops Notes (HIPAA)

- Meets app-layer controls: RLS, audit, TLS, PHI redaction, session mgmt, Part 2
- Organization still needs: BAA, policy/training, incident/DR, risk assessments

## 6) Links

- Detailed Review: docs/SECURITY_REVIEW_2025-10-21.md
- Deploy Readiness: review/DEPLOY_READY.md
