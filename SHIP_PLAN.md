# 🚢 SHIP PLAN - Quick Reference

**PR**: [#8](https://github.com/bniceley50/mental-scribe-app/pull/8) | **Status**: ✅ **GO**

---

## ✅ Final Verdict

```
✅ Security proof: PASS (3/3) — csp_strict, no_secrets_in_dist, e2e_smoke
✅ Quality: 0 TypeScript errors, 0 ESLint errors
✅ Build: OK; no prod source maps
✅ Bundle: ~0.08 MB optimized
✅ Evidence: security/summary.json, security/artifacts/*, proof/PROOF.md, review/*
```

**Decision**: 🚀 **SHIP IT**

---

## 🔎 60-Second Sanity (Optional)

```bash
git fetch --all --prune
git switch chore/ci-hardening && git rev-parse --short HEAD
npm ci
npm run build
npm run sec:prove   # expect exit 0
```

---

## 🚀 Merge & Tag

### GitHub UI (Recommended)

1. **Merge PR**: https://github.com/bniceley50/mental-scribe-app/pull/8
   - Click "Merge pull request" (keep merge commit for audit trail)

2. **Tag Release**:
   ```bash
   git checkout main && git pull
   npm version patch -m "release: security hardening (3/3)"
   git push origin main --tags
   ```

3. **Create GitHub Release**:
   - Go to https://github.com/bniceley50/mental-scribe-app/releases/new
   - Select new tag (e.g., `v0.0.1`)
   - Title: "Security Hardening Release (3/3 Proof)"
   - **Attach proof artifacts**:
     - `proof/PROOF.md`
     - `security/summary.json`
     - `security/artifacts/playwright.json`
     - `security/artifacts/csp-evaluator.txt`
     - `review/REVIEW.md`
     - `review/findings.json`
   - Publish

### Automated (PowerShell)

```powershell
# Merge + tag
.\scripts\merge-and-release.ps1

# Create release with artifacts
.\scripts\create-release-with-proof.ps1
```

---

## 🛡️ Post-Merge Hardening (Fast)

### Immediate (5 min)

- [ ] **Branch protection** on `main`:
  - Settings → Branches → Add rule
  - Require status checks: `build`, `tsc`, `eslint`, `security-proof`

- [ ] **Cleanup**: Delete `chore/ci-hardening` branch
  ```bash
  git branch -d chore/ci-hardening
  git push origin --delete chore/ci-hardening
  ```

### Recommended (Same Day)

- [ ] **CI gates**: Verify `security-proof` workflow runs on next PR
- [ ] **Retention**: Confirm proof artifacts attached to GitHub Release
- [ ] **Nightly cron**: Add to `.github/workflows/security-proof.yml`:
  ```yaml
  on:
    schedule:
      - cron: '0 2 * * *'  # 2 AM daily
  ```

---

## 🔧 Nice-to-Add (Not Blockers)

- [ ] A11y smoke via Playwright + axe-core (`@a11y` tag)
- [ ] Bundle-size budget gate in CI
- [ ] CSP report-only/Report-To endpoint for telemetry
- [ ] Publish CycloneDX SBOM on release
- [ ] Full Trusted Types enforcement (if not already)

---

## 🧯 Rollback Plan

```bash
git checkout main
git log --oneline          # copy the merge SHA
git revert <merge-sha> -m 1
git push origin main
# or redeploy previous release tag from GitHub Releases
```

---

## 📚 Documentation Quick Links

| Need | Document |
|------|----------|
| **Ship decision** | `GO_NO_GO_CHECKLIST.md` |
| **Complete overview** | `COMPLETE_SHIP_PACKAGE.md` |
| **Technical review** | `review/REVIEWER_BLURB.md` |
| **Executive summary** | `review/PR_SUMMARY_VARIANTS.md` (stakeholder) |
| **Compliance language** | `review/PR_SUMMARY_VARIANTS.md` (audit) |
| **Audit trail** | `proof/PROOF.md` |
| **Code review** | `review/REVIEW.md` |

---

## 🎯 What to Do Right Now

**Choice A**: GitHub UI (3 steps)
1. Merge PR #8
2. Run tag commands (3 lines)
3. Create GitHub Release + attach artifacts

**Choice B**: Automated (2 commands)
```powershell
.\scripts\merge-and-release.ps1
.\scripts\create-release-with-proof.ps1
```

**Choice C**: Follow detailed checklist
→ See `GO_NO_GO_CHECKLIST.md`

---

**Status**: ✅ All green, ready to deploy  
**Next**: Execute merge workflow (A, B, or C above)

🚢 **Ship it!**
