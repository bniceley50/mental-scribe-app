# Mental Scribe Security & Architecture Review (2025-10-12)

## 1. Executive Summary
- **Overall Security Grade**: B (improving)
- **Critical Findings**: 1
- **High Findings**: 1
- **Medium Findings**: 2
- **Low Findings**: 3
- **Code Quality Assessment**: Centralized audit helpers and extensive Supabase policy hardening keep the codebase coherent, though frontend logging workflows still mix blocking and fire-and-forget calls that are hard to reason about.
- **Maintainability Score**: B+ (new audit utilities and tests raise confidence, but redundant migrations and missing telemetry reduce operational clarity).
- **Remediation Highlights**:
  - Client detail views now invoke `logClientView()` on mount via the shared helper, ensuring HIPAA trail coverage for profile reads.【F:src/pages/ClientProfile.tsx†L35-L120】【F:src/lib/clientAudit.ts†L32-L180】
  - Conversation lists trigger audit RPC calls per row, closing the earlier blind spot for chat history access (albeit with sequential latency).【F:src/hooks/useConversations.ts†L21-L67】
  - Dedicated `clientAudit` unit tests cover success, error, and concurrency paths, proving the helper behaves safely under failure conditions.【F:src/lib/__tests__/clientAudit.test.ts†L1-L194】

## 2. Security Findings
| Severity | Area | Finding | Recommendation |
| --- | --- | --- | --- |
| **Critical** | Audit Logging | Client directories still render PHI immediately after the React Query fetch with no pre-render call to `log_client_view()`, so list-level browsing is invisible to the audit trail (only the per-card "View" button logs access).【F:src/components/clients/ClientsList.tsx†L24-L150】【F:src/lib/clientAudit.ts†L135-L158】 | Invoke `batchLogClientViews` (or an equivalent guard) as soon as the client list query resolves and postpone rendering until logging settles, or enforce logging server-side via a SECURITY DEFINER wrapper. |
| **High** | Audit Integrity | The `client_access_logs_service_insert` policy still uses `WITH CHECK (true)`, allowing any authenticated user to forge audit rows with arbitrary `accessed_by` or `access_method` values, undermining chain-of-custody guarantees.【F:supabase/migrations/20251006235557_c7739969-5525-4af3-977e-661007e1f4aa.sql†L12-L72】 | Restrict inserts to the `service_role` or enforce `WITH CHECK (auth.uid() = accessed_by)` alongside column defaults to ensure the logger cannot spoof other identities. |
| **Medium** | Performance / Rate Limiting | `useConversations` loops through each conversation and awaits every `log_client_view` call sequentially, multiplying latency and risking RPC rate limits for large datasets.【F:src/hooks/useConversations.ts†L31-L47】 | Switch to `Promise.allSettled` or move bulk logging into a single RPC (`log_conversation_list_access`) so UI loads stay snappy while maintaining coverage. |
| **Medium** | Migration Hygiene | Numerous migrations reapply the same audit/consent policies, obscuring the final state and making compliance verification brittle during incident response.【F:supabase/migrations/20251006223342_ed1426e5-4483-4dfd-b192-ef11d7f82d9f.sql†L1-L203】【F:supabase/migrations/20251007000656_f3ea5a78-d3cd-4956-abec-8ccf21d10729.sql†L1-L63】【F:supabase/migrations/20251007001756_be0acb70-b8d8-4771-a9b7-c4e3eee99c67.sql†L1-L112】 | Consolidate redundant policy migrations, add regression tests that assert the desired policy set, and document canonical DDL snapshots for auditors. |
| **Low** | Consent Auditing | Client profile mounts emit a single audit log even though subsequent tabs trigger additional PHI queries (notes, recordings, files), reducing trail granularity for regulators.【F:src/pages/ClientProfile.tsx†L56-L120】 | Pass contextual `access_method` values per tab or add backend triggers so each dataset view produces a distinct audit entry. |
| **Low** | Monitoring | Although `get_suspicious_access_patterns` exists, no scheduled job or telemetry promotes its insights, leaving security teams blind to anomalous access bursts.【F:supabase/migrations/20251006215622_4b261cfd-46e0-43f2-a2c4-525f18483360.sql†L212-L248】 | Schedule a Supabase Edge function (or external cron) that runs the RPC, pushes alerts to SIEM/SOC tooling, and records review acknowledgements. |
| **Low** | UX / Error Surfacing | Audit RPC failures are still logged only to the browser console, so persistent logging outages could go unnoticed by operators.【F:src/components/clients/ClientsList.tsx†L136-L144】【F:src/pages/ClientProfile.tsx†L112-L119】 | Pipe failures to observability tooling (Sentry, Logflare) or Supabase functions so compliance owners receive real-time alerts. |

