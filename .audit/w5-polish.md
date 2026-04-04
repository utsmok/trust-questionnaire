# Wave 5 — Final Polish Pass

**Date:** 2026-04-04
**Scope:** Pixel-perfect alignment, spacing consistency, micro-detail issues, print stylesheet, cross-browser concerns
**Prior waves:** W1 (typography/contrast/color/animation), W2 (heading scale/@property/pager/completion/evidence), W3 (diagnostics: 18/20 audit, 73/100 critique), W4 (header grid/focus traps/touch targets/copy/validation/tokenization)

---

## Verified — Already Good (Do NOT Change)

- **Color system:** Fully tokenized. Zero hardcoded hex values outside `tokens.css`. All `color-mix()` percentages are consistent within each semantic family (10% tints, 24% borders, 16% tints for sections, 32% borders for sections).
- **Typography scale:** All `font-size` values use tokens. No bare `rem` values in screen styles (only `print.css` and the `.brand-sep` decorative element at `1.1rem`, which is intentional).
- **Border radius:** All hardcoded radii (0, 1, 2, 50%) are deliberate and match the design context. `var(--radius-sm)` is used on the input group. No drift.
- **Z-index scale:** Fully tokenized in `tokens.css` with `--z-*` variables. Only two non-tokenized values remain: `.evidence-lightbox` at `z-index: 1000` (intentional top-layer override) and `.evidence-lightbox-dialog` at `z-index: 1` (local stacking context — correct).
- **Animation system:** All transitions use `var(--duration-*)` and `var(--ease-out-*)` tokens. `prefers-reduced-motion` is handled correctly in `animations.css`.
- **Focus indicators:** Consistent `outline: var(--focus-ring-width) solid var(--focus-ring)` pattern. One exception noted below (R1).
- **Print stylesheet:** Comprehensive. Hides chrome, reveals all pages, handles animation reset, provides `print-color-adjust: exact`, adds page breaks per principle. Well-structured.
- **Accent scoping:** Clean `@property --top-accent-color` pattern with `:where()` selector for scoping. No specificity issues.
- **Spacing scale:** `--space-1` through `--space-12` are defined. Most gaps and paddings align to these values or intentional compound values.

---

## Recommendations

### R1 — Rating option focus outline inconsistent with global pattern

- **Priority:** MEDIUM
- **Description:** `.rating-option:focus-visible` uses `outline: 2px solid var(--ut-blue)` with `outline-offset: var(--focus-ring-offset)` — the `2px` is a hardcoded value rather than the token `var(--focus-ring-width)`. Every other focus ring uses the token. This breaks consistency if the focus ring width is ever changed.
- **Specifics:** `interaction-states.css:775` — change `outline: 2px solid var(--ut-blue)` to `outline: var(--focus-ring-width) solid var(--focus-ring)`.
- **Dependencies:** None.

### R2 — Strip cell active outline uses different token than global focus ring

- **Priority:** LOW
- **Description:** `.strip-cell.is-active` uses `outline: 1px solid var(--section-accent-strong)` with `outline-offset: var(--focus-ring-offset)`. This is 1px vs the global 2px, and uses a different color variable. While this may be intentional (active indicator vs keyboard focus), the visual difference between "active" and "focused" is ambiguous.
- **Specifics:** `interaction-states.css:1307-1308`. Verify this is intentional. If the strip cell can also receive keyboard focus, consider adding a separate `:focus-visible` rule with the standard focus ring token, and keeping `outline` only on the `.is-active` class for the selection indicator.
- **Dependencies:** None.

### R3 — Disabled opacity values inconsistent across button types

- **Priority:** LOW
- **Description:** Three different opacity values for disabled states:
  - `.page-index-button:disabled, .nav-button:disabled` → `opacity: 0.55` (interaction-states.css:952)
  - `.pager-button:disabled` → `opacity: 0.45` (interaction-states.css:1009)
  - `.evidence-*:disabled` → `opacity: 0.6` (components.css:762)
  - `.rating-option[aria-disabled='true']` → `opacity: 0.6` (interaction-states.css:1056)
  - `.form-section[data-page-progress-state='skipped']` → `opacity: 0.9` (interaction-states.css:1477)

  The pager and nav/index buttons should match (both are navigation buttons). The evidence and rating controls are a separate category and can differ. The form-section 0.9 is a different concept (slight dimming, not disabled).

- **Specifics:** Consider aligning `.pager-button:disabled` to `opacity: 0.55` to match `.nav-button:disabled`. Optionally extract to a `--opacity-disabled` token.
- **Dependencies:** None.

### R4 — `.condition-tag` and `.display-tag` share styles but have different border colors

- **Priority:** LOW
- **Description:** Both tags are grouped in `components.css:308-331` and share identical structure, but `.condition-tag` uses `border-color: var(--neutral-400)` (which is `var(--ut-border)`) while `.display-tag` uses `border-color: var(--neutral-200)`. This creates a subtle but perceptible difference between tags that appear adjacent in the UI. If this distinction is intentional, it should be documented. If not, they should match.
- **Specifics:** `components.css:324` vs `components.css:330`. Align both to `var(--neutral-400)` unless the visual distinction is intentional.
- **Dependencies:** None.

### R5 — `.impeccable.md` canvas color mismatch with token

