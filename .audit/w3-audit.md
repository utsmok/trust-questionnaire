# Wave 3 Technical Quality Audit

**Date**: 2026-04-04  
**Target**: TRUST Framework Questionnaire (`trust-framework.html` + `static/css/` + `static/js/`)  
**Scope**: Post Wave 1+2 diagnostic review — accessibility, performance, theming, responsive design, anti-patterns

---

## Audit Health Score

| #         | Dimension         | Score     | Key Finding                                                                   |
| --------- | ----------------- | --------- | ----------------------------------------------------------------------------- |
| 1         | Accessibility     | 3         | Evidence lightbox lacks focus trap; no dark mode but none required            |
| 2         | Performance       | 4         | Immutable state with early-return bailouts; rAF-debounced DOM sync            |
| 3         | Responsive Design | 3         | Context drawer collapses well; brand min-width 320px may clip on small phones |
| 4         | Theming           | 4         | Full token system; zero hard-coded colors in screen styles                    |
| 5         | Anti-Patterns     | 4         | Distinctive regimented-functionalism; zero AI slop tells                      |
| **Total** |                   | **18/20** | **Excellent**                                                                 |

**Rating band: 18–20 — Excellent (minor polish)**

---

## Anti-Patterns Verdict

**Pass.** This UI looks nothing like AI-generated output. Specific assessment:

- No gradient text, no glassmorphism, no hero metrics, no card grids
- No pill-shaped buttons or chips — all square/block per design context
- No generic Inter/System-UI-only typography — deliberate 3-font stack (Inter, Arial Narrow, JetBrains Mono)
- No bounce/spring easing — only `ease-out-quart` and `ease-out-quint`
- No gray-on-color text issues — contrast darkened variants (`--se-dark`, `--tc-dark`) used for light text
- No redundant copy — labels are terse and functional
- Color encodes state semantically, not decoratively
- Typography hierarchy is strong and intentional (display → mega → heading → sub → body → sm → xs)
- Backdrop-filter on surface overlays is minimal (2px blur) and functionally justified

Zero AI aesthetic tells detected.

---

## Executive Summary

- **Audit Health Score: 18/20 (Excellent)**
- Total issues found: **0 P0**, **1 P1**, **3 P2**, **4 P3**
- Top issues: evidence lightbox focus trap (P1), some undersized touch targets (P2), two hard-coded font-weights (P2/P3)
- This is a well-engineered, deliberately designed questionnaire application with strong a11y foundations, excellent theming discipline, and clean performance characteristics.

---

## Detailed Findings by Severity

### P1 — Major

**[P1] Evidence lightbox missing focus trap**

- **Location**: `static/js/render/evidence.js` (lightbox open/close logic), `static/css/components.css:861–913` (`.evidence-lightbox`)
- **Category**: Accessibility
- **Impact**: When the evidence lightbox opens, users can Tab out of it into the underlying page content. This violates WCAG 2.1.1 (Keyboard) and 2.4.3 Focus Order. Screen reader users may lose orientation.
- **WCAG/Standard**: WCAG 2.1.1, WCAG 2.4.3
- **Recommendation**: Implement a focus trap that cycles Tab/Shift+Tab within the lightbox dialog while it is open. On open, move focus to the first focusable element (or the close button). On close, return focus to the triggering element. The existing `focusElementWithRetry` utility in `navigation.js` already handles the return-focus pattern — extend it for the lightbox.
- **Suggested command**: `/harden`

---

### P2 — Minor

**[P2] Evidence button and context link button below 44px touch target**

- **Location**: `static/css/components.css:723` (`.evidence-button` — `min-height: 36px`), `static/css/components.css:1234` (`.context-link-button` — `min-height: 32px`)
- **Category**: Responsive / Accessibility
- **Impact**: On touch devices, these buttons are below the 44x44px minimum recommended by WCAG 2.5.5 (Target Size, AAA). The `.mock-control` at 40px also falls short.
- **WCAG/Standard**: WCAG 2.5.5 (AAA)
- **Recommendation**: Increase `min-height` to 44px for `.evidence-button`, `.context-link-button`, `.mock-control`, and `.evidence-remove-button`. Use padding to fill the space rather than increasing font size.
- **Suggested command**: `/adapt`

---

**[P2] Residual `font-weight: 800` in screen CSS**

- **Location**: `static/css/components.css:919` (`.subhead`), `static/css/components.css:961` (`.form-section[data-section='governance'] .mock-control:first-of-type .value`)
- **Category**: Theming / Consistency
- **Impact**: Wave 1 reportedly fixed 800→700, but two instances remain. This creates a weight that doesn't exist in the loaded font (Inter loads 400, 700 only — see HTML line 9), causing the browser to synthesize a fake bold, which looks heavier and blurrier than a true 700 weight.
- **Recommendation**: Change both instances to `font-weight: 700`. The print.css instance at line 122 is acceptable since print fonts may differ.
- **Suggested command**: `/normalize`

---

**[P2] `backdrop-filter: blur(2px)` on surface overlays**

- **Location**: `static/css/layout.css:327–328` (`.shell-surface`)
- **Category**: Performance
- **Impact**: `backdrop-filter` triggers compositing on every frame, which can cause jank on lower-end devices and GPUs. The 2px blur is barely perceptible. This is the only `backdrop-filter` usage in the codebase.
- **Recommendation**: Either remove the blur (the semi-transparent overlay `color-mix(in srgb, var(--ut-text) 88%, var(--ut-grey))` is already 88% opaque — blur adds negligible value) or keep it with a `will-change: backdrop-filter` to promote the layer. Given the design context ("no soft shadows", "flat delineation"), removing it is more aligned.
- **Suggested command**: `/optimize`

