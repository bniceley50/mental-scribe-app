# Meta Prompt: Comprehensive Documentation Accuracy & Code Review

## Overview

This meta prompt provides a systematic approach for AI agents to conduct a thorough review of the Mental Scribe application, focusing on:
1. **Documentation Accuracy**: Verifying all docs and READMEs accurately reflect the codebase
2. **Cross-Reference Validation**: Ensuring documentation matches actual implementation
3. **Code Quality Review**: Comprehensive code assessment across all aspects
4. **Consistency Check**: Finding discrepancies between what's documented and what's implemented

## Review Methodology

### Phase 1: Documentation Discovery & Inventory (30 minutes)

#### 1.1 Find All Documentation
```bash
# Find all markdown files
find /home/runner/work/mental-scribe-app/mental-scribe-app -name "*.md" -type f | sort

# Count documentation files
find /home/runner/work/mental-scribe-app/mental-scribe-app -name "*.md" -type f | wc -l

# List docs by directory
ls -lh *.md
ls -lh docs/*.md
ls -lh review/*.md
ls -lh proof/*.md
```

#### 1.2 Create Documentation Inventory
Create a comprehensive list of all documentation with:
- File path
- File size
- Last modified date
- Stated purpose (from first heading or introduction)
- Target audience

**Key Documentation Categories to Inventory**:
- Root README.md
- Architecture documentation (ARCHITECTURE.md, AUTH_FLOW_ARCHITECTURE.md)
- Security documentation (SECURITY*.md files)
- Ship/deployment documentation (SHIP*.md, DEPLOY*.md)
- API documentation (API_REFERENCE.md)
- Testing documentation (TEST*.md)
- Onboarding documentation (ONBOARDING.md, CONTRIBUTING.md)
- Review documentation (review/*.md)
- Proof/evidence documentation (proof/*.md)

### Phase 2: Code Structure Discovery (30 minutes)

#### 2.1 Understand Project Structure
```bash
# View project root
ls -la /home/runner/work/mental-scribe-app/mental-scribe-app/

# Count source files
find src -name "*.ts" -o -name "*.tsx" | wc -l

# List key directories
find src -type d | sort

# List components
find src/components -name "*.tsx" | sort

# List pages
find src/pages -name "*.tsx" | sort

# List hooks
find src/hooks -name "*.ts" | sort

# List utilities
find src/lib -name "*.ts" | sort
find src/utils -name "*.ts" | sort
```

#### 2.2 Identify Key Features & Components
Review package.json to understand:
- Dependencies and their purposes
- Available npm scripts
- Project metadata
- Testing frameworks

```bash
cat package.json | jq '.dependencies | keys'
cat package.json | jq '.scripts'
```

### Phase 3: Documentation Accuracy Verification (2-3 hours)

For EACH documentation file, verify the following:

#### 3.1 README.md Accuracy Check

**Verify Against Code**:
- [ ] **Features Listed**: Do all mentioned features actually exist in the codebase?
  - Check each feature claim against actual component/page implementation
  - Example: If "Voice Features" is mentioned, verify voice components exist
  
- [ ] **Tech Stack Accuracy**: Are all listed technologies actually used?
  - Cross-reference with package.json dependencies
  - Check imports in main files (App.tsx, main.tsx)
  
- [ ] **Setup Instructions**: Do the setup steps work?
  - Verify Node.js version requirements
  - Check if npm install works without errors
  - Validate environment variable requirements
  
- [ ] **Scripts Documentation**: Are all npm scripts documented?
  - Compare documented scripts with package.json scripts
  - Verify script descriptions match actual behavior
  
- [ ] **API/Usage Examples**: Do code examples reflect actual API?
  - Check if code snippets would actually work
  - Verify component props match documented examples
  
- [ ] **File Paths**: Are all referenced file paths correct?
  - Verify every file path mentioned in README exists
  - Check if directory structure matches description

**Automated Checks**:
```bash
# Verify all file paths mentioned in README exist
grep -oP '`[^`]+\.(tsx?|jsx?|json|sql|sh|ps1)`' README.md | \
  sed 's/`//g' | while read file; do
    if [ ! -f "$file" ]; then
      echo "❌ File not found: $file"
    fi
  done
```

#### 3.2 ARCHITECTURE.md Accuracy Check

**Verify Against Code**:
- [ ] **Component Hierarchy**: Does the documented architecture match actual structure?
  - Compare documented component tree with actual src/components
  - Verify parent-child relationships described
  
- [ ] **Data Flow**: Do described data flows match implementation?
  - Trace state management (Zustand stores)
  - Verify React Query usage patterns
  - Check API call patterns
  
- [ ] **Module Dependencies**: Are module relationships accurate?
  - Check actual imports vs documented dependencies
  - Verify there are no undocumented critical dependencies
  
- [ ] **Design Patterns**: Are mentioned patterns actually used?
  - Verify hooks pattern usage
  - Check component composition patterns
  - Validate state management approach

**Code Analysis**:
```bash
# Find all components and their imports
find src/components -name "*.tsx" -exec grep -l "^import" {} \; | head -10

# Check state management stores
find src -name "*store*" -o -name "*Store*"

# Find React Query usage
grep -r "useQuery\|useMutation" src --include="*.tsx" --include="*.ts" | wc -l
```

#### 3.3 Security Documentation Accuracy (SECURITY*.md)

**Critical Verification**:
- [ ] **RLS Policies**: Are documented policies actually implemented?
  - Find: `supabase/migrations/*.sql` files
  - Search for CREATE POLICY statements
  - Compare with documentation claims
  
- [ ] **Authentication Flow**: Does auth code match docs?
  - Check: Supabase auth integration
  - Verify: MFA implementation
  - Validate: Session management
  
- [ ] **Audit Logging**: Is audit logging actually implemented?
  - Search for audit log function calls
  - Verify: `log_client_view()` is called (docs say it's NOT - verify this)
  - Check: audit_logs table usage
  
- [ ] **Data Encryption**: Are encryption claims accurate?
  - Verify: Storage bucket policies
  - Check: Database encryption settings
  - Validate: Transit encryption (HTTPS)
  
- [ ] **Vulnerability Claims**: Are documented fixes actually implemented?
  - Cross-reference with actual code changes
  - Verify fixes are in the codebase

**Code Verification**:
```bash
# Find audit logging calls
grep -r "log_client_view\|audit_log" src --include="*.tsx" --include="*.ts"

# Find RLS policy files
find supabase/migrations -name "*.sql" | xargs grep -l "CREATE POLICY"

# Check for HIBP usage
grep -r "haveibeenpwned\|HIBP\|hibp" . --include="*.ts" --include="*.tsx"

# Find MFA implementation
grep -r "mfa\|MFA\|multi.*factor" src --include="*.tsx" --include="*.ts"
```

#### 3.4 API Documentation Accuracy (API_REFERENCE.md)

**Verify Against Code**:
- [ ] **Edge Functions**: Do all documented functions exist?
  - List: `supabase/functions/*/index.ts`
  - Compare with documented API endpoints
  
- [ ] **Function Signatures**: Do parameters match implementation?
  - Check actual function parameters
  - Verify request/response types
  
- [ ] **Authentication Requirements**: Are auth requirements accurate?
  - Check JWT validation in functions
  - Verify role-based access checks
  
- [ ] **Rate Limiting**: Is rate limiting actually implemented?
  - Search for rate limit checks
  - Verify rate_limits table usage

**Automated Checks**:
```bash
# List all edge functions
ls -1 supabase/functions/

# Check for rate limiting implementation
grep -r "rate_limit\|rateLimit" supabase/functions --include="*.ts"

# Find authentication checks
grep -r "auth.jwt\|verifyAuth" supabase/functions --include="*.ts"
```

#### 3.5 Testing Documentation Accuracy

**Verify Against Code**:
- [ ] **Test Coverage Claims**: Are coverage numbers accurate?
  - Run tests to verify actual coverage
  - Compare with documented percentages
  
- [ ] **Test Files**: Do documented test files exist?
  - Check test directory structure
  - Verify test file naming conventions
  
- [ ] **Testing Commands**: Do test commands work?
  - Try running each documented test command
  - Verify output matches expectations

**Validation Commands**:
```bash
# Run tests if they exist
npm test 2>&1 || echo "No tests configured"

# Check test coverage
npm run test:coverage 2>&1 || echo "No coverage script"

# Count test files
find . -name "*.test.*" -o -name "*.spec.*" | wc -l

# Find E2E tests
ls -la test-results/ 2>/dev/null || echo "No test results"
```

### Phase 4: Cross-Reference Validation (2-3 hours)

#### 4.1 Feature Claims vs Implementation

For each feature mentioned in README.md:

**Template for Verification**:
```
Feature: [Feature Name]
Documented in: [File:Line]
Expected files:
  - [ ] Component: src/components/[FeatureName].tsx
  - [ ] Page: src/pages/[FeatureName].tsx  
  - [ ] Hook: src/hooks/use[FeatureName].ts
  - [ ] Tests: src/__tests__/[FeatureName].test.tsx
Status: ✅ Implemented | ⚠️ Partial | ❌ Missing
Notes: [Any discrepancies]
```

**Key Features to Validate**:
1. Voice Features (Speech-to-Text, Text-to-Speech)
2. AI-Powered Analysis (SOAP notes, entity extraction, risk assessment)
3. Session Management (history, export, search)
4. Security Features (sanitization, RLS, encryption, audit logs)
5. Structured Forms
6. File Upload

#### 4.2 Dependencies Cross-Check

**Verify Package Usage**:
```bash
# For each major dependency in package.json, find its usage

# Example: @supabase/supabase-js
grep -r "@supabase/supabase-js" src --include="*.ts" --include="*.tsx" | wc -l

# Example: react-hook-form
grep -r "react-hook-form\|useForm" src --include="*.ts" --include="*.tsx" | wc -l

# Example: dompurify (for XSS prevention)
grep -r "dompurify\|DOMPurify" src --include="*.ts" --include="*.tsx"

# Example: jsPDF (for PDF export)
grep -r "jspdf\|jsPDF" src --include="*.ts" --include="*.tsx"
```

**Check for Unused Dependencies**:
- Any dependency in package.json not imported anywhere?
- Any major security dependency not actually used? (e.g., DOMPurify)

#### 4.3 Environment Variables Documentation

**Verify .env.example vs Code**:
```bash
# List all environment variables used in code
grep -rho "import\.meta\.env\.[A-Z_]*" src | sort -u

# Compare with .env.example
cat .env.example

# Find undocumented environment variables
diff <(grep -rho "import\.meta\.env\.[A-Z_]*" src | sort -u) \
     <(grep -o "^[A-Z_]*" .env.example | sort -u)
```

#### 4.4 Database Schema vs Documentation

**Verify Tables Mentioned in Docs Exist**:
```bash
# List all tables mentioned in documentation
grep -rho "table: \`[^`]*\`" docs/*.md | sort -u

# Check COMPLETE_SCHEMA_EXPORT.sql
cat COMPLETE_SCHEMA_EXPORT.sql | grep "CREATE TABLE"

# Verify RLS policies mentioned
grep -r "CREATE POLICY" supabase/migrations/*.sql | wc -l
```

### Phase 5: Comprehensive Code Review (3-4 hours)

#### 5.1 Security Review

**Critical Security Checks**:

- [ ] **XSS Prevention**: Is user input properly sanitized?
  ```bash
  # Find DOMPurify usage
  grep -r "DOMPurify\|sanitize" src --include="*.tsx" --include="*.ts"
  
  # Find dangerous innerHTML usage (should be sanitized)
  grep -r "dangerouslySetInnerHTML" src --include="*.tsx"
  ```

- [ ] **SQL Injection**: Are database queries safe?
  ```bash
  # Should NOT find raw SQL strings with user input
  grep -r "SELECT.*\${" supabase/functions --include="*.ts"
  grep -r "INSERT.*\${" supabase/functions --include="*.ts"
  ```

- [ ] **Authentication Bypass**: Are auth checks consistent?
  ```bash
  # Find auth checks in edge functions
  grep -r "auth\.jwt\|getUser" supabase/functions --include="*.ts"
  ```

- [ ] **Secrets Exposure**: Are there any hardcoded secrets?
  ```bash
  # Find potential secrets (excluding node_modules)
  grep -r "api[_-]key\|apikey\|secret\|password.*=.*['\"]" src --include="*.ts" --include="*.tsx"
  ```

- [ ] **File Upload Validation**: Are file uploads secured?
  ```bash
  # Find file upload handling
  grep -r "upload\|Upload" src/lib --include="*.ts"
  ```

#### 5.2 Code Quality Review

**TypeScript Usage**:
```bash
# Find 'any' types (should be minimized)
grep -r ": any\|as any" src --include="*.ts" --include="*.tsx" | wc -l

# Find @ts-ignore or @ts-expect-error (should be avoided)
grep -r "@ts-ignore\|@ts-expect-error" src --include="*.ts" --include="*.tsx"
```

**Error Handling**:
```bash
# Find try-catch blocks
grep -r "try {" src --include="*.ts" --include="*.tsx" | wc -l

# Find error boundaries
find src -name "*Error*" -o -name "*error*"

# Check for unhandled promises
grep -r "\.then(" src --include="*.ts" --include="*.tsx" | grep -v "catch" | head -5
```

**React Best Practices**:
```bash
# Find useEffect with missing dependencies (need manual review)
grep -A 5 "useEffect" src --include="*.tsx" | grep -B 5 "\[\]"

# Find inline arrow functions in JSX (performance concern)
grep -r "onClick={() =>" src --include="*.tsx" | wc -l

# Find key prop usage in lists
grep -r "\.map(" src --include="*.tsx" | head -10
```

#### 5.3 Performance Review

**Bundle Size**:
```bash
# Build and check bundle size
npm run build
ls -lh dist/assets/*.js | sort -k5 -h
```

**Code Splitting**:
```bash
# Find React.lazy usage
grep -r "React.lazy\|lazy(" src --include="*.tsx"

# Find dynamic imports
grep -r "import(" src --include="*.ts" --include="*.tsx"
```

**Heavy Dependencies**:
```bash
# Check large dependencies
npm list --depth=0 | sort
```

#### 5.4 Accessibility Review

```bash
# Find ARIA labels
grep -r "aria-label\|aria-" src --include="*.tsx" | wc -l

# Find semantic HTML
grep -r "<button\|<nav\|<header\|<main\|<footer\|<article" src --include="*.tsx" | wc -l

# Find alt text on images
grep -r "<img" src --include="*.tsx" | grep -v "alt="
```

#### 5.5 Testing Coverage

```bash
# Count test files
find . -name "*.test.*" -o -name "*.spec.*" | wc -l

# Check for testing utilities
ls src/test/ 2>/dev/null

# Run E2E tests
npm run test:e2e 2>&1 || echo "E2E tests not configured"
```

### Phase 6: Documentation Consistency Check (1-2 hours)

#### 6.1 Internal Consistency

**Check for Contradictions**:
- Do different docs claim different feature sets?
- Are version numbers consistent across docs?
- Do security claims contradict each other?
- Are architectural diagrams consistent with code?

**Template for Recording Contradictions**:
```
Contradiction Found:
- Document 1: [File] says "[Claim 1]"
- Document 2: [File] says "[Claim 2]"  
- Actual Code: [What's actually implemented]
- Severity: High | Medium | Low
- Recommended Fix: [What should be updated]
```

#### 6.2 Version Consistency

```bash
# Check all version numbers mentioned
grep -r "version.*1\.\|v1\.\|V1\." . --include="*.md"

# Compare with package.json version
cat package.json | jq '.version'

# Check CHANGELOG for consistency
cat CHANGELOG.md | grep "##"
```

#### 6.3 Link Validation

```bash
# Find all internal links
grep -rho "\[.*\]([^)]*\.md)" . --include="*.md" | sort -u

# Check if linked files exist
grep -rho "](.*\.md)" . --include="*.md" | sed 's/](\|)//g' | while read file; do
  if [ ! -f "$file" ]; then
    echo "❌ Broken link: $file"
  fi
done
```

### Phase 7: Generate Review Report

#### 7.1 Report Structure

Create a comprehensive report with these sections:

```markdown
# Documentation Accuracy & Code Review Report
Generated: [Date]
Reviewer: [AI Agent Name]
Repository: mental-scribe-app
Commit: [Git SHA]

## Executive Summary
- Total Documentation Files: [count]
- Total Source Files: [count]
- Critical Issues Found: [count]
- Documentation Accuracy: [percentage]
- Code Quality Score: [grade]

## Documentation Accuracy Assessment

### Accurate Documentation ✅
[List docs that are accurate and well-maintained]

### Outdated Documentation ⚠️
[List docs that need updates with specific issues]

### Missing Documentation ❌
[List areas lacking documentation]

## Feature Verification Matrix

| Feature | Documented | Implemented | Tested | Status |
|---------|-----------|-------------|--------|--------|
| Voice Features | ✅ | ✅ | ⚠️ | Partial tests |
| AI Analysis | ✅ | ✅ | ❌ | No tests |
| ... | ... | ... | ... | ... |

## Security Findings

### Critical Issues 🔴
[List critical security issues]

### High Priority Issues 🟠
[List high priority issues]

### Medium Priority Issues 🟡
[List medium priority issues]

### Verified Security Controls ✅
[List properly implemented security measures]

## Code Quality Assessment

### Strengths
[List what the codebase does well]

### Areas for Improvement
[List code quality issues with specific examples]

### Technical Debt
[Identify technical debt]

## Specific Documentation Issues

### README.md
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]

### ARCHITECTURE.md
- [ ] Issue 1: [Description]

[Continue for each doc...]

## Recommendations

### Immediate Actions (Critical)
1. [Action 1]
2. [Action 2]

### Short-term (Within 1 week)
1. [Action 1]
2. [Action 2]

### Medium-term (Within 1 month)
1. [Action 1]
2. [Action 2]

### Long-term (Nice to have)
1. [Action 1]
2. [Action 2]

## Testing Recommendations

### Unit Tests Needed
[List components/functions that need unit tests]

### Integration Tests Needed
[List integration scenarios to test]

### E2E Tests Needed
[List user flows to test]

## Documentation Updates Needed

### High Priority
- [ ] File: [path] - Issue: [description]

### Medium Priority
- [ ] File: [path] - Issue: [description]

### Low Priority
- [ ] File: [path] - Issue: [description]

## Conclusion

[Overall assessment and summary of findings]
```

## Execution Checklist

When executing this meta prompt, follow this checklist:

- [ ] **Phase 1 Complete**: Documentation inventory created
- [ ] **Phase 2 Complete**: Code structure mapped
- [ ] **Phase 3 Complete**: All major docs verified for accuracy
- [ ] **Phase 4 Complete**: Cross-references validated
- [ ] **Phase 5 Complete**: Code review performed
- [ ] **Phase 6 Complete**: Consistency checks done
- [ ] **Phase 7 Complete**: Report generated and saved

## Output Files

Save your findings in these files:
1. `DOCUMENTATION_REVIEW_REPORT.md` - Main report
2. `CODE_REVIEW_FINDINGS.md` - Detailed code findings
3. `SECURITY_REVIEW.md` - Security-specific findings
4. `DOCUMENTATION_ISSUES.json` - Machine-readable issues list

## Tips for AI Agents

### Be Thorough But Focused
- Don't just list files - verify their accuracy
- Compare documentation claims with actual code
- Look for contradictions between different docs

### Use Automated Tools
- Use grep, find, and other CLI tools extensively
- Run linters and tests to verify claims
- Check actual file existence for every reference

### Think Like a New Developer
- Would a new developer be able to understand the project from the docs?
- Are setup instructions complete and accurate?
- Are examples copy-paste ready?

### Think Like a Security Auditor
- Verify every security claim
- Look for security features that are documented but not implemented
- Check if security vulnerabilities are properly fixed

### Document Everything
- Record every discrepancy found
- Note the source of truth (code vs docs)
- Provide specific line numbers and file paths

### Prioritize Findings
- Critical: Security vulnerabilities, broken setup instructions
- High: Inaccurate feature claims, broken code examples
- Medium: Outdated architecture docs, missing tests
- Low: Typos, formatting issues, minor inconsistencies

## Example Usage

An AI agent using this prompt would:

1. Start by reading this meta prompt completely
2. Execute each phase in order
3. Document findings in real-time
4. Use the provided bash commands for verification
5. Create the final report with specific, actionable findings
6. Prioritize issues by severity and impact

## Success Criteria

A successful review will:
- ✅ Verify 100% of documentation files
- ✅ Cross-reference all feature claims with code
- ✅ Identify all security documentation discrepancies
- ✅ Provide specific line numbers for issues
- ✅ Categorize findings by severity
- ✅ Give actionable recommendations
- ✅ Include both automated check results and manual review findings

## Time Estimate

- **Quick Review**: 2-3 hours (phases 1-3 only)
- **Standard Review**: 4-6 hours (phases 1-5)
- **Comprehensive Review**: 8-10 hours (all phases)

## Maintenance

This meta prompt should be updated when:
- New documentation files are added
- Major features are implemented
- Project structure changes significantly
- New security requirements are added

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-21  
**Maintained By**: Mental Scribe Development Team
