#!/usr/bin/env pwsh
# One-shot verification script for logger implementation
# Verifies: ESLint passes, no stray console calls, tests pass

Write-Host "`n🔍 PR-1 Logger Verification Script`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$failed = $false

# 1) ESLint must pass with no warnings
Write-Host "1️⃣  Running ESLint (strict mode)..." -ForegroundColor Yellow
pnpm lint --max-warnings 0 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ ESLint failed or has warnings" -ForegroundColor Red
    $failed = $true
} else {
    Write-Host "   ✅ ESLint passed with 0 warnings" -ForegroundColor Green
}

# 2) Scan for stray console.* outside logger internals
Write-Host "`n2️⃣  Scanning for stray console calls..." -ForegroundColor Yellow
$allowedPaths = @('src/lib/logger.ts', 'apps/*/logger.ts')
$hits = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Path src,apps -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|dist|\.git' } |
    Where-Object { $_.FullName -notmatch 'src[\\/]lib[\\/]logger\.ts' } |
    Select-String -Pattern '\bconsole\.(log|error|warn|info|debug)\b'

if ($hits) {
    Write-Host "   ❌ Found stray console calls:" -ForegroundColor Red
    $hits | ForEach-Object { 
        Write-Host "      $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Red
    }
    $failed = $true
} else {
    Write-Host "   ✅ No stray console calls found" -ForegroundColor Green
}

# 3) Run tests
Write-Host "`n3️⃣  Running tests..." -ForegroundColor Yellow
pnpm test --run 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Tests failed" -ForegroundColor Red
    $failed = $true
} else {
    Write-Host "   ✅ Tests passed" -ForegroundColor Green
}

# Final verdict
Write-Host "`n" -NoNewline
if ($failed) {
    Write-Host "❌ VERIFICATION FAILED - Fix issues above" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ ALL CHECKS PASSED - Ready for PR" -ForegroundColor Green
    Write-Host "`nEvidence for PR:" -ForegroundColor Cyan
    Write-Host "  • ESLint: 0 warnings, 0 errors" -ForegroundColor White
    Write-Host "  • Console guard: No stray console.* calls" -ForegroundColor White
    Write-Host "  • Tests: ErrorBoundary logs and renders fallback" -ForegroundColor White
    Write-Host "  • CI: lint-console-guard.yml enforces rules" -ForegroundColor White
    exit 0
}
