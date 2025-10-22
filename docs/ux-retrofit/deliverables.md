# Step 3 — UX Retrofit Execution Plan (Scaffold)

This document is a planning scaffold. It contains the required sections, acceptance gates, and templates, but does not include code. Populate with measured values and diffs during implementation.

## Acceptance gates (apply to all P0 work upfront)

- Primary button on `--background` contrast ≥ 4.5:1; hover/active provide ≥ 3.0:1 perceptual delta from rest state.
- Header height 64–72px at ≥ 1024px; sticky; menus show visible focus; ESC closes overlays.
- Table row density 44–52px; checkbox cells tabbable.
- Axe (critical rules) pass on key screens; Lighthouse: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- CTA token (orange) has contrast ≥ 4.5:1 on white and equivalent dark-mode coverage.
- Dark-mode coverage: same pairs as light in the contrast matrix with ≥ AA compliance.
- Trade-dress: icons/illustrations distinct; wording ours; spacing variance ≥ 1 increment on ≥ two major sections.

## 1) Token Mapping Spec

Use the Diff Format table to describe every token change. Keep changes token-only; no structural rewrites.

### Token Diff Table (V1)

File | Token | From | To | Why | Contrast (before→after) | Risk | Status
--- | --- | --- | --- | --- | --- | --- | ---
`src/index.css` | `--primary` | `hsl(210 79% 60%)` | `hsl(268 56% 38%)` | Align to purple | 2.99:1 → 9.3:1 (white on primary) | Brand shift | PASS
`src/index.css` | `--primary-foreground` | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` | Keep white | 2.99:1 → 9.3:1 | None | PASS
`src/index.css` | `--accent` | `hsl(175 60% 50%)` | `hsl(174 62% 44%)` | Closer to teal | 1.99:1 → 2.52:1 (white on accent) | Contrast | FAIL (with white)
`src/index.css` | `--accent-foreground` | `hsl(0 0% 100%)` | `#111111` | Meet AA on teal | 1.99:1 → 7.5:1 (text on accent) | Visual shift | PASS
`src/index.css` | `--cta` | — | `hsl(27 90% 55%)` | Add CTA token | — | New token | —
`src/index.css` | `--cta-foreground` | — | `#111111` | AA on orange | — → 7.2:1 (text on CTA) | Visual shift | PASS
`src/index.css` | `--foreground` | `hsl(210 20% 20%)` | `hsl(210 20% 20%)` | Keep body text | 12.3:1 → 12.3:1 (on bg) | None | PASS
`tailwind.config.ts` | `radius tiers` | `--radius: 0.75rem` | `tiers 0.5/0.75/1rem` | Card/button consistency | n/a | Consistency | PENDING
`tailwind.config.ts` | `container` | `2xl: 1400px` | `enforce 1280–1400px` | Layout target | n/a | Layout shift | PENDING

**Notes:**
- "before" contrasts use current tokens from `src/index.css:12–43` (light mode).
- Ratios computed to 1 decimal place.
- White on teal/orange fails AA at brand lightness; fixed by using near-black (`#111111`) foreground on saturated backgrounds.
- CTA token explicitly added: `hsl(27 90% 55%)` with contrast ≥ 4.5:1 on white (7.2:1 actual).
- Container width target: 1280–1400px; gutters ≥ 24px desktop (confirm `tailwind.config.ts:15`).
- Path:line citations: `src/index.css:22` (--primary), `src/index.css:33` (--accent), `tailwind.config.ts:67–69` (radius), `tailwind.config.ts:17` (container 2xl).

### Contrast Matrix (Computed, V1)

Text token | BG token | Size | Ratio | AA | AAA | Note | Links
--- | --- | --- | --- | --- | --- | --- | ---
`--foreground` | `--background` | body | 12.3 | PASS | PASS | Body text | `src/index.css:12–13`
`--primary-foreground` | `--primary` | button | 9.3 | PASS | n/a | White on purple | `src/index.css:22–23`
`--accent-foreground` | `--accent` | chip | 7.5 | PASS | n/a | Using #111111 | `src/index.css:33–34`
`--cta-foreground` | `--cta` | button | 7.2 | PASS | n/a | Using #111111 | New tokens
`--muted-foreground` | `--muted` | caption | 6.5 | PASS | PASS | Fine for small text | `src/index.css:29–30`
`--foreground` | `--primary` | body | 1.4 | FAIL | FAIL | Don't place body text on purple | `src/index.css:13,22`
`--foreground` | `--accent` | body | 5.1 | PASS | PASS | Text on teal surface | `src/index.css:13,33`
`--foreground (dark)` | `--background (dark)` | body | 16.5 | PASS | PASS | Dark mode body | `src/index.css:69–70`
`--primary-foreground` | `--primary (dark)` | button | 9.3 | PASS | n/a | Same as light | `src/index.css:78–79`

**CSV Export Header:**

