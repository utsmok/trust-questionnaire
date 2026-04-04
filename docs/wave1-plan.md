# Wave 1 Consolidated Implementation Plan

**Date:** 2026-04-04
**Scope:** ANIMATIONS, COLORS, TYPOGRAPHY
**Merged from:** wave1-animate-recommendations.md, wave1-colorize-recommendations.md, wave1-typeset-recommendations.md

## Conflict Resolution

- Typography T1 (scale) changes `--text-body` from 0.9375rem to 1rem. This affects line 19 of colorize M1 (contrast check). The contrast check should use the new values. No real conflict.
- Colorize H4 recommends two alternatives for score-2. Choosing `#088080` (teal-leaning) to maximize differentiation from `--ut-blue: #007d9c`.
- Animation H2 (surface overlay) uses `visibility`+`opacity` approach. The current JS toggles `hidden` attribute and `style.display`. The CSS-only approach via `visibility` is simpler and avoids race conditions. We will add CSS for the transition but NOT change the JS `display` toggling since that already works via `syncShellSurfaces`. Instead we add a CSS animation on the surface card using the existing `.is-open` class.

## Implementation Order (by file, HIGH first)

### Phase 1: tokens.css (all HIGH token changes)

1. **[COLOR H1]** Update `--ut-white`, `--ut-panel-bg`, `--ut-grey`, `--ut-offwhite` to warm-tinted values
2. **[COLOR H2]** Update `--ut-border`, `--ut-muted`, `--ut-slate` to navy-tinted values
3. **[COLOR H3]** Add neutral scale tokens
4. **[COLOR H4]** Update `--score-2` to `#088080`
5. **[TYPE 1]** Update type scale values
6. **[TYPE 6]** Add `--lh-sub` token
7. **[COLOR M2]** Add `--ut-canvas` token
8. **[COLOR M3]** Add `--focus-ring`, `--focus-ring-offset`, `--focus-ring-width` tokens

### Phase 2: base.css

9. **[COLOR M2]** Use `--ut-canvas` for body background
10. **[TYPE 10]** Add `text-rendering: optimizeSpeed` to body

### Phase 3: layout.css

11. **[TYPE 2]** Remove `--text-heading: 1.0625rem` from 760px breakpoint
12. **[ANIM H2]** Add surface overlay animation CSS
13. **[COLOR M4]** Contextual progress bar color

### Phase 4: components.css

14. **[TYPE 3]** Adjust h2/h3 weight hierarchy
15. **[TYPE 6]** Normalize h3 line-height to `--lh-sub` token
16. **[TYPE 7]** Step down secondary text sizes (field-help, mock-control, evidence-block-description, context-source-item)
17. **[TYPE 8]** Update `.mock-control .value` weight from 600 to 700
18. **[TYPE 9]** Add `tabular-nums` to rating text strong, page-index-state, page-index-status
19. **[COLOR H5]** Migrate hardcoded rgba() values to token references
20. **[COLOR M5]** Harmonize evidence block accent colors
21. **[COLOR M6]** Unify notice component with state-error tokens

### Phase 5: states.css

22. **[ANIM H1]** Page crossfade transition CSS
23. **[ANIM H3]** Rating selection confirmation pulse
24. **[ANIM M2]** Criterion card focus-within emphasis (add box-shadow transition)
25. **[ANIM M4]** Evidence item entrance/exit animations
26. **[ANIM M5]** Top accent bar faster transition
27. **[ANIM L2]** Page index button box-shadow transition
28. **[ANIM L3]** Pager button opacity transition
29. **[COLOR H5]** Migrate hardcoded rgba() values to token references
30. **[COLOR M3]** Replace focus ring outlines with token references

### Phase 6: print.css

31. **[PRINT]** Ensure new animation classes are reset in print

### Phase 7: trust-framework.html

32. **[TYPE 8]** Remove Inter weight 600 from Google Fonts link

### Phase 8: JS changes

33. **[ANIM H1]** Add page crossfade logic in navigation.js `syncPageVisibility`
34. **[ANIM H3]** Add rating pulse in field-handlers.js `syncRatingOption`

## Items Excluded

- **[TYPE 5]** Display token -- recommendation self-retracted
- **[TYPE 4]** Font-display / Barlow Condensed -- requires external dependency decision, not a code change
- **[ANIM M1]** Reference drawer grid-template-rows animation -- requires replacing native `<details>` with JS accordion, too invasive for Wave 1
- **[ANIM M3]** Conditional field visibility transition -- requires restructuring `syncFieldGroup` hidden attribute handling, risky with accessibility
- **[COLOR L1]** Dark mode scaffolding -- explicitly LOW, deferred
- **[COLOR L2]** OKLCH -- explicitly LOW, deferred
- **[COLOR L3]** Color legend -- requires HTML/JS additions, deferred
- **[COLOR L4]** Print color preservation -- explicitly LOW, deferred
- **[COLOR L5]** Collapse duplicated active-section rules -- explicitly LOW, large refactor
- **[TYPE 11-16]** All LOW priority, deferred
- **[ANIM L4, L5]** No action needed per recommendations
- **[ANIM L1]** No action needed per recommendations
- **[COLOR M1]** Muted text contrast -- addressed by H2 navy tinting
