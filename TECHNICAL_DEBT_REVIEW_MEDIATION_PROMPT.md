# Technical Debt Review and Mediation Prompt

## Purpose
This prompt guides AI agents, development teams, and technical leaders through comprehensive technical debt review and mediation sessions for the Mental Scribe clinical documentation system. Use this to assess, prioritize, negotiate, and plan remediation of technical debt while balancing business needs, security requirements, and development velocity.

---

## Session Overview

**Project:** Mental Scribe - HIPAA-compliant Clinical Documentation System  
**Repository:** bniceley50/mental-scribe-app  
**Context:** Healthcare application handling PHI and 42 CFR Part 2 protected records  
**Review Type:** Technical Debt Assessment and Remediation Planning

---

## Part 1: Technical Debt Discovery & Assessment

### 1.1 Codebase Analysis

Conduct a systematic scan of the codebase to identify technical debt across these dimensions:

#### A. Code Quality & Maintainability
**Areas to Review:**
- [ ] Component complexity (lines per file, cyclomatic complexity)
- [ ] Code duplication (repeated patterns, logic)
- [ ] Naming conventions and code clarity
- [ ] TypeScript usage (`any` types, missing type definitions)
- [ ] Hard-coded values (colors, strings, magic numbers)
- [ ] Console.log/debug statements in production code

**Commands to Run:**
```bash
# Find large files (complexity indicators)
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20

# Search for console statements
rg "console\.(log|error|warn|debug)" src/ --count

# Find TypeScript any usage
rg ": any" src/ --count

# Check for hard-coded colors
rg "text-(blue|red|green|yellow|purple|pink|indigo|gray)-\d+" src/
```

#### B. Architecture & Design
**Areas to Review:**
- [ ] Component decomposition and reusability
- [ ] State management patterns (prop drilling, context overuse)
- [ ] Separation of concerns (business logic in components)
- [ ] Error handling standardization
- [ ] API/Edge function organization
- [ ] Hook composition and custom hook patterns

**Questions to Answer:**
- Are there monolithic components that handle multiple concerns?
- Is state management consistent across the application?
- Are there repeated patterns that should be abstracted?
- Do components have clear, single responsibilities?

#### C. Testing & Quality Assurance
**Areas to Review:**
- [ ] Test coverage percentage (overall and critical paths)
- [ ] Missing test cases for core functionality
- [ ] Edge function test coverage
- [ ] Integration test completeness
- [ ] E2E test coverage of critical workflows

**Commands to Run:**
```bash
# Check test coverage (if available)
npm run test:coverage

# List test files
find src -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts"

# Count test assertions
rg "(expect|assert)" src/ --count
```

#### D. Dependencies & Infrastructure
**Areas to Review:**
- [ ] Outdated dependencies (security and feature updates)
- [ ] Unused dependencies (dead code)
- [ ] Dependency vulnerabilities (npm audit)
- [ ] Build configuration optimization
- [ ] Environment configuration completeness

**Commands to Run:**
```bash
# Check for vulnerabilities
npm audit

# List outdated packages
npm outdated

# Check environment configuration
cat .env.example
```

#### E. Performance & Optimization
**Areas to Review:**
- [ ] Bundle size and code splitting
- [ ] Unnecessary re-renders
- [ ] Database query optimization (N+1 queries)
- [ ] Large list rendering performance
- [ ] API response times
- [ ] Memory leaks or inefficient state updates

#### F. Security & Compliance (CRITICAL for Healthcare)
**Areas to Review:**
- [ ] RLS policy completeness and correctness
- [ ] Authentication/authorization gaps
- [ ] Input validation and sanitization
- [ ] Audit logging completeness
- [ ] PHI data handling compliance
- [ ] Secret management
- [ ] CSP and security headers

**Special Attention:**
- HIPAA compliance requirements
- 42 CFR Part 2 substance abuse record protection
- Row-Level Security (RLS) implementation
- Audit trail completeness

