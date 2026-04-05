# Wave 4 — /normalize Audit (Fresh Reassessment)

**Date**: 2026-04-05  
**Auditor**: impeccable /normalize skill  
**Scope**: All CSS files in `static/css/` (8 files, ~4800 lines) + JS files with inline styles  
**Inputs**: `.impeccable.md` (design context), `.audit/w3-audit.md`, `.audit/w3-critique.md`  
**Previous w4-normalize.md**: Replaced — prior version was based on stale code state

---

## Already Good — Do NOT Change

These patterns are exemplary and should be preserved:

1. **z-index token system** — Fully tokenized. `tokens.css:374-386` defines 13 z-index layers (`--z-panel-shadow: 4` through `--z-lightbox: 1000`). All usages in `layout.css`, `components.css`, and `base.css` correctly reference `var(--z-*)` tokens. Zero hardcoded z-index values remain in CSS.

2. **Border-radius token system** — Fully tokenized. All `1px`, `2px` radius values correctly use `var(--radius-sm)` or `var(--radius-md)`. Zero hardcoded radius values outside the intentional `border-radius: 50%` on `.rating-dot` and `.tooltip-trigger-btn`.

3. **Tooltip timing** — `--duration-tooltip-leave: 75ms` token exists and is used at `components.css:1129`. Tooltip enter transitions correctly use `var(--duration-instant)`. Tooltip reduced-motion support is in place.

4. **Score-table th** — Duplicate rule block has been consolidated into a single `.score-table th` rule at `components.css:270-279`. Clean.

5. **Font-family tokens** — `--ff-body`, `--ff-heading`, `--ff-mono` used consistently everywhere. Zero hardcoded font-family values.

6. **Focus ring tokens** — `--focus-ring`, `--focus-ring-offset`, `--focus-ring-width` used uniformly across all `:focus-visible` declarations.

7. **Accent scoping** — `accent-scoping.css` (207 lines) maps 12 section families via `data-accent-key`. All section-scoped components correctly consume `--section-accent`, `--section-tint`, `--section-border`, `--section-on-accent`, `--section-accent-strong`.

8. **Print stylesheet** — Isolated and correct. Hardcoded `color: #000; background: #fff;` are intentional for maximum print contrast. `!important` usage limited to 2 necessary instances.

9. **Reduced motion** — `animations.css` zeroes all duration tokens globally and forces `animation: none !important`. Thorough and correct.

10. **Color system** — Zero hardcoded hex colors in CSS outside `tokens.css` and `print.css`. All colors use `var(--*)` or `color-mix(in srgb, ...)`. The only non-token color is `base.css:30` `#fff` which is a valid CSS-variable fallback for the skip-link.

---

## Recommendations

### R1 — Apply existing `--duration-accent` token to accent-bar transition

**Priority**: HIGH  
**Category**: Token drift

**Description**: `tokens.css:324` defines `--duration-accent: 400ms` but `interaction-states.css:3` still uses the hardcoded value `transition: --top-accent-color 400ms ease`. The token exists but is not consumed.

**Specifics**:

| File                       | Line                     | Current                                     | Should Be                                                                     |
| -------------------------- | ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `interaction-states.css:3` | `.top-accent` transition | `transition: --top-accent-color 400ms ease` | `transition: --top-accent-color var(--duration-accent) var(--ease-out-quart)` |

Also replaces the raw `ease` keyword with `--ease-out-quart` for consistency with all other transitions in the codebase. The `ease` keyword produces a gentler easing than `ease-out-quart`; if the accent bar specifically needs softer motion, document this decision with a comment.

**Dependencies**: None. Zero visual change — `400ms` = `var(--duration-accent)`. The easing change from `ease` to `--ease-out-quart` is marginally different but aligns with system consistency.

---

### R2 — Wire help-panel.js to existing `.help-shortcuts-*` CSS classes

**Priority**: HIGH  
**Category**: Token system bypass / Dead CSS

**Description**: `components.css:1802-1826` already defines `.help-shortcuts-table`, `.help-shortcuts-row`, `.help-shortcuts-key`, `.help-shortcuts-action` classes. However, `help-panel.js:235-263` still uses `element.style.cssText` inline style strings instead of applying these classes. This means the CSS classes are dead code and the JS bypasses the stylesheet cascade.

**Specifics**:

| File                    | Line                                   | Current                                             | Should Be |
| ----------------------- | -------------------------------------- | --------------------------------------------------- | --------- |
| `help-panel.js:235-236` | `shortcutsTable.style.cssText = '...'` | `shortcutsTable.className = 'help-shortcuts-table'` |
| `help-panel.js:255`     | `row.style.cssText = '...'`            | `row.className = 'help-shortcuts-row'`              |
| `help-panel.js:258-259` | `keyCell.style.cssText = '...'`        | `keyCell.className = 'help-shortcuts-key'`          |
| `help-panel.js:263-264` | `actionCell.style.cssText = '...'`     | `actionCell.className = 'help-shortcuts-action'`    |

