# CLAUDE.MD Protocol - Code Examples

**Real-world scenarios showing protocol in action**

This document provides concrete code examples of the CLAUDE.MD protocol applied to real development tasks.

---

## Table of Contents

1. [Bug Fixes](#bug-fixes)
2. [Feature Development](#feature-development)
3. [Refactoring](#refactoring)
4. [Security Changes](#security-changes)
5. [Emergency Fixes](#emergency-fixes)
6. [Architecture Decisions](#architecture-decisions)

---

## Bug Fixes

### Example 1: Null Pointer Exception

**Task:** "Fix the crash when user profile has no avatar"

#### ❌ Without Protocol

```typescript
// Agent makes changes without reading the file first
// Guesses at the implementation

// UserProfile.tsx
function UserAvatar({ user }) {
  // Agent assumes the structure and adds a check
  const avatarUrl = user.profile.avatar || '/default-avatar.png';

  return <img src={avatarUrl} alt={user.name} />;
}

// Result: Still crashes!
// Reason: Didn't verify that `user.profile` exists
// Didn't run the code to test
```

#### ✅ With Protocol

```
Agent: "Following CLAUDE.MD Section I, I'll read UserProfile.tsx first."

[reads file]

Agent: "I found the issue at line 23. The code assumes user.profile exists:
  const avatarUrl = user.profile.avatar || '/default-avatar.png';

However, user.profile can be null for new accounts.

Fix (Section III - simplicity bias, one file change):
```
```typescript
// UserProfile.tsx - Line 23
- const avatarUrl = user.profile.avatar || '/default-avatar.png';
+ const avatarUrl = user.profile?.avatar || '/default-avatar.png';
```
```

Agent: "Verifying the fix works (Section I.6):"

[runs component with test data]

Agent: "✓ Component renders with avatar
✓ Component renders with null profile
✓ No console errors

Committing (Section I.8):"

[commits with message: "fix: handle null user profile in UserAvatar"]
```

**What the protocol prevented:**
- Hallucinating code structure
- Incomplete fix (missing other null checks)
- Not verifying the fix actually works

---

### Example 2: Performance Issue

**Task:** "The client list page is slow, optimize it"

#### ❌ Without Protocol

```typescript
// Agent immediately starts "optimizing" without understanding the problem

// ClientsList.tsx
- const clients = useQuery('clients', fetchClients);
+ const clients = useQuery('clients', fetchClients, {
+   staleTime: Infinity,
+   cacheTime: Infinity,
+ });

// Result: Data never refreshes, shows stale information
// Agent also refactored the entire component (scope creep)
// Added React.memo, useMemo, useCallback everywhere (over-engineering)
```

#### ✅ With Protocol

```
Agent: "Before optimizing, I need to understand the actual problem (Section IV - uncertainty).

**I'm uncertain (<80% confidence) about:**
- What's actually slow? (initial load, scrolling, search?)
- How slow is it? (1s vs 10s makes different solutions appropriate)
- What's the data size? (100 clients vs 10,000 clients)

**How to verify (Section IV):**
1. Profile the page with React DevTools
2. Check network tab for API call timing
3. Measure render time with different data sizes

Should I proceed with profiling first, or do you have specific
performance metrics I should target?"

---

User: "It takes 5 seconds to load, there are 500 clients"

Agent: "Thanks! Let me read the code and profile it (Section I.1):"

[reads ClientsList.tsx]
[profiles with DevTools]

Agent: "Found the issue:
- API call: 200ms (not the problem)
- Rendering 500 ClientCard components: 4800ms (the problem)
- Each ClientCard has an expensive avatar image processing

**Solution (Section V - progressive disclosure, simplest approach first):**
Only render visible clients using virtualization.

This requires adding react-window library and modifying ClientsList.tsx.

That's 1 file + 1 dependency (Section III).

Proceeding:
```
```typescript
// ClientsList.tsx
import { FixedSizeList } from 'react-window';

- return (
-   <div>
-     {clients.map(client => <ClientCard key={client.id} client={client} />)}
-   </div>
- );
+ return (
+   <FixedSizeList
+     height={600}
+     itemCount={clients.length}
+     itemSize={80}
+     width="100%"
+   >
+     {({ index, style }) => (
+       <div style={style}>
+         <ClientCard client={clients[index]} />
+       </div>
+     )}
+   </FixedSizeList>
+ );
```
```

Agent: "Verifying (Section I.6):"

[runs page with 500 clients]

Agent: "✓ Page loads in 300ms (was 5000ms)
✓ Smooth scrolling
✓ All clients accessible

Committing (Section I.8)."
```

**What the protocol prevented:**
- Premature optimization without diagnosis
- Over-engineering (memo-ing everything)
- Guessing at the solution
- Not measuring actual improvement

---

## Feature Development

### Example 3: Adding Search Functionality

**Task:** "Add search to the clients list"

#### ❌ Without Protocol

```typescript
// Agent immediately creates multiple new files and abstractions

// NEW FILE: src/components/SearchBar.tsx (200 lines)
// NEW FILE: src/hooks/useSearch.ts (150 lines)
// NEW FILE: src/hooks/useDebounce.ts (50 lines)
// NEW FILE: src/utils/searchFilters.ts (300 lines)
// NEW FILE: src/types/search.ts (100 lines)
// MODIFIED: ClientsList.tsx (refactored to use new architecture)
// MODIFIED: ClientCard.tsx (added highlight matching)
// MODIFIED: api/clients.ts (new search endpoint)

// Result: 5 new files, 3 modified files (8 total)
// Didn't ask (Section II: >3 files is hard stop)
// Massive scope creep for "add search"
```

#### ✅ With Protocol

```
Agent: "Let me plan this feature before starting (Section X - scope management):

**Minimal viable search (Option A):**
- Add <input> to ClientsList.tsx
- Filter existing client array on client-side
- 1 file change

**Backend search with new UI (Option B):**
- New SearchBar component
- New API endpoint
- Update ClientsList to integrate
- 3 files (at the Section II threshold)

**Full-featured search (Option C):**
- New SearchBar with filters (name, status, program)
- Backend search endpoint
- Debounced search
- Highlight matching results
- 5+ files (Section II hard stop - need approval)

Section V (progressive disclosure) says: start simple, only complexify if needed.

Proceeding with Option A (simplest approach):
```
```typescript
// ClientsList.tsx
function ClientsList() {
  const { data: clients } = useClients();
+ const [searchQuery, setSearchQuery] = useState('');
+
+ const filteredClients = clients?.filter(client =>
+   client.name.toLowerCase().includes(searchQuery.toLowerCase())
+ ) ?? [];

  return (
    <div>
+     <input
+       type="text"
+       placeholder="Search clients..."
+       value={searchQuery}
+       onChange={(e) => setSearchQuery(e.target.value)}
+       className="mb-4 px-4 py-2 border rounded"
+     />
-     {clients?.map(client => ...)}
+     {filteredClients.map(client => ...)}
    </div>
  );
}
```
```

Agent: "Verifying (Section I.6):"

[runs the page]

Agent: "✓ Search filters clients instantly
✓ Case-insensitive matching works
✓ No clients = shows empty state

This solves the requirement with 1 file change (Section III).

If you need more advanced features (backend search, filters, debounce),
we can add them incrementally (Section V)."
```

**What the protocol prevented:**
- Massive over-engineering for simple requirement
- Creating unnecessary abstractions on first use (Section I.5: inline until 3rd use)
- Scope creep without approval (Section II: >3 files)

---

### Example 4: Scope Expansion (Hard Stop Triggered)

**Task:** "Add export to CSV button for clients"

#### ❌ Without Protocol

```typescript
// Agent silently expands scope

// Created entire export architecture:
// - src/services/ExportService.ts (generic export framework)
// - src/components/ExportButton.tsx (reusable export component)
// - src/components/ExportModal.tsx (export options UI)
// - src/utils/csvFormatter.ts (CSV utilities)
// - src/utils/excelFormatter.ts (also added Excel, why not?)
// - src/utils/pdfFormatter.ts (and PDF!)
// - Modified: ClientsList.tsx, ClientsToolbar.tsx, etc.

// Result: 9+ files changed, massive scope creep
// No hard stop triggered (should have asked at 3 files)
```

#### ✅ With Protocol

```
Agent: "Planning the implementation (Section X):

**Minimal approach:**
- Add button to ClientsList.tsx
- Inline CSV generation function
- Download using blob URL
- 1 file change

**Reusable approach:**
- Create ExportButton component
- Create csvExport utility
- Modify ClientsList to use it
- 3 files (Section II threshold)

Going with minimal approach first (Section V - progressive disclosure):
```
```typescript
// ClientsList.tsx
function ClientsList() {
  const { data: clients } = useClients();

+ const exportToCsv = () => {
+   const csv = [
+     ['Name', 'Email', 'Status'],
+     ...clients.map(c => [c.name, c.email, c.status])
+   ].map(row => row.join(',')).join('\n');
+
+   const blob = new Blob([csv], { type: 'text/csv' });
+   const url = URL.createObjectURL(blob);
+   const a = document.createElement('a');
+   a.href = url;
+   a.download = 'clients.csv';
+   a.click();
+ };

  return (
    <div>
+     <button onClick={exportToCsv}>Export to CSV</button>
      {/* ... rest of component */}
    </div>
  );
}
```
```

Agent: "Verifying (Section I.6):"

[clicks export button]

Agent: "✓ CSV file downloads
✓ Contains all clients
✓ Proper formatting

This solves the requirement with 1 file change (Section III - bias toward simplicity).

Note: The CSV function is inline. If we need to export from other pages,
we can extract it on the 3rd use (Section I.5)."

---

User: "Can you also add Excel and PDF export?"

Agent: "That would require:
- ExcelJS library for Excel export
- jsPDF library for PDF export
- Modified export button to show format selector
- Likely extracting to shared utilities

This expands to 4+ files (Section II hard stop - need approval).

Options:
A) Add only CSV for now (already done)
B) Add all formats (needs approval, 4-5 files)
C) Add Excel next, PDF later (incremental)

Which approach would you prefer?"
```

**What the protocol prevented:**
- Silent scope expansion
- Over-engineering on first implementation
- Creating "generic framework" for single use case
- Not asking when crossing 3-file threshold

---

## Refactoring

### Example 5: Improving Code Quality

**Task:** "Clean up the messy authentication code"

#### ❌ Without Protocol

```typescript
// Agent starts massive refactor without understanding requirements

// Touched 15+ files:
// - Renamed all auth functions (breaking changes!)
// - Extracted 5 new utility files
// - Changed authentication flow architecture
// - Updated all components using auth
// - Modified API endpoints
// - Changed database queries

// Result:
// - Tests failing
// - Build broken
// - Lost track of what was changed
// - Can't easily revert
// - Broke production (changed API contracts without asking)
```

#### ✅ With Protocol

```
Agent: "Before refactoring, I need to understand what 'messy' means (Section IV - uncertainty).

**I'm uncertain about:**
- What specific problems exist? (bugs, performance, readability?)
- What's the desired end state?
- Are there tests I need to maintain compatibility with?
- Is this code actively being modified by others?

Let me read the current auth code first (Section I.1):"

[reads auth files]

Agent: "I found several issues:
1. AuthContext.tsx has 500 lines (too large)
2. Duplicate token validation in 3 places
3. No error handling for failed logins
4. Session timeout logic is unclear

**Proposed approach (Section V - progressive disclosure):**

**Phase 1 (Low risk):** Extract duplicate token validation
- Create validateToken() in src/lib/auth.ts
- Replace 3 duplicates with function call
- 4 files touched (Section II hard stop)

Should I proceed with Phase 1, or do you want a different approach?"

---

User: "Yes, start with Phase 1"

Agent: "Proceeding with token validation extraction.

Creating src/lib/auth.ts (new file):
```
```typescript
// src/lib/auth.ts
export function validateToken(token: string): boolean {
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
```
```

Replacing duplicates in:
1. AuthContext.tsx
2. api/middleware.ts
3. pages/Login.tsx

```typescript
// AuthContext.tsx (before)
- const isValid = (() => {
-   if (!token) return false;
-   try {
-     const payload = JSON.parse(atob(token.split('.')[1]));
-     return payload.exp * 1000 > Date.now();
-   } catch {
-     return false;
-   }
- })();

// AuthContext.tsx (after)
+ const isValid = validateToken(token);
```

[similar changes in other 2 files]

Agent: "Verifying (Section I.6):"

[runs auth flow]

Agent: "✓ Login works
✓ Token validation works
✓ Logout works
✓ All auth tests pass

Changed files: 4 (1 new, 3 modified)

Committing (Section I.8).

**Next phases (if desired):**
- Phase 2: Split large AuthContext into smaller hooks
- Phase 3: Add error handling
- Phase 4: Clarify session timeout logic

Each phase will be a separate, verified commit (Section VII - checkpoint commits)."
```

**What the protocol prevented:**
- Massive refactor without clear goals
- Breaking changes without hard stop
- No verification between changes
- Impossible to revert if something breaks
- Lost track of scope

---

## Security Changes

### Example 6: Adding Authentication

**Task:** "Add password reset functionality"

#### ❌ Without Protocol

```typescript
// Agent implements without security review

// api/reset-password.ts
export async function POST(req: Request) {
  const { email } = await req.json();

  // Security issue: No rate limiting
  // Security issue: Reveals if email exists
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ error: 'Email not found' }, { status: 404 });
  }

  // Security issue: Predictable reset token
  const resetToken = Math.random().toString(36);

  // Security issue: No expiration
  await db.user.update({
    where: { email },
    data: { resetToken }
  });

  // Security issue: Token in email (not hashed)
  await sendEmail(email, `Reset link: /reset?token=${resetToken}`);

  return Response.json({ success: true });
}

// Result: Multiple critical security vulnerabilities
// Agent didn't ask before implementing auth changes (Section II hard stop)
```

#### ✅ With Protocol

```
Agent: "This task involves authentication changes (Section II hard stop).

**Security concerns I need to address:**
- Rate limiting (prevent abuse)
- Token generation (cryptographically secure?)
- Token storage (hashed?)
- Token expiration (how long valid?)
- Email enumeration (should we reveal if email exists?)
- Audit logging (track reset attempts?)

**Section IV - I'm uncertain about:**
- Your security requirements for password reset
- Compliance requirements (HIPAA, GDPR, etc.)
- Existing auth architecture patterns

Before implementing, I need approval and clarification (Section II + IV).

**Questions:**
1. Should reset tokens expire? (recommend: 1 hour)
2. Should we rate limit reset requests? (recommend: 3 per hour per IP)
3. Should we hash tokens in database? (recommend: yes)
4. Should we log reset attempts for security audit? (recommend: yes)
5. Should we prevent email enumeration? (recommend: yes, same response for all emails)

Once you approve the approach, I'll implement following security best practices."

---

User: "Yes to all 5 questions"

Agent: "Thank you. Implementing password reset with security controls.

This will touch:
1. api/reset-password.ts (new endpoint)
2. api/verify-reset.ts (new endpoint)
3. db/schema.prisma (add reset_token, reset_expires fields)
4. lib/auth.ts (add secure token generation)
5. lib/audit.ts (add logging)

5 files (Section II hard stop was already cleared).

**Security checklist (Section XII):**
```
```
- [x] No hardcoded secrets (using env vars)
- [x] User input validated (email format, token format)
- [x] Authentication verified (reset must use valid token)
- [x] Authorization enforced (can only reset own password)
- [x] Sensitive data encrypted (token hashed with bcrypt)
- [x] Error messages don't leak info (same response for all emails)
- [x] Rate limiting exists (3 requests/hour per IP)
- [x] Audit logs capture activity (all reset attempts logged)
```
```

Implementing:
```
```typescript
// api/reset-password.ts
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { rateLimit } from '@/lib/rateLimit';
import { auditLog } from '@/lib/audit';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

  // Security: Rate limiting
  const limited = await rateLimit(ip, 'password-reset', 3, 60);
  if (limited) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { email } = await req.json();

  // Security: Validate email format
  if (!email?.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Security: Prevent email enumeration (always same response)
  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    // Security: Cryptographically secure token
    const resetToken = randomBytes(32).toString('hex');

    // Security: Hash token before storing
    const hashedToken = await hash(resetToken, 10);

    // Security: Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetExpires: expiresAt
      }
    });

    await sendEmail(email, `Reset link: /reset?token=${resetToken}`);

    // Security: Audit log
    await auditLog({
      action: 'password_reset_requested',
      userId: user.id,
      metadata: { email }
    });
  } else {
    // Security: Log failed attempts
    await auditLog({
      action: 'password_reset_failed',
      metadata: { email, reason: 'user_not_found' }
    });
  }

  // Security: Same response regardless of whether user exists
  return Response.json({
    message: 'If that email exists, a reset link has been sent'
  });
}
```
```

Agent: "Verifying (Section I.6 + Section XII):"

[runs security tests]

Agent: "✓ Rate limiting works (4th request blocked)
✓ Invalid emails rejected
✓ Tokens are hashed in database
✓ Tokens expire after 1 hour
✓ Email enumeration prevented (same response)
✓ All attempts logged to audit_logs

Security checklist complete (Section XII).

Committing (Section I.8)."
```

**What the protocol prevented:**
- Implementing security-sensitive feature without approval (Section II)
- Multiple critical security vulnerabilities
- No security review before implementation
- Missing audit logging
- Skipping threat modeling

---

## Emergency Fixes

### Example 7: Production Outage

**Task:** "URGENT: Users can't log in! 500 errors on /api/auth"

#### ❌ Without Protocol

```typescript
// Agent follows normal protocol during emergency

Agent: "Following Section I, let me read the auth code first..."
[reads for 2 minutes]

Agent: "Now let me understand the architecture..."
[reads more files]

Agent: "I should ask before making changes since this is security-related..."
[waits for approval]

// Result: Service down for 10+ minutes while agent follows process
// Lost revenue, angry users
```

#### ✅ With Protocol

```
Agent: "PRODUCTION EMERGENCY - invoking Section XI (when to break rules).

Breaking normal protocol:
- Skipping planning phase
- Skipping approval for security changes
- Acting immediately

Diagnosis:
```
```bash
# Check logs
tail -n 100 /var/log/api.log

# Error: "Environment variable JWT_SECRET is undefined"
```
```

Agent: "Root cause: JWT_SECRET missing in production environment.

Immediate fix:
```
```bash
# Verify secret exists in vault
vault kv get production/secrets/jwt

# Add to production env
export JWT_SECRET="[value from vault]"

# Restart service
systemctl restart api-server
```
```

Agent: "✓ Service restored (login working)
✓ Response time normal
✓ No errors in logs

**Post-mortem (now following protocol again):**

This was an emergency (Section XI), protocol violation justified.

**Preventive measures:**
1. Add startup check: fail if JWT_SECRET missing
2. Add to runbook: docs/runbooks/INCIDENT_RESPONSE.md
3. Create monitoring alert for missing env vars
4. Add to deployment checklist

Creating follow-up tasks:

```typescript
// NEW FILE: src/lib/validateEnv.ts
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required env var: ${envVar}`);
    process.exit(1);
  }
}
```

Agent: "Committing preventive fixes (Section I.8).

**Incident summary:**
- Outage duration: 3 minutes (fast response due to Section XI)
- Root cause: Missing env var
- Impact: 100% of login attempts failed
- Prevention: Added env validation at startup

Protocol violation was appropriate for production emergency (Section XI)."
```

**What the protocol enabled:**
- Explicit permission to break rules in emergency (Section XI)
- Clear documentation of why rules were broken
- Proper follow-up after emergency resolved
- Learning from incident (add preventive measures)

---

## Architecture Decisions

### Example 8: State Management Choice

**Task:** "Our component state is getting complex, should we add Redux?"

#### ❌ Without Protocol

```typescript
// Agent immediately installs Redux and refactors everything

npm install redux react-redux @reduxjs/toolkit

// Created:
// - src/store/index.ts
// - src/store/slices/userSlice.ts
// - src/store/slices/clientSlice.ts
// - src/store/slices/authSlice.ts
// - src/store/middleware/logger.ts
// - Refactored 20+ components to use Redux

// Result:
// - Massive scope creep
// - Introduced unnecessary complexity
// - Didn't verify simpler solutions first
```

#### ✅ With Protocol

```
Agent: "Before adding a new state management library, let me understand
the actual problem (Section IV - uncertainty).

**I'm uncertain about:**
- What specific complexity are you experiencing?
- Which components share state awkwardly?
- Have simpler solutions been tried?
- What's the performance impact of current approach?

Let me read the current state management code (Section I.1):"

[reads components]

Agent: "I found:
- 5 components pass props through 3+ levels (prop drilling)
- User auth state duplicated in 4 components
- No performance issues (rendering is fast)

**Section V (progressive disclosure) - simpler approaches first:**

**Option A: React Context (built-in, 0 dependencies)**
- Extract shared state to contexts
- 3 new files (UserContext, ClientContext, AuthContext)
- Refactor 5 components to use contexts
- 8 files total (Section II: need approval for >3)

**Option B: Zustand (lightweight, 1 small dependency)**
- Similar to Context but simpler API
- Better DevTools support
- Same file count as Option A

**Option C: Redux Toolkit (heavy, 3 dependencies)**
- More boilerplate
- Useful if we need:
  - Time-travel debugging
  - Complex middleware
  - Server-side rendering

**My recommendation (Section III - simplicity bias):**
Try Option A (React Context) first. It's built-in, no new dependencies.

If that proves insufficient, upgrade to Zustand.
Only add Redux if we genuinely need its specific features.

Should I proceed with Option A?"

---

User: "Yes, try Context first"

Agent: "Implementing with React Context (Section V - start simple).

Files to create:
1. src/contexts/AuthContext.tsx
2. src/contexts/UserContext.tsx
3. src/contexts/ClientContext.tsx

Files to modify:
4. App.tsx (add providers)
5-8. Four components using shared state

8 files total (Section II - approved).

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState } from 'react';

interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const user = await api.login(credentials);
    setUser(user);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

[similar implementations for UserContext, ClientContext]

Now refactoring components to use contexts:
```typescript
// Before (prop drilling)
function UserProfile({ user, onUpdate, onDelete, authToken, isAdmin }) {
  return <UserDetails user={user} onUpdate={onUpdate} authToken={authToken} isAdmin={isAdmin} />
}

function UserDetails({ user, onUpdate, authToken, isAdmin }) {
  return <UserActions user={user} onUpdate={onUpdate} authToken={authToken} isAdmin={isAdmin} />
}

function UserActions({ user, onUpdate, authToken, isAdmin }) {
  // Finally using the props 3 levels deep
}

// After (context)
function UserProfile() {
  return <UserDetails />
}

function UserDetails() {
  return <UserActions />
}

function UserActions() {
  const { user, updateUser } = useUser();
  const { isAuthenticated, isAdmin } = useAuth();
  // Direct access, no prop drilling
}
```

Agent: "Verifying (Section I.6):"

[runs app]

Agent: "✓ Authentication works
✓ User state shared across components
✓ Client state shared across components
✓ No prop drilling
✓ Performance unchanged (no unnecessary re-renders)
✓ All tests pass

Result: Solved the complexity with 0 new dependencies (Section III).

If we later need Redux-specific features, we can migrate incrementally (Section V).

Committing (Section I.8)."
```

**What the protocol prevented:**
- Premature optimization (jumping to Redux)
- Adding unnecessary dependencies (Section III)
- Not trying simpler solutions first (Section V)
- Over-engineering for current needs

---

## Summary: Key Patterns

### Pattern 1: Read → Understand → Act

**Always:**
1. Read the actual code (don't guess)
2. Understand the problem (ask if unclear)
3. Choose simplest solution (progressive disclosure)
4. Verify it works (run/test)
5. Commit when working (checkpoint)

### Pattern 2: Stop at Boundaries

**Trigger hard stop when:**
- Touching >3 files
- Deleting data
- Changing security/auth
- Breaking API contracts

**Then:** Ask for approval with options

### Pattern 3: Signal Uncertainty

**When uncertain (<80% confident):**
- Say so explicitly
- Explain what you don't know
- Propose how to verify
- Don't guess

### Pattern 4: Simplicity Wins

**Prefer:**
- Edit > Create
- One file > Many files
- Inline > Abstract (until 3rd use)
- Built-in > Library
- Working ugly > Broken elegant

### Pattern 5: Break Rules Wisely

**Break protocol when:**
- Production emergency
- Exploratory coding
- User explicitly overrides
- Following protocol makes outcome worse

**Then:** Document why you broke it

---

**Version:** 1.0
**Last Updated:** 2025-12-02
**Related Documents:**
- `/CLAUDE.MD` - Core protocol
- `/docs/CLAUDE_PROTOCOL_USAGE.md` - Usage guide
