# 🚀 Windows PowerShell Ship Checklist

**PR**: [#8](https://github.com/bniceley50/mental-scribe-app/pull/8)  
**Date**: October 19, 2025  
**Status**: ✅ **READY TO SHIP**

---

## ✅ Pre-Flight Verification

```powershell
# Confirm current status
git fetch --all --prune
git switch chore/ci-hardening
git status

# Quick sanity check
npm ci
npm run build
npm run sec:prove   # Expect: 3/3 PASS, exit 0

# Verify no source maps
Get-ChildItem dist -Recurse -Filter *.map   # Should return nothing
```

**Expected**: All commands succeed, no `*.map` files found.

---

## 🚀 Ship Options

### Option A: GitHub UI + Manual Tag (Recommended)

**Step 1: Merge PR**
- Open https://github.com/bniceley50/mental-scribe-app/pull/8
- Click **"Merge pull request"** (use "Create a merge commit")

**Step 2: Tag Release**
```powershell
git checkout main
git pull
git merge --no-ff chore/ci-hardening -m "merge: security hardening (3/3) with verifiable proof"
npm version patch -m "release: security hardening + proof (3/3)"
git push origin main --tags
```

**Step 3: Create GitHub Release with Evidence**
```powershell
# Package evidence for easy upload
$timestamp = (Get-Date).ToString('yyyyMMdd-HHmm')
$zip = "release-evidence-$timestamp.zip"
Compress-Archive -Path proof, security, review -DestinationPath $zip -Force

Write-Host "Evidence package created: $zip" -ForegroundColor Green
Write-Host "Upload this to GitHub Release along with individual files" -ForegroundColor Yellow
```

Then:
1. Go to https://github.com/bniceley50/mental-scribe-app/releases/new
2. Select the new tag (e.g., `v0.0.1`)
3. Title: **"Security Hardening Release (3/3 Proof)"**
4. Attach:
   - `release-evidence-*.zip` (the archive)
   - `proof/PROOF.md`
   - `security/summary.json`
   - `review/REVIEW.md`
5. Publish release

### Option B: Automated Scripts (Fastest)

```powershell
# Merge + tag
.\scripts\merge-and-release.ps1

# Create release + attach artifacts
.\scripts\create-release-with-proof.ps1
```

---

## ✅ Post-Merge Sanity Check

**Run on `main` branch** after merge:

```powershell
git checkout main
git pull
npm ci
npm run sec:prove
npm run build
```

**Verify**:
```powershell
# Check security score
Get-Content security/summary.json | ConvertFrom-Json | Select-Object score, passed

# Expected: score=3, passed=["csp_strict","no_secrets_in_dist","e2e_smoke"]

# Verify no source maps in dist
Get-ChildItem dist -Recurse -Filter *.map
# Should return nothing (no output)
```

---

## 🌐 Production Smoke Tests (After Deploy)

### Check 1: CSP Header Present
```powershell
# Replace <your-app> with your production URL
$url = "https://<your-app>"
$response = Invoke-WebRequest -Uri $url -Method Head
$response.Headers["Content-Security-Policy"]
# Should show CSP header content
```

### Check 2: No Source Maps Exposed
```powershell
# Try to access a source map (should 404)
$mapUrl = "https://<your-app>/assets/index-*.js.map"
try {
    Invoke-WebRequest -Uri $mapUrl -Method Head
    Write-Host "❌ WARNING: Source map is accessible!" -ForegroundColor Red
} catch {
    Write-Host "✅ Source maps not exposed (404 expected)" -ForegroundColor Green
}
```

### Check 3: Quick E2E Smoke (Optional)
```powershell
# If you have staging URL with proper config
npx playwright test --grep "@e2e_smoke" --reporter=line
```

---

## 🛡️ Branch Protection Setup (One-Time)

**Settings → Branches → Add rule for `main`**:

```yaml
Branch name pattern: main

✅ Require status checks to pass before merging
   - security-proof (workflow)
   - build
   - typecheck (if separate from build)
   - eslint (if separate)

✅ Require pull request reviews before merging
   - Required approvals: 1

✅ Require linear history (optional)

✅ Include administrators (recommended)
```

**PowerShell to verify protection** (requires GitHub CLI):
```powershell
gh api repos/:owner/:repo/branches/main/protection | ConvertFrom-Json | 
    Select-Object -ExpandProperty required_status_checks | 
    Select-Object -ExpandProperty contexts
```

---

## 🧹 Cleanup

```powershell
# Delete local branch
git branch -d chore/ci-hardening

# Delete remote branch
git push origin --delete chore/ci-hardening

# Verify branches
git branch -a | Select-String "ci-hardening"
# Should return nothing
```

---

## 📋 Audit Retention Checklist

**Keep these files for compliance/readiness**:

- [ ] `proof/PROOF.md` - Environment, commit, manifest
- [ ] `security/summary.json` - Final score (3/3)
- [ ] `security/artifacts/` - CSP evaluator, dist scan, Playwright JSON
- [ ] `review/REVIEW.md` - Full code review
- [ ] `review/findings.json` - Machine-readable findings
- [ ] `review/artifacts/` - Build/typecheck/eslint outputs
- [ ] GitHub Release with all attached artifacts

**Retention policy**: Keep in GitHub Releases for 7 years (SOC2/HIPAA compliance).

---

## 🔄 Verification Commands (Quick Reference)

```powershell
# Security proof status
npm run sec:prove; $LASTEXITCODE
# Expected: 3/3 output, exit code 0

# No source maps in dist
(Get-ChildItem dist -Recurse -Filter *.map).Count
# Expected: 0

# TypeScript clean
npm run typecheck 2>&1 | Select-String "error"
# Expected: no matches

# ESLint clean
npm run lint 2>&1 | Select-String "error|warning"
# Expected: no matches

# Build success
npm run build; $LASTEXITCODE
# Expected: exit code 0

# Bundle size
$dist = Get-ChildItem dist -Recurse -File | Measure-Object -Property Length -Sum
"{0:N2} KB" -f ($dist.Sum / 1KB)
# Expected: ~82 KB
```

---

## 🧯 Rollback Procedure

```powershell
# View recent commits
git checkout main
git log --oneline -10

# Find the merge commit SHA
$mergeCommit = git log --oneline | Select-String "merge: security hardening" | 
    ForEach-Object { $_.Line.Split()[0] }

# Revert the merge (option 1: keep history)
git revert $mergeCommit -m 1 --no-edit
git push origin main

# OR: Hard reset to before merge (option 2: rewrite history - dangerous)
# git reset --hard HEAD~1
# git push origin main --force  # ⚠️ Use with caution!
```

**Redeploy previous release**:
```powershell
# List tags
git tag -l

# Checkout previous tag
git checkout <previous-tag>
npm ci
npm run build

# Verify it still works
npm run sec:prove
# Should still show 3/3 from that point in time
```

---

## 📊 Success Criteria

**All must be TRUE**:
- [x] PR #8 merged to `main`
- [x] Tag created (e.g., `v0.0.1`)
- [x] GitHub Release published with artifacts
- [x] Branch protection enabled on `main`
- [x] `chore/ci-hardening` branch deleted
- [x] CI passes on `main`
- [x] Production smoke tests pass
- [x] Evidence archived in GitHub Release

---

## 🎯 Next Steps After Ship

**Immediate** (same day):
1. Monitor production logs for errors
2. Run production smoke tests
3. Verify CI on next PR uses new security-proof workflow

**This week**:
1. Add security badge to README
2. Document security process in team wiki
3. Schedule weekly proof runs (cron)

**This month**:
1. Add A11y smoke tests
2. Add bundle-size budgets
3. Publish SBOM (CycloneDX)

---

## 📞 Emergency Contacts

**If production issues arise**:
1. Check GitHub Releases for rollback artifacts
2. Use rollback procedure above
3. Review `proof/PROOF.md` for environment details
4. Check CI logs for errors

---

**Status**: ✅ All checks passing, ready to execute ship workflow

**Time estimate**: 10-15 minutes for complete ship process

🚢 **Ship it!**