**Dependencies**: None. The CSS already matches exactly. This removes the JS→CSS duplication.

---

### R3 — Move confirm-dialog.js styles to a CSS file

**Priority**: HIGH  
**Category**: Token system bypass / Hardcoded colors in JS

**Description**: `confirm-dialog.js:3-60` defines `DIALOG_STYLES` as a 60-line template literal injected via `<style>` element at runtime. This is the only JS file that defines visual styles with hardcoded hex fallback values and `rgba()` — patterns completely absent from the CSS codebase. The dialog also uses `z-index: 10000` which is 10x higher than `--z-lightbox: 1000` with no token.

**Specifics**:

| Line                      | Issue                                                                     | Fix                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `confirm-dialog.js:7`     | `z-index: 10000`                                                          | Add `--z-confirm: 10000` to `tokens.css`, or use `calc(var(--z-lightbox) + 1)`                                                                                                                                                           |
| `confirm-dialog.js:11`    | `background: rgba(0, 0, 0, 0.4)`                                          | `background: color-mix(in srgb, var(--ut-text) 40%, transparent)`                                                                                                                                                                        |
| `confirm-dialog.js:21`    | `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15)`                              | Remove — this is the only soft outer elevation shadow in the entire project. The `.impeccable.md` states "No soft shadows — flat with border delineation." Replace with a `2px solid var(--ut-border)` bottom border or remove entirely. |
| `confirm-dialog.js:15-53` | Fallback hex values `#fafbfc`, `#bfc6cf`, `#172033`, `#c60c30`, `#007d9c` | Remove fallbacks — CSS variables are guaranteed available at injection time since the stylesheet cascade is already loaded.                                                                                                              |

**Recommended approach**: Create `static/css/confirm-dialog.css` and load it via `<link>` in `trust-framework.html`. This moves all confirm-dialog styling into the stylesheet cascade where it belongs. If lazy-loading is needed, keep the injection pattern but strip fallbacks and use `color-mix()`.

**Dependencies**: None. The confirm dialog is only used by evidence deletion.

---

### R4 — Resolve `--ut-grey` / `--ut-offwhite` visual ambiguity

**Priority**: MEDIUM  
**Category**: Visual system clarity