#### G. Documentation & Developer Experience
**Areas to Review:**
- [ ] README completeness and accuracy
- [ ] API documentation
- [ ] Architecture documentation currency
- [ ] Inline code comments (where needed)
- [ ] Environment setup instructions
- [ ] Onboarding documentation

---

### 1.2 Debt Quantification Framework

For each identified debt item, calculate a **Debt Score** using this framework:

| Metric | Scale | Definition |
|--------|-------|------------|
| **Business Impact** | 1-5 | How does this affect users, revenue, compliance, or team velocity? |
| **Technical Risk** | 1-5 | What's the risk of bugs, security issues, or system failures? |
| **Effort to Fix** | 1-5 | How much work is required? (1=hours, 5=months) |
| **Debt Score** | (Impact + Risk) / Effort | Higher scores = higher ROI for fixing |

**Business Impact Scoring:**
- **5** - Blocks production deployment or creates compliance violation
- **4** - Significantly slows feature development (>30%) or affects user experience
- **3** - Moderate impact on development velocity (15-30%)
- **2** - Minor friction, affects code quality
- **1** - Cosmetic or stylistic issue

**Technical Risk Scoring:**
- **5** - Critical security vulnerability or data loss risk
- **4** - High risk of production incidents or compliance failure
- **3** - Moderate risk of bugs or performance degradation
- **2** - Low risk of minor issues
- **1** - No meaningful technical risk

**Effort Scoring:**
- **5** - Multiple person-months (major refactoring)
- **4** - 2-4 person-weeks
- **3** - 1 person-week
- **2** - 2-3 person-days
- **1** - Few hours

---

### 1.3 Priority Classification

Based on Debt Score and context, classify each item:

- **🔴 P0 (Critical)**: Score ≥3.5 OR blocks deployment/security/compliance
- **🟡 P1 (High)**: Score 2.0-3.4, significant impact on velocity or quality
- **🔵 P2 (Medium)**: Score 1.0-1.9, quality of life improvements
- **⚪ P3 (Low)**: Score <1.0, future considerations

---

## Part 2: Technical Debt Mediation

### 2.1 Stakeholder Alignment

Technical debt mediation requires balancing multiple perspectives:

#### Developer Perspective
**Concerns:**
- Code maintainability and clarity
- Development velocity
- Testing confidence
- Refactoring opportunities
- Technical excellence

**Questions for Developers:**
- What debt items slow you down the most?
- Which areas of the codebase are hardest to work with?
- What changes would most improve your daily work?
- Are there technical risks keeping you up at night?

#### Business/Product Perspective
**Concerns:**
- Feature delivery timeline
- Production stability
- Customer-facing quality
- Compliance and legal requirements
- Cost of remediation vs. cost of delay

**Questions for Product:**
- How does technical debt impact feature delivery?
- What's the business risk of delaying fixes?
- Which features are blocked or slowed by technical debt?
- What's the acceptable timeline for debt remediation?

#### Security/Compliance Perspective (CRITICAL for Mental Scribe)
**Concerns:**
- HIPAA compliance gaps
- Data breach risk
- Audit trail completeness
- Access control correctness
- Vulnerability remediation

**Questions for Security:**
- What security debt creates immediate risk?
- Which items are compliance blockers?
- How does debt impact our security posture?
- What's required for production certification?

---

### 2.2 Mediation Decision Framework

For each debt item, facilitate decision-making using this framework:

#### Step 1: Assess Business Context
**Questions to Answer:**
- What upcoming features or releases does this impact?
- Is there a compliance deadline or audit coming?
- What's the cost of leaving this unfixed for 3/6/12 months?
- Are there workarounds that reduce immediate impact?

#### Step 2: Evaluate Trade-offs
**Considerations:**
- **Fix Now**: Delays feature work but prevents future slowdown
- **Fix Later**: Maintains current velocity but compounds debt
- **Mitigate**: Temporary solution to reduce risk while planning proper fix
- **Accept**: Document and monitor, fix when circumstances change

#### Step 3: Negotiate Timeline
**Factors to Consider:**
- Team capacity and sprint commitments
- Dependency chains (what must be fixed first?)
- Natural break points (between releases, after milestones)
- Technical dependencies (can items be parallelized?)

