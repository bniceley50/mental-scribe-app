# 🎯 Final GO/NO-GO Decision Matrix

Run this checklist before hitting "Merge" to ensure everything is ready for production.

---

## Quality Gates

| Gate | Status | Command / Evidence | Pass Criteria |
|------|--------|-------------------|---------------|
| **Build (Vite)** | ⬜ | `npm run build` | Exit code 0, no errors |
| **Preview Render** | ⬜ | `npm run preview` → http://localhost:4173 | Auth page visible, #root has children |
| **CSP Smoke Test** | ⬜ | `npm run test:smoke:preview` | 1/1 passed (5-10s runtime) |
| **Console Errors** | ⬜ | Open preview → F12 → Console | No "Refused to..." CSP errors |
| **Production Headers** | ⬜ | Check `vercel.json` exists | CSP, HSTS, XFO, COOP/CORP present |
| **CI Workflow** | ⬜ | Check `.github/workflows/preview-smoke.yml` | File exists and valid YAML |
| **Dependencies** | ⬜ | `npm ls concurrently wait-on` | Both installed in devDependencies |
| **Scripts** | ⬜ | Check `package.json` | test:smoke and test:smoke:preview present |

---

## Quick Verification Commands

Run these in order. All must pass before merging:

```bash
# 1. Clean install
npm ci

# 2. Build check
npm run build
# ✅ Expected: "✓ built in ~25s", exit 0

# 3. Full smoke test
npm run test:smoke:preview
# ✅ Expected: "✓ 1 passed (5-10s)"

# 4. Verify files exist
ls -la vercel.json test/e2e/csp-smoke.spec.ts .github/workflows/preview-smoke.yml
# ✅ Expected: All files present

# 5. Check package.json has required scripts
grep -E "test:smoke|concurrently|wait-on" package.json
# ✅ Expected: All present
```

---

## Risk Assessment

### ✅ LOW RISK - Safe to Merge
- All gates above are ✅ PASS
- Changes are scoped (CSP, headers, ref fixes)
- Smoke test guards regressions
- Rollback plan documented

### ⚠️ MEDIUM RISK - Review Needed
- 1-2 gates are ⬜ PENDING or ❌ FAIL
- New console warnings (but not errors)
- CI not yet configured (can merge, add CI later)

### 🚨 HIGH RISK - DO NOT MERGE
- Build fails
- Preview shows blank screen
- CSP smoke test fails
- Console has blocking CSP violations

---

## Decision Tree

```
START
  │
  ├─ All gates PASS? ───── YES ───► GO FOR MERGE ✅
  │                                  │
  │                                  └─► Tag & Deploy
  │
  └─ Any gate FAIL? ───── YES ───► NO-GO 🚫
                                     │
                                     ├─► Fix issues
                                     └─► Re-run checklist
```

---

## Final Verification (30 seconds)

Before clicking "Merge", confirm:

- [ ] I ran `npm run test:smoke:preview` locally and it passed
- [ ] I reviewed the changes in the PR diff
- [ ] I confirmed `vercel.json` has production headers
- [ ] I verified the CI workflow file exists (if using CI)
- [ ] I have a rollback plan if something goes wrong
- [ ] I communicated the deployment to the team (if applicable)

---

## Sign-Off

**Reviewed by:** ________________  
**Date:** ________________  
**Decision:** ⬜ GO FOR MERGE  |  ⬜ NO-GO (fix issues)

**Notes:**
```
[Add any additional context, concerns, or follow-up items]
```

---

## After Merge

Once merged, immediately verify:

1. **Vercel deploys successfully** (check dashboard)
2. **Production headers present** (Network tab → any request)
3. **No console errors** (open prod site, check F12 console)
4. **Page renders** (no blank screen)

If ANY of these fail:
```bash
# Immediate rollback
git checkout main
git revert --no-edit HEAD
git push
```

Then investigate and fix before re-deploying.

---

## Status: _____________

**Last Updated:** _____________  
**Next Review:** After production verification