**Description**: `--ut-grey` (#eef0f3, canvas) and `--ut-offwhite` (#f3f4f6) differ by only ~2% lightness. They're used for different semantic purposes (canvas background vs card accent background vs panel background) but are visually indistinguishable on most monitors. The critique flagged this: "If two surfaces look the same but represent different semantic layers, the visual system can't parse the hierarchy."

Usage count:

- `--ut-grey`: 10 instances (mock-control bg, chip bg, evidence-meta bg, tooltip btn hover, rating-scale bg, etc.)
- `--ut-offwhite`: 5 instances (principle-item bg, evidence-block bg, evidence-file-row bg, reference-drawer-code bg, completion-strip bg)
- `--ut-panel-bg`: 2 instances (framework-panel bg, form-section#standard-answer-sets bg) — value is `#f3f4f6`, same as `--ut-offwhite`

`--ut-panel-bg` is defined as `#f3f4f6` at `tokens.css:29` — identical to `--ut-offwhite` at `tokens.css:22`. This is either intentional aliasing or redundancy.

**Specifics**:

| Token           | Current   | Usage                                       |
| --------------- | --------- | ------------------------------------------- |
| `--ut-grey`     | `#eef0f3` | Canvas, mock-controls, chips, meta items    |
| `--ut-offwhite` | `#f3f4f6` | Principle items, evidence blocks, file rows |
| `--ut-panel-bg` | `#f3f4f6` | Framework panel, standard answer sets       |

**Fix**: Increase separation between canvas and card surfaces. Either:

- (a) Push `--ut-offwhite` to `#f7f8fa` — clearer 5% gap from canvas
- (b) Pull `--ut-grey` to `#eaecf0` — darker canvas emphasizes content cards
- (c) If `--ut-panel-bg` = `--ut-offwhite` is intentional, add a comment documenting the alias

**Dependencies**: None. Affects visual hierarchy but not layout or function.

---

### R5 — Add z-index scale documentation to tokens.css

**Priority**: MEDIUM  
**Category**: Maintainability / Documentation

**Description**: `tokens.css:374-386` defines 13 z-index tokens with values from 4 to 1000. The scale is correct and fully tokenized, but lacks documentation explaining the layering intent. Three tokens share value 50 (`--z-top-accent`, `--z-tooltip`, `--z-skip-link`) which is fine but should be noted.

**Specifics**: Add inline comments above the z-index block:

```css
/* Z-index scale — layered bottom to top.
   Shared layer (50): top-accent, tooltip, skip-link — no conflict
   because they occupy different screen regions. */
```

**Dependencies**: None.

---

### R6 — Document `color-mix()` and `@starting-style` browser floor

**Priority**: MEDIUM  
**Category**: Maintainability / Documentation

**Description**: The codebase uses ~100+ `color-mix()` instances and 2 `@starting-style` blocks. These establish hard browser compatibility floors (Safari 16.2+, Chrome 111+, Firefox 113+ for `color-mix()`; no Firefox support for `@starting-style`). Neither is documented in `CLAUDE.md`.

**Specifics**: Add to `CLAUDE.md` in the Code Style or Architecture section:

```markdown
## Browser Compatibility

- **Minimum**: Chrome 111+, Safari 16.2+, Firefox 113+ (required by `color-mix()` usage)
- **Graceful degradation**: `@starting-style` animations (Firefox unsupported — animations simply don't play)
- **`@property` registration**: Firefox 128+ (July 2024) — accent bar color transitions fall back to instant color change
```

**Dependencies**: None.

---

### R7 — Address `--ut-panel-bg` / `--ut-offwhite` token aliasing

**Priority**: LOW  
**Category**: Token clarity

**Description**: `tokens.css:29` defines `--ut-panel-bg: #f3f4f6` and `tokens.css:22` defines `--ut-offwhite: #f3f4f6` — identical hex values with different semantic names. `--ut-panel-bg` is used only twice (framework-panel, standard-answer-sets). Either:

- (a) `--ut-panel-bg` should reference `--ut-offwhite` to make the alias explicit: `--ut-panel-bg: var(--ut-offwhite);`
- (b) They should have different values (see R4)
- (c) Add a comment documenting the intentional equality

**Specifics**:

| File            | Line                     | Current                                            | Fix |
| --------------- | ------------------------ | -------------------------------------------------- | --- |
| `tokens.css:29` | `--ut-panel-bg: #f3f4f6` | `--ut-panel-bg: var(--ut-offwhite)` or add comment |

**Dependencies**: Related to R4 if values change.

---

### R8 — Address `.notice` line-height drift from `--lh-body`

**Priority**: LOW  
**Category**: Token drift

**Description**: `components.css:1019` uses `line-height: 1.5` for `.notice`. The `--lh-body` token is `1.55`. The 0.05 difference is imperceptible but creates inconsistency.

**Specifics**:

| File                  | Line      | Selector           | Current                                                                         | Should Be |
| --------------------- | --------- | ------------------ | ------------------------------------------------------------------------------- | --------- |
| `components.css:1019` | `.notice` | `line-height: 1.5` | `line-height: var(--lh-body)` or add comment documenting intentional difference |

**Dependencies**: None.

---

### R9 — Document `.brand-sep` `font-size: 1.1rem` as intentional

**Priority**: LOW  
**Category**: Token gap documentation

**Description**: `layout.css:80` uses `font-size: 1.1rem` for `.brand-sep` — a decorative pipe separator between logos. This value doesn't map to any token in the type scale (xs→sm→md→body→sub→heading→display). The gap between `--text-body` (1rem) and `--text-sub` (1.2rem) is appropriate for a single decorative character.

**Specifics**: Add comment `/* Intentional: decorative separator between logos */` at `layout.css:80`.

**Dependencies**: None.

---

### R10 — Document `.pager-shell` box-shadow as known design outlier

**Priority**: LOW  
**Category**: Design direction documentation

**Description**: `components.css:1534` uses `box-shadow: 0 1px 3px color-mix(in srgb, var(--ut-navy) 6%, transparent)` on `.pager-shell`. This is the only soft outer shadow in the entire interface. The `.impeccable.md` states "No soft shadows — flat with border delineation." The 3px blur is subtle but technically violates the principle.

The W3 audit noted this as acceptable. The W3 critique suggested replacing with a hard shadow. Options:

- (a) Keep and document as intentional exception
- (b) Replace with `box-shadow: 0 1px 0 var(--ut-border)` — hard 1px bottom line

**Specifics**: Add comment or replace at `components.css:1534`.

**Dependencies**: None. Minor visual change only for option (b).

---

### R11 — Document `.tooltip-trigger-btn` border-radius: 50% as intentional

**Priority**: LOW  
**Category**: Design direction documentation

**Description**: `components.css:1072` uses `border-radius: var(--radius-md)` on `.tooltip-trigger-btn` but the element is 44×44px, making `var(--radius-md)` (2px) produce a nearly-square shape. Wait — let me re-check. The W3 audit said `border-radius: 50%` but the current code shows `var(--radius-md)`. This discrepancy was already resolved — the button is now square (2px radius) which aligns with the design direction.

**Status**: Already correct. The W3 audit flagged a circle button; the current code uses `var(--radius-md)` (2px) which produces a square button. No action needed.

---

### R12 — Verify `--space-4-5` (18px) and `--space-5-5` (22px) half-step tokens

**Priority**: LOW  
**Category**: Token system clarity

**Description**: `tokens.css:358-359` defines `--space-4-5: 18px` and `--space-5-5: 22px` — non-standard half-steps in the otherwise 4px-grid spacing scale (4, 8, 12, 16, 20, 24, 28, 32, 40, 48). These are used in:

- `--space-4-5` (18px): `layout.css:24` (header-inner gap), `layout.css:346` (panel-header gap)
- `--space-5-5` (22px): `layout.css:370` (workspace-layout gap), `layout.css:383` (questionnaire-workspace gap)

Both are used for layout gaps where 16px was too tight and 20px was too loose. These are legitimate intermediate values. Consider documenting the reason they exist.

**Specifics**: Add comment at `tokens.css:358-359`:

```css
/* Half-step spacing for layout gaps where 4px grid is too coarse */
```

**Dependencies**: None.

---

## Summary Table

| ID  | Priority | Category                         | Effort  | Files                             | Visual Change  |
| --- | -------- | -------------------------------- | ------- | --------------------------------- | -------------- |
| R1  | HIGH     | Token drift (accent-bar timing)  | Trivial | `interaction-states.css`          | None           |
| R2  | HIGH     | Dead CSS / JS inline styles      | Small   | `help-panel.js`                   | None           |
| R3  | HIGH     | Token bypass / hardcoded colors  | Small   | `confirm-dialog.js`, new CSS file | Shadow removal |
| R4  | MEDIUM   | Visual ambiguity (grey/offwhite) | Small   | `tokens.css`                      | Subtle         |
| R5  | MEDIUM   | Z-index documentation            | Trivial | `tokens.css`                      | None           |
| R6  | MEDIUM   | Browser floor documentation      | Small   | `CLAUDE.md`                       | None           |
| R7  | LOW      | Token aliasing (panel-bg)        | Trivial | `tokens.css`                      | None           |
| R8  | LOW      | Line-height drift (notice)       | Trivial | `components.css`                  | Imperceptible  |
| R9  | LOW      | Font-size gap documentation      | Trivial | `layout.css`                      | None           |
| R10 | LOW      | Box-shadow design outlier        | Trivial | `components.css`                  | None/Minor     |
| R11 | LOW      | Tooltip button radius (resolved) | None    | —                                 | None           |
| R12 | LOW      | Half-step spacing documentation  | Trivial | `tokens.css`                      | None           |

**Total recommendations**: 12 (3 HIGH, 3 MEDIUM, 6 LOW)  
**Actionable**: 11 (R11 already resolved)  
**Estimated total effort**: ~2 hours  
**Zero visual changes**: R1, R2, R5, R6, R7, R9, R11, R12  
**Minor visual changes**: R3 (shadow removal), R4 (surface separation), R8 (imperceptible), R10 (optional)

---

## Cross-reference with W3 Audit Findings

| W3 Finding                                        | Status After This Audit                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P1.1 — z-index drift                              | **RESOLVED** — All 13 tokens defined and used via `var(--z-*)`                                            |
| P1.2 — Inline styles in JS                        | **PARTIAL** — `dom-factories.js` still uses inline (R3); `help-panel.js` classes exist but not wired (R2) |
| P2.1 — aria-live regions not pre-declared         | Not in normalize scope — deferred to `/harden`                                                            |
| P2.2 — Tab indicator layout read/write            | Not in normalize scope — deferred to `/optimize`                                                          |
| P2.6 — Z-index token documentation                | **R5** — Documentation recommended                                                                        |
| P3.1 — Duplicate .score-table th                  | **RESOLVED** — Single rule block now                                                                      |
| P3.2 — Tooltip button radius                      | **RESOLVED** — Now uses `var(--radius-md)` (2px), not 50%                                                 |
| P3.3 — .visually-hidden / .shell-focus-anchor DRY | Acknowledged — 12 shared declarations is acceptable overhead for independent utility classes              |
| P3.4 — Print colors                               | **RESOLVED** — Documented as intentional in prior wave                                                    |

New findings in this audit not in W3:

- **R1** — `--duration-accent` token exists but isn't consumed (400ms hardcoded)
- **R3** — Confirm dialog is the last JS file with inline styles, hardcoded hex, and `rgba()`
- **R4** — `--ut-grey` and `--ut-offwhite` are ~2% apart — visually indistinguishable
- **R6** — Browser compatibility floor not documented

---

_End of Wave 4 Normalize Audit (fresh reassessment)_
