# Wave 3 Technical Audit

**Date**: 2026-04-04
**Scope**: trust-framework.html demo page -- full CSS/JS/HTML shell
**Method**: /audit diagnostic scan across 5 dimensions

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 | Rating options are div-based, missing proper radio group roles; keyboard shortcuts lack discoverability |
| 2 | Performance | 3 | Deep clone on every state change in store; MutationObserver with subtree:true on entire render root |
| 3 | Responsive Design | 3 | Rating scale collapses well but drawer mode has focus-trap edge cases on rapid toggle |
| 4 | Theming | 3 | Token system is comprehensive; hardcoded `color: #fff` in 4 locations bypasses on-accent tokens |
| 5 | Anti-Patterns | 4 | Deliberately utilitarian aesthetic; no AI slop tells; regimented functionalism is intentional |
| **Total** | | **16/20** | **Good** |

**Rating bands**: 18-20 Excellent (minor polish), 14-17 Good (address weak dimensions), 10-13 Acceptable (significant work needed), 6-9 Poor (major overhaul), 0-5 Critical (fundamental issues)

---

## Anti-Patterns Verdict

**Pass.** This does not look AI-generated. The design commits fully to a "regimented functionalism" aesthetic -- dense information layout, zero-radius borders, tabular data density, monospace metadata, and left-border color coding. There are no gradient text effects, no glassmorphism, no hero metric layouts, no rounded cards with icons, no bounce easing. The neutral palette is navy-tinted (not gray), and the type pairing (Inter / Arial Narrow / JetBrains Mono) is a purposeful choice that serves data-heavy content. The single decorative element -- the 8px top accent bar -- is functional (it changes color per active section).

No AI slop tells detected.

---

## Executive Summary

- **Audit Health Score**: 16/20 (Good)
- **Total issues found**: 22 (P0: 2, P1: 7, P2: 8, P3: 5)
- **Top 5 critical issues**:
  1. Rating option divs lack `role="radio"` and proper radio group `role="radiogroup"` (WCAG 4.1.2)
  2. Deep clone of entire evaluation state on every commit creates GC pressure with 132+ fields
  3. Hardcoded `color: #fff` in 4 locations breaks the on-accent token contract
  4. `prefers-reduced-motion` zeros durations but does not suppress `sectionEnter` animation keyframes (content flashes from opacity 0)
  5. Context drawer focus management has a race condition with 220ms setTimeout
- **Recommended next steps**: Fix the 2 P0 accessibility issues, then address token hardcoding, then tune performance

---

## Detailed Findings by Severity

### [P0] Rating options lack ARIA radio group semantics

- **Location**: `static/js/render/questionnaire-pages.js` (rating scale factory), `static/js/behavior/field-handlers.js` lines 211-247
- **Category**: Accessibility
- **Impact**: Screen readers cannot determine that rating options are mutually exclusive radio inputs. Users of assistive technology see generic divs with no indication of single-select behavior. The hidden native `<input type="radio">` elements exist but are visually hidden and not properly associated with the clickable div containers via label/for binding.
- **WCAG/Standard**: WCAG 2.1 SC 4.1.2 (Name, Role, Value) -- Level A
- **Recommendation**: Add `role="radiogroup"` to `.rating-scale` containers and `role="radio"` to `.rating-option` elements. Ensure `aria-checked` is already being set (it is in field-handlers.js line 229) but the role must match. Also verify the hidden radio inputs have matching `name` attributes for native grouping.
- **Suggested command**: `/harden`

### [P0] `prefers-reduced-motion` does not suppress `sectionEnter` opacity animation

