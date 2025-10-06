# Mental Scribe API Reference

## Overview

Mental Scribe's API is built on **Lovable Cloud / Supabase**, providing:
- **REST API** - Auto-generated from PostgreSQL schema via PostgREST
- **Edge Functions** - Serverless functions for complex operations
- **Real-time subscriptions** - Live data updates (optional)
- **Storage API** - Secure file upload/download with signed URLs

**Base URL:** `https://bmtzgeffbzmcwmnprxmx.supabase.co`

## Authentication

All authenticated requests require a JWT token obtained via Supabase Auth.

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123!',
  options: {
    emailRedirectTo: `${window.location.origin}/`
  }
})
```

**Security:** Passwords checked against HaveIBeenPwned database server-side.

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123!'
})
```

**Account Lockout:** 5 failed attempts triggers 15-minute lockout.

### Sign Out

```typescript
const { error } = await supabase.auth.signOut()
```

### Session Management

```typescript
// Get current session
const { data: { session }, error } = await supabase.auth.getSession()

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event)
  setUser(session?.user ?? null)
})
```

---

## Database Tables API

All table operations use the Supabase JavaScript client with automatic RLS enforcement.

### Clients (Patient Records)

**Endpoint:** `clients`

**Schema:**
```typescript
interface Client {
  id: string                    // UUID
  user_id: string              // Owner (practitioner)
  first_name: string
  last_name: string
  preferred_name?: string
  date_of_birth?: string       // ISO 8601 date
  email?: string
  phone?: string
  gender?: string
  pronouns?: string
  primary_diagnosis?: string
  secondary_diagnoses?: string[]
  treatment_goals?: string
  insurance_provider?: string
  insurance_id?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  program_id?: string          // Links to programs table
  external_id?: string         // External system ID (hashed)
  is_active: boolean           // Archive flag
  data_classification: 'standard_phi' | 'part2_protected'
  created_at: string
  updated_at: string
}
```

**Create Client:**
```typescript
const { data, error } = await supabase
  .from('clients')
  .insert({
    first_name: 'John',
    last_name: 'Doe',
    date_of_birth: '1985-03-15',
    email: 'john.doe@example.com',
    primary_diagnosis: 'Major Depressive Disorder'
  })
  .select()
  .single()
```

**Get Clients (Owner Only):**
```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*, programs(*)')
  .eq('is_active', true)
  .order('last_name', { ascending: true })
```

**Update Client:**
```typescript
const { data, error } = await supabase
  .from('clients')
  .update({ phone: '+1-555-0100' })
  .eq('id', clientId)
  .select()
```

**Archive Client (Soft Delete):**
```typescript
const { data, error } = await supabase
  .from('clients')
  .update({ is_active: false })
  .eq('id', clientId)
```

**RLS Policies:**
- ✅ Owner (user_id = auth.uid()): Full CRUD
- ✅ Admin: SELECT only
- ✅ Clinical staff: SELECT only (assigned patients in assigned programs)
- ❌ Anonymous: BLOCKED

---

### Conversations (Session Threads)

**Endpoint:** `conversations`

**Schema:**
```typescript
interface Conversation {
  id: string
  user_id: string              // Owner (practitioner)
  client_id?: string           // Optional client link
  program_id?: string          // Optional program link
  title: string
  is_part2_protected: boolean
  part2_consent_status: 'none' | 'pending' | 'active' | 'revoked'
  part2_consent_date?: string
  part2_consent_expiry?: string
  data_classification: 'standard_phi' | 'part2_protected'
  created_at: string
  updated_at: string
}
```

**Create Conversation:**
```typescript
const { data, error } = await supabase
  .from('conversations')
  .insert({
    title: 'Initial Assessment - John Doe',
    client_id: clientId,
    program_id: programId
  })
  .select()
  .single()
```