#### Step 4: Define Success Criteria
For items selected for remediation:
- [ ] Clear acceptance criteria defined
- [ ] Definition of Done specified
- [ ] Regression prevention strategy outlined
- [ ] Success metrics identified
- [ ] Timeline and milestones established

---

### 2.3 Remediation Planning Template

For each P0/P1 debt item approved for remediation, create a plan:

#### Item: [Debt Item Name]
**Priority:** 🔴 P0 / 🟡 P1 / 🔵 P2 / ⚪ P3  
**Debt Score:** [Score] (Impact: [X], Risk: [Y], Effort: [Z])

**Current State:**
- Describe the problem
- What's the current impact?
- What's the technical or business risk?

**Proposed Solution:**
- What's the recommended approach?
- Are there alternative approaches?
- What are the trade-offs?

**Implementation Plan:**
- [ ] Step 1: [Action item]
- [ ] Step 2: [Action item]
- [ ] Step 3: [Action item]

**Definition of Done:**
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No regressions verified

**Success Metrics:**
- Quantifiable improvement target
- How will we measure success?

**Timeline:**
- **Estimated Effort:** [X] person-days/weeks
- **Owner:** [@team or @individual]
- **Target Completion:** Week/Sprint [X]
- **Dependencies:** [List blockers or prerequisite work]

**Risk Mitigation:**
- What could go wrong during remediation?
- What's the rollback plan?
- How do we prevent regressions?

---

## Part 3: Mediation Session Outputs

### 3.1 Technical Debt Register

Create a prioritized list of all debt items:

| Priority | Score | Item | Impact | Risk | Effort | Owner | Timeline | Status |
|----------|-------|------|--------|------|--------|-------|----------|--------|
| 🔴 P0 | 4.5 | [Item] | 5 | 4 | 2 | @team | Week 1 | Planned |
| 🟡 P1 | 3.2 | [Item] | 4 | 3 | 2 | @team | Week 2-3 | Backlog |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

---

### 3.2 Remediation Roadmap

**Phase 1: Critical Path (Weeks 1-2)**
- **Goal:** Address blockers and high-risk items
- **Items:** [List P0 items]
- **Success Metrics:** [Define clear metrics]

**Phase 2: High Impact (Weeks 3-6)**
- **Goal:** Improve velocity and reduce friction
- **Items:** [List P1 items]
- **Success Metrics:** [Define clear metrics]

**Phase 3: Quality & Polish (Months 2-3)**
- **Goal:** Long-term maintainability
- **Items:** [List P2 items]
- **Success Metrics:** [Define clear metrics]

**Deferred Items (P3):**
- **Items:** [List P3 items]
- **Review Date:** [When to reassess]

---

### 3.3 Resource Allocation Plan

**Total Estimated Effort:** [X] person-weeks over [Y] weeks

**Team Allocation:**
- **Phase 1:** [Number] engineers, [Number] weeks
- **Phase 2:** [Number] engineers, [Number] weeks
- **Phase 3:** [Number] engineers, [Number] weeks

**Capacity Planning:**
- What percentage of sprint capacity for debt work?
- How does this impact feature delivery?
- Are there opportunities for parallel work?

---

### 3.4 Monitoring & Accountability

**Tracking Metrics:**
- [ ] Component complexity metrics (lines per file)
- [ ] Test coverage percentage
- [ ] Build/deploy success rate
- [ ] Bug cycle time
- [ ] Feature velocity
- [ ] Developer satisfaction score

**Review Cadence:**
- **Weekly:** Progress check-ins on active remediation items
- **Monthly:** Technical debt register review and re-prioritization
- **Quarterly:** Comprehensive debt assessment and strategic planning

**Accountability:**
- **Technical Lead:** Owns overall debt strategy and prioritization
- **Team Leads:** Own specific remediation initiatives
- **Developers:** Own assigned debt items
- **Product:** Balances debt work with feature delivery

---

## Part 4: Mediation Best Practices

