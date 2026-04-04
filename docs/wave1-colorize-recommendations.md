# Wave 1: Colorize Recommendations

**Date:** 2026-04-04
**Scope:** `tokens.css`, `base.css`, `layout.css`, `components.css`, `states.css`, `trust-framework.html`
**Constraint:** All changes must serve "efficient, explicit, engineered" -- color encodes state, never decorates.

---

## Current State Assessment

### What is working well
- **Token architecture is mature.** The `:root` custom property system in `tokens.css` is well-structured with accent/tint/border/on-accent families generated via `color-mix()`. This is a strong foundation.
- **Semantic color mapping is thorough.** Score levels (0-3), judgment states (pass/conditional/fail), recommendation states, workflow states, and progress states all have dedicated color tokens with tint/border variants.
- **TRUST principle colors are consistently applied.** The five principles (TR, RE, UC, SE, TC) each have a unique hue, and section context propagation via `--section-accent` / `--section-tint` / `--section-border` is correctly implemented across 10+ section types.
- **Brand colors are meaningful, not decorative.** UT Navy, UT Blue, UT Red, and UT Green each serve distinct semantic roles.

### Problems identified

1. **Pure white (`#fff`) and near-white surfaces lack warmth.** `--ut-white: #fff` is used as card background, panel background, and surface background. Per the project's own design direction, pure white "never appears in nature" and creates a sterile feel that undermines the "efficient and in control" emotional goal.
2. **Neutrals are not tinted toward brand.** `--ut-border: #c8cdd3` and `--ut-muted: #5B6474` are cool gray but carry no intentional hue bias. Tinting them slightly toward navy/teal would create subconscious cohesion across the entire interface.
3. **Hardcoded hex/rgba values bypass the token system.** At least 80+ instances of hardcoded `rgba()` values in `states.css` and `components.css` duplicate what the token system already provides via `color-mix()`. This is a maintainability problem, not just an aesthetic one.
4. **Score-2 color (`--score-2: #007d9c`) conflates "meets baseline" with the UT Blue secondary brand color.** The visual language blurs the distinction between "this is a neutral secondary action color" and "this rating meets baseline." Users scanning scores could confuse blue-tinted rating options with brand chrome.
5. **Missing neutral scale.** There is no systematic neutral ramp between `--ut-white` and `--ut-text`. Components invent ad-hoc grays (e.g., `rgba(0, 44, 95, 0.03)`, `rgba(0, 44, 95, 0.04)`, `rgba(0, 44, 95, 0.05)`) that create subtle but real inconsistency.
6. **No dark mode tokens exist.** The design context specifies "light mode primary," but there are zero `prefers-color-scheme: dark` overrides. Even if dark mode is not prioritized now, the token architecture should be ready.
7. **Print color is only black (`#000`).** `print.css` uses `border: 2px solid #000` for rating options but does not attempt any color-preserving print strategy for section identification.

---

## Recommendations by Priority

### HIGH PRIORITY

#### H1. Replace `--ut-white` with a warm-tinted off-white

Pure `#fff` creates harsh contrast and a clinical feel. Replace with a barely-perceptible warm tint that reads as "white" but has more depth.

```css
/* tokens.css :root */
--ut-white: #fafbfc;     /* was #fff -- faintly warm-neutral */
--ut-panel-bg: #f3f4f6;  /* was #eef0f2 -- slightly warmer panel */
--ut-grey: #eef0f3;      /* was #f0f1f2 -- coordinate with new white */
--ut-offwhite: #f3f4f6;  /* was #f0f1f2 -- match panel bg */
```

**Impact:** Every card, field group, panel, and chip background gets subtly warmer. No contrast violations -- the delta from `#fff` to `#fafbfc` is imperceptible in text contrast but visible in large surface areas.

#### H2. Tint the border and muted colors toward navy

The current `--ut-border: #c8cdd3` is a pure cool gray. Tinting it toward the primary navy hue creates cohesion without being obvious.

```css
/* tokens.css :root */
--ut-border: #bfc6cf;    /* was #c8cdd3 -- slightly more navy-tinted */
--ut-muted: #576578;     /* was #5B6474 -- warmer, hints at navy */
--ut-slate: #8b9bb0;     /* was #94A3B8 -- warmer slate */
```

