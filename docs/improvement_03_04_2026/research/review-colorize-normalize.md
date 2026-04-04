# Review: Colorize & Normalize Lens on Consolidated Findings

Date: 2026-04-04
Reviewer skill set: `colorize`, `normalize`
Source: `CONSOLIDATED_FINDINGS_REPORT.md` + source code audit

---

## 1. Colorize Findings

### 1.1 Section coloring fix (Issue 3.2) is architecturally sound

The report correctly identifies the root cause: the `:where()` block in `accent-scoping.css:113-136` overrides `--section-accent` (and the full family) to the **active** section's values for every listed element, wiping per-element identity. The proposed fix (remove `.strip-cell`, `.page-index-button`, `.nav-button[data-page-id]` from the block; add per-`data-accent-key` CSS rules) is the right approach.

However, the report understates the scope. The `:where()` block lists 15 selectors. Removing only 3 of them still leaves 12 others receiving global overrides. Several of those — `.context-route-card`, `.context-anchor-card`, `.context-anchor-button` — also carry `data-accent-key` and **happen to work correctly only because they always render the active section's context**. If the tabbed sidebar merger (Issue 2.8) introduces cross-section content in the same panel, the same bug reappears.

**Recommendation:** Instead of per-element CSS rules, define a general `[data-accent-key]` override block that maps each key to its section token family. This covers all current and future elements:

```css
[data-accent-key='tr'] {
  --section-accent: var(--section-tr-accent);
  --section-accent-strong: var(--section-tr-accent-strong);
  --section-tint: var(--section-tr-tint);
  --section-border: var(--section-tr-border);
  --section-on-accent: var(--section-tr-on-accent);
}
/* Repeat for re, uc, se, tc, control, profile, setup, reference, recommendation, governance */
```

Then restrict the `:where()` block to elements that **should** always use the active section (`.form-section[data-section]`, `.doc-section[data-section]`, `.criterion-card`).

### 1.2 Contrast issue on SE and TC active buttons

The report's Issue 2.3 identifies the illegible Context button but misses a related contrast problem. In `interaction-states.css:73-81`:

```css
.nav-button.active[data-target='se'] {
  background: var(--se-dark); /* color-mix(86% + black) */
  border-color: var(--se-dark);
}
```

`--se-dark` is `color-mix(in srgb, #ea580c 86%, black)` — approximately `#c24609`. White text (`#fff`) on this background yields ~3.9:1 contrast, which **passes WCAG AA for large text (3:1) but fails for normal text (4.5:1)**. The button label is `text-sm` (0.75rem) — this is normal text.

`--tc-dark` (`#0d9488` mixed 86% + black ≈ `#0b7d72`) + white yields ~4.7:1 — passes, but barely.

The `QUICK_JUMP_COLOR_BY_KEY` map in `sidebar.js:113-114` already uses `--se-dark` and `--tc-dark` for the nav indicator, suggesting the team was aware of the contrast concern. But the token values themselves should be darkened further or the button font size increased to qualify as large text.

### 1.3 Neutral palette is well-designed

The neutral scale in `tokens.css:329-339` uses navy-tinted grays (`color-mix(in srgb, var(--ut-navy) X%, var(--ut-white))`), avoiding the pure-gray anti-pattern. This is good design practice — it keeps the palette cohesive and warm without being monochromatic. No change needed.

### 1.4 Monochromatic areas that need attention

The report doesn't identify these color-sparse regions:

**a. Non-principle form sections are colorless.** Sections S0 (control), S1 (profile), S2 (setup), S8 (reference), S9 (recommendation), S10A–S10C (governance) all have distinctive `accentKey` values and corresponding section token families defined in `tokens.css`. But in practice:

- `.form-section` border-left defaults to `var(--section-default)` (`#64748b`, a flat slate) for non-principle sections because `interaction-states.css:167-188` only explicitly colors `intro`, `governance`, `scope`, `scoring`, `evidence`, and the 5 principle sections. The `setup`, `reference`, and `recommendation` accent families are defined in tokens but never consumed in interaction states.
- Section kickers for non-principle sections get no per-section styling (only TR/RE/UC/SE/TC have kicker rules at `interaction-states.css:240-268`).