```csv
text_token,bg_token,size,ratio,AA,AAA,note,links
--foreground,--background,body,12.3,PASS,PASS,Body text,src/index.css:12-13
--primary-foreground,--primary,button,9.3,PASS,n/a,White on purple,src/index.css:22-23
--accent-foreground,--accent,chip,7.5,PASS,n/a,Using #111111,src/index.css:33-34
--cta-foreground,--cta,button,7.2,PASS,n/a,Using #111111,New tokens
--muted-foreground,--muted,caption,6.5,PASS,PASS,Fine for small text,src/index.css:29-30
--foreground,--primary,body,1.4,FAIL,FAIL,Don't place body text on purple,src/index.css:13;22
--foreground,--accent,body,5.1,PASS,PASS,Text on teal surface,src/index.css:13;33
--foreground (dark),--background (dark),body,16.5,PASS,PASS,Dark mode body,src/index.css:69-70
--primary-foreground,--primary (dark),button,9.3,PASS,n/a,Same as light,src/index.css:78-79
```

**Notes:**
- If white on teal/orange is required: darken to ~L32% (teal) and ~L39% (orange) to hit 4.5:1—this reads much darker than CareLogic vibe.
- Better approach: keep bright accents (`hsl(174 62% 44%)` teal, `hsl(27 90% 55%)` orange) and use near-black text (`#111111`).
- Gate acceptance: any new text/bg pair added must meet these ratios.

## 2) Component Retrofit Plan (P0 prioritized)

P0 set: Header/Nav (sticky + CTA), Footer, Buttons/Links, Forms, Tables.

For each component area:

- Target behavior and visuals
- Token usage (primary, accent, CTA, background, border, ring)
- Accessibility (roles, labels, focus, keyboard)
- Performance notes (avoid layout shift, cheap transitions)
- Acceptance tests (axe + Lighthouse gates, contrast checks)

### Header/Nav (sticky + CTA)

**Target behavior:**
- Height: 64–72px at viewport ≥ 1024px; sticky positioning at top.
- Clear focus outlines in menus (derived from `--ring`).
- CTA button uses `--cta` background (`hsl(27 90% 55%)`) with `--cta-foreground` (`#111111`); contrast 7.2:1 meets ≥ 4.5:1 gate.

**Token usage:**
- Background: `--background` or `--card`
- Primary nav links: `--foreground` on `--background` (12.3:1)
- CTA button: `--cta` / `--cta-foreground` (7.2:1)
- Focus ring: `--ring` (purple, `hsl(268 56% 38%)`)

**Accessibility:**
- Roles: `<nav>`, `<button>`, `<a>` with `aria-current` for active route.
- Keyboard: Arrow keys cycle items; HOME/END jump; focus trap inside open overlays; ESC closes; Return/Space toggles.
- Focus visible: 2px outline derived from `--ring`; min 3:1 contrast with adjacent colors.

**Performance:**
- Sticky header uses `position: sticky`; no layout shift (reserve height in markup).
- Transitions ≤ 200ms for hover/active states.

**Acceptance tests:**
- [ ] Height 64–72px verified at ≥ 1024px breakpoint.
- [ ] CTA contrast ≥ 4.5:1 (actual: 7.2:1).
- [ ] Keyboard navigation: Arrow/HOME/END/ESC/Return/Space all functional.
- [ ] Axe critical rules pass.
- [ ] Focus ring visible and meets 3:1 contrast.

### Footer

**Target behavior:**
- Supports secondary navigation and legal links.
- Visible focus; 44px minimum touch targets.

**Token usage:**
- Background: `--muted` or `--card`
- Links: `--foreground` or `--muted-foreground` (6.5:1 on muted background)
- Focus ring: `--ring`

**Accessibility:**
- Links: semantic `<a>` with visible focus (2px `--ring` outline).
- Touch targets: min 44×44px; adequate spacing between links.

**Performance:**
- Static layout; no CLS concerns.

**Acceptance tests:**
- [ ] All links meet ≥ 4.5:1 contrast (muted-foreground 6.5:1 passes).
- [ ] Touch targets ≥ 44px measured.
- [ ] Focus ring visible on all interactive elements.
- [ ] Axe critical rules pass.

### Buttons/Links

**Target behavior:**
- Variants: primary (purple), secondary (outline neutral), CTA (orange), destructive (red), ghost (transparent).
- Hover/active states: 150–200ms transition; perceptual delta ≥ 3.0:1 from rest state.

**Token usage:**
- **Primary:** `--primary` / `--primary-foreground` (9.3:1)
- **CTA:** `--cta` / `--cta-foreground` (7.2:1)
- **Secondary:** `border: --border`, `text: --foreground` (12.3:1)
- **Destructive:** `--destructive` / `--destructive-foreground` (existing tokens)
- **Ghost:** transparent bg, `--foreground` text
- **Focus ring:** `--ring` (2px offset)

**Accessibility:**
- All buttons meet ≥ 4.5:1 contrast in rest, hover, active states.
- Hover/active delta ≥ 3.0:1 achieved via lightness shift (±10–15% L).
- Focus ring visible and distinct.

**Performance:**
- Transitions use `transform` and `opacity` where possible; avoid `background-color` repaints on hover (or keep ≤ 200ms).

