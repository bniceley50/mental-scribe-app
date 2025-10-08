# Mental Scribe Security & Architecture Review (2025-10-10)

## 1. Executive Summary
- **Overall Security Grade**: B
- **Critical Findings**: 1
- **High Findings**: 1
- **Medium Findings**: 2
- **Low Findings**: 3
- **Code Quality Assessment**: Mature TypeScript/React patterns with localized custom hooks, but several performance and consistency gaps remain in the auditing layer. Frontend state management is coherent; however, reliance on sequential network calls increases latency risk.
- **Maintainability Score**: B (well-structured modules and extensive documentation, though duplicated migration logic and missing automation around auditing warrant attention).

## 2. Security Findings
| Severity | Area | Finding | Recommendation |
| --- | --- | --- | --- |
| **Critical** | Audit Logging | Client directory views (`ClientsList`) render PHI without invoking the `log_client_view()` RPC, leaving list-level access untracked. | Invoke `batchLogClientViews` (or equivalent) after the client list query resolves so every PHI retrieval is logged before rendering. 【F:src/components/clients/ClientsList.tsx†L24-L144】【F:src/lib/clientAudit.ts†L1-L158】 |
| **High** | Audit Integrity | The `client_access_logs_service_insert` policy uses `WITH CHECK (true)`, allowing any authenticated user to forge audit rows (arbitrary `accessed_by`, `access_method`, etc.), undermining immutability guarantees. | Restrict inserts to `service_role` or enforce `WITH CHECK (auth.uid() = accessed_by)` plus strict column defaults via a SECURITY DEFINER RPC. 【F:supabase/migrations/20251006235557_c7739969-5525-4af3-977e-661007e1f4aa.sql†L12-L71】 |
| **Medium** | Performance / Rate Limiting | `useConversations` logs each conversation sequentially inside a loop, multiplying latency and increasing risk of exceeding rate limits. | Parallelize RPC calls (e.g., `Promise.allSettled`) or add a server-side bulk logger to minimize duplicate requests. 【F:src/hooks/useConversations.ts†L21-L47】 |
| **Medium** | Migration Hygiene | Multiple migrations reapply the same audit hardening, making it difficult to reason about the final policy state and increasing drift risk. | Consolidate redundant `audit_logs` / `client_access_logs` policy migrations and add automated verification scripts to assert the desired policy set. 【F:supabase/migrations/20251006223342_ed1426e5-4483-4dfd-b192-ef11d7f82d9f.sql†L1-L159】【F:supabase/migrations/20251007000656_f3ea5a78-d3cd-4956-abec-8ccf21d10729.sql†L1-L63】【F:supabase/migrations/20251007001756_be0acb70-b8d8-4771-a9b7-c4e3eee99c67.sql†L1-L112】 |
| **Low** | Consent Auditing | The UI logs a single client view on profile mount even though subsequent tabs trigger additional PHI queries (`structured_notes`, `recordings`, `uploaded_files`). | Consider contextual logging (e.g., include access_method per tab) or rely on backend triggers to differentiate PHI surface areas for more granular audit trails. 【F:src/pages/ClientProfile.tsx†L35-L120】 |
| **Low** | Monitoring | No automated alert ties into `client_access_logs` or `audit_logs` to highlight suspicious patterns despite the presence of `get_suspicious_access_patterns`. | Schedule a Supabase Edge function or external job to run the RPC and notify security admins when thresholds are crossed. 【F:supabase/migrations/20251006215622_4b261cfd-46e0-43f2-a2c4-525f18483360.sql†L192-L216】 |
| **Low** | UX / Security Messaging | Logging failures in the UI only hit `console.error`, providing no operator visibility if audit inserts fail persistently. | Emit telemetry to a centralized monitoring channel (e.g., Sentry) when RPC calls fail so compliance issues surface quickly. 【F:src/components/clients/ClientsList.tsx†L139-L143】【F:src/pages/ClientProfile.tsx†L112-L119】 |

