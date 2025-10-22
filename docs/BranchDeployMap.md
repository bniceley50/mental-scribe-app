# Branch & Deployment Map

**Generated**: 2025-10-22  
**Repository**: bniceley50/mental-scribe-app  
**Access**: Confirmed ✅

---

## Remote Branches

| Branch | Last Commit | Author | Date | CI Status | Deployment |
|--------|-------------|--------|------|-----------|------------|
| main | 908296d | bniceley50 | 2025-10-21 | ✅ PASS | Production (Vercel) |
| chore/ci-hardening | 908296d | bniceley50 | 2025-10-21 | ✅ PASS | Preview (Vercel) |

---

## Production Deployment

**Branch**: `main`  
**Platform**: Vercel  
**URL**: [Production URL - configure in Vercel settings]  
**Last Deploy**: 2025-10-21  
**Status**: ✅ Active

### Vercel Configuration
- Security headers configured in `vercel.json`
- CSP with nonce-based scripts
- HSTS, XFO, COOP/CORP, Referrer-Policy all configured
- Build command: `npm run build`
- Output directory: `dist`

---

## Preview Deployments

**Branch**: `chore/ci-hardening`  
**Platform**: Vercel Preview  
**Status**: ✅ Active  
**Purpose**: Security hardening + pagination + E2E tests

---

## CI/CD Status

### GitHub Actions Workflows
- ✅ `e2e-tests.yml` - E2E testing (Playwright)
- ✅ `security-proof.yml` - Security proof verification
- ✅ `security-scan.yml` - Security scanning
- ✅ `coverage.yml` - Test coverage
- ✅ `db-tests.yml` - Database tests

### Latest CI Results (from chore/ci-hardening)
- **Build**: ✅ Exit code 0
- **TypeScript**: ✅ 0 errors
- **ESLint**: ✅ 0 issues
- **E2E Tests**: ✅ 1/1 passing (pagination.spec.ts)
- **Security Proof**: ✅ 3/3 (CSP strict, no secrets, E2E smoke)

---

## Environment Configuration

### Required Environment Variables
```env
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

### Optional Environment Variables
```env
BAA_SIGNED=true  # For PHI processing compliance
```

---

## Verification Commands

```bash
# Check remote branches
git fetch --all
git for-each-ref --format='%(refname:short) %(authorname) %(committerdate:iso8601)' refs/remotes/

# Check deployment status (Vercel CLI)
vercel ls

# Verify production build
npm run build
npm run preview

# Run E2E tests
npx playwright test
```

---

## Notes

- All branches require passing CI before merge
- Security proof must pass (3/3) for production deployments
- Preview deployments auto-deploy from PRs
- Production deploys from `main` branch only
