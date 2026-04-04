# Wave 1: Colorize Audit

**Date**: 2026-04-04
**Scope**: All CSS files in `static/css/` (tokens.css, base.css, layout.css, components.css, interaction-states.css, accent-scoping.css, animations.css, print.css)
**Methodology**: /colorize skill assessment framework

---

## Executive Summary

The color system is **well-engineered and internally coherent**. The architecture is strong: semantic state families, per-section accent scoping via CSS custom properties, systematic tint/border/strong variants, and navy-tinted neutrals. This is not a monochromatic or color-starved design — it uses a rich multi-hue palette where every color carries meaning.

Most recommendations below are refinements, not overhauls. The system already follows the "color encodes state, not decoration" principle from the design context.

---

## What Is Already Good (Do NOT Change)

- **Section accent family pattern** (`--section-{id}-accent`, `-strong`, `-tint`, `-border`, `-on-accent`): Systematic, consistent, well-applied across all 12 sections. The accent-scoping.css mechanism is elegant.
- **State families**: validation, judgment, recommendation, workflow, and score families all follow the same tint/border pattern. Excellent consistency.
- **Navy-tinted neutral scale** (`--neutral-50` through `--neutral-900`): Adds subtle warmth without being distracting. Correctly avoids pure gray.
- **TRUST principle colors** (`--tr`, `--re`, `--uc`, `--se`, `--tc`): Five distinct hues with good perceptual separation. Semantically meaningful.
- **Darkened variants** (`--se-dark`, `--tc-dark`): Smart solution for white-on-color WCAG compliance on nav buttons.
- **Focus ring system**: Consistent `--focus-ring` (UT Blue #007d9c) across all interactive elements. Good visibility.
- **Score-level colors**: Clear 4-level semantic scale (red → orange → teal → green) with matching tints.
- **`color-mix()` usage**: Modern, avoids opaque intermediate hex values, makes the system traceable.
- **Print stylesheet**: Correctly uses `print-color-adjust: exact` for semantic elements. Hides chrome appropriately.
- **`prefers-reduced-motion`**: Properly zeroed out durations. No color-dependent motion issues.

---

## Recommendations

### R1 — `--ut-white` is not white: rename or realign

- **Priority**: MEDIUM
- **Description**: `--ut-white` is defined as `#fafbfc` (very light blue-gray), which is fine for a sophisticated off-white. However, it is used as the "on-accent" text color (`--section-*-on-accent: var(--ut-white)`) for white text on colored backgrounds. The contrast ratio of `#fafbfc` against the darkest accent (`--section-se-accent-strong`, which is `color-mix(in srgb, #EA580C 86%, black)` ≈ `#b04309`) is approximately 4.2:1 — below WCAG AA for normal text (4.5:1). For the darkest navy accent (`--section-control-accent-strong` ≈ `#001f47`), it passes at ~12:1.
- **Specifics**: Consider either (a) setting `--section-*-on-accent` to `#ffffff` for sections with lighter accent-strong variants (SE, TC), or (b) making all `--section-*-on-accent` values explicitly `#ffffff`. The `--se-dark`/`--tc-dark` workaround on nav buttons already acknowledges this issue but doesn't cover all on-accent contexts (e.g., `.strip-cell[data-progress-state="complete"]`, `.nav-button.active[data-accent-key]`).
- **Dependencies**: R2 (same root issue)

### R2 — SE and TC nav button darkening is inconsistent with on-accent elsewhere

- **Priority**: HIGH
- **Description**: `--se-dark` and `--tc-dark` exist specifically for `.nav-button.active[data-target="se"]` and `.nav-button.active[data-target="tc"]`, but the generic `.nav-button[data-page-id].active` uses `var(--section-accent-strong)` for background and `var(--section-on-accent)` for color. When the active section is SE or TC, `--section-on-accent` is `#fafbfc` and `--section-accent-strong` is the darkened variant — but the contrast of `#fafbfc` on the SE accent-strong (~`#b04309`) is borderline (~4.2:1). The generic path doesn't benefit from the `--se-dark`/`--tc-dark` fix.
- **Specifics**: Either (a) change all `--section-*-on-accent` to `#ffffff`, or (b) add a conditional darkening for SE and TC in the generic `.nav-button[data-page-id].active` rule, or (c) change `--section-se-on-accent` and `--section-tc-on-accent` to `#ffffff` in tokens.css while keeping other sections at `var(--ut-white)`.
- **Dependencies**: R1

### R3 — `--ut-grey` canvas mismatch with design spec

- **Priority**: LOW
- **Description**: The design context specifies UT Grey canvas as `#f0f1f2`, but `--ut-grey` is `#eef0f3` (slightly more blue-tinted). The `--ut-canvas` token correctly aliases to `--ut-grey`, so the actual canvas is `#eef0f3`. This is a minor discrepancy from the documented brand spec but is arguably better (more cool-neutral, matches the navy-tinted neutral scale).
- **Specifics**: No action needed unless brand compliance requires exact `#f0f1f2`. If alignment matters, update `--ut-grey` to `#f0f1f2` in tokens.css.
- **Dependencies**: None

### R4 — `--state-warning` reuses `--se` (Secure/Traceable orange), blurring semantic boundaries

- **Priority**: MEDIUM
- **Description**: `--state-warning: var(--se)` means "warning" and "the Secure principle" share the exact same color (`#EA580C`). When a validation warning appears inside a Secure section, the warning tint blends with the section tint, reducing visual salience. This is a semantic collision: the same orange means two different things.
- **Specifics**: Consider introducing a dedicated `--state-warning` that is perceptually distinct from `--se` while still reading as "cautionary." Options: (a) amber `#D97706` (slightly more yellow, clearly different from the red-orange of `--se`), or (b) a warm yellow-orange like `#CA8A04`. Update the tint/border derivatives accordingly. This would also differentiate `--judgment-conditional` (which also uses `--se`) from the Secure principle color.
- **Dependencies**: R5 (same collision for judgment-conditional)

### R5 — `--judgment-conditional` reuses `--se`, same collision

- **Priority**: MEDIUM
- **Description**: `--judgment-conditional: var(--se)` means "conditional pass" in a judgment context looks identical to "Secure principle" and "warning state." If R4 is adopted, `--judgment-conditional` should follow the same new warning color, or use its own distinct hue (e.g., amber `#D97706` for conditional, keeping the new warning separate).
- **Specifics**: If R4 is adopted, set `--judgment-conditional` to the same new color or a slightly different shade. If R4 is rejected, this is still worth considering independently.
- **Dependencies**: R4

### R6 — Missing `--section-evidence-accent` family

- **Priority**: LOW
- **Description**: Evidence section falls back to `--section-reference-accent` (UT Pink `#cf0072`) via accent-scoping.css grouping with reference and scoring. Evidence has a distinct functional role (attachments, file references) and arguably deserves its own accent — or at minimum, should be documented as intentionally sharing the reference accent. Currently the grouping in accent-scoping.css lines 75-83 maps `reference`, `scoring`, and `evidence` together without comment.
- **Specifics**: Either (a) add a comment in accent-scoping.css explaining the grouping rationale, or (b) if evidence should be visually distinct, create `--section-evidence-accent` (perhaps a desaturated teal or slate to signal "documentation" rather than "reference framework"). Low priority since the current grouping works.
- **Dependencies**: None

### R7 — `--state-blocked-tint` uses `--ut-slate` instead of `--state-blocked`

- **Priority**: LOW
- **Description**: `--state-blocked-tint: color-mix(in srgb, var(--ut-slate) 18%, var(--ut-white))` uses `--ut-slate` (`#8b9bb0`) for the tint, while `--state-blocked: var(--ut-red)` (`#c60c30`) for the base color. This means the blocked tint is a cool gray instead of a faint red, making it visually inconsistent with other state tints (which all mix their own base color). A blocked field looks more "disabled" than "blocked/error."
- **Specifics**: Change to `color-mix(in srgb, var(--state-blocked) 10%, var(--ut-white))` for consistency with the pattern used by all other state tints.
- **Dependencies**: None

### R8 — `--state-blocked-border` uses `--state-blocked` (red) but tint uses slate — mixed signals

- **Priority**: LOW
- **Description**: `--state-blocked-border: color-mix(in srgb, var(--state-blocked) 26%, var(--ut-border))` correctly uses the red base, but the tint (R7 above) doesn't. This creates a situation where blocked elements have a red border but a gray background — not necessarily wrong (could read as "serious + disabled"), but inconsistent with every other state family.
- **Specifics**: Fix together with R7.
- **Dependencies**: R7

### R9 — No hover color differentiation on primary action buttons

- **Priority**: LOW
- **Description**: `.evidence-button-primary:hover` darkens the background but keeps it navy-on-white. The `.nav-button:hover` goes to gray background with navy border. These are functional but could benefit from slightly more color presence on hover to confirm interactivity — especially for `.evidence-button-primary`, which is the only "filled" primary button in the system.
- **Specifics**: Consider adding a subtle blue tint to `.evidence-button-primary:hover` background, e.g., `color-mix(in srgb, var(--ut-blue) 12%, var(--ut-darkblue))`, to make the hover state feel more responsive while maintaining the dark palette.
- **Dependencies**: None

### R10 — Score colors lack a "neutral/no score" state

- **Priority**: LOW
- **Description**: The score system has 4 levels (0-3) with red/orange/teal/green, but there is no explicit "not scored" or "N/A" color. The `--section-default` (`#64748B` slate) serves this role implicitly in some contexts but isn't part of the score family. An explicit `--score-na` token would make the system complete.
- **Specifics**: Add `--score-na: var(--section-default)` with corresponding `-tint` and `-border` variants if un-scored criteria need distinct visual treatment.
- **Dependencies**: None

### R11 — Print stylesheet rating borders hardcode `#000` instead of using score tokens

- **Priority**: LOW
- **Description**: In print.css lines 100-105, `.rating-option.score-0` through `.score-3` get `border: 2px solid #000`, losing the semantic color coding that distinguishes score levels on screen. Since `print-color-adjust: exact` is already applied to these elements (lines 132-142), the score token colors would print correctly.
- **Specifics**: Replace `border: 2px solid #000` with `border: 2px solid var(--score-N)` for each score level, so printed output preserves the red/orange/teal/green encoding.
- **Dependencies**: None

### R12 — `--recommendation-pilot-only` uses UT Purple, which is also `--ut-purple` (brand accent)

- **Priority**: LOW
- **Description**: `--recommendation-pilot-only: var(--ut-purple)` (`#4f2d7f`) is the brand accent color per the design spec. Using it for a specific recommendation state creates a semantic collision between "brand accent / action color" and "pilot-only recommendation." This is low-impact because `--ut-purple` isn't heavily used as a general-purpose accent in the current UI, but it could cause confusion if the brand accent is used more prominently in future.
- **Specifics**: Monitor. If `--ut-purple` gains more usage as a brand element, consider migrating `--recommendation-pilot-only` to a distinct hue (e.g., a violet `#7C3AED` or indigo `#4338CA`).
- **Dependencies**: None

---

## Contrast Ratio Summary (Key Combinations)

| Foreground                   | Background                 | Approx Ratio | Status                    |
| ---------------------------- | -------------------------- | ------------ | ------------------------- |
| `#172033` (ut-text)          | `#fafbfc` (ut-white)       | ~14.5:1      | AAA pass                  |
| `#172033` (ut-text)          | `#eef0f3` (ut-grey/canvas) | ~13.2:1      | AAA pass                  |
| `#576578` (ut-muted)         | `#fafbfc` (ut-white)       | ~5.6:1       | AA pass                   |
| `#576578` (ut-muted)         | `#eef0f3` (ut-grey/canvas) | ~5.1:1       | AA pass                   |
| `#fafbfc` (ut-white)         | `#001f47` (navy-strong)    | ~12.0:1      | AAA pass                  |
| `#fafbfc` (ut-white)         | `#b04309` (se-strong)      | ~4.2:1       | **AA fail** (normal text) |
| `#fafbfc` (ut-white)         | `#0a6b63` (tc-strong)      | ~5.0:1       | AA pass (borderline)      |
| `#2563EB` (tr) on white      | —                          | ~4.5:1       | AA pass (borderline)      |
| `#9333EA` (uc) on white      | —                          | ~4.6:1       | AA pass (borderline)      |
| `#007d9c` (ut-blue) on white | —                          | ~4.6:1       | AA pass (borderline)      |

The SE strong accent is the only clear contrast failure. R1/R2 address this.

---

## Palette Coherence Assessment

**Overall rating: 8/10** — Strong, purposeful, and well-organized.

Strengths:

- Every color has a job. No decorative colors.
- The navy-tinted neutral scale ties the palette together.
- Section accents provide wayfinding without overwhelming.
- State colors are universally understood (green/red/orange).

Weaknesses:

- The SE/TC on-accent contrast issue (R1/R2) is the only real problem.
- Warning/Secure semantic collision (R4/R5) reduces clarity in-context.
- The blocked state tint inconsistency (R7/R8) is a minor pattern deviation.

This system does **not** need more color. It needs the existing color to be more precise.