**Get Conversations:**
```typescript
const { data, error } = await supabase
  .from('conversations')
  .select('*, clients(first_name, last_name)')
  .order('updated_at', { ascending: false })
  .limit(50)
```

**Update Conversation Title:**
```typescript
const { data, error } = await supabase
  .from('conversations')
  .update({ title: 'Updated Title' })
  .eq('id', conversationId)
```

**Delete Conversation:**
```typescript
const { data, error } = await supabase
  .from('conversations')
  .delete()
  .eq('id', conversationId)
```

**RLS Policies:**
- ✅ Owner: Full CRUD
- ✅ Clinical staff: SELECT (standard PHI only, with patient assignment)
- ✅ Clinical staff: SELECT (Part 2, with patient assignment + active consent)
- ❌ Anonymous: BLOCKED

---

### Messages (Conversation Content)

**Endpoint:** `messages`

**Schema:**
```typescript
interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string              // Message text
  is_part2_protected: boolean
  data_classification: 'standard_phi' | 'part2_protected'
  created_at: string
}
```

**Create Message:**
```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    role: 'user',
    content: 'Patient reports improved mood this week.'
  })
  .select()
  .single()
```

**Get Messages for Conversation:**
```typescript
const { data, error } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true })
```

**Delete Message:**
```typescript
const { data, error } = await supabase
  .from('messages')
  .delete()
  .eq('id', messageId)
```

**RLS Policies:**
- ✅ Owner: SELECT, INSERT, DELETE (no UPDATE - messages are immutable after creation)
- ❌ UPDATE: BLOCKED for all users (audit trail integrity)
- ❌ Anonymous: BLOCKED

---

### Structured Notes (Clinical Documentation)

**Endpoint:** `structured_notes`

**Schema:**
```typescript
interface StructuredNote {
  id: string
  user_id: string              // Auto-set to auth.uid()
  conversation_id: string
  client_id?: string
  program_id?: string
  session_date: string         // ISO 8601 timestamp
  is_telehealth: boolean
  client_perspective?: string
  current_status?: string
  response_to_interventions?: string
  new_issues_presented: boolean
  new_issues_details?: string
  goals_progress?: string
  safety_assessment?: string
  clinical_impression?: string
  treatment_plan?: string
  next_steps?: string
  is_part2_protected: boolean
  data_classification: 'standard_phi' | 'part2_protected'
  created_at: string
  updated_at: string
}
```

**Create Structured Note:**
```typescript
const { data, error } = await supabase
  .from('structured_notes')
  .insert({
    conversation_id: conversationId,
    client_id: clientId,
    session_date: new Date().toISOString(),
    is_telehealth: true,
    current_status: 'Patient appears stable...',
    clinical_impression: 'Improved affect...',
    treatment_plan: 'Continue weekly therapy...'
  })
  .select()
  .single()
```

**Get Notes for Client:**
```typescript
const { data, error } = await supabase
  .from('structured_notes')
  .select('*, conversations(title)')
  .eq('client_id', clientId)
  .order('session_date', { ascending: false })
```

**Update Note:**
```typescript
const { data, error } = await supabase
  .from('structured_notes')
  .update({ 
    clinical_impression: 'Updated impression...',
    treatment_plan: 'Modified plan...'
  })
  .eq('id', noteId)
```

**RLS Policies:**
- ✅ Owner: Full CRUD
- ✅ Clinical staff: SELECT (standard PHI, with assignment)
- ✅ Clinical staff: SELECT (Part 2, with assignment + consent)
- ❌ Anonymous: BLOCKED

---

### Programs (Treatment Programs)

**Endpoint:** `programs`

**Schema:**
```typescript
interface Program {
  id: string
  name: string                 // e.g., "Outpatient SUD Program"
  org_unit_code?: string       // Organization identifier
  is_part2: boolean            // 42 CFR Part 2 flag
  created_at: string
  updated_at: string
}
```

