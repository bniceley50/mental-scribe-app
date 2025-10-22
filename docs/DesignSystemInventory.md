# Design System Inventory

**Repository**: bniceley50/mental-scribe-app  
**Last Updated**: 2025-10-22  
**Design Inspiration**: CareLogic/Qualifacts public site (system emulation, no asset copying)

---

## 1. Color Tokens

### 1.1 Primary Palette (Light Mode)

| Token | HSL Value | Hex Approx | Usage | Contrast |
|-------|-----------|------------|-------|----------|
| `--primary` | `268 56% 38%` | #5C3C92 | Primary actions, brand | AAA text |
| `--primary-foreground` | `0 0% 100%` | #FFFFFF | Text on primary | 9.3:1 ✅ |
| `--accent` | `174 62% 44%` | #2AB0A8 | Secondary actions, highlights | AA/AAA |
| `--accent-foreground` | `0 0% 7%` | #111111 | Text on accent | 7.5:1 ✅ |
| `--cta` | `27 90% 55%` | #F5803E | Call-to-action | AA/AAA |
| `--cta-foreground` | `0 0% 7%` | #111111 | Text on CTA | 7.2:1 ✅ |

### 1.2 Neutrals (Light Mode)

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--background` | `210 25% 98%` | #F8F9FB | Page background |
| `--foreground` | `210 20% 20%` | #2A3441 | Body text |
| `--card` | `0 0% 100%` | #FFFFFF | Card backgrounds |
| `--card-foreground` | `210 20% 20%` | #2A3441 | Text on cards |
| `--popover` | `0 0% 100%` | #FFFFFF | Popover backgrounds |
| `--popover-foreground` | `210 20% 20%` | #2A3441 | Text in popovers |
| `--secondary` | `210 15% 96%` | #F2F3F5 | Secondary surfaces |
| `--secondary-foreground` | `210 20% 30%` | #3D4E5C | Text on secondary |
| `--muted` | `210 20% 95%` | #EFF1F3 | Muted backgrounds |
| `--muted-foreground` | `210 15% 50%` | #737E8C | Muted text |

### 1.3 Status Colors

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--destructive` | `0 70% 55%` | #E84855 | Errors, delete actions |
| `--destructive-foreground` | `0 0% 100%` | #FFFFFF | Text on destructive |

### 1.4 Borders & Inputs

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--border` | `210 20% 90%` | #DADFE5 | Borders |
| `--input` | `210 20% 92%` | #E3E7EB | Input backgrounds |
| `--ring` | `268 56% 38%` | #5C3C92 | Focus rings (primary) |

### 1.5 Dark Mode Palette

| Token | Light Value | Dark Value | Notes |
|-------|-------------|------------|-------|
| `--background` | `210 25% 98%` | `210 25% 8%` | Inverted |
| `--foreground` | `210 20% 20%` | `210 20% 95%` | Inverted |
| `--primary` | `268 56% 38%` | `268 56% 45%` | Slightly lighter |
| `--accent` | `174 62% 44%` | `174 62% 46%` | Slightly lighter |
| `--cta` | `27 90% 55%` | `27 90% 56%` | Slightly lighter |
| `--card` | `0 0% 100%` | `210 20% 12%` | Dark surface |
| `--secondary` | `210 15% 96%` | `210 20% 18%` | Dark surface |

---

## 2. Spacing Scale

### 2.1 Tailwind Default Scale

```
0   → 0px
0.5 → 0.125rem (2px)
1   → 0.25rem (4px)
2   → 0.5rem (8px)
3   → 0.75rem (12px)
4   → 1rem (16px)
5   → 1.25rem (20px)
6   → 1.5rem (24px)
8   → 2rem (32px)
10  → 2.5rem (40px)
12  → 3rem (48px)
16  → 4rem (64px)
20  → 5rem (80px)
24  → 6rem (96px)
```

### 2.2 Common Usage Patterns

| Use Case | Spacing | Example |
|----------|---------|---------|
| Inner padding (small) | `p-3` | 12px |
| Inner padding (medium) | `p-4` | 16px |
| Inner padding (large) | `p-6` | 24px |
| Section spacing | `gap-6` | 24px |
| Vertical rhythm | `space-y-8` | 32px |
| Container padding | `px-6 py-8` | 24px H, 32px V |

---

## 3. Shape & Radii

### 3.1 Border Radius Tokens

**File**: `src/index.css`, `tailwind.config.ts`

```css
--radius: 0.75rem;  /* 12px base */

