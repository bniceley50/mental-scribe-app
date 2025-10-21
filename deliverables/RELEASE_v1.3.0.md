# v1.3.0 – Ship-safety + Pagination v1 + A+ Security Review

## Highlights

- ✅ **Production security headers** via `vercel.json` (CSP nonce + `strict-dynamic`, HSTS, XFO=DENY, COOP/CORP, Referrer-Policy, Permissions-Policy)
- ✅ **CSP guardrail**: Playwright smoke test prevents “blank page” regressions
- ✅ **Pagination v1**: keyset pagination (20/page) with accessible “Load older” and `aria-live="polite"`
- ✅ **Auth UX**: `autocomplete` hygiene, `autoCapitalize="none"`, `spellCheck={false}`
- ✅ **Radix fixes**: `forwardRef` for `Badge` & `NoteTemplates`
- ✅ **Build/Tooling**: Vite → `^5.4.21`; preview wiring; e2e scaffolding
- ✅ **Docs**: Quick Ship Card, Deploy Ready guide, PR template, **A+ (96/100) Security Review**

> Security grade: **A+ (96/100)** — comprehensive review attached in repo.

---

## Details

### Security / Headers

- Enforce CSP with **nonce + `strict-dynamic`**, no `unsafe-eval`
- HSTS (1 year), X-Frame-Options=DENY
- COOP/CORP, Referrer-Policy, Permissions-Policy tightened
- Preview uses meta CSP (expected). **Production** uses response headers.

### Pagination v1

- **Keyset** by `created_at` (avoids offset enumeration)
- 20/page; “Load older” at top; order preserved
- `aria-live="polite"`, disabled state during load
- DB index: `messages(conversation_id, created_at DESC)` for perf

### Tests / CI

- **CSP smoke** (Playwright) to catch regression/blank-screen
- e2e scaffolding for pagination, auth, a11y
- GH Actions uploads artifacts for debugging

### Developer Experience

- Vite upgraded to `^5.4.21`
- Radix ref warnings resolved via `forwardRef`

### Documentation (repo)

- `deliverables/RELEASE_NOTES_vNEXT.md`
- `review/DEPLOY_READY.md`
- `docs/SECURITY_REVIEW_2025-10-21.md`
- `deliverables/PR_DESCRIPTION_SECURITY_REVIEW.md`
- `deliverables/QUICK_SHIP_CARD_2025-10-21.md`

---

## Verify After Deploy

```bash
# 1) replace with your live URL
URL="https://<YOUR-VERCEL-URL>"

# 2) headers check (CSP, XFO, HSTS, COOP/CORP, Referrer, Permissions)
curl -sI "$URL" | grep -iE \
  "content-security-policy|x-frame-options|strict-transport-security|cross-origin-opener-policy|cross-origin-resource-policy|referrer-policy|permissions-policy"

# 3) CSP smoke (should pass)
BASE_URL="$URL" npx playwright test -g "CSP smoke" --reporter=line
```

### Breaking Changes

None.

### Recommended Follow-ups (optional)

- Enable native Supabase HIBP as a backup layer (defense-in-depth)
- Consider replacing style-src 'unsafe-inline' with nonced/external styles

### Credits

Thanks to the team for fast root-cause, ship-ready guardrails, and world-class security docs.
