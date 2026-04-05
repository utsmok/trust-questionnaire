# Wave 4 Arrange Audit — Layout, Spacing & Visual Rhythm (Fresh Assessment)

**Date**: 2026-04-05
**Auditor**: /arrange (impeccable design skill)
**Target**: `trust-framework.html` + `static/css/` (9 files, ~4,895 lines)
**Context**: Post-Wave 3 re-evaluation. Previous w4-arrange.md findings largely implemented (--space-4-5, --space-5-5, --space-7 tokens added; header grid restructured). This is a fresh pass against the current codebase.
**Wave 3 carryover**: Completion strip crowding on narrow viewports, tooltip dark background clashing with flat aesthetic, spacing inconsistencies.

---

## Overall Assessment: STRONG — Systemic tokenization gap is the main issue

The layout architecture is mature and well-reasoned. Split-panel proportions, workspace grid nesting, responsive breakpoints, and section-card structure are all correct. The visual hierarchy is clear at every level — panel title → section h2 → kicker → criterion h3 → field-label → field-help.

**The primary structural weakness**: The spacing token system covers layout-level gaps well (7 of 7 layout.css gaps use tokens), but component-level spacing in `components.css` is almost entirely raw pixel values (4 of ~45 gaps use tokens). Three gap sizes — 6px, 10px, and 14px — are used 31 times across the codebase without token representation. This is a two-tier spacing system that violates the design-token discipline the project otherwise upholds.

---

## What's Already Excellent — DO NOT Change

### 1. Split-panel architecture

`shell-layout` uses `grid-template-columns: minmax(0, 1fr) 28rem` — questionnaire-dominant with fixed-width context panel. At 1440px viewport: ~992px questionnaire, 448px context (69/31). At 1920px: ~1472/448 (77/23). Correct proportions for the dual-purpose evaluation workflow.

### 2. Workspace layout

`grid-template-columns: minmax(13rem, 16rem) minmax(0, 1fr)` gives the page index a stable 13–16rem column with flexible form space. Sticky positioning on the index column keeps navigation persistent while scrolling.

### 3. Header grid

`grid-template-columns: auto minmax(0, 1fr) auto` (brand | strip | actions). `--header-h: 118px` is economical for a header containing brand logos, completion strip, and sidebar toggle.

### 4. Rating scale grid

`repeat(4, minmax(0, 1fr))` with `gap: 6px`, `padding: 10px`. Compact four-column grid with score-level color encoding. The 760px → 2-col and 480px → 1-col breakpoints are correctly calibrated.

### 5. Panel scroll indicators

`::before`/`::after` pseudo-elements with gradient shadows provide scroll affordance (`can-scroll-up`/`can-scroll-down` state classes) without layout intrusion. Height of 6px is invisible until needed.

### 6. Section card border-left hierarchy

6px default → 8px active for `.doc-section`/`.form-section`. 4px for child elements (principle-item, page-index-button, evidence-block, context cards). This is a deliberate parent/child visual hierarchy that communicates nesting depth.

### 7. Field-grid responsive behavior

`repeat(auto-fit, minmax(240px, 1fr))` creates 2–4 columns depending on available width. 240px minimum accommodates field labels + controls. Collapses to single column at 760px breakpoint. Correct at all viewport sizes.

### 8. Context drawer mechanism

Fixed positioning, `width: min(34rem, calc(100vw - 12px))`, translate animation with `--duration-slow` (280ms). Backdrop with 20% opacity. Dismiss via Escape, backdrop click, or dismiss button. Three dismissal paths — robust.

### 9. Accent color system architecture

`accent-scoping.css` (207 lines) maps `data-accent-key` to 5-property sets for 13 section types. Body-level selectors drive shell chrome; element-level selectors drive scoped components. No layout impact — purely decorative via custom properties. Elegant and correct.

### 10. CSS containment on framework panel

`contain: layout style paint` isolates the context panel's rendering from the questionnaire. Prevents layout thrashing when the context panel re-renders.

### 11. Print stylesheet layout

Collapses shell to single-column flow, hides navigation chrome, forces all pages visible with `display: block !important`, adds `break-inside: avoid`, preserves color via `print-color-adjust: exact`. Comprehensive and correct.

