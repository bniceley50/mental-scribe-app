# ✅ Go/No-Go Ship Checklist

**Date**: October 19, 2025  
**PR**: [#8](https://github.com/bniceley50/mental-scribe-app/pull/8)  
**Branch**: `chore/ci-hardening`

---

## ✅ Final Verdict

- [x] **Security proof**: PASS (3/3) — `csp_strict`, `no_secrets_in_dist`, `e2e_smoke`
- [x] **Code quality**: 0 TypeScript errors, 0 ESLint errors
- [x] **Build**: success; source maps: none in prod
- [x] **Bundle**: ~0.08 MB optimized (per summary)
- [x] **Artifacts present**: 
  - `security/summary.json`
  - `security/artifacts/playwright.json`
  - `security/artifacts/csp-evaluator.txt`
  - `proof/PROOF.md`
  - Review deliverables (`review/REVIEW.md`, `review/findings.json`, etc.)

**Decision**: ✅ **GO FOR SHIP**

---

## 🔎 Quick Sanity Before Merge (30–60s)

```bash
git fetch --all --prune
git switch chore/ci-hardening && git rev-parse --short HEAD
npm ci
npm run build
npm run sec:prove   # should exit 0
```

**Expected**: All commands succeed, `sec:prove` exits with code `0`

---

## 🚀 Merge & Release

### Option A: Recommended (GitHub UI)

1. **Merge the PR**:
   - Open https://github.com/bniceley50/mental-scribe-app/pull/8
   - Click "Merge pull request" (prefer **"Create a merge commit"** to preserve proof trail)
   - Confirm merge

2. **Tag the release**:
   ```bash
   git checkout main && git pull
   npm version patch -m "release: security hardening (3/3)"
   git push origin main --tags
   ```

3. **Create GitHub Release**:
   - Go to https://github.com/bniceley50/mental-scribe-app/releases/new
   - Select the new tag (e.g., `v0.0.1`)
   - Title: "Security Hardening Release (3/3 Proof)"
   - Attach proof artifacts:
     - `proof/PROOF.md`
     - `security/summary.json`
     - `security/artifacts/playwright.json`
     - `security/artifacts/csp-evaluator.txt`
     - `review/REVIEW.md`
     - `review/findings.json`
   - Publish release

### Option B: CLI Alternative (No UI)

```bash
git checkout main && git pull
git merge --no-ff chore/ci-hardening -m "merge: security hardening (3/3)"
npm version patch -m "release: security hardening"
git push origin main --tags
```

**Or use the automated script**:
```powershell
.\scripts\merge-and-release.ps1
```

---

## 🛡️ Post-Merge Hardening (Quick Wins)

### Immediate (Same Day)

- [ ] **Branch protection** (`main`): Require passing checks for `build`, `tsc`, `eslint`, `security-proof`
  - Go to: Settings → Branches → Add rule for `main`
  - Check: "Require status checks to pass before merging"
  - Select: `build`, `tsc`, `eslint`, `security-proof` workflows

- [ ] **CI gates**: Require security proof on PRs to `main`
  - Already configured in `.github/workflows/security-proof.yml`
  - Verify it runs on next PR

- [ ] **Evidence retention**: Keep proof artifacts attached to GitHub Release
  - Already covered if using GitHub Releases (Option A above)

- [ ] **Housekeeping**: Delete `chore/ci-hardening` branch after merge
  ```bash
  git branch -d chore/ci-hardening
  git push origin --delete chore/ci-hardening
  ```

### Recommended (Within 1 Week)

- [ ] **Nightly proof cron**: Add scheduled CI run
  ```yaml
  # Add to .github/workflows/security-proof.yml
  on:
    schedule:
      - cron: '0 2 * * *'  # 2 AM daily
  ```

- [ ] **Slack/Discord notifications**: Set up CI alerts for proof failures

- [ ] **Documentation**: Add security badge to README
  ```markdown
  ![Security Proof](https://img.shields.io/badge/security%20proof-3%2F3-success)
  ```

---

## 🧪 Nice-to-Add Next (Non-Blocking)

### Short-term Enhancements

- [ ] **A11y testing**: Add Playwright + axe-core smoke
  ```bash
  npm install -D @axe-core/playwright
  # Add test: security/artifacts/a11y.json
  ```

- [ ] **Perf budgets**: Add bundle-size budget in CI
  ```json
  // package.json
  "bundlesize": [
    { "path": "dist/assets/*.js", "maxSize": "100 kB" }
  ]
  ```

- [ ] **CSP reporting endpoint**: Enable `report-to`/`report-uri`
  - Set up endpoint for CSP violation telemetry

- [ ] **SBOM**: Publish CycloneDX SBOM on release
  ```bash
  npx @cyclonedx/cyclonedx-npm --output-file sbom.json
  ```

- [ ] **Trusted Types**: Plan migration to full enforcement
  - Audit current usage, plan migration strategy

---

## 🧯 Rollback (Just in Case)

If something regresses post-merge:

```bash
git checkout main
git log --oneline            # copy the merge SHA
git revert <merge-sha> -m 1  # revert the merge
git push origin main
```

**Or redeploy previous release tag**:
- Go to GitHub Releases
- Select previous version
- Download artifacts
- Deploy from that tag

**Rollback validation**:
```bash
git checkout <previous-tag>
npm ci
npm run build
npm run sec:prove  # should still pass 3/3
```

---

## 📋 Checklist Summary

**Pre-Merge**:
- [x] Security proof 3/3
- [x] All quality checks passing
- [x] Artifacts committed
- [x] Documentation complete
- [ ] Final sanity check (30-60s commands above)

**Merge**:
- [ ] PR merged to `main`
- [ ] Version tag created (`npm version patch`)
- [ ] Tag pushed to remote
- [ ] GitHub Release created with artifacts

**Post-Merge**:
- [ ] Branch protection enabled
- [ ] CI verified on `main`
- [ ] Feature branch deleted
- [ ] Security badge added (optional)

**Status**: ✅ READY TO SHIP

---

**Questions or blockers?** See `review/REVIEWER_BLURB.md` for detailed context.