**Get Programs (Admin or Member):**
```typescript
const { data, error } = await supabase
  .from('programs')
  .select('*')
  .order('name', { ascending: true })
```

**Create Program (Admin Only):**
```typescript
const { data, error } = await supabase
  .from('programs')
  .insert({
    name: 'Outpatient SUD Program',
    org_unit_code: 'ORG-001',
    is_part2: true
  })
  .select()
  .single()
```

**RLS Policies:**
- ✅ Admin: Full CRUD
- ✅ Program members: SELECT
- ❌ Non-members: No access
- ❌ Anonymous: BLOCKED

---

### User Roles

**Endpoint:** `user_roles`

**Schema:**
```typescript
interface UserRole {
  id: string
  user_id: string
  role: 'admin' | 'user'
  created_at: string
}
```

**Get User's Roles:**
```typescript
const { data, error } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', userId)
```

**RLS Policies:**
- ✅ Owner: SELECT (read own roles)
- ✅ Admin: Full CRUD
- ❌ Non-admin: Cannot modify roles
- ❌ Anonymous: BLOCKED

---

### Part 2 Consents

**Endpoint:** `part2_consents`

**Schema:**
```typescript
interface Part2Consent {
  id: string
  user_id: string              // Patient
  conversation_id: string
  consent_type: 'disclosure' | 'treatment' | 'research'
  disclosure_purpose?: string  // e.g., "Referral to specialist"
  status: 'active' | 'revoked'
  granted_date: string
  expiry_date?: string
  revoked_date?: string
  recipient_info?: object      // JSON details
  created_at: string
  updated_at: string
}
```

**Create Consent:**
```typescript
const { data, error } = await supabase
  .from('part2_consents')
  .insert({
    conversation_id: conversationId,
    consent_type: 'disclosure',
    disclosure_purpose: 'Referral to psychiatrist',
    granted_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
  })
  .select()
  .single()
```

**Revoke Consent:**
```typescript
const { data, error } = await supabase
  .from('part2_consents')
  .update({ 
    status: 'revoked',
    revoked_date: new Date().toISOString()
  })
  .eq('id', consentId)
```

**RLS Policies:**
- ✅ Owner: Full CRUD
- ✅ Admin: SELECT
- ❌ DELETE: BLOCKED (audit trail)
- ❌ Anonymous: BLOCKED

---

### Audit Logs

**Endpoint:** `audit_logs` (Read-only for non-admins)

**Schema:**
```typescript
interface AuditLog {
  id: string
  user_id: string
  action: string               // e.g., 'client_created', 'part2_consent_granted'
  resource_type: string        // e.g., 'client', 'conversation'
  resource_id?: string
  metadata?: object            // Sanitized JSON
  purpose?: string
  consent_id?: string
  program_id?: string
  ip_address?: string
  user_agent?: string
  part2_disclosure_purpose?: string
  data_classification: 'standard_phi' | 'part2_protected'
  created_at: string
}
```

**Get Audit Logs (Admin Only):**
```typescript
const { data, error } = await supabase
  .from('audit_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100)
```

**RLS Policies:**
- ✅ Admin: SELECT, DELETE
- ✅ Service role: INSERT (via triggers)
- ❌ UPDATE: BLOCKED (immutable)
- ❌ Non-admin: No access
- ❌ Anonymous: BLOCKED

---

## Edge Functions

### 1. analyze-clinical-notes

**Purpose:** AI-powered note generation using OpenAI GPT-4.

**Endpoint:** `POST /functions/v1/analyze-clinical-notes`

**Authentication:** Required (JWT in Authorization header)

