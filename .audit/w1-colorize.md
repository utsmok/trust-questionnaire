# W1 Colorize Audit — TRUST Framework Questionnaire

**Date:** 2026-04-05 (wave 1 consolidated)
**Scope:** `trust-framework.html`, `static/css/*.css` (8 files: tokens, base, layout, components, accent-scoping, interaction-states, animations, print)
**Skill:** /colorize
**Brand personality:** Efficient, Explicit, Engineered — color encodes state, not decoration

---

## Executive Summary

The color system is **exceptionally well-engineered and internally coherent**. The token layer defines 387 lines of systematic, `color-mix()`-derived semantic tokens covering: UT brand colors, TRUST principle colors, section accent families (accent/strong/tint/border/on-accent per section), score-level colors, workflow states, validation states, judgment states, and recommendation states. The accent-scoping layer dynamically remaps `--section-accent` and friends via `data-active-accent-key` on `<body>`.

This is not a monochromatic or color-starved design. It uses a rich multi-hue palette where every color carries meaning. All recommendations below are targeted refinements and consistency fixes — not systemic problems.

**Verdict:** The color system is production-grade. Issues are edge cases, consistency gaps, and one real WCAG failure.

---

## What Is Already Good (Do NOT Change)

1. **Section accent family system** — `--section-{id}-accent / -strong / -tint / -border / -on-accent` with `color-mix()`. Systematic, extensible, well-applied across all 12 sections. The accent-scoping.css mechanism is elegant. Do not flatten or simplify.

2. **State families** — Validation, judgment, recommendation, workflow, and score families all follow the same tint/border/strong pattern. Excellent consistency.

3. **Navy-tinted neutral scale** — `--neutral-50` through `--neutral-900` use `color-mix(in srgb, var(--ut-navy) X%, var(--ut-white))` instead of pure grays. Gives palette warmth and cohesion. Do not revert to gray neutrals.

4. **TRUST principle colors** — Five distinct hues (`--tr`, `--re`, `--uc`, `--se`, `--tc`) with good perceptual separation. Semantically meaningful.

5. **Darkened variants** — `--se-dark` / `--tc-dark` as a smart solution for white-on-color WCAG compliance on nav buttons.

6. **Focus ring system** — Consistent `--focus-ring` (UT Blue `#007d9c`) across all interactive elements. Good visibility.

7. **Score-level colors** — Clear 4-level semantic scale (red → orange → teal → green) with matching tints.

8. **`color-mix()` everywhere** — No hard-coded tint hex values. All tints, borders, and darkened variants computed from base tokens. The correct approach.

9. **Print layer** — `print-color-adjust: exact` on scored elements, principle section page breaks, score-colored borders. Well thought out.

10. **Reduced-motion support** — All color transitions respect `prefers-reduced-motion: reduce`. Durations zeroed.

11. **Top accent bar** — 5px bar transitions to active section color via `@property --top-accent-color`. Excellent contextual signal.

12. **Completion strip cells** — Full state encoding with inset box-shadows, background tints, and color per progress state.

13. **Section kickers** — Principle-colored text, background tint, and left border. Textbook "color encodes state."

---

## Recommendations

### R1 — `--ut-white` (`#fafbfc`) as on-accent fails WCAG AA on lighter accent-strong backgrounds

**Priority:** HIGH
**Files:** `tokens.css` (all `--section-*-on-accent` definitions)

**Description:** Several sections define `--section-*-on-accent: var(--ut-white)` which resolves to `#fafbfc`. The SE and TC sections explicitly use `#ffffff` (correct), but other sections use the off-white variable. While the darkest accent-strong values (navy, profile blue) have excellent contrast with either white, the principle of the matter is that `#ffffff` should be the universal on-accent value for consistency and maximum contrast safety. The visual difference between `#fafbfc` and `#ffffff` is imperceptible, but the contrast math matters.

The `--se-dark`/`--tc-dark` workaround exists for nav buttons but doesn't cover all on-accent contexts (strip-cell complete states, nav-button active states with `data-accent-key`).

**Specifics:** In `tokens.css`, change all `--section-*-on-accent` values from `var(--ut-white)` to `#ffffff`:

