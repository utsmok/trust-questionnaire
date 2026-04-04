# Wave 4: Arrange — Layout, Spacing & Visual Rhythm

**Date**: 2026-04-04
**Sources**: w3-plan.md (P1-02, P3-10), .impeccable.md, full CSS/HTML analysis
**Scope**: Layout, spacing, visual rhythm, information density, alignment, grid usage, proportions
**Constraint**: Read-only analysis — no source file edits

---

## Already Good — Do NOT Change

These elements are well-structured and should be left alone:

- **Spacing scale** (`--space-1` through `--space-12` in tokens.css:348-357): Consistent 4px-base scale. Well-defined, well-used throughout.
- **Two-panel shell grid** (`shell-layout` layout.css:223-228): `minmax(0, 1.45fr) minmax(20rem, 28rem)` — sensible proportions, proper collapse behavior at 1160px.
- **Workspace layout** (`workspace-layout` layout.css:300-305): `minmax(13rem, 16rem) minmax(0, 1fr)` — good page-index-to-form ratio.
- **Rating scale grid** (components.css:453-458): `repeat(4, minmax(0, 1fr))` with 6px gap — compact, dense, appropriate for the design philosophy.
- **Panel scroll containers** (`panel` layout.css:107-112): Fixed height via `calc(100dvh - var(--header-h))` with `overscroll-behavior: contain` — correct.
- **Surface card dimensions** (layout.css:389-396): `width: min(44rem, 100%)` with proper max-height calc — well-constrained.
- **Context drawer** (layout.css:445-484): Fixed positioning, width clamp, smooth translate animation — solid implementation.
- **Form section left-border accent** (6px default, 8px active): Creates strong visual anchoring and principle color coding. Central to the design identity.
- **Top accent bar** (layout.css:4-10): 5px fixed bar with section-scoped color via `@property` — effective and performant.

---

## Recommendations

### R1 — Header zone: differentiate brand from action (addresses P1-02)

**Priority**: HIGH
**Description**: Three zones in `.header-inner` (brand, completion-strip, top-nav) sit at equal visual weight within a single flex row. The brand takes up significant horizontal space with two 48px logos plus a text label, while the action nav buttons have the same border/background treatment as the brand container. The eye doesn't settle on a clear focal point.

**Specifics**:

- **`.header-inner`** (layout.css:20-29): The `gap: 18px` and `padding: 16px 24px 14px` are fine, but the flex container needs explicit zone separation. Add `border-bottom: 1px solid var(--ut-border)` only on `.brand` to create a visual divider, or restructure as a CSS Grid with named areas:
  ```css
  .header-inner {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 18px;
    padding: 12px 24px;
  }
  ```
- **`.brand`** (layout.css:31-36): Reduce `gap: 16px` to `gap: 10px`. Remove `min-width: 320px` (replace with `min-width: 0` with a grid layout). The brand is informational context, not a primary action — it should recede.
- **`.brand-logos`** (layout.css:43-47): Reduce `gap: 10px` to `gap: 8px`.
- **`.top-nav`** (layout.css:78-85): Increase visual weight relative to brand. Add `gap: 6px` (from 10px) to tighten button grouping — buttons should feel like a cohesive action bar, not spaced-out individual items.
- **`.completion-strip`** (components.css:4-19): Reduce `padding: 5px 8px` to `padding: 3px 6px` and `gap: 3px` to `gap: 2px`. The strip should feel like a compact status indicator, not a full-size UI element competing with nav buttons.
- **`.nav-button`** (components.css:55-75): Reduce `padding: 10px 18px` to `padding: 8px 14px`. Slightly smaller buttons in the header reduce visual mass while keeping 44px minimum touch targets.

**Dependencies**: R1 may require adjusting `--header-h` from 138px (tokens.css:287) to ~118px after padding/gap reductions. If `--header-h` changes, verify panel height calculations (`calc(100dvh - var(--header-h))`) still work correctly. R7 depends on this change.

---

### R2 — Header height: reduce vertical space consumption

**Priority**: HIGH
**Description**: `--header-h: 138px` is very tall. On a 1080p screen (the most common academic desktop resolution), the header consumes 12.8% of viewport height, leaving only 942px for the two-panel content area. The header content (brand logos at 48px + padding + strip + nav buttons) does not need 138px.

**Specifics**:

- **`:root { --header-h }`** (tokens.css:287): Target reduction to approximately 110-118px after R1 brand/nav tightening. The exact value depends on R1 implementation.
- **`.header-inner`** (layout.css:23): Reduce `padding: 16px 24px 14px` to `padding: 10px 24px 8px`. This alone saves ~12px.
- **Mobile override** (layout.css:204-206): The mobile `--header-h: 196px` should be proportionally reduced if the desktop value changes.