**Request Body:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  conversationId?: string      // Optional conversation context
}
```

**Response:**
```typescript
{
  content: string              // AI-generated response
  conversationId?: string
}
```

**Example:**
```typescript
const { data, error } = await supabase.functions.invoke('analyze-clinical-notes', {
  body: {
    messages: [
      { role: 'user', content: 'Patient reports anxiety symptoms.' }
    ],
    conversationId: 'uuid-here'
  }
})
```

**Rate Limit:** 100 requests/hour per user  
**Timeout:** 30 seconds

---

### 2. secure-signup

**Purpose:** User registration with HaveIBeenPwned password check.

**Endpoint:** `POST /functions/v1/secure-signup`

**Authentication:** Not required (public)

**Request Body:**
```typescript
{
  email: string
  password: string
}
```

**Response:**
```typescript
{
  success: boolean
  message: string
  userId?: string
}
```

**Security:**
- ✅ Password checked against HIBP database (k-anonymity)
- ✅ Fails closed on network errors (safe default)
- ✅ CSP headers prevent XSS
- ✅ Rate limited: 10 signups/hour per IP

**Example:**
```typescript
const { data, error } = await supabase.functions.invoke('secure-signup', {
  body: {
    email: 'newuser@example.com',
    password: 'SecurePassword123!'
  }
})
```

---

### 3. disclose

**Purpose:** Export Part 2 protected data with consent validation.

**Endpoint:** `POST /functions/v1/disclose`

**Authentication:** Required (JWT)

**Request Body:**
```typescript
{
  conversationId: string
  consentId: string            // Must be active consent
  format: 'pdf' | 'fhir' | 'json'
}
```

**Response:**
```typescript
{
  success: boolean
  data?: string                // Base64 encoded file or JSON
  filename?: string
  mimeType?: string
}
```

**Security:**
- ✅ Validates active consent exists
- ✅ Checks consent expiration
- ✅ Logs to audit_logs with consent_id
- ✅ Appends Part 2 re-disclosure notice

**Example:**
```typescript
const { data, error } = await supabase.functions.invoke('disclose', {
  body: {
    conversationId: 'uuid-here',
    consentId: 'consent-uuid',
    format: 'pdf'
  }
})
```

---

### 4. realtime-voice

**Purpose:** Real-time voice transcription using OpenAI Whisper/Realtime API.

**Endpoint:** `POST /functions/v1/realtime-voice`

**Authentication:** Required (JWT)

**Request Body:**
```typescript
{
  action: 'start' | 'stop' | 'chunk'
  audioChunk?: string          // Base64 encoded audio
  sessionId?: string
}
```

**Response:**
```typescript
{
  success: boolean
  transcript?: string
  sessionId?: string
}
```

**Example:**
```typescript
// Start session
const { data: session } = await supabase.functions.invoke('realtime-voice', {
  body: { action: 'start' }
})

// Send audio chunk
const { data: result } = await supabase.functions.invoke('realtime-voice', {
  body: { 
    action: 'chunk',
    audioChunk: base64Audio,
    sessionId: session.sessionId
  }
})

// Stop session
await supabase.functions.invoke('realtime-voice', {
  body: { 
    action: 'stop',
    sessionId: session.sessionId
  }
})
```

---

## Storage API

### Clinical Documents Bucket

**Bucket:** `clinical-documents` (Private)

**Upload File:**
```typescript
const { data, error } = await supabase.storage
  .from('clinical-documents')
  .upload(`${userId}/${filename}`, file, {
    cacheControl: '3600',
    upsert: false
  })
```

**Get Signed URL (24-hour expiry):**
```typescript
const { data, error } = await supabase.storage
  .from('clinical-documents')
  .createSignedUrl(`${userId}/${filename}`, 86400) // 24 hours
```

**Download File:**
```typescript
const { data, error } = await supabase.storage
  .from('clinical-documents')
  .download(`${userId}/${filename}`)
```

**Delete File:**
```typescript
const { data, error } = await supabase.storage
  .from('clinical-documents')
  .remove([`${userId}/${filename}`])
