# Wave 1 Implementation Summary

**Date:** 2026-04-04
**Scope:** ANIMATIONS, COLORS, TYPOGRAPHY
**Status:** Complete

## Files Modified

### `/static/css/tokens.css`
- Updated `--ut-white` to `#fafbfc`, `--ut-panel-bg` to `#f3f4f6`, `--ut-grey` to `#eef0f3`, `--ut-offwhite` to `#f3f4f6` (warm-tinted neutrals)
- Updated `--ut-border` to `#bfc6cf`, `--ut-muted` to `#576578`, `--ut-slate` to `#8b9bb0` (navy-tinted mid-tones)
- Removed duplicate `--ut-slate` declaration (was being overridden by a second instance at line ~190)
- Updated `--score-2` to `#088080` (teal, differentiated from `--ut-blue`)
- Updated type scale: `--text-xs: 0.64rem`, `--text-sm: 0.8rem`, `--text-body: 1rem`, `--text-sub: 1.25rem`, `--text-heading: 1.563rem` (major third ratio anchored at 1rem)
- Added `--lh-sub: 1.3` token for subheading line-height normalization
- Added neutral scale tokens `--neutral-50` through `--neutral-900`
- Added `--ut-canvas: var(--ut-grey)` for body background
- Added `--focus-ring`, `--focus-ring-offset`, `--focus-ring-width` tokens

### `/static/css/base.css`
- Changed body background from `var(--ut-grey)` to `var(--ut-canvas)`
- Added `text-rendering: optimizeSpeed` to body

### `/static/css/layout.css`
- Removed `--text-heading: 1.0625rem` override from 760px breakpoint
- Updated `.panel-progress` background to use `color-mix()` with `--active-section-accent` for contextual progress bar color
- Added surface overlay animation CSS (`surfaceFadeIn`, `surfaceSlideIn` keyframes)
- Migrated all hardcoded `rgba()` values to `color-mix()` token references (panel scroll gradients, surface backdrop, context drawer backdrop)

### `/static/css/components.css`
- Changed h2 weight from 700 to 800, h3 weight from 800 to 700 (clear weight gradient)
- Normalized h3 line-height to `var(--lh-sub)` across h3, criterion-card h3, context-anchor-label, page-index-label
- Stepped down secondary text to `var(--text-sm)`: field-help, mock-control, evidence-block-description, context-source-item
- Updated `.mock-control .value` weight from 600 to 700
- Added `tabular-nums` to page-index-state and page-index-status
- Migrated all hardcoded `rgba()` values to token/color-mix references: section-kicker, condition-tag, display-tag, rating-option borders, placeholder-line, evidence-block, evidence-meta-type, lightbox backdrop, notice, context-anchor-button, reference-drawer-status, reference-drawer
- Harmonized evidence block accent to use `var(--section-accent, var(--ut-blue))`
- Unified notice component with `--state-error-*` tokens
- Replaced all focus ring outlines with `var(--focus-ring)` tokens

### `/static/css/states.css`
- Changed top accent bar transition from `--duration-normal` to `--duration-fast`
- Added page crossfade transition CSS (`.is-page-transitioning-out`, `.is-page-transitioning-in`)
- Added rating selection confirmation pulse animation (`ratingDotConfirm` keyframe, `.is-just-selected`)
- Added evidence item entrance/exit animations (`evidenceItemEnter` keyframe, `.is-removing`)
- Added pager button opacity transition
- Added page-index-button box-shadow transition
- Added `box-shadow` transition to criterion-card and 1px box-shadow on `:focus-within`
- Migrated all ~55 hardcoded `rgba()` values to `color-mix()` token references: strip cells, active sections, criterion cards, section kickers, chips, condition tags, completion badges, checkbox items, reference drawers
- Replaced all focus ring outlines with `var(--focus-ring)` / `var(--focus-ring-width)` / `var(--focus-ring-offset)` tokens

### `/static/css/print.css`
- Added print resets for new animation classes: `is-page-transitioning-out`, `is-page-transitioning-in`, `is-just-selected`, `is-removing`
- Added print resets for surface overlay animations

### `/trust-framework.html`
- Removed Inter weight 600 from Google Fonts link (now loads 400, 700, 800 only)

### `/static/js/behavior/navigation.js`
- Added `previousActivePageId` tracking variable
- Modified `syncPageVisibility` to implement two-phase crossfade: outgoing page gets `is-page-transitioning-out` for 150ms, then visibility swaps and incoming page gets `is-page-transitioning-in` briefly

### `/static/js/behavior/field-handlers.js`
- Added `wasNotSelected` detection in `syncRatingOption`
- On newly-selected rating options, adds `is-just-selected` class with `animationend` listener for automatic cleanup

## Items Excluded (per plan)
- Reference drawer grid-template-rows animation (requires replacing native details)
- Conditional field visibility transition (restructuring hidden attribute handling)
- Dark mode scaffolding, OKLCH, color legend (LOW priority)
- Display token, Barlow Condensed font (self-retracted / requires dependency decision)

## Verification Notes
- Zero hardcoded `rgba()` values remain in any CSS file
- All animations use existing duration/easing tokens
- `prefers-reduced-motion` handled by existing zeroing mechanism in states.css
- Print stylesheet disables all new animations
