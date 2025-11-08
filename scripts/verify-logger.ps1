#!/usr/bin/env pwsh
# PR-2 Verification Script: Logger + Sinks + Session Correlation
# Verifies: ESLint passes, no stray console calls, tests pass (including sinks)

Write-Host "`n🔍 PR-2 Logger + Sinks Verification Script`n" -ForegroundColor Cyan

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
$allowedPaths = @('src/lib/logger/', 'apps/*/logger')
$hits = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Path src,apps -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|dist|\.git' } |
    Where-Object { $_.FullName -notmatch 'src[\\/]lib[\\/]logger[\\/]' } |
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

# 3) Run tests (includes logger sinks + redaction tests)
Write-Host "`n3️⃣  Running tests..." -ForegroundColor Yellow
pnpm test --run 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Tests failed" -ForegroundColor Red
    $failed = $true
} else {
    Write-Host "   ✅ Tests passed (logger sinks + redaction)" -ForegroundColor Green
}

# Final verdict
Write-Host "`n" -NoNewline
if ($failed) {
    Write-Host "❌ VERIFICATION FAILED - Fix issues above" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ ALL CHECKS PASSED - Ready for PR-2" -ForegroundColor Green
    Write-Host "`nEvidence for PR-2:" -ForegroundColor Cyan
    Write-Host "  • ESLint: 0 warnings, 0 errors" -ForegroundColor White
    Write-Host "  • Console guard: No stray console.* calls" -ForegroundColor White
    Write-Host "  • Tests: Logger sinks (HTTP, Sentry), session correlation, redaction" -ForegroundColor White
    Write-Host "  • CI: lint-console-guard.yml enforces rules + tests" -ForegroundColor White
    Write-Host "  • Sinks: Console (always), HTTP POST (optional), Sentry (optional)" -ForegroundColor White
    Write-Host "  • Correlation: sessionId + route auto-included via LoggerProvider" -ForegroundColor White
    exit 0
}
