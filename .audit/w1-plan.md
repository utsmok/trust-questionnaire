# Wave 1 — Unified Implementation Plan

**Date:** 2026-04-05
**Sources:** `.audit/w1-animate.md`, `.audit/w1-colorize.md`, `.audit/w1-typeset.md`
**Brand:** Efficient, Explicit, Engineered

---

## Pre-flight: Already Resolved (verified against current code)

These audit recommendations were already implemented before this plan was written. **No action needed.**

| Source   | ID  | Issue                                  | Evidence                                                                                                                      |
| -------- | --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Animate  | R2  | Context drawer backdrop transition     | `layout.css:457-474` already uses opacity/visibility transitions; `navigation.js:654-656` no longer sets `hidden` on backdrop |
| Animate  | R3  | Top accent easing                      | `interaction-states.css:3` already uses `var(--duration-accent) var(--ease-out-quart)`                                        |
| Animate  | R6  | `--duration-slow` token                | `tokens.css:322` defines it; `animations.css:6` zeros it in reduced-motion                                                    |
| Colorize | R1  | On-accent values use `--ut-white`      | All `--section-*-on-accent` in `tokens.css:45-137` already use `#ffffff`                                                      |
| Colorize | R4  | Principle-item cards lack color coding | `trust-framework.html:472-488` has `data-section` attributes; `components.css:175-218` has selectors                          |

---

## Conflict Resolution

### 1. Typeset R3 vs Colorize — evidence prose selectors

Typeset R3 changes `font-size` from `--text-sm` to `--text-md` on `.evidence-block-description`, `.evidence-selection-summary`, `.evidence-status`, `.evidence-note`, `.evidence-lightbox-note`. Colorize R5 changes `border-left-color` on `.evidence-block.criterion`. **Different properties, different selectors.** No conflict. Apply both.

### 2. Typeset R3 on `.field-help` — no conflict

`field-help` gets a font-size change only. No other audit touches this selector.

### 3. Colorize R2 (rating dots) vs existing score-N rules

New `nth-child` rules provide default (unfilled) border color; existing `.rating-option.score-N .rating-dot` rules override with filled state. Both have specificity 0,3,0 — **order matters.** Place `nth-child` rules before the `.score-N` rules in `interaction-states.css` (before line 778). The score-N rules will cascade correctly.

### 4. Animate R4 + Colorize R6 — both touch checkbox styling in `interaction-states.css`

R4 addresses `margin`/`padding` layout shift on `.checkbox-item:has(input:checked)`. R6 adds `accent-color` on `.form-section[data-section] .checkbox-item input`. **Different selectors, different properties.** No conflict. Note them as adjacent changes in the same file for efficient editing.

### 5. Typeset R6 (field-label line-height) — no conflict

`.field-label` line-height change does not interact with any colorize or animate change. No other audit touches this element.

---

## Changes by File

### File 1: `static/css/tokens.css`

#### Change T1 — Add `--text-md` token (Typeset R3, HIGH)

**Line:** ~291 (between `--text-sm` and `--text-body`)

```css
/* Current */
--text-sm: 0.75rem;
--text-body: 1rem;

/* After */
--text-sm: 0.75rem;
--text-md: 0.875rem; /* secondary readable prose — field help, evidence descriptions */
--text-body: 1rem;
```

#### Change T2 — Remove `--text-mega` token (Typeset R5, MEDIUM)

**Line:** 296

Delete the line: `--text-mega: 2.75rem;`

#### Change T3 — Update type scale comment (Typeset R3 + R5, HIGH + MEDIUM)

**Line:** 289

```css
/* Current */
/* Type scale -- 6 steps */

/* After */
/* Type scale — 7 steps (xs, sm, md, body, sub, heading, display) */
```

#### Change T4 — Shift `--score-2` hue (Colorize R3, MEDIUM)

**Line:** 142

```css
/* Current */
--score-2: #088080;

/* After */
--score-2: #0e7490; /* cyan-700 — distinct from --tc teal */
```

Derived tokens (`--score-2-tint`, `--score-2-border`) use `color-mix()` and auto-adjust.

#### Change T5 — Document Arial Narrow system font assumption (Typeset R7, LOW)

**Line:** 327 (above `--ff-heading`)

```css
/* Arial Narrow: system font (Windows, macOS). Fallback to Arial is wider —
   acceptable for managed desktop deployment. */
--ff-heading: 'Arial Narrow', Arial, sans-serif;
```

---

### File 2: `static/css/components.css`

#### Change C1 — Fix `.mini-card h3` font (Typeset R1, HIGH)

**Lines:** 235–239

```css
/* Current */
.mini-card h3 {
  margin: 0 0 8px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
}

/* After */
.mini-card h3 {
  margin: 0 0 8px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
  line-height: var(--lh-sub);
  font-family: var(--ff-heading);
  font-weight: 700;
}
```

#### Change C2 — Fix `.subhead` font (Typeset R2, HIGH)

**Lines:** 984–989

