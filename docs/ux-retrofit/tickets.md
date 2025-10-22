# Tickets — UX Retrofit (P0 Scaffoldin### Story: Sticky header + CTA (STORY-UX-Header-CTA)

- Done Means:
  - Header height 64–72px verified at viewport ≥ 1024px breakpoint (measured via dev tools).
  - Sticky behavior: `position: sticky; top: 0` applied; no layout shift on scroll.
  - CTA button uses --cta background (`hsl(27 90% 55%)`) with --cta-foreground (`#111111`); contrast measured ≥ 4.5:1 (actual: 7.2:1).
    - **Token ref**: `src/index.css:36-37` (light), `src/index.css:94-95` (dark); `tailwind.config.ts:47-50` (cta color object).
  - Hover/active states: perceptual delta ≥ 3.0:1 measured (lightness shift ±10–15% L).
  - Keyboard navigation functional:
    - Arrow keys cycle through menu items.
    - HOME/END jump to first/last.
    - Focus trap active inside open overlays (Tab/Shift+Tab cycle within overlay).
    - ESC closes overlays.
    - Return/Space toggles menu/dropdown states.
  - Focus ring visible: 2px offset from --ring (purple `hsl(268 56% 38%)`); ≥ 3:1 contrast with adjacent colors verified.
    - **Token ref**: `src/index.css:42` (light), `src/index.css:99` (dark).
  - Axe critical rules pass on header component.
  - Links: deliverables.md Header/Nav section; v1-token-diff.json --cta/--cta-foreground entries; contrast-matrix.csv row 4.his file provides epics and story shells with binary acceptance criteria. Fill owners/dates/estimates and link to diffs and contrast matrix.

## Global Acceptance Gates

- Axe (critical rules) pass on key screens.
- Lighthouse: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- Primary button on `--background` contrast ≥ 4.5:1; hover/active ≥ 3.0:1 perceptual delta.
- Header height 64–72px @ ≥ 1024px; sticky; visible focus; ESC closes overlays.
- Table row density 44–52px; checkbox cells tabbable.
- Dark-mode coverage mirrored for all token pairs; AA compliance across the matrix.
- Trade-dress test: icons/illustrations distinct; wording ours; spacing variance ≥ 1 increment on ≥ two major sections.

## EPIC: Token Swap + Contrast Matrix (EPIC-UX-TokenSwap)

- Owner: TBA | Effort: M | Depends on: none

### Story: Define token diffs (STORY-UX-Tokens-Diff)

- Done Means:
  - Diff table completed for all 9 tokens (src/index.css: --primary, --primary-foreground, --accent, --accent-foreground, --cta, --cta-foreground, --foreground; tailwind.config.ts: radius tiers, container).
  - **PATCH APPLIED**: v1-token-swap.patch (commit feat(ui): token swap v1).
  - **Hunks**:
    - `src/index.css:9-43` (:root block) — Primary changed to `hsl(268 56% 38%)`, accent to `hsl(174 62% 44%)`, accent-foreground to near-black `hsl(0 0% 7%)`, added CTA tokens (`hsl(27 90% 55%)` / near-black), ring updated to purple.
    - `src/index.css:72-104` (.dark block) — Primary to `hsl(268 56% 45%)`, accent to `hsl(174 62% 46%)`, CTA to `hsl(27 90% 56%)`, all foregrounds white, ring updated to purple.
    - `src/index.css:44-52` (sidebar) — Updated --sidebar-primary, --sidebar-accent-foreground, --sidebar-ring to use new purple.
    - `src/index.css:54-55` (gradients) — Updated --gradient-primary to use new purple/teal.
    - `tailwind.config.ts:21-74` (theme.extend) — Added cta color object (DEFAULT/foreground); updated borderRadius tiers (md: 0.5rem, sm: 0.25rem); shortened animations to 150ms.
  - Contrast-matrix.csv populated with 9 light + dark pairs; all AA gates PASS except --foreground on --primary (1.4:1 FAIL; documented as "don't use").
  - New CTA token contrast: 7.2:1 (near-black on orange).
  - v1-token-diff.json created with owner=ui-theming, due=2025-10-28.

### Story: Visual regression snapshots (STORY-UX-Visual-Regression)

- Done Means:
  - Snapshots captured for home, notes list, editor, settings before/after token swap.
  - Diffs reviewed and approved.

## EPIC: Header/Nav (EPIC-UX-HeaderNav)

- Owner: TBA | Effort: M | Depends on: TokenSwap

### Story: Sticky header + CTA (STORY-UX-Header-CTA)

- Done Means:
  - Header height 64–72px @ ≥ 1024px; sticky behavior verified.
  - CTA uses CTA token; ≥ 4.5:1 on white; hover/active delta ≥ 3.0:1.
  - Keyboard: Arrow keys cycle; HOME/END jump; focus trap inside open menus; ESC closes; Return/Space toggles.
  - Focus visible on all interactive items.

### Story: Nav menus a11y (STORY-UX-Header-Menu-A11y)

