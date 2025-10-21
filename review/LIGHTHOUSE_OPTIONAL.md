# Optional: Lighthouse CI Workflow

Add automated performance and accessibility checks on every PR.

## Setup (1 file)

Create `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:4173
            http://localhost:4173/auth
          uploadArtifacts: true
          temporaryPublicStorage: true
          runs: 3
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Preview Lighthouse results
        if: always()
        run: |
          echo "Lighthouse reports available in workflow artifacts"
```

## What This Does

- Runs Lighthouse on `/` and `/auth` routes
- Averages 3 runs for consistent scores
- Checks:
  - ⚡ Performance
  - ♿ Accessibility
  - 📋 Best Practices
  - 🔍 SEO
- Posts comment on PR with scores
- Uploads detailed reports as artifacts

## Expected Results

### Good Scores (passing)
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

### Common Issues & Fixes

**Performance:**
- Large bundle size → code splitting
- No image optimization → use next/image or similar
- Render-blocking resources → lazy load

**Accessibility:**
- Missing alt text → add to all images
- Color contrast issues → adjust theme colors
- Missing ARIA labels → add to interactive elements

**Best Practices:**
- Mixed content → ensure all resources are HTTPS
- Missing CSP → already fixed! ✅

## Thresholds (optional)

Add `.lighthouserc.json` to enforce minimum scores:

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview",
      "url": [
        "http://localhost:4173",
        "http://localhost:4173/auth"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

With this config, PR will **fail** if scores drop below thresholds.

## Local Testing

Run Lighthouse locally before pushing:

```bash
# Install Lighthouse CLI
npm install -g @lhci/cli

# Build and preview
npm run build
npm run preview &

# Wait for server to start, then run Lighthouse
lhci autorun

# Kill preview server
pkill -f "vite preview"
```

## Integration with Branch Protection

Add to required status checks:
- `lighthouse / lighthouse`

This prevents merging PRs that degrade performance or accessibility.

## Cost

- **Time**: ~2-3 minutes per PR
- **Resources**: Free on GitHub Actions (included in free tier)
- **Maintenance**: Minimal (update once per year typically)

## When to Skip

Skip Lighthouse CI if:
- You're in rapid prototyping phase (too slow)
- Your app is mostly server-side rendered (use different metrics)
- You already have comprehensive performance monitoring

## Alternative: Manual Audits

If you don't want automated checks, run manually before releases:

```bash
# Install extension
# Chrome DevTools → Lighthouse tab → Generate report

# Or CLI
npx lighthouse http://localhost:4173 --view
```
