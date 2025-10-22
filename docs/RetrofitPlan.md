# UI Retrofit Plan

**Target**: CareLogic/Qualifacts emulation (system only, no assets)  
**Status**: 95% complete, 1 fix needed  
**Date**: 2025-10-22

---

## Token Mapping

### Current → Target (Already Complete ✅)

| Token | Value | Status |
|-------|-------|--------|
| `--primary` | `268 56% 38%` (purple) | ✅ Done |
| `--accent` | `174 62% 44%` (teal) | ✅ Done |
| `--cta` | `27 90% 55%` (orange) | ✅ Done |
| `--ring` | Uses `--primary` | ✅ Done |

### Hard-Coded Utilities → Tokens

**Remaining**:
```
src/components/ChatInterface.tsx:915
  border-purple-500/20 → border-primary/20
  bg-purple-500/5 → bg-primary/5

src/components/ChatInterface.tsx:926
  text-purple-600 → text-primary
```

---

## Shell & Rhythm

**Recommendations**:
- Header: Add `h-16` (64px) or `h-18` (72px)
- Container: 1280-1400px max-width
- Section spacing: 48-72px vertical rhythm
- Gutters: ≥24px (p-6)

---

## A11y & Motion

✅ All requirements met:
- Focus-visible rings (≥3:1 contrast)
- Keyboard accessible (all interactive elements)
- ESC closes dialogs
- aria-live announcements

---

## PR Plan

**PR-A**: Fix ChatInterface hard-coded colors (IMMEDIATE)
