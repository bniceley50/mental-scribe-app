# 🚀 PRESS THE BUTTON - Deploy Now Guide

**All gates green ✅ | Ready to ship | Copy-paste & go**

---

## ⚡ DEPLOY NOW (3 commands, 10 seconds)

### Bash / Linux / macOS

```bash
# Step 1: Switch to main and sync
git checkout main && git pull

# Step 2: Merge feature branch (change branch name if needed)
git merge --no-ff chore/ci-hardening -m "merge: prod blank screen fix + CSP guardrails"

# Step 3: Tag, version bump, and push
npm version patch -m "release: security hardening + CSP smoke & headers"; git push && git push --tags
```

### PowerShell / Windows (use this)

```powershell
# Step 1: Switch to main and sync
git checkout main; git pull

# Step 2: Merge feature branch (change branch name if needed)
git merge --no-ff chore/ci-hardening -m "merge: prod blank screen fix + CSP guardrails"

# Step 3: Tag, version bump, and push
npm version patch -m "release: security hardening + CSP smoke & headers"; git push; git push --tags
```

**What happens next:**
- ✅ Git tag created (e.g., v1.0.1)
- ✅ package.json version bumped
- ✅ Vercel auto-deploys from main (~2 minutes)

**Wait for Vercel deploy notification, then proceed to verification ⬇️**

---

## 🔍 VERIFY DEPLOY (30 seconds)

### Replace URL and Run

**Bash / Linux / macOS:**
```bash
# 1. Set your Vercel URL
URL="https://your-app.vercel.app"

# 2. One-line header check
curl -sI "$URL" | awk 'BEGIN{IGNORECASE=1} /content-security-policy|x-frame-options|strict-transport-security|cross-origin|referrer-policy|permissions-policy/ {print}'

# 3. Live CSP smoke test
BASE_URL="$URL" npx playwright test -g "CSP smoke" --reporter=line
```

**PowerShell / Windows:**
```powershell
# 1. Set your Vercel URL
$URL = "https://your-app.vercel.app"

# 2. Header check
curl.exe -sI "$URL" | Select-String -Pattern "content-security-policy|x-frame-options|strict-transport-security|cross-origin|referrer-policy|permissions-policy" -CaseSensitive:$false

# 3. Live CSP smoke test
$env:BASE_URL = "$URL"; npx playwright test -g "CSP smoke" --reporter=line
```

### Expected Output

**Headers (8 lines):**
```text
content-security-policy: default-src 'self'; script-src 'self'...
x-frame-options: DENY
strict-transport-security: max-age=63072000...
cross-origin-opener-policy: same-origin
cross-origin-embedder-policy: require-corp
cross-origin-resource-policy: same-origin
referrer-policy: no-referrer
permissions-policy: camera=(), microphone=()...
```

**Smoke Test:**
```text
✓ CSP smoke test (1.2s)
1 passed (1.2s)
```

**Browser Check:**
- Open URL in browser
- ✅ Page renders (no blank screen)
- ✅ F12 → Console → No CSP violations
- ✅ F12 → Network → Headers → CSP present

---

## 🎉 SUCCESS - POST TO PR

Copy-paste this comment:

```markdown
## ✅ GO - Production Deployed & Verified

**URL:** https://your-app.vercel.app  
**Version:** v1.0.1  
**Timestamp:** [Your timestamp]

### Fixes Shipped
- ✅ Production blank screen (inline onload + treeshake)
- ✅ CSP via response headers (vercel.json)
- ✅ Auth UX improvements (autocomplete, input hygiene)
- ✅ React ref warnings (Badge, NoteTemplates forwardRef)
- ✅ CI/CD smoke tests + GitHub Actions workflow

### Quality Gates (All Passed)
| Gate | Status | Time |
|------|--------|------|
| Build | ✅ PASS | 24.89s |
| Preview | ✅ PASS | /auth renders |
| CSP Smoke | ✅ PASS | 1/1 tests (35.6s) |
| Console | ✅ Clean | No CSP violations |
| Prod Headers | ✅ Present | All 8 security headers |

### Post-Deploy Verification

**Headers Check:**
```bash
curl -sI "https://your-app.vercel.app" | awk 'BEGIN{IGNORECASE=1} /content-security-policy|x-frame-options|strict-transport-security|cross-origin|referrer-policy|permissions-policy/ {print}'
```
✅ All 8 security headers present

**Live Smoke Test:**
```bash
BASE_URL="https://your-app.vercel.app" npx playwright test -g "CSP smoke" --reporter=line
```
✅ 1/1 tests passed

**Browser Visual:**
- ✅ Page renders (no blank screen)
- ✅ Console clean (no CSP violations)
- ✅ Auth flow functional

### Risk Assessment
- **Risk:** LOW
- **Confidence:** HIGH
- **Rollback:** `git revert` + Vercel redeploy (~2 min)

**Status:** Production verified and stable ✅
```

---

## 🔄 ROLLBACK (if needed - only run if something fails)

### Option 1: Vercel UI (30 seconds - FASTEST)
1. Vercel Dashboard → **Deployments**
2. Find previous build → Click **⋮** → **Promote to Production**