**Dependencies**: R1 (brand/nav tightening) should be done first to determine the final height. All `calc(100dvh - var(--header-h))` references will automatically adjust via the token.

---

### R3 — Form section spacing: create visual rhythm between sections

**Priority**: HIGH
**Description**: Form sections use inconsistent spacing patterns. The base `.doc-section, .form-section` has `margin: 0 0 16px` (components.css:90), but TRUST principle sections override to `margin-bottom: 24px` (components.css:113). Adjacent sections add `margin-top: 22px` (components.css:967). This creates an inconsistent beat: 16px gap for most sections, then 22-24px for principle sections, with no clear logic from the user's perspective. The `.questionnaire-shell` gap of 24px (layout.css:271) competes with section-level margins.

**Specifics**:

- **`.doc-section, .form-section`** (components.css:90): Change `margin: 0 0 16px` to `margin: 0 0 8px`. Sections should have tight bottom margins since the gap between distinct sections is handled by the stacking context.
- **`.doc-section + .doc-section, .form-section + .form-section`** (components.css:965-970): Change `margin-top: 22px` to `margin-top: 16px`. Consistent with the spacing scale (`--space-4`).
- **TRUST principle sections** (components.css:103-115): Remove the `margin-bottom: 24px` override — let them use the same margin as other sections. Instead, add a top border or increased `margin-top` only when transitioning from a non-principle section to a principle section (handled by existing border-left color change).
- **`.questionnaire-shell`** (layout.css:269-272): Keep `gap: 24px` — this governs spacing between the header block, reference drawers, and workspace, which is appropriate.

**Dependencies**: None. Independent of other changes.

---

### R4 — Field grid gap: increase breathing room between field groups

**Priority**: MEDIUM
**Description**: `.field-grid` uses `gap: 10px` (components.css:274), which is tight for fields containing labels, inputs, and help text. Adjacent field groups in multi-column grids feel cramped — the 10px gap is barely larger than the field group's own padding (12px), making it hard to distinguish where one field ends and the next begins.

**Specifics**:

- **`.field-grid`** (components.css:274): Increase `gap: 10px` to `gap: 14px` (`--space-3 + 2px` or a custom value). This creates clearer visual separation between fields in 2+ column layouts.
- **`.field-grid.principle-summary`** (components.css:282-286): Keep its distinct `padding-top: 16px` and `margin-top: 20px` — the top border already provides clear separation.

**Dependencies**: None.

---

### R5 — Panel inner padding: questionnaire panel needs more horizontal breathing room

**Priority**: MEDIUM
**Description**: `.questionnaire-panel .panel-inner` (layout.css:252-255) inherits `padding: 20px 20px 48px` from `.panel-inner` (layout.css:123-127). The questionnaire panel has a `max-width: 1680px` and contains the workspace layout with a 13-16rem sidebar plus form content. At wider viewports, the 20px horizontal padding feels tight relative to the content width, especially when form sections have their own 18-20px internal padding.

**Specifics**:

- **`.questionnaire-panel .panel-inner`** (layout.css:252-255): Override to `padding: 20px 28px 48px`. The extra 8px on each side gives form content more breathing room at wider viewports without being wasteful.
- **`.framework-panel .panel-inner`** (layout.css:257-259): Keep `max-width: 560px` — the context panel is already well-constrained. Could increase horizontal padding to match: `padding: 20px 24px 48px`.

**Dependencies**: None.

---

### R6 — Pager shell: increase vertical weight and visual grounding

**Priority**: MEDIUM
**Description**: The pager (components.css:1345-1389) is the primary navigation control for the questionnaire. It has `padding: 10px 12px` and a `border: 2px solid`, which gives it some presence, but at `gap: 10px` between the three columns it feels lightweight relative to its importance. The pager should feel like an anchor point at the bottom of each page.

**Specifics**:

- **`.pager-shell`** (components.css:1345-1353): Increase `padding: 12px 16px` (from `10px 12px`). Increase `gap: 10px` to `gap: 14px`.
- **`.pager-button`** (components.css:1355-1369): Increase `padding: 9px 12px` to `padding: 10px 16px`. Wider buttons improve clickability and visual balance.

**Dependencies**: None. Complements Wave 2's pager visual weight additions.

---

### R7 — Completion strip: show section code always, not just on hover (addresses P3-10)

