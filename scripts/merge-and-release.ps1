# Security Hardening Merge & Release Script
# Run this after PR approval to merge and tag the release

Write-Host "`n🚀 MERGING SECURITY HARDENING PR" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

# Step 1: Checkout and update main
Write-Host "Step 1: Updating main branch..." -ForegroundColor Yellow
git checkout main
git pull

# Step 2: Merge the PR branch
Write-Host "`nStep 2: Merging chore/ci-hardening..." -ForegroundColor Yellow
git merge --no-ff chore/ci-hardening -m "merge: security hardening (3/3) + review artifacts"

# Step 3: Tag a patch release
Write-Host "`nStep 3: Creating patch release tag..." -ForegroundColor Yellow
npm version patch -m "release: security hardening + verifiable proof (3/3)"

# Step 4: Push everything
Write-Host "`nStep 4: Pushing to remote..." -ForegroundColor Yellow
git push
git push --tags

Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ MERGE & RELEASE COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

# Show the new version
Write-Host "📦 New Version:" -ForegroundColor Yellow
$pkg = Get-Content package.json | ConvertFrom-Json
Write-Host "   v$($pkg.version)" -ForegroundColor Green

Write-Host "`n🎉 Security hardening successfully shipped!" -ForegroundColor Green
Write-Host ""
