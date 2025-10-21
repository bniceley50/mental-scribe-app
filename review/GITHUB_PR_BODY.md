## Security & Stability: Fix Production Blank Screen + CSP Guardrail

### What changed
- **Fix**: Removed CSP-breaking inline `onload` on fonts; simplified to stylesheet link.
- **Fix**: Removed over-aggressive `treeshake.moduleSideEffects: false` that dropped React bootstrap.
- **Prod headers**: Added `vercel.json` with CSP, HSTS, X-Frame-Options, COOP/CORP, Referrer-Policy, Permissions-Policy.
- **Guardrail**: Added Playwright CSP smoke spec + scripts; optional CI workflow to run against Vite preview.
- **UX quick wins**: Auth inputs now have `autocomplete`, `autoCapitalize="none"`, `spellCheck={false}`.  
  `badge.tsx` and `NoteTemplates.tsx` converted to `forwardRef` to silence Radix ref warnings.

### How to verify
```bash
npm ci
npm run build
npm run test:smoke:preview   # builds, previews on :4173, runs smoke, tears down
```

**Expected:**
- `/` renders (no blank page), `#root` has children.
- No "Refused to … Content Security Policy" console errors in preview.
- In prod (after deploy), response headers include CSP, HSTS, XFO, COOP/CORP, Referrer-Policy, Permissions-Policy.

**Risk:** Low. Changes are scoped, CSP is enforced by headers, and regression is guarded by the smoke test.

**Follow-ups (not blocking):**
- Add Lighthouse CI on PRs (optional file included).
- Expand Playwright coverage for main user flows.
- Ensure any future `<Select>` usages are controlled (value/defaultValue).

**Verdict:** ✅ **GO FOR MERGE**

---

### Files Changed

#### Core Fixes
- `index.html` — Removed inline `onload` handler on font preload
- `vite.config.ts` — Removed `treeshake.moduleSideEffects: false`

#### Security & Headers
- `vercel.json` — Production security headers (CSP, HSTS, X-Frame-Options, etc.)

#### Testing & CI
- `test/e2e/csp-smoke.spec.ts` — Playwright smoke test (render + CSP check)
- `.github/workflows/preview-smoke.yml` — CI workflow for PRs
- `package.json` — Added `test:smoke` and `test:smoke:preview` scripts

#### UX Improvements
- `src/pages/Auth.tsx` — Added autocomplete attributes, input hygiene
- `src/components/ui/badge.tsx` — Converted to `React.forwardRef`
- `src/components/NoteTemplates.tsx` — Converted to `React.forwardRef`

---

### Verification Results

| Gate | Status | Evidence |
|------|--------|----------|
| Build (vite) | ✅ PASS | `npm run build` → exit 0 |
| Preview render | ✅ PASS | http://localhost:4173 shows auth page |
| CSP smoke (Playwright) | ✅ PASS | `npm run test:smoke:preview` (1/1 passed) |
| Console errors | ✅ CLEAN | No blocking CSP errors in preview |
| Prod headers (vercel) | ✅ READY | vercel.json with full CSP + security headers |
| CI guardrail | ✅ READY | preview-smoke.yml runs on PRs |