- **Priority:** LOW
- **Description:** The design context file `.impeccable.md` states "UT Grey (#f0f1f2) Canvas" but `tokens.css:20` defines `--ut-grey: #eef0f3`. These are different colors (#f0f1f2 vs #eef0f3). The actual token value should be authoritative since it's what renders.
- **Specifics:** Update `.impeccable.md:80` from `#f0f1f2` to `#eef0f3`.
- **Dependencies:** None. Documentation-only fix.

### R6 — `--space-7` missing from spacing scale

- **Priority:** LOW
- **Description:** The spacing scale jumps from `--space-6: 24px` to `--space-8: 32px`, skipping 28px. Several gap values use `22px` and `18px` which don't align to the scale. This is not a bug — the existing values are intentional compound values — but it means some gaps can't be expressed as tokens.
- **Specifics:** This is informational. No change needed unless a systematic tokenization pass is planned. The 22px gaps (workspace layout, questionnaire workspace) and 18px gaps (header, section stacks) are intentional intermediate values.

### R7 — Print stylesheet missing evidence-item visibility reset

- **Priority:** MEDIUM
- **Description:** The print stylesheet resets animation classes (`.is-page-transitioning-out`, `.is-page-transitioning-in`, `.is-removing`) but does not reset `.is-page-hidden` and `.is-context-hidden` to `display: block !important` on all children. Line 58-59 handles `.is-page-hidden` and `.is-context-hidden` — this is correct. However, evidence items within a visible page could still have `.is-removing` class applied at print time. Line 88 handles this for `.evidence-item.is-removing` — this is correct.
- **Specifics:** Actually, upon re-review, this is handled correctly. No change needed. Flagged as verified-good.
- **Dependencies:** None.

### R8 — `.header-progress-summary` uses `padding: 8px 10px` (not on spacing scale)

- **Priority:** LOW
- **Description:** `interaction-states.css:1188` uses `padding: 8px 10px`. While `8px` maps to `--space-2`, `10px` doesn't map to any token. This is a compact element where the asymmetry is intentional for density.
- **Specifics:** No change needed. The element is intentionally compact and the values are close enough to the scale.
- **Dependencies:** None.

### R9 — `ul, ol` margin and padding use bare values outside spacing scale

- **Priority:** LOW
- **Description:** `base.css:93-94` uses `margin: 10px 0 0` and `padding-left: 20px`. Neither maps to the spacing scale (10px is between `--space-2` and `--space-3`, 20px is `--space-5`). This is the global list reset.
- **Specifics:** Consider `margin: var(--space-3) 0 0` and `padding-left: var(--space-5)` for consistency. This is a minor change and only affects list indentation globally.
- **Dependencies:** None. Visual regression unlikely since the values are close.

### R10 — No `:active` state on pager buttons

- **Priority:** LOW
- **Description:** `.pager-button` has a `transition: opacity` but no explicit `:active` state. `.nav-button` has `:active { background: ... }` but `.pager-button` does not. This means clicking the pager gives no visual feedback beyond the default browser active state.
- **Specifics:** Add a `:active` rule for `.pager-button` matching the pattern of `.nav-button:active` — e.g., `background: color-mix(in srgb, var(--ut-grey) 80%, var(--ut-border))`.
- **Dependencies:** None.

### R11 — Print stylesheet `font-size: 12pt` and `font-size: 11pt` are not tokenized

- **Priority:** NONE
- **Description:** `print.css:124` and `print.css:161` use bare `pt` values. This is correct — print stylesheets conventionally use `pt` units and don't need screen tokens.
- **Specifics:** No change.
- **Dependencies:** None.

### R12 — `.context-route-title` missing `letter-spacing` token

- **Priority:** LOW
- **Description:** `components.css:1131` sets `letter-spacing: var(--ls-uppercase)` on `.context-route-title`. This is correct. However, `.context-route-title` at line 1127 sets `font-family: var(--ff-heading)` and `text-transform: uppercase` but uses `line-height: 1.25` instead of `var(--lh-sub)` (which is `1.3`). The 0.05 difference is negligible but inconsistent.
- **Specifics:** `components.css:1128` — change `line-height: 1.25` to `line-height: var(--lh-sub)` for consistency.
- **Dependencies:** None.

### R13 — `.brand-sep` uses bare `font-size: 1.1rem`

- **Priority:** NONE
- **Description:** `layout.css:61` uses `font-size: 1.1rem` for the brand separator. This is a decorative element between logos, not a typographic component. The bare value is intentional.
- **Specifics:** No change.
- **Dependencies:** None.

---

## Summary

| Priority | Count | Items                                                                      |
| -------- | ----- | -------------------------------------------------------------------------- |
| MEDIUM   | 2     | R1 (rating focus ring token), R5 (doc color mismatch — documentation only) |
| LOW      | 7     | R2, R3, R4, R9, R10, R12                                                   |
| NONE     | 4     | R6, R7, R8, R11, R13                                                       |

**Overall assessment:** The codebase is in excellent shape after 4 waves of improvements. The tokenization is thorough, the spacing is consistent, and the interaction states are well-defined. The remaining issues are minor consistency refinements — no structural or architectural problems remain. The most actionable item is R1 (rating focus ring token alignment), which is a one-line fix. R5 is a documentation correction. Everything else is LOW priority polish.

**Things that are working well and should NOT be touched:**

- The `color-mix()` token system is clean and consistent
- The `@property --top-accent-color` transition mechanism
- The `@starting-style` animations for active states
- The print stylesheet structure
- The `:where()` scoping for accent variables
- The z-index scale tokenization
- The reduced-motion handling
