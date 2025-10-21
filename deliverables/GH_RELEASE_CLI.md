# One-command GitHub Release (gh CLI)

From repo root, publish v1.3.0 and attach the one-pager + full security review:

```bash
# macOS/Linux
gh release create v1.3.0 \
  -t "v1.3.0 – Ship-safety + Pagination v1 + A+ Security Review" \
  -F deliverables/RELEASE_v1.3.0.md \
  deliverables/QUICK_SHIP_CARD_2025-10-21.md \
  review/SECURITY_REVIEW_2025-10-21.md
```

```powershell
# Windows PowerShell
gh release create v1.3.0 `
  -t "v1.3.0 – Ship-safety + Pagination v1 + A+ Security Review" `
  -F deliverables/RELEASE_v1.3.0.md `
  deliverables/QUICK_SHIP_CARD_2025-10-21.md `
  review/SECURITY_REVIEW_2025-10-21.md
```

Notes:

- Ensure you have gh CLI authenticated: `gh auth login`
- Swap the tag/title if you pick a different version. Body file and assets remain valid.