## 3. Code Quality Assessment
- **Strengths**: Strong separation of concerns (hooks vs. components), centralized audit helper, and typed Supabase interactions keep the codebase approachable. Tailwind token usage is consistent across components. 【F:src/lib/clientAudit.ts†L1-L182】【F:src/components/clients/ClientsList.tsx†L1-L185】
- **Issues**:
  - Sequential PHI logging in `useConversations` hampers responsiveness. 【F:src/hooks/useConversations.ts†L31-L47】
  - `ClientProfile` duplicates Supabase queries for every tab without caching; React Query keys are distinct but do not coordinate refetch triggers, increasing load. 【F:src/pages/ClientProfile.tsx†L35-L110】
  - Lack of error boundaries or fallback UI for audit failures could hide misconfigurations (only console logging). 【F:src/components/clients/ClientsList.tsx†L139-L143】
- **Opportunities**: Introduce integration tests around audit logging, and refactor logging to a single `useClientViewLogger` hook invocation site (list + profile) to avoid divergent behavior. 【F:src/lib/clientAudit.ts†L135-L182】

## 4. Database Review
- **RLS Strengths**: Part 2 consent enforcement checks revoked, expiry, and granted timestamps; patient assignment validation now verifies program membership and clinical roles. 【F:supabase/migrations/20251006223342_ed1426e5-4483-4dfd-b192-ef11d7f82d9f.sql†L15-L117】
- **RLS Gaps**: Audit log insert policy remains overly permissive, permitting forged access entries. 【F:supabase/migrations/20251006235557_c7739969-5525-4af3-977e-661007e1f4aa.sql†L44-L50】
- **Indexes**: Recent migrations add targeted indexes for consent expiry, audit resource lookups, and access log queries, supporting scalability. 【F:supabase/migrations/20251006223342_ed1426e5-4483-4dfd-b192-ef11d7f82d9f.sql†L153-L160】
- **Schema Hygiene**: Repeated migrations for the same policies increase drift risk; consider snapshots or automated diffs to guarantee final intent. 【F:supabase/migrations/20251007001756_be0acb70-b8d8-4771-a9b7-c4e3eee99c67.sql†L1-L112】

## 5. Maintainability Review
- **Organization**: React feature folders and Supabase integration typing make onboarding manageable.
- **Documentation**: Extensive security docs exist, but no single source of truth verifies live audit coverage—documenting expected UI audit touchpoints would help.
- **Testing**: Minimal coverage around security helpers (`clientAudit` tests exist but front-end integration is untested). 【F:src/lib/__tests__/clientAudit.test.ts†L28-L176】
- **Dependencies**: Supabase client usage is consistent; consider centralizing rate-limit handling to avoid duplicating `rpc` checks in hooks.

## 6. Prioritized Action Items
- **Critical (Immediate)**: Log every client list fetch and ensure PHI displays can only occur after `log_client_view()` succeeds. 【F:src/components/clients/ClientsList.tsx†L24-L144】
- **High (≤ 1 Week)**: Tighten `client_access_logs` insert policy to prevent forged entries; ideally route all writes through a SECURITY DEFINER function. 【F:supabase/migrations/20251006235557_c7739969-5525-4af3-977e-661007e1f4aa.sql†L44-L50】
- **Medium (≤ 1 Month)**: Optimize audit logging concurrency in `useConversations` and deduplicate migrations for easier compliance verification. 【F:src/hooks/useConversations.ts†L31-L47】【F:supabase/migrations/20251007001756_be0acb70-b8d8-4771-a9b7-c4e3eee99c67.sql†L1-L112】
- **Low (Future)**: Add proactive monitoring around audit RPC failures and scheduled jobs that run `get_suspicious_access_patterns`. 【F:supabase/migrations/20251006215622_4b261cfd-46e0-43f2-a2c4-525f18483360.sql†L192-L216】