- **Location**: `static/css/states.css` lines 472-487 (sectionEnter keyframe), lines 4-18 (reduced-motion override)
- **Category**: Accessibility
- **Impact**: The reduced-motion override sets `animation-duration: 0ms` and `transition-duration: 0ms`, but `.doc-section, .form-section` has `opacity: 0` as the base state with `animation: sectionEnter 120ms ... forwards`. When reduced motion zeroes the duration, the `forwards` fill may still resolve correctly, but the `animation-iteration-count: 1` override combined with zero duration means the keyframe `from { opacity: 0 }` to `to { opacity: 1 }` runs instantly. However, if the browser processes the `0ms` duration as "no animation ran," the `forwards` fill state may not apply, leaving sections at `opacity: 0` (invisible). This needs verification per browser, but the pattern is fragile.
- **WCAG/Standard**: WCAG 2.1 SC 2.3.3 (Animation from Interactions) -- Level AAA
- **Recommendation**: In the `prefers-reduced-motion` block, explicitly set `.doc-section, .form-section { opacity: 1; animation: none; }` to guarantee visibility regardless of browser fill-state handling.
- **Suggested command**: `/harden`

### [P1] Hardcoded `color: #fff` bypasses on-accent token system

- **Location**: `static/css/states.css` lines 423, 729, 1166-1168, 1388
- **Category**: Theming
- **Impact**: Four locations use `color: #fff` directly instead of `var(--section-on-accent)` or `var(--ut-white)`. If a section's on-accent color ever changes from white (e.g., for a light accent background), these elements will have incorrect text color. Breaks the token contract established in tokens.css.
- **WCAG/Standard**: Not a WCAG violation currently (white on dark backgrounds passes), but an architectural inconsistency.
- **Recommendation**: Replace all four instances:
  - Line 423: `.nav-button.active { color: #fff }` -> `color: var(--section-on-accent)`
  - Line 729: `.evidence-button-primary { color: #fff }` -> `color: var(--ut-white)`
  - Lines 1166-1168: `.context-pin-button[aria-pressed="true"]` and `.reference-pin-button[aria-pressed="true"]` -> `color: var(--section-on-accent)`
  - Line 1388: `.shell-action-button[aria-expanded="true"]` -> `color: var(--section-on-accent)`
- **Suggested command**: `/normalize`

### [P1] Skip link uses `color: #fff` instead of token

- **Location**: `static/css/base.css` line 29
- **Category**: Theming
- **Impact**: The skip link is the first focusable element for keyboard users. Using `#fff` directly breaks token consistency.
- **WCAG/Standard**: Not a contrast violation (white on --ut-darkblue passes AA), but poor token hygiene.
- **Recommendation**: Replace `color: #fff` with `color: var(--section-on-accent, #fff)`.
- **Suggested command**: `/normalize`

### [P1] Deep clone of evaluation state on every commit

- **Location**: `static/js/state/store.js` (cloneEvaluation function, called on every commit)
- **Category**: Performance
- **Impact**: With 132+ fields, 10 sections, criteria records, evidence items, and skip state metadata, cloning the entire evaluation object on every keystroke (input events are committed in real-time per field-handlers.js) creates GC pressure. The `areNormalizedValuesEqual` check helps avoid unnecessary DOM updates, but the clone happens before the check.
- **WCAG/Standard**: N/A
- **Recommendation**: Use structural sharing or immutable updates (only clone the path that changed). Alternatively, use a shallow comparison to skip cloning when the commit does not touch evaluation data (e.g., UI-only changes like surface toggles).
- **Suggested command**: `/optimize`

### [P1] MutationObserver with `subtree: true` on render root

- **Location**: `static/js/behavior/navigation.js` lines 939-947
- **Category**: Performance
- **Impact**: The MutationObserver watches `questionnaireRenderRoot` with `childList: true, subtree: true`. Every DOM mutation anywhere in the questionnaire (field sync, class toggles, dataset changes) triggers `refreshPageSections()` which rebuilds the pageSections map, re-queries all sections, and calls `syncFromState` which re-syncs the entire UI. This creates O(n*m) work where n = mutations and m = total sections.
- **WCAG/Standard**: N/A
- **Recommendation**: Use `childList: true` only (without `subtree`) to only react to direct children being added/removed. Alternatively, debounce the callback and check if `addedNodes` or `removedNodes` actually contain `[data-page-id]` elements before triggering the full refresh.
- **Suggested command**: `/optimize`

