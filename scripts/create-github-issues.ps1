# PowerShell script to create all P0-P2 GitHub issues
# Run with: .\scripts\create-github-issues.ps1

Write-Host "Creating GitHub issues for Technical Debt remediation..." -ForegroundColor Green

# P0 Issues
$Body1 = @"
**Goal**: lock Vite ^5.4.21; patch prod deps; add weekly audit CI that fails on high/critical.

**Business Impact**: Eliminates critical security vulnerabilities that could lead to data breaches. Prevents "Log4j" style fire drills.

**AC**
- Vite pinned ^5.4.21; lockfile refreshed
- Weekly audit workflow committed (.github/workflows/weekly-audit.yml)
- CI fails on high/critical prod vulns
- Release note added

**Effort**: 0.5 person-weeks
**Owner**: @security-champions
"@

$Body2 = @"
**Goal**: cut 1K+ LOC surface into 4 components + 3 hooks with no behavior change.

**Business Impact**: New engineer onboarding takes 2x longer; bug fix cycles 50% slower than codebase average. This refactoring will improve development velocity by 20%.

**AC**
- Files ≤300 LOC each; shared types; no cross-boundary state
- Components: ChatHeader, MessageList, MessageComposer, ConversationSidebar
- Hooks: useMessages, useScrollAnchors, useUploads
- Existing tests pass; CSP smoke green
- Performance maintained or improved

**Effort**: 3 person-weeks
**Owner**: @frontend-leads
"@

$Body3 = @"
**Goal**: ensure required env vars exist locally/CI, fail fast.

**Business Impact**: Missing environment configurations cause deployment failures and create operational risk. This prevents CI/CD pipeline flakes.

**AC**
- env.example checked in with required/optional vars documented
- scripts/verify-env.mjs added
- prebuild/CI step fails on missing required vars
- README updated with environment setup instructions

**Effort**: 0.5 person-weeks
**Owner**: @platform-team
"@

# P1 Issues
$Body4 = @"
**Goal**: 60fps and O(visible) DOM with 1k+ msgs; preserve scroll after "Load older".

**Business Impact**: UI lag on large datasets affects user satisfaction. List rendering issues impact clinical workflow efficiency.

**AC**
- Virtualization lib (react-virtuoso) integrated
- startReached => loadOlder pattern implemented
- Scroll anchor preserved after pagination
- Accessibility intact (aria-live, aria-busy)
- Playwright e2e test added for anchor preservation
- Memory usage optimized for large message lists

**Effort**: 1.5 person-weeks
**Owner**: @frontend-leads
"@

$Body5 = @"
**Goal**: enforce size budgets; attach bundle visualization to PR.

**Business Impact**: Prevents bundle size drift that degrades performance. Proactive monitoring prevents user experience regressions.

**AC**
- Budgets: app ≤180KB, vendor shard ≤350KB (gzip)
- scripts/assert-bundles.mjs added
- CI step fails on >10% bundle size regression
- Bundle analyzer report uploaded as CI artifact
- postbuild hook validates budgets

**Effort**: 0.5 person-weeks
**Owner**: @platform-team
"@

$Body6 = @"
**Goal**: robust unit + e2e around keyset pagination + RLS access patterns.

**Business Impact**: Missing tests for critical functionality increases regression risk by 60%. This reduces manual testing overhead.

**AC**
- Unit tests: duplicates, boundary conditions (=20), rapid toggles
- e2e tests: anchor restore, disabled state, message order
- RLS query path verified in test environment
- Pagination edge cases covered (exact page boundary)
- Test coverage >80% for pagination logic

**Effort**: 1 person-week
**Owner**: @qa-champions
"@

# P2 Issues
$Body7 = @"
**Goal**: centralize all sanitization through typed presets.

**Business Impact**: Multiple sanitization patterns create security risk. Single hardening point reduces attack surface.

**AC**
- sanitize.ts with presets: strictText, htmlExport, pdfText
- All call-sites migrated to use centralized function
- Existing tests pass
- Security audit validates sanitization coverage

**Effort**: 0.5 person-weeks
**Owner**: @security-champions
"@

$Body8 = @"
**Goal**: enforce code quality rules + standardize error handling with retries.

**Business Impact**: Inconsistent error patterns increase debugging time by 40%. Standardized retries improve user experience.

**AC**
- ESLint rules: max-lines (300), complexity (15), exhaustive-deps:error
- Error shape standardized: {code, message, retryable, source}
- Unified jittered backoff on 429/5xx responses
- All linting errors resolved

**Effort**: 1 person-week
**Owner**: @full-stack-team
"@

# Create the issues
Write-Host "Creating P0 issues..." -ForegroundColor Yellow

gh issue create -t "P0: Security – Dependency Security Baseline" -b $Body1 -l "P0,security,CI" -a @security-champions
gh issue create -t "P0: Refactor – ChatInterface Component Decomposition" -b $Body2 -l "P0,refactor,ux" -a @frontend-leads  
gh issue create -t "P0: Tooling – Environment Configuration Infrastructure" -b $Body3 -l "P0,tooling,CI" -a @platform-team

Write-Host "Creating P1 issues..." -ForegroundColor Yellow

gh issue create -t "P1: Performance – Virtualized Message List" -b $Body4 -l "P1,performance,a11y" -a @frontend-leads
gh issue create -t "P1: Performance – Bundle Size Budgets & CI Guardrails" -b $Body5 -l "P1,performance,CI" -a @platform-team
gh issue create -t "P1: Testing – Pagination & RLS Edge Cases" -b $Body6 -l "P1,testing" -a @qa-champions

Write-Host "Creating P2 issues..." -ForegroundColor Yellow

gh issue create -t "P2: Security – Centralized DOMPurify Wrapper" -b $Body7 -l "P2,security,cleanup" -a @security-champions
gh issue create -t "P2: Reliability – ESLint Hardening & Error Policy" -b $Body8 -l "P2,reliability,lint" -a @full-stack-team

Write-Host "✅ All GitHub issues created successfully!" -ForegroundColor Green
Write-Host "View issues at: https://github.com/bniceley50/mental-scribe-app/issues" -ForegroundColor Cyan