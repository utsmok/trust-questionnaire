# Wave 4 — /normalize Audit

**Date**: 2026-04-04
**Scope**: All CSS files in `static/css/` — token consistency, hardcoded values, naming conventions, cross-file patterns
**Inputs**: .impeccable.md (design context), .audit/w3-plan.md (Wave 3 findings assigned to /normalize)

---

## Already Good — Do NOT Change

The following patterns are consistent and should be left alone:

- **Color token usage is excellent.** 219 `color-mix()` calls across CSS, all consuming design tokens. Outside `tokens.css` and `print.css`, there is exactly one raw hex fallback (`base.css:30` — `#fff` as a safe fallback for `var(--section-on-accent)`). This is correct defensive CSS.
- **Interaction states layer** uses tokens consistently for all semantic color families (score, judgment, recommendation, workflow, validation, progress).
- **Typography tokens** (`--text-*`, `--lh-*`, `--ls-*`, `--ff-*`) are used correctly across components and interaction states. The 7-step type scale is well-defined.
- **Spacing token scale** (`--space-1` through `--space-12`) is established. While not universally adopted (see R5), it is used correctly where present.
- **Border radius tokens** (`--radius-lg/md/sm`) are defined and used in `.mock-control` (components.css:362). The few remaining hardcoded radii match the token values (0, 1, 2, 50% for circles).
- **Focus ring tokens** (`--focus-ring`, `--focus-ring-offset`, `--focus-ring-width`) are used consistently for all `:focus-visible` states.
- **Easing tokens** (`--ease-out-quart`, `--ease-out-quint`) and duration tokens (`--duration-instant/fast/normal`) are used consistently for all transitions.
- **`--header-h`** is used as a calc operand throughout layout.css and overrides correctly at 760px.
- **`@property --top-accent-color`** with `inherits: true` enables the smooth accent-color transition across the shell — a well-implemented pattern.
- **Print stylesheet** correctly resets animations, hides chrome, and uses `print-color-adjust: exact` for scored elements. Hardcoded hex values in print (`#000`, `#fff`, `12pt`, `11pt`) are appropriate for print media.
- **`prefers-reduced-motion`** in animations.css correctly zeros out durations and sets `opacity: 1` on animated elements.

---

## Findings

### R1 — `font-weight: 800` regression (3 instances)

- **Priority**: HIGH
- **Description**: Wave 1 intended to normalize all `font-weight: 800` to 700. Three instances were missed. Inter loads only 400 and 700; weight 800 triggers browser synthesis, producing a blurrier, heavier appearance than true 700.
- **Specifics**:
  - `components.css:919` — `.subhead { font-weight: 800; }` → `font-weight: 700;`
  - `components.css:961` — `.form-section[data-section='governance'] .mock-control:first-of-type .value { font-weight: 800; }` → `font-weight: 700;`
  - `print.css:122` — `.section-kicker::before { font-weight: 800; }` → `font-weight: 700;`
- **Dependencies**: None. Pair with R2 (font import cleanup) for completeness.

### R2 — Unused `font-weight: 800` in Google Fonts import

- **Priority**: HIGH
- **Description**: The HTML loads `Inter:wght@400;700;800` but weight 800 is not used in any screen CSS. After R1 fixes the print.css instance, 800 will be unused everywhere. Requesting it adds ~15-20KB to the font download with zero benefit.
- **Specifics**:
  - `trust-framework.html:9` — `Inter:wght@400;700;800` → `Inter:wght@400;700`
- **Dependencies**: Depends on R1 (remove 800 from print.css first, then remove from import).

### R3 — `.skip-link` z-index uses magic number instead of token

- **Priority**: MEDIUM
- **Description**: `z-index: 50` in base.css matches the token `--z-skip-link: 50` but bypasses it. If the token value ever changes, the skip-link won't follow.
- **Specifics**:
  - `base.css:32` — `z-index: 50;` → `z-index: var(--z-skip-link);`
- **Dependencies**: None.

### R4 — `font-weight: 500` used without token — outside loaded weight set

- **Priority**: MEDIUM
- **Description**: Two instances of `font-weight: 500` appear in checkbox checked states. Inter loads 400 and 700. Weight 500 triggers intermediate synthesis, producing a weight between the two loaded faces. This creates visual inconsistency — the "checked" state has a different weight character than 700 used elsewhere for emphasis.
- **Specifics**:
  - `interaction-states.css:737` — `.checkbox-item:has(input:checked) { font-weight: 500; }` → `font-weight: 700;`
  - `interaction-states.css:747` — `.checkbox-item.has-checked { font-weight: 500; }` → `font-weight: 700;`
