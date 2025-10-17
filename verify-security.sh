#!/usr/bin/env bash
# verify-security.sh — local verifier for security scorecard proof
# Usage: ./verify-security.sh [-r <repo>] [-b <branch>] [-d <workdir>]
# Defaults: repo=https://github.com/bniceley50/mental-scribe-app.git branch=chore/ci-hardening workdir=./mental-scribe-app-clean
set -u
DEFAULT_REPO_URL="https://github.com/bniceley50/mental-scribe-app.git"
DEFAULT_REPO_BRANCH="chore/ci-hardening"
DEFAULT_WORKDIR="./mental-scribe-app-clean"
REPO_URL="${REPO_URL:-$DEFAULT_REPO_URL}"
REPO_BRANCH="${REPO_BRANCH:-$DEFAULT_REPO_BRANCH}"
WORKDIR="${WORKDIR:-$DEFAULT_WORKDIR}"
while getopts ":r:b:d:" opt; do
  case "$opt" in
    r) REPO_URL="$OPTARG" ;;
    b) REPO_BRANCH="$OPTARG" ;;
    d) WORKDIR="$OPTARG" ;;
  esac
done
shift $((OPTIND - 1)) || true
USE_COLOR=0
if command -v tput >/dev/null 2>&1; then
  if [ "$(tput colors 2>/dev/null || printf '0')" -ge 8 ]; then USE_COLOR=1; fi
fi
COLOR_OK=""; COLOR_ERR=""; COLOR_INFO=""; COLOR_RESET=""
if [ "$USE_COLOR" -eq 1 ]; then
  COLOR_OK="$(tput setaf 2)"; COLOR_ERR="$(tput setaf 1)"; COLOR_INFO="$(tput setaf 6)"; COLOR_RESET="$(tput sgr0)"
fi
psay(){ lvl="$1"; shift; msg="$*"; pref=""; case "$lvl" in
  ok) pref="${COLOR_OK}[OK]${COLOR_RESET}" ;; err) pref="${COLOR_ERR}[ERR]${COLOR_RESET}" ;;
  info) pref="${COLOR_INFO}[INFO]${COLOR_RESET}" ;; warn) pref="${COLOR_ERR}[WARN]${COLOR_RESET}" ;;
  *) pref="[INFO]";; esac; [ "$USE_COLOR" -eq 0 ] && case "$lvl" in
    ok) pref="[OK]";; err) pref="[ERR]";; info) pref="[INFO]";; warn) pref="[WARN]";; *) pref="[INFO]";; esac
  printf '%s %s\n' "$pref" "$msg"; }
run_phase(){ _var="$1"; shift; _label="$1"; shift; psay info "$_label"; "$@"; _rc=$?; eval "$_var=$_rc"
  if [ "$_rc" -eq 0 ]; then psay ok "$_label succeeded"; else psay err "$_label failed (exit $_rc)"; fi; return "$_rc"; }
REQUIRED_CMDS=(git node npm npx tar)
miss=""; for c in "${REQUIRED_CMDS[@]}"; do command -v "$c" >/dev/null 2>&1 || miss="$miss $c"; done
if command -v sha256sum >/dev/null 2>&1; then HASH=(sha256sum); elif command -v shasum >/dev/null 2>&1; then HASH=(shasum -a 256); else miss="$miss sha256sum/shasum"; fi
[ -n "${miss#" "}" ] && { psay err "Missing required commands:${miss}"; exit 1; }
psay info "node -v: $(node -v 2>/dev/null)"; psay info "npm -v: $(npm -v 2>/dev/null)"
[ -e "$WORKDIR" ] && { psay err "Target directory $WORKDIR exists. Remove it or choose another."; exit 2; }
phase_clone=1; phase_files=1; phase_ci=1; phase_build=1; phase_sec=1
MISSING_FILES=""; MISSING_ARTIFACTS=""; summary_score=""; summary_max=""; summary_passed=""; summary_failed=""
clone_repo(){ git clone --depth 1 "$REPO_URL" "$WORKDIR" || return $?
  (cd "$WORKDIR" && git fetch --all --prune >/dev/null 2>&1) || return $?
  (cd "$WORKDIR" && git checkout "$REPO_BRANCH" >/dev/null 2>&1) || return $?
  [ -e "$WORKDIR/.git/MERGE_HEAD" ] || [ -d "$WORKDIR/.git/rebase-merge" ] || [ -d "$WORKDIR/.git/rebase-apply" ] && { psay err "Repo mid-merge/rebase"; return 1; }
  return 0; }