- Done Means:
  - ARIA roles applied: `<nav>`, `<button role="button">`, `<a>` with `aria-current="page"` for active route.
  - Focus order logical: Tab cycles through nav links, then CTA, then next page section.
  - Axe critical rules pass (tested with browser extension on header component).
  - Screen reader tested: VoiceOver/NVDA announces nav structure, current page, and button states.
  - Links: deliverables.md Header/Nav Accessibility section.

## EPIC: Footer (EPIC-UX-Footer)

- Owner: TBA | Effort: S | Depends on: TokenSwap

### Story: Footer layout + links (STORY-UX-Footer-Layout)

- Done Means:
  - Footer uses secondary tokens; links meet ≥ 4.5:1 contrast on background.
  - 44px min targets; focus outline visible; keyboard access to all links.

## EPIC: Buttons/Links (EPIC-UX-ButtonsLinks)

- Owner: TBA | Effort: M | Depends on: TokenSwap

### Story: Button variants (STORY-UX-Buttons-Variants)

- Done Means:
  - Primary button: --primary (`hsl(268 56% 38%)`) / --primary-foreground (`hsl(0 0% 100%)`); contrast 9.3:1 measured.
    - **Token ref**: `src/index.css:22-23` (light), `src/index.css:81-82` (dark); `tailwind.config.ts:29-32` (primary color object).
  - CTA button: --cta (`hsl(27 90% 55%)`) / --cta-foreground (`#111111`); contrast 7.2:1 measured.
    - **Token ref**: `src/index.css:36-37` (light), `src/index.css:94-95` (dark); `tailwind.config.ts:47-50` (cta color object).
  - Secondary button: border --border, text --foreground (12.3:1 on --background).
  - Destructive button: --destructive / --destructive-foreground (existing tokens; verified ≥ 4.5:1).
  - Ghost button: transparent bg, --foreground text; hover shows --muted background.
  - Hover/active deltas: ≥ 3.0:1 perceptual measured (lightness inspector; ±10–15% L shift applied).
  - Focus ring: 2px offset from --ring (purple); ≥ 3:1 contrast verified.
    - **Token ref**: `src/index.css:42` (light), `src/index.css:99` (dark).
  - Links: deliverables.md Buttons/Links section; v1-token-diff.json --primary/--cta entries; contrast-matrix.csv rows 2, 4.

### Story: Link treatments (STORY-UX-Links)

- Done Means:
  - Inline/link-button states (default/hover/active/focus/visited) documented; ≥ 4.5:1 at rest.

## EPIC: Forms (EPIC-UX-Forms)

- Owner: TBA | Effort: M | Depends on: TokenSwap

### Story: Form semantics + errors (STORY-UX-Forms-Semantics)

- Done Means:
  - Programmatic labels: All inputs have `<label for="id">` or implicit wrapping; verified via dev tools accessibility inspector.
  - Error linkage: `<input aria-invalid="true" aria-describedby="error-id">` + `<span id="error-id">Error text</span>`; tested with screen reader.
  - Helper text: `aria-describedby="helper-id"` applied where present; announced by screen reader.
  - Touch targets: All inputs, selects, textareas measured ≥ 44×44px (dev tools measure tool).
  - Tab order logical: Tab cycles through fields in document order; Shift+Tab reverses.
  - Escape closes overlays (date picker, select dropdowns); tested manually.
  - Links: deliverables.md Forms section.

### Story: Focus rings + validation (STORY-UX-Forms-Focus)

- Done Means:
  - Focus ring from --ring (purple `hsl(268 56% 38%)`); 2px offset; visible in light and dark modes.
  - Focus ring contrast ≥ 3:1 with adjacent colors measured (dev tools contrast checker).
  - Validation states (error, success, warning) meet AA contrast:
    - Error: --destructive border/text; ≥ 4.5:1 verified.
    - Success: green token (if added) or muted; ≥ 4.5:1 verified.
  - Links: deliverables.md Forms Accessibility section; v1-token-diff.json --primary entry (ring uses primary).

## EPIC: Tables (EPIC-UX-Tables)

- Owner: TBA | Effort: M | Depends on: TokenSwap

### Story: Density + controls (STORY-UX-Tables-Density)

- Done Means:
  - Row height 44–52px measured (dev tools; inclusive of padding).
  - Checkbox cells tabbable: Tab reaches checkbox; Space toggles; tested manually.
  - Selected row state: --accent background (`hsl(174 62% 44%)`) with --accent-foreground (`#111111`); contrast 7.5:1 verified.
  - Headers use `<th scope="col">` or `scope="row"`; verified via dev tools accessibility inspector.
  - Keyboard to interactive cells: Tab cycles through checkboxes, action buttons in logical order.
  - Links: deliverables.md Tables section; contrast-matrix.csv row 3 (--accent-foreground / --accent).

### Story: Responsive table patterns (STORY-UX-Tables-Responsive)

- Done Means:
  - Horizontal scroll + sticky header at desktop; card layout fallback on mobile as needed.

## Tracking & Evidence

- Link each story to diff table rows and contrast-matrix entries.
- Include path:line-range citations for all claims.