- **Dependencies**: None. Both selectors serve the same visual purpose (highlighting checked items).

### R5 — Hardcoded spacing values should use `--space-*` tokens

- **Priority**: LOW
- **Description**: The spacing scale (`--space-1` through `--space-12`) is well-defined but only used sparingly. Most padding, margin, and gap values are hardcoded pixel values. Many of these map directly to existing tokens. This is the largest normalization gap but lowest visual risk — the values are already consistent, just not token-referenced.
- **Mapping of common hardcoded values to tokens**:

  | Hardcoded | Token                        | Occurrences (approx) |
  | --------- | ---------------------------- | -------------------- |
  | `4px`     | `--space-1`                  | ~15                  |
  | `6px`     | (no token — between 1 and 2) | ~12                  |
  | `8px`     | `--space-2`                  | ~30                  |
  | `10px`    | (no token — between 2 and 3) | ~25                  |
  | `12px`    | `--space-3`                  | ~20                  |
  | `14px`    | (no token — between 3 and 4) | ~8                   |
  | `16px`    | `--space-4`                  | ~10                  |
  | `18px`    | (no token — between 4 and 5) | ~8                   |
  | `20px`    | `--space-5`                  | ~8                   |
  | `22px`    | (no token)                   | ~5                   |
  | `24px`    | `--space-6`                  | ~5                   |
  | `48px`    | `--space-12`                 | ~2                   |

- **Recommendation**: This is a large mechanical change with zero visual impact. Two approaches:
  1. **Incremental**: Tokenize only the most-repeated values (8px, 12px, 16px, 24px) in this wave.
  2. **Systematic**: Add intermediate tokens (`--space-2.5: 10px`, `--space-3.5: 14px`, `--space-4.5: 18px`) and tokenize everything.
- **Dependencies**: None. Can be done independently. Low risk.

### R6 — `#ffffff` hardcoded in tokens.css for two section on-accent values

- **Priority**: LOW
- **Description**: `--section-se-on-accent` and `--section-tc-on-accent` use raw `#ffffff` instead of `var(--ut-white)`. All other `*-on-accent` tokens use `var(--ut-white)`. If `--ut-white` is ever changed (e.g., to a warmer white for a theme), these two will not follow.
- **Specifics**:
  - `tokens.css:81` — `--section-se-on-accent: #ffffff;` → `--section-se-on-accent: var(--ut-white);`
  - `tokens.css:87` — `--section-tc-on-accent: #ffffff;` → `--section-tc-on-accent: var(--ut-white);`
- **Dependencies**: None.

### R7 — `font-size: 1.1rem` on `.brand-sep` — off the type scale

- **Priority**: LOW
- **Description**: The brand separator character uses `1.1rem`, which is between `--text-body: 1rem` and `--text-sub: 1.2rem`. This is the only `font-size` outside the type scale in screen CSS (excluding print). The value is a decorative separator glyph and likely intentional, but it breaks the scale discipline.
- **Specifics**:
  - `layout.css:62` — `.brand-sep { font-size: 1.1rem; }`
- **Recommendation**: Either promote to `--text-sub` (1.2rem, next step up) or accept as intentional one-off for a decorative glyph. Low visual impact either way.
- **Dependencies**: None.

### R8 — `letter-spacing: 0.04em` repeated without token

- **Priority**: LOW
- **Description**: The value `0.04em` appears in 3 places but has no dedicated token. It sits between `--ls-label: 0.02em` and `--ls-uppercase: 0.08em`. Used for evidence labels and criterion card annotations.
- **Specifics**:
  - `components.css:347` — `.completion-badge { letter-spacing: 0; }` (explicit reset, fine)
  - `components.css:549` — `.criterion-card::after { letter-spacing: 0.04em; }`
  - `components.css:661` — evidence input labels `letter-spacing: 0.04em;`
  - `interaction-states.css:962` — governance `.value { letter-spacing: 0.02em; }` (matches `--ls-label`, should use token)
- **Recommendation**:
  - Add `--ls-annotation: 0.04em;` to tokens.css
  - Replace the two `0.04em` instances in components.css with `var(--ls-annotation)`
  - Replace `0.02em` in interaction-states.css:962 with `var(--ls-label)`
- **Dependencies**: None.

### R9 — `line-height` hardcoded in several component styles

