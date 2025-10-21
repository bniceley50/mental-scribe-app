# PR Reviewer Checklist

- [ ] Build ok: `npm run build`
- [ ] Preview renders & hydrates: `npm run preview`
- [ ] CSP smoke: `npm run test:smoke:preview`
- [ ] Pagination: >20 messages → “Load older” works; order preserved
- [ ] Headers: CSP, XFO, HSTS, COOP/CORP visible in response headers
- [ ] No Radix ref warnings in dev console
- [ ] Docs present and linked (Quick Ship Card, Deploy Ready, Security Review)

## v1.3.0 specifics

- [ ] `vercel.json` includes CSP nonce + `strict-dynamic`, XFO=DENY, HSTS, COOP/CORP, Referrer, Permissions
- [ ] Pagination uses keyset by `created_at` (20/page); UI button is keyboard accessible; `aria-live="polite"`
- [ ] DB index exists: `messages(conversation_id, created_at DESC)`
- [ ] Auth UX hygiene: `autocomplete`, `autoCapitalize="none"`, `spellCheck={false}`
- [ ] Vite `^5.4.21` builds clean; no CSP console violations
