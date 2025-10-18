# PROOF

- Timestamp: 2025-10-18T23:30:02Z
- Node: v20.19.1
- npm:  10.8.2
- Git HEAD: 838e2978c5d9448dd138e97f4e1079b4fa4543f4

## Git Status

## chore/ci-hardening...origin/chore/ci-hardening  M package-lock.json  M package.json  M proof/PROOF.md  M proof/artifact-manifest.txt  M scripts/run-all-proof.mjs  M scripts/security-score.mjs  M security/artifacts/csp-evaluator.txt  M security/artifacts/dist-secrets.txt  D security/artifacts/playwright.json  D security/artifacts/run-all-proof.status.json  D security/summary.json  M vite-plugin-csp.ts ?? scripts/security-secrets.js ?? test-results/

## Phase Results
- file-assert: 1
- npm ci: 0
- npm run build: 0
- npm run sec:prove: 1

## security/summary.json
Not found

## Control Summary
| Metric | Value |
| --- | --- |
| Score |  /  |
| Passed | - |
| Failed | - |

## Dist JWT Token Count
0

## Missing Expected Files
.github/workflows/security-gates.yml
scripts/prebuild-check.mjs
test/e2e/cors.spec.ts
test/e2e/csp-evaluator.spec.ts
test/e2e/csp-xss.spec.ts
test/e2e/phi.spec.ts
test/e2e/session-storage.spec.ts
test/e2e/upload-guard.spec.ts
test/k6/ratelimit-smoke.js
src/lib/authLogout.ts
src/lib/trusted-types.ts

## CSP Evaluator Tail
``` 
# CSP Analysis

CSP: default-src 

✅ No high-severity CSP issues detected
```
