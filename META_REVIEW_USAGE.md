# How to Use META_REVIEW_PROMPT.md

## Quick Start

The `META_REVIEW_PROMPT.md` is a comprehensive guide for AI agents (like GitHub Copilot, ChatGPT, Claude, etc.) to systematically review documentation accuracy and perform code reviews.

## For AI Agents

If you're an AI agent asked to review this codebase:

1. **Read the entire META_REVIEW_PROMPT.md file first**
2. **Execute each phase in order** (Phases 1-7)
3. **Document findings in real-time** as you discover them
4. **Generate the final report** using the template provided

## For Human Reviewers

### To Request a Documentation Review

Provide this prompt to your AI assistant:

```
Please review the Mental Scribe application for documentation accuracy.

Instructions:
1. Read and follow the META_REVIEW_PROMPT.md file in the repository root
2. Execute all 7 phases of the review process
3. Generate a comprehensive report as specified in Phase 7
4. Save your findings to DOCUMENTATION_REVIEW_REPORT.md

Focus especially on:
- Verifying all feature claims in README.md match actual implementation
- Checking security documentation against actual security controls
- Validating all file paths and links in documentation
- Finding contradictions between different documentation files
```

### To Request a Code Review

Provide this prompt to your AI assistant:

```
Please perform a comprehensive code review of the Mental Scribe application.

Instructions:
1. Read and follow the META_REVIEW_PROMPT.md file in the repository root
2. Focus on Phases 5 (Code Review) and 7 (Report Generation)
3. Check for:
   - Security vulnerabilities (XSS, SQL injection, auth bypasses)
   - Code quality issues (TypeScript usage, error handling)
   - Performance concerns (bundle size, code splitting)
   - Accessibility issues (ARIA labels, semantic HTML)
   - Testing gaps

4. Generate CODE_REVIEW_FINDINGS.md with your findings
```

### To Request Both Documentation & Code Review

Provide this prompt to your AI assistant:

```
Please perform a complete review of the Mental Scribe application covering both documentation accuracy and code quality.

Instructions:
1. Read META_REVIEW_PROMPT.md completely
2. Execute ALL phases (1-7) in order
3. Generate all three reports:
   - DOCUMENTATION_REVIEW_REPORT.md
   - CODE_REVIEW_FINDINGS.md
   - SECURITY_REVIEW.md

Time estimate: 8-10 hours for comprehensive review
```

## What Gets Reviewed

### Documentation Files (58 total)
- ✅ Root README.md and all markdown files
- ✅ Architecture documentation (docs/ARCHITECTURE.md, docs/AUTH_FLOW_ARCHITECTURE.md)
- ✅ Security documentation (SECURITY*.md, docs/SECURITY*.md)
- ✅ API documentation (docs/API_REFERENCE.md)
- ✅ Testing documentation (docs/TEST*.md)
- ✅ All other docs in docs/ directory

### Code Files (142 TypeScript/TSX files)
- ✅ All source code in src/
- ✅ Components (src/components/)
- ✅ Pages (src/pages/)
- ✅ Hooks (src/hooks/)
- ✅ Utilities (src/lib/, src/utils/)
- ✅ Edge functions (supabase/functions/)

### Database
- ✅ Schema (COMPLETE_SCHEMA_EXPORT.sql)
- ✅ Migrations (supabase/migrations/)
- ✅ RLS policies
- ✅ Functions and triggers

## Expected Outputs

After running the meta prompt review, you should have:

1. **DOCUMENTATION_REVIEW_REPORT.md**
   - Documentation accuracy assessment
   - List of outdated/incorrect documentation
   - Feature verification matrix
   - Recommendations for doc updates

2. **CODE_REVIEW_FINDINGS.md**
   - Code quality assessment
   - Security findings
   - Performance issues
   - Technical debt
   - Testing gaps

3. **SECURITY_REVIEW.md** (if security issues found)
   - Critical security vulnerabilities
   - High/medium/low priority issues
   - Verified security controls
   - Remediation recommendations