**Impact:** Every border, divider, muted label, and inactive state gets a coordinated feel. The tint is subtle enough that it still reads as "gray" but no longer feels disconnected from the navy/blue palette.

#### H3. Systematize the neutral scale with named steps

Currently, ad-hoc opacity values create "neutral" shades: `rgba(0, 44, 95, 0.03)`, `rgba(0, 44, 95, 0.04)`, `rgba(0, 44, 95, 0.05)`, etc. Replace with named tokens.

```css
/* tokens.css :root -- add after existing tokens */

/* Neutral scale (navy-tinted) */
--neutral-50:  color-mix(in srgb, var(--ut-navy) 2%, var(--ut-white));
--neutral-100: color-mix(in srgb, var(--ut-navy) 4%, var(--ut-white));
--neutral-150: color-mix(in srgb, var(--ut-navy) 6%, var(--ut-white));
--neutral-200: color-mix(in srgb, var(--ut-navy) 8%, var(--ut-white));
--neutral-300: var(--ut-offwhite);
--neutral-400: var(--ut-border);
--neutral-500: var(--ut-slate);
--neutral-600: var(--ut-muted);
--neutral-700: var(--ut-text);
--neutral-800: var(--ut-navy);
--neutral-900: color-mix(in srgb, var(--ut-navy) 90%, black);
```

**Impact:** Provides a 9-step neutral scale for use anywhere. Replaces scattered `rgba(0, 44, 95, 0.0X)` with `var(--neutral-100)`, `var(--neutral-150)`, etc. Improves maintainability and visual consistency.

#### H4. Differentiate score-2 from brand secondary color

`--score-2` is `#007d9c` (UT Blue), which is also the link color, focus ring color, and secondary action color. A reviewer seeing a blue-tinted rating option could interpret it as "active/selected" rather than "meets baseline."

```css
/* tokens.css :root */
--score-2: #2e7da8;  /* was #007d9c -- shifted toward steel blue, distinct from --ut-blue */
```

Alternatively, shift the other direction:

```css
--score-2: #088080;  /* teal-leaning blue, bridges between UT Blue and TC teal */
```

The chosen value should pass contrast checks at 4.5:1 against white backgrounds when used as text color.

#### H5. Migrate hardcoded rgba() values to token references

This is the largest single cleanup. At least 80+ instances across `states.css` and `components.css` use hardcoded `rgba()` values that duplicate what `color-mix()` already generates from tokens.

**Pattern to replace** (example from `states.css`):
```css
/* BEFORE -- hardcoded, fragile */
.strip-cell.filled.tr {
  background: rgba(37, 99, 235, 0.30);
  border-color: var(--tr);
}

/* AFTER -- token-driven */
.strip-cell.filled.tr {
  background: color-mix(in srgb, var(--tr) 30%, var(--ut-white));
  border-color: var(--tr);
}
```

**Files affected:**
- `states.css`: ~55 hardcoded rgba values in `.strip-cell`, `.doc-section.is-active`, `.section-kicker`, `.chip`, `.condition-tag`, `.completion-badge`, `.checkbox-item`, `.criterion-card`, `.context-anchor-button` selectors
- `components.css`: ~25 hardcoded rgba values in `.section-kicker`, `.rating-option`, `.evidence-*`, `.notice`, `.context-*` selectors
- `layout.css`: 3 instances in `.panel-progress`, `.panel::before/::after`, `.shell-surface`, `.context-drawer-backdrop`

**Impact:** Single source of truth for all tint values. Changing `--tr` from `#2563EB` to any other blue automatically propagates to every tint, border, and background that references it. Eliminates risk of "close but not exact" color drift.

---

### MEDIUM PRIORITY

#### M1. Improve contrast for `--ut-muted` on common backgrounds

`--ut-muted: #5B6474` against `--ut-white: #fff` is approximately 6.3:1 contrast ratio, which passes WCAG AA. However, when `--ut-muted` text appears on `--ut-grey` (`#f0f1f2`), the contrast drops to approximately 4.7:1 -- still passing AA but marginal for extended reading (field help text, context descriptions).

If H2 is adopted (`--ut-muted: #576578`), contrast against both surfaces improves slightly. If not, consider a standalone bump:

```css
--ut-muted: #535f70;  /* darker variant for better readability on grey surfaces */
```

Verify final choice with actual computed contrast ratios.

