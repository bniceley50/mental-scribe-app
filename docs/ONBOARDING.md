# Mental Scribe - New Developer Onboarding Guide

Welcome to Mental Scribe! This guide will help you get up and running with the project.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Initial Setup](#initial-setup)
4. [Development Workflow](#development-workflow)
5. [Database & Migrations](#database--migrations)
6. [Secrets Configuration](#secrets-configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Key Concepts & Glossary](#key-concepts--glossary)
10. [Next Steps](#next-steps)

---

## Prerequisites

### Required Software

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| **Node.js** | 18+ | JavaScript runtime | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Package manager | Bundled with Node.js |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com) |

### Required Accounts

- **Lovable Account** - Access to the project
- **OpenAI Account** (optional) - For AI features testing

### Recommended Tools

- **VS Code** - Code editor with extensions:
  - ESLint
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - Prettier
- **Postman** or **curl** - API testing
- **pgAdmin** or **TablePlus** - Database GUI (optional)

---

## Project Overview

### What is Mental Scribe?

Mental Scribe is a HIPAA-compliant, AI-powered clinical documentation assistant for mental health professionals. It helps clinicians:

- Create structured clinical notes using AI
- Record and transcribe therapy sessions
- Manage client records securely
- Export documentation in FHIR format

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + Shadcn/ui
- TanStack Query (data fetching)
- React Router (routing)

**Backend (Lovable Cloud / Supabase):**
- PostgreSQL (database)
- Row Level Security (RLS)
- Edge Functions (Deno runtime)
- Supabase Auth
- Supabase Storage

**External APIs:**
- OpenAI GPT-4 (note generation)
- OpenAI Whisper (transcription)
- HaveIBeenPwned (password breach detection)

### Architecture at a Glance

```
┌─────────────────┐
│  React Frontend │
│  (User's Browser)│
└────────┬────────┘
         │ JWT Token
         ▼
┌─────────────────┐
│ Lovable Cloud   │
│ (Supabase)      │
├─────────────────┤
│ • Auth          │
│ • PostgreSQL DB │
│ • Edge Functions│
│ • Storage       │
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐
│ OpenAI API      │
└─────────────────┘
```

**Security Model:**
- All data protected by Row Level Security (RLS)
- JWT tokens authenticate every request
- RESTRICTIVE policies block anonymous access
- Audit logs track all PHI modifications

---

## Initial Setup

### 1. Clone the Repository

```bash
# If using Git (for local development)
git clone <repository-url>
cd mental-scribe-app

# Or work directly in Lovable editor
# (Code changes auto-sync)
```

### 2. Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 1247 packages in 45s
```

**Common issues:**
- `EACCES` errors → Run `sudo chown -R $USER /usr/local/lib/node_modules`
- `peer dependency` warnings → Safe to ignore
- Network timeouts → Check internet connection or try `npm cache clean --force`

### 3. Environment Variables

**Good news:** Lovable Cloud automatically manages environment variables. No manual `.env` file needed!

**Auto-configured variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon key (safe for client-side)
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

**Verify configuration:**
```bash
# In Lovable editor, check Dev Mode → Environment
# Or run locally:
npm run dev
# App should start without errors
```

### 4. Start Development Server

```bash
npm run dev
```

**Expected output:**
```
  VITE v5.4.19  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Open browser:** http://localhost:5173/

**What you should see:**
- Mental Scribe login page
- Clean, professional UI
- No console errors (check browser DevTools)

---

## Development Workflow

### Daily Development Cycle

1. **Pull latest changes** (if working in team)
   ```bash
   git pull origin main
   npm install  # Install any new dependencies
   ```

2. **Start dev server**
   ```bash
   npm run dev
   ```

3. **Make changes**
   - Edit files in `src/`
   - Hot Module Replacement (HMR) reloads automatically
   - Check browser console for errors

4. **Test changes**
   ```bash
   npm test           # Run unit tests
   npm run lint       # Check code quality
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature-branch
   ```

### Project Structure

```
mental-scribe-app/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components (Shadcn)
│   │   ├── clients/        # Client management
│   │   ├── ChatInterface.tsx
│   │   └── VoiceInterface.tsx
│   ├── pages/              # Route pages
│   │   ├── Index.tsx       # Home page
│   │   ├── Auth.tsx        # Login/signup
│   │   ├── Clients.tsx     # Client list
│   │   └── Settings.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useConversations.ts
│   │   └── useMessages.ts
│   ├── lib/                # Business logic
│   │   ├── openai.ts       # OpenAI integration
│   │   ├── fhir.ts         # FHIR export
│   │   └── utils.ts
│   ├── integrations/
│   │   └── supabase/       # Supabase client (auto-generated)
│   └── constants/          # App constants
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # Database migrations
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── tests/                  # Test files
```

### Key Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `src/App.tsx` | Main app component | Rarely (routing only) |
| `src/pages/*.tsx` | Page components | When adding features |
| `src/components/*.tsx` | Reusable UI | Most common edits |
| `src/lib/*.ts` | Business logic | Complex features |
| `supabase/functions/*` | Backend logic | Server-side operations |
| `docs/*.md` | Documentation | Always! |

---

## Database & Migrations

### Understanding the Database

Mental Scribe uses **PostgreSQL** via Lovable Cloud (Supabase). Key tables:

**Core Data:**
- `clients` - Patient demographics and clinical info
- `conversations` - Session threads
- `messages` - Individual session messages
- `structured_notes` - Formatted clinical documentation
- `recordings` - Audio file metadata

**Security & Compliance:**
- `user_roles` - Application roles (admin, user)
- `part2_consents` - SUD disclosure consents
- `audit_logs` - Immutable access logs
- `user_sessions` - Active user sessions

**Access Control:**
- `programs` - Treatment programs (Part 2 flag)
- `user_program_memberships` - Staff assignments
- `patient_assignments` - Staff-patient relationships

### Viewing the Database

**Option 1: Lovable Cloud Dashboard**
1. Click "View Backend" in Lovable
2. Navigate to Database → Tables
3. Browse data directly in UI

**Option 2: SQL Queries**
1. Open "SQL Editor" in Lovable Cloud
2. Run queries:
   ```sql
   -- View all tables
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   
   -- View client records (your own only, due to RLS)
   SELECT * FROM clients LIMIT 10;
   
   -- Check audit logs
   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
   ```

### Running Migrations

**Migrations are automatic in Lovable!** When you create/edit migration files in `supabase/migrations/`, they deploy automatically on next build.

**Migration file naming:**
```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

**Example migration:**
```sql
-- Add new column to clients table
ALTER TABLE public.clients 
ADD COLUMN preferred_language TEXT;

-- Update RLS policies if needed
-- (Policies automatically apply to new columns)
```

**Common migration tasks:**

1. **Add a column:**
   ```sql
   ALTER TABLE table_name ADD COLUMN column_name TYPE;
   ```

2. **Create a table:**
   ```sql
   CREATE TABLE public.new_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   
   -- Enable RLS
   ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
   
   -- Add policies
   CREATE POLICY "Users can view own records"
   ON public.new_table FOR SELECT
   USING (auth.uid() = user_id);
   ```

3. **Modify RLS policy:**
   ```sql
   DROP POLICY IF EXISTS "old_policy" ON public.table_name;
   CREATE POLICY "new_policy" ON public.table_name
   FOR SELECT USING (auth.uid() = user_id);
   ```

**⚠️ Migration Best Practices:**

- ✅ Always test in preview environment first
- ✅ Include rollback plan in comments
- ✅ Add descriptive comments
- ✅ Run security linter after migration
- ❌ Never directly modify `auth.users` table
- ❌ Never disable RLS on PHI tables
- ❌ Never use `ALTER DATABASE postgres` (not allowed)

### Resetting Local Development Database

**Not applicable** - Lovable Cloud manages the database. To reset:

1. Drop tables manually via SQL Editor (risky!)
2. Or create new Lovable project (recommended for testing)

**For testing migrations:**
```sql
-- Rollback example (manual)
DROP TABLE IF EXISTS test_table;
-- Then re-run migration
```

---

## Secrets Configuration

### What Are Secrets?

Secrets are sensitive values (API keys, passwords) that **must not** be committed to Git. Lovable Cloud securely stores them.

### Required Secrets

| Secret Name | Purpose | How to Get |
|-------------|---------|------------|
| `OPENAI_API_KEY` | AI note generation | [platform.openai.com](https://platform.openai.com) |
| `HMAC_SECRET_KEY` | Patient ID hashing | Generate locally (see below) |

### Adding Secrets

**Via Lovable Cloud:**

1. Click "View Backend" in Lovable
2. Navigate to Settings → Secrets
3. Click "New Secret"
4. Enter name and value
5. Save

**Generating HMAC Key:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Result: 64-character hex string
# Example: a3f9c8b2e1d4f6a0c5e8b2d9f1a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a
```

### Accessing Secrets in Code

**Client-side (React):**
```typescript
// ❌ NEVER access secrets in client code
// Secrets are only for Edge Functions
```

**Edge Functions (Deno):**
```typescript
// ✅ Correct way
const openaiKey = Deno.env.get('OPENAI_API_KEY')

if (!openaiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}
```

### Verifying Secrets

```bash
# Run security check
node scripts/security-check.js
```

**Output:**
```
=== Lovable Cloud Secrets Check ===
⚠ Verify secrets manually in Lovable Cloud dashboard:
  - OPENAI_API_KEY
  - HMAC_SECRET_KEY
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (re-run on file changes)
npm test -- --watch

# Run specific test file
npm test ChatInterface.test.tsx
```

### Test Structure

```typescript
// src/components/__tests__/ChatInterface.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatInterface from '../ChatInterface'

describe('ChatInterface', () => {
  it('should render input field', () => {
    render(<ChatInterface />)
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
  })
})
```

### Writing Your First Test

1. Create test file: `src/components/__tests__/MyComponent.test.tsx`
2. Import testing utilities:
   ```typescript
   import { render, screen } from '@testing-library/react'
   import { describe, it, expect } from 'vitest'
   ```
3. Write test cases:
   ```typescript
   describe('MyComponent', () => {
     it('should display welcome message', () => {
       render(<MyComponent />)
       expect(screen.getByText('Welcome')).toBeInTheDocument()
     })
   })
   ```

### Security Testing

```bash
# Run security checks
node scripts/security-check.js

# Test security functions (SQL)
bash scripts/test-security-functions.sh
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module '@supabase/supabase-js'"

**Cause:** Dependencies not installed

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 2. "Network Error" when signing in

**Cause:** Supabase URL/key misconfigured

**Fix:**
1. Check environment variables in Lovable
2. Verify Supabase project is active
3. Check browser console for CORS errors

#### 3. "Row Level Security policy violation"

**Cause:** RLS blocking your query

**Fix:**
1. Ensure user is logged in (JWT token present)
2. Check RLS policies allow operation
3. Verify `user_id` matches `auth.uid()`

**Debug query:**
```sql
-- Check your user ID
SELECT auth.uid();

-- Check if you can see data
SELECT * FROM clients WHERE user_id = auth.uid();
```

#### 4. "HMAC_SECRET_KEY not configured" Error

**Cause:** Secret missing in Lovable Cloud

**Fix:**
1. Generate key: `openssl rand -hex 32`
2. Add to Lovable Cloud → Secrets
3. Redeploy application

#### 5. Tests Failing with "TypeError: Cannot read property 'mockResolvedValue'"

**Cause:** Mocks not properly set up

**Fix:**
```typescript
// Add proper mock
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}))
```

#### 6. Hot Module Replacement (HMR) Not Working

**Cause:** Vite cache corruption

**Fix:**
```bash
rm -rf node_modules/.vite
npm run dev
```

### Getting Help

**Internal Resources:**
- `docs/ARCHITECTURE.md` - System architecture
- `docs/API_REFERENCE.md` - API documentation
- `docs/SECURITY_ENHANCEMENTS.md` - Security features
- `CONTRIBUTING.md` - Contribution guidelines

**External Resources:**
- [Lovable Documentation](https://docs.lovable.dev)
- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

**Ask for Help:**
1. Check existing documentation first
2. Search project issues/discussions
3. Ask team members in chat
4. Create detailed bug report with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser console errors
   - Screenshots if applicable

---

## Key Concepts & Glossary

### Security Concepts

**Row Level Security (RLS)**
- PostgreSQL feature that filters database rows per user
- Enforced at database level (cannot be bypassed)
- Mental Scribe uses RLS for all PHI tables

**JWT (JSON Web Token)**
- Authentication token issued by Supabase Auth
- Included in every API request
- Contains user ID and role information

**RESTRICTIVE vs PERMISSIVE Policies**
- **RESTRICTIVE:** Absolute blocks (e.g., block all anonymous access)
- **PERMISSIVE:** Conditional grants (e.g., allow owners to see their data)
- Mental Scribe uses both for defense-in-depth

**Security Definer Function**
- SQL function that runs with elevated privileges
- Used to bypass RLS for role checks
- Example: `has_role(user_id, 'admin')`

### Healthcare Compliance

**HIPAA (Health Insurance Portability and Accountability Act)**
- U.S. federal law protecting patient health information
- Requires encryption, access controls, audit logs
- Mental Scribe is HIPAA-compliant

**42 CFR Part 2**
- Federal regulation protecting substance use disorder (SUD) treatment records
- Stricter than HIPAA - requires explicit patient consent for disclosure
- Mental Scribe supports Part 2 with consent tracking

**PHI (Protected Health Information)**
- Any individually identifiable health data
- Examples: name + diagnosis, DOB + treatment notes
- Mental Scribe stores PHI in RLS-protected tables

### Technical Terms

**Edge Function**
- Serverless function running on Deno runtime
- Handles backend logic (AI calls, exports, etc.)
- Auto-scales with traffic

**Supabase Client**
- JavaScript library for interacting with Supabase
- Handles auth, database queries, storage
- Auto-configured in Mental Scribe

**TanStack Query (React Query)**
- Data fetching and caching library
- Manages server state in React
- Used for all database queries in Mental Scribe

**Shadcn/ui**
- Collection of re-usable React components
- Built on Radix UI + Tailwind CSS
- Located in `src/components/ui/`

---

## Next Steps

### Your First Task

**Goal:** Add your first feature to Mental Scribe

**Suggested starter tasks:**

1. **Easy:** Add a new field to client profile
   - Edit `src/components/clients/ClientDialog.tsx`
   - Add input field for new data
   - Update Supabase schema if needed

2. **Medium:** Create a new report page
   - Add route in `src/App.tsx`
   - Create `src/pages/Reports.tsx`
   - Fetch data from Supabase

3. **Advanced:** Build a new edge function
   - Create `supabase/functions/my-function/index.ts`
   - Add business logic
   - Call from React app

### Learning Path

**Week 1:** Setup & Exploration
- ✅ Complete this onboarding guide
- ✅ Run the app locally
- ✅ Browse the codebase
- ✅ Read architecture docs

**Week 2:** First Contribution
- ✅ Pick a small task
- ✅ Make changes
- ✅ Write tests
- ✅ Submit for review

**Week 3:** Deep Dive
- ✅ Understand RLS policies
- ✅ Learn edge function patterns
- ✅ Study security features
- ✅ Review compliance requirements

**Week 4:** Advanced Topics
- ✅ Database migrations
- ✅ Performance optimization
- ✅ Security hardening
- ✅ Production deployment

### Recommended Reading

**Must-Read (Priority 1):**
- `docs/ARCHITECTURE.md` - Understand system design
- `docs/API_REFERENCE.md` - Learn API patterns
- `SECURITY.md` - Security requirements

**Should-Read (Priority 2):**
- `docs/SECURITY_ENHANCEMENTS.md` - Advanced security
- `docs/TEST_COVERAGE_SETUP.md` - Testing strategy
- `CONTRIBUTING.md` - Contribution workflow

**Nice-to-Have (Priority 3):**
- `docs/PHASE1_VERIFICATION.md` - Security verification
- `CHANGELOG.md` - Recent changes
- External: Supabase RLS guide, React best practices

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev                  # Start dev server
npm test                     # Run tests
npm run lint                 # Check code quality

# Security
node scripts/security-check.js       # Pre-flight security check
bash scripts/test-security-functions.sh  # SQL security tests

# Build
npm run build                # Production build
npm run preview              # Preview production build
```

### Important URLs

- **Local dev:** http://localhost:5173
- **Lovable preview:** Check "Preview" in Lovable editor
- **Supabase dashboard:** Click "View Backend" in Lovable

### Key File Locations

```
src/pages/          ← Add new pages here
src/components/     ← Add new components here
src/lib/           ← Add business logic here
supabase/functions/ ← Add edge functions here
docs/              ← Add documentation here
```

---

**Welcome to the team! 🎉**

If you have questions, check the docs first, then ask. We're here to help!

---

**Document Version:** 1.0  
**Last Updated:** October 6, 2025  
**Next Review:** January 6, 2026  
**Maintained By:** Mental Scribe Development Team