---

## Spacing Token Audit

### Current spacing scale (`tokens.css:352-364`)

| Token       | Value | Used in gap/margin/padding |
| ----------- | ----- | -------------------------- |
| --space-1   | 4px   | 2 references               |
| --space-2   | 8px   | 5 references               |
| --space-3   | 12px  | 3 references               |
| --space-4   | 16px  | 2 references               |
| --space-4-5 | 18px  | 3 references               |
| --space-5   | 20px  | 0 references in gap        |
| --space-5-5 | 22px  | 2 references               |
| --space-6   | 24px  | 1 reference                |
| --space-7   | 28px  | 0 references               |
| --space-8   | 32px  | 0 references               |
| --space-10  | 40px  | 0 references               |
| --space-12  | 48px  | 0 references in gap        |

### Gap value frequency (raw pixels across all CSS files)

| Value | Count | Files                             | Token exists?                  |
| ----- | ----- | --------------------------------- | ------------------------------ |
| 2px   | 4     | components, interaction-states    | No                             |
| 6px   | 13    | components, layout                | No                             |
| 8px   | 0     | —                                 | Yes (--space-2)                |
| 10px  | 14    | components, layout                | No                             |
| 12px  | 13    | components, layout                | Yes (--space-3) but used raw   |
| 14px  | 4     | components                        | No                             |
| 18px  | 1     | components (two-col-list col gap) | Yes (--space-4-5) but used raw |
| 22px  | 0     | —                                 | Yes (--space-5-5)              |

**Token usage rate**: 7 of ~52 gap declarations use tokens (13%). The remaining 87% use raw pixel values.

### The three missing intermediate tokens