### [P1] Context drawer focus return uses 220ms setTimeout

- **Location**: `static/js/behavior/navigation.js` line 321
- **Category**: Accessibility
- **Impact**: After closing the context drawer, focus is returned via `setTimeout(() => { ... }, 220)`. This timeout is intended to wait for the CSS transform transition to complete (280ms in layout.css line 437), but the timing mismatch (220ms < 280ms) means focus returns before the drawer finishes sliding out. More critically, setTimeout is unreliable for focus management -- it can fire during the transition, causing the focused element to shift visually as the drawer animates.
- **WCAG/Standard**: WCAG 2.1 SC 2.4.3 (Focus Order) -- Level A (focus moves before animation completes)
- **Recommendation**: Use `transitionend` event listener on the drawer panel instead of setTimeout, with a fallback timeout for edge cases where the transition does not fire (e.g., display:none).
- **Suggested command**: `/harden`

### [P1] Keyboard shortcuts lack discoverability mechanism

- **Location**: `static/js/behavior/keyboard.js` (1-5, t/r/u/s/c shortcuts)
- **Category**: Accessibility
- **Impact**: Power-user keyboard shortcuts (digit keys 1-5, letter keys t/r/u/s/c) are invisible to users. There is no keyboard shortcut legend visible in the UI. The help panel could surface this information but currently does not appear to include shortcut documentation.
- **WCAG/Standard**: WCAG 2.1 SC 2.1.1 (Keyboard) is met, but discoverability is a best-practice gap.
- **Recommendation**: Add a keyboard shortcuts section to the help panel content. Consider a `?` or `?` key binding that opens the help panel to the shortcuts section.
- **Suggested command**: `/clarify`

### [P1] Evidence lightbox missing focus trap

- **Location**: `static/css/components.css` lines 849-901, evidence JS module
- **Category**: Accessibility
- **Impact**: The evidence lightbox is a fixed-position overlay with `z-index: 1000` but there is no visible focus-trap implementation in the component. If the lightbox opens, Tab key presses could move focus behind the overlay to the main content, which is an accessibility violation for modal dialogs.
- **WCAG/Standard**: WCAG 2.1 SC 2.4.3 (Focus Order) and SC 4.1.2 (Name, Role, Value) for modal dialogs -- Level A
- **Recommendation**: Add `role="dialog"` and `aria-modal="true"` to the lightbox dialog element. Implement a focus trap that cycles focus between the first and last tabbable elements within the lightbox. Handle Escape key to close.
- **Suggested command**: `/harden`

### [P1] Print styles use hardcoded `#000` for rating borders

- **Location**: `static/css/print.css` line 105
- **Category**: Theming
- **Impact**: `.rating-option.score-0` through `.score-3` use `border: 2px solid #000` for print. Pure black is acceptable for print, but this bypasses any potential print-optimized token.
- **WCAG/Standard**: Not a violation for print media.
- **Recommendation**: Acceptable as-is for print. If a print-specific token is desired later, create `--print-ink: #000`.
- **Suggested command**: `/normalize` (low priority)

### [P2] `text-rendering: optimizeSpeed` may compromise glyph quality

- **Location**: `static/css/base.css` line 17
- **Category**: Performance
- **Impact**: `optimizeSpeed` disables kerning and ligature optimization for faster paint. The body also sets `font-kerning: normal` (line 16), which contradicts the `optimizeSpeed` choice. Browsers may resolve this conflict differently.
- **WCAG/Standard**: N/A
- **Recommendation**: Remove the contradiction. If kerning is desired (it is, per line 16), use `text-rendering: optimizeLegibility` or remove the property entirely (browser default is usually `auto` which applies kerning at larger sizes).
- **Suggested command**: `/polish`

### [P2] `body { overflow: hidden }` may trap scroll on small viewports

