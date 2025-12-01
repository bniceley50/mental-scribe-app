# Release v0.9.0-security-hardened

**Date:** 2025-12-01
**Status:** Production-Ready (Security Hardened)

This release marks a major security milestone for Mental Scribe, incorporating all fixes from the November 2025 adversarial penetration test and subsequent CodeQL hardening.

## 🛡️ Security Highlights

- **Adversarial Remediation:** All P0 (Critical/High) and P1 (Medium) findings from the external audit have been remediated.
- **Static Analysis:** CodeQL is now fully integrated into CI with a clean scan (0 High/Critical alerts).
- **Hardening:**
  - **Edge Functions:** Strict CORS (no wildcards), shared-secret authentication for admin endpoints, and input size limits (100KB).
  - **Database:** RLS policies hardened, and TOCTOU race conditions in consent logic eliminated via `VOLATILE` functions.
  - **Logging:** New PII redaction and prototype pollution defenses in `logSanitizer.ts`.
  - **Secrets:** All misconfigured environment variables rotated and centralized; gitleaks enabled.

## 🔒 Compliance & Posture

- **Security Grade:** Upgraded from **C+** to **B+** (Production-Ready with Monitoring).
- **Audit Trail:** Full remediation details available in [`docs/SECURITY_REMEDIATION_2025-11.md`](docs/SECURITY_REMEDIATION_2025-11.md).

## 🚀 Deployment Notes

- Requires `AUDIT_CRON_SECRET` in environment variables.
- Database migrations must be applied to ensure `VOLATILE` function updates.
- Recommended: Enable native HIBP checks in Lovable Cloud console.
