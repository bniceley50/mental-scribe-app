# PROOF

- Timestamp: 2025-10-19T00:42:41Z
- Node: v20.19.1
- npm:  10.8.2
- Git HEAD: fddd8bdf967f60178f38945c7c5cb826cd4a4995

## Git Status

## chore/ci-hardening...origin/chore/ci-hardening  M proof/artifact-manifest.txt  M security/artifacts/playwright.json  M vite-plugin-csp.ts ?? test-results/

## Phase Results
- file-assert: 1
- npm ci: 0
- npm run build: 0
- npm run sec:prove: 1

## security/summary.json
```json
{
  "score": 2,
  "max": 3,
  "passed": [
    "csp_strict",
    "e2e_smoke"
  ],
  "failed": [
    "no_secrets_in_dist"
  ],
  "details": {
    "csp_strict": {
      "passed": true,
      "reason": "no high-severity CSP issues found"
    },
    "no_secrets_in_dist": {
      "passed": false,
      "reason": "2 likely JWT-like tokens found in dist"
    },
    "e2e_smoke": {
      "passed": true,
      "reason": "no failed tests reported"
    }
  }
}

```

## Control Summary
| Metric | Value |
| --- | --- |
| Score |  /  |
| Passed | csp_strict, e2e_smoke |
| Failed | no_secrets_in_dist |

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