**Priority**: MEDIUM
**Description**: The `.strip-cell` (components.css:21-43) is `min-width: 2.8rem` with `height: 24px` and `font-size: var(--text-xs)`. The section code is visible, but the strip cells are very small — at 12 sections, scanning for incomplete sections requires close inspection. The w3-plan flagged this as P3-10. Given the "expose the machine" design philosophy, section codes should be scannable without interaction.

**Specifics**:

- **`.strip-cell`** (components.css:21-43): Increase `min-width: 2.8rem` to `min-width: 3.2rem`. Increase `height: 24px` to `height: 28px`. Increase `font-size: var(--text-xs)` — this is already xs, so keep it, but ensure the code text (e.g., "S0", "TR1") is always visible.
- **`.completion-strip`** (components.css:4-19): The strip already shows codes. The real improvement is ensuring the `data-progress-state` visual treatments (interaction-states.css:1301-1343) have sufficient contrast between states so incomplete sections stand out from complete ones at a glance. This is already partially handled by the existing state styles.

**Dependencies**: R1 (completion strip padding reduction) — ensure the strip remains compact after R1's padding changes. The size increase here partially offsets R1's reduction.

---

### R8 — Section kicker to heading spacing: too tight

**Priority**: MEDIUM
**Description**: `.section-kicker` has `margin-bottom: 14px` (components.css:129) before the `h2` which has `margin: 0 0 10px` (components.css:141). This creates a 14px gap between kicker and heading, but only 10px between heading and body content. The heading should have more space below it than the kicker has below it, to establish clear hierarchy.

**Specifics**:

- **`.section-kicker`** (components.css:129): Reduce `margin-bottom: 14px` to `margin-bottom: 10px`.
- **`.doc-section h2, .form-section h2`** (components.css:139-149): Increase `margin: 0 0 10px` to `margin: 0 0 14px`. This creates the rhythm: tight(10) → heading → generous(14) → content.

**Dependencies**: None.

---

### R9 — Criterion card internal spacing: description to evidence gap

**Priority**: MEDIUM
**Description**: `.criterion-card` (components.css:526-533) has `padding: 16px 18px`. Inside, `h3` has `margin: 0 0 8px` (line 553) and `p` (description) has `margin: 0 0 12px` (line 563). Then `.criteria-stack` has `gap: 18px` (line 570) and `margin-top: 14px` (line 571). The gap between the description paragraph and the criteria stack is `12px (p margin-bottom) + 14px (stack margin-top) = 26px` — this is accidentally generous and creates inconsistent rhythm with the 8px heading-to-description gap.

**Specifics**:

- **`.criterion-card p`** (components.css:562-566): Change `margin: 0 0 12px` to `margin: 0 0 8px`.
- **`.criteria-stack`** (components.css:568-572): Change `margin-top: 14px` to `margin-top: 10px`. This creates a 18px total gap (8+10) between description and criteria — still distinct but tighter.

**Dependencies**: None.

---

### R10 — Evidence block spacing: evidence intake grid column proportions

**Priority**: LOW
**Description**: `.evidence-intake-grid` (components.css:626-629) uses `grid-template-columns: minmax(10rem, 12rem) minmax(0, 1fr) minmax(13rem, 16rem)`. The first column (type selector) at 10-12rem and the last column (notes) at 13-16rem create a 3-column layout that can feel unbalanced — the center column (file input) gets squeezed at narrower widths within the questionnaire panel.

**Specifics**:

- **`.evidence-intake-grid`** (components.css:626-629): Consider changing to `grid-template-columns: minmax(9rem, 11rem) minmax(0, 1fr) minmax(10rem, 14rem)` — slightly narrower fixed columns give the flexible center more room. This is a minor adjustment.
- Alternatively, at the 760px breakpoint where this already collapses to single-column (components.css:988-991), the current behavior is correct.

**Dependencies**: None.

---

### R11 — Surface card padding: increase for better content framing

**Priority**: LOW
**Description**: `.surface-card` (layout.css:389-396) has `padding: 20px 22px 22px`. The About and Help surfaces contain dense content (doc-sections, principle lists, governance details). The 20-22px padding is adequate but could benefit from slightly more vertical space, especially between the surface header and body.

**Specifics**:

- **`.surface-card`** (layout.css:395-396): Change `padding: 20px 22px 22px` to `padding: 22px 22px 24px`. Marginal improvement.
- **`.surface-header`** (layout.css:398-404): The `margin-bottom: 16px` is fine — keep it.

**Dependencies**: None.

---

### R12 — Reference drawer internal padding consistency