**b. The context sidebar is visually flat.** `.context-route-card` and `.context-anchor-card` (`components.css:1110-1118`) use `var(--section-accent)` and `var(--section-tint)` which are theoretically section-specific but currently resolve to the active section via the `:where()` block. The result: the entire context panel is a uniform tint of whichever section you're viewing. There's no color variation within the panel.

**c. The header progress summary** (`interaction-states.css:1186-1252`) uses semantic state colors (success, info, warning, error, skipped) but has no section identity color at all. This is correct for a global summary, but the surrounding header strip uses the active section's colors exclusively.

### 1.5 Color palette usage assessment

The token system defines a comprehensive palette:
- 5 principle colors (TR blue, RE green, UC purple, SE orange, TC teal)
- 4 non-principle section families (control, profile, setup, governance, reference, recommendation)
- 6 semantic state families (success, info, warning, error, skipped, blocked)
- 4 score colors, 3 judgment colors, 6 recommendation colors
- A help/documentation family

This is well-structured. The primary issue is **consumption**, not definition. The `:where()` block suppresses per-element resolution, and several section families (setup, reference, recommendation) are defined but underused. The fix for Issue 3.2 should be accompanied by a pass to ensure all section token families are actually consumed in their respective contexts.

---

## 2. Normalize Findings

### 2.1 Dual color resolution pattern is design drift

The codebase uses two incompatible patterns for applying section colors:

**Pattern A — Raw principle tokens** (used in `interaction-states.css:6-29`, `58-81`, `190-218`, `240-268`, `844-862`):
```css
.strip-cell.filled.tr { background: color-mix(in srgb, var(--tr) 30%, var(--ut-white)); }
.nav-button.active[data-target='tr'] { background: var(--tr); }
.doc-section[data-section='tr'] { border-left-color: var(--tr); }
```

**Pattern B — Section token family via accent scoping** (used in `interaction-states.css:485-543`, `931-948`, `1254-1357`):
```css
.doc-section[data-section] { border-left-color: var(--section-accent); }
.page-index-button.is-active { border-left-color: var(--section-accent); }
.strip-cell[data-progress-state='complete'] { background: var(--section-accent); }
```

Pattern B is the correct, scalable approach — it uses the token family and allows `data-accent-key` to resolve per-element. Pattern A bypasses the token system entirely with hardcoded principle tokens.

The report identifies this inconsistency implicitly (Issue 3.2) but doesn't call out that **the two patterns conflict at the CSS cascade level**. For `.nav-button.active[data-target='tr']` (Pattern A, specificity `0,3,0`) vs `.nav-button[data-page-id].active` (Pattern B, specificity `0,3,0`): the Pattern B rules are declared later in the file (lines 1259-1264 vs lines 58-81), so Pattern B overrides Pattern A. This means the `data-target`-based rules at lines 58-81 are **dead code** — they're always overridden by the section-token rules.

**Recommendation:** Remove the dead `data-target` rules at lines 58-81 (and the corresponding filled strip rules at lines 6-29 that use raw tokens). Consolidate everything onto Pattern B.

### 2.2 Duplicate border-left-color rules override specific section rules

`interaction-states.css:485-488` applies `border-left-color: var(--section-accent)` to all `.doc-section[data-section]` and `.form-section[data-section]`. This has the same specificity as the explicit per-section rules at lines 120-218 (both are `0,1,1,0` for a single class + attribute selector). Since the generic rule appears later, it **overrides** the specific rules.

For visible page sections, this doesn't matter because only the active page is shown and it matches the active section. But for reference drawers (which use `data-section='scoring'` and `data-section='evidence'`), the scoring section's explicit `border-left-color: var(--ut-pink)` (line 182) is overridden by `var(--section-accent)` from the generic rule. This means scoring drawers show the active principle's color on their left border instead of pink.

**Recommendation:** Either raise specificity on the per-section rules (e.g., `[data-section='scoring'][data-section]` is redundant but works), or remove the generic `border-left-color` rule and rely solely on the per-section explicit rules.

### 2.3 Inconsistent button styling patterns

Three different button archetypes exist in the codebase, each with different styling approaches:

| Archetype | Class | Color source | Hover pattern |
|-----------|-------|-------------|---------------|
| Nav buttons | `.nav-button` | Raw tokens + section tokens | `background: var(--ut-grey)` |
| Page index | `.page-index-button` | Section tokens via `data-accent-key` | `color-mix(section-tint 28%, white)` |
| Evidence | `.evidence-button` | Raw tokens (`--ut-darkblue`, `--ut-white`) | `background: var(--ut-grey)` |
| Context link | `.context-link-button` | Raw tokens (`--ut-navy`) | `background: var(--ut-grey)` |
| Surface action | `.shell-action-button` | Section tokens + help family | `background: var(--ut-darkblue)` |

The report identifies evidence controls as inconsistent (Issue 5.1) but doesn't note that the button styling inconsistency is broader. All secondary-action buttons should share a common base pattern.

**Recommendation:** Define a shared `.button-base` or `.shell-button` abstract that establishes common dimensions (44px min-height), font treatment (`--ff-heading`, `--text-sm`, uppercase), focus behavior, and hover transition. Let color-specific classes layer on top.

### 2.4 Token violations in components.css

Several component styles in `components.css` hardcode values that should use tokens:

| Location | Hardcoded value | Should be |
|----------|----------------|-----------|
| `components.css:12` | `color-mix(in srgb, var(--ut-navy) 3%, var(--ut-white))` | `var(--neutral-100)` or a dedicated token |
| `components.css:127` | `color-mix(in srgb, var(--ut-navy) 6%, var(--ut-white))` | Token needed (kicker background) |
| `components.css:227` | `var(--neutral-200)` | Correct ✓ |
| `components.css:1061` | `border-left: 4px solid var(--section-border, transparent)` | Correct — uses section token |
| `components.css:1316` | `background: color-mix(in srgb, var(--ut-navy) 5%, var(--ut-white))` | `var(--neutral-150)` (close but not exact) |

The `color-mix` expressions inline in component rules are a token system smell. The neutral scale in `tokens.css:329-339` defines `--neutral-50` through `--neutral-900` in 2% navy increments, but several components use intermediate values (3%, 5%, 6%) that don't correspond to any token.

**Recommendation:** Extend the neutral scale to cover 2%, 3%, 4%, 5%, 6%, 8% or replace inline `color-mix` calls with the closest existing token.

### 2.5 Proposed tabbed sidebar (Issue 2.8) needs token specification

The report proposes merging surfaces into a tabbed sidebar but provides no specification for:
- Tab bar styling tokens (active/inactive/hover colors)
- Tab panel background differentiation
- Tab accent resolution (should tabs use per-section colors or the help family?)
- Transition/animation tokens for tab switching

Without this, the implementation will default to ad-hoc values, creating more design drift.

**Recommendation:** Add a "Tab component tokens" section to the plan. At minimum:
```css
--tab-inactive-bg: var(--ut-white);
--tab-inactive-border: var(--ut-border);
--tab-active-bg: var(--section-tint);
--tab-active-border: var(--section-accent);
--tab-active-text: var(--section-accent-strong);
```

### 2.6 Tooltip system (Section 7) needs token specification

Similarly, the tooltip proposal (Section 7) doesn't define how tooltips interact with the color system. The existing `.field-help` style (`components.css:422-427`) is pure gray text. The tooltip should use:
- A surface background (not `var(--ut-white)` — too flat)
- A border from the section family or neutral scale
- Text that maintains `4.5:1` contrast
- A focus/hover indicator

---

## 3. Suggested Amendments to the Report

### Amendment 1: Expand Issue 3.2 fix scope

**Current:** Remove 3 selectors from `:where()` block, add per-key CSS rules for those 3 elements.

**Proposed:** Replace the entire `:where()` block approach. Define `[data-accent-key='X']` override rules that resolve section tokens for any element. Restrict the `:where()` block to only elements that should follow the active section (`.form-section[data-section]`, `.doc-section[data-section]`, `.criterion-card`). This fixes the current bug AND prevents recurrence when new elements are added.

### Amendment 2: Add issue — Dead `data-target` color rules

Add a P3 issue: Remove `.nav-button.active[data-target='tr']` through `[data-target='tc']` rules at `interaction-states.css:58-81` and `.strip-cell.filled.tr` through `.tc` rules at lines 6-29. These are overridden by the later section-token rules (lines 1254-1264, 1304-1357) and create confusion about which pattern applies.

### Amendment 3: Add issue — Reference drawer border color override