### 4.1 Communication Guidelines

**Be Transparent:**
- Share the full debt register with all stakeholders
- Explain scoring rationale and trade-offs
- Document decisions and reasoning

**Be Data-Driven:**
- Use metrics to justify priorities
- Quantify impact where possible
- Track progress with measurable outcomes

**Be Collaborative:**
- Include all perspectives in prioritization
- Facilitate discussion, don't dictate
- Build consensus on timeline and approach

### 4.2 Common Pitfalls to Avoid

❌ **Don't:**
- Ignore business priorities for technical perfection
- Fix debt without clear ROI justification
- Create debt while fixing other debt
- Skip testing during remediation
- Defer all debt "until later"
- Make changes without team buy-in

✅ **Do:**
- Balance debt work with feature delivery (suggest 20-30% capacity)
- Fix the most painful items first (highest ROI)
- Prevent new debt with coding standards
- Test thoroughly during refactoring
- Address security/compliance debt immediately
- Get stakeholder agreement on priorities

### 4.3 Healthcare-Specific Considerations

**For Mental Scribe (HIPAA/42 CFR Part 2 Compliance):**

**Non-Negotiable (Fix Immediately):**
- RLS policy gaps or errors
- Authentication/authorization vulnerabilities
- Audit logging gaps
- PHI exposure risks
- Compliance violations

**High Priority (Fix Soon):**
- Security hardening opportunities
- Access control improvements
- Error handling for sensitive data
- Encryption at rest/transit validation

**Important Context:**
- Some debt cannot be deferred due to regulatory requirements
- Security debt takes precedence over feature debt
- Compliance violations block production deployment
- Audit trail completeness is mandatory

---

## Part 5: Session Deliverables

At the end of the mediation session, produce:

### 5.1 Executive Summary
- Overall technical debt assessment
- Priority distribution (count of P0/P1/P2/P3)
- Total remediation effort estimate
- Recommended investment and timeline
- Expected outcomes and ROI

### 5.2 Detailed Technical Debt Report
- Complete debt register with scoring
- Item-by-item analysis and recommendations
- Category breakdown (code quality, architecture, security, etc.)
- Comparison to industry standards

### 5.3 Remediation Plan
- Phased implementation roadmap
- Resource allocation and timeline
- Success metrics and KPIs
- Risk mitigation strategies

### 5.4 Action Items
- Immediate actions (this week)
- Short-term actions (this month)
- Medium-term actions (this quarter)
- Long-term strategy

### 5.5 Monitoring Dashboard
- Key metrics to track
- Review cadence and checkpoints
- Escalation criteria
- Progress reporting format

---

## Part 6: Example Mediation Dialogue

### Scenario: Monolithic Component Debate

**Developer:** "The ChatInterface component is 1,076 lines. It takes new engineers 2 days to understand it and slows down bug fixes by 50%. We should refactor it immediately."

**Product Manager:** "We have 3 major features planned for next month. Can this wait until after the release?"

**Mediator (Using This Framework):**

**Step 1 - Quantify Impact:**
- Current bug fix time: 2-3 days (vs. 1 day average)
- New feature development blocked by component complexity
- Score: Impact 4, Risk 3, Effort 3 = Score 2.3 (P1 High)

**Step 2 - Explore Options:**
- **Option A:** Full refactor now (3 weeks, delays features)
- **Option B:** Incremental extraction (1 week Phase 1, continue in parallel)
- **Option C:** Defer entirely (accept continued slowdown)

**Step 3 - Facilitate Decision:**
"Let's consider Option B: We extract the most problematic sections (file upload, voice controls) in 1 week. This gives us 50% of the benefit with 33% of the cost. We can complete the refactor incrementally over 6 weeks while maintaining feature velocity."

**Step 4 - Document Agreement:**
- Week 1: Extract FileUploadSection and VoiceControls
- Weeks 2-6: Continue extraction in parallel with features (20% sprint capacity)
- Target: Main component <200 lines by end of month
- Success metric: Bug fix time reduced to <1.5 days average

---

## Part 7: Post-Mediation Actions

