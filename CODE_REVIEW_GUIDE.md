# Code Review Quick Reference Guide

This guide provides a quick overview of how to use the comprehensive code review system.

## 📚 Documentation

- **Main Prompt**: `COMPREHENSIVE_CODE_REVIEW_PROMPT.md` - Complete checklist for manual reviews
- **Existing Guides**: 
  - `PR_REVIEW_CHECKLIST.md` - PR-specific checklist
  - `AI_REVIEW_PROMPT.md` - AI-assisted review prompt
  - `docs/CODEX_SECURITY_REVIEW_PROMPT.md` - Security-focused prompt
  - `TECHNICAL_DEBT_ANALYSIS.md` - Technical debt framework

## 🚀 Automated Review

### Run Full Review
```bash
npm run review:full
```

This runs all automated checks:
- Security vulnerability scanning
- Code quality analysis  
- Performance assessment
- Generates comprehensive report

### Run Specific Checks

**Security Only:**
```bash
npm run review:security
```

**Code Quality Only:**
```bash
npm run review:quality
```

**Performance Only:**
```bash
npm run review:performance
```

## 📋 What Gets Checked

### Security Analysis
- ✅ npm audit for dependency vulnerabilities
- ✅ Hardcoded secrets detection
- ✅ Row-Level Security (RLS) verification
- ✅ Anonymous blocking policies
- ✅ CSP headers in edge functions
- ✅ localStorage vs sessionStorage usage
- ✅ HIPAA compliance checks
- ✅ Part 2 consent enforcement

### Code Quality
- ✅ ESLint errors and warnings
- ✅ TypeScript compilation errors
- ✅ Usage of `any` types
- ✅ Large component detection (>300 lines)
- ✅ TODO/FIXME comments
- ✅ console.log statements

### Performance
- ✅ Build success/failure
- ✅ Bundle size analysis
- ✅ Source map detection in production
- ✅ Potential N+1 database queries
- ✅ Largest file identification

## 📊 Review Output

Results are saved to `review/` directory:

```
review/
├── review-YYYY-MM-DD.md      # Human-readable report
├── review-YYYY-MM-DD.json    # Machine-readable data
└── artifacts/                # Detailed scan results
    ├── npm-audit.json
    ├── eslint.json
    ├── tsc.txt
    ├── build.log
    ├── secret-scan.txt
    ├── rls-check.txt
    ├── csp-check.txt
    └── ... (more artifacts)
```

## 🎯 Review Grades

The automated review assigns an overall grade:

| Grade | Score Range | Description |
|-------|-------------|-------------|
| A+    | 95-100      | Excellent - Ship it! |
| A     | 90-94       | Very good - Minor improvements |
| A-    | 85-89       | Good - Some improvements needed |
| B+/B/B- | 70-84     | Acceptable - Notable issues to address |
| C+/C/C- | 55-69     | Needs work - Significant issues |
| D/F   | 0-54        | Blocked - Critical issues |

## 🛑 Ship Decisions

- **✅ APPROVED**: No critical issues, good to ship
- **⚠️ APPROVED WITH CONDITIONS**: Address high priority issues within 1 week
- **🛑 BLOCKED**: Critical issues must be resolved before shipping

Critical blockers:
- Critical security vulnerabilities
- Build failures
- Hardcoded secrets

## 🔍 Manual Review Process

For comprehensive manual reviews, follow the checklist in `COMPREHENSIVE_CODE_REVIEW_PROMPT.md`:

1. **Security & Vulnerability Analysis** (Section 2)
   - Authentication & Authorization
   - Data Protection & Privacy
   - Input Validation & Sanitization
   - Application Security Headers
   - Audit Logging
   - API Security

2. **Code Quality & Best Practices** (Section 3)
   - TypeScript best practices
   - React best practices
   - Code style & formatting
   - Error handling

3. **Technical Debt Assessment** (Section 4)
   - Quantified debt scoring
   - Code duplication
   - Monolithic components
   - Outdated dependencies