4. **DOCUMENTATION_ISSUES.json** (optional)
   - Machine-readable list of issues
   - Can be used for automated tracking

## Review Scope

### Quick Review (2-3 hours)
- Phases 1-3: Documentation discovery and major doc verification
- Focus: Critical docs (README, ARCHITECTURE, SECURITY)
- Output: Basic findings document

### Standard Review (4-6 hours)
- Phases 1-5: Documentation verification + code review
- Focus: All major documentation + key code areas
- Output: Documentation report + code findings

### Comprehensive Review (8-10 hours)
- All Phases 1-7: Complete review with consistency checks
- Focus: Everything - docs, code, database, security
- Output: Complete set of reports with prioritized action items

## Tips for Best Results

### For AI Agents
1. **Actually run the bash commands** - Don't just describe what you would do
2. **Record specific line numbers** - When you find an issue, note file:line
3. **Compare claims with reality** - If docs say "feature X exists", verify it does
4. **Be thorough but efficient** - Use grep, find, and other CLI tools extensively
5. **Follow the phases in order** - Each phase builds on previous ones

### For Human Reviewers
1. **Give the AI sufficient context** - Point to META_REVIEW_PROMPT.md clearly
2. **Set expectations on depth** - Specify quick/standard/comprehensive review
3. **Request specific areas** - If you only care about security, say so
4. **Ask for examples** - Request specific file:line citations for issues
5. **Follow up on findings** - AI findings need human verification

## Success Criteria

A successful review will:
- ✅ Check 100% of documentation files for accuracy
- ✅ Verify all feature claims against actual code
- ✅ Identify specific discrepancies with file:line references
- ✅ Categorize findings by severity (Critical/High/Medium/Low)
- ✅ Provide actionable recommendations
- ✅ Include both automated checks and manual review insights

## Common Issues to Watch For

Based on the META_REVIEW_PROMPT, watch for:

### Documentation Issues
- ❌ Features documented but not implemented
- ❌ Outdated architecture diagrams
- ❌ Incorrect file paths
- ❌ Broken internal links
- ❌ Inconsistent version numbers
- ❌ Contradictory claims in different docs

### Code Issues
- ❌ Security vulnerabilities (XSS, SQL injection)
- ❌ Missing authentication checks
- ❌ Hardcoded secrets
- ❌ Poor error handling
- ❌ TypeScript 'any' types
- ❌ Missing tests for critical features

### Security Issues
- ❌ Documented security features not actually implemented
- ❌ RLS policies that don't match documentation
- ❌ Audit logging gaps (especially: log_client_view() not called)
- ❌ Missing input validation
- ❌ Improperly secured file uploads

## Example Review Session

Here's what a typical review session looks like:

```bash
# 1. Clone the repository (if not already cloned)
cd /home/runner/work/mental-scribe-app/mental-scribe-app

# 2. Read the meta prompt
cat META_REVIEW_PROMPT.md

# 3. Start Phase 1: Documentation Discovery
find . -name "*.md" -type f | sort > /tmp/docs_inventory.txt

# 4. Continue through each phase...
# (Follow the detailed instructions in META_REVIEW_PROMPT.md)

# 5. Generate final reports
# Create DOCUMENTATION_REVIEW_REPORT.md
# Create CODE_REVIEW_FINDINGS.md
# Create SECURITY_REVIEW.md (if needed)
```

## Maintenance

Update this usage guide when:
- META_REVIEW_PROMPT.md gets significant updates
- New types of reviews are needed
- New output formats are desired
- Review process changes

## Questions?

If you're unclear on how to use the meta prompt:
1. Read META_REVIEW_PROMPT.md in full
2. Start with a "Quick Review" scope first
3. Review the example bash commands provided
4. Focus on one phase at a time

---

**Related Documentation**:
- [META_REVIEW_PROMPT.md](META_REVIEW_PROMPT.md) - The full review guide
- [AI_REVIEW_PROMPT.md](AI_REVIEW_PROMPT.md) - Human reviewer request template
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - Complete documentation index

**Version**: 1.0.0  
**Last Updated**: 2025-10-21