Add a P2 issue: `.doc-section[data-section]` generic `border-left-color: var(--section-accent)` rule at `interaction-states.css:488` overrides the explicit `border-left-color: var(--ut-pink)` for scoring sections. Either raise specificity of per-section rules or remove the generic rule.

### Amendment 4: SE/TC contrast warning

Upgrade Issue 2.3 or add a companion P2 issue: The `--se-dark` token produces a background that fails WCAG AA for normal-sized text with white foreground. Either darken the token further or increase the font size of affected buttons to qualify as "large text" (18px or 14px bold).

### Amendment 5: Token specification for new components

Add requirements to Issues 2.8 (tabbed sidebar) and 7.3 (tooltip system) to define CSS custom property tokens for tab and tooltip styling before implementation begins.

### Amendment 6: Non-principle section color consumption

Add a P2 issue: Section token families for `setup`, `reference`, and `recommendation` are defined in `tokens.css` but never consumed in `interaction-states.css`. Kickers, active borders, and focused states for these sections fall back to generic styling. Add per-section rules for these accent keys.

---

## 4. Concerns

### 4.1 The `:where()` block removal is a high-risk change

The `:where()` block affects 15 selectors across the entire application. Removing elements from it changes how `var(--section-accent)` resolves for those elements. Any CSS rule anywhere that consumes `var(--section-accent)` on an affected element will change behavior. The interaction-states file alone has 100+ rules using section tokens.

**Mitigation:** After the change, run `npm run test:e2e` and do a manual visual regression check across all 13 pages in all 5 workflow modes. The report doesn't mention testing strategy for this change.

### 4.2 Per-key CSS rules create maintenance burden

The report's Option A approach requires 5 properties × 11 accent keys = 55 CSS rule blocks (or more if element-specific). This is a significant amount of repetitive CSS that must be kept in sync with `tokens.css` section definitions.

The `[data-accent-key='X']` approach I recommend reduces this to 11 rule blocks (one per key) but creates a global selector that affects all elements with that attribute. Verify that no element with `data-accent-key` should use the active section's color instead of its own.

### 4.3 Tabbed sidebar merger (Issue 2.8) shouldn't be attempted before token normalization

The report correctly identifies Phase 8 as the last phase. But Phase 2 (Issue 3.2 per-section colors) should be treated as a prerequisite not just for Phase 5 (navigation consolidation) but for Phase 8 as well. The tabbed sidebar will introduce new `data-accent-key` elements that need correct token resolution from day one.

### 4.4 The `--section-on-accent` fallback chain is fragile

Several elements consume `var(--section-on-accent)` with no fallback (e.g., `interaction-states.css:54`, `1020`). If `--section-on-accent` is not resolved — which happens when an element is removed from the `:where()` block and no per-key rule covers its key — the property becomes invalid. This causes silent failures (text inherits from parent, which may be dark text on dark background).

**Mitigation:** Always include a fallback for `--section-on-accent`:
```css
color: var(--section-on-accent, var(--ut-white));
```

### 4.5 The dual header navigation (Issue 3.1) complicates the color fix

Issue 3.1 proposes consolidating two navigation bars. Issue 3.2 fixes per-section colors on those bars. If 3.1 is implemented first, the color fix targets change. If 3.2 is implemented first, some of the fixed CSS becomes dead code after consolidation. The report correctly identifies this dependency (Phase 5 depends on Issue 3.2) but doesn't note that any per-element CSS rules written for `.strip-cell` in Issue 3.2 may become unnecessary if the completion strip is replaced.

**Mitigation:** Implement 3.2 with the general `[data-accent-key]` approach (which works regardless of element type) rather than element-specific selectors.

---

## Summary

| Category | Issues found | Report already covers | New findings |
|----------|-------------|----------------------|-------------|
| Color architecture | 6 | 2 | 4 |
| Contrast / a11y | 2 | 1 | 1 |
| Token system violations | 4 | 1 | 3 |
| Design drift / inconsistency | 5 | 2 | 3 |
| Missing specifications | 2 | 0 | 2 |

The report is thorough in identifying runtime bugs and user-facing broken features. Its primary gap is in **design system-level analysis** — how color tokens flow from definition through resolution to consumption, and where the flow breaks. The `:where()` block issue is deeper than the report suggests, and the fix should be more systematic. The 6 amendments above would strengthen the plan and reduce rework risk.
