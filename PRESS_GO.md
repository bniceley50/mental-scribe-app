# 🚀 PRESS GO — Single Command Ship

## Status: ✅ READY TO SHIP

**Security Proof**: 3/3 PASS (exit 0)  
**Build**: Success (82.11 KB, no source maps)  
**Tests**: 1/1 passing  
**Documentation**: Complete (15+ files)

---

## One-Command Deploy

```powershell
.\scripts\ultimate-ship.ps1
```

**What it does:**
1. ✅ Pre-flight verification (build + security proof)
2. ✅ Artifact validation
3. ✅ Merge `chore/ci-hardening` → `main` (--no-ff)
4. ✅ Create version tag (`v1.1.0`)
5. ✅ Push to remote
6. ✅ Create GitHub Release with all evidence
7. ✅ Cleanup feature branch

**Time**: ~2 minutes  
**User input**: 2 confirmations (before merge, before push)

---

## Options

### Dry Run (no merge)
```powershell
.\scripts\ultimate-ship.ps1 -DryRun
```
Runs all checks but stops before merge.

### Skip Re-verification
```powershell
.\scripts\ultimate-ship.ps1 -SkipVerification
```
Use if you just ran `npm run sec:prove` successfully.

---

## Manual Fallback (if script fails)

```powershell
# 1. Verify
npm ci
npm run build
npm run sec:prove  # Must return exit 0

# 2. Merge
git checkout main
git pull --ff-only
git merge --no-ff chore/ci-hardening -m "merge: security hardening (3/3)"

# 3. Tag + Push
$ver = (node -p "require('./package.json').version")
git tag -a "v$ver" -m "release: security hardening (3/3)"
git push origin main --tags

# 4. Create Release
$notes = Get-Content -Raw .\COMPLETE_SHIP_PACKAGE.md
$assets = @(
  "security\summary.json",
  "proof\PROOF.md",
  "security\artifacts\playwright.json",
  "security\artifacts\csp-evaluator.txt"
)
gh release create "v$ver" $assets --title "Security Hardening — v$ver" --notes $notes
```

---

## Post-Ship Checklist

### Immediate (< 5 min)
- [ ] Verify CI passes on `main`
- [ ] Check GitHub Release created: https://github.com/bniceley50/mental-scribe-app/releases
- [ ] Smoke test production deployment

### Within 24 hours
- [ ] Enable branch protection on `main`
  ```powershell
  # Require: security-proof.yml workflow
  # Settings → Branches → Add rule → main
  ```
- [ ] Archive evidence ZIP for compliance
- [ ] Add CODEOWNERS for `security/**` and `scripts/**`

### Optional (polish)
- [ ] Enable Dependabot
- [ ] Add release.yml (auto-generate notes)
- [ ] Schedule `npm audit` weekly
- [ ] Configure signed commits

---

## Evidence Artifacts

All attached to GitHub Release:

| File | Purpose |
|------|---------|
| `release-evidence-*.zip` | Complete proof bundle (proof/, security/, review/) |
| `security/summary.json` | 3/3 score with passed controls |
| `proof/PROOF.md` | Human-readable proof document |
| `security/artifacts/playwright.json` | E2E test results |
| `security/artifacts/csp-evaluator.txt` | CSP validation |
| `review/REVIEW.md` | Comprehensive code review |
| `review/findings.json` | Machine-readable findings |

---

## Smoke Test After Deploy

```powershell
# 1. CSP headers present
$response = Invoke-WebRequest -Uri "https://your-prod-domain.com" -Method HEAD
$response.Headers['Content-Security-Policy']  # Should exist

# 2. No source maps in production
$response = Invoke-WebRequest -Uri "https://your-prod-domain.com"
$response.Content -match 'sourceMappingURL'  # Should be False

# 3. App renders
Start-Process "https://your-prod-domain.com"  # Opens in browser
# Verify: No console errors, login works, main UI loads
```

---

## Rollback (if needed)

```powershell
# Quick rollback to previous release
git checkout main
git reset --hard HEAD~1  # Undo merge commit
git push origin main --force

# Delete bad tag
$badTag = "v1.1.0"
git tag -d $badTag
git push origin :refs/tags/$badTag
gh release delete $badTag --yes
```

---

## Support

**Stuck?** Check these docs:
- [WINDOWS_SHIP_CHECKLIST.md](WINDOWS_SHIP_CHECKLIST.md) — Step-by-step manual flow
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) — All docs organized
- [GO_NO_GO_CHECKLIST.md](GO_NO_GO_CHECKLIST.md) — Decision framework

**Questions?**
- Review: [review/REVIEW.md](review/REVIEW.md)
- Security: [proof/PROOF.md](proof/PROOF.md)
- PR Discussion: https://github.com/bniceley50/mental-scribe-app/pull/8

---

## What Success Looks Like

```
✅ DEPLOYMENT COMPLETE!
═══════════════════════════════════════════════════════

📊 Summary:
   Branch: main
   Tag: v1.1.0
   Security: 3/3 PASS
   Artifacts: 7 files attached
   Evidence ZIP: release-evidence-20251019-1430.zip

🎉 Security hardening successfully shipped!
```

**Current Status**: Everything verified. Ready to `.\scripts\ultimate-ship.ps1` when you are. 🎯