Tailwind extends:
├── rounded-lg: 0.75rem (var(--radius))
├── rounded-md: 0.5rem (calc(var(--radius) - 0.25rem))
└── rounded-sm: 0.25rem (calc(var(--radius) - 0.5rem))
```

### 3.2 Common Usage

| Component | Radius | Value |
|-----------|--------|-------|
| Buttons | `rounded-md` | 8px |
| Cards | `rounded-lg` | 12px |
| Inputs | `rounded-md` | 8px |
| Dialogs | `rounded-lg` | 12px |
| Badges | `rounded-full` | 9999px |
| Avatar | `rounded-full` | 9999px |

---

## 4. Elevation & Shadows

### 4.1 Shadow Tokens

**File**: `src/index.css`

```css
--shadow-soft: 0 2px 8px -2px hsl(210 20% 50% / 0.08);
--shadow-medium: 0 4px 16px -4px hsl(210 20% 50% / 0.12);
--shadow-card: 0 1px 3px hsl(210 20% 50% / 0.05);
```

### 4.2 Tailwind Shadow Classes

| Class | Usage | Elevation Level |
|-------|-------|-----------------|
| `shadow-sm` | Subtle elevation | Level 1 |
| `shadow` | Default cards | Level 2 |
| `shadow-md` | Hovered cards | Level 3 |
| `shadow-lg` | Modals, dialogs | Level 4 |
| `shadow-xl` | Top-level overlays | Level 5 |

---

## 5. Typography

### 5.1 Font Stack

**System Fonts** (from `src/index.css`):

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans',
    'Droid Sans', 'Helvetica Neue', sans-serif;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas,
    'Courier New', monospace;
}
```

### 5.2 Size Scale

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 0.75rem (12px) | 1rem | Captions, labels |
| `text-sm` | 0.875rem (14px) | 1.25rem | Body small |
| `text-base` | 1rem (16px) | 1.5rem | Body |
| `text-lg` | 1.125rem (18px) | 1.75rem | Subheadings |
| `text-xl` | 1.25rem (20px) | 1.75rem | Headings H3 |
| `text-2xl` | 1.5rem (24px) | 2rem | Headings H2 |
| `text-3xl` | 1.875rem (30px) | 2.25rem | Headings H1 |
| `text-4xl` | 2.25rem (36px) | 2.5rem | Hero headings |

### 5.3 Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasized text |
| `font-semibold` | 600 | Subheadings |
| `font-bold` | 700 | Headings |

---

## 6. Motion & Transitions

### 6.1 Timing Functions

**File**: `src/index.css`

```css
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

**Tailwind Defaults**:
```
ease-linear: linear
ease-in: cubic-bezier(0.4, 0, 1, 1)
ease-out: cubic-bezier(0, 0, 0.2, 1)
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

### 6.2 Duration Scale

| Class | Duration | Usage |
|-------|----------|-------|
| `duration-100` | 100ms | Quick hover states |
| `duration-150` | 150ms | Default transitions |
| `duration-200` | 200ms | Complex state changes |
| `duration-300` | 300ms | Enter/exit animations |

### 6.3 Animations

**File**: `tailwind.config.ts`

```typescript
animations: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out",
  "fade-in": "fade-in 150ms ease",
  "slide-in": "slide-in 150ms ease",
  "scale-in": "scale-in 150ms ease",
}
```

---

## 7. Layout Grid

### 7.1 Container Widths

**File**: `tailwind.config.ts`