## 3. Code Quality Assessment
- **Strengths**: Shared audit helpers auto-detect access context and expose batch logging, which simplifies future enforcement once adopted broadly.【F:src/lib/clientAudit.ts†L32-L158】 React Query segregation keeps data fetching encapsulated and testable, while new vitest suites validate audit helper edge cases.【F:src/lib/__tests__/clientAudit.test.ts†L1-L194】
- **Issues**:
  - Sequential logging in `useConversations` can freeze the UI for large panels and may retrigger the RPC on every subscription refresh.【F:src/hooks/useConversations.ts†L21-L67】
  - Client list rendering still mixes rendering and logging responsibilities, leaving compliance-critical behavior scattered across event handlers.【F:src/components/clients/ClientsList.tsx†L96-L150】
  - Console-only error reporting for audit failures complicates debugging production incidents.【F:src/lib/clientAudit.ts†L46-L60】
- **Opportunities**: Promote `useClientViewLogger` to a hook used by both list and detail views, and introduce integration tests that mount `ClientsList`/`ClientProfile` to assert RPC invocations alongside failure fallbacks.【F:src/lib/clientAudit.ts†L175-L182】【F:src/lib/__tests__/clientAudit.test.ts†L145-L194】

## 4. Database Review
- **RLS Strengths**: Enhanced consent and assignment functions enforce program membership, revoked/expiry checks, and clinical role validation across all PHI tables, significantly reducing over-exposure risk.【F:supabase/migrations/20251006223342_ed1426e5-4483-4dfd-b192-ef11d7f82d9f.sql†L15-L142】
- **RLS Gaps**: `client_access_logs_service_insert` remains permissive, letting end-users forge audit inserts despite otherwise strict policies.【F:supabase/migrations/20251006235557_c7739969-5525-4af3-977e-661007e1f4aa.sql†L44-L50】
- **Indexes**: Added consent/audit indexes improve scalability for compliance reporting and anomaly detection workloads.【F:supabase/migrations/20251006223342_ed1426e5-4483-4dfd-b192-ef11d7f82d9f.sql†L153-L194】
- **Schema Hygiene**: Repeated policy recreation across migrations complicates drift detection and manual verification during audits.【F:supabase/migrations/20251007001756_be0acb70-b8d8-4771-a9b7-c4e3eee99c67.sql†L1-L112】

## 5. Maintainability Review
- **Organization**: Feature folders and typed Supabase clients keep implementation approachable, and shared logging helpers reduce duplication.【F:src/lib/clientAudit.ts†L32-L182】
- **Documentation**: The security corpus remains extensive, but a living checklist that maps UI surfaces to audit expectations would help future reviewers confirm coverage quickly.【F:docs/SECURITY_HARDENING_VERIFICATION.md†L1-L112】
- **Testing**: Unit coverage around audit helpers improved, yet no integration tests validate that UI flows actually invoke `log_client_view()` before rendering PHI.【F:src/lib/__tests__/clientAudit.test.ts†L1-L194】【F:src/components/clients/ClientsList.tsx†L24-L150】
- **Dependencies**: Supabase client usage is consistent; consider abstracting logging retries/backoff into the helper to standardize resilience across components.【F:src/lib/clientAudit.ts†L32-L158】

## 6. Prioritized Action Items
- **Critical (Immediate)**: Ensure client directory results call `log_client_view()` (batch or server-side) before PHI is displayed.【F:src/components/clients/ClientsList.tsx†L24-L150】
- **High (≤ 1 Week)**: Harden `client_access_logs` inserts by constraining the policy or moving to a SECURITY DEFINER RPC that controls every field.【F:supabase/migrations/20251006235557_c7739969-5525-4af3-977e-661007e1f4aa.sql†L44-L50】
- **Medium (≤ 1 Month)**: Parallelize conversation logging and prune duplicate migrations so policy intent remains auditable.【F:src/hooks/useConversations.ts†L31-L47】【F:supabase/migrations/20251007001756_be0acb70-b8d8-4771-a9b7-c4e3eee99c67.sql†L1-L112】
- **Low (Future)**: Wire audit failures and suspicious-access reports into observability tooling to surface incidents quickly.【F:supabase/migrations/20251006215622_4b261cfd-46e0-43f2-a2c4-525f18483360.sql†L212-L248】【F:src/components/clients/ClientsList.tsx†L136-L144】