run_phase phase_clone "Clone and checkout" clone_repo
proof_dir="$WORKDIR/proof"; mkdir -p "$proof_dir" >/dev/null 2>&1 || true
artifact_manifest="$proof_dir/artifact-manifest.txt"; proof_md="$proof_dir/PROOF.md"
inwd=0; [ -d "$WORKDIR" ] && cd "$WORKDIR" >/dev/null 2>&1 && inwd=1
EXPECTED_FILES=(
  ".github/workflows/security-gates.yml" "scripts/prebuild-check.mjs" "scripts/run-all-proof.mjs" "scripts/security-score.mjs"
  "security/scorecard.schema.json" "test/e2e/cors.spec.ts" "test/e2e/csp-evaluator.spec.ts" "test/e2e/csp-xss.spec.ts"
  "test/e2e/phi.spec.ts" "test/e2e/session-storage.spec.ts" "test/e2e/upload-guard.spec.ts" "test/k6/ratelimit-smoke.js"
  "src/lib/openai.ts" "src/lib/fileUpload.ts" "src/lib/authLogout.ts" "src/lib/trusted-types.ts" "playwright.config.ts"
)
check_files(){ local miss=0; MISSING_FILES=""; for p in "${EXPECTED_FILES[@]}"; do
  [ -e "$p" ] || { miss=1; MISSING_FILES="${MISSING_FILES:+$MISSING_FILES"$'\n'"}$p"; }; done; return "$miss"; }
if [ "$inwd" -eq 1 ]; then run_phase phase_files "File assertions" check_files; else psay err "File assertions skipped"; phase_files=1; fi
if [ "$inwd" -eq 1 ]; then run_phase phase_ci "npm ci" npm ci; else psay err "npm ci skipped"; phase_ci=1; fi
if [ "$inwd" -eq 1 ] && [ "$phase_ci" -eq 0 ]; then run_phase phase_build "npm run build" npm run build; else [ "$inwd" -eq 1 ] && psay warn "build skipped"; phase_build=${phase_build:-1}; fi
if [ "$inwd" -eq 1 ] && [ "$phase_ci" -eq 0 ]; then run_phase phase_sec "npm run sec:prove" npm run sec:prove; else [ "$inwd" -eq 1 ] && psay warn "sec:prove skipped"; phase_sec=${phase_sec:-1}; fi
summary_file="security/summary.json"; summary_exists=0; summary_content=""
if [ -f "$summary_file" ]; then summary_exists=1; summary_content="$(cat "$summary_file")"
  read -r summary_score summary_max summary_passed summary_failed <<EOF || true
$(node -e 'const fs=require("fs");try{const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));console.log(d.score??"");console.log(d.max??"");console.log((d.passed||[]).join(","));console.log((d.failed||[]).join(","));}catch(e){console.log("");console.log("");console.log("");console.log("");}' "$summary_file" 2>/dev/null || true)
EOF
fi
[ -f "$artifact_manifest" ] || : >"$artifact_manifest"; : >"$artifact_manifest"
if [ -d security ]; then
  while IFS= read -r -d '' f; do rel="${f#./}"; hv="$("${HASH[@]}" "$rel" 2>/dev/null | awk '{print $1}')"; sz="$(wc -c < "$rel" | tr -d '[:space:]')"
    printf '%s  %s  %s\n' "$hv" "$sz" "$rel" >>"$artifact_manifest"
  done < <(find security -type f -print0 2>/dev/null)