4. **Performance & Optimization** (Section 5)
   - Frontend performance
   - Database performance
   - Edge function performance

5. **Architecture & Design** (Section 6)
   - System architecture
   - Database schema design
   - API design

6. **Testing & QA** (Section 7)
   - Test coverage
   - Test quality

7. **Accessibility & Compliance** (Section 8)
   - WCAG 2.1 AA compliance
   - HIPAA compliance
   - 42 CFR Part 2 compliance

8. **Documentation** (Section 9)
   - Code documentation
   - Architecture docs
   - API documentation

## 📝 Creating Review Reports

### For Pull Requests

Use `PR_REVIEW_CHECKLIST.md` and include:

```markdown
## Review Summary
[Brief overview of changes]

## Checks Performed
- [x] Automated review passed
- [x] Manual security review
- [x] Code quality review
- [x] Performance impact assessed

## Findings
### Critical
[None or list]

### High
[None or list]

### Medium
[None or list]

## Approval Decision
✅ APPROVED / ⚠️ APPROVED WITH CONDITIONS / 🛑 CHANGES REQUESTED

**Conditions**: [if applicable]
```

### For Releases

Run full review and generate comprehensive report:

```bash
npm run review:full
```

Review the generated report in `review/review-YYYY-MM-DD.md`

## 🔧 Customization

Edit `scripts/comprehensive-review.mjs` to:
- Add custom checks
- Modify severity thresholds
- Customize report format
- Add integration with other tools

## 🚨 Common Issues

### Build Failures
If the automated review fails during build:
1. Check `review/artifacts/build.log`
2. Run `npm run build` locally to debug
3. Fix errors before proceeding with review

### High Number of Vulnerabilities
If npm audit shows many vulnerabilities:
1. Review `review/artifacts/npm-audit.json`
2. Run `npm audit fix` to auto-fix compatible issues
3. Manually update packages for breaking changes
4. Document any accepted risks

### Large Components Detected
If many components exceed 300 lines:
1. Review `review/artifacts/component-sizes.txt`
2. Prioritize refactoring based on:
   - Complexity (use cyclomatic complexity tools)
   - Change frequency (git blame analysis)
   - Bug rate (issue tracker)

## 📖 Best Practices

1. **Run reviews early and often**
   - Before starting PR review
   - Before merging to main
   - Before releases

2. **Track trends over time**
   - Keep historical review reports
   - Monitor metrics (bundle size, test coverage, vulnerability count)
   - Set improvement goals

3. **Combine automated and manual**
   - Use automated reviews for consistency
   - Use manual reviews for context and judgment
   - Focus manual effort on critical areas

4. **Address findings systematically**
   - Fix critical issues immediately
   - Schedule high priority fixes
   - Track medium/low priority in backlog

5. **Update the review process**
   - Add new checks as needed
   - Remove outdated checks
   - Incorporate lessons learned

## 🔗 Related Documentation

- **Security**: `SECURITY.md`
- **Technical Debt**: `TECHNICAL_DEBT_ANALYSIS.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Testing**: `docs/TESTING_GUIDE.md`
- **Workflows**: `docs/WORKFLOW_GUIDES.md`

## 💡 Pro Tips

1. **Before major refactoring**: Run review to establish baseline
2. **Before releases**: Full review + manual security audit
3. **Weekly**: Security-only review to catch new vulnerabilities
4. **Monthly**: Full review to track technical debt trends

## 🤝 Contributing

To improve the review process:
1. Add new checks to `scripts/comprehensive-review.mjs`
2. Update checklists in `COMPREHENSIVE_CODE_REVIEW_PROMPT.md`
3. Document new findings in issue templates
4. Share learnings in team retrospectives

---

**Need help?** Check `COMPREHENSIVE_CODE_REVIEW_PROMPT.md` for detailed guidance on each review area.

**Questions?** Contact the engineering team or consult project documentation.