### Option 2: Git Revert (2 minutes)

**Bash / Linux / macOS:**
```bash
git checkout main && git pull
git log --oneline -n 5           # Find merge commit SHA
git revert <merge_sha> -m 1      # Revert the merge
git push                         # Vercel auto-deploys revert
```

**PowerShell / Windows:**
```powershell
git checkout main; git pull
git log --oneline -n 5           # Find merge commit SHA
git revert <merge_sha> -m 1      # Revert the merge
git push                         # Vercel auto-deploys revert
```

**After rollback:** Re-run verification commands to confirm previous version restored.

---

## 🚨 TROUBLESHOOTING (if something hiccups)

### Issue: Preview won't start
```bash
# Manual start
npm run build && npm run preview
```
**Expected:** Server at http://localhost:4173

### Issue: Port mismatch
- Smoke test expects preview at `localhost:4173`
- Check `package.json` → `preview` script uses `--port 4173`
- Or set: `BASE_URL="http://localhost:YOUR_PORT"`

### Issue: Playwright not installed
```bash
npx playwright install --with-deps
```

### Issue: Scripts missing
**Check:**
```bash
cat package.json | grep -A 2 "test:smoke"
```
**Expected:**
- `test:smoke`: runs Playwright test
- `test:smoke:preview`: builds + previews + tests

**If missing dependencies:**
```bash
npm install --save-dev concurrently wait-on
```

### Issue: Meta CSP warning in preview
**Expected behavior:**
- Console shows: `The Content Security Policy directive 'frame-ancestors' is ignored when delivered in a <meta> element`
- This is **EXPECTED** in preview mode
- Production uses response headers (vercel.json) which enforce frame-ancestors correctly
- Not a blocker ✅

### Issue: Headers missing in production
1. Verify `vercel.json` is committed: `git ls-files | grep vercel.json`
2. Check Vercel deployment logs for errors
3. Try hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Check headers directly: `curl -sI https://your-app.vercel.app | head -20`

### Issue: Smoke test fails against live URL
```bash
# Run with UI to debug
BASE_URL="https://your-app.vercel.app" npx playwright test --ui

# Check console output
BASE_URL="https://your-app.vercel.app" npx playwright test -g "CSP smoke" --headed
```

---

## 📋 OPTIONAL NEXT STEPS

### 1. Enable Preview Smoke CI ✅ (Already configured)
Your `.github/workflows/preview-smoke.yml` runs on every PR to main/develop.

### 2. Add Lighthouse CI (5 minutes)
See `review/LIGHTHOUSE_OPTIONAL.md` for drop-in workflow.

### 3. Credential Rotation (Belt & Suspenders)
Since test credentials appeared in logs/screenshots:
- Rotate API keys in Vercel environment variables
- Change test user passwords in Supabase
- Review `.env` files for any exposed secrets

### 4. Branch Protection (One-time setup)
See `review/BRANCH_PROTECTION.md` for GitHub branch protection rules.

---

## 🎯 QUICK REFERENCE CARD

| Action | Command | Time |
|--------|---------|------|
| **Merge & Tag** | 3-line paste above | 10s |
| **Wait for Vercel** | Watch dashboard | ~2 min |
| **Header Check** | curl + awk | 5s |
| **Smoke Test** | BASE_URL + playwright | 10s |
| **Browser Visual** | Manual check | 2 min |
| **Total** | - | **~3 min** |

---

## ✅ VERIFICATION CHECKLIST

Before closing:

- [ ] Ran 3 merge/tag commands
- [ ] Vercel deployment succeeded (green checkmark)
- [ ] All 8 security headers present (curl check)
- [ ] CSP smoke test passed (playwright check)
- [ ] Page renders in browser (no blank screen)
- [ ] Console clean (no CSP violations)
- [ ] Auth flow works (basic login test)
- [ ] PR comment posted with results
- [ ] Team notified (if applicable)
- [ ] Previous deployment noted (for rollback reference)

---

## 📞 NEED HELP?

**If deploy fails:**
1. Check terminal output for error messages
2. Review Vercel deployment logs
3. Use rollback Option 1 (Vercel UI) to restore previous build
4. Share error messages for debugging

**If verification fails:**
1. Verify URL is correct (HTTPS, no typos)
2. Check if deployment is still in progress
3. Try hard refresh in browser
4. Run troubleshooting commands above

**Share for quick check:**
- Vercel deployment URL
- Output of header check command
- Output of smoke test command
- Browser console screenshot (if errors)

---

## 🚀 YOU'RE READY!

**Current Status:**
```text
✅ All 5 quality gates passed
✅ Ship pack complete (9 documents)
✅ Merge commands ready
✅ Verification commands ready
✅ Rollback plan documented
✅ Troubleshooting guide ready

CONFIDENCE: HIGH | RISK: LOW | STATUS: READY TO DEPLOY
```

**Next Action:** Copy the 3 merge/tag commands above and press enter! 🚢

---

*Created: October 20, 2025*  
*Last Verified: All gates green*  
*Documentation: review/ directory (9 files)*