fi
ARTIFACT_FILES=(
  "security/artifacts/gitleaks-report.json" "security/artifacts/history-scan.json" "security/artifacts/dist-secrets.txt"
  "security/artifacts/npm-audit.json" "security/artifacts/sbom.spdx" "security/artifacts/csp-evaluator.txt"
  "security/artifacts/codeql-results.json" "security/artifacts/k6-429.json" "security/artifacts/ratelimit-headers.json"
  "security/artifacts/phi-integration.json" "security/artifacts/phi-property.json" "security/artifacts/upload-guard-report.json"
  "security/artifacts/fuzz-report.json" "security/artifacts/storage-audit.json" "security/artifacts/cookie-audit.json"
  "security/artifacts/logout-e2e.json" "security/artifacts/cors-tests.json" "security/artifacts/xss-e2e.json"
)
MISSING_ARTIFACTS=""; for p in "${ARTIFACT_FILES[@]}"; do [ -f "$p" ] || MISSING_ARTIFACTS="${MISSING_ARTIFACTS:+$MISSING_ARTIFACTS"$'\n'"}$p"; done
jwt_count="0"; [ -f security/artifacts/dist-secrets.txt ] && jwt_count="$(grep -Eo '([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+' security/artifacts/dist-secrets.txt | wc -l | tr -d '[:space:]' || printf 0)"
csp_tail=""; [ -f security/artifacts/csp-evaluator.txt ] && csp_tail="$(tail -n 30 security/artifacts/csp-evaluator.txt)"
timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")"
uname_out="$(uname -a 2>/dev/null || printf 'uname unavailable')"
node_v="$(node -v 2>/dev/null || printf 'node unavailable')"; npm_v="$(npm -v 2>/dev/null || printf 'npm unavailable')"
git_head="$(git rev-parse HEAD 2>/dev/null || printf 'unknown')"; git_status="$(git status -sb 2>/dev/null || printf 'unavailable')"
{
  echo "# PROOF"; echo; echo "Timestamp: $timestamp"; echo "Host: $uname_out"; echo "node -v: $node_v"; echo "npm -v: $npm_v"; echo
  echo "Git HEAD: $git_head"; echo '```'; printf '%s\n' "$git_status"; echo '```'; echo; echo "## Phase Results"
  echo "- clone/checkout: $phase_clone"; echo "- file-assert: $phase_files"; echo "- npm ci: $phase_ci"; echo "- npm run build: $phase_build"; echo "- npm run sec:prove: $phase_sec"; echo
  echo "## security/summary.json"; if [ "$summary_exists" -eq 1 ]; then echo '```json'; printf '%s\n' "$summary_content"; echo '```'; else echo "_missing_"; fi; echo
  pass_disp="-"; fail_disp="-"; pass_cnt=0; fail_cnt=0
  [ -n "$summary_passed" ] && pass_disp="$(printf '%s\n' "$summary_passed" | sed 's/,/, /g')" && pass_cnt="$(printf '%s' "$summary_passed" | awk -F',' '{print NF}')" || true
  [ -n "$summary_failed" ] && fail_disp="$(printf '%s\n' "$summary_failed" | sed 's/,/, /g')" && fail_cnt="$(printf '%s' "$summary_failed" | awk -F',' '{print NF}')" || true
  echo "## Control Summary"; echo "| Metric | Value |"; echo "| --- | --- |"; echo "| Score | ${summary_score:-"-"} / ${summary_max:-"-"} |"
  echo "| Passed | ${pass_cnt:-0} (${pass_disp}) |"; echo "| Failed | ${fail_cnt:-0} (${fail_disp}) |"; echo
  echo "## Dist JWT Token Count"; echo "$jwt_count"; echo
  echo "## Missing Expected Files"; [ -n "$MISSING_FILES" ] && printf '%s\n' "$MISSING_FILES" || echo "None"; echo
  echo "## Missing Expected Artifact Files"; [ -n "$MISSING_ARTIFACTS" ] && printf '%s\n' "$MISSING_ARTIFACTS" || echo "None"; echo
  echo "## CSP Evaluator Tail"; [ -n "$csp_tail" ] && { echo '```'; printf '%s\n' "$csp_tail"; echo '```'; } || echo "_not present_"
} >"$proof_md"
exit_code=0
([ "$phase_ci" -eq 0 ] && [ "$phase_build" -eq 0 ] && [ "$phase_sec" -eq 0 ]) || exit_code=1
[ -f "$summary_file" ] || exit_code=1
if [ -n "${summary_score:-}" ] && [ -n "${summary_max:-}" ] && [ "$summary_score" != "$summary_max" ]; then exit_code=1; fi
if [ "$exit_code" -eq 0 ]; then echo "=== PROOF OK: c0mplete ===" | tee -a "$proof_md"; fi
exit "$exit_code"