```css
/* Current */
.subhead {
  margin: 24px 0 12px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
  font-weight: 700;
}

/* After */
.subhead {
  margin: 24px 0 12px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
  font-weight: 700;
  font-family: var(--ff-heading);
}
```

#### Change C3 — Promote readable secondary text to `--text-md` (Typeset R3, HIGH)

**Line 468** — `.field-help`:

```css
/* Current */
.field-help {
  margin-top: 8px;
  font-size: var(--text-sm);
  ...
}

/* After */
.field-help {
  margin-top: 8px;
  font-size: var(--text-md);
  ...
}
```

**Lines 641–650** — evidence prose selectors:

```css
/* Current */
.evidence-block-description,
.evidence-selection-summary,
.evidence-status,
.evidence-note,
.evidence-lightbox-note {
  margin: 0;
  color: var(--ut-text);
  font-size: var(--text-sm);
  line-height: var(--lh-body);
}

/* After */
.evidence-block-description,
.evidence-selection-summary,
.evidence-status,
.evidence-note,
.evidence-lightbox-note {
  margin: 0;
  color: var(--ut-text);
  font-size: var(--text-md);
  line-height: var(--lh-body);
}
```

#### Change C4 — Add explicit `font-weight: 700` to `.criterion-card h3` (Typeset R4, MEDIUM)

**Lines:** 596–604

```css
/* Add one line after font-family */
.criterion-card h3 {
  margin: 0 0 8px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
  line-height: var(--lh-sub);
  font-family: var(--ff-heading);
  font-weight: 700; /* ADD THIS */
  border-bottom: 1px solid var(--ut-border);
  padding-bottom: 6px;
}
```

#### Change C5 — Add `line-height` to `.field-label` (Typeset R6, MEDIUM)

**Lines:** 333–345

Add `line-height: var(--lh-heading);` to the rule:

```css
.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--ut-navy);
  font-size: var(--text-sm);
  font-weight: 700;
  font-family: var(--ff-heading);
  text-transform: uppercase;
  letter-spacing: var(--ls-label);
  line-height: var(--lh-heading); /* ADD THIS */
}
```

#### Change C6 — Fix `.evidence-block.criterion` border (Colorize R5, LOW)

**Lines:** 624–626

```css
/* Current */
.evidence-block.criterion {
  border-left-color: color-mix(in srgb, var(--ut-navy) 35%, var(--ut-border));
}

/* After — use section-scoped border token */
.evidence-block.criterion {
  border-left-color: var(
    --section-border,
    color-mix(in srgb, var(--ut-navy) 35%, var(--ut-border))
  );
}
```

Uses accent-scoping `--section-border` when available, falling back to the original gray for unscoped contexts.

#### Change C7 — Section-aware context empty state border (Colorize R7, LOW)

**Lines:** 1671–1677

```css
/* Current */
.context-empty-state {
  ...
  border-left: 4px solid var(--ut-darkblue);
  ...
}

/* After */
.context-empty-state {
  ...
  border-left: 4px solid var(--section-accent, var(--ut-darkblue));
  ...
}
```

#### Change C8 — Document reference-drawer-title mixed-case intent (Typeset R8, LOW)

**Before line 1631**:

```css
/* Title intentionally mixed-case for readability of proper nouns,
   despite uppercase context in parent summary. */
.reference-drawer-title {
```

---

### File 3: `static/css/interaction-states.css`

#### Change I1 — Add score-level border colors to unfilled rating dots (Colorize R2, MEDIUM)

**Insert before line 778** (before the `.rating-option.score-0 .rating-dot` rules):

```css
.rating-option:nth-child(1) .rating-dot {
  border-color: var(--score-0);
}
.rating-option:nth-child(2) .rating-dot {
  border-color: var(--score-1);
}
.rating-option:nth-child(3) .rating-dot {
  border-color: var(--score-2);
}
.rating-option:nth-child(4) .rating-dot {
  border-color: var(--score-3);
}
```

These rules have the same specificity as the `.score-N .rating-dot` rules below (0,3,0). Because they appear first in source order, the score-N rules cascade correctly when a selection is made.

#### Change I2 — Add base checkbox accent-color rule (Colorize R6, LOW)

**Insert before line 656** (before the section-specific overrides):

```css
.form-section[data-section] .checkbox-item input {
  accent-color: var(--section-accent, var(--ut-darkblue));
}
```

The existing `scoring` (lines 656–662) and `scope` (lines 664–666) overrides have higher specificity (extra `.checkbox-block` class) and take precedence.

#### Change I3 — Fix checkbox checked layout shift (Animate R4, LOW)

**Lines:** 694–702

Apply the expanded margin/padding to all `.checkbox-item` elements unconditionally so the checked state differentiation comes from background/color only:

```css
/* Current */
.checkbox-item {
  ...
}

.checkbox-item:has(input:checked) {
  color: var(--ut-navy);
  font-weight: 700;
  background: color-mix(in srgb, var(--ut-navy) 3%, var(--ut-white));
  border-radius: var(--radius-md);
  margin: -2px -4px;
  padding: 2px 4px;
  transition: background var(--duration-instant) var(--ease-out-quart);
}

/* After — move margin/padding to base rule */
.checkbox-item {
  margin: -2px -4px;
  padding: 2px 4px;
  ...
}

.checkbox-item:has(input:checked) {
  color: var(--ut-navy);
  font-weight: 700;
  background: color-mix(in srgb, var(--ut-navy) 3%, var(--ut-white));
  border-radius: var(--radius-md);
  transition: background var(--duration-instant) var(--ease-out-quart);
}
```

Also apply the same margin/padding to `.checkbox-item.has-checked` (lines 704+) to keep parity.

#### Change I4 — Align strip-cell active timing to `--duration-fast` (Animate R5, LOW)

**Lines:** 1271–1275

```css
/* Current */
.strip-cell.is-active {
  ...
  transition:
    background var(--duration-normal) var(--ease-out-quart),
    border-color var(--duration-normal) var(--ease-out-quart),
    box-shadow var(--duration-normal) var(--ease-out-quart);
}

/* After */
.strip-cell.is-active {
  ...
  transition:
    background var(--duration-fast) var(--ease-out-quart),
    border-color var(--duration-fast) var(--ease-out-quart),
    box-shadow var(--duration-fast) var(--ease-out-quart);
}
```

---

## Priority-Ordered Implementation Sequence

Execute in this order. Each step is independently testable.

| Step | Priority | Change ID | File                          | Description                                    |
| ---- | -------- | --------- | ----------------------------- | ---------------------------------------------- |
| 1    | HIGH     | T3        | `tokens.css:289`              | Update type scale comment                      |
| 2    | HIGH     | T2        | `tokens.css:296`              | Remove dead `--text-mega` token                |
| 3    | HIGH     | T1        | `tokens.css:291`              | Add `--text-md: 0.875rem` token                |
| 4    | MEDIUM   | T4        | `tokens.css:142`              | Shift `--score-2` to `#0e7490`                 |
| 5    | LOW      | T5        | `tokens.css:327`              | Document Arial Narrow assumption               |
| 6    | HIGH     | C1        | `components.css:235`          | Fix `.mini-card h3` font                       |
| 7    | HIGH     | C2        | `components.css:984`          | Fix `.subhead` font                            |
| 8    | HIGH     | C3        | `components.css:468,641`      | Promote secondary text to `--text-md`          |
| 9    | MEDIUM   | C4        | `components.css:596`          | Add `font-weight: 700` to `.criterion-card h3` |
| 10   | MEDIUM   | C5        | `components.css:333`          | Add `line-height` to `.field-label`            |
| 11   | LOW      | C6        | `components.css:624`          | Fix `.evidence-block.criterion` border         |
| 12   | LOW      | C7        | `components.css:1671`         | Section-aware context empty state border       |
| 13   | LOW      | C8        | `components.css:1631`         | Document reference-drawer-title intent         |
| 14   | MEDIUM   | I1        | `interaction-states.css:777`  | Add score-level unfilled rating dot borders    |
| 15   | LOW      | I2        | `interaction-states.css:655`  | Add base checkbox accent-color                 |
| 16   | LOW      | I3        | `interaction-states.css:694`  | Fix checkbox checked layout shift              |
| 17   | LOW      | I4        | `interaction-states.css:1271` | Align strip-cell active timing                 |

---

## Deferred to Later Waves

| Source   | ID  | Priority | Reason                                                                                                   |
| -------- | --- | -------- | -------------------------------------------------------------------------------------------------------- |
| Animate  | R7  | N/A      | Sidebar collapse instant — accepted as-is (grid not animatable, snap is correct for instrument UI)       |
| Animate  | R8  | N/A      | Reference drawers instant — accepted as-is (`<details>` limitation, secondary UI)                        |
| Colorize | R8  | —        | Print score colors — verified correct, no issue                                                          |
| Colorize | R9  | LOW      | Surface token naming — document only, no visual change. Defer to token cleanup pass                      |
| Colorize | R10 | LOW      | Warning/SE orange proximity — monitor only, no action unless user testing reveals confusion              |
| Typeset  | —   | —        | `.reference-drawer-subtitle` at `--text-md` instead of `--text-body` — optional, defer to density review |

---

## Verification Checklist

After implementing all changes:

1. `npm run validate:html` — HTML passes lint
2. `npm run test:e2e` — all 5 test suites pass
3. Visual spot-checks:
   - Reference panel mini-card headings render in Arial Narrow bold (not Inter)
   - `.subhead` elements render in Arial Narrow
   - Field help text and evidence descriptions render at 14px (not 12px)
   - Unfilled rating dots carry score-level border colors (red, orange, cyan, green)
   - Rating dots in TC section are visually distinct from section accent (cyan vs teal)
   - Checkbox checked state has no 2px layout pop
   - Evidence block criterion borders carry section accent color when inside a section
   - Context empty state border matches active section color
4. No changes to `base.css`, `layout.css`, `animations.css`, `accent-scoping.css`, `print.css`, or any JS files