| Proposed token | Value | Justification                                                                                                                                                |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--space-1-5`  | 6px   | 13 occurrences — rating-scale gap, rating-option gap, page-index-list gap, evidence-action-strip gap, multiple context-link-group gaps                       |
| `--space-2-5`  | 10px  | 14 occurrences — checkbox-list gap, evidence-items gap, brand gap, sidebar-tab padding, context-link-list gap, page-index-button gap, multiple evidence gaps |
| `--space-3-5`  | 14px  | 4 occurrences — principle-list gap, score-cards/reference-cards gap, field-grid gap, pager-shell gap                                                         |

These three values represent the most commonly-used component-level spacing sizes in the entire codebase. Their absence from the token system is the single largest spacing consistency gap.

### Raw values where tokens already exist

12px is used as a raw value 13 times despite `--space-3` existing. 18px is used as a raw value 1 time despite `--space-4-5` existing. These should be straightforward replacements.

---

## Recommendations

### R1 — Add three missing intermediate spacing tokens

**Priority**: HIGH
**Description**: The spacing scale has gaps at 6px, 10px, and 14px — three values used 31 times across the codebase as raw pixel values. The existing scale follows a 4px grid (4, 8, 12, 16, 20, 24...) with half-steps at 18px and 22px. Adding half-steps at 6px, 10px, and 14px completes the scale and brings component-level spacing into the token system.
**Specifics**: Add to `tokens.css` after the existing spacing scale (after line 355):

```css
--space-1-5: 6px;
--space-2-5: 10px;
--space-3-5: 14px;
```

Then progressively replace raw values. Priority order for replacement (highest impact first):

1. `gap: 14px` (4 instances) → `gap: var(--space-3-5)`:
   - `components.css:158` `.principle-list`
   - `components.css:224` `.score-cards, .reference-cards`
   - `components.css:315` `.field-grid`
   - `components.css:1528` `.pager-shell`

2. `gap: 10px` (14 instances) → `gap: var(--space-2-5)`:
   - `components.css:414` `.mock-control`
   - `components.css:483` `.checkbox-list`
   - `components.css:489` `.checkbox-item`
   - `components.css:773` `.evidence-intake-footer`
   - `components.css:836` `.evidence-items`
   - `components.css:959` `.evidence-lightbox-dialog`
   - `components.css:1000` `.two-col-list`
   - `components.css:1227` `.page-index-button`
   - `components.css:1397` `.context-link-groups`
   - `components.css:1456` `.context-anchor-list`
   - `components.css:1588` `.reference-drawer-summary`
   - `components.css:1614` `.reference-drawer-summary-main`
   - `layout.css:52` `.brand`

3. `gap: 6px` (13 instances) → `gap: var(--space-1-5)`:
   - `components.css:503` `.rating-scale`
   - `components.css:514` `.rating-option`
   - `components.css:684` `.evidence-input-group`
   - `components.css:782` `.evidence-action-strip`
   - `components.css:1203` `.page-index-list`
   - `components.css:1261` `.page-index-meta`
   - `components.css:1402` `.context-link-group`
   - `components.css:1429` `.context-source-block`
   - `components.css:1436` `.context-source-list` (6px gap)
   - `components.css:1449` `.context-anchor-list`
   - `components.css:1706` `.help-section-map`
   - `layout.css:45` `.header-bar-toggles`

**Dependencies**: None. Pure token hygiene. Can be done incrementally — adding the tokens has zero visual impact; replacing raw values is a no-op in terms of rendered output.

---

### R2 — Replace raw 12px and 18px gap values with existing tokens

**Priority**: HIGH
**Description**: `--space-3` (12px) and `--space-4-5` (18px) already exist as tokens but are used as raw values in 14 gap declarations. This is the lowest-effort tokenization — no new tokens needed, just swap raw for `var()`.
**Specifics**:

Replace `gap: 12px` → `gap: var(--space-3)` in:

- `components.css:851` `.evidence-item`
- `components.css:1284` `.context-route-card, .context-anchor-card, .about-topic-meta`
- `components.css:1296` `.context-route-header`
- `components.css:1449` `.context-anchor-list, .about-topic-list`
- `components.css:1577` `.reference-drawer-stack`
- `components.css:1673` `.reference-drawer-panel`
- `components.css:1692` `.help-panel-shell`
- `components.css:1697` `.help-panel-shell .about-topic-view`
- `layout.css:154` `.panel-title-row`
- `layout.css:364` `.context-sidebar-shell, .context-generated-slot, .context-topic-stack`
- `layout.css:520` `.about-panel-shell`
- `layout.css:530` `.about-panel-shell .about-topic-view`
- `layout.css:566` (760px breakpoint) `.questionnaire-panel-header`

Replace `gap: 18px` → `gap: var(--space-4-5)` in:

- `components.css:1000` `.two-col-list` column gap (currently `gap: 10px 18px` → `gap: var(--space-2-5) var(--space-4-5)`)

**Dependencies**: R1 (for the 10px half of the two-col-list gap).

---

### R3 — Completion strip cell overflow at 760-1160px viewport

**Priority**: HIGH
**Description**: Wave 3 audit flagged completion strip crowding. The strip has 12+ cells at `min-width: 3.2rem` (51.2px) each, requiring ~614px minimum. With the sidebar toggle button (`min-height: 44px`), header-bar-divider, and brand logos, the header inner grid (`grid-template-columns: auto minmax(0, 1fr) auto`) can't always accommodate the strip. Between 800-1000px viewport width, the strip wraps to 2+ rows, increasing the header height beyond `--header-h: 118px` and causing a layout jump (the `calc(100dvh - var(--header-h))` panel heights become wrong).

At the 760px breakpoint, `--header-h` is overridden to `168px`, but between 760-1160px the 118px height is still assumed while the actual rendered height can be 140-168px depending on strip wrapping.
**Specifics**: Add a medium-viewport rule in `components.css` or `layout.css` to allow strip cells to compress:

```css
@media (max-width: 1000px) {
  .strip-cell {
    min-width: 2.4rem;
    padding: 0 4px;
    font-size: 0.625rem;
  }
}
```

This reduces cell minimum from 51.2px to 38.4px, allowing 12 cells to fit in ~462px — well within the available header space at 1000px. The smaller font size (10px) remains legible for the monospace codes.

Alternatively, add a targeted media query to update `--header-h`:

```css
@media (max-width: 1000px) and (min-width: 761px) {
  :root {
    --header-h: 140px;
  }
}
```

**Recommended approach**: Use the strip-cell compression strategy (first option) as it avoids a header-height jump and maintains the compact strip aesthetic. The 760px breakpoint already handles the single-column mobile case.

**Dependencies**: None.

---

### R4 — Pager-shell box-shadow contradicts flat-design principle

**Priority**: MEDIUM
**Description**: `.pager-shell` at `components.css:1534` uses `box-shadow: 0 1px 3px color-mix(in srgb, var(--ut-navy) 6%, transparent)`. This is the **only** outer box-shadow in the entire interface — every other `box-shadow` is an `inset` state indicator (strip cells, page-index buttons, section active states). The `.impeccable.md` design context explicitly says "No soft shadows — flat with border delineation." The pager already has `border: 2px solid var(--ut-border)` and `border-bottom: 2px solid color-mix(in srgb, var(--ut-navy) 12%, var(--ut-border))` — the shadow is redundant visual weight.
**Specifics**: In `components.css:1534`, remove the `box-shadow` property. The existing `border-bottom: 2px solid` already provides grounding emphasis. The pager's `background: color-mix(in srgb, var(--ut-navy) 5%, var(--ut-offwhite))` differentiates it from the white questionnaire background without shadow.

```css
.pager-shell {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) auto minmax(8rem, 1fr);
  gap: var(--space-3-5); /* or 14px pending R1 */
  align-items: center;
  padding: 12px 16px;
  border: 2px solid var(--ut-border);
  border-bottom: 2px solid color-mix(in srgb, var(--ut-navy) 12%, var(--ut-border));
  background: color-mix(in srgb, var(--ut-navy) 5%, var(--ut-offwhite));
}
```

**Dependencies**: None.

---

### R5 — Panel-inner and header-inner padding uses raw values

**Priority**: MEDIUM
**Description**: Three `panel-inner` rules and `header-inner` use raw pixel padding values that map directly to existing spacing tokens. Using tokens here would make the vertical rhythm traceable through the token system.
**Specifics**:

| Selector                            | Current                   | Tokenized                                                 | File:Line      |
| ----------------------------------- | ------------------------- | --------------------------------------------------------- | -------------- |
| `.panel-inner`                      | `padding: 20px 20px 48px` | `padding: var(--space-5) var(--space-5) var(--space-12)`  | layout.css:135 |
| `.questionnaire-panel .panel-inner` | `padding: 20px 28px 48px` | `padding: var(--space-5) var(--space-7) var(--space-12)`  | layout.css:320 |
| `.framework-panel .panel-inner`     | `padding: 20px 24px 48px` | `padding: var(--space-5) var(--space-6) var(--space-12)`  | layout.css:325 |
| `.header-inner`                     | `padding: 10px 24px 8px`  | `padding: var(--space-2-5) var(--space-6) var(--space-2)` | layout.css:20  |
| `.sidebar-tab`                      | `padding: 10px 16px 8px`  | `padding: var(--space-2-5) var(--space-4) var(--space-2)` | layout.css:399 |
| 760px `.panel-inner`                | `padding: 14px 14px 36px` | `padding: var(--space-3-5) var(--space-3-5) 36px`         | layout.css:225 |

Note: 36px in the 760px breakpoint doesn't have a token (between --space-8=32 and --space-10=40). Either keep it raw with a comment or snap to `var(--space-8)` (32px).

**Dependencies**: R1 (for the `--space-2-5` and `--space-3-5` tokens).

---

### R6 — Form-section padding tiers should use tokens

**Priority**: MEDIUM
**Description**: Three padding tiers exist for form/doc sections, all using raw values. These create the density hierarchy (default → principle sections → special sections). Using tokens makes the hierarchy explicit and traceable.
**Specifics**:

| Tier      | Selector                                           | Current              | Tokenized                                  | File:Line           |
| --------- | -------------------------------------------------- | -------------------- | ------------------------------------------ | ------------------- |
| Default   | `.doc-section, .form-section`                      | `padding: 18px 20px` | `padding: var(--space-4-5) var(--space-5)` | components.css:91   |
| Principle | `.doc-section[data-section='tr']` etc.             | `padding: 22px 24px` | `padding: var(--space-5-5) var(--space-6)` | components.css:109  |
| Special   | `.form-section#questionnaire-standard-answer-sets` | `padding: 14px 16px` | `padding: var(--space-3-5) var(--space-4)` | components.css:131  |
| Mobile    | 760px `.doc-section, .form-section`                | `padding: 14px`      | `padding: var(--space-3-5)`                | components.css:1157 |

