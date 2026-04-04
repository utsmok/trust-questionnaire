# Wave 2 — Bolder Audit

**Date**: 2026-04-04
**Auditor**: bolder skill
**Scope**: All CSS files, HTML structure, design token system
**Preceding waves**: Wave 1 fixed font-weights, letter-spacing, WCAG contrast, color deduplication, animations, and font rendering.

---

## What Is Already Good (Do NOT Change)

These elements are already strong and should be left alone:

- **Color token architecture** — The section accent family (`--section-{id}-accent`, `-strong`, `-tint`, `-border`, `-on-accent`) with `accent-scoping.css` body-level overrides is well-engineered. Don't touch it.
- **Sharp radius policy** — `--radius-lg: 0px`, `--radius-md: 2px`, `--radius-sm: 1px` is perfectly aligned with the "regimented functionalism" aesthetic. No rounding creep.
- **Section left-border system** — 6px left borders color-coded by principle, growing to 8px on active/focus-within. This is a strong, functional visual cue.
- **Strip-cell progress bar** — The completion strip in the header with `box-shadow: inset 0 -3px 0` accent lines is distinctive and information-dense. Excellent.
- **Nav button progress states** — `inset 0 3px 0` top shadow encoding attention/error states is a bold, confident encoding.
- **Section kicker badges** — Mono font, uppercase, colored, with left-border accent. Strong and functional.
- **Dashed border for read-only/skipped** — Visual encoding of workflow states via `border-style: dashed` is distinctive and useful.
- **Criterion card code labels** — `::after` pseudo-element showing criterion code in mono, positioned top-right. Good information exposure.
- **Surface overlay animations** — Fade + slide-in/out are clean and functional.

---

## Recommendations

### R1 — Increase heading scale ratio between h1 panel-title and h2 form-section headings

**Priority**: HIGH
**Description**: The type scale has `--text-heading: 1.563rem` and `--text-display: 1.95rem`. That's only a 1.25x ratio between the panel title (h1) and section headings (h2). For a tool where sections are the primary navigation unit, this is too flat. The panel title should command significantly more presence — it's the highest-level heading on the main working surface.
**Specifics**:

- `tokens.css` line 289: Change `--text-display: 1.95rem` → `--text-display: 2.25rem`
- `tokens.css` line 290: Change `--text-mega: 2.25rem` → `--text-mega: 2.75rem`
- This makes h1→h2 ratio ~1.44x instead of 1.25x, and reserves `--text-mega` for any future hero usage.
- `layout.css` line 132: Verify `.panel-title` uses `--text-display` (it does).
- No other selectors need changing — everything references tokens.
  **Dependencies**: None. Self-contained token change.

### R2 — Add bottom-border weight to active form-section for stronger section grounding

**Priority**: HIGH
**Description**: Active form sections currently get `border-left-width: 8px` and tinted background, but the bottom border stays at the default 1px. For principle sections (TR, RE, UC, SE, TC), this means the active section "floats" — it has visual presence from the left but no bottom anchor. Adding a heavier bottom border to the active state gives each section a more grounded, table-like presence that matches the "expose the machine" philosophy.
**Specifics**:

- `interaction-states.css` lines 103-155 (`.doc-section.is-active, .form-section.is-active` and per-principle overrides): Add `border-bottom-width: 2px` to the base active rule.
- Already have `border-top-color`, `border-right-color`, `border-bottom-color` set — just need the width to be visible. The base rule has `border: 1px solid` from components.css, so changing bottom width to 2px would make it visible against the tinted colors.
  **Dependencies**: None.

### R3 — Strengthen the top-accent bar from 8px to a more assertive 4px with higher contrast

**Priority**: MEDIUM
**Description**: The top accent bar is 8px tall — that's thick for a color indicator. It competes visually with the header rather than complementing it. A 4px bar with stronger opacity would be more assertive in a different way: precise, not loud. However, this is borderline — the 8px bar is distinctive. **Alternative**: Keep 8px height but ensure the accent-strong color is always saturated enough. Currently `interaction-states.css` line 2 uses `var(--active-section-accent-strong)` which darkens by 86% toward black. This is good. **Decision**: Reduce to 5px for a crisper, more engineered feel.
**Specifics**:

- `layout.css` line 7: Change `height: 8px` → `height: 5px`
  **Dependencies**: None. Header position uses `inset: 8px 0 auto 0` — update to `inset: 5px 0 auto 0` on line 13.

### R4 — Add a subtle background tint to the questionnaire panel to differentiate it from form-section cards

**Priority**: MEDIUM
**Description**: The questionnaire panel has `background: var(--ut-white)` and the form sections inside also have `background: var(--ut-white)`. There's zero visual separation between the page surface and the content cards. The framework panel already uses `color-mix(in srgb, var(--ut-navy) 3%, var(--ut-grey))` — the questionnaire panel should have a very subtle off-white to make the white form sections pop slightly.
**Specifics**:

- `layout.css` line 241: Change `background: var(--ut-white)` → `background: var(--neutral-50)` (which is `color-mix(in srgb, var(--ut-navy) 2%, var(--ut-white))` — barely perceptible but breaks the white-on-white).
- Ensure `components.css` line 99-101 `.questionnaire-panel .form-section` stays `background: var(--ut-white)` (it already does).
  **Dependencies**: None. Minimal risk — 2% navy tint is imperceptible on its own but creates just enough contrast against pure white cards.

### R5 — Increase criterion card heading weight and size for better visual hierarchy within sections

**Priority**: MEDIUM
**Description**: Criterion card h3 headings use `font-size: var(--text-sub)` (1.2rem) and `font-weight: 700` — same size as context route titles and same weight as section h2. Within a form section, the criterion heading should be more prominent than the field labels (which also use 700 weight). The criterion card is a sub-container that needs its own clear heading level.
**Specifics**:

- `components.css` line 547-553 `.criterion-card h3`: Add `font-weight: 700` (already set) — this is fine. But change `font-size` from `var(--text-sub)` (1.2rem) to `calc(var(--text-sub) * 1.05)` (~1.26rem) — a small bump that creates visual separation from field labels which use `var(--text-sm)` (0.75rem).
- Actually, the gap between `--text-sm` (0.75rem) field labels and `--text-sub` (1.2rem) criterion headings is already ~1.6x. That's decent. **Revised**: Instead, make criterion h3 `text-transform: uppercase` and use `letter-spacing: var(--ls-label)` to differentiate from field labels' same uppercase treatment. Wait — field labels already use uppercase + `--ff-heading`. The criterion h3 uses `--ff-heading` but NOT uppercase. So they're already differentiated by case. **Final recommendation**: Add a small bottom-border to `.criterion-card h3` to create a separator.
- `components.css` after line 553: Add `border-bottom: 1px solid var(--ut-border); padding-bottom: 6px;` to `.criterion-card h3`.
  **Dependencies**: None.

### R6 — Make the pager shell more visually assertive as the primary navigation control

**Priority**: HIGH
**Description**: The pager shell controls page-to-page movement — the most critical navigation action. Currently it's a plain bordered box with off-white background, same visual weight as a reference drawer. The pager should feel like a control surface, not a passive element. The workflow state border-left (4px) is a good start, but the overall presence is too weak.
**Specifics**:

- `components.css` line 1338-1346 `.pager-shell`: Change `background: var(--ut-offwhite)` → `background: color-mix(in srgb, var(--ut-navy) 5%, var(--ut-offwhite))` for slightly more presence.
- Change `border: 1px solid` → `border: 2px solid var(--ut-border)` for more visual weight.
- Add `box-shadow: 0 1px 3px color-mix(in srgb, var(--ut-navy) 6%, transparent)` for subtle grounding.
  **Dependencies**: None.

### R7 — Give the page-index active button a stronger top accent line

**Priority**: MEDIUM
**Description**: The active page-index button uses `box-shadow: inset 0 2px 0 var(--section-accent)` — a 2px inset top shadow. This is subtle. Given that the page index is the primary way users navigate between pages, the active indicator should be more visible at a glance.
**Specifics**:

- `interaction-states.css` line 922: Change `box-shadow: inset 0 2px 0 var(--section-accent)` → `box-shadow: inset 0 3px 0 var(--section-accent)` for a slightly more prominent indicator.
- Also on line 1384 (`.page-index-button[data-progress-state='in_progress']`): Change `inset 0 2px 0` → `inset 0 3px 0`.
- Same for lines 1389, 1394 (attention, blocked states).
  **Dependencies**: None.

### R8 — Add visual weight to the "Quick Reference" heading area

**Priority**: LOW
**Description**: The `<h2 id="referenceDrawerHeading" class="panel-title-section">Quick Reference</h2>` heading (line 74 in HTML) is a plain muted-color text with no visual presence. It marks an important reference area but looks like a footnote. It should have at least a subtle border or background treatment to signal "this is reference material you may need."
**Specifics**:

- Add to `components.css` (or a new rule in `interaction-states.css`): `.panel-title-section` should get `padding: 6px 10px; border: 1px solid var(--ut-border); background: var(--neutral-50);` to give it a chip-like container.
- This aligns with the "expose the machine" principle — reference material is visibly demarcated.
  **Dependencies**: None. But check that the heading doesn't get double-styled by any JS-generated content.

### R9 — Increase the score-table header visual presence

**Priority**: MEDIUM
**Description**: Score table headers use `background: var(--ut-offwhite)` — barely distinguishable from the white body cells. For reference tables that encode critical evaluation semantics, the header should be more prominent.
**Specifics**:

- `components.css` line 228: Change `background: var(--ut-offwhite)` → `background: color-mix(in srgb, var(--ut-navy) 8%, var(--ut-white))` (same as `--neutral-200`).
- Optionally increase header `border-bottom` from 1px to 2px: Line 222 already uses `border-bottom: 1px solid var(--ut-border)` — this is shared with `td`. Add a separate `.score-table th { border-bottom: 2px solid var(--ut-border); }` rule.
  **Dependencies**: None.

### R10 — Make field-group borders slightly more visible for better form structure

**Priority**: LOW
**Description**: Field groups use `border: 1px solid var(--ut-border)` — the same as everything else. Within a form section that also has 1px borders, field groups visually blend into their parent. A subtle increase in border darkness would help users parse form structure.
**Specifics**:

- `components.css` line 287: Change `border: 1px solid var(--ut-border)` → `border: 1px solid color-mix(in srgb, var(--ut-navy) 12%, var(--ut-border))` for slightly more visible container boundaries.
  **Dependencies**: None.

### R11 — Strengthen the section-kicker border-left from 3px to 4px

**Priority**: LOW
**Description**: The section kicker currently has a 3px left border in accent color. The form section itself has a 6px left border. The 3px→6px ratio is fine, but the 3px kicker border can get lost visually, especially at small sizes. Increasing to 4px makes it slightly more prominent without competing with the section border.
**Specifics**:

- `interaction-states.css` lines 231, 236, 241, 246, 251 (per-principle kickers) and line 492 (generic): Change `border-left: 3px solid` → `border-left: 4px solid`.
- `components.css` line 128 (base `.section-kicker`): Change `border-radius: 2px` stays — the left border is the only colored edge.
  **Dependencies**: None.

### R12 — Add a subtle bottom-border accent to the completion strip

**Priority**: LOW
**Description**: The completion strip sits in the header between brand and nav. It has a 1px border all around with a subtle navy tint background. Adding a 2px bottom border in the active section accent would create a visual bridge between the header chrome and the content area below, making the strip feel more connected to the active section.
**Specifics**:

- `components.css` line 10: Change `border: 1px solid var(--ut-border)` → add `border-bottom: 2px solid var(--active-section-accent, var(--ut-border))`.
- Keep the other three sides at 1px.
  **Dependencies**: None. Uses `var(--active-section-accent)` which is already defined on `body`.

### R13 — Increase the notice block visual urgency

**Priority**: MEDIUM
**Description**: The `.notice` block (used for critical-fail warnings and important evaluation rules) has `background: var(--state-error-tint)` (10% red) with a 6px left border. For content that includes "Any critical-fail flag triggers a mandatory team review," this is insufficiently urgent. The notice should be more visually commanding without being aggressive.
**Specifics**:

- `components.css` line 930: Change `background: var(--state-error-tint)` → `background: color-mix(in srgb, var(--state-error) 14%, var(--ut-white))` for a stronger tint.
- Change `font-weight: 500` → `font-weight: 700` for the notice text.
- Keep `border-left: 6px solid var(--state-error)` — this is good.
  **Dependencies**: None.

### R14 — Make the evidence-block left border thicker for better visual anchoring

**Priority**: LOW
**Description**: Evidence blocks use a 4px left border in section accent color. Within a criterion card that already has a 6px left border, the evidence block's 4px border competes rather than nests cleanly. Increasing the evidence border to match or slightly differentiate would help.
**Specifics**:

- `components.css` line 569: The 4px is fine relative to the criterion card's 6px. Actually, **do not change** — the 4px is appropriately subordinate. **Withdraw this recommendation.**

### R15 — Add font-weight contrast between field-label and field-help text

**Priority**: LOW
**Description**: Field labels use `font-weight: 700` and field help text has no explicit weight (inherits 400 from body). The contrast is already good. However, the field label's mono-uppercase treatment makes it visually dense — ensure help text has enough contrast.
**Specifics**: No change needed. Current state is fine.

---

## Summary Table

| ID  | Priority | Area           | Change                                                         | Risk    |
| --- | -------- | -------------- | -------------------------------------------------------------- | ------- |
| R1  | HIGH     | Typography     | Increase `--text-display` to 2.25rem, `--text-mega` to 2.75rem | None    |
| R2  | HIGH     | Section states | Add `border-bottom-width: 2px` to active form-section          | None    |
| R3  | MEDIUM   | Chrome         | Reduce top-accent from 8px to 5px                              | None    |
| R4  | MEDIUM   | Layout         | Subtle background tint on questionnaire panel                  | Minimal |
| R5  | MEDIUM   | Hierarchy      | Add bottom-border to criterion card h3                         | None    |
| R6  | HIGH     | Navigation     | Strengthen pager shell (border, shadow, background)            | None    |
| R7  | MEDIUM   | Navigation     | Thicker inset top shadow on active page-index button           | None    |
| R8  | LOW      | Typography     | Give "Quick Reference" heading a container treatment           | None    |
| R9  | MEDIUM   | Tables         | Darken score-table header background, thicken bottom border    | None    |
| R10 | LOW      | Forms          | Slightly darker field-group borders                            | Minimal |
| R11 | LOW      | Kickers        | Increase section-kicker left border to 4px                     | None    |
| R12 | LOW      | Chrome         | Add accent bottom-border to completion strip                   | None    |
| R13 | MEDIUM   | Notices        | Stronger background tint and bold text on .notice              | None    |

---

## Implementation Order

1. **R1** (tokens) — Foundation change; all other work builds on the type scale.
2. **R3** (top-accent height) — Quick chrome fix, 2 lines.
3. **R4** (panel background) — Quick layout fix, 1 line.
4. **R2** (active section border) — Interaction states, 1 property addition.
5. **R6** (pager shell) — Components, 3 properties.
6. **R7** (page-index accent) — Interaction states, 4 shadow values.
7. **R9** (score-table header) — Components, 2 properties.
8. **R5** (criterion h3 border) — Components, 2 properties.
9. **R13** (notice urgency) — Components, 2 properties.
10. **R8, R10, R11, R12** — LOW priority, batch together.

## NOT Recommended (explicitly rejected)

- **Gradient text effects on headings** — Violates "flat, not hierarchical" and "no decorative blurs."
- **Thicker section borders (beyond 8px active)** — 8px is already assertive; more would look crude.
- **Colorful backgrounds on form sections** — The tint system is well-calibrated; stronger tints would reduce readability.
- **Box shadows on form sections** — Violates "no soft shadows" and "flat delineation" principles.
- **Larger border-radius anywhere** — The 0-2px policy is core to the aesthetic.
- **Animated section transitions beyond the existing fade** — More animation would slow power users.
- **Background patterns or textures** — Violates "clean, flat backgrounds without gradients."