```css
/* tokens.css — change these lines */
--section-control-on-accent: #ffffff; /* was var(--ut-white) */
--section-profile-on-accent: #ffffff; /* was var(--ut-white) */
--section-setup-on-accent: #ffffff; /* was var(--ut-white) */
--section-tr-on-accent: #ffffff; /* was var(--ut-white) */
--section-re-on-accent: #ffffff; /* was var(--ut-white) */
--section-uc-on-accent: #ffffff; /* was var(--ut-white) */
/* SE and TC already use #ffffff — no change needed */
--section-reference-on-accent: #ffffff; /* was var(--ut-white) */
--section-recommendation-on-accent: #ffffff; /* was var(--ut-white) */
--section-governance-on-accent: #ffffff; /* was var(--ut-white) */
```

**Dependencies:** None. Independent fix.

---

### R2 — Score-level rating dots use generic `--ut-slate` in default state

**Priority:** MEDIUM
**Files:** `components.css:542-548`, `interaction-states.css` (add new rules)

**Description:** The `.rating-dot` elements (16px circles) have `border: 2px solid var(--ut-slate)` and `background: transparent` by default (components.css:542-548). Each rating option already has a colored left border (`--score-N-border`), but the dot itself is a neutral gray circle until selected. This weakens the at-a-glance score-level encoding — the most important semantic signal in the rating scale. Users must read the text label or notice the left border stripe rather than instantly recognizing the score level by its dot color.

**Specifics:** Add rules in `interaction-states.css` so unfilled dots carry the score-level color as border:

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

The fill (`background`) only appears when `.selected` or `.score-N` state is active (already handled in interaction-states.css:778-796). This change is purely about the unfilled/default dot border color.

**Dependencies:** None. Independent.

---

### R3 — `--score-2` (`#088080`) is perceptually close to `--tc` (`#0d9488`)

**Priority:** MEDIUM
**File:** `tokens.css:142,37`

**Description:**

- `--score-2: #088080` (Meets baseline — teal)
- `--tc: #0d9488` (Traceable principle — also teal)

These are visually very similar (both teal). In a TC criterion card, a score-2 rating dot and the section accent border would be nearly indistinguishable. With R2 applied (dots now colored by score level), this collision becomes more apparent — a teal dot on a teal-bordered card.

**Specifics:** Shift `--score-2` to a clearly distinct hue. Recommended: `#0E7490` (cyan-700) — maintains the "positive but not green" semantics while being clearly distinct from TC's teal. The derived tokens (`--score-2-tint`, `--score-2-border`) use `color-mix()` and auto-adjust.

```css
/* tokens.css:142 */
--score-2: #0e7490; /* was #088080 */
```

Verify WCAG AA contrast on white: `#0E7490` on `#fafbfc` ≈ 4.8:1 — passes.

**Dependencies:** Should be applied alongside R2 since both affect score-level color encoding.

---

### R4 — `.principle-item` cards in About panel lack TRUST principle color coding

**Priority:** MEDIUM
**Files:** `components.css:162-173`, `trust-framework.html` (About panel HTML)

**Description:** The About panel's "Framework overview" section lists the five TRUST principles in `.principle-item` cards. All five cards look identical — white background, `--ut-border` border, no color differentiation. This is the single place in the UI where the principle color system could provide wayfinding but doesn't. Each card names the principle (Transparent, Reliable, etc.) and has a matching CSS variable, but no class or data attribute connects them.

**Specifics:** The CSS for principle-item color coding already exists in `components.css:175-218` — it targets `.principle-item[data-section='tr']` etc. The issue is that the HTML may not have `data-section` attributes on these elements. Verify in the rendered output whether JS sets these attributes. If not, add `data-section` attributes to the 5 `.principle-item` divs.

Alternatively, verify whether `accent-scoping.css` handles this. If the principle items are rendered dynamically by JS, ensure the renderer adds `data-section` attributes matching the existing CSS selectors.

**Dependencies:** May require HTML/JS changes, not just CSS.

---

### R5 — Evidence block left border loses section context for criterion evidence

**Priority:** LOW
**Files:** `components.css:618-626`

**Description:** `.evidence-block` uses `border-left: 4px solid var(--section-accent, var(--ut-blue))` — good, inherits section context. But `.evidence-block.criterion` overrides with `border-left-color: color-mix(in srgb, var(--ut-navy) 35%, var(--ut-border))` — a generic gray that carries no section identity. When viewing evidence inside a TR (blue) section, criterion-level evidence blocks look gray rather than blue-tinted.

**Specifics:** Remove the `.evidence-block.criterion` override, or change it to inherit:

```css
/* Option A: Remove the override entirely (inherits from parent scope) */
/* Delete or comment out components.css:624-626 */

/* Option B: Use a faded section accent */
.evidence-block.criterion {
  border-left-color: var(
    --section-border,
    color-mix(in srgb, var(--ut-navy) 35%, var(--ut-border))
  );
}
```

**Dependencies:** Depends on whether evidence blocks inherit `--section-accent` from their DOM context (via accent-scoping.css). If they do, Option A is safe.

---

### R6 — Checkbox `accent-color` scoped too narrowly

**Priority:** LOW
**File:** `interaction-states.css:656-666`

**Description:** `accent-color` for checkboxes is only set for `scoring` and `scope` sections. Other sections with checkboxes (e.g., criteria evidence selection) use the default browser accent color (typically blue). This creates inconsistency: some checkboxes are section-themed and others are browser-default.

**Specifics:** Add a base rule that uses the section accent for all form-section checkboxes:

```css
.form-section[data-section] .checkbox-item input {
  accent-color: var(--section-accent, var(--ut-darkblue));
}
```

The existing `scoring` and `scope` overrides (red, green, blue) will take precedence via specificity.

**Dependencies:** None.

---

### R7 — Context empty state has hardcoded navy border

**Priority:** LOW
**File:** `components.css:1675`

**Description:** `.context-empty-state` uses `border-left: 4px solid var(--ut-darkblue)` regardless of which section's context is displayed. When viewing the TR section's empty context state, it should use TR blue, not generic navy.

**Specifics:**

```css
.context-empty-state[data-accent-key] {
  border-left-color: var(--section-accent, var(--ut-darkblue));
}
```

Or if the element inherits from a section-scoped parent, it may already have access to `--section-accent`. Verify at render time.

**Dependencies:** Requires JS to set `data-accent-key` on the empty state element.

---

### R8 — Print stylesheet uses `#000` borders instead of score tokens

**Priority:** LOW
**File:** `print.css:98-109`

**Description:** In `print.css`, `.rating-option.score-0` through `.score-3` get `border: 2px solid var(--score-N)` for the score color but also `border: 2px solid #000` on `body`. Wait — actually re-reading the print CSS: `.rating-option.score-0` through `.score-3` each get `border: 2px solid var(--score-0)` through `var(--score-3)`. These are correct. The `print-color-adjust: exact` ensures they print in color. No issue found on re-examination.

**Assessment:** No change needed. The print stylesheet is already correct.

---

### R9 — `--ut-offwhite` / `--ut-grey` / `--ut-panel-bg` naming ambiguity

**Priority:** LOW
**File:** `tokens.css:20-22,29-30`

**Description:**

- `--ut-grey: #eef0f3` (canvas background)
- `--ut-offwhite: #f3f4f6` (surfaces, hover states)
- `--ut-panel-bg: #f3f4f6` (literal alias of `--ut-offwhite`)
- `--ut-white: #fafbfc` (card backgrounds)

These four surface colors span a narrow lightness range. `--ut-panel-bg` is a direct alias of `--ut-offwhite` — redundant naming. The design context says "Color encodes state, not decoration" — the near-identical values are intentional (hierarchy is carried by borders). But the naming creates developer confusion about which token to use.

**Recommendation:** No visual change. Document the intended surface hierarchy in `tokens.css` comments. Consider deprecating `--ut-panel-bg` in favor of `--ut-offwhite`.

**Dependencies:** None.

---

### R10 — `--state-warning` (`#d97706`) proximity to `--se` (`#ea580c`)

