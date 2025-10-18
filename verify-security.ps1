# verify-security.ps1
[CmdletBinding()]
param(
  [string]$RepoUrl    = "https://github.com/bniceley50/mental-scribe-app.git",
  [string]$RepoBranch = "chore/ci-hardening",
  [string]$Workdir    = ".\mental-scribe-app-clean"
)

function Write-Ok   { param($m) Write-Host "[OK]  $m"  -ForegroundColor Green }
function Write-Err  { param($m) Write-Host "[ERR] $m"  -ForegroundColor Red }
function Write-Info { param($m) Write-Host "[INFO] $m" -ForegroundColor Cyan }

# --- prerequisites
$need = @("git","node","npm")
$missing = @()
foreach($c in $need){ if(-not (Get-Command $c -ErrorAction SilentlyContinue)){ $missing += $c } }
if($missing.Count -gt 0){ Write-Err "Missing required commands: $($missing -join ', ')"; exit 1 }

# --- use current repo if we're already inside one; otherwise clone
$hereRepo = $false
try { $null = git rev-parse --is-inside-work-tree 2>$null; if($LASTEXITCODE -eq 0){ $hereRepo = $true } } catch {}
if($hereRepo){
  $Root = (git rev-parse --show-toplevel).Trim()
  Set-Location $Root
  Write-Info "Using current repo: $Root"
} else {
  if(Test-Path $Workdir){ Write-Err "Workdir exists ($Workdir). Remove it or pass -Workdir to use another."; exit 2 }
  Write-Info "Cloning $RepoUrl"
  git clone --depth 1 $RepoUrl $Workdir; if($LASTEXITCODE -ne 0){ Write-Err "git clone failed"; exit 1 }
  Push-Location $Workdir
  git fetch --all --prune
  git checkout $RepoBranch; if($LASTEXITCODE -ne 0){ Write-Err "git checkout $RepoBranch failed"; exit 1 }
  $Root = (Get-Location).Path
}

# --- expected files that the scorecard references
$EXPECTED_FILES = @(
  ".github/workflows/security-gates.yml",
  "scripts/prebuild-check.mjs",
  "scripts/run-all-proof.mjs",
  "scripts/security-score.mjs",
  "security/scorecard.schema.json",
  "test/e2e/cors.spec.ts",
  "test/e2e/csp-evaluator.spec.ts",
  "test/e2e/csp-xss.spec.ts",
  "test/e2e/phi.spec.ts",
  "test/e2e/session-storage.spec.ts",
  "test/e2e/upload-guard.spec.ts",
  "test/k6/ratelimit-smoke.js",
  "src/lib/openai.ts",
  "src/lib/fileUpload.ts",
  "src/lib/authLogout.ts",
  "src/lib/trusted-types.ts",
  "playwright.config.ts"
)

$missingFiles = @()
foreach($p in $EXPECTED_FILES){ if(-not (Test-Path $p)){ $missingFiles += $p } }
$phase_files = if($missingFiles.Count -eq 0){ 0 } else { 1 }

# --- phase runner
function Run-Phase { param([string]$name,[scriptblock]$block,[ref]$rcOut)
  Write-Info $name
  & $block
  $rc = $LASTEXITCODE
  $rcOut.Value = $rc
  if($rc -eq 0){ Write-Ok "$name succeeded" } else { Write-Err "$name failed (exit $rc)" }
}

# --- run phases
$phase_ci=1;     Run-Phase "npm ci" { npm ci } ([ref]$phase_ci)
$phase_build=1;  if($phase_ci -eq 0){ Run-Phase "npm run build" { npm run build } ([ref]$phase_build) } else { Write-Info "skip build (previous failure)" }
$phase_prove=1;  if($phase_ci -eq 0){ Run-Phase "npm run sec:prove" { npm run sec:prove } ([ref]$phase_prove) } else { Write-Info "skip sec:prove (previous failure)" }

# --- prepare output dirs
New-Item -ItemType Directory -Force -Path "proof" | Out-Null
New-Item -ItemType Directory -Force -Path "security\artifacts" | Out-Null