**Dependencies**: R1 (for `--space-3-5`).

---

### R7 — Pager-shell center column squeeze at medium widths

**Priority**: LOW
**Description**: `.pager-shell` uses `grid-template-columns: minmax(8rem, 1fr) auto minmax(8rem, 1fr)`. Between 760-960px questionnaire workspace width, the center `auto` cell (`.pager-status`) can be squeezed to near-zero width because both button columns claim `1fr`. At the 760px breakpoint, the layout stacks to single column — but between 760-960px, the status text can be invisible or clipped.
**Specifics**: Cap button column growth:

```css
grid-template-columns: minmax(8rem, 14rem) auto minmax(8rem, 14rem);
```

This limits button width to 14rem (224px) while preserving the centered status. At narrower widths, buttons shrink to 8rem minimum as before. The status cell gains breathing room.

**Dependencies**: None. Independent of other changes.

---

### R8 — Tooltip dark background creates visual discontinuity

**Priority**: LOW
**Description**: Wave 3 critique flagged this. `.tooltip-content` at `components.css:1096-1114` uses `background: var(--ut-navy)` with white text — the only dark-surface element in the entire interface. Everything else is light backgrounds with border delineation. While the dark tooltip is functional (high contrast, clear layer), it clashes with the flat, light aesthetic that defines the tool. The 2px `border-radius` on a dark floating box looks severe — like a debug overlay rather than a designed element.
**Specifics**: Two options (choose one):