```typescript
container: {
  center: true,
  padding: "2rem",
  screens: {
    "2xl": "1400px",
  },
}
```

### 7.2 Breakpoints (Tailwind Defaults)

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

---

## 8. Hard-Coded Utilities Inventory

### 8.1 Remaining Hard-Coded Colors

**File**: `src/components/ChatInterface.tsx`

```typescript
Line 915:  border-purple-500/20 bg-purple-500/5
Line 926:  text-purple-600
```

**Context**: Part 2 (42 CFR) protected session checkbox

**Recommended Mapping**:
```
border-purple-500/20 → border-primary/20
bg-purple-500/5      → bg-primary/5
text-purple-600      → text-primary
```

### 8.2 Recently Fixed (from last-diff)

✅ All hard-coded colors converted to semantic tokens in:
- `src/components/Part2Badge.tsx`
- `src/components/PrivacyFooter.tsx`
- `src/components/WelcomeGuide.tsx`
- `src/pages/Auth.tsx`
- `src/pages/NotFound.tsx`

---

## 9. Component Library (shadcn/ui)

### 9.1 Installed Components

**Directory**: `src/components/ui/`

**Count**: 47 components

**All components use semantic tokens** ✅

### 9.2 Button Variants

**File**: `src/components/ui/button.tsx`

```typescript
Variants:
├── default       → primary purple background
├── destructive   → red background (errors)
├── outline       → transparent with border
├── secondary     → light gray background
├── ghost         → transparent, hover accent
└── link          → text-only with underline
```

---

## 10. Design System Files

### 10.1 Source of Truth

| File | Purpose | Lines |
|------|---------|-------|
| `src/index.css` | Token definitions (CSS vars) | 120 |
| `tailwind.config.ts` | Tailwind wiring | 108 |
| `src/components/ui/*` | Component primitives | 47 files |

### 10.2 Verification Command

```typescript
// Run in browser console
getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
// Expected: "268 56% 38%"

getComputedStyle(document.documentElement).getPropertyValue('--cta').trim();
// Expected: "27 90% 55%"

getComputedStyle(document.documentElement).getPropertyValue('--accent-foreground').trim();
// Expected: "0 0% 7%"
```

---

## 11. CareLogic Emulation Notes

### 11.1 Emulated Characteristics

✅ **Primary Purple**: 268° hue (violet-purple), 56% saturation, 38% lightness  
✅ **Accent Teal**: 174° hue (cyan-teal), 62% saturation, 44% lightness  
✅ **CTA Orange**: 27° hue (orange), 90% saturation, 55% lightness  
✅ **Neutral Grays**: Cool-toned (210° hue) for professional feel  
✅ **High Contrast**: All text meets WCAG AA/AAA standards

### 11.2 NOT Copied/Emulated

❌ No trademarked icons  
❌ No proprietary imagery  
❌ No copyrighted wording  
❌ System patterns only, not specific layouts

---

## 12. Recommendations

### 12.1 Missing Tokens

Consider adding:
```css
/* Gradient tokens */
--gradient-primary: linear-gradient(135deg, hsl(268 56% 38%), hsl(174 62% 44%));
--gradient-subtle: linear-gradient(180deg, hsl(0 0% 100%), hsl(210 25% 98%));

/* Additional semantic tokens */
--success: 142 71% 45%;
--success-foreground: 0 0% 100%;
--warning: 38 92% 50%;
--warning-foreground: 0 0% 100%;
```

### 12.2 Shell & Rhythm

**Header Height**: Add explicit `h-16` or `h-18` (64-72px)  
**Container Max Width**: Consider 1280-1400px for consistency  
**Vertical Rhythm**: Use 48-72px section spacing  
**Gutters**: Minimum 24px (p-6) on mobile

---

**Inventory Compiled By**: Principal Full-Stack Engineer + UI Retrofit Lead  
**Date**: 2025-10-22  
**Files Analyzed**: 120+ project files  
**Evidence**: All values from src/index.css:10-119, tailwind.config.ts:22-104
