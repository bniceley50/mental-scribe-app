# Using the CLAUDE.MD Protocol: Epistemic Discipline for Coding Agents

**Companion guide to CLAUDE.MD v2.0**

This document explains how to apply epistemic rationality principles when working with AI coding agents.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [The Prediction Loop](#the-prediction-loop)
3. [Stop → Words → Wait](#stop--words--wait)
4. [Practical Examples](#practical-examples)
5. [Common Patterns](#common-patterns)
6. [Integration Guide](#integration-guide)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### The Core Pattern

```
DOING: [specific action you're about to take]
EXPECT: [falsifiable prediction of what will happen]

[execute action]

RESULT: [what actually happened]
MATCHES: [yes/no]
→ [if no: STOP, theorize, propose, wait for confirmation]
```

### Example in Practice

**Bad (theater prediction):**
```
DOING: Run the tests
EXPECT: They will do something

[runs tests]

RESULT: 3 tests failed
MATCHES: Yes (something happened) ✗ WORTHLESS
```

**Good (falsifiable prediction):**
```
DOING: Run the tests
EXPECT: All 15 tests pass with exit code 0

[runs tests]

RESULT: Exit code 1, 3 tests failed with "undefined is not a function"
MATCHES: No ✓ USEFUL INFORMATION

STOP. Theory: I broke something in the refactor.
Checking which tests failed... [investigates]
Theory: Removed a helper function that tests depend on.
Want to restore the helper function, expecting tests to pass.
Proceed?
```

---

## The Prediction Loop

### Why Predictions Matter

Your mental model is constantly wrong in small ways. Predictions make your beliefs explicit and testable. When reality contradicts your prediction, you've found a place where your model is broken.

**Key principle:** If your prediction matches any outcome, it's not a prediction.

### Making Falsifiable Predictions

| Worthless (matches everything) | Falsifiable (can be proven wrong) |
|--------------------------------|-----------------------------------|
| "Expect: this will work or not work" | "Expect: returns 200 with JSON body" |
| "Expect: probably succeeds" | "Expect: creates file at /tmp/output.txt" |
| "Expect: some output" | "Expect: prints 'Done' and exits 0" |
| "Expect: error or success" | "Expect: 404 because route doesn't exist" |

### Risk-Calibrated Predictions

Not every action needs ceremony:

**Trivial (no prediction needed):**
- Reading files
- Listing directories
- Checking git status

**Low risk (brief prediction):**
```
DOING: Install lodash
EXPECT: Added to package.json, node_modules created
[do it]
RESULT: ✓ matches
```

**Medium risk (full ceremony):**
```
DOING: Modify UserAuth.tsx to add password validation
EXPECT: Build succeeds, type checker passes, no test failures

[do it]

RESULT: Build failed with "Property 'validatePassword' does not exist"
MATCHES: No

STOP. Theory: validatePassword function doesn't exist yet.
Want to create validatePassword in utils/auth.ts first.
Proceed?
```

**High/Irreversible (must confirm with Q):**
- Database migrations
- Deleting user data
- Breaking API changes
- Architectural decisions

---

## Stop → Words → Wait

### The Pattern

When **anything** fails:

1. **STOP** - No more tool calls
2. **STATE** - What failed, raw error
3. **THEORIZE** - Why you think it failed
4. **PROPOSE** - What to try next, with prediction
5. **WAIT** - For Q's confirmation

### Why No Silent Retry?

**Bad:**
```
npm install fails with network error
[agent immediately retries]
npm install fails again
[agent tries different approach]
[eventually succeeds but Q has no idea what happened]
```

**Good:**
```
DOING: npm install
EXPECT: Packages installed, exit 0

RESULT: Exit 1, "ENOTFOUND registry.npmjs.org"
MATCHES: No

STOP. Network error connecting to npm registry.

Theory: Either network is down or npm registry is unreachable.

Ruled out: Package.json syntax (would be different error).

Want to:
1. Check network: curl https://registry.npmjs.org/
2. If network works, retry npm install
3. If network fails, check if VPN/proxy is needed

Proceed?
```

**Failure is information.** Silent retry destroys that information.

---

## Practical Examples

### Example 1: Simple Bug Fix

**Task:** Fix crash when user has no email

**Theater approach (useless):**
```
DOING: Fix the crash
EXPECT: It works
[makes change]
RESULT: Still crashes
MATCHES: Uhh, kind of?
```

**Epistemic approach:**
```
Let me read the error first.

[reads error log]

Error: "Cannot read property 'toLowerCase' of undefined"
at UserProfile.tsx:42

Reading UserProfile.tsx...

[reads file]

Line 42: const emailLower = user.email.toLowerCase();

Theory: user.email is undefined for some users.

DOING: Add null check before toLowerCase()
EXPECT: Component renders without error, displays "No email" when undefined

Change:
- const emailLower = user.email.toLowerCase();
+ const emailLower = user.email?.toLowerCase() ?? 'No email provided';

[makes change]

DOING: Run the component with test data
EXPECT: No errors in console, displays "No email" for users without email

[runs it]

RESULT: ✓ No errors, shows "No email provided" when email is undefined
MATCHES: Yes

Committing.
```

### Example 2: The Fix-Forward Trap

**Scenario:** You've tried 3 fixes and it's still broken

**Bad (keeps digging):**
```
[tries fix #1: doesn't work]
[tries fix #2: different error]
[tries fix #3: back to original error]
[tries fix #4: "this definitely will work"]
[8 attempts later, completely lost]
```

**Good (recognizes the trap):**
```
[tries fix #1]
RESULT: Different error
MATCHES: No

[tries fix #2]
RESULT: Original error back
MATCHES: No

[tries fix #3]
RESULT: Still broken
MATCHES: No

STOP. I'm three fixes deep and not making progress.

Findings:
- Fix #1 changed error from X to Y
- Fix #2 reverted error back to X
- Fix #3 no change
- Pattern: I don't actually understand root cause

Theory: I'm treating symptoms, not cause.

Recommend: Revert all 3 fixes, go back to original error,
investigate properly before fixing.

Should I revert and start over?
```

### Example 3: Timebox Investigation

**Scenario:** Debugging a test failure

```
Action 1: Read test file
Action 2: Read implementation
Action 3: Add console.log to debug
Action 4: Run test with logging
Action 5: Read dependency code
Action 6: Check test data
Action 7: Try different test data
Action 8: Read framework docs
Action 9: Check other similar tests
Action 10: Try another approach

STOP. I've taken 10 actions without resolving this.

Findings:
- Test expects user.name to equal "John"
- Implementation returns "John Smith"
- Test is checking exact equality
- Test fixture has name="John" but API returns full name

Theories:
1. Test fixture is wrong (should be "John Smith")
2. Implementation is wrong (should return firstName only)
3. Test assertion is wrong (should check .startsWith())

I don't know which is correct. This requires context about
business requirements I don't have.

Q: Which is the intended behavior?
- Users should have full name stored?
- Tests should check partial match?
- Implementation should split firstName?
```

### Example 4: "I Don't Know" is Valid

**Bad (confabulation):**
```
Q: Why did the build fail?
Agent: It's probably a TypeScript configuration issue. Maybe the
tsconfig.json needs to be updated. Or possibly the types are wrong.
Could also be a webpack problem. I think it might be...

[confident bullshit continues]
```

**Good (honest uncertainty):**
```
Q: Why did the build fail?

I don't know yet.

What I observed:
- Build error: "Cannot find module './utils'"
- File exists at src/utils/index.ts
- Import statement: import { helper } from './utils'

Ruled out:
- File doesn't exist (it does)
- Typo in path (path is correct)

Hypotheses to test:
1. Missing file extension in import
2. Module resolution issue in tsconfig
3. Circular dependency

Want to test #1 first (most likely): add .ts extension to import.
Proceed?
```

---

## Common Patterns

### Pattern 1: Checkpoint Every 3 Actions

**Bad:**
```
Action 1: Edit file A
Action 2: Edit file B
Action 3: Edit file C
Action 4: Edit file D
Action 5: Edit file E
[hopes it all works]
```

**Good:**
```
Action 1: Edit file A
Action 2: Edit file B
Action 3: Edit file C

CHECKPOINT: Run tests
EXPECT: All tests pass
RESULT: ✓ Tests pass
MATCHES: Yes

Action 4: Edit file D
Action 5: Edit file E
Action 6: Edit file F

CHECKPOINT: Run tests
EXPECT: All tests still pass
RESULT: 2 tests fail in file F changes
MATCHES: No

STOP. Something in file F broke tests.
[investigates specifically file F changes]
```

### Pattern 2: Context Decay (~10 actions)

```
[10 actions into a task]

Let me check: What's the original goal?

Original: Add email validation to signup form
Currently doing: Refactoring entire auth system

STOP. I've lost the thread. I got sidetracked into a refactor
when the goal was just adding validation.

Reverting refactor changes. Back to simple email validation.
```

### Pattern 3: Evidence Standards

**Bad:**
```
Q: Does this work for all users?
Agent: Yes, I tested it and it works for everyone.
[tested once]
```

**Good:**
```
Q: Does this work for all users?

Tested:
- User with email: ✓ works
- User without email: ✓ works
- User with invalid email: ✓ shows error

Did not test:
- Users with multiple emails
- Users with non-ASCII characters in email
- Edge cases: very long emails, special characters

Evidence: Works for 3 scenarios tested. Cannot claim "all users"
without exhaustive testing.
```

### Pattern 4: Chesterton's Fence

**Bad:**
```
Q: This function looks unused, can you delete it?
Agent: Sure! [deletes it]
[production breaks]
```

**Good:**
```
Q: This function looks unused, can you delete it?

Let me verify before deleting.

DOING: Search for references to getUserToken()
EXPECT: Zero references if truly unused

[searches codebase]

RESULT: Found 3 references:
- auth-middleware.ts:45
- api-client.ts:22
- Used dynamically in eval() at runtime.ts:156

MATCHES: No (not unused)

This function IS used. Deleting would break:
- Authentication middleware
- API client
- Dynamic runtime code

Recommend: Keep it. It's not unused.
```

---

## Integration Guide

### For System Prompts

**Minimal (token-efficient):**
```
Follow CLAUDE.MD protocol (v2.0):

Before risky actions:
DOING: [action]
EXPECT: [falsifiable prediction]

After: RESULT/MATCHES. If no match: STOP, theorize, propose, wait.

Key rules:
- Predictions must be falsifiable
- On failure: Stop → Words → Wait
- "I don't know" beats confabulation
- Checkpoint every 3 actions
- Timebox: 10 actions = stop and report

Full: [repo]/CLAUDE.MD
```

**Detailed:**
```
# Epistemic Discipline Protocol (CLAUDE.MD v2.0)

Core principle: Reality doesn't care about your model. When they
diverge, your model is wrong.

## Before Actions
Make beliefs explicit:
DOING: [specific action]
EXPECT: [falsifiable prediction - must be provably wrong]

## After Actions
RESULT: [what happened]
MATCHES: [yes/no]
→ If no: STOP immediately

## On Failure
1. STOP (no more tool calls)
2. STATE: What failed, raw error
3. THEORIZE: Why it failed
4. PROPOSE: What to try, with prediction
5. WAIT: For confirmation

## Key Behaviors
- Falsifiable predictions ("returns JSON with user_id" not "does something")
- Checkpoint every 3 actions (run/verify)
- Timebox investigations (10 actions = report to Q)
- "I don't know" is valid (better than confabulation)
- Context check every ~10 actions (can you state the goal?)
- Evidence: 1 = anecdote, 3 = pattern, "always" = needs proof

## Risk Levels
- Trivial (ls, cat): No ceremony
- Low (install dep): Brief prediction
- Medium (edit code): Full DOING/EXPECT/RESULT
- High (delete, schema): Full protocol + Q confirmation
- Irreversible (migrations, APIs): STOP, verify with Q

When uncertain about risk: treat as one level higher.

Full protocol: [repo]/CLAUDE.MD
```

---

## Troubleshooting

### Problem: Agent skips predictions

**Symptom:** Agent just does things without stating expectations

**Fix:**
```
"Before you execute that, what do you EXPECT will happen?
Be specific and falsifiable."
```

### Problem: Predictions are theater

**Symptom:** "Expect: it will work or fail"

**Fix:**
```
"That prediction matches any outcome, so it's not a prediction.
What specifically do you expect?
- What output?
- What error?
- What file changes?
Be concrete."
```

### Problem: Agent doesn't stop on failure

**Symptom:** Keeps trying fixes without asking

**Fix:**
```
"STOP. Per CLAUDE.MD Section 2: On failure, you must:
1. Stop
2. State what failed
3. Theorize why
4. Propose fix with prediction
5. Wait for my OK

Do that now."
```

### Problem: Agent confabulates instead of admitting uncertainty

**Symptom:** "It's probably X, maybe Y, could be Z..."

**Fix:**
```
"Do you KNOW or are you GUESSING?

Per CLAUDE.MD: 'I don't know' is valid. If you lack evidence,
say so explicitly. What have you ruled out? What's your actual
evidence (not theory)?"
```

### Problem: Agent doesn't checkpoint

**Symptom:** Makes 10 changes then tries to run everything

**Fix:**
```
"Per CLAUDE.MD Checkpoint Discipline: batch size is 3 actions,
then verify.

You just made 10 changes. Revert to last known good state,
then apply changes in batches of 3 with verification between."
```

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════╗
║       CLAUDE.MD v2.0 QUICK REFERENCE                     ║
╠══════════════════════════════════════════════════════════╣
║ BEFORE ACTION (medium+ risk)                             ║
║  DOING: [specific action]                                ║
║  EXPECT: [falsifiable prediction]                        ║
╠══════════════════════════════════════════════════════════╣
║ AFTER ACTION                                             ║
║  RESULT: [what happened]                                 ║
║  MATCHES: [yes/no]                                       ║
║  → If no: STOP immediately                               ║
╠══════════════════════════════════════════════════════════╣
║ ON FAILURE (anything unexpected)                         ║
║  1. STOP (no more tool calls)                            ║
║  2. STATE: What failed (raw error)                       ║
║  3. THEORIZE: Why it failed                              ║
║  4. PROPOSE: What to try (with prediction)               ║
║  5. WAIT: For Q confirmation                             ║
╠══════════════════════════════════════════════════════════╣
║ CHECKPOINTS                                              ║
║  □ Every 3 actions: verify against reality               ║
║  □ Every 10 actions: state original goal                 ║
║  □ Checkpoint = run something observable                 ║
╠══════════════════════════════════════════════════════════╣
║ INVESTIGATIONS                                           ║
║  Initial: 2-3 actions → form hypothesis                  ║
║  Shallow: 5-7 actions → test or pivot                    ║
║  Deep: 10+ actions → STOP, report to Q                   ║
╠══════════════════════════════════════════════════════════╣
║ UNCERTAINTY                                              ║
║  "I believe X" = unverified theory                       ║
║  "I verified X" = tested, observed                       ║
║  "I don't know" = valid, honest                          ║
╠══════════════════════════════════════════════════════════╣
║ FIX-FORWARD TRAP                                         ║
║  3+ fixes for same issue = STOP                          ║
║  Propose: Revert to known good, try different approach   ║
╠══════════════════════════════════════════════════════════╣
║ ROOT CAUSE                                               ║
║  Immediate: What failed                                  ║
║  Systemic: Why system allowed it                         ║
║  Root: Why designed to permit it                         ║
╚══════════════════════════════════════════════════════════╝
```

---

**Version:** 2.0
**Last Updated:** 2025-12-03
**Related:** `/CLAUDE.MD` (core protocol)
