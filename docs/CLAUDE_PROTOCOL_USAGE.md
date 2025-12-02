# Using the CLAUDE.MD Coding Agent Protocol

**Companion guide to CLAUDE.MD**

This document explains how to effectively use the CLAUDE.MD protocol with AI coding agents.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration Guide](#integration-guide)
3. [Practical Examples](#practical-examples)
4. [Decision Trees](#decision-trees)
5. [Measuring Effectiveness](#measuring-effectiveness)
6. [Evolution Guide](#evolution-guide)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Humans: First-Time Setup

**1. Add CLAUDE.MD to your repository root**
```bash
# Already done if you're reading this!
# The file is at: /CLAUDE.MD
```

**2. Reference it in your AI agent instructions**

Add to your AI agent's system prompt or initial context:
```
Before you begin coding, read and follow the protocol in CLAUDE.MD.
This document defines how you should approach code changes safely.
```

**3. First task: Have the agent read it**
```
"Please read CLAUDE.MD and confirm you understand the core loop and hard stops."
```

### For AI Agents: Quick Reference Card

**Before any code change:**
- [ ] Read the files you'll change
- [ ] Understand the requirement (ask if unclear)
- [ ] Will this touch >3 files? → ASK
- [ ] Will this delete data? → ASK
- [ ] Will this change security/auth/API? → ASK

**During changes:**
- [ ] Do the minimum viable change
- [ ] Inline code until 3rd use (no premature abstraction)
- [ ] One file is better than three files

**After changes:**
- [ ] Run what you changed
- [ ] Run tests if they exist
- [ ] Check for secrets/vulnerabilities before committing
- [ ] Commit when it works

**If uncertain (<80% confidence):**
- [ ] Say so explicitly
- [ ] Explain what you don't know
- [ ] Propose how to verify

---

## Integration Guide

### Method 1: System Prompt Integration (Recommended)

**For Claude, GPT-4, or similar:**

```markdown
# System Instructions

You are a coding assistant following the CLAUDE.MD protocol.

**Core principles:**
1. Read before edit (never change code you haven't read)
2. Run what you change (verify it actually works)
3. Stop at uncertainty (ask when confidence < 80%)
4. Bias toward simplicity (edit > create, one file > many files)

**Hard stops (ALWAYS ask first):**
- Deleting data, files, or records
- Changing security, auth, or permissions
- Breaking API changes
- Touching more than 3 files

**Full protocol:** Read /CLAUDE.MD in the repository for complete guidelines.

When you encounter a decision point, explicitly reference which section
of CLAUDE.MD informs your choice.
```

### Method 2: Pre-Task Briefing

Before each coding session:
```
"For this task, please follow CLAUDE.MD protocol, specifically:
- Read files before editing (Section I)
- Ask before touching >3 files (Section II)
- Use progressive disclosure (Section V)
- Signal if you're uncertain (Section IV)"
```

### Method 3: Inline References

During conversation:
```
User: "Add a caching layer to the API"

Agent: "Before I start (CLAUDE.MD Section I), let me read the current
API implementation to understand the architecture..."

[reads files]

Agent: "This will require changes to 4 files (Section II Hard Stop).
The scope is larger than a simple addition. Should I proceed or
reduce scope?"
```

### Method 4: Repository Convention

Add to your `CONTRIBUTING.md`:
```markdown
## AI Agent Guidelines

If using an AI coding assistant on this project, please ensure it
follows the protocol defined in `/CLAUDE.MD`. This helps maintain
code quality and prevents common failure modes.

Required reading for AI agents:
- `/CLAUDE.MD` - Core coding protocol
- `/docs/ARCHITECTURE.md` - System design
- `/docs/CLAUDE_PROTOCOL_USAGE.md` - Usage examples
```

---

## Practical Examples

### Example 1: Simple Bug Fix ✅

**Scenario:** Fix a null pointer exception in `UserProfile.tsx`

**Agent response (following protocol):**

```
Following CLAUDE.MD Section I, I'll read the file first.

[reads UserProfile.tsx]

I found the issue at line 47: `user.name.toUpperCase()` doesn't
check if `user.name` exists.

Fix (Section III - bias toward simplicity):
```typescript
- const displayName = user.name.toUpperCase();
+ const displayName = user.name?.toUpperCase() ?? 'Unknown';
```

This is a one-file change, so I'll proceed (Section II).

[applies edit]

Now verifying the change works (Section I.6):

[runs the component, checks for errors]

✓ Component renders without errors
✓ Handles null name gracefully
✓ Tests pass

Committing (Section I.8):
```

**Why this works:**
- ✅ Read file first (prevented hallucination)
- ✅ Minimal change (optional chaining, not refactoring entire component)
- ✅ Verified it works (ran the component)
- ✅ Committed when working (checkpoint created)

---

### Example 2: Feature Request - Scope Check ⚠️

**Scenario:** "Add user search functionality"

**Agent response (following protocol):**

```
Before I start, let me understand the scope (Section X):

This feature will require:
1. New SearchBar component (frontend/components/SearchBar.tsx)
2. Search API endpoint (backend/api/search.ts)
3. Database query function (backend/db/userQueries.ts)
4. Integration in UserList component (frontend/pages/UserList.tsx)

This touches 4 files (Section II Hard Stop: ">3 files").

Options:
A) Reduced scope: Add search to existing UserList only (2 files)
B) Full scope: Proceed with all 4 files (requires your approval)

Which approach would you prefer?
```

**Why this works:**
- ✅ Scoped the task before starting (Section X)
- ✅ Identified Hard Stop trigger (>3 files)
- ✅ Stopped and asked (Section II)
- ✅ Proposed alternatives (reduced vs. full scope)

---

### Example 3: Uncertain About Architecture 🤔

**Scenario:** "Optimize the database query in getClientData()"

**Agent response (following protocol):**

```
I'll read the current implementation first (Section I.1):

[reads getClientData function]

I see a Prisma query with multiple joins. However, I'm uncertain
about the optimization approach (Section IV):

**What I don't know:**
- What's the typical data size? (10 rows vs. 10,000 rows)
- Is this query causing actual performance problems?
- Are there existing indexes on the joined columns?
- What's the acceptable latency target?

**Confidence: ~40%** (Section IV - below 80% threshold)

**How we could verify:**
1. Check slow query logs to see actual performance
2. Run EXPLAIN ANALYZE on current query
3. Profile with realistic data volume

Should I proceed with profiling first, or do you have specific
performance issues you're seeing?
```

**Why this works:**
- ✅ Signaled uncertainty explicitly (Section IV)
- ✅ Explained what's unknown (not what's known)
- ✅ Proposed verification steps (not blind optimization)
- ✅ Asked instead of guessing

---

### Example 4: Breaking the Protocol (Correctly) 🔥

**Scenario:** "Production is down! The login endpoint is returning 500 errors!"

**Agent response (following protocol - Section XI):**

```
Emergency situation - breaking normal protocol (Section XI).

Skipping planning phase, going straight to diagnosis:

[checks logs]

Found the issue: environment variable DATABASE_URL is undefined
in production.

Immediate fix:
[verifies env var in production config]

The variable exists but has a typo: `DATABSE_URL` (missing A).

Fixed in production config.

[verifies service is back up]

✓ Login endpoint returning 200
✓ Users can authenticate

Now I'll follow up with proper protocol:
1. Added check to prevent startup with missing DATABASE_URL
2. Added this to runbook: docs/runbooks/INCIDENT_RESPONSE.md
3. Created ticket to add env var validation at startup

Protocol violation justified: Production emergency (Section XI).
```

**Why this works:**
- ✅ Recognized emergency context (Section XI trigger)
- ✅ Explicitly stated protocol break and reason
- ✅ Fixed the urgent problem immediately
- ✅ Followed up with proper process after emergency resolved
- ✅ Prevented future occurrences (added validation)

---

## Decision Trees

### Decision Tree 1: Should I Ask First?

```
Are you about to...
├─ Delete user data, files, or database records?
│  └─ YES → ASK FIRST (Section II)
│
├─ Change authentication, authorization, or security?
│  └─ YES → ASK FIRST (Section II)
│
├─ Make breaking API changes (remove endpoints, change contracts)?
│  └─ YES → ASK FIRST (Section II)
│
├─ Touch more than 3 files?
│  └─ YES → ASK FIRST (Section II)
│
├─ Uncertain if something qualifies as a "hard stop"?
│  └─ YES → ASK FIRST (Section II)
│
└─ None of the above?
   └─ PROCEED (but signal if uncertain - Section IV)
```

### Decision Tree 2: How Much Should I Change?

```
What's the simplest solution?
├─ Can I fix this by editing 1 existing file?
│  └─ YES → Do that (Section III)
│  └─ NO → Continue...
│
├─ Can I solve this without creating new files?
│  └─ YES → Edit existing files (Section III)
│  └─ NO → Continue...
│
├─ Can I inline the code instead of abstracting?
│  └─ Is this the first or second use of this pattern?
│     └─ YES → Inline it (Section I.5)
│     └─ NO (3rd use) → Okay to abstract
│
├─ Can I solve this without adding dependencies?
│  └─ YES → Use existing tools (Section III)
│  └─ NO → Is the dependency really necessary?
│
└─ Still unsure?
   └─ Pick the option that changes fewer files (Section III)
```

### Decision Tree 3: Am I Uncertain?

```
Evaluating your confidence...
├─ Have you worked with this framework/pattern before?
│  └─ NO → You're uncertain (Section IV)
│
├─ Are you guessing about edge case behavior?
│  └─ YES → You're uncertain (Section IV)
│
├─ Are you assuming how an external system works?
│  └─ YES → You're uncertain (Section IV)
│
├─ Does your solution work but you don't know why?
│  └─ YES → You're uncertain (Section IV)
│
├─ Are you making changes based on unverified assumptions?
│  └─ YES → You're uncertain (Section IV)
│
└─ None of the above AND you can explain your reasoning?
   └─ Confidence ≥ 80% → Proceed (but verify results - Section I.6)
```

---

## Measuring Effectiveness

### Key Metrics to Track

Track these metrics before and after implementing the protocol:

**Primary Metrics:**

| Metric | How to Measure | Target Improvement |
|--------|----------------|-------------------|
| **First-Try Success Rate** | % of changes that work without needing fixes | +30% |
| **Regression Rate** | % of changes that break existing functionality | -50% |
| **Scope Creep Incidents** | # of times "simple fix" became major refactor | -70% |
| **Security Incidents** | # of vulnerabilities introduced | -80% |
| **Rollback Frequency** | # of commits that needed to be reverted | -60% |

**Secondary Metrics:**

| Metric | How to Measure | What It Indicates |
|--------|----------------|-------------------|
| **Average Files Touched per Task** | Commit analysis | Complexity/scope management |
| **Time to First Working State** | Task start → first successful run | Efficiency |
| **Uncertainty Signals per Session** | Count of "I'm uncertain" statements | Calibration quality |
| **Hard Stop Triggers** | Count of "asking first" on Section II items | Risk awareness |

### Tracking Template

Create a simple log: `docs/protocol-metrics.md`

```markdown
## Protocol Effectiveness Log

### Week of 2025-12-02

| Date | Task | First-Try Success? | Regressions? | Scope Creep? | Notes |
|------|------|-------------------|--------------|--------------|-------|
| 12/02 | Fix login bug | ✅ Yes | No | No | Clean fix, verified before commit |
| 12/02 | Add search | ❌ No (took 2 tries) | No | Yes (grew from 2→5 files) | Agent asked at 3 files (protocol worked) |
| 12/03 | Optimize query | ✅ Yes | No | No | Agent signaled uncertainty, profiled first |

**Weekly Summary:**
- First-try success: 66% (2/3)
- Scope creep prevented: 100% (agent asked when crossing threshold)
- Regressions: 0%
```

### Automated Tracking (Advanced)

Add to your git hooks or CI:

```bash
# .git/hooks/post-commit
#!/bin/bash
# Track protocol compliance

FILES_CHANGED=$(git diff --name-only HEAD~1 HEAD | wc -l)

if [ $FILES_CHANGED -gt 3 ]; then
  echo "⚠️  Changed $FILES_CHANGED files (CLAUDE.MD recommends ≤3)"
  echo "Was this approved? If not, consider splitting the commit."
fi

# Check commit message for protocol references
if git log -1 --pretty=%B | grep -q "CLAUDE.MD\|Section II\|Hard Stop"; then
  echo "✅ Protocol-aware commit"
fi
```

---

## Evolution Guide

### How to Update the Protocol

The protocol should evolve based on real outcomes. Here's how:

**1. Track Violations That Led to Good Outcomes**

```markdown
## Protocol Improvement Log

### Violation: Agent created 5 files without asking

**Context:** Building a new feature module
**Outcome:** ✅ Clean, working code with proper separation
**Analysis:** The ">3 files" rule assumes scope creep, but doesn't account
for intentional modular design.

**Proposed Change:** Refine Section II to:
"Touching >3 files → ask UNLESS building a cohesive new module with clear boundaries"
```

**2. Track Failures Despite Following Protocol**

```markdown
### Followed Protocol But Failed Anyway

**Context:** Agent read file, made minimal change, verified it worked
**Outcome:** ❌ Broke integration tests (not run during verification)
**Analysis:** "Run what you changed" is too narrow. Need to run full test suite.

**Proposed Change:** Section I.6 should specify:
"Run what you changed AND run related tests (unit, integration)"
```

**3. Monthly Protocol Review

Schedule monthly review sessions:

```markdown
## Protocol Review: December 2025

**Metrics:**
- First-try success: 85% (up from 60% baseline)
- Regressions: 5% (down from 15% baseline)
- Scope creep: 2 incidents (down from 12/month)

**What's Working:**
- Section II (Hard Stops) has prevented 8 potential security issues
- Section IV (Uncertainty Signaling) led to better questions, fewer assumptions

**What's Not Working:**
- Section VI (Tool Usage) is too prescriptive, agents ignore it
- Section X (Context Management) 75% threshold is too late, should be 60%

**Changes:**
1. Simplify Section VI to principles only (delete specific tool commands)
2. Update Section X threshold to 60%
3. Add to Section II: "Ask before modifying database migrations"
```

**4. A/B Testing Protocol Variants**

For larger teams, test variants:

```markdown
## A/B Test: Commit Frequency

**Variant A (Control):** "Commit when it works" (current protocol)
**Variant B (Test):** "Commit after each logical unit (even if incomplete)"

**Hypothesis:** More frequent commits = easier rollback, less lost work
**Duration:** 2 weeks
**Measured by:** Rollback frequency, lost work incidents

**Results:**
- Variant A: 3 rollbacks, 1 lost work incident
- Variant B: 8 rollbacks, 0 lost work incidents

**Conclusion:** Variant B prevents lost work but creates noisier history.
**Decision:** Hybrid approach - commit incomplete work to feature branch only.
```

### Version Control for CLAUDE.MD

Treat CLAUDE.MD like production code:

```bash
# Create feature branch for protocol changes
git checkout -b protocol/update-context-threshold

# Update CLAUDE.MD
# Section X: Context Management
- At 75% context window usage:
+ At 60% context window usage:

# Commit with rationale
git commit -m "protocol: reduce context threshold to 60%

Agents were losing coherence at 75% threshold. Multiple sessions
ended with incomplete/confused responses.

Reducing to 60% provides buffer for wrap-up and handoff.

Tracked in: docs/protocol-metrics.md (Week of 2025-11-25)"

# Review and merge
gh pr create --title "Protocol: Reduce context threshold to 60%"
```

---

## Troubleshooting

### Problem: Agent Ignores the Protocol

**Symptoms:**
- Makes changes without reading files first
- Doesn't ask before deleting data
- Never signals uncertainty

**Diagnosis:**
- Protocol not in agent's context/system prompt
- Agent context window exhausted (protocol forgotten)
- Protocol conflicts with other instructions

**Solutions:**

1. **Verify protocol is loaded:**
   ```
   "Please confirm: Have you read CLAUDE.MD? What are the Section II hard stops?"
   ```

2. **Re-inject mid-session:**
   ```
   "Before proceeding, please re-read CLAUDE.MD Section II (Hard Stops)
   and confirm this change doesn't trigger any of them."
   ```

3. **Check for conflicting instructions:**
   ```
   # BAD: Conflicts with CLAUDE.MD
   "Make changes quickly without asking questions"

   # GOOD: Aligns with CLAUDE.MD
   "Follow CLAUDE.MD protocol, ask when you hit hard stops"
   ```

### Problem: Agent Follows Protocol Too Rigidly

**Symptoms:**
- Asks permission for trivial changes
- Wastes time explaining obvious actions
- Won't proceed without explicit approval

**Diagnosis:**
- Agent lacks judgment/context
- Protocol language too absolute ("ALWAYS ask")
- Agent optimizing for compliance over outcomes

**Solutions:**

1. **Invoke Section XI (When to Break Rules):**
   ```
   "Remember CLAUDE.MD Section XI: If following the protocol makes
   the outcome worse, use judgment to break it. This is a trivial
   change, proceed without asking."
   ```

2. **Calibrate "uncertainty" threshold:**
   ```
   "You're signaling uncertainty too often. Only flag when confidence
   is genuinely below 80%. Making a CSS color change doesn't require
   uncertainty markers."
   ```

3. **Emphasize outcomes over compliance:**
   ```
   "The goal is working code, not perfect protocol compliance.
   Use CLAUDE.MD as a safety net, not a straightjacket."
   ```

### Problem: Agent Skips Verification Step

**Symptoms:**
- Makes changes but doesn't run/test them
- Commits code without verifying it works
- Discovers breakage only when user tests

**Diagnosis:**
- Agent interprets "verify" as "read the code"
- No test environment available
- Verification step not emphasized enough

**Solutions:**

1. **Make verification explicit:**
   ```
   "After making the change, you MUST actually run the code.
   'Verifying' means executing it and observing the output,
   not just reading it. (CLAUDE.MD Section I.6)"
   ```

2. **Provide verification commands:**
   ```
   "For this project:
   - Run tests: npm test
   - Run app: npm run dev
   - Type check: npm run type-check

   Use these to verify your changes work (CLAUDE.MD Section I.7)"
   ```

3. **Track verification in metrics:**
   ```
   After each task: "Did you run the code/tests? (Section I.6)"
   Log yes/no in protocol-metrics.md
   ```

### Problem: Scope Creep Despite Protocol

**Symptoms:**
- "Fix a bug" turns into "refactor entire module"
- Agent touches 6+ files after asking about 4
- Original task gets lost in "improvements"

**Diagnosis:**
- Agent interprets approval too broadly
- No checkpoint/review after crossing threshold
- "While I'm here" mentality

**Solutions:**

1. **Grant narrow approval:**
   ```
   # BAD: Too broad
   "Yes, proceed with the 4 files"

   # GOOD: Specific scope
   "Yes, you can touch these 4 specific files for this feature:
   - UserAuth.tsx (add MFA check)
   - AuthContext.tsx (update context)
   - Login.tsx (add MFA prompt)
   - api/auth.ts (verify MFA token)

   Don't refactor other code while you're in these files."
   ```

2. **Set explicit boundaries:**
   ```
   "The task is: Add MFA to login flow.
   OUT OF SCOPE: Refactoring auth system, updating other pages,
   adding new features. Stick to the minimum change."
   ```

3. **Checkpoint after approval:**
   ```
   "You've been approved to touch 4 files. After making changes
   to each file, report what you changed before moving to the next.
   This prevents scope creep."
   ```

### Problem: Agent Produces Working But Ugly Code

**Symptoms:**
- Code works but violates style guide
- Inconsistent with rest of codebase
- Technical debt accumulates

**Diagnosis:**
- Protocol says "working ugly > broken elegant" (Section I.4)
- Agent takes this too literally
- Missing "and then improve it" step

**Solutions:**

1. **Two-phase approach:**
   ```
   "Phase 1: Get it working (CLAUDE.MD Section I.4)
   Phase 2: Clean it up to match codebase style

   You're in phase 1 now. After verification, we'll do phase 2."
   ```

2. **Define "ugly" boundaries:**
   ```
   "Working ugly > broken elegant means:
   ✅ Okay: Verbose code, some duplication, inline logic
   ❌ Not okay: Violating security patterns, ignoring error handling,
               inconsistent with critical architecture patterns"
   ```

3. **Add cleanup as separate task:**
   ```
   After agent ships working ugly code:
   "Great, it works! Now create a TODO commit:
   - Add TODO comments for cleanup needed
   - Create ticket: 'Refactor XYZ for maintainability'
   - We'll tackle cleanup in next iteration"
   ```

---

## Quick Reference Cheat Sheet

**Print this and keep it visible when working with AI agents:**

```
╔═══════════════════════════════════════════════════════════════╗
║                   CLAUDE.MD PROTOCOL                          ║
║                  Quick Reference Card                         ║
╠═══════════════════════════════════════════════════════════════╣
║ CORE LOOP                                                     ║
║  □ Read files before editing                                  ║
║  □ Do minimum viable change                                   ║
║  □ Run what you changed                                       ║
║  □ Commit when it works                                       ║
╠═══════════════════════════════════════════════════════════════╣
║ HARD STOPS (Ask First)                                        ║
║  □ Deleting data/files                                        ║
║  □ Security/auth changes                                      ║
║  □ Breaking API changes                                       ║
║  □ Touching >3 files                                          ║
╠═══════════════════════════════════════════════════════════════╣
║ WHEN UNCERTAIN (<80% confidence)                              ║
║  ✓ Say so explicitly                                          ║
║  ✓ Explain what you don't know                               ║
║  ✓ Propose verification                                       ║
╠═══════════════════════════════════════════════════════════════╣
║ SIMPLICITY BIAS                                               ║
║  ✓ Edit > Create                                              ║
║  ✓ One file > Many files                                      ║
║  ✓ Inline > Abstract (until 3rd use)                          ║
║  ✓ Working ugly > Broken elegant                              ║
╠═══════════════════════════════════════════════════════════════╣
║ WHEN TO BREAK RULES                                           ║
║  → Production emergency                                       ║
║  → Exploratory coding                                         ║
║  → User explicitly overrides                                  ║
║  → Protocol makes outcome worse                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Conclusion

The CLAUDE.MD protocol is designed to:
- ✅ Prevent catastrophic failures (data loss, security breaks)
- ✅ Reduce scope creep and over-engineering
- ✅ Improve first-try success rates
- ✅ Make uncertainty visible (better questions, less guessing)
- ✅ Work with LLM architecture (not against it)

**Key to success:** Use the protocol as a safety net, not a straightjacket. Optimize for working code, not perfect compliance.

**Next steps:**
1. Integrate protocol into your agent workflow (see [Integration Guide](#integration-guide))
2. Track metrics for 2 weeks (see [Measuring Effectiveness](#measuring-effectiveness))
3. Review outcomes and evolve protocol (see [Evolution Guide](#evolution-guide))

**Questions or improvements?** The protocol should evolve based on real-world usage. Track what works, what doesn't, and update accordingly.

---

**Version:** 1.0
**Last Updated:** 2025-12-02
**Related Documents:**
- `/CLAUDE.MD` - Core protocol
- `/CONTRIBUTING.md` - Contribution guidelines
- `/docs/ARCHITECTURE.md` - System architecture