**Priority**: LOW
**Description**: `.reference-drawer-panel` (components.css:1481-1486) has `padding: 12px` and `gap: 12px`. Inside, `.mini-card` (components.css:188-193) has `padding: 12px`. This means the visual padding from the drawer edge to the card content is 24px (12+12), which is generous. Meanwhile, `.reference-drawer-summary` (components.css:1401-1415) has `padding: 10px 12px`. The summary and panel have slightly different vertical padding (10 vs 12).

**Specifics**:

- **`.reference-drawer-summary`** (components.css:1406): Change `padding: 10px 12px` to `padding: 12px` for consistency with `.reference-drawer-panel`.

**Dependencies**: None.

---

### R13 — Form subsection margin-top: use spacing token

**Priority**: LOW
**Description**: `.form-subsection` (components.css:266-269) uses `margin-top: 16px` and `padding-top: 8px`. The `margin-top: 16px` is correct (`--space-4`), but `padding-top: 8px` combined with no bottom padding/border creates an asymmetric feel — there's space above the subsection content but nothing closing it below.

**Specifics**:

- **`.form-subsection`** (components.css:266-269): Add `padding-bottom: 4px` to give the subsection a sense of closure, or add a `border-top: 1px solid var(--ut-border)` to replace the padding-top approach (the border would be more consistent with the existing `border-top` pattern in `.doc-section + .doc-section`).

**Dependencies**: None.

---

### R14 — Page index button spacing: active state visual differentiation

**Priority**: LOW
**Description**: `.page-index-list` (components.css:1016-1022) uses `gap: 6px`, and `.page-index-group` (components.css:1024-1026) uses `margin-top: 8px`. These tight spacings are appropriate for a navigation sidebar. However, the active page-index-button (interaction-states.css:933-938) only differs via `box-shadow: inset 0 3px 0` and background tint — there's no spacing change to make the active item "breathe" relative to neighbors.

**Specifics**: This is intentionally tight per the "density is a feature" principle. **No change recommended** — the current active treatment is sufficient with the inset shadow and tint. Noting here for completeness.

**Dependencies**: None.

---

### R15 — Context panel: route card to anchor card spacing

**Priority**: LOW
**Description**: `.context-sidebar-shell` (layout.css:293-298) uses `gap: 12px`. Inside, `.context-route-card` and `.context-anchor-card` both use `gap: 12px` (components.css:1102). The `.context-route-grid` (components.css:1184-1188) uses `gap: 8px`. The `.context-anchor-list` (components.css:1267-1271) uses `gap: 8px`. This nesting creates a consistent 12px → 8px rhythm that works well. **No change recommended.**

**Dependencies**: None.

---

## Implementation Priority Order

| Order | ID  | Priority | Effort  | Rationale                                           |
| ----- | --- | -------- | ------- | --------------------------------------------------- |
| 1     | R1  | HIGH     | Medium  | Header restructuring — largest layout change        |
| 2     | R2  | HIGH     | Low     | Token value change after R1 determines final height |
| 3     | R3  | HIGH     | Low     | Section margin consistency — 3 CSS value changes    |
| 4     | R8  | MEDIUM   | Trivial | 2 CSS value changes                                 |
| 5     | R4  | MEDIUM   | Trivial | 1 CSS value change                                  |
| 6     | R5  | MEDIUM   | Trivial | 2 CSS value changes                                 |
| 7     | R6  | MEDIUM   | Trivial | 2 CSS value changes                                 |
| 8     | R7  | MEDIUM   | Trivial | 2 CSS value changes                                 |
| 9     | R9  | MEDIUM   | Trivial | 2 CSS value changes                                 |
| 10    | R12 | LOW      | Trivial | 1 CSS value change                                  |
| 11    | R13 | LOW      | Trivial | 1-2 CSS value changes                               |
| 12    | R10 | LOW      | Trivial | 1 CSS value change                                  |
| 13    | R11 | LOW      | Trivial | 1 CSS value change                                  |

---

## Summary of Changes

- **3 HIGH**: Header zone differentiation (R1), header height reduction (R2), section spacing rhythm (R3)
- **6 MEDIUM**: Field grid gap (R4), panel inner padding (R5), pager weight (R6), completion strip scanability (R7), kicker-heading rhythm (R8), criterion card spacing (R9)
- **4 LOW**: Evidence grid columns (R10), surface card padding (R11), reference drawer consistency (R12), form subsection closure (R13)
- **2 NO-CHANGE**: Page index active state (R14), context panel spacing (R15) — already good

**Total**: 13 actionable CSS changes, all using existing spacing scale values or minor deviations from it. No structural HTML changes required. No new tokens needed — existing `--space-*` scale covers all recommendations.