```

**RLS Policies:**
- ✅ Users can upload to their own folder (`${userId}/`)
- ✅ Users can access files in their own folder
- ❌ Cross-user access: BLOCKED
- ❌ Anonymous: BLOCKED

---

### Recordings Bucket

**Bucket:** `recordings` (Private)

**Upload Recording:**
```typescript
const { data, error } = await supabase.storage
  .from('recordings')
  .upload(`${userId}/${recordingId}.webm`, audioBlob, {
    contentType: 'audio/webm'
  })
```

**Get Recording Metadata:**
```typescript
const { data, error } = await supabase
  .from('recordings')
  .select('*')
  .eq('id', recordingId)
  .single()
```

**RLS Policies:**
- ✅ Users can upload to their own folder
- ✅ Clinical staff can access with patient assignment + consent (Part 2)
- ❌ Anonymous: BLOCKED

---

## Security Definer Functions

These helper functions bypass RLS to perform role checks and prevent recursion.

### has_role()

```sql
SELECT has_role(auth.uid(), 'admin'::app_role)
```

**Returns:** `boolean` - True if user has the specified role

**Use Case:** RLS policies checking for admin access

---

### is_clinical_staff()

```sql
SELECT is_clinical_staff(auth.uid(), program_id)
```

**Returns:** `boolean` - True if user is treating_provider or care_team in program

**Use Case:** RLS policies for clinical staff access

---

### is_assigned_to_patient()

```sql
SELECT is_assigned_to_patient(auth.uid(), client_id)
```

**Returns:** `boolean` - True if staff member is assigned to patient

**Use Case:** RLS policies enforcing patient-staff assignments

---

### has_active_part2_consent_for_conversation()

```sql
SELECT has_active_part2_consent_for_conversation(conversation_id)
```

**Returns:** `boolean` - True if active, non-expired Part 2 consent exists

**Use Case:** RLS policies for Part 2 data access

---

### derive_classification()

```sql
SELECT derive_classification(program_id)
```

**Returns:** `data_classification` - 'standard_phi' or 'part2_protected'

**Use Case:** Automatic data classification based on program

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Typical Cause |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | RLS policy denied access |
| 404 | Not Found | Resource doesn't exist or no access |
| 409 | Conflict | Unique constraint violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Error Response Format

```typescript
{
  error: {
    message: string
    code?: string
    details?: object
  }
}
```

### Example Error Handling

```typescript
const { data, error } = await supabase
  .from('clients')
  .insert({ first_name: 'John' })

