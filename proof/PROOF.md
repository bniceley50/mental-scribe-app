# PROOF

- Timestamp: 2025-10-19T16:36:08Z
- Node: v20.19.1
- npm:  10.8.2
- Git HEAD: dfcc703812ca2d1a07b62f074d4e79207fad2998

## Git Status

## chore/ci-hardening...origin/chore/ci-hardening  M proof/artifact-manifest.txt  D security/artifacts/playwright.json  D security/summary.json  M test-results/.last-run.json ?? .eslintcache ?? review/diff-stat.txt ?? review/recent-commits.txt ?? scripts/make-review.mjs

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
