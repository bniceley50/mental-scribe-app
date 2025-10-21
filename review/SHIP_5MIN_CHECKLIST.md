# 🚀 5-Minute Ship Checklist

## Pre-Merge

### 1. Push branch and open PR
```bash
git push origin feat/csp-production-fix
# Open PR on GitHub with body from review/GITHUB_PR_BODY.md
```

### 2. Verify CI is green
- Wait for **Preview CSP Smoke** workflow to complete
- Alternatively, run locally:
```bash
npm run test:smoke:preview
# Expected: ✓ 1 passed (5-10s)
```

### 3. Merge to main
```bash
# On GitHub: Click "Squash and merge"
# Or via CLI:
git checkout main
git pull
git merge --squash feat/csp-production-fix
git commit -m "fix: production blank screen + CSP guardrail"
git push
```

---

## Tag & Release

```bash
# Pull latest main
git checkout main && git pull

# Create version tag
npm version patch -m "release: production blank screen fix + CSP guardrail"

# Push with tags
git push && git push --tags
```

---

## Deploy (Vercel)

### Automatic Deploy
- Vercel auto-deploys from `main` branch
- Wait for deployment notification

### Manual Deploy (if needed)
```bash
# From Vercel dashboard:
# Deployments → main → Deploy
```

---

## Post-Deploy Validation

### 1. Open production URL in browser

### 2. Check response headers (Network tab)
Navigate to `/auth` and verify headers on any request:

**Required Headers:**
- ✅ `Content-Security-Policy: default-src 'self'; ...`
- ✅ `X-Frame-Options: DENY`
- ✅ `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- ✅ `Cross-Origin-Opener-Policy: same-origin`
- ✅ `Cross-Origin-Resource-Policy: same-origin`
- ✅ `Referrer-Policy: no-referrer`
- ✅ `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- ✅ `X-Content-Type-Options: nosniff`

### 3. Visual verification
- ✅ Page renders (no blank screen)
- ✅ Auth form displays correctly
- ✅ Console has no CSP violations
- ✅ No red errors in console

### 4. Functional smoke test
```bash
# Test critical paths:
1. Navigate to /auth
2. Sign in with test credentials
3. Dashboard loads
4. Create a test note
5. Sign out
```

---

## Rollback Plan (if needed)

### Option 1: Git revert
```bash
git checkout main
git revert --no-edit HEAD
git push
```

### Option 2: Vercel rollback
```bash
# From Vercel dashboard:
# Deployments → Previous deployment → "Promote to Production"
```

### Option 3: Redeploy previous tag
```bash
git checkout v1.1.0  # or previous tag
git push --force origin main
```

---

## Sanity Check: Files That Should Exist

Run this to verify all critical files are present:

```bash
# Check files exist
test -f vercel.json && echo "✅ vercel.json" || echo "❌ vercel.json MISSING"
test -f test/e2e/csp-smoke.spec.ts && echo "✅ csp-smoke.spec.ts" || echo "❌ csp-smoke.spec.ts MISSING"
test -f .github/workflows/preview-smoke.yml && echo "✅ preview-smoke.yml" || echo "❌ preview-smoke.yml MISSING"

# Verify package.json scripts
grep -q "test:smoke" package.json && echo "✅ test:smoke script" || echo "❌ test:smoke script MISSING"
grep -q "test:smoke:preview" package.json && echo "✅ test:smoke:preview script" || echo "❌ test:smoke:preview script MISSING"

# Verify dependencies
grep -q "concurrently" package.json && echo "✅ concurrently" || echo "❌ concurrently MISSING"
grep -q "wait-on" package.json && echo "✅ wait-on" || echo "❌ wait-on MISSING"
```

---

## Quick Local Re-Verification

Before pushing to production, run one final local check:

```bash
# Clean install
npm ci

# Run full smoke test suite
npm run test:smoke:preview

# Expected output:
# ✓ built in ~25s
# ✓ preview started on http://localhost:4173
# ✓ 1 passed (5-10s)
```

If that's green, you're **GO FOR SHIP** 🚢

---

## Success Criteria

- [ ] PR merged to main
- [ ] Git tag created and pushed
- [ ] Vercel deployment successful
- [ ] Production headers verified (CSP, HSTS, XFO, etc.)
- [ ] Production page renders (no blank screen)
- [ ] Console clean (no CSP violations)
- [ ] Smoke test passing locally and in CI

---

## Communication Template

### For Team Slack/Discord
```
🚢 Deployed v1.2.0 - Production Blank Screen Fix

✅ Fixed: Production blank screen (CSP + treeshake)
✅ Added: CSP smoke test guardrail
✅ Improved: Auth UX (autocomplete, input hygiene)

Verified:
• Production headers: CSP, HSTS, XFO ✓
• Page renders correctly ✓
• No console errors ✓

Deploy: https://mental-scribe.vercel.app
```

### For Stakeholders
```
Production deployment complete - Critical blank screen issue resolved.

The application now includes automated testing to prevent CSP regressions
and enhanced security headers for production deployments.

All systems operational.
```