- **Location**: `static/css/base.css` line 20
- **Category**: Responsive Design
- **Impact**: Body overflow hidden is needed for the fixed-shell layout, but if JavaScript fails to load or the shell grid does not initialize, the user cannot scroll to content at all.
- **WCAG/Standard**: Not a violation in normal operation.
- **Recommendation**: Consider setting overflow:hidden via JavaScript after the shell initializes, rather than in CSS. Add a `<noscript>` fallback that removes the overflow restriction.
- **Suggested command**: `/harden`

### [P2] `--text-xs: 0.56rem` may be below minimum readable size

- **Location**: `static/css/tokens.css` line 192
- **Category**: Accessibility
- **Impact**: 0.56rem is approximately 9px at default browser settings (16px base). This is used for strip cells, meta tags, condition tags, evidence labels, and other metadata. WCAG does not specify a minimum font size, but 9px is difficult to read for users with low vision, even with zoom.
- **WCAG/Standard**: WCAG 2.1 SC 1.4.4 (Resize Text) -- users must be able to zoom to 200%. At 200%, 0.56rem becomes ~18px which is acceptable.
- **Recommendation**: Consider raising the minimum to 0.625rem (10px) for better baseline readability. The current size is defensible for metadata-only content but is at the boundary.
- **Suggested command**: `/typeset`

### [P2] `.rating-option` cursor pointer on non-interactive state

- **Location**: `static/css/components.css` line 464
- **Category**: Accessibility
- **Impact**: Rating options always show `cursor: pointer` even when `aria-disabled="true"` (read-only/skipped state). The `pointer-events: none` in states.css line 1431 overrides the cursor visually, but the declaration is contradictory.
- **WCAG/Standard**: Minor usability concern.
- **Recommendation**: Move cursor declaration into the non-disabled state: `.rating-option:not([aria-disabled="true"]) { cursor: pointer; }`.
- **Suggested command**: `/polish`

### [P2] Page transition uses opacity 0 with no reduced-motion guard