**Option A (minimal)**: Keep dark background but soften the corners:

```css
.tooltip-content {
  border-radius: 3px;
}
```

**Option B (full alignment)**: Use light background consistent with the rest of the UI:

```css
.tooltip-content {
  background: var(--ut-white);
  color: var(--ut-text);
  border: 2px solid var(--ut-navy);
  border-radius: var(--radius-md);
}
```

Option B aligns with the flat-design principle. The 2px navy border provides sufficient contrast against the white page background. The tooltip already has `border: 1px solid var(--ut-border)` — upgrading to 2px navy provides stronger containment without needing a dark fill.

**Dependencies**: None.

---

### R9 — Evidence-intake-grid lacks intermediate breakpoint

**Priority**: LOW
**Description**: `.evidence-intake-grid` uses `grid-template-columns: minmax(10rem, 12rem) minmax(0, 1fr) minmax(13rem, 16rem)` — three columns totaling a minimum of ~544px. At 760px, it collapses to single column. Between 760-1000px (a range where many laptop users operate), the three columns are cramped — the middle column (description textarea) gets as little as ~240px, which is tight for text input.
**Specifics**: Add an intermediate breakpoint:

```css
@media (max-width: 960px) and (min-width: 761px) {
  .evidence-intake-grid {
    grid-template-columns: minmax(10rem, 12rem) minmax(0, 1fr);
  }
}
```

This drops to two columns (type selector + combined description/association) at medium widths. The 760px rule already handles single-column collapse.

**Dependencies**: None.

---

### R10 — Subhead margin uses raw values matching existing tokens

**Priority**: LOW
**Description**: `.subhead` at `components.css:990` uses `margin: 24px 0 12px` — both values have tokens (`--space-6` and `--space-3`). Trivial tokenization.
**Specifics**:

```css
.subhead {
  margin: var(--space-6) 0 var(--space-3);
}
```

**Dependencies**: None.

---

## Preserved Patterns — DO NOT Change

### P1. Section border-left accent hierarchy (6px → 4px)

The parent/child accent width hierarchy (6px/8px for sections, 4px for child cards) is deliberate and consistent. Do not flatten.

### P2. Rating scale compact grid

`repeat(4, minmax(0, 1fr))` with `gap: 6px` is the right density for 4-option scoring. Do not increase gap.

### P3. Panel scroll shadow indicators

6px pseudo-elements with gradient provide scroll affordance without layout intrusion. Do not increase height.

### P4. Context panel doc-section uniform spacing

All doc-section elements in the context panel use identical spacing. Uniform spacing is correct for structured reference material.

### P5. Field-grid auto-fit responsive behavior