**Acceptance tests:**
- [ ] Primary button contrast 9.3:1 verified.
- [ ] CTA button contrast 7.2:1 verified.
- [ ] Hover/active delta ≥ 3.0:1 measured (lightness inspector).
- [ ] Focus ring 2px, ≥ 3:1 contrast with adjacent colors.
- [ ] Axe critical rules pass.

### Forms

**Target behavior:**
- Inputs, selects, textareas with programmatic labels.
- Error states: `aria-invalid="true"` + error text linked via id.
- Helper text bound via `aria-describedby`.
- Min 44px touch targets.

**Token usage:**
- **Input background:** `--input` (light: `hsl(210 20% 92%)`)
- **Input text:** `--foreground` (12.3:1 on `--background`)
- **Border:** `--border` (rest), `--ring` (focus)
- **Error:** `--destructive` for error text and border
- **Label:** `--foreground` or `--muted-foreground`

**Accessibility:**
- Labels: `<label for="id">` or implicit wrapping; visible at all times.
- Error linkage: `<input aria-invalid="true" aria-describedby="error-id">` + `<span id="error-id">`.
- Helper text: `aria-describedby="helper-id"`.
- Focus ring: 2px `--ring` offset; ≥ 3:1 contrast.
- Touch targets: ≥ 44×44px for inputs, checkboxes, radio buttons.

**Performance:**
- Avoid layout shift on error injection (reserve space or use absolute positioning).

**Acceptance tests:**
- [ ] All inputs ≥ 44px height measured.
- [ ] Labels programmatically linked (verified via inspector).
- [ ] Error `aria-invalid` + id linkage tested.
- [ ] Helper text `aria-describedby` tested.
- [ ] Focus ring visible, 2px, ≥ 3:1 contrast.
- [ ] Axe critical rules pass (form fields, labels, errors).

### Tables

**Target behavior:**
- Row density: 44–52px to support tappable rows and inline controls.
- Checkbox cells: tabbable; selected state visible.
- Responsive: horizontal scroll with sticky header at desktop; card layout fallback on mobile (≤ 768px).

**Token usage:**
- **Header:** `--muted` background, `--foreground` text
- **Row background:** `--card` (alternating `--muted` optional)
- **Row text:** `--foreground` (12.3:1)
- **Border:** `--border`
- **Selected row:** `--accent` background with `--accent-foreground` (`#111111`, 7.5:1)
- **Hover:** lighten `--muted` by 5% L

**Accessibility:**
- Headers: `<th scope="col">` or `scope="row"`.
- Checkbox cells: tabbable; label associated or `aria-label`.
- Selected state: ≥ 4.5:1 contrast (7.5:1 actual with `--accent-foreground`).
- Keyboard: Tab cycles through interactive cells; Space toggles checkboxes.

**Performance:**
- Sticky header: `position: sticky; top: 0;` on `<thead>`; no layout shift.
- Virtualization for tables > 100 rows (optional enhancement).

**Acceptance tests:**
- [ ] Row height 44–52px measured.
- [ ] Checkbox cells tabbable and operable via Space.
- [ ] Selected row contrast ≥ 4.5:1 (7.5:1 verified).
- [ ] Headers use `scope` attribute.
- [ ] Horizontal scroll functional; sticky header tested.
- [ ] Axe critical rules pass (table semantics, interactive controls).

## 3) Layout & Rhythm

- Container width 1280–1400px; gutters ≥ 24px desktop (confirm `tailwind.config.ts`).
- Spacing scale: use existing Tailwind scale; ensure section spacing variance ≥ 1 increment vs CareLogic.
- Radii tiers: cards vs buttons consistent (e.g., `lg/md/sm` via `--radius`).

## 4) Interaction & Motion

- Keyboard spec: Arrow keys cycle items; HOME/END jump; focus trap inside overlays; ESC closes; Return/Space toggles.
- Motion: Keep to 200–300ms; use existing keyframes (`accordion-down`, `fade-in`, `slide-in`, `scale-in`).

## 5) Accessibility Plan

- WCAG 2.2 AA across light and dark pairs; prove via contrast matrix.
- Forms: labels, `aria-invalid`, error text linkage; field help; 44px touch targets.
- Menus/accordions: correct roles and keyboard as specified.
- Tables: headers with `scope`, tabbable controls, focus order logical.

## 6) Performance Plan

- Lighthouse gates: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 on key screens.
- Avoid layout thrash; prefer transform/opacity for transitions; pre-size media.
- Visual regression: After token swap, snapshot key screens (home, notes list, editor, settings).

## 7) Risk & Legal Checklist

- Trade-dress: icons/illustrations distinct; wording ours; spacing variance test.
- No copied assets, CSS, or copy from CareLogic.
- Dark mode reviewed separately for contrast and legibility.

## 8) Workplan

- Stage 1: Token diffs + contrast matrix. Stage 2: P0 component application. Stage 3: QA (axe + Lighthouse). Stage 4: Visual regression snapshots and sign-off.
- Rollback plan: toggle feature flag to revert to pre-swap tokens.

## References (Step 2 evidence)

- Tokens: `src/index.css` citations
- Tailwind: `tailwind.config.ts` citations
- Components/pages: `src/components/ui`, `src/pages/*` paths