- **Location**: `static/js/behavior/navigation.js` lines 421-441, `static/css/states.css` lines 1438-1450
- **Category**: Accessibility
- **Impact**: Page transitions use `is-page-transitioning-out` and `is-page-transitioning-in` classes that set `opacity: 0` with a 150ms setTimeout. While `prefers-reduced-motion` zeroes CSS transition durations, the JS setTimeout is not guarded by the media query, so the opacity-0 state is applied for 150ms regardless of motion preferences.
- **WCAG/Standard**: WCAG 2.1 SC 2.3.3 (Animation from Interactions)
- **Recommendation**: Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` in navigation.js and skip the transition classes entirely when reduced motion is preferred.
- **Suggested command**: `/harden`

### [P2] Surface overlay uses `backdrop-filter: blur(2px)` without fallback

- **Location**: `static/css/layout.css` lines 332-333
- **Category**: Responsive Design
- **Impact**: The `-webkit-backdrop-filter` prefix is included, but if neither property is supported (older Firefox), the overlay background becomes nearly transparent (`color-mix(in srgb, var(--ut-text) 20%, transparent)`), making the surface card hard to read against the underlying content.
- **WCAG/Standard**: WCAG 2.1 SC 1.4.3 (Contrast) -- if backdrop-filter fails, contrast between surface card and background content may be insufficient.
- **Recommendation**: Add a solid fallback background before the backdrop-filter declaration: `background: color-mix(in srgb, var(--ut-text) 88%, var(--ut-grey));` then override with the transparent version for browsers that support backdrop-filter.
- **Suggested command**: `/harden`

### [P2] Strip cells lack keyboard interaction

- **Location**: `static/css/components.css` lines 21-53
- **Category**: Accessibility
- **Impact**: Completion strip cells (`<li>` elements) display section progress visually but are not interactive via keyboard. If they are intended as navigation aids, they need tabindex and click handlers. If they are decorative indicators only, they should have `aria-hidden="true"` to avoid confusion.
- **WCAG/Standard**: WCAG 2.1 SC 2.1.1 (Keyboard) if they are interactive.
- **Recommendation**: Clarify intent. If decorative, add `role="presentation"` and `aria-hidden="true"`. If interactive, add `tabindex="0"`, `role="button"`, and click/keydown handlers to navigate to the corresponding section.
- **Suggested command**: `/harden`

### [P2] `will-change: width` on progress bar

- **Location**: `static/css/layout.css` line 99
- **Category**: Performance
- **Impact**: `will-change: width` on `.panel-progress-bar` promotes the element to its own compositing layer. Since width changes trigger layout recalculation (not just paint), this hint does not help and may waste memory if the bar is small.
- **WCAG/Standard**: N/A
- **Recommendation**: Use `transform: scaleX()` instead of `width` for the progress bar animation. This avoids layout thrashing and works with GPU compositing. Apply `transform-origin: left` and set width to 100%, then scale the X axis.
- **Suggested command**: `/optimize`

### [P3] Criterion card `::after` pseudo-element may truncate long codes

- **Location**: `static/css/components.css` lines 526-541
- **Category**: Anti-Patterns
- **Impact**: The `::after` pseudo-element uses `max-width: 30%` with `text-overflow: ellipsis`. For long criterion codes this works, but the fixed positioning (top-right) may overlap with content in the card header.
- **WCAG/Standard**: N/A
- **Recommendation**: Acceptable as-is. If criterion codes grow longer, consider moving the code to a dedicated line above the title instead of absolute positioning.
- **Suggested command**: `/polish` (optional)

### [P3] Score-level color names (0-3) are not semantically meaningful

- **Location**: `static/css/tokens.css` lines 102-114
- **Category**: Theming
- **Impact**: Token names like `--score-0`, `--score-1`, etc. are numeric. Someone reading the CSS cannot tell that score-0 means "non-compliant/critical" without looking up the mapping. Semantic names like `--score-critical`, `--score-partial`, `--score-adequate`, `--score-exemplary` would be more self-documenting.
- **WCAG/Standard**: N/A
- **Recommendation**: Consider adding alias tokens with semantic names that map to the numeric ones. The numeric tokens can remain for loop-based rendering in JS.
- **Suggested command**: `/normalize` (low priority)

### [P3] `overscroll-behavior: contain` on panels prevents pull-to-refresh

- **Location**: `static/css/layout.css` line 109
- **Category**: Responsive Design
- **Impact**: This is actually a good practice (prevents scroll chaining), but it also prevents pull-to-refresh gestures on mobile when scrolling inside a panel. Users who expect to refresh the page by pulling down from the questionnaire panel will not be able to.
- **WCAG/Standard**: N/A
- **Recommendation**: Acceptable as-is. This is the correct behavior for an app-like shell. Document the choice if needed.
- **Suggested command**: None needed

### [P3] Missing `lang` attribute on dynamically rendered content

- **Location**: `static/js/render/questionnaire-pages.js` (dynamic content generation)
- **Category**: Accessibility
- **Impact**: The questionnaire content is rendered dynamically from schema config. If the schema contains content in multiple languages, there is no mechanism to set `lang` attributes on individual fields. For a single-language evaluation form this is not an issue.
- **WCAG/Standard**: WCAG 2.1 SC 3.1.2 (Language of Parts) -- Level AA
- **Recommendation**: If the tool will ever be used for multilingual evaluations, add a `lang` field to the schema and apply it to rendered content spans. Not urgent for current use.
- **Suggested command**: `/harden` (future)

### [P3] Chip state selectors use data attributes rather than BEM modifiers

- **Location**: `static/css/states.css` lines 697-823
- **Category**: Theming
- **Impact**: Chip variants use `[data-score="0"]`, `[data-judgment="pass"]`, `[data-recommendation-state="recommended"]` selectors. While this works and is semantic, it creates a parallel state system that bypasses CSS custom properties. The accent-key system already provides a mechanism for section-contextual coloring.
- **WCAG/Standard**: N/A
- **Recommendation**: Acceptable architectural choice. Data attributes are more semantic than class names for state values. No change needed.
- **Suggested command**: None needed

---

## Patterns and Systemic Issues

### 1. Hardcoded white in accent-colored contexts
Four separate locations in states.css use `color: #fff` when setting text on dark accent backgrounds. This is a systemic pattern where the developer bypassed the token system for convenience. The fix is straightforward: use `var(--section-on-accent)` or `var(--ut-white)` consistently.