`repeat(auto-fit, minmax(240px, 1fr))` correctly adapts column count to available width. Do not switch to fixed columns.

### P6. Dense component padding

Field-group at 12px, mock-control at `10px 12px`, checkbox-block at `12px 14px`. These dense paddings are intentional for the information-dense evaluation workflow. Do not increase.

### P7. Header grid proportions

`grid-template-columns: auto minmax(0, 1fr) auto` correctly distributes brand | strip | actions. The completion strip's `flex: 1 1 auto` fills available space. Do not constrain.

---

## Spacing Rhythm Diagram

Vertical spacing through a typical form page (from outermost to innermost):

```
48px    panel bottom padding (scroll buffer, --space-12)
20px    panel top padding (--space-5)
16px    panel title margin-bottom (--space-4)
-6px    panel caption negative margin (pulls toward title)
16px    panel caption margin-bottom (--space-4)
24px    questionnaire-shell gap (--space-6)
  14px  questionnaire-panel-header gap (row)
  18px  questionnaire-panel-header gap (col, --space-4-5)
  22px  workspace-layout gap (--space-5-5)
    6px   page-index-list gap
    8px   page-index-group margin-top
  22px  questionnaire-workspace gap (--space-5-5)
    14px  pager-shell gap
    16px  pager-shell padding (horizontal)
    8px   form-section margin-bottom
    16px  form-section + form-section margin-top
      10px  section-kicker margin-bottom
      14px  h2 margin-bottom
      10px  field-grid margin-top
      14px  field-grid gap
        12px  field-group padding
          6px   field-label margin-bottom
          8px   field-help margin-top
      18px  criteria-stack gap (--space-4-5)
      16px  criterion-card padding (vertical)
        8px   h3 margin-bottom
        18px  criteria-stack gap
```

Rhythm progression: 6→8→10→12→14→16→18→20→22→24→48. Graduated from tight inner spacing to generous outer boundaries. This is the correct hierarchy for an information-dense evaluation tool.

---

## Summary

| ID  | Priority | Description                                          | Action                                           | Effort  |
| --- | -------- | ---------------------------------------------------- | ------------------------------------------------ | ------- |
| R1  | HIGH     | Missing 6px/10px/14px spacing tokens                 | Add `--space-1-5`, `--space-2-5`, `--space-3-5`  | Small   |
| R2  | HIGH     | Raw 12px/18px gaps where tokens exist                | Replace with `var(--space-3)`/`var(--space-4-5)` | Small   |
| R3  | HIGH     | Completion strip overflow at 760-1160px              | Add medium-viewport strip-cell compression       | Small   |
| R4  | MEDIUM   | Pager-shell soft shadow                              | Remove box-shadow, keep hard borders             | Trivial |
| R5  | MEDIUM   | Raw padding in panel-inner/header-inner              | Replace with token references                    | Small   |
| R6  | MEDIUM   | Form-section padding tiers use raw values            | Replace with token references                    | Small   |
| R7  | LOW      | Pager center column squeeze                          | Cap button columns at 14rem                      | Trivial |
| R8  | LOW      | Tooltip dark background discontinuity                | Lighten to white bg with navy border             | Small   |
| R9  | LOW      | Evidence-intake-grid missing intermediate breakpoint | Add 960px two-column rule                        | Small   |
| R10 | LOW      | Subhead raw margin values                            | Replace with `var(--space-6)`/`var(--space-3)`   | Trivial |

**HIGH**: 3 | **MEDIUM**: 3 | **LOW**: 4 | **No change**: 7 (P1–P7)

All changes are CSS-only. No HTML or JS modifications required. No new components needed. The three HIGH items (R1–R3) are the most impactful: R1/R2 are token hygiene that future-proofs the spacing system, R3 fixes a real layout bug at medium viewports.

---

## Implementation Order

1. **R1** first — adds tokens that R2, R5, R6, R10 depend on
2. **R2** next — immediate tokenization using newly-added tokens
3. **R3** — layout fix, independent of token work
4. **R4** — single-line removal, zero risk
5. **R5 + R6 + R10** — batch tokenization of padding values
6. **R7, R8, R9** — optional polish items

---

_End of Wave 4 Arrange Audit (Fresh Assessment)_
