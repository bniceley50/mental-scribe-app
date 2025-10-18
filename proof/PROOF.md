# PROOF

- Timestamp: 2025-10-18T19:27:50Z
- Node: v20.19.1
- npm:  10.8.2
- Git HEAD: 698d3a0c96d0b0128cb1345e8b63006e6cf8a5d5

## Git Status

```
## chore/ci-hardening...origin/chore/ci-hardening  M package-lock.json  M package.json ?? playwright.config.ts ?? proof/ ?? scripts/run-all-proof.mjs ?? scripts/security-score.mjs ?? security/ ?? verify-security.ps1
```

## Expected Files Check (exit 1)

**Missing files:**
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

## Phases

- npm ci: exit 0
- npm run build: exit 1  
- npm run sec:prove: exit 1

## Security Summary

Not found

**Score:** /  
**Passed:** -  
**Failed:** -

## CSP Evaluator (last 30 lines)

No csp-evaluator.txt

## Secrets in Dist

JWT-like tokens detected: 0

## Artifacts

Generated 10/18/2025 15:27:51:

```

a1af028b963b2c4b7cf955785e86ee026174bc01ab2386e94e7564543f2996b5  705  security/scorecard.schema.json

```