- **Priority**: LOW
- **Description**: Several components use inline `line-height` values that are not on the token scale. Most are for compact UI elements where the body/heading line heights would be too loose, so these are likely intentional. But they create inconsistency.
- **Specifics**:
  - `components.css:38` — `.strip-cell { line-height: 1; }` (compact chip — intentional)
  - `components.css:386` — `.mock-control .arrow { line-height: 1; }` (icon — intentional)
  - `components.css:944` — `.notice { line-height: 1.5; }` (between `--lh-body: 1.55` and `1`)
  - `components.css:1126` — `.context-route-title { line-height: 1.25; }` (close to `--lh-heading: 1.2`)
  - `components.css:1447` — `.reference-drawer-title { line-height: 1.3; }` (matches `--lh-sub: 1.3` — should use token)
- **Recommendation**: Only `1447` is a clear normalization candidate (replace with `var(--lh-sub)`). The others are intentional compact values for specific contexts.
- **Dependencies**: None.

### R10 — Hardcoded border widths: 6px and 3px section accent pattern

- **Priority**: LOW
- **Description**: The "section accent" left-border pattern uses `6px` (default state) and `8px` (active state) in components.css, and `3px` for kickers. The token system has `--border-thin: 1px`, `--border-default: 2px`, `--border-medium: 3px`, `--border-thick: 4px` — none of which cover 6px or 8px. These values are deeply embedded in the design language (section cards, criterion cards, notice panels).
- **Specifics**:
  - `6px` appears 3 times (components.css:93, 532, 938)
  - `8px` appears 4 times (interaction-states.css:116, 867, 871, and @starting-style:164)
  - `3px` appears 10+ times (kicker borders, panel borders, score table rows)
- **Recommendation**: Add `--border-accent: 6px;` and `--border-accent-active: 8px;` tokens. The 3px usage already maps to `--border-medium` in many places but is hardcoded. Consider a future pass to token-replace 3px with `var(--border-medium)`.
- **Dependencies**: R5 (spacing tokenization) should be done first to establish the pattern of adding intermediate tokens.

### R11 — `opacity` values used for disabled/attenuated states — no token

- **Priority**: LOW
- **Description**: Five opacity values are used for disabled/attenuated states: 0.6 (3×), 0.55, 0.45, 0.9. These are not tokens. If a consistent "disabled" or "attenuated" visual language is desired, these should be unified.
- **Specifics**:
  - `0.6` — components.css:763 (disabled controls), interaction-states.css:1058 (disabled rating option)
  - `0.55` — interaction-states.css:954 (disabled nav/page-index buttons)
  - `0.45` — interaction-states.css:1011 (disabled pager button)
  - `0.9` — interaction-states.css:1467 (skipped section)
- **Recommendation**: Unify disabled opacity to a single value. Consider adding `--opacity-disabled: 0.55;` and `--opacity-attenuated: 0.9;`. This would reduce 5 distinct values to 2.
- **Dependencies**: None.

---

## Implementation Priority Order

| Rank | ID  | Priority | Effort  | Rationale                                                            |
| ---- | --- | -------- | ------- | -------------------------------------------------------------------- |
| 1    | R1  | HIGH     | Trivial | 3-line fix. Eliminates synthesized font weight.                      |
| 2    | R2  | HIGH     | Trivial | 1-line fix. Saves ~15-20KB font download.                            |
| 3    | R3  | MEDIUM   | Trivial | 1-line fix. Token consistency.                                       |
| 4    | R4  | MEDIUM   | Trivial | 2-line fix. Eliminates synthesized font weight.                      |
| 5    | R8  | LOW      | Low     | Add 1 token, replace 3 values. Typography consistency.               |
| 6    | R6  | LOW      | Trivial | 2-line fix in tokens.css. On-accent consistency.                     |
| 7    | R9  | LOW      | Trivial | 1-line fix. Use existing `--lh-sub` token.                           |
| 8    | R10 | LOW      | Low     | Add 2 tokens, consider 3px→`--border-medium` migration.              |
| 9    | R11 | LOW      | Low     | Add 2 tokens, unify 5 opacity values to 2.                           |
| 10   | R7  | LOW      | Trivial | 1 value. Accept as-is or promote to `--text-sub`.                    |
| 11   | R5  | LOW      | High    | ~150+ mechanical replacements. Zero visual impact. Batch separately. |

---

## Verification Checklist

After implementation:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. Grep: zero `font-weight: 800` in any CSS file
4. Grep: `Inter:wght@400;700` (no 800)
5. Grep: `z-index: 50` only in tokens.css (not in base.css)
6. Grep: zero `font-weight: 500` in screen CSS
7. Grep: zero `#ffffff` in tokens.css outside of `--ut-white` definition
8. Visual: skip-link still works correctly
9. Visual: checked checkbox items still visually distinct (now 700 instead of 500)
10. Visual: `.subhead` and governance `.value` look correct at 700
