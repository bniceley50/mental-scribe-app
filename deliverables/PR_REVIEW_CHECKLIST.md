# PR Reviewer Checklist

- [ ] Build ok: `npm run build`
- [ ] Preview renders & hydrates: `npm run preview`
- [ ] CSP smoke: `npm run test:smoke:preview`
- [ ] Pagination: >20 messages → “Load older” works; order preserved
- [ ] Headers: CSP, XFO, HSTS, COOP/CORP visible in response headers
- [ ] No Radix ref warnings in dev console
- [ ] Docs present and linked (Quick Ship Card, Deploy Ready, Security Review)
