# Wave 3 -- Implementation Summary

**Date**: 2026-04-04
**Scope**: Audit fixes (accessibility, performance, theming, responsive) and critique fixes (UX, hierarchy, usability)
**Status**: Complete

---

## Changes Applied

### Phase 1: P0 -- Critical Accessibility (1 change)

| # | File | Change | Lines |
|---|------|--------|-------|
| 1.1 | `static/css/states.css` | Added `opacity: 1 !important; animation: none !important` for `.doc-section, .form-section` in `@media (prefers-reduced-motion: reduce)` block. Prevents sections from being invisible when `sectionEnter` keyframe cannot complete with zero-duration animations. | Lines 22-27 |

### Phase 2: P1 -- High Priority (11 changes)

| # | File | Change |
|---|------|--------|
| 2.1 | `static/css/states.css` | Replaced `color: #fff` with `color: var(--section-on-accent)` on `.nav-button.active` |
| 2.2 | `static/css/components.css` | Replaced `color: #fff` with `color: var(--section-on-accent)` on `.context-pin-button[aria-pressed="true"]`, `.reference-pin-button[aria-pressed="true"]` |
| 2.3 | `static/css/states.css` | Replaced `color: #fff` with `color: var(--section-on-accent)` on `.shell-action-button[aria-expanded="true"]` |
| 2.4 | `static/css/components.css` | Replaced `color: #fff` with `color: var(--ut-white)` on `.evidence-button-primary` |
| 2.5 | `static/css/components.css` | Replaced `color: #fff` with `color: var(--ut-white)` on `.evidence-button-primary:hover` |
| 2.6 | `static/css/base.css` | Replaced `color: #fff` with `color: var(--section-on-accent, #fff)` on `.skip-link` |
| 2.7 | `static/js/behavior/navigation.js` | Replaced `setTimeout(220)` focus return with `transitionend` event listener on context drawer panel, with a 320ms fallback timeout for edge cases where the transition does not fire |
| 2.8 | `static/js/behavior/navigation.js` | Added `prefers-reduced-motion` media query check before applying page transition classes (`is-page-transitioning-out` / `is-page-transitioning-in`). When reduced motion is preferred, sections are shown/hidden immediately without opacity animation. |
| 2.9 | `static/js/behavior/navigation.js` | Removed `subtree: true` from MutationObserver config. Observer now only reacts to direct children being added/removed from the render root, reducing O(n*m) re-sync overhead. |
| 2.10 | `static/js/render/evidence.js` | Added Tab/Shift+Tab focus trap to evidence lightbox. Cycles focus between the backdrop button (first focusable) and close button (last focusable). Handler is installed on `openEvidenceLightbox` and removed on `closeEvidenceLightbox`. |
| 2.11 | `static/js/render/help-panel.js` | Added dedicated "Keyboard shortcuts" section to help panel with a structured table listing all 11 keyboard shortcuts (Alt+1-5, Alt+t/r/u/s/c, Escape). |

### Phase 3: P2 -- Medium Priority (7 changes)

| # | File | Change |
|---|------|--------|
| 3.1 | `static/css/base.css` | Removed `text-rendering: optimizeSpeed` from body, resolving contradiction with `font-kerning: normal` |
| 3.2 | `static/css/base.css` + `static/js/app.js` + `trust-framework.html` | Changed body `overflow: hidden` to `overflow: auto` in CSS. Added `document.body.style.overflow = 'hidden'` in `bootstrapApp()` after shell init. Added `<noscript>` style block to restore scrolling when JS is disabled. |
| 3.3 | `static/css/tokens.css` | Raised `--text-xs` from `0.56rem` (~9px) to `0.625rem` (10px) for better baseline readability |
| 3.4 | `static/css/components.css` | Moved `cursor: pointer` from `.rating-option` to `.rating-option:not([aria-disabled="true"])` to avoid contradictory cursor state on disabled options |
| 3.5 | `static/css/layout.css` | Added solid fallback background (`color-mix(in srgb, var(--ut-text) 88%, var(--ut-grey))`) before `backdrop-filter: blur(2px)` on `.shell-surface`. When backdrop-filter is unsupported, the overlay still has sufficient contrast. |
| 3.6 | `static/css/layout.css` + `static/js/behavior/navigation.js` | Replaced `will-change: width` and width-based progress bar animation with `transform: scaleX()` + `transform-origin: left`. Updated JS to set `style.transform = scaleX(...)` instead of `style.width`. Avoids layout recalculation on every progress update. |
| 3.7 | `static/css/states.css` | Added `@media (prefers-reduced-motion: reduce)` guards for rating dot confirmation pulse (`is-just-selected`) and evidence item entrance animation. Forces `opacity: 1` and `animation: none` to prevent invisible/animated states. |
| 3.8 | `static/js/render/sidebar.js` | Added `aria-hidden="true"` and `role="presentation"` to strip cells, clarifying that they are decorative indicators, not interactive navigation elements. |

---

## Files Changed

| File | Changes |
|------|---------|
| `static/css/states.css` | 5 changes (reduced-motion opacity fix, 2 token replacements, motion guards for animations) |
| `static/css/components.css` | 4 changes (2 token replacements, cursor pointer fix, pin button token) |
| `static/css/base.css` | 3 changes (skip link token, text-rendering removal, overflow change) |
| `static/css/layout.css` | 2 changes (backdrop-filter fallback, progress bar scaleX) |
| `static/css/tokens.css` | 1 change (text-xs size increase) |
| `static/js/behavior/navigation.js` | 4 changes (transitionend focus, reduced-motion page guard, MutationObserver scope, scaleX progress) |
| `static/js/render/evidence.js` | 1 change (focus trap with Tab cycling) |
| `static/js/render/help-panel.js` | 1 change (keyboard shortcuts section) |
| `static/js/render/sidebar.js` | 1 change (strip cell aria-hidden) |
| `static/js/app.js` | 1 change (overflow hidden after shell init) |
| `trust-framework.html` | 1 change (noscript fallback style) |

**Total**: 18 planned changes across 11 files.

---

## Items Not Changed (Per Plan)

- **`static/css/print.css`** -- hardcoded `#000` for print is acceptable
- **`static/js/state/store.js`** -- deep clone optimization deferred (requires structural sharing refactor, too invasive)
- **`static/js/render/dom-factories.js`** -- ARIA roles already present (`role="radiogroup"`, `role="radio"`), no change needed
- **P0 ARIA roles on rating scale** -- already resolved in current codebase
- **Score-level color naming** (P3) -- deferred to a future wave

---

## Verification Notes

1. **All `color: #fff` instances eliminated** from CSS. Grep confirms zero remaining matches across `static/css/`.
2. **Progress bar** now uses GPU-composited `transform: scaleX()` instead of layout-triggering `width`.
3. **Focus management** for context drawer uses event-driven `transitionend` with a safety fallback timeout.
4. **Reduced motion** is comprehensively guarded: CSS keyframe animations, JS-driven page transitions, rating pulse, and evidence entrance all respect the media query.
5. **Focus trap** in evidence lightbox cycles Tab between backdrop and close button, with handler cleanup on close.
6. **Overflow hidden** is now JS-dependent with a `<noscript>` fallback, preventing scroll-lock when JS fails to load.