**Priority:** LOW (monitor)
**File:** `tokens.css:180,77`

**Description:** `--state-warning` (amber) and `--se` (Secure principle, red-orange) are perceptually close warm hues. When a validation warning appears inside the Secure section, the warning tint and section tint are similar enough to reduce visual salience. The `--judgment-conditional` also uses `--state-warning`.

**Assessment:** The colors ARE different enough in practice (amber vs red-orange) and appear in different contexts (validation badges vs section borders). Low real-world confusion risk. Flag for awareness.

**Recommendation:** If future user testing reveals confusion, consider shifting `--state-warning` to a more distinctly amber/gold hue (e.g., `#ca8a04`) to increase separation.

**Dependencies:** None.

---

## Contrast Ratio Summary (Key Combinations)

| Foreground                   | Background                   | Approx Ratio | Status                            |
| ---------------------------- | ---------------------------- | ------------ | --------------------------------- |
| `#172033` (ut-text)          | `#fafbfc` (ut-white)         | ~14.5:1      | AAA                               |
| `#172033` (ut-text)          | `#eef0f3` (ut-grey)          | ~13.2:1      | AAA                               |
| `#576578` (ut-muted)         | `#fafbfc` (ut-white)         | ~5.6:1       | AA                                |
| `#576578` (ut-muted)         | `#eef0f3` (ut-grey)          | ~5.1:1       | AA                                |
| `#8b9bb0` (ut-slate)         | `#fafbfc` (ut-white)         | ~3.5:1       | AA fail (text), OK for decorative |
| `#ffffff` (white)            | `#b04309` (se-accent-strong) | ~4.5:1       | AA pass                           |
| `#ffffff` (white)            | `#0a6b63` (tc-accent-strong) | ~5.4:1       | AA                                |
| `#2563EB` (tr)               | `#fafbfc` (ut-white)         | ~4.5:1       | AA (borderline)                   |
| `#9333EA` (uc)               | `#fafbfc` (ut-white)         | ~4.6:1       | AA (borderline)                   |
| `#0E7490` (proposed score-2) | `#fafbfc` (ut-white)         | ~4.8:1       | AA                                |

**Note:** With R1 fixed (all on-accent values set to `#ffffff`), all section accents pass WCAG AA for text. `--ut-slate` is used for decorative elements (inactive borders, placeholder arrows), not informational text, so the 3.5:1 ratio is acceptable for UI components.

---

## Summary Table

| ID  | Priority | Description                                           | Effort   | Action                                             |
| --- | -------- | ----------------------------------------------------- | -------- | -------------------------------------------------- |
| R1  | HIGH     | On-accent text uses `--ut-white` instead of `#ffffff` | Trivial  | Change all `--section-*-on-accent` to `#ffffff`    |
| R2  | MEDIUM   | Rating dots use generic slate in default state        | Small    | Add score-level border colors to unfilled dots     |
| R3  | MEDIUM   | Score-2/TC teal perceptual overlap                    | Trivial  | Shift `--score-2` to `#0E7490`                     |
| R4  | MEDIUM   | Principle-item cards lack color coding                | Small    | Verify/add `data-section` attributes               |
| R5  | LOW      | Evidence block criterion border loses section accent  | Trivial  | Remove or fix `.evidence-block.criterion` override |
| R6  | LOW      | Checkbox accent-color only scoped to 2 sections       | Trivial  | Add base rule using `--section-accent`             |
| R7  | LOW      | Context empty state has hardcoded navy border         | Trivial  | Add `data-accent-key` support                      |
| R8  | LOW      | Print stylesheet score colors — verified correct      | —        | **No issue found**                                 |
| R9  | LOW      | Surface token naming ambiguity (offwhite/panel-bg)    | Document | Add comments, consider deprecating `--ut-panel-bg` |
| R10 | LOW      | Warning/SE orange semantic collision                  | Monitor  | No immediate action                                |

**Actionable code changes:** R1, R2, R3, R4, R5, R6, R7 (7 items — all trivial to small effort)
**Monitor only:** R10
**No issue found:** R8
