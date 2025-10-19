# PROOF

- Timestamp: 2025-10-19T18:39:51Z
- Node: v20.19.1
- npm:  10.8.2
- Git HEAD: 20e1abccca7792b697d90e72900c93fe9aea965c

## Git Status

## chore/ci-hardening...origin/chore/ci-hardening  M security/artifacts/csp-evaluator.txt  M security/artifacts/dist-secrets.txt  D security/artifacts/playwright.json  D security/summary.json  M test-results/.last-run.json ?? .eslintcache ?? review/artifacts/build-exit.txt ?? review/artifacts/sec-prove-exit.txt

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
