# PROOF

- Timestamp: 2025-10-18T22:14:09Z
- Node: v20.19.1
- npm:  10.8.2
- Git HEAD: e2ac1f218941671545cc9682a30937a1c56cd16b

## Git Status

## chore/ci-hardening...origin/chore/ci-hardening  M package-lock.json  M package.json  M proof/PROOF.md  M proof/artifact-manifest.txt  M security/summary.json  M verify-security.ps1 ?? security/artifacts/ ?? test-results/ ?? test/

## Phase Results
- file-assert: 1
- npm ci: 0
- npm run build: 0
- npm run sec:prove: 1

## security/summary.json
```json
{
  "score": 1,
  "max": 3,
  "passed": [
    "e2e_smoke"
  ],
  "failed": [
    "csp_strict",
    "no_secrets_in_dist"
  ],
  "details": {
    "csp_strict": {
      "passed": false,
      "reason": "high-severity CSP issues present or CSP missing"
    },
    "no_secrets_in_dist": {
      "passed": false,
      "reason": "14335 potential JWT-like tokens found in dist"
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
| Passed | e2e_smoke |
| Failed | csp_strict, no_secrets_in_dist |

## Dist JWT Token Count
47

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
No CSP meta tag found in dist/index.html
```
