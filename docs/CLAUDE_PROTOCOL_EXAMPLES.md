# CLAUDE.MD Protocol v2.0 - Real Code Examples

**Epistemic discipline in practice**

This document shows the prediction-driven protocol applied to real development scenarios.

---

## Table of Contents

1. [Bug Fixes with Predictions](#bug-fixes-with-predictions)
2. [Feature Development](#feature-development)
3. [Investigation & Debugging](#investigation--debugging)
4. [Handling Uncertainty](#handling-uncertainty)
5. [The Fix-Forward Trap](#the-fix-forward-trap)
6. [Checkpoint Discipline](#checkpoint-discipline)

---

## Bug Fixes with Predictions

### Example 1: TypeError - Null Reference

**Task:** "App crashes on user profile page"

#### Without Protocol (Guessing)

```
Agent: I'll fix the crash.

[edits UserProfile.tsx without reading error]
[adds random null checks]
[doesn't test]

Agent: Fixed! The crash should be gone now.
[User reports it still crashes]
```

#### With Protocol (Reality-Testing)

```
Agent: Let me start by reading the actual error.

DOING: Check browser console / error logs
EXPECT: Stack trace showing which line crashes

[reads logs]

RESULT:
Error: Cannot read property 'avatar' of undefined
at UserProfile.tsx:67

MATCHES: Yes (found the error)

---

Reading UserProfile.tsx:67...

[reads file]

Line 67: return <Avatar src={user.profile.avatar} />

Theory: user.profile is undefined for some users.

DOING: Search codebase for how user.profile is populated
EXPECT: Find where profile is created, might be optional

[searches]

RESULT: user.profile can be null for new users (docs/API.md confirms)
MATCHES: My theory was correct

---

DOING: Add null check with fallback avatar
EXPECT: Component renders without crash, shows default avatar when profile is null

Code change:
```typescript
-return <Avatar src={user.profile.avatar} />
+return <Avatar src={user.profile?.avatar ?? '/default-avatar.png'} />
```

[applies change]

---

DOING: Run app with user who has no profile
EXPECT: No crash, default avatar displays

[tests with test account]

RESULT: ✓ No crash, shows default avatar
MATCHES: Yes

Committing fix.
```

**Key differences:**
- ✅ Read error first (not guessing)
- ✅ Made prediction about cause
- ✅ Verified theory before fixing
- ✅ Tested fix against specific expectation
- ✅ Reality confirmed model at each step

---

### Example 2: Performance Issue

**Task:** "Dashboard is slow to load"

#### Without Protocol

```
Agent: I'll optimize it.

[adds React.memo everywhere]
[adds useMemo to all functions]
[adds useCallback to all callbacks]

Agent: Optimized! Should be faster now.
[User reports it's still slow]
```

#### With Protocol

```
Agent: Before optimizing, I need to know what's actually slow.

DOING: Profile Dashboard component with React DevTools
EXPECT: Profiler shows which component/operation takes most time

[profiles]

RESULT:
- Initial render: 4200ms
- ClientList component: 4000ms (95% of time)
- Rendering 500 ClientCard components
- Each ClientCard: ~8ms

MATCHES: Yes (found bottleneck)

---

Theory: Rendering 500 cards without virtualization is the issue.

DOING: Check if all 500 cards are visible at once
EXPECT: Only ~10 cards fit in viewport

[checks UI]

RESULT: Viewport shows 8 cards, other 492 are off-screen but still rendered
MATCHES: Yes

---

DOING: Add react-window virtualization to ClientList
EXPECT: Only visible cards render, load time < 500ms

Code change:
```typescript
import { FixedSizeList } from 'react-window';

-{clients.map(client => <ClientCard key={client.id} client={client} />)}
+<FixedSizeList
+  height={600}
+  itemCount={clients.length}
+  itemSize={80}
+>
+  {({ index, style }) => (
+    <div style={style}>
+      <ClientCard client={clients[index]} />
+    </div>
+  )}
+</FixedSizeList>
```

[applies change]

---

DOING: Re-profile Dashboard with 500 clients
EXPECT: Load time < 500ms, smooth scrolling

[profiles again]

RESULT:
- Initial render: 320ms
- Smooth scrolling
- Only renders visible cards + buffer

MATCHES: Yes (13x faster)

Committing optimization.
```

**Key differences:**
- ✅ Measured before optimizing
- ✅ Found root cause (not guessing)
- ✅ Predictions were specific and measurable
- ✅ Verified improvement with actual metrics

---

## Feature Development

### Example 3: Adding Search (Scope Management)

**Task:** "Add search to clients list"

#### Without Protocol

```
[Creates 8 new files]
[Builds entire search framework]
[Hours later, massive PR]
[Never asked about scope]
```

#### With Protocol

```
Agent: Let me scope this feature first.

Possible approaches:

1. Client-side filter (minimal)
   - Add input field
   - Filter existing array
   - 1 file modified

2. Server-side search (moderate)
   - New API endpoint
   - Search UI component
   - ~3 files modified

3. Full-featured search (extensive)
   - Debounced search
   - Filter by multiple fields
   - Highlight matches
   - Search history
   - ~5+ files

Per CLAUDE.MD Risk-Tiered Ceremony:
- Option 1: Low risk, go ahead
- Option 2: Medium risk (at 3-file boundary)
- Option 3: High risk, need Q's confirmation

DOING: Start with Option 1 (progressive disclosure)
EXPECT: Simple search works, we can enhance if needed

Code change (ClientsList.tsx):
```typescript
+const [searchQuery, setSearchQuery] = useState('');
+
+const filteredClients = clients.filter(client =>
+  client.name.toLowerCase().includes(searchQuery.toLowerCase())
+);

 return (
   <div>
+    <input
+      value={searchQuery}
+      onChange={(e) => setSearchQuery(e.target.value)}
+      placeholder="Search clients..."
+    />
-    {clients.map(client => ...)}
+    {filteredClients.map(client => ...)}
   </div>
 );
```

[applies change]

---

DOING: Test search with various queries
EXPECT: Instant filtering, case-insensitive, handles empty results

[tests]

RESULT:
✓ "john" finds John Smith
✓ "SMITH" finds John Smith (case-insensitive)
✓ "xyz" shows "No clients found"
✓ Clear input shows all clients

MATCHES: Yes

Committing minimal search implementation.

Note: If you need server-side search or advanced features, we
can enhance incrementally (progressive disclosure).
```

**Key principles:**
- ✅ Scoped options by complexity
- ✅ Started with simplest approach
- ✅ Tested against specific expectations
- ✅ Noted path for future enhancement
- ✅ Didn't build features not requested

---

## Investigation & Debugging

### Example 4: Timebox Investigation

**Task:** "Tests failing after merge"

#### Without Protocol

```
[30 actions of random debugging]
[Tries everything]
[Never reports findings]
[Eventually gives up]
```

#### With Protocol

```
Agent: Investigating test failures.

Action 1: Read test output
RESULT: 3 tests failing in auth.test.ts

Action 2: Read failing tests
RESULT: All testing login functionality

Action 3: Run tests locally
RESULT: Same failures

--- Checkpoint (3 actions) ---

Hypothesis: Login broke in recent merge.

Action 4: Check recent commits
Action 5: See auth.ts was modified
Action 6: Read auth.ts changes

--- Checkpoint (6 actions) ---

Theory: validateToken function signature changed.

Action 7: Compare old vs new signature
Action 8: Check if tests use old signature
Action 9: Confirm tests use old API

--- Checkpoint (9 actions) ---

Action 10: Check if there's a migration guide

STOP. I've taken 10 actions. Time to report.

Findings:
- Merge changed validateToken(token) → validateToken(token, options)
- Tests still use old single-argument form
- Migration guide exists in PR description (missed in merge)

Theory: Tests need updating to new API.

Evidence:
- Tested: auth.test.ts uses old API (verified)
- Tested: auth.ts now requires second argument (verified)
- Did not test: Whether options parameter is optional

Recommend: Either:
1. Make options parameter optional (backwards compatible)
2. Update all test calls to new API

Which approach do you prefer?
```

**Key behaviors:**
- ✅ Checkpointed every 3 actions
- ✅ Stopped at 10 actions to report
- ✅ Listed findings clearly
- ✅ Separated evidence from theory
- ✅ Asked Q for direction

---

### Example 5: "I Don't Know" is Valid

**Task:** "Why is the build failing in CI but not locally?"

#### Without Protocol (Confabulation)

```
Agent: It's probably a Node version mismatch. Or maybe it's a cache
issue. Could be environment variables. Possibly the CI runner is
out of date. Maybe the package-lock.json is stale. It might be...

[Makes up 10 theories without evidence]
```

#### With Protocol (Honest Uncertainty)

```
Agent: Let me gather facts first.

DOING: Read CI logs
EXPECT: Build error message

RESULT: "Module not found: 'aws-sdk'"
MATCHES: Yes

---

DOING: Check if aws-sdk is in package.json
EXPECT: Should be listed as dependency

RESULT: Not in dependencies or devDependencies
MATCHES: No (unexpected - why does it work locally?)

---

DOING: Check if aws-sdk is installed locally
EXPECT: Should be in node_modules

RESULT: It exists in node_modules/
MATCHES: Yes (but how?)

---

DOING: Check package-lock.json for aws-sdk
EXPECT: Might be a transitive dependency

RESULT: Not in lock file either
MATCHES: Weird

---

I don't know why this is working locally.

What I verified:
✓ aws-sdk is not in package.json
✓ aws-sdk is not in package-lock.json
✓ Build fails in CI (clean install)
✓ Build works locally (existing node_modules)

Ruled out:
✗ Node version (both use 18.x)
✗ Package manager (both use npm)

Hypotheses:
1. aws-sdk was manually installed (npm install without --save)
2. aws-sdk came from a since-removed dependency
3. Global install interfering locally

Want to test #1: Check npm history / .bash_history for manual install.
Proceed?
```

**Key behaviors:**
- ✅ Admitted not knowing
- ✅ Listed verified facts
- ✅ Separated observation from theory
- ✅ Proposed specific hypothesis to test
- ✅ No confident guessing

---

## The Fix-Forward Trap

### Example 6: Recognizing Sunk Cost

**Task:** "Add email validation to signup form"

#### Without Protocol (Digging Deeper)

```
Attempt 1: Add regex validation
RESULT: Doesn't work for some valid emails

Attempt 2: Try different regex
RESULT: Now blocks valid emails

Attempt 3: Use validator library
RESULT: Validation works but form doesn't submit

Attempt 4: Debug form submission
RESULT: Different error now

Attempt 5: Fix that error
RESULT: New error appears

Attempt 6: Maybe I need to refactor the form component?
[Starts major refactor]

Attempt 10: [Completely lost, code is a mess]
```

#### With Protocol (Stopping the Bleed)

```
Attempt 1: Add regex validation

DOING: Add email regex to validate()
EXPECT: Blocks invalid emails, allows valid ones

RESULT: Blocks "user+tag@example.com" (valid)
MATCHES: No

---

Attempt 2: Fix regex to allow + symbol

DOING: Update regex to allow +
EXPECT: Accepts user+tag@example.com

RESULT: Now accepts "invalid@" (not valid)
MATCHES: No

---

Attempt 3: Try comprehensive email regex

DOING: Use RFC 5322 regex
EXPECT: Correctly validates all email formats

RESULT: Validation correct, but form won't submit
MATCHES: No (new problem)

---

STOP. I'm three attempts deep and each fix creates new issues.

Pattern recognition: I'm in the fix-forward trap.

What happened:
- Attempt 1: Regex too restrictive
- Attempt 2: Regex too permissive
- Attempt 3: Regex correct, but broke form submission
- Each fix reveals I don't understand the whole system

Root cause: I didn't understand form validation flow before starting.

Recommend: Revert all changes, study form validation architecture,
then implement properly.

Should I revert to commit [abc123] (before any attempts) and
restart with proper investigation?
```

**Key recognition:**
- ✅ Noticed pattern of escalating failures
- ✅ Stopped at 3 attempts (protocol threshold)
- ✅ Admitted not understanding system
- ✅ Proposed reset instead of continuing
- ✅ Recognized sunk cost trap

---

## Checkpoint Discipline

### Example 7: Batch Work with Verification

**Task:** "Add dark mode to application"

#### Without Protocol

```
[Edits 10 files]
[Changes CSS variables]
[Updates components]
[Modifies theme system]
[Finally runs app]
[Everything broken, no idea which change caused it]
```

#### With Protocol

```
Agent: This will touch multiple files. Checkpointing every 3 actions.

Action 1: Add theme context
Action 2: Add theme provider to App.tsx
Action 3: Add toggle button

CHECKPOINT: Test theme toggle
DOING: Run app and test toggle
EXPECT: Button appears, click toggles between light/dark

RESULT: ✓ Button appears, toggles state
MATCHES: Yes

---

Action 4: Add dark mode CSS variables
Action 5: Update Button component to use theme
Action 6: Update Card component to use theme

CHECKPOINT: Test themed components
DOING: Toggle dark mode, observe components
EXPECT: Button and Card change colors

RESULT: Button changes, Card doesn't
MATCHES: No

STOP. Card component not responding to theme.

Theory: Card still uses hardcoded colors.

DOING: Check Card.tsx implementation
EXPECT: Find hardcoded color values

RESULT: Line 34: backgroundColor: '#ffffff' (hardcoded)
MATCHES: Yes

Fix: Replace with theme variable.

Action 7: Update Card to use theme.background

CHECKPOINT: Retest themed components
DOING: Toggle dark mode
EXPECT: Both Button and Card change colors

RESULT: ✓ Both components respond to theme
MATCHES: Yes

---

Action 8: Update Input component
Action 9: Update Modal component
Action 10: Update Header component

CHECKPOINT: Test all themed components
DOING: Toggle dark mode, verify all components
EXPECT: All 5 components respond to theme

RESULT: ✓ All components change colors correctly
MATCHES: Yes

Committing dark mode feature.
```

**Key behaviors:**
- ✅ Checkpoint every 3 actions
- ✅ Caught Card issue early (before more changes)
- ✅ Fixed immediately instead of accumulating issues
- ✅ Verified incrementally
- ✅ Knew exactly what worked at each step

---

## Root Cause Analysis

### Example 8: Beyond Symptoms

**Task:** "Users getting logged out randomly"

#### Symptom-Level Fix (Immediate Cause Only)

```
Agent: Session timeout is 30 minutes. I'll increase it to 60 minutes.

DOING: Change SESSION_TIMEOUT from 30 to 60
EXPECT: Users won't get logged out

[Changes constant]

"Fixed!"

[Issue returns - users still logged out randomly]
```

#### Root Cause Fix (Systemic)

```
Agent: Before fixing, let me understand the full failure.

DOING: Check logs for logout events
EXPECT: Pattern showing when logouts happen

RESULT:
- Logouts happen during activity (not after idle time)
- Pattern: Logouts occur every ~31 minutes regardless of activity
- All users affected

MATCHES: Timeout is involved, but activity doesn't reset it

---

Immediate cause: Session expires at 30 minutes
Symptom: Users logged out while active

But why doesn't activity reset the timer?

DOING: Read session refresh logic
EXPECT: Find code that refreshes session on activity

RESULT:
Line 45: refreshSession() function exists
Line 67: Called on page navigation
NOT called on: clicks, typing, scrolling

MATCHES: Found the systemic issue

---

Systemic cause: Activity doesn't refresh session timer.

But why was it designed this way?

DOING: Check git history for refreshSession
EXPECT: Original implementation might show intent

RESULT:
Commit abc123: "Add refreshSession on navigation"
Comment: "Refresh session when user changes pages to prevent
logout during multi-page workflows"

Root cause: Original design assumed navigation = activity,
didn't account for single-page app behavior.

---

Three-level fix:

1. Immediate: Increase timeout to 60 min (band-aid)
2. Systemic: Refresh session on any interaction (real fix)
3. Root: Add activity heartbeat system (prevent recurrence)

Implementing level 2 (systemic) + level 3 (root):

```typescript
// Add activity listener
useEffect(() => {
  const handleActivity = () => refreshSession();

  window.addEventListener('click', handleActivity);
  window.addEventListener('keypress', handleActivity);
  window.addEventListener('scroll', handleActivity);

  return () => {
    window.removeEventListener('click', handleActivity);
    window.removeEventListener('keypress', handleActivity);
    window.removeEventListener('scroll', handleActivity);
  };
}, []);
```

DOING: Test with 30-min timeout, continuous activity
EXPECT: Session stays active during usage

RESULT: ✓ No logouts during 60-min active session
MATCHES: Yes

Root cause addressed. System now properly detects activity.
```

**Layers analyzed:**
- ✅ Immediate: Session expires
- ✅ Systemic: Activity doesn't refresh
- ✅ Root: Design didn't account for SPA behavior
- ✅ Fix prevents recurrence, not just symptoms

---

## Key Patterns Summary

### Pattern: DOING/EXPECT/RESULT

```
DOING: [specific, concrete action]
EXPECT: [falsifiable, specific prediction]

[execute]

RESULT: [actual outcome]
MATCHES: [yes/no]
→ If no: STOP
```

### Pattern: Stop → Words → Wait

```
[Action fails]

STOP. [Don't continue]

What failed: [raw error]
Theory: [why it failed]
Ruled out: [what you checked]
Propose: [what to try next]

Proceed?
```

### Pattern: Honest Uncertainty

```
I don't know [yet].

What I verified: [facts]
Ruled out: [disproven theories]
Hypotheses: [untested theories]

Want to test: [specific next step]
```

### Pattern: Checkpoint Rhythm

```
Action 1-3: [work]
CHECKPOINT: [verify against reality]

Action 4-6: [work]
CHECKPOINT: [verify against reality]

[Repeat]
```

### Pattern: Timebox

```
Actions 1-9: [investigation]

Action 10: STOP

I've spent 10 actions on this.
Findings: [what I learned]
Theories: [remaining unknowns]
Recommend: [path forward]

Should I continue or try different approach?
```

---

**Version:** 2.0
**Last Updated:** 2025-12-03
**Related:** `/CLAUDE.MD` (core protocol), `/docs/CLAUDE_PROTOCOL_USAGE.md` (usage guide)