#### M2. Add `--ut-canvas` token for the body/page background

Currently `body` uses `background: var(--ut-grey)`. This works but conflates "a grey swatch used in components" with "the page canvas." Introducing a dedicated canvas token separates concerns:

```css
/* tokens.css :root */
--ut-canvas: var(--ut-grey);  /* initially the same; allows future differentiation */
```

```css
/* base.css */
body {
  background: var(--ut-canvas);
}
```

**Impact:** Future flexibility. If you later want the canvas to be slightly different from component grey (e.g., a tint that shifts with section context), only one token changes.

#### M3. Add a focus-ring token for consistency

Focus rings use `--ut-blue` directly in 6+ places across `states.css` and `components.css`. While this works, a dedicated token allows global focus ring color changes (e.g., dark mode adaptation).

```css
/* tokens.css :root */
--focus-ring: var(--ut-blue);
--focus-ring-offset: 2px;
--focus-ring-width: 2px;
```

```css
/* Replace all instances of: outline: 2px solid var(--ut-blue); outline-offset: 2px; */
/* With: outline: var(--focus-ring-width) solid var(--focus-ring); outline-offset: var(--focus-ring-offset); */
```

**Impact:** 6+ selectors unified. Future dark mode can swap `--focus-ring` to a lighter value.

#### M4. Color-code the progress bar contextually

The progress bar in `.panel-progress-bar` currently uses a static `var(--ut-blue)`. Given that the top accent bar already shifts color per active section, the progress bar could do the same:

```css
/* layout.css or states.css */
.panel-progress-bar {
  background: var(--active-section-accent, var(--ut-blue));
}
```

This ties the progress indicator to the current section context, reinforcing wayfinding without adding new colors.

#### M5. Harmonize evidence block accent colors

The evidence block uses hardcoded values:

```css
/* components.css line 563-569 */
.evidence-block {
  border-left: 4px solid var(--ut-blue);
  background: var(--ut-offwhite);
}
.evidence-block.criterion {
  border-left-color: rgba(0, 44, 95, 0.35);  /* hardcoded */
}
```

This should use the section accent system:

```css
.evidence-block.criterion {
  border-left-color: color-mix(in srgb, var(--section-accent, var(--ut-darkblue)) 60%, var(--ut-white));
}
```

This way evidence blocks visually belong to their parent section's color family.

#### M6. Add a `--notice` semantic color alias

The `.notice` component (red left-border callout) hardcodes its colors:

```css
.notice {
  background: rgba(198, 12, 48, 0.08);
  border-left: 6px solid var(--ut-red);
  border-top: 1px solid rgba(198, 12, 48, 0.15);
  border-right: 1px solid rgba(198, 12, 48, 0.15);
  border-bottom: 1px solid rgba(198, 12, 48, 0.15);
}
```

This is already covered by the `--state-error` family. Replace:

```css
.notice {
  background: var(--state-error-tint);
  border-left: 6px solid var(--state-error);
  border-top: 1px solid var(--state-error-border);
  border-right: 1px solid var(--state-error-border);
  border-bottom: 1px solid var(--state-error-border);
  color: var(--ut-navy);
}
```

**Impact:** If `--ut-red` ever changes, notice blocks follow automatically.

---

### LOW PRIORITY

#### L1. Prepare dark mode token scaffolding

Even if dark mode is not implemented now, the token architecture can be made ready with a single `@media` block:

```css
/* tokens.css -- add at end of :root block or in a new layer */
@media (prefers-color-scheme: dark) {
  :root {
    --ut-white: #1a1f2e;
    --ut-offwhite: #1e2433;
    --ut-grey: #141924;
    --ut-panel-bg: #161b28;
    --ut-border: #3a4258;
    --ut-text: #d4dae6;
    --ut-muted: #8b95a8;
    --ut-slate: #5a657a;
    --ut-navy: #a8b8d8;
    --ut-darkblue: #8ea8d0;
    color-scheme: dark;
  }
}
```

The section accent tokens and `color-mix()` derivations will automatically recalculate from these new base values. Do NOT implement dark mode fully now -- just ensure the scaffolding works.

#### L2. Consider OKLCH for perceptual uniformity

The current system uses hex colors for base tokens and `color-mix(in srgb, ...)` for derivations. This is functional but `srgb` mixing is not perceptually uniform -- a 10% mix of blue looks different (in perceived lightness) from a 10% mix of orange.