### 2. Motion and reduced-motion disconnect
The CSS architecture properly supports `prefers-reduced-motion` by zeroing durations, but there are three places where JavaScript creates motion without checking the media query:
- Page transition opacity (navigation.js setTimeout)
- Rating dot confirmation pulse (field-handlers.js adds `is-just-selected` class)
- Strip cell fill animation (states.css animation)

This is a pattern where the CSS layer is motion-aware but the JS layer is not.

### 3. Performance-impacting architecture choices
Two architectural patterns create performance concerns at scale:
- Deep cloning the entire state tree on every commit (store.js)
- MutationObserver with subtree:true triggering full re-sync on any DOM change (navigation.js)

Both were pragmatic choices for correctness, but will need optimization as the evaluation data grows.

---

## Positive Findings

### Excellent token architecture
The token system in `tokens.css` is remarkably thorough. Every color has a full family (accent, accent-strong, tint, border, on-accent) for each section context. The `color-mix()` usage for derived colors is modern and maintainable. The `:where()` selectors in states.css for accent-key resolution are performant and elegant.

### Robust focus management
The shell has focus return anchors (`shell-focus-anchor`), skip links, and `focusElementWithRetry` with fallback targets. Surface panels track their trigger element for focus return. The `focus-visible` outlines are consistent across all interactive elements.

### Print stylesheet
The print layer is well-structured: it hides chrome, expands all pages, forces reference drawers open, adds section code prefixes, and neutralizes animations. This is production-quality print support.

### Reduced motion foundation
The `prefers-reduced-motion` block zeroes all durations globally with `!important`, which is the correct nuclear approach. The gaps are in JS-driven animations that do not check the preference, but the CSS foundation is solid.

### Keyboard-first navigation
The keyboard shortcut system (1-5 for principles, t/r/u/s/c for quick jump) with input-field detection is well-implemented. The Escape key handling for surfaces is correct. Tab order follows visual order.

### Semantic HTML
The HTML shell uses `<header>`, `<main>`, `<aside>`, `<nav>`, `<section>`, and `<details>` appropriately. `aria-live="polite"` on the render root. `aria-labelledby`, `aria-controls`, `aria-expanded` are used correctly on toggles and surfaces.

---

## Recommended Actions

1. **[P0] `/harden`** -- Fix rating option ARIA roles (role="radiogroup" on scale, role="radio" on options) and lock down reduced-motion opacity flash on section enter
2. **[P1] `/harden`** -- Add focus trap to evidence lightbox (role="dialog", aria-modal="true", Tab cycle)
3. **[P1] `/normalize`** -- Replace 4 hardcoded `color: #fff` instances with `var(--section-on-accent)` or `var(--ut-white)`
4. **[P1] `/optimize`** -- Reduce MutationObserver scope and evaluate structural sharing for store commits
5. **[P1] `/harden`** -- Replace setTimeout(220) focus return with transitionend listener
6. **[P1] `/clarify`** -- Add keyboard shortcuts section to help panel
7. **[P2] `/harden`** -- Guard JS-driven page transition animations against prefers-reduced-motion
8. **[P2] `/polish`** -- Resolve text-rendering/font-kerning contradiction in base.css
9. **[P2] `/optimize`** -- Replace progress bar width animation with transform: scaleX()
10. **[P2] `/polish`** -- Final pass for minor issues (cursor pointer on disabled ratings, strip cell keyboard intent)

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/audit` after fixes to see your score improve.
