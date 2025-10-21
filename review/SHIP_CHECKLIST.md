# 🚀 Production Fix: CSP + Auth UX + Ref Warnings

## Status: ✅ Ready to Ship

### Fixes
- **CRITICAL**: Production blank screen (CSP + treeshake interaction)
- Auth UX improvements (autocomplete, input hygiene)
- React ref warnings (Radix Tooltip/Dialog asChild)

### Guards
- Playwright CSP smoke test on preview
- GitHub Actions workflow runs on every PR

### Evidence
- ✅ Build: Success
- ✅ Preview: http://localhost:4173 renders auth page
- ✅ Smoke test: 1 passed (root hydrates; no CSP violations)
- ✅ Console: Clean (only benign meta CSP frame-ancestors note in preview)

---

## Changes

### Auth.tsx
Added proper input attributes for better UX and security:
- `autoComplete="email"` / `"current-password"` / `"new-password"`
- `autoCapitalize="none"` and `spellCheck={false}` on all auth inputs
- Applied to: sign-in, sign-up, password reset, and MFA flows

### badge.tsx
Converted to `React.forwardRef<HTMLDivElement, BadgeProps>`:
- Enables safe use as Radix `TooltipTrigger` / `DialogTrigger` child
- Eliminates ref forwarding warnings in console

### NoteTemplates.tsx
Converted to `React.forwardRef<HTMLButtonElement, NoteTemplatesProps>`:
- Forwards ref to trigger `<Button>` for external focus/control
- Removes ref warnings from Radix Dialog usage

### test/e2e/csp-smoke.spec.ts
Added CSP regression guard:
- Verifies root element renders (children > 0)
- Ensures no blocking CSP violations in console
- Runs against production preview build

### package.json
Updated scripts for consistency:
- `preview`: Added `--strictPort` flag
- `test:smoke`: Direct path to CSP smoke spec
- `test:smoke:preview`: Uses `npm:` prefix and `127.0.0.1` for CI compatibility

### .github/workflows/preview-smoke.yml
New CI workflow:
- Runs on PRs to main, develop, chore/**, feat/**
- Builds + previews + runs CSP smoke test
- Uploads test results on failure
- Timeout: 15 minutes

### vercel.json
Enhanced Permissions-Policy:
- Added `camera=(), microphone=()` alongside existing `geolocation=()`
- All other security headers unchanged (CSP, HSTS, X-Frame-Options, etc.)

---

## Manual Verification

### Local Preview
```bash
npm run build && npm run preview
# → http://localhost:4173 renders auth page
# → Console clean (only benign meta CSP frame-ancestors note)
```

### Smoke Test
```bash
npm run test:smoke:preview
# → ✓ 1 passed (5.2s)
```

---

## Deployment Checklist

- [ ] **CI green**: Preview CSP Smoke workflow passes on PR
- [ ] **Merge**: Squash and merge to main
- [ ] **Deploy**: Verify Vercel deployment succeeds
- [ ] **Headers check**: Open prod Network tab → verify CSP, X-Frame-Options, HSTS present
- [ ] **Spot check**: Navigate to `/` and `/auth` → pages render, console clean
- [ ] **Tag release**: Create tag with message "Fix: Production blank screen + CSP guardrails"

---

## Follow-ups (Non-blocking)

### High Value
1. **Extend autocomplete coverage**
   - Scan for any remaining password/email inputs
   - Add appropriate autocomplete attributes

2. **Ref forwarding unit test**
   - Add test to assert `badge.tsx` forwards refs correctly
   - Prevents future regressions

### Medium Value
3. **Select control convention**
   - If/when Select is used: enforce `value + onValueChange` or `defaultValue`
   - Consider ESLint rule to flag uncontrolled Select.Root

4. **Lighthouse CI**
   - Optional: Add workflow to run Lighthouse on deploy preview
   - Focus on performance + accessibility (2-3 min runtime)

---

## Technical Notes

### CSP Meta vs Headers
- **Preview**: Uses meta CSP (logs "frame-ancestors ignored" warning - expected)
- **Production**: Vercel serves CSP via response headers (correct behavior)
- Meta CSP is benign for local dev; production headers supersede

### Treeshake Side Effects
- Removed `moduleSideEffects: false` from vite.config.ts rollup options
- Preserves React bootstrap entry point (prevents blank screen)

### Playwright Config
- Tests located in `test/e2e/` to match `testDir` in playwright.config.ts
- Smoke test runs against port 4173 (Vite preview default)
