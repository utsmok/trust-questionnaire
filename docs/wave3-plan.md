# Wave 3 -- Consolidated Implementation Plan

**Date**: 2026-04-04
**Scope**: Audit fixes (accessibility, performance, theming, responsive) and critique fixes (UX, hierarchy, usability)

---

## Disposition

Several audit findings are already resolved in the current codebase:

- **P0 ARIA roles on rating scale**: `dom-factories.js` already sets `role="radiogroup"` on `.rating-scale` (line 703) and `role="radio"` on `.rating-option` (line 747), with `aria-checked` (line 748) and `aria-labelledby` (line 704). No code change needed.
- **P0 `prefers-reduced-motion` sectionEnter opacity flash**: Still valid. The `sectionEnter` keyframe starts at `opacity: 0` (states.css line 475) and the reduced-motion block only zeroes durations without forcing `opacity: 1`.
- **Evidence lightbox `role="dialog"`**: `evidence.js` line 919-920 already sets `role="dialog"` and `aria-modal="true"` on the inner dialog div. However, the **focus trap** (Tab cycling) is missing.
- **Keyboard shortcuts**: `keyboard.js` implements Alt+1-5 and Alt+t/r/u/s/c shortcuts. They are documented in help-panel.js line 393. The audit wants a dedicated shortcuts section in the help panel.
- **P1 hardcoded `color: #fff`**: Confirmed 4 locations in states.css (lines 423, 729, 1168, 1388) plus skip link in base.css line 28.

---

## Implementation Order (P0 first, then P1, then P2; prefer accessibility; grouped by file)

### Phase 1: P0 -- Critical Accessibility

| # | File | Change | Source |
|---|------|--------|--------|
| 1.1 | `static/css/states.css` | In `@media (prefers-reduced-motion: reduce)` block, add `opacity: 1; animation: none;` for `.doc-section, .form-section` to guarantee visibility | Audit P0 |

### Phase 2: P1 -- High Priority

| # | File | Change | Source |
|---|------|--------|--------|
| 2.1 | `static/css/states.css` | Replace `color: #fff` with `color: var(--section-on-accent)` at line 423 (`.nav-button.active`) | Audit P1 |
| 2.2 | `static/css/states.css` | Replace `color: #fff` with `color: var(--section-on-accent)` at line 1168 (`.context-pin-button[aria-pressed="true"]`, `.reference-pin-button[aria-pressed="true"]`) | Audit P1 |
| 2.3 | `static/css/states.css` | Replace `color: #fff` with `color: var(--section-on-accent)` at line 1388 (`.shell-action-button[aria-expanded="true"]`) | Audit P1 |
| 2.4 | `static/css/components.css` | Replace `color: #fff` with `color: var(--ut-white)` at line 728 (`.evidence-button-primary`) | Audit P1 |
| 2.5 | `static/css/components.css` | Replace `color: #fff` with `color: var(--ut-white)` at line 742 (`.evidence-button-primary:hover`) | Audit P1 |
| 2.6 | `static/css/base.css` | Replace `color: #fff` with `color: var(--section-on-accent, #fff)` at line 28 (`.skip-link`) | Audit P1 |
| 2.7 | `static/js/behavior/navigation.js` | Replace `setTimeout(220)` focus return (line 320-327) with `transitionend` event listener on context panel | Audit P1 |
| 2.8 | `static/js/behavior/navigation.js` | Guard page transition animation (line 421-441) against `prefers-reduced-motion` by checking the media query before applying transition classes | Audit P2 (elevated: same motion concern as P0) |
| 2.9 | `static/js/behavior/navigation.js` | Reduce MutationObserver scope: remove `subtree: true` (line 944), use `childList: true` only | Audit P1 |
| 2.10 | `static/js/render/evidence.js` | Add focus trap to evidence lightbox: Tab/Shift+Tab cycling between first and last focusable elements; Escape already handled | Audit P1 |
| 2.11 | `static/js/render/help-panel.js` | Add dedicated keyboard shortcuts section to help panel with a structured table | Audit P1 |

### Phase 3: P2 -- Medium Priority

| # | File | Change | Source |
|---|------|--------|--------|
| 3.1 | `static/css/base.css` | Remove `text-rendering: optimizeSpeed` (line 17) to resolve contradiction with `font-kerning: normal` (line 16) | Audit P2 |
| 3.2 | `static/css/base.css` | Move `overflow: hidden` from CSS to JS (add after shell init) with `<noscript>` fallback | Audit P2 |
| 3.3 | `static/css/tokens.css` | Raise `--text-xs` from `0.56rem` to `0.625rem` (9px to 10px) | Audit P2 + Critique P3 |
| 3.4 | `static/css/components.css` | Move `cursor: pointer` on `.rating-option` to `.rating-option:not([aria-disabled="true"])` | Audit P2 |
| 3.5 | `static/css/layout.css` | Add solid fallback background before `backdrop-filter` on `.shell-surface` | Audit P2 |
| 3.6 | `static/css/layout.css` | Replace `will-change: width` and `width` transition on `.panel-progress-bar` with `transform: scaleX()` and `transform-origin: left` | Audit P2 |
| 3.7 | `static/css/states.css` | Guard rating dot confirmation pulse (`is-just-selected`) and evidence item entrance animation against `prefers-reduced-motion` | Audit P2 |
| 3.8 | `trust-framework.html` | Add `aria-hidden="true"` and `role="presentation"` to strip cells | Audit P2 |

---

## Files NOT Changed

- `static/css/print.css` -- hardcoded `#000` for print is acceptable (audit agrees)
- `static/js/state/store.js` -- deep clone optimization deferred (requires structural sharing refactor, too invasive for this wave)
- `static/js/render/dom-factories.js` -- ARIA roles already present, no change needed

---

## Summary Statistics

- P0 fixes: 1 CSS change
- P1 fixes: 6 CSS token fixes, 3 JS behavior changes, 1 JS feature (focus trap), 1 JS feature (help panel shortcuts)
- P2 fixes: 4 CSS changes, 1 CSS+JS change (progress bar), 1 HTML change, 1 CSS motion guard
- Total: 18 changes across 8 files
