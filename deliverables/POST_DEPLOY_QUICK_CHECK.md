# ✅ Post-Deploy Quick Check (v1.3.0)

```bash
URL="https://<your-app>.vercel.app"

echo "→ Headers"
curl -sI "$URL" | grep -iE "content-security-policy|x-frame-options|strict-transport-security|cross-origin-opener-policy|cross-origin-resource-policy|referrer-policy|permissions-policy" || true

echo "→ CSP Smoke"
BASE_URL="$URL" npx playwright test -g "CSP smoke" --reporter=line
```

Expected: page renders, no blocking CSP errors, CSP/XFO/HSTS present.

Labels: `security`, `feature`, `performance`, `a11y`, `ready-to-merge`
Milestone: `Ship Safety & Pagination v1`
Assignees/Reviewers: add clinical lead + security reviewer