---

### P3 — Polish

**[P3] Brand `min-width: 320px` may clip on very narrow viewports**

- **Location**: `static/css/layout.css:35` (`.brand`)
- **Category**: Responsive
- **Impact**: Below 320px viewport width (extremely narrow phones in portrait), the brand bar may overflow. The 760px breakpoint already removes `min-width: 0`, but the brand itself retains 320px.
- **Recommendation**: Consider adding `min-width: 0` at the 760px breakpoint or using `overflow: hidden` on the brand flex container.

---

**[P3] `.skip-link` z-index uses magic number instead of token**

- **Location**: `static/css/base.css:32` (`z-index: 50`)
- **Category**: Theming
- **Impact**: The skip link uses a raw `50` while `tokens.css` defines `--z-skip-link: 50`. Minor inconsistency — the value matches but bypasses the token.
- **Recommendation**: Change to `z-index: var(--z-skip-link)`.

---

**[P3] `font-weight: 800` in print styles**

- **Location**: `static/css/print.css:122`
- **Category**: Theming
- **Impact**: Print stylesheet uses 800 for section kicker `::before` pseudo-elements. Since print rendering differs and font availability may vary, this is low risk but inconsistent with the screen weight system.
- **Recommendation**: Align to 700 for consistency, or leave if print testing shows 700 is insufficient.

---

**[P3] Context drawer backdrop missing `inert` on main content**

- **Location**: `static/js/behavior/navigation.js:586–593`
- **Category**: Accessibility
- **Impact**: When the context drawer opens on narrow screens, the questionnaire panel correctly gets `inert` and `aria-hidden="true"`. However, the shell surfaces (about/help) are not similarly blocked — a user could potentially interact with them via keyboard. The backdrop click-to-dismiss mitigates this in practice.
- **Recommendation**: Also set `inert` on the about and help surface elements when the context drawer is open.

---

## Patterns & Systemic Issues

**No systemic issues found.** The codebase demonstrates consistent patterns:

- **Theming discipline**: 100% token usage in screen CSS. The only hard-coded hex values are in `print.css` (where they belong).
- **ARIA coverage**: Every form control has `aria-labelledby` + `aria-describedby`. Every button has descriptive `aria-label` values generated from state. Every dialog has `role="dialog"`, `aria-modal`, and `aria-labelledby`.
- **State management**: Immutable state with early-return equality checks (`areNormalizedValuesEqual`) prevents unnecessary re-renders.
- **Cleanup discipline**: Every event listener and observer has a corresponding cleanup function returned in the destroy chain.

---

## Positive Findings

These patterns are exemplary and should be maintained:

1. **Full token system with `color-mix()`** — The section accent family (`--section-{id}-accent`, `-strong`, `-tint`, `-border`, `-on-accent`) is a well-structured color system that avoids duplication while allowing per-section theming. The `accent-scoping.css` pattern using `:where()` to inherit active section tokens into child components is elegant.

2. **`@property --top-accent-color`** — Registered custom property enables smooth CSS color transitions on the top accent bar without any JavaScript. This is a modern, performant approach.

3. **`@starting-style` entry animations** — Using native CSS `@starting-style` for form section and page index entry animations avoids JavaScript animation orchestration and respects `prefers-reduced-motion` via the blanket rule in `animations.css`.

4. **Comprehensive `prefers-reduced-motion` support** — The `animations.css` layer zero-durations all transitions and animations, force-sets opacity on animated elements, and the JS layer in `navigation.js:442–474` checks the media query before applying transition classes.

5. **Immutable store with equality bailouts** — `store.js` returns the previous state unchanged when normalized values are equal (`areNormalizedValuesEqual`), preventing subscriber cascades on no-op updates. This is a critical performance pattern for an app with 20+ derivation functions.

6. **`inert` + `aria-hidden` on inactive pages** — Every inactive form section gets both `inert` and `aria-hidden="true"`. This is the gold standard for SPA page visibility management.

7. **Keyboard shortcuts with guard rails** — The Alt+key quick-jump shortcuts (Alt+1–5, Alt+T/R/U/S/C) are gated behind `!event.altKey || event.ctrlKey || event.metaKey` to avoid conflicts, and `event.preventDefault()` prevents browser default behavior.

8. **Focus management with retry logic** — `focusElementWithRetry` in `navigation.js` uses `requestAnimationFrame` retries to handle cases where the target element isn't yet connected or visible. This is a real-world robustness pattern.

9. **`noscript` fallback** — The `<noscript>` block in the HTML resets `overflow: auto` on body, ensuring the page is scrollable when JS is disabled. This is a thoughtful progressive enhancement approach.

10. **Clean CSS layering** — Tokens → base → layout → components → accent-scoping → interaction-states → animations → print. No style leaks between layers.

---

## Recommended Actions

1. **[P1] `/harden`** — Add focus trap to the evidence lightbox dialog
2. **[P2] `/adapt`** — Increase touch targets on evidence buttons and context link buttons to 44px minimum
3. **[P2] `/normalize`** — Replace two remaining `font-weight: 800` instances with 700 in screen CSS
4. **[P2] `/optimize`** — Remove or optimize the `backdrop-filter: blur(2px)` on surface overlays

After fixes, re-run `/audit` to verify score improvement toward 19–20.

---

_Audit covers all source files in `static/css/` (7 files, ~4200 lines CSS) and key JS modules in `static/js/` (36 files). HTML structure reviewed via `trust-framework.html` (568 lines)._
