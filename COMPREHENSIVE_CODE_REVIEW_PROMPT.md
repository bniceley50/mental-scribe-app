# Comprehensive Code Review & Security Analysis Prompt

## Purpose
This document provides a complete, systematic approach to conducting thorough code reviews covering security vulnerabilities, technical debt, best coding practices, performance optimization, and compliance requirements for the Mental Scribe clinical documentation system.

## Table of Contents
1. [Executive Summary Template](#executive-summary-template)
2. [Security & Vulnerability Analysis](#security--vulnerability-analysis)
3. [Code Quality & Best Practices](#code-quality--best-practices)
4. [Technical Debt Assessment](#technical-debt-assessment)
5. [Performance & Optimization](#performance--optimization)
6. [Architecture & Design Review](#architecture--design-review)
7. [Testing & Quality Assurance](#testing--quality-assurance)
8. [Accessibility & Compliance](#accessibility--compliance)
9. [Documentation & Maintainability](#documentation--maintainability)
10. [Dependency & Supply Chain Security](#dependency--supply-chain-security)
11. [DevOps & CI/CD Pipeline](#devops--cicd-pipeline)
12. [Additional Review Areas](#additional-review-areas)
13. [Review Methodology](#review-methodology)
14. [Deliverables & Reporting](#deliverables--reporting)

---

## Executive Summary Template

After completing the review, provide a concise executive summary:

```markdown
# Code Review Report: mental-scribe-app
**Date**: [YYYY-MM-DD]
**Reviewer**: [Name/Team]
**Branch/Commit**: [branch-name / commit-sha]
**Overall Grade**: [A+/A/A-/B+/B/B-/C+/C/C-/D/F]

## Summary
[2-3 paragraphs covering: scope of review, major findings, overall health assessment]

## Key Metrics
| Category | Score | Critical | High | Medium | Low | Notes |
|----------|-------|----------|------|--------|-----|-------|
| Security | A/B/C/D/F | 0 | 0 | 2 | 5 | [brief note] |
| Code Quality | A/B/C/D/F | 0 | 1 | 3 | 8 | [brief note] |
| Performance | A/B/C/D/F | 0 | 0 | 1 | 2 | [brief note] |
| Tech Debt | Low/Med/High | - | - | - | - | [brief note] |
| Test Coverage | 70% | - | - | - | - | [brief note] |

## Recommendations Priority
**Critical (Fix Immediately)**: [count]
**High (Fix Within 1 Week)**: [count]
**Medium (Fix Within 1 Month)**: [count]
**Low (Consider for Future)**: [count]

## Ship Decision
**Status**: ✅ APPROVED / ⚠️ APPROVED WITH CONDITIONS / 🛑 BLOCKED
**Reasoning**: [1-2 sentences]
```

---

## Security & Vulnerability Analysis

### 1.1 Authentication & Authorization

#### 1.1.1 Authentication Mechanisms
**Review Checklist**:
- [ ] **Password Security**
  - [ ] Minimum password length enforced (12+ characters recommended)
  - [ ] Password complexity requirements (uppercase, lowercase, numbers, symbols)
  - [ ] Password breach detection integrated (HIBP or similar)
  - [ ] Fail-closed semantics on breach detection API failures
  - [ ] Server-side validation (not just client-side)
  - [ ] Password history prevention (last 10 passwords)
  - [ ] Secure password hashing (bcrypt, argon2, or scrypt)

- [ ] **Account Security**
  - [ ] Account lockout after failed attempts (5 attempts in 15 min recommended)
  - [ ] Rate limiting on login endpoints
  - [ ] Lockout notification to legitimate user
  - [ ] CAPTCHA or similar bot protection
  - [ ] Session timeout configuration
  - [ ] Automatic logout on inactivity

- [ ] **Multi-Factor Authentication (MFA)**
  - [ ] MFA enrollment flow implemented
  - [ ] TOTP (Time-based One-Time Password) support
  - [ ] Recovery codes generated and securely stored (hashed with salt)
  - [ ] MFA enforcement for privileged accounts (admin, treating_provider)
  - [ ] SMS/Email backup options (if applicable)
  - [ ] MFA unenrollment requires re-authentication

**Verification Commands**:
```bash
# Check for password validation
rg "password.*min|minLength.*password" src/ --type ts

# Check for HIBP integration
rg "pwnedpasswords|hibp|breach" supabase/functions/ src/

# Check for MFA implementation
rg "mfa|multi.factor|totp|recovery.code" src/ supabase/

# Check account lockout logic
rg "account.*lock|failed.*attempt|login.*attempt" src/ supabase/
```

#### 1.1.2 Authorization & Access Control
**Review Checklist**:
- [ ] **Role-Based Access Control (RBAC)**
  - [ ] Roles stored in separate `user_roles` table (NOT on profiles)
  - [ ] Roles enforced server-side via security definer functions
  - [ ] No client-side role checks (localStorage/sessionStorage)
  - [ ] Role hierarchy properly implemented
  - [ ] Principle of least privilege followed
  - [ ] Role changes audited

- [ ] **Row-Level Security (RLS)**
  - [ ] All tables with sensitive data have RLS enabled
  - [ ] `FORCE ROW LEVEL SECURITY` on all PHI/PII tables
  - [ ] RESTRICTIVE policies to block anonymous access
  - [ ] Policies verified for logic errors
  - [ ] No recursive RLS issues (functions don't query tables they protect)
  - [ ] Service role properly constrained

- [ ] **Function Security**
  - [ ] Security definer functions use `SET search_path = public`
  - [ ] Functions validate all inputs
  - [ ] No SQL injection vulnerabilities
  - [ ] Proper error handling (don't leak sensitive info)

**Verification Commands**:
```bash
# Check for FORCE RLS on all sensitive tables
rg "FORCE ROW LEVEL SECURITY" supabase/migrations/

# Check for anonymous blocking policies
rg "RESTRICTIVE.*FOR ALL.*USING \(false\)" supabase/migrations/

# Check role implementation
rg "user_roles|has_role|app_role" supabase/migrations/

# Check for client-side role checks (anti-pattern)
rg "localStorage.*role|sessionStorage.*role" src/
```

#### 1.1.3 Session Management
**Review Checklist**:
- [ ] **Session Storage**
  - [ ] Auth tokens stored in sessionStorage (NOT localStorage for PHI apps)
  - [ ] Session expires on browser tab close
  - [ ] No sensitive data persisted in localStorage
  - [ ] Draft data uses sessionStorage with auto-clear
  - [ ] Session tokens rotated on privilege escalation

- [ ] **Session Security**
  - [ ] Secure and HttpOnly cookies (if applicable)
  - [ ] SameSite cookie attribute set
  - [ ] Session fixation prevention
  - [ ] Concurrent session limits
  - [ ] Session invalidation on logout

**Verification Commands**:
```bash
# Check storage usage
rg "localStorage|sessionStorage" src/ --type ts

# Check for sessionStorage adapter
rg "sessionStorageAdapter|storage.*sessionStorage" src/integrations/

# Check for secure session config
rg "httpOnly|secure|sameSite" src/ supabase/
```

### 1.2 Data Protection & Privacy

#### 1.2.1 Encryption
**Review Checklist**:
- [ ] **Encryption in Transit**
  - [ ] HTTPS enforced (no mixed content)
  - [ ] TLS 1.2+ minimum version
  - [ ] HSTS headers configured
  - [ ] Certificate validation in API calls
  - [ ] No insecure WebSocket connections

- [ ] **Encryption at Rest**
  - [ ] Database encryption enabled (Supabase default)
  - [ ] File storage encryption enabled
  - [ ] Secrets encrypted in environment variables
  - [ ] Backup encryption verified

- [ ] **Client-Side Encryption** (if applicable)
  - [ ] End-to-end encryption for ultra-sensitive data
  - [ ] Key management strategy documented
  - [ ] No hardcoded encryption keys

**Verification Commands**:
```bash
# Check for insecure HTTP
rg "http://|ws://" src/ --type ts | grep -v "localhost|127.0.0.1"

# Check for hardcoded keys
rg "secret.*=.*['\"]|api.?key.*=.*['\"]|password.*=.*['\"]" src/ --type ts
```

#### 1.2.2 PHI/PII Protection (Healthcare Specific)
**Review Checklist**:
- [ ] **Data Classification**
  - [ ] Data classification enum defined (standard_phi, part2_protected)
  - [ ] Automatic classification triggers on data creation
  - [ ] Program-based classification logic correct
  - [ ] Classification metadata in audit logs

- [ ] **42 CFR Part 2 Compliance** (Substance Use Disorder Records)
  - [ ] Part 2 consent management implemented
  - [ ] Consent creation, renewal, revocation flows
  - [ ] Consent expiry dates enforced
  - [ ] Consent-based RLS policies active
  - [ ] Disclosure logging for Part 2 data
  - [ ] Immutable consent records (no UPDATE/DELETE)

- [ ] **HIPAA Compliance**
  - [ ] Minimum necessary access enforced
  - [ ] Access control lists (ACL) implemented
  - [ ] Patient assignments for staff access
  - [ ] Audit trail for all PHI access
  - [ ] Encryption (covered in 1.2.1)
  - [ ] Business Associate Agreements (BAA) for third parties

**Verification Commands**:
```bash
# Check data classification implementation
rg "data_classification|part2_protected|standard_phi" supabase/

# Check Part 2 consent logic
rg "part2_consent|has_active_part2_consent" supabase/

# Check patient assignment logic
rg "patient_assignment|is_assigned_to_patient" supabase/
```

#### 1.2.3 Input Validation & Sanitization
**Review Checklist**:
- [ ] **Client-Side Validation**
  - [ ] Zod schemas for all form inputs
  - [ ] Email validation (regex or library)
  - [ ] URL validation and sanitization
  - [ ] File type validation (whitelist approach)
  - [ ] File size limits enforced
  - [ ] Filename sanitization

- [ ] **Server-Side Validation**
  - [ ] Edge functions validate all inputs (no trust in client)
  - [ ] Type validation with TypeScript
  - [ ] Schema validation with Zod or similar
  - [ ] Boundary checking (min/max values)
  - [ ] Format validation (dates, phone numbers, etc.)

- [ ] **Output Encoding**
  - [ ] HTML escaping for user-generated content
  - [ ] DOMPurify or similar for rich text
  - [ ] JSON encoding for API responses
  - [ ] SQL parameterization (avoid string concatenation)
  - [ ] URL encoding for query parameters

- [ ] **Injection Prevention**
  - [ ] **SQL Injection**: Parameterized queries only
  - [ ] **XSS (Cross-Site Scripting)**: Content sanitization, CSP headers
  - [ ] **NoSQL Injection**: Input validation for Supabase queries
  - [ ] **Command Injection**: Avoid shell commands with user input
  - [ ] **LDAP Injection**: Not applicable (document if using LDAP)
  - [ ] **XML Injection**: Not applicable (document if parsing XML)

**Verification Commands**:
```bash
# Check for Zod validation
rg "z\.|zod|schema" src/ --type ts

# Check for DOMPurify usage
rg "DOMPurify|sanitize" src/ --type ts

# Check for SQL injection risks (raw queries)
rg "\.query\(|\.raw\(|SELECT.*\$\{|INSERT.*\$\{" supabase/

# Check for XSS risks (innerHTML, dangerouslySetInnerHTML)
rg "innerHTML|dangerouslySetInnerHTML" src/ --type tsx
```

### 1.3 Application Security Headers

**Review Checklist**:
- [ ] **Content Security Policy (CSP)**
  - [ ] CSP headers configured in edge functions
  - [ ] CSP directives restrictive (no 'unsafe-inline', 'unsafe-eval' if possible)
  - [ ] Nonce or hash-based CSP for inline scripts
  - [ ] CSP violations logged and monitored
  - [ ] CSP report-uri or report-to configured

- [ ] **Additional Security Headers**
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY` or `SAMEORIGIN`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `Permissions-Policy` (formerly Feature-Policy)
  - [ ] `Strict-Transport-Security` (HSTS)

**Verification Commands**:
```bash
# Check for CSP in edge functions
rg "Content-Security-Policy" supabase/functions/

# Check for security headers
rg "X-Frame-Options|X-Content-Type|Referrer-Policy|Strict-Transport" supabase/

# Check Vite CSP plugin configuration
rg "csp|Content-Security-Policy" vite.config.ts vite-plugin-csp.ts
```

### 1.4 Audit Logging & Monitoring

**Review Checklist**:
- [ ] **Comprehensive Audit Trail**
  - [ ] All PHI access logged (SELECT, INSERT, UPDATE, DELETE)
  - [ ] Client view logging via `log_client_view()` RPC
  - [ ] Conversation access logging
  - [ ] Part 2 consent changes logged
  - [ ] Patient assignment changes logged
  - [ ] Role/permission changes logged
  - [ ] Authentication events logged (login, logout, MFA)

- [ ] **Audit Log Security**
  - [ ] Audit logs are immutable (no UPDATE policy)
  - [ ] DELETE restricted to admins only (or blocked entirely)
  - [ ] Audit logs stored in separate table with strict RLS
  - [ ] Only admins can SELECT audit logs
  - [ ] Service role inserts via triggers (not client)
  - [ ] Metadata sanitization (strip passwords, tokens, secrets)

- [ ] **Anomaly Detection**
  - [ ] Suspicious access pattern detection (e.g., `get_suspicious_access_patterns()`)
  - [ ] Alert on rapid consecutive access
  - [ ] Alert on after-hours access (if applicable)
  - [ ] Alert on cross-program access attempts
  - [ ] Failed login attempt monitoring

**Verification Commands**:
```bash
# Check audit log table definition
rg "audit_logs|audit_log" supabase/migrations/

# Check for audit triggers
rg "audit.*trigger|AFTER INSERT.*audit|AFTER UPDATE.*audit" supabase/migrations/

# Check for metadata sanitization
rg "sanitize_audit_metadata" supabase/

# Check for anomaly detection
rg "suspicious.*access|anomaly|unusual.*pattern" supabase/
```

### 1.5 API Security

**Review Checklist**:
- [ ] **Rate Limiting**
  - [ ] Rate limits on all public endpoints
  - [ ] Database-backed rate limiting (not just in-memory)
  - [ ] Different limits for different endpoints
  - [ ] Rate limit exceeded returns 429 status
  - [ ] Rate limit headers included (X-RateLimit-*)

- [ ] **CORS Configuration**
  - [ ] CORS headers properly configured
  - [ ] Allowed origins explicitly listed (no wildcard in production)
  - [ ] Preflight requests handled
  - [ ] Credentials allowed only for trusted origins

- [ ] **API Authentication**
  - [ ] JWT validation on all edge functions
  - [ ] API keys rotated regularly (if applicable)
  - [ ] No API keys in client-side code
  - [ ] Bearer token validation
  - [ ] Token expiry enforced

**Verification Commands**:
```bash
# Check rate limiting implementation
rg "rate.?limit|throttle" supabase/functions/ supabase/migrations/

# Check CORS configuration
rg "Access-Control-Allow|cors" supabase/functions/

# Check JWT validation
rg "jwt|verify.*token|auth.*token" supabase/functions/
```

### 1.6 File Upload Security

**Review Checklist**:
- [ ] **File Validation**
  - [ ] File type validation (whitelist: PDF, TXT, DOCX, etc.)
  - [ ] Magic number verification (not just extension)
  - [ ] File size limits enforced (e.g., 10MB max)
  - [ ] Filename sanitization (remove special chars, path traversal)
  - [ ] Virus scanning (if applicable)

- [ ] **File Storage Security**
  - [ ] Private buckets only (no public access)
  - [ ] Signed URLs with expiry (1 hour recommended)
  - [ ] User-specific folder structure
  - [ ] RLS on storage buckets
  - [ ] File deletion on record deletion

**Verification Commands**:
```bash
# Check file upload logic
rg "upload.*file|file.*upload" src/lib/ --type ts

# Check for signed URL generation
rg "signedUrl|createSignedUrl|getSignedUrl" src/lib/

# Check storage RLS policies
rg "storage.*policy|bucket.*policy" supabase/migrations/
```

### 1.7 Secret Management

**Review Checklist**:
- [ ] **Environment Variables**
  - [ ] All secrets in environment variables (not hardcoded)
  - [ ] `.env.example` comprehensive and up-to-date
  - [ ] `.env` files gitignored
  - [ ] Environment validation on app startup
  - [ ] Default values appropriate for development

- [ ] **Secret Scanning**
  - [ ] No API keys in commit history
  - [ ] No passwords in codebase
  - [ ] No private keys committed
  - [ ] Gitleaks or similar tool configured
  - [ ] Pre-commit hooks prevent secret commits

- [ ] **Secret Rotation**
  - [ ] Process for rotating API keys documented
  - [ ] Database credentials rotatable
  - [ ] JWT signing keys rotatable
  - [ ] Secret expiry dates tracked

**Verification Commands**:
```bash
# Check for hardcoded secrets (basic scan)
rg "api.?key.*=.*['\"]|secret.*=.*['\"]|password.*=.*['\"]" src/ --type ts

# Check .env.example completeness
diff <(grep "^[A-Z_]*=" .env.example | cut -d= -f1 | sort) <(grep "^[A-Z_]*=" .env | cut -d= -f1 | sort)

# Check for gitleaks configuration
ls -la .gitleaks.toml
```

### 1.8 Dependency Vulnerabilities

**Review Checklist**:
- [ ] **Vulnerability Scanning**
  - [ ] `npm audit` or `yarn audit` run regularly
  - [ ] Critical/high vulnerabilities addressed
  - [ ] Automated scanning in CI/CD pipeline
  - [ ] Snyk, Dependabot, or similar tool configured
  - [ ] Vulnerabilities tracked in issue tracker

- [ ] **Dependency Updates**
  - [ ] Dependencies updated regularly (monthly)
  - [ ] Security patches applied immediately
  - [ ] Breaking changes reviewed before updating
  - [ ] Lockfile committed (`package-lock.json`, `pnpm-lock.yaml`)

- [ ] **Supply Chain Security**
  - [ ] Dependencies from trusted sources (npm, GitHub)
  - [ ] Package integrity verified (checksums)
  - [ ] No deprecated packages
  - [ ] Minimal dependencies (avoid bloat)
  - [ ] License compatibility checked

**Verification Commands**:
```bash
# Run npm audit
npm audit --audit-level=moderate

# Check for outdated packages
npm outdated

# Check for deprecated packages
npm ls --depth=0 2>&1 | grep -i "deprecated"
```

---

## Code Quality & Best Practices

### 2.1 TypeScript Best Practices

**Review Checklist**:
- [ ] **Type Safety**
  - [ ] No `any` types (use `unknown` if truly unknown)
  - [ ] Strict mode enabled in `tsconfig.json`
  - [ ] Type definitions for all function parameters and returns
  - [ ] Interface over type aliases (consistency)
  - [ ] Enums used for fixed sets of values
  - [ ] Generics used appropriately

- [ ] **Code Organization**
  - [ ] Consistent import order (external, internal, relative)
  - [ ] Barrel exports for cleaner imports (`index.ts`)
  - [ ] Single responsibility principle
  - [ ] DRY (Don't Repeat Yourself)
  - [ ] SOLID principles followed

- [ ] **Naming Conventions**
  - [ ] PascalCase for components, classes, types, interfaces
  - [ ] camelCase for functions, variables, props
  - [ ] UPPER_SNAKE_CASE for constants
  - [ ] Descriptive names (avoid abbreviations)
  - [ ] Boolean variables prefixed with is/has/should

**Verification Commands**:
```bash
# Check for 'any' type usage
rg ": any|<any>|any\[\]" src/ --type ts

# Check TypeScript config
cat tsconfig.json | jq '.compilerOptions.strict'

# Run TypeScript compiler check
npm run type-check
```

### 2.2 React Best Practices

**Review Checklist**:
- [ ] **Component Design**
  - [ ] Functional components with hooks (no class components)
  - [ ] Components < 300 lines (prefer smaller, focused components)
  - [ ] Props interface defined for all components
  - [ ] PropTypes or TypeScript for type checking
  - [ ] Default props defined when appropriate
  - [ ] Proper key prop in lists (not array index)

- [ ] **Hook Usage**
  - [ ] Hooks only at top level (not in loops/conditions)
  - [ ] Custom hooks for reusable logic
  - [ ] Dependency arrays complete and correct
  - [ ] `useCallback` for memoized callbacks
  - [ ] `useMemo` for expensive computations
  - [ ] `useEffect` cleanup functions

- [ ] **State Management**
  - [ ] State lifted to appropriate level
  - [ ] Context used for global state
  - [ ] Zustand/Redux for complex state (if applicable)
  - [ ] Avoid prop drilling (use context or state management)
  - [ ] Immutable state updates
  - [ ] State batching for performance

- [ ] **Performance Optimization**
  - [ ] React.memo for pure components
  - [ ] Code splitting with React.lazy and Suspense
  - [ ] Virtualization for long lists (react-window, react-virtualized)
  - [ ] Image lazy loading
  - [ ] Avoid inline function definitions in JSX
  - [ ] Debouncing/throttling for expensive operations

**Verification Commands**:
```bash
# Check component sizes
find src/components -name "*.tsx" -exec wc -l {} \; | sort -rn | head -20

# Check for class components
rg "class.*extends.*Component|React.Component" src/ --type tsx

# Check for missing keys
rg "\.map\(.*=>" src/ --type tsx -A2 | grep -v "key="
```

### 2.3 Code Style & Formatting

**Review Checklist**:
- [ ] **Linting**
  - [ ] ESLint configured and enforced
  - [ ] No ESLint errors in codebase
  - [ ] ESLint warnings addressed or justified
  - [ ] Prettier for consistent formatting
  - [ ] Pre-commit hooks enforce linting
  - [ ] VSCode/IDE settings shared (.editorconfig)

- [ ] **Code Formatting**
  - [ ] Consistent indentation (2 or 4 spaces)
  - [ ] Semicolons consistent (all or none)
  - [ ] Single vs double quotes consistent
  - [ ] Trailing commas in multiline
  - [ ] Max line length enforced (80-120 chars)

- [ ] **Comments & Documentation**
  - [ ] JSDoc comments for public APIs
  - [ ] Complex logic explained with comments
  - [ ] TODO/FIXME tracked in issue tracker
  - [ ] No commented-out code (use git history)
  - [ ] README updated with setup instructions

**Verification Commands**:
```bash
# Run linter
npm run lint

# Check for lint errors
npm run lint 2>&1 | grep -c "error"

# Check for commented-out code
rg "^[ \t]*//.*=|^[ \t]*//.*function|^[ \t]*//.*const" src/ --type ts

# Check for TODO/FIXME
rg "TODO|FIXME|HACK|XXX" src/
```

### 2.4 Error Handling

**Review Checklist**:
- [ ] **Error Boundaries**
  - [ ] React error boundaries at appropriate levels
  - [ ] Fallback UI for error states
  - [ ] Error logging to monitoring service
  - [ ] User-friendly error messages

- [ ] **Exception Handling**
  - [ ] Try-catch for async operations
  - [ ] Error handling in API calls
  - [ ] Graceful degradation on failures
  - [ ] Network error handling
  - [ ] Timeout handling

- [ ] **User Feedback**
  - [ ] Toast notifications for errors
  - [ ] Loading states during async operations
  - [ ] Success feedback on actions
  - [ ] Clear error messages (no technical jargon)
  - [ ] Retry mechanisms for failed requests

**Verification Commands**:
```bash
# Check for error boundaries
rg "ErrorBoundary|componentDidCatch" src/ --type tsx

# Check for unhandled promises
rg "\.then\(|\.catch\(" src/ --type ts -A1 | grep -v "catch"

# Check for console.log in production
rg "console\.(log|debug|info)" src/ --type ts
```

### 2.5 Function & Method Design

**Review Checklist**:
- [ ] **Function Complexity**
  - [ ] Functions < 50 lines (prefer smaller)
  - [ ] Cyclomatic complexity < 10
  - [ ] Nesting depth < 4 levels
  - [ ] Single responsibility per function
  - [ ] Pure functions where possible
  - [ ] Side effects clearly isolated

- [ ] **Function Signatures**
  - [ ] Descriptive function names (verb-based)
  - [ ] Max 3-4 parameters (use object destructuring for more)
  - [ ] Optional parameters last
  - [ ] Return types explicitly defined
  - [ ] Early returns for guard clauses

**Verification Commands**:
```bash
# Check function sizes (approximate)
rg "function|const.*=.*\(" src/ --type ts | wc -l
```

---

## Technical Debt Assessment

### 3.1 Quantified Debt Scoring

Use the scoring system from `TECHNICAL_DEBT_ANALYSIS.md`:

| **Criteria** | **Scale** | **Definition** |
|---|---|---|
| **Business Impact** | 1-5 | Effect on users, revenue, productivity |
| **Effort to Fix** | 1-5 | Work required (1=hours, 5=months) |
| **Debt Score** | Impact/Effort | Higher scores = higher ROI fixes |

**Priority Levels**:
- 🔴 **P0 (Critical)**: Score 3.5+ or blocks deployment/security
- 🟡 **P1 (High)**: Score 2.0-3.4, impacts team velocity significantly
- 🔵 **P2 (Medium)**: Score 1.0-1.9, quality of life improvements
- ⚪ **P3 (Low)**: Score <1.0, future considerations

### 3.2 Common Technical Debt Areas

**Review Checklist**:
- [ ] **Code Duplication**
  - [ ] Identify repeated code blocks (> 10 lines)
  - [ ] Extract to shared utilities/hooks
  - [ ] DRY violations documented
  - [ ] Copy-paste detected (similar logic in multiple files)

- [ ] **Monolithic Components**
  - [ ] Components > 500 lines flagged
  - [ ] Decomposition plan created
  - [ ] State management refactored
  - [ ] Separation of concerns improved

- [ ] **Outdated Dependencies**
  - [ ] Major version updates planned
  - [ ] Migration guides reviewed
  - [ ] Breaking changes assessed
  - [ ] Update timeline documented

- [ ] **Missing Tests**
  - [ ] Test coverage gaps identified
  - [ ] Critical paths prioritized for testing
  - [ ] Test plan created
  - [ ] Testing timeline estimated

- [ ] **Configuration Debt**
  - [ ] Environment variables documented
  - [ ] Configuration centralized
  - [ ] Hardcoded values eliminated
  - [ ] Feature flags managed

**Verification Commands**:
```bash
# Find large components
find src/components -name "*.tsx" -exec wc -l {} \; | awk '$1 > 500' | sort -rn

# Check for code duplication (using jscpd or similar)
npx jscpd src/

# Identify outdated dependencies
npm outdated
```

### 3.3 Architecture Debt

**Review Checklist**:
- [ ] **Design Patterns**
  - [ ] Inconsistent patterns across codebase
  - [ ] Anti-patterns identified
  - [ ] Refactoring opportunities documented
  - [ ] Pattern migration plan

- [ ] **Scalability Concerns**
  - [ ] Database query performance at scale
  - [ ] N+1 query problems
  - [ ] Indexing strategy reviewed
  - [ ] Caching strategy implemented

- [ ] **Coupling & Cohesion**
  - [ ] High coupling between modules
  - [ ] Low cohesion within modules
  - [ ] Circular dependencies
  - [ ] God objects/components

---

## Performance & Optimization

### 4.1 Frontend Performance

**Review Checklist**:
- [ ] **Bundle Size**
  - [ ] Total bundle < 500KB (gzipped)
  - [ ] Code splitting implemented
  - [ ] Tree shaking enabled
  - [ ] Unused code eliminated
  - [ ] Source maps disabled in production

- [ ] **Loading Performance**
  - [ ] First Contentful Paint (FCP) < 1.8s
  - [ ] Largest Contentful Paint (LCP) < 2.5s
  - [ ] Time to Interactive (TTI) < 3.8s
  - [ ] Cumulative Layout Shift (CLS) < 0.1
  - [ ] Route-based code splitting

- [ ] **Runtime Performance**
  - [ ] No unnecessary re-renders
  - [ ] Memoization used appropriately
  - [ ] Virtual scrolling for large lists
  - [ ] Image optimization (WebP, lazy loading)
  - [ ] Debouncing/throttling for user input

- [ ] **Network Performance**
  - [ ] API call batching
  - [ ] Request caching (React Query, SWR)
  - [ ] Compression enabled (gzip/brotli)
  - [ ] CDN usage for static assets
  - [ ] HTTP/2 or HTTP/3 enabled

**Verification Commands**:
```bash
# Build and check bundle size
npm run build
ls -lh dist/assets/*.js

# Run Lighthouse audit
npx lighthouse https://your-app-url --view

# Check for bundle analysis
npm run build -- --analyze  # if configured
```

### 4.2 Database Performance

**Review Checklist**:
- [ ] **Query Optimization**
  - [ ] Indexes on frequently queried columns
  - [ ] No SELECT * queries
  - [ ] Joins optimized
  - [ ] N+1 queries eliminated
  - [ ] Query plans reviewed (EXPLAIN ANALYZE)

- [ ] **Connection Management**
  - [ ] Connection pooling configured
  - [ ] Connection limits appropriate
  - [ ] Connection leaks prevented
  - [ ] Idle connection timeout set

- [ ] **Data Management**
  - [ ] Pagination for large datasets
  - [ ] Archive strategy for old data
  - [ ] Soft deletes with cleanup job
  - [ ] Table partitioning (if applicable)

**Verification Commands**:
```bash
# Check for indexes in migrations
rg "CREATE INDEX|CREATE UNIQUE INDEX" supabase/migrations/

# Check for SELECT *
rg "SELECT \*|select \*" supabase/migrations/ src/

# Check for potential N+1 queries
rg "\.map\(.*supabase|forEach.*supabase" src/ --type ts
```

### 4.3 Edge Function Performance

**Review Checklist**:
- [ ] **Cold Start Optimization**
  - [ ] Minimal dependencies
  - [ ] Lazy loading of heavy modules
  - [ ] Function warming strategy (if needed)
  - [ ] Code size < 1MB

- [ ] **Execution Time**
  - [ ] Functions complete < 10s (Supabase limit)
  - [ ] Async operations optimized
  - [ ] Database queries efficient
  - [ ] External API calls cached

**Verification Commands**:
```bash
# Check edge function sizes
du -sh supabase/functions/*/

# Check for heavy dependencies
rg "import.*from|require\(" supabase/functions/
```

---

## Architecture & Design Review

### 5.1 System Architecture

**Review Checklist**:
- [ ] **Architecture Documentation**
  - [ ] System architecture diagram exists
  - [ ] Component interactions documented
  - [ ] Data flow diagrams current
  - [ ] Technology stack documented
  - [ ] Deployment architecture documented

- [ ] **Separation of Concerns**
  - [ ] Clear boundaries between layers
  - [ ] Business logic separate from presentation
  - [ ] Data access layer abstracted
  - [ ] API layer well-defined

- [ ] **Scalability Design**
  - [ ] Horizontal scaling possible
  - [ ] Stateless design where appropriate
  - [ ] Database sharding strategy (if needed)
  - [ ] Load balancing configured

**Verification**:
```bash
# Check for architecture documentation
ls -la docs/ARCHITECTURE.md docs/diagrams/
```

### 5.2 Database Schema Design

**Review Checklist**:
- [ ] **Normalization**
  - [ ] Third normal form (3NF) achieved
  - [ ] No data duplication
  - [ ] Foreign keys properly defined
  - [ ] Constraints enforced (NOT NULL, UNIQUE, CHECK)

- [ ] **Relationships**
  - [ ] One-to-many relationships correct
  - [ ] Many-to-many with junction tables
  - [ ] Cascade rules appropriate
  - [ ] Referential integrity maintained

- [ ] **Data Types**
  - [ ] Appropriate types for data (UUID, TIMESTAMPTZ, JSONB)
  - [ ] Enum types for fixed values
  - [ ] No VARCHAR without limit
  - [ ] Numeric precision appropriate

**Verification Commands**:
```bash
# Check schema export
cat COMPLETE_SCHEMA_EXPORT.sql | grep "CREATE TABLE" | wc -l

# Check for foreign keys
rg "FOREIGN KEY|REFERENCES" supabase/migrations/

# Check for constraints
rg "NOT NULL|UNIQUE|CHECK" supabase/migrations/
```

### 5.3 API Design

**Review Checklist**:
- [ ] **RESTful Design** (if applicable)
  - [ ] Resource-based URLs
  - [ ] HTTP methods used correctly (GET, POST, PUT, DELETE)
  - [ ] Proper status codes (200, 201, 400, 404, 500)
  - [ ] Consistent URL structure
  - [ ] Versioning strategy (v1, v2)

- [ ] **GraphQL Design** (if applicable)
  - [ ] Schema well-defined
  - [ ] Query complexity limits
  - [ ] N+1 query prevention (DataLoader)
  - [ ] Pagination implemented

- [ ] **Edge Functions** (Supabase specific)
  - [ ] Function naming convention consistent
  - [ ] Error responses standardized
  - [ ] Request/response schemas documented
  - [ ] CORS properly configured

---

## Testing & Quality Assurance

### 6.1 Test Coverage

**Review Checklist**:
- [ ] **Unit Tests**
  - [ ] Test coverage > 70% (aim for 80%+)
  - [ ] Critical business logic covered
  - [ ] Edge cases tested
  - [ ] Utility functions tested
  - [ ] Custom hooks tested

- [ ] **Integration Tests**
  - [ ] API integration tests
  - [ ] Database integration tests
  - [ ] External service mocks
  - [ ] Component integration tests

- [ ] **End-to-End Tests**
  - [ ] Critical user flows tested
  - [ ] Authentication flow tested
  - [ ] Data creation/modification tested
  - [ ] Cross-browser testing (if applicable)

- [ ] **Security Tests**
  - [ ] RLS policy tests
  - [ ] Authentication tests
  - [ ] Authorization tests
  - [ ] Input validation tests

**Verification Commands**:
```bash
# Run tests with coverage
npm run test:coverage

# Check test files
find src -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | wc -l

# Run e2e tests
npm run test:e2e
```

### 6.2 Test Quality

**Review Checklist**:
- [ ] **Test Structure**
  - [ ] Arrange-Act-Assert (AAA) pattern
  - [ ] Descriptive test names
  - [ ] One assertion per test (when possible)
  - [ ] Test isolation (no shared state)
  - [ ] Proper setup and teardown

- [ ] **Test Maintainability**
  - [ ] Tests don't test implementation details
  - [ ] Mock usage minimized (prefer real implementations)
  - [ ] Test data factories/fixtures
  - [ ] Tests run fast (< 5s for unit tests)
  - [ ] Flaky tests eliminated

**Verification Commands**:
```bash
# Run tests multiple times to check for flakiness
for i in {1..5}; do npm test && echo "Run $i passed"; done
```

---

## Accessibility & Compliance

### 7.1 Accessibility (a11y)

**Review Checklist**:
- [ ] **WCAG 2.1 Level AA Compliance**
  - [ ] Color contrast ratios meet 4.5:1 (text) and 3:1 (UI)
  - [ ] Text resizable up to 200% without loss of functionality
  - [ ] No information conveyed by color alone
  - [ ] Focus indicators visible on all interactive elements

- [ ] **Keyboard Navigation**
  - [ ] All functionality keyboard accessible
  - [ ] Logical tab order
  - [ ] Skip navigation links
  - [ ] Keyboard shortcuts documented
  - [ ] No keyboard traps

- [ ] **Screen Reader Support**
  - [ ] Semantic HTML (header, nav, main, footer, section)
  - [ ] ARIA labels on interactive elements
  - [ ] ARIA roles used appropriately
  - [ ] Form labels associated with inputs
  - [ ] Alt text for images
  - [ ] Live regions for dynamic content

- [ ] **Visual Accessibility**
  - [ ] Support for reduced motion
  - [ ] High contrast mode support
  - [ ] Focus visible in all states
  - [ ] No flashing content (seizure risk)

**Verification Commands**:
```bash
# Run accessibility linter
npx eslint-plugin-jsx-a11y

# Check for ARIA attributes
rg "aria-|role=" src/ --type tsx

# Check for alt attributes on images
rg "<img" src/ --type tsx | grep -v "alt="
```

### 7.2 HIPAA Compliance Review

**Review Checklist** (Healthcare Specific):
- [ ] **Administrative Safeguards**
  - [ ] Security management process documented
  - [ ] Assigned security responsibility
  - [ ] Workforce security training
  - [ ] Information access management
  - [ ] Security awareness and training

- [ ] **Physical Safeguards**
  - [ ] Facility access controls
  - [ ] Workstation use policy
  - [ ] Workstation security
  - [ ] Device and media controls

- [ ] **Technical Safeguards**
  - [ ] Access control (unique user IDs, emergency access)
  - [ ] Audit controls (see section 1.4)
  - [ ] Integrity controls (data validation)
  - [ ] Transmission security (encryption)

- [ ] **Breach Notification**
  - [ ] Breach detection mechanisms
  - [ ] Breach notification process
  - [ ] Breach log maintained
  - [ ] Risk assessment process

### 7.3 42 CFR Part 2 Compliance (Substance Use Disorder)

**Review Checklist**:
- [ ] **Consent Management**
  - [ ] Written consent obtained
  - [ ] Consent elements complete
  - [ ] Consent expiry enforced
  - [ ] Revocation process implemented
  - [ ] Consent audit trail

- [ ] **Disclosure Controls**
  - [ ] Part 2 data clearly identified
  - [ ] Disclosure requires active consent
  - [ ] Disclosure logged
  - [ ] Recipient of disclosure documented
  - [ ] Purpose of disclosure documented

---

## Documentation & Maintainability

### 8.1 Code Documentation

**Review Checklist**:
- [ ] **Inline Documentation**
  - [ ] Complex algorithms explained
  - [ ] Business logic rationale documented
  - [ ] Function/method JSDoc comments
  - [ ] Type definitions documented
  - [ ] API contracts documented

- [ ] **README Files**
  - [ ] Root README comprehensive
  - [ ] Getting started instructions
  - [ ] Development setup guide
  - [ ] Build and deployment instructions
  - [ ] Contributing guidelines

- [ ] **Architecture Documentation**
  - [ ] `docs/ARCHITECTURE.md` current
  - [ ] System diagrams up-to-date
  - [ ] Data flow documented
  - [ ] Technology choices explained
  - [ ] Third-party integrations documented

- [ ] **API Documentation**
  - [ ] Edge function documentation
  - [ ] Request/response examples
  - [ ] Error codes documented
  - [ ] Authentication requirements clear
  - [ ] Rate limits documented

**Verification**:
```bash
# Check for README
ls -la README.md */README.md

# Check documentation directory
ls -la docs/

# Check for inline documentation
rg "/\*\*|///" src/ --type ts | wc -l
```

### 8.2 Change Documentation

**Review Checklist**:
- [ ] **Changelog**
  - [ ] `CHANGELOG.md` updated
  - [ ] Semantic versioning followed
  - [ ] Breaking changes highlighted
  - [ ] Migration guides provided

- [ ] **Migration Guides**
  - [ ] Database migration documentation
  - [ ] API migration guides
  - [ ] Deprecation notices
  - [ ] Upgrade paths documented

- [ ] **Release Notes**
  - [ ] User-facing changes documented
  - [ ] New features explained
  - [ ] Bug fixes listed
  - [ ] Known issues documented

---

## Dependency & Supply Chain Security

### 9.1 Dependency Management

**Review Checklist**:
- [ ] **Dependency Inventory**
  - [ ] All dependencies documented
  - [ ] Purpose of each dependency clear
  - [ ] Alternatives considered
  - [ ] Bundle size impact assessed

- [ ] **License Compliance**
  - [ ] All licenses identified
  - [ ] License compatibility verified
  - [ ] Copyleft licenses reviewed
  - [ ] Commercial license restrictions noted

- [ ] **Dependency Updates**
  - [ ] Update schedule defined (e.g., monthly)
  - [ ] Security updates automated
  - [ ] Major version updates planned
  - [ ] Lockfile kept current

**Verification Commands**:
```bash
# List all dependencies
npm ls --depth=0

# Check licenses
npx license-checker --summary

# Check for package-lock.json
git ls-files | grep "package-lock.json\|pnpm-lock.yaml\|yarn.lock"
```

### 9.2 Supply Chain Attacks Prevention

**Review Checklist**:
- [ ] **Package Integrity**
  - [ ] Package checksums verified
  - [ ] npm/yarn audit run regularly
  - [ ] Automated dependency updates (Dependabot, Renovate)
  - [ ] Package signatures verified (if available)

- [ ] **Vendor Security**
  - [ ] Third-party services vetted
  - [ ] SLA and support agreements
  - [ ] Data processing agreements (DPA)
  - [ ] Business Associate Agreements (BAA) for HIPAA

---

## DevOps & CI/CD Pipeline

### 10.1 Continuous Integration

**Review Checklist**:
- [ ] **Build Pipeline**
  - [ ] Automated builds on every commit
  - [ ] Build fails on errors/warnings
  - [ ] Build artifacts versioned
  - [ ] Build time < 10 minutes

- [ ] **Test Pipeline**
  - [ ] Unit tests run on every commit
  - [ ] Integration tests run on PR
  - [ ] E2E tests run before merge
  - [ ] Test failures block merge

- [ ] **Code Quality Checks**
  - [ ] Linting enforced in CI
  - [ ] Type checking enforced
  - [ ] Code coverage tracked
  - [ ] Coverage thresholds enforced

**Verification**:
```bash
# Check GitHub Actions workflows
ls -la .github/workflows/

# Check for CI configuration
cat .github/workflows/*.yml | grep -E "test|lint|build"
```

### 10.2 Continuous Deployment

**Review Checklist**:
- [ ] **Deployment Automation**
  - [ ] Automated deployments to staging
  - [ ] Manual approval for production
  - [ ] Rollback capability
  - [ ] Deployment notifications

- [ ] **Environment Management**
  - [ ] Environment parity (dev, staging, prod)
  - [ ] Environment-specific configs
  - [ ] Infrastructure as Code (IaC)
  - [ ] Secrets management in CI/CD

- [ ] **Deployment Verification**
  - [ ] Health checks after deployment
  - [ ] Smoke tests post-deploy
  - [ ] Database migration verification
  - [ ] Monitoring alerts configured

---

## Additional Review Areas

### 11.1 Internationalization (i18n)

**Review Checklist** (if applicable):
- [ ] **i18n Framework**
  - [ ] i18n library integrated (react-i18next, next-i18next)
  - [ ] Translation keys extracted
  - [ ] Pluralization rules implemented
  - [ ] Date/time formatting localized

- [ ] **Content Management**
  - [ ] Translation files organized
  - [ ] Missing translations flagged
  - [ ] Translation workflow defined
  - [ ] RTL (right-to-left) support (if needed)

### 11.2 Observability & Monitoring

**Review Checklist**:
- [ ] **Logging**
  - [ ] Structured logging implemented
  - [ ] Log levels appropriate (debug, info, warn, error)
  - [ ] No sensitive data in logs
  - [ ] Log aggregation configured (if applicable)

- [ ] **Monitoring**
  - [ ] Application performance monitoring (APM)
  - [ ] Error tracking (Sentry, Rollbar)
  - [ ] Uptime monitoring
  - [ ] Custom metrics tracked

- [ ] **Alerting**
  - [ ] Critical error alerts
  - [ ] Performance degradation alerts
  - [ ] Security incident alerts
  - [ ] On-call rotation defined

### 11.3 Disaster Recovery

**Review Checklist**:
- [ ] **Backup Strategy**
  - [ ] Database backups automated
  - [ ] Backup frequency appropriate
  - [ ] Backup retention policy
  - [ ] Backup restoration tested

- [ ] **Incident Response**
  - [ ] Incident response plan documented
  - [ ] Incident severity definitions
  - [ ] Communication plan
  - [ ] Post-mortem process

### 11.4 User Experience (UX)

**Review Checklist**:
- [ ] **Loading States**
  - [ ] Skeleton loaders for async content
  - [ ] Progress indicators for long operations
  - [ ] Loading feedback consistent

- [ ] **Error States**
  - [ ] User-friendly error messages
  - [ ] Actionable error recovery
  - [ ] Error illustrations/icons
  - [ ] Contact support option

- [ ] **Empty States**
  - [ ] Helpful empty state messages
  - [ ] Call-to-action for new users
  - [ ] Onboarding hints

- [ ] **Responsive Design**
  - [ ] Mobile-first approach
  - [ ] Tablet layout functional
  - [ ] Desktop layout optimized
  - [ ] Touch targets appropriately sized (44x44px min)

### 11.5 Versioning & Release Management

**Review Checklist**:
- [ ] **Version Control**
  - [ ] Semantic versioning (SemVer)
  - [ ] Git tags for releases
  - [ ] Branch strategy defined (Gitflow, trunk-based)
  - [ ] Commit message conventions

- [ ] **Release Process**
  - [ ] Release checklist
  - [ ] Release notes template
  - [ ] Versioning automated
  - [ ] Release approval process

### 11.6 Legal & Compliance

**Review Checklist**:
- [ ] **Terms of Service**
  - [ ] Terms of service current
  - [ ] Privacy policy current
  - [ ] Cookie policy (if applicable)
  - [ ] User consent mechanisms

- [ ] **GDPR Compliance** (if applicable)
  - [ ] Data subject rights (access, delete, portability)
  - [ ] Consent management
  - [ ] Data retention policy
  - [ ] Privacy by design

- [ ] **Data Residency**
  - [ ] Data storage locations documented
  - [ ] Cross-border data transfer compliance
  - [ ] Regional compliance (CCPA, PIPEDA, etc.)

---

## Review Methodology

### 12.1 Automated Analysis

**Tools to Use**:
1. **Static Code Analysis**
   - ESLint for JavaScript/TypeScript
   - SonarQube for code quality
   - CodeClimate for maintainability

2. **Security Scanning**
   - npm audit for dependency vulnerabilities
   - Snyk for advanced vulnerability scanning
   - Gitleaks for secret detection
   - OWASP ZAP for web security

3. **Performance Analysis**
   - Lighthouse for frontend performance
   - WebPageTest for detailed metrics
   - Bundle analyzer for bundle size

4. **Accessibility Testing**
   - axe DevTools for a11y issues
   - WAVE for accessibility evaluation
   - pa11y for automated testing

### 12.2 Manual Review Process

**Steps**:
1. **Code Walkthrough**
   - Read through key components
   - Understand data flows
   - Identify logic errors
   - Check for edge cases

2. **Security Review**
   - Threat modeling
   - Attack surface analysis
   - Privilege escalation testing
   - Data leakage verification

3. **Architecture Review**
   - Design pattern analysis
   - Scalability assessment
   - Maintainability evaluation
   - Technical debt identification

4. **Compliance Check**
   - HIPAA requirement mapping
   - Part 2 compliance verification
   - WCAG audit
   - GDPR checklist

### 12.3 Testing Strategy

**Test Execution**:
1. Run all automated tests
2. Execute security test suite
3. Perform manual exploratory testing
4. Conduct penetration testing (if applicable)
5. User acceptance testing (UAT)

---

## Deliverables & Reporting

### 13.1 Review Report Structure

```markdown
# Comprehensive Code Review Report
**Project**: mental-scribe-app
**Review Date**: [YYYY-MM-DD]
**Reviewer(s)**: [Name(s)]
**Commit/Branch**: [commit-sha / branch-name]
**Overall Grade**: [A+/A/A-/B+/B/B-/C+/C/C-/D/F]

## Executive Summary
[3-5 paragraphs covering scope, methodology, findings summary, recommendations]

## Detailed Findings

### Security Vulnerabilities
| ID | Severity | Category | Description | Location | Remediation | Status |
|----|----------|----------|-------------|----------|-------------|--------|
| S-001 | Critical | Auth | [description] | [file:line] | [fix] | Open |

### Code Quality Issues
| ID | Severity | Category | Description | Location | Remediation | Status |
|----|----------|----------|-------------|----------|-------------|--------|
| CQ-001 | High | TypeScript | [description] | [file:line] | [fix] | Open |

### Technical Debt
| ID | Priority | Impact | Effort | Score | Description | Timeline |
|----|----------|--------|--------|-------|-------------|----------|
| TD-001 | P0 | 5 | 1 | 5.0 | [description] | Week 1 |

### Performance Issues
| ID | Severity | Metric | Current | Target | Remediation |
|----|----------|--------|---------|--------|-------------|
| P-001 | Medium | LCP | 3.2s | <2.5s | [fix] |

## Compliance Assessment
- **HIPAA**: ✅ Compliant / ⚠️ Partial / ❌ Non-compliant
- **42 CFR Part 2**: ✅ Compliant / ⚠️ Partial / ❌ Non-compliant
- **WCAG 2.1 AA**: ✅ Compliant / ⚠️ Partial / ❌ Non-compliant
- **OWASP Top 10**: [coverage details]

## Test Coverage Report
- **Overall Coverage**: 72%
- **Critical Paths**: 85%
- **Missing Coverage**: [list areas]

## Recommendations

### Immediate Actions (Critical - Fix Now)
1. [Action 1]
2. [Action 2]

### Short-Term (High - Fix Within 1 Week)
1. [Action 1]
2. [Action 2]

### Medium-Term (Medium - Fix Within 1 Month)
1. [Action 1]
2. [Action 2]

### Long-Term (Low - Consider for Future)
1. [Action 1]
2. [Action 2]

## Positive Observations
[Highlight what's working well]

## Review Artifacts
- [x] Automated scan results
- [x] Manual test results
- [x] Security assessment report
- [x] Performance benchmark data
- [x] Accessibility audit report

## Approval Status
**Decision**: ✅ APPROVED / ⚠️ APPROVED WITH CONDITIONS / 🛑 BLOCKED
**Conditions**: [if conditional approval]
**Next Review**: [date]

---
**Reviewed By**: [Name]
**Date**: [YYYY-MM-DD]
```

### 13.2 Findings Database

Track all findings in a structured format:

```json
{
  "findings": [
    {
      "id": "S-001",
      "type": "security",
      "severity": "critical",
      "category": "authentication",
      "title": "Missing account lockout",
      "description": "Login endpoint does not implement account lockout after failed attempts",
      "location": {
        "file": "supabase/functions/secure-signup/index.ts",
        "line": 45
      },
      "impact": "Brute force attacks possible",
      "exploitability": "high",
      "remediation": "Implement account lockout after 5 failed attempts in 15 minutes",
      "references": ["OWASP A07:2021", "CWE-307"],
      "status": "open",
      "assignee": null,
      "created": "2025-11-09",
      "updated": "2025-11-09"
    }
  ]
}
```

### 13.3 Action Items Tracking

Create GitHub issues for all findings:

```bash
# Example issue template
title: "[SECURITY] S-001: Missing account lockout"
labels: security, critical, p0
body: |
  ## Summary
  Login endpoint does not implement account lockout after failed attempts
  
  ## Impact
  Brute force attacks possible
  
  ## Remediation
  Implement account lockout after 5 failed attempts in 15 minutes
  
  ## Acceptance Criteria
  - [ ] Lockout logic implemented
  - [ ] Tests added
  - [ ] Documentation updated
  
  ## References
  - OWASP A07:2021
  - CWE-307
```

---

## Additional Considerations

### What Else Should Be Checked?

Based on the existing documentation and best practices, here are additional areas to consider:

1. **Business Logic Validation**
   - [ ] Clinical workflow accuracy
   - [ ] Data integrity constraints
   - [ ] Business rule enforcement
   - [ ] Edge case handling

2. **Third-Party Integrations**
   - [ ] API contract testing
   - [ ] Integration error handling
   - [ ] Fallback mechanisms
   - [ ] Vendor SLA compliance

3. **Mobile Responsiveness**
   - [ ] Mobile browser compatibility
   - [ ] Progressive Web App (PWA) features
   - [ ] Offline functionality
   - [ ] Touch gesture support

4. **Operational Readiness**
   - [ ] Runbooks for common operations
   - [ ] Troubleshooting guides
   - [ ] Maintenance procedures
   - [ ] Scaling playbooks

5. **Cost Optimization**
   - [ ] Resource utilization
   - [ ] Database query costs
   - [ ] API call optimization
   - [ ] Storage efficiency

6. **Content Security**
   - [ ] User-generated content moderation
   - [ ] File upload restrictions
   - [ ] Content delivery security
   - [ ] Digital rights management (if applicable)

7. **Analytics & Metrics**
   - [ ] User behavior tracking (privacy-compliant)
   - [ ] Feature usage metrics
   - [ ] Conversion funnels
   - [ ] A/B testing framework

8. **Browser Compatibility**
   - [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
   - [ ] Polyfills for older browsers
   - [ ] Feature detection
   - [ ] Graceful degradation

9. **Social Engineering Prevention**
   - [ ] Phishing attack surface
   - [ ] User education materials
   - [ ] Suspicious activity detection
   - [ ] Account takeover prevention

10. **Code Provenance**
    - [ ] All code authored or properly attributed
    - [ ] Open source license compliance
    - [ ] Copyright notices
    - [ ] Contribution guidelines followed

---

## Conclusion

This comprehensive code review prompt covers all major aspects of software quality, security, and maintainability. Adapt it to your specific project needs and regulatory requirements.

**Remember**: The goal is not just to identify issues but to build a culture of quality, security, and continuous improvement.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Maintained By**: Mental Scribe Engineering Team