if (error) {
  if (error.code === '23505') {
    console.error('Duplicate entry')
  } else if (error.code === 'PGRST116') {
    console.error('RLS policy violation')
  } else {
    console.error('Unexpected error:', error.message)
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Authentication | 10 requests | 1 minute |
| secure-signup | 10 signups | 1 hour per IP |
| analyze-clinical-notes | 100 requests | 1 hour per user |
| realtime-voice | 50 sessions | 1 hour per user |
| Database operations | 1000 requests | 1 minute per user |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

---

## Pagination

**Using Range Headers:**
```typescript
const { data, error, count } = await supabase
  .from('clients')
  .select('*', { count: 'exact' })
  .range(0, 9) // First 10 records
```

**Response Headers:**
```
Content-Range: 0-9/150
```

**Pagination Pattern:**
```typescript
const pageSize = 20
const page = 2
const from = page * pageSize
const to = from + pageSize - 1

const { data, count } = await supabase
  .from('clients')
  .select('*', { count: 'exact' })
  .range(from, to)
```

---

## Filtering & Sorting

**Operators:**
```typescript
// Equality
.eq('status', 'active')

// Comparison
.gt('age', 18)
.lt('created_at', '2024-01-01')

// Pattern matching
.like('last_name', '%Smith%')
.ilike('email', '%@example.com') // Case-insensitive

// Inclusion
.in('role', ['admin', 'moderator'])
.not('status', 'eq', 'deleted')

// Null checks
.is('deleted_at', null)
.not('email', 'is', null)
```

**Sorting:**
```typescript
.order('created_at', { ascending: false })
.order('last_name', { ascending: true })
```

**Complex Filtering:**
```typescript
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('is_active', true)
  .or('program_id.is.null,program_id.eq.uuid-here')
  .order('last_name', { ascending: true })
  .limit(50)
```

---

## Real-time Subscriptions (Optional)

**Subscribe to Table Changes:**
```typescript
const subscription = supabase
  .channel('clients-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'clients',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Change detected:', payload)
    }
  )
  .subscribe()

// Cleanup
subscription.unsubscribe()
```

**Events:**
- `INSERT` - New record created
- `UPDATE` - Record modified
- `DELETE` - Record deleted
- `*` - All events

---

## Testing

### Test User Credentials

**Note:** Test accounts should be created in staging/preview environments only.

```typescript
// Create test user
const { data } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'TestPassword123!'
})

// Sign in as test user
const { data: session } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'TestPassword123!'
})
```

### Mocking Supabase in Tests

```typescript
import { createClient } from '@supabase/supabase-js'
import { vi } from 'vitest'

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockResolvedValue({ data: {}, error: null })
  }))
}
```

---

## Best Practices

### 1. Always Handle Errors

```typescript
const { data, error } = await supabase.from('clients').select()
if (error) {
  console.error('Database error:', error)
  // Show user-friendly message
  toast.error('Failed to load clients')
  return
}
// Use data safely
```

### 2. Use TypeScript Types

```typescript
import { Database } from '@/integrations/supabase/types'

type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
```

### 3. Optimize Queries

```typescript
// ❌ Bad: Fetches all columns
await supabase.from('clients').select('*')

// ✅ Good: Only fetch needed columns
await supabase.from('clients').select('id, first_name, last_name')

// ✅ Good: Use single() for single row
await supabase.from('clients').select().eq('id', id).single()
```

### 4. Use TanStack Query for Caching

```typescript
const { data: clients } = useQuery({
  queryKey: ['clients'],
  queryFn: async () => {
    const { data, error } = await supabase.from('clients').select()
    if (error) throw error
    return data
  },
  staleTime: 5 * 60 * 1000 // 5 minutes
})
```

### 5. Invalidate Cache After Mutations

```typescript
const mutation = useMutation({
  mutationFn: async (newClient) => {
    const { data, error } = await supabase.from('clients').insert(newClient)
    if (error) throw error
    return data
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] })
  }
})
```

### 6. Use Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateClient,
  onMutate: async (updatedClient) => {
    await queryClient.cancelQueries({ queryKey: ['clients'] })
    const previous = queryClient.getQueryData(['clients'])
    
    queryClient.setQueryData(['clients'], (old) => 
      old.map(c => c.id === updatedClient.id ? updatedClient : c)
    )
    
    return { previous }
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['clients'], context.previous)
  }
})
```

---

## Troubleshooting

### Common Issues

**1. "JWT expired" Error**
```typescript
// Solution: Refresh session
const { data, error } = await supabase.auth.refreshSession()
```

**2. "Row level security policy violation"**
- Check user is authenticated
- Verify RLS policies allow operation
- Ensure user_id matches auth.uid()

**3. "PGRST116" Error (No rows found)**
- Resource may not exist
- RLS may be blocking access
- Check query filters

**4. Edge Function Timeout**
- Increase timeout in config.toml (max 60s)
- Optimize function logic
- Use async operations

**5. Storage Upload Fails**
- Check file size limit (50MB)
- Verify bucket permissions
- Ensure path starts with user_id

---

## Support & Resources

- **Documentation:** https://docs.lovable.dev
- **Supabase Docs:** https://supabase.com/docs
- **API Status:** Check Lovable Cloud dashboard
- **Issue Tracker:** GitHub repository issues

---

**API Version:** 1.0  
**Last Updated:** October 6, 2025  
**Next Review:** January 6, 2026