# --- artifact manifest (sha256 size path)
$artifactManifest = "proof\artifact-manifest.txt"
Set-Content -Path $artifactManifest -Value ""
if(Test-Path "security"){
  Get-ChildItem -File -Recurse security | ForEach-Object {
    $rel = $_.FullName.Substring($Root.Length).TrimStart('\','/')
    $hash = Get-FileHash $_.FullName -Algorithm SHA256
    Add-Content -Path $artifactManifest -Value ("{0}  {1}  {2}" -f $hash.Hash.ToLower(), $_.Length, $rel -replace '\\','/')
  }
}

# --- security summary
$summaryFile   = "security\summary.json"
$summaryExists = Test-Path $summaryFile
$summaryJson   = ""
$score = ""; $max=""; $passed=""; $failed=""
if($summaryExists){
  try {
    $summaryJson = Get-Content -Raw -Path $summaryFile
    $obj = $summaryJson | ConvertFrom-Json
    $score = "$($obj.score)"; $max="$($obj.max)"
    $passed = ($obj.passed -join ","); $failed = ($obj.failed -join ",")
  } catch { Write-Err "Could not parse security/summary.json"; }
}

# --- extra evidence
$jwtCount = 0
$distSecrets = "security\artifacts\dist-secrets.txt"
if(Test-Path $distSecrets){
  $m = Select-String -Path $distSecrets -Pattern '([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+' -AllMatches
  if($m -and $m.Matches){ $jwtCount = $m.Matches.Count }
}

$cspTail = ""
$cspPath = "security\artifacts\csp-evaluator.txt"
if(Test-Path $cspPath){ $cspTail = (Get-Content -Tail 30 -Path $cspPath) -join "`n" }

$gitHead = (git rev-parse HEAD 2>$null); if(-not $gitHead){ $gitHead="unknown" }
$gitStat = (git status -sb 2>$null);     if(-not $gitStat){ $gitStat="unavailable" }
$ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# --- PROOF.md
$proofMd = "proof\PROOF.md"
$passedDisp = if([string]::IsNullOrWhiteSpace($passed)){"-"} else { $passed -replace ",",", " }
$failedDisp = if([string]::IsNullOrWhiteSpace($failed)){"-"} else { $failed -replace ",",", " }
$missingBlock = if($missingFiles.Count -gt 0){ ($missingFiles -join "`n") } else { "None" }
$summaryBlock = if($summaryJson){ "``````json`n$summaryJson`n``````" } else { "Not found" }
$cspBlock     = if($cspTail){ "`````` `n$cspTail`n``````" } else { "No csp-evaluator.txt" }

$proofText = @"
# PROOF

- Timestamp: $ts
- Node: $(node -v)
- npm:  $(npm -v)
- Git HEAD: $gitHead

## Git Status

``````
$gitStat
``````

## Expected Files Check (exit $phase_files)

**Missing files:**
$missingBlock

## Phases

- npm ci: exit $phase_ci
- npm run build: exit $phase_build  
- npm run sec:prove: exit $phase_prove

## Security Summary

$summaryBlock

**Score:** $score/$max  
**Passed:** $passedDisp  
**Failed:** $failedDisp

## CSP Evaluator (last 30 lines)

$cspBlock

## Secrets in Dist

JWT-like tokens detected: $jwtCount

## Artifacts

Generated $(Get-Date):

``````
$(if(Test-Path $artifactManifest){ Get-Content $artifactManifest | Out-String } else { "No manifest" })
``````
"@

Set-Content -Path $proofMd -Value $proofText -Encoding UTF8
Write-Ok "Generated $proofMd"

# --- Final exit code
$totalExitCode = $phase_files + $phase_ci + $phase_build + $phase_prove
if($totalExitCode -eq 0){
  Write-Ok "All phases succeeded. Security proof complete."
} else {
  Write-Err "Some phases failed (total exit code: $totalExitCode)"
}
exit $totalExitCode