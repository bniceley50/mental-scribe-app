# PROOF

- Timestamp: 2025-10-19T01:29:28Z
- Node: v20.19.1
- npm:  10.8.2
- Git HEAD: 5310466391b63a62efc775e7dba0ca4a29667596

## Git Status

## chore/ci-hardening...origin/chore/ci-hardening  M playwright.config.ts  M proof/artifact-manifest.txt  M security/artifacts/csp-evaluator.txt  M security/artifacts/dist-secrets.txt  M security/artifacts/playwright.json  M security/summary.json  M test-results/.last-run.json  M test/e2e/smoke.spec.ts

## Phase Results
- file-assert: 1
- npm ci: 0
- npm run build: 0
- npm run sec:prove: 1

## security/summary.json
```json
{
  "score": 3,
  "max": 3,
  "passed": [
    "csp_strict",
    "no_secrets_in_dist",
    "e2e_smoke"
  ],
  "failed": [],
  "details": {
    "csp_strict": {
      "passed": true,
      "reason": "no high-severity CSP issues found"
    },
    "no_secrets_in_dist": {
      "passed": true,
      "reason": "0 likely JWT-like tokens found in dist"
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
| Passed | csp_strict, no_secrets_in_dist, e2e_smoke |
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