### 7.1 Create GitHub Issues
For each approved remediation item:
- Create detailed GitHub issue with acceptance criteria
- Apply appropriate labels (tech-debt, p0-critical, security, etc.)
- Assign to team/individual with timeline
- Link to epic or milestone

### 7.2 Update Documentation
- Document decisions and rationale
- Update architecture docs if structure changes
- Create/update developer guides
- Record historical context for future reviews

### 7.3 Establish Monitoring
- Set up automated metrics tracking
- Create dashboard for key indicators
- Schedule review meetings
- Define escalation paths

### 7.4 Communicate Plan
- Share summary with all stakeholders
- Present roadmap to leadership
- Update team on priorities and timeline
- Set expectations for feature vs. debt balance

---

## Appendix A: Mental Scribe Specific Guidance

### Known Debt Areas (As of Last Review)
1. **ChatInterface.tsx** - 1,076 lines, needs decomposition
2. **Console logging** - 79+ instances in production code
3. **Test coverage** - 70% current, target 85%+
4. **State management** - Prop drilling and sync issues
5. **Error handling** - Inconsistent patterns

### Non-Negotiable Requirements
- ✅ Zero critical security vulnerabilities
- ✅ HIPAA compliance maintained
- ✅ RLS policies complete and correct
- ✅ Audit logging comprehensive
- ✅ No PHI exposure risks

### Tech Stack Constraints
- React 18+ with TypeScript (strict mode)
- Supabase for backend (RLS critical)
- Vite build system
- shadcn/ui components
- Tailwind CSS (semantic tokens only)

---

## Appendix B: Useful Commands Reference

### Discovery Commands
```bash
# Find component complexity
find src -name "*.tsx" -exec wc -l {} + | sort -rn | head -20

# Test coverage
npm run test:coverage

# Security scan
npm audit
npm run sec:prove

# Lint check
npm run lint:quiet

# Type check
npm run type-check

# Search patterns
rg "console\.(log|error|warn)" src/ --count
rg "TODO|FIXME|HACK" src/
rg "any" src/ --type ts
```

### Metrics Commands
```bash
# Count components
find src/components -name "*.tsx" | wc -l

# Count tests
find src -name "*.test.ts*" | wc -l

# Line count by directory
find src -name "*.ts*" | xargs wc -l | sort -rn

# Dependency analysis
npm list --depth=0
npm outdated
```

---

## Appendix C: Mediation Session Checklist

**Pre-Session (Preparation):**
- [ ] Run discovery commands and collect metrics
- [ ] Review recent bug reports and incident logs
- [ ] Interview developers about pain points
- [ ] Review upcoming roadmap and priorities
- [ ] Prepare debt scoring framework

**During Session (Facilitation):**
- [ ] Present findings with data
- [ ] Score and prioritize debt items
- [ ] Facilitate stakeholder discussion
- [ ] Negotiate timeline and approach
- [ ] Document decisions and rationale
- [ ] Define success criteria

**Post-Session (Follow-through):**
- [ ] Create GitHub issues for approved items
- [ ] Update roadmap and sprint plans
- [ ] Communicate plan to team
- [ ] Schedule follow-up reviews
- [ ] Set up monitoring and tracking

---

**Version:** 1.0  
**Last Updated:** 2025-11-07  
**Next Review:** Monthly or as needed  
**Owner:** Technical Leadership Team

---

## How to Use This Prompt

**For AI Agents:**
Use this prompt to conduct autonomous technical debt reviews. Follow each section systematically, run the suggested commands, apply the scoring framework, and generate comprehensive reports.

**For Development Teams:**
Use this as a facilitation guide for technical debt review sessions. The framework helps balance technical excellence with business needs while ensuring healthcare compliance.

**For Technical Leaders:**
Use this to establish a consistent, data-driven approach to technical debt management. The mediation framework helps build stakeholder alignment and accountability.

**Customization:**
Adapt sections to your specific context, but maintain the core principles: quantify debt, balance perspectives, facilitate data-driven decisions, and track outcomes.