If browser support permits (OKLCH is Baseline 2024), future base tokens could be defined in OKLCH:

```css
/* Example -- not a change recommendation for now */
--tr: oklch(0.55 0.20 260);
--re: oklch(0.55 0.17 145);
--uc: oklch(0.50 0.22 305);
--se: oklch(0.58 0.19 55);
--tc: oklch(0.55 0.12 175);
```

This would make tint/border derivations perceptually even across all five principles. Low priority because the current hex+srgb system works adequately.

#### L3. Add a color legend component to the help panel

The help panel already has `help-section-item` with `help-section-swatch` showing section colors. Consider extending this to a full color legend that maps:

- Score colors (0-3) with labels
- Judgment states (pass/conditional/fail)
- Recommendation states
- Workflow states (editable/read-only/system-skipped)
- Progress states (complete/in-progress/attention/blocked/skipped)

This would be useful for new team members learning the evaluation system.

#### L4. Print color preservation

`print.css` currently strips all color context. For evaluation reports that are printed and reviewed in meetings, consider preserving section left-border colors and score-level tints:

```css
@media print {
  .form-section[data-section="tr"],
  .doc-section[data-section="tr"] {
    border-left-color: #2563EB !important;
  }
  /* ... repeat for other sections ... */

  .rating-option.score-0 { border-left: 3px solid #c60c30 !important; }
  .rating-option.score-1 { border-left: 3px solid #EA580C !important; }
  .rating-option.score-2 { border-left: 3px solid #2e7da8 !important; }
  .rating-option.score-3 { border-left: 3px solid #4a8355 !important; }
}
```

This preserves wayfinding color in print without requiring full-color printing.

#### L5. Reduce duplicated active section state rules

`states.css` contains 10 near-identical `body[data-active-accent-key="X"]` blocks (lines 50-358), each listing 15+ selectors. This ~300-line block can be collapsed using the existing `--section-accent` custom property cascade that is already set up. The `body[data-active-accent-key]` sets `--active-section-accent` which `.top-accent` already consumes (line 361). The duplication is not a color issue per se, but cleaning it up reduces the surface area for color drift.

---

## Summary Table

| ID | Priority | Summary | Files Affected |
|----|----------|---------|----------------|
| H1 | High | Warm-tinted off-white for surfaces | `tokens.css` |
| H2 | High | Tint border/muted toward navy | `tokens.css` |
| H3 | High | Systematize neutral scale tokens | `tokens.css` |
| H4 | High | Differentiate score-2 from brand blue | `tokens.css` |
| H5 | High | Migrate hardcoded rgba to tokens | `states.css`, `components.css`, `layout.css` |
| M1 | Medium | Verify/improve muted text contrast | `tokens.css` |
| M2 | Medium | Add canvas background token | `tokens.css`, `base.css` |
| M3 | Medium | Add focus ring tokens | `tokens.css`, `states.css`, `components.css` |
| M4 | Medium | Contextual progress bar color | `layout.css` or `states.css` |
| M5 | Medium | Harmonize evidence block with section accents | `components.css` |
| M6 | Medium | Unify notice component with state-error tokens | `components.css` |
| L1 | Low | Dark mode token scaffolding | `tokens.css` |
| L2 | Low | Consider OKLCH for future token definitions | `tokens.css` |
| L3 | Low | Color legend in help panel | HTML/JS |
| L4 | Low | Print color preservation | `print.css` |
| L5 | Low | Collapse duplicated active-section rules | `states.css` |

---

## Implementation Order

1. **H1-H4** -- Token value changes only. These are single-line edits in `tokens.css` that cascade everywhere.
2. **H5** -- Systematic find/replace. Can be done incrementally per file. Highest effort, highest maintainability payoff.
3. **M1-M6** -- Medium effort. Each is self-contained.
4. **L1-L5** -- Backlog. Address during stabilization waves.

## Constraints Reminder

- No new colors. The palette is fixed: Navy, Blue, Red, Green, Purple, Pink, plus the five TRUST principle hues.
- No gradients (design context: "flat, not hierarchical").
- No decorative color. Every color must encode state, section, score, or workflow.
- Maintain WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI components).
- Zero border-radius changes. Color changes do not affect shape.
