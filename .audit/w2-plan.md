# Wave 2 Unified Implementation Plan

**Sources**: w2-delight.md, w2-bolder.md, w2-overdrive.md
**Cross-reference**: w1-plan.md (already implemented)
**Date**: 2026-04-04

---

## Conflict Resolutions

| Conflict                                                                                                                                     | Resolution                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bolder R3** wants top-accent 8px→5px vs **Overdrive R1** uses 8px height in its code                                                       | Adopt **Bolder R3**: reduce to 5px. Overdrive R1's `@property` color animation works at any height. Overdrive R7 (stripe pattern) is deferred anyway.       |
| **Delight R6** adds `border-left: 3px` on field-group focus-within vs **Bolder R10** darkens field-group border                              | Both are compatible — they target different states (focus vs default). Apply both.                                                                          |
| **Bolder R7** increases page-index inset shadow 2px→3px vs **Overdrive R2** adds `@starting-style` animation to the same element             | Overdrive R2 is progressive-enhancement-only and the inset shadow is the settled final state. Apply both: bump to 3px AND add `@starting-style` transition. |
| **Delight R2** adds `ratingBorderConfirm` keyframe vs **Bolder R14** (withdrawn) on evidence borders                                         | No conflict — Bolder R14 was explicitly withdrawn. Apply Delight R2 as-is.                                                                                  |
| **Delight R5** varies evidence empty-state text per principle vs existing generic text                                                       | Delight's approach is more helpful. Replace the two-line generic text in `evidence.js:91-94` with principle-aware messages.                                 |
| **Overdrive R5** adds `border-left-width` to form-section transition vs **Bolder R2** adds `border-bottom-width: 2px` to active form-section | Compatible: Overdrive R5 adds the transition property; Bolder R2 adds a new property to the active state. Apply both.                                       |

---

## Deferred to Later Waves

All LOW-priority items from all three audits are deferred:

| ID            | Source    | Description                           | Why Deferred                                                             |
| ------------- | --------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Delight R7    | delight   | Page-index navigation flash class     | Requires JS class toggle; marginal improvement over existing `is-active` |
| Delight R8    | delight   | Reference drawer height animation     | Intentionally native `<details>` per design context                      |
| Delight R9    | delight   | Pager button arrow nudge              | 1px micro-nudge is imperceptible                                         |
| Delight R10   | delight   | Context sidebar "scanning" state      | Adds complexity for a 50ms dip                                           |
| Delight R11   | delight   | Console branding message              | Niche developer-only; no user value                                      |
| Bolder R8     | bolder    | "Quick Reference" heading container   | Minor; the heading is already styled by `.panel-title-section`           |
| Bolder R10    | bolder    | Darken field-group borders            | Marginal improvement; risks visual noise                                 |
| Bolder R11    | bolder    | Section-kicker left border 3px→4px    | Current 3px is proportionally correct                                    |
| Bolder R12    | bolder    | Completion strip accent bottom-border | Adds visual weight to already-dense header                               |
| Overdrive R3  | overdrive | Animated `clip-path` strip-cell fill  | Complex CSS + requires verifying no content clips                        |
| Overdrive R4  | overdrive | Scroll-driven progress indicator      | Requires HTML change + Firefox lacks support                             |
| Overdrive R6  | overdrive | `backdrop-filter` blur increase       | 2px→4px is barely perceptible                                            |
| Overdrive R7  | overdrive | Diagonal stripe on accent bar         | Conflicts with "no decorative patterns" principle                        |
| Overdrive R8  | overdrive | Pager counter slide animation         | Requires JS restructure of status text                                   |
| Overdrive R9  | overdrive | `transition-behavior: allow-discrete` | Browser support not yet universal; current pattern works                 |
| Overdrive R10 | overdrive | Staggered cell appear on load         | One-time animation; requires JS `--i` per cell                           |

---

## Wave 1 Cross-Reference

These Wave 1 changes are already in the codebase and must NOT be reverted:

- **tokens.css**: `--state-warning: #d97706`, `--state-blocked-tint` uses `--state-blocked` at 10%, `--ls-section-kicker: 0.1em`, SE/TC on-accent → `#ffffff`
- **base.css**: font rendering properties, `.small` class removed
- **layout.css**: `.brand-sep` font-weight 400, `.panel-title` font-weight 700, `.surface-kicker` uses `var(--ls-section-kicker)`, `.trust-label p` uses `var(--ls-uppercase)`, surface exit animations
- **components.css**: All `font-weight: 800` → `700`, all hardcoded `letter-spacing` → token refs, `h3` `font-family: var(--ff-heading)`, `.context-route-title` `letter-spacing: var(--ls-uppercase)`
- **interaction-states.css**: `.nav-button:active` uses `color-mix`, `.header-progress-title` weight/ls tokenified
- **animations.css**: reduced-motion guard for `.is-closing`
- **print.css**: surface close reset, score token borders
- **field-handlers.js**: `is-just-selected` timeout 200ms
- **navigation.js**: surface overlay exit animation logic

**Important**: Bolder R1 changes `--text-display` and `--text-mega`. These tokens were NOT touched in Wave 1, so no conflict.

---

## Implementation Changes — By File

CSS load order: `tokens.css` → `base.css` → `accent-scoping.css` → `layout.css` → `components.css` → `interaction-states.css` → `animations.css` → `print.css`

---

### 1. `static/css/tokens.css`

#### 1a. Increase heading scale for stronger h1→h2 hierarchy (Bolder R1 — HIGH)

The h1 panel-title uses `--text-display` (1.95rem) and h2 section headings use `--text-heading` (1.563rem) — only a 1.25x ratio. Increase to ~1.44x.

**Line 289**:

```
OLD: --text-display: 1.95rem;
NEW: --text-display: 2.25rem;
```

**Line 290**:

```
OLD: --text-mega: 2.25rem;
NEW: --text-mega: 2.75rem;
```

#### 1b. Add `@property` for animatable top-accent color (Overdrive R1 — HIGH)

This enables smooth hue interpolation when switching between section accent colors. Must be declared before `:root`.

**Before line 4** (before `:root {`):

```
ADD:
@property --top-accent-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #002c5f;
}
```

---

### 2. `static/css/accent-scoping.css`

#### 2a. Add `--top-accent-color` per accent key (Overdrive R1 — HIGH)

Each accent key block needs to set `--top-accent-color` so the top accent bar animates smoothly between section colors.

**Line 1** (body defaults):

```
OLD: body {
  --active-section-accent: var(--section-control-accent);
NEW: body {
  --top-accent-color: var(--section-control-accent-strong);
  --active-section-accent: var(--section-control-accent);
```

**Lines 9–16** (control/intro):

```
OLD: body[data-active-accent-key="control"],
body[data-active-accent-key="intro"] {
  --active-section-accent: var(--section-control-accent);
NEW: body[data-active-accent-key="control"],
body[data-active-accent-key="intro"] {
  --top-accent-color: var(--section-control-accent-strong);
  --active-section-accent: var(--section-control-accent);
```

**Lines 18–25** (profile/scope):

```
OLD: body[data-active-accent-key="profile"],
body[data-active-accent-key="scope"] {
  --active-section-accent: var(--section-profile-accent);
NEW: body[data-active-accent-key="profile"],
body[data-active-accent-key="scope"] {
  --top-accent-color: var(--section-profile-accent-strong);
  --active-section-accent: var(--section-profile-accent);
```

**Lines 27–33** (setup):

```
OLD: body[data-active-accent-key="setup"] {
  --active-section-accent: var(--section-setup-accent);
NEW: body[data-active-accent-key="setup"] {
  --top-accent-color: var(--section-setup-accent-strong);
  --active-section-accent: var(--section-setup-accent);
```

**Lines 35–41** (tr):

```
OLD: body[data-active-accent-key="tr"] {
  --active-section-accent: var(--section-tr-accent);
NEW: body[data-active-accent-key="tr"] {
  --top-accent-color: var(--section-tr-accent-strong);
  --active-section-accent: var(--section-tr-accent);
```

**Lines 43–49** (re):

```
OLD: body[data-active-accent-key="re"] {
  --active-section-accent: var(--section-re-accent);
NEW: body[data-active-accent-key="re"] {
  --top-accent-color: var(--section-re-accent-strong);
  --active-section-accent: var(--section-re-accent);
```

**Lines 51–57** (uc):

```
OLD: body[data-active-accent-key="uc"] {
  --active-section-accent: var(--section-uc-accent);
NEW: body[data-active-accent-key="uc"] {
  --top-accent-color: var(--section-uc-accent-strong);
  --active-section-accent: var(--section-uc-accent);
```

**Lines 59–65** (se):

```
OLD: body[data-active-accent-key="se"] {
  --active-section-accent: var(--section-se-accent);
NEW: body[data-active-accent-key="se"] {
  --top-accent-color: var(--section-se-accent-strong);
  --active-section-accent: var(--section-se-accent);
```

**Lines 67–73** (tc):

```
OLD: body[data-active-accent-key="tc"] {
  --active-section-accent: var(--section-tc-accent);
NEW: body[data-active-accent-key="tc"] {
  --top-accent-color: var(--section-tc-accent-strong);
  --active-section-accent: var(--section-tc-accent);
```

**Lines 75–83** (reference/scoring/evidence):

```
OLD: body[data-active-accent-key="reference"],
body[data-active-accent-key="scoring"],
body[data-active-accent-key="evidence"] {
  --active-section-accent: var(--section-reference-accent);
NEW: body[data-active-accent-key="reference"],
body[data-active-accent-key="scoring"],
body[data-active-accent-key="evidence"] {
  --top-accent-color: var(--section-reference-accent-strong);
  --active-section-accent: var(--section-reference-accent);
```

**Lines 85–91** (recommendation):

```
OLD: body[data-active-accent-key="recommendation"] {
  --active-section-accent: var(--section-recommendation-accent);
NEW: body[data-active-accent-key="recommendation"] {
  --top-accent-color: var(--section-recommendation-accent-strong);
  --active-section-accent: var(--section-recommendation-accent);
```

**Lines 93–99** (governance):

```
OLD: body[data-active-accent-key="governance"] {
  --active-section-accent: var(--section-governance-accent);
NEW: body[data-active-accent-key="governance"] {
  --top-accent-color: var(--section-governance-accent-strong);
  --active-section-accent: var(--section-governance-accent);
```

---

### 3. `static/css/layout.css`

#### 3a. Reduce top-accent bar height from 8px to 5px (Bolder R3 — MEDIUM)

**Line 7**:

```
OLD:   height: 8px;
NEW:   height: 5px;
```

**Line 8**:

```
OLD:   background: var(--ut-red);
NEW:   background: var(--top-accent-color);
```

#### 3b. Update site-header inset to match new accent bar height (Bolder R3 — MEDIUM)

**Line 14**:

```
OLD:   inset: 8px 0 auto 0;
NEW:   inset: 5px 0 auto 0;
```

#### 3c. Add `--top-accent-color` transition (Overdrive R1 — HIGH)

Replace the existing top-accent transition in `interaction-states.css` (line 2-3) with the `@property`-driven transition here. Actually, since `interaction-states.css` overrides `background` on `.top-accent`, the transition should live where the background is set. See interaction-states change 6a below.

---

### 4. `static/css/components.css`

#### 4a. Add transition for `border-left-width` on rating option (Delight R2 — HIGH)

**Lines 465-467**:

```
OLD:
  transition:
    background var(--duration-instant) var(--ease-out-quart),
    border-color var(--duration-instant) var(--ease-out-quart);
NEW:
  transition:
    background var(--duration-instant) var(--ease-out-quart),
    border-color var(--duration-instant) var(--ease-out-quart),
    border-left-width var(--duration-instant) var(--ease-out-quart);
```

#### 4b. Subtle background tint on questionnaire panel (Bolder R4 — MEDIUM)

Breaks white-on-white between page surface and form-section cards.

**Line 241**:

```
OLD:   background: var(--ut-white);
NEW:   background: var(--neutral-50);
```

Note: `.questionnaire-panel .form-section` (line 99-101) already stays `background: var(--ut-white)`, so cards pop against the tinted panel.

#### 4c. Add bottom-border to criterion card h3 (Bolder R5 — MEDIUM)

Creates visual separation between criterion heading and content within a form section.

**After line 553** (after `font-family: var(--ff-heading);` — this was added in Wave 1):

```
OLD:   font-family: var(--ff-heading);
NEW:   font-family: var(--ff-heading);
    border-bottom: 1px solid var(--ut-border);
    padding-bottom: 6px;
```

#### 4d. Strengthen pager shell visual presence (Bolder R6 — HIGH)

**Lines 1344-1345**:

```
OLD:   border: 1px solid var(--ut-border);
  background: var(--ut-offwhite);
NEW:   border: 2px solid var(--ut-border);
  background: color-mix(in srgb, var(--ut-navy) 5%, var(--ut-offwhite));
  box-shadow: 0 1px 3px color-mix(in srgb, var(--ut-navy) 6%, transparent);
```

#### 4e. Darken score-table header background and thicken bottom border (Bolder R9 — MEDIUM)

**Line 228**:

```
OLD:   background: var(--ut-offwhite);
NEW:   background: var(--neutral-200);
```

**After line 228** (add a new rule for `th` bottom border, separate from the shared `th, td` rule):
Add after the `.score-table th {` block (after line 235):

```
ADD:
.score-table th {
  border-bottom: 2px solid var(--ut-border);
}
```

#### 4f. Strengthen notice block urgency (Bolder R13 — MEDIUM)

**Line 930**:

```
OLD:   background: var(--state-error-tint);
NEW:   background: color-mix(in srgb, var(--state-error) 14%, var(--ut-white));
```

**Line 938**:

```
OLD:   font-weight: 500;
NEW:   font-weight: 700;
```

---

### 5. `static/css/interaction-states.css`

#### 5a. Top-accent bar: switch to `--top-accent-color` with animated transition (Overdrive R1 — HIGH)

**Lines 1-4**:

```
OLD:
.top-accent {
  background: var(--active-section-accent-strong);
  transition: background var(--duration-fast) var(--ease-out-quart);
}
NEW:
.top-accent {
  background: var(--top-accent-color);
  transition: --top-accent-color 400ms ease;
}
```

Note: Without `@property` support, `--top-accent-color` snaps instantly (identical to current behavior). With `@property`, it interpolates smoothly over 400ms.

#### 5b. Add `border-bottom-width: 2px` to active form-section (Bolder R2 — HIGH)

**Lines 110-115**:

```
OLD:
.doc-section.is-active,
.form-section.is-active {
  background: color-mix(in srgb, var(--ut-navy) 3%, var(--ut-white));
  border-left-width: 8px;
  border-color: color-mix(in srgb, var(--ut-navy) 12%, var(--ut-border));
}
NEW:
.doc-section.is-active,
.form-section.is-active {
  background: color-mix(in srgb, var(--ut-navy) 3%, var(--ut-white));
  border-left-width: 8px;
  border-bottom-width: 2px;
  border-color: color-mix(in srgb, var(--ut-navy) 12%, var(--ut-border));
}
```

#### 5c. Add `border-left-width` to form-section transition (Overdrive R5 — MEDIUM)

**Lines 103-105**:

```
OLD:
.doc-section,
.form-section {
  transition: border-left-color var(--duration-fast) var(--ease-out-quart);
  opacity: 0;
NEW:
.doc-section,
.form-section {
  transition:
    border-left-color var(--duration-fast) var(--ease-out-quart),
    border-left-width var(--duration-fast) var(--ease-out-quart),
    background var(--duration-fast) var(--ease-out-quart);
  opacity: 0;
```

#### 5d. Add `@starting-style` for form-section active state (Overdrive R5 — MEDIUM)

**After line 155** (after the last `border-left-color: var(--tc);` in the per-principle active rules):

```
ADD:
@starting-style {
  .doc-section.is-active,
  .form-section.is-active {
    border-left-width: 6px;
  }
}
```

This makes the accent bar visibly "expand" from 6px to 8px when a section becomes active.

#### 5e. Update field-group focus-within to use section accent (Delight R6 — MEDIUM)

**Lines 749-753**:

```
OLD:
.mock-control:focus-within,
.textarea-mock:focus-within,
.field-group:focus-within {
  border-color: var(--ut-blue);
}
NEW:
.mock-control:focus-within,
.textarea-mock:focus-within {
  border-color: var(--ut-blue);
}

.field-group:focus-within {
  border-color: var(--section-border, var(--ut-blue));
  border-left: 3px solid var(--section-accent, var(--ut-blue));
}
```

Note: Split `.field-group:focus-within` into its own rule since it needs `border-left` while `.mock-control` and `.textarea-mock` should not get a left-border.

#### 5f. Increase page-index active button inset shadow (Bolder R7 — MEDIUM)

**Line 922**:

```
OLD:   box-shadow: inset 0 2px 0 var(--section-accent);
NEW:   box-shadow: inset 0 3px 0 var(--section-accent);
```

**Line 1384**:

```
OLD:   box-shadow: inset 0 2px 0 var(--state-info);
NEW:   box-shadow: inset 0 3px 0 var(--state-info);
```

**Line 1389**:

```
OLD:   box-shadow: inset 0 2px 0 var(--state-warning);
NEW:   box-shadow: inset 0 3px 0 var(--state-warning);
```

**Line 1394**:

```
OLD:   box-shadow: inset 0 2px 0 var(--state-error);
NEW:   box-shadow: inset 0 3px 0 var(--state-error);
```

#### 5g. Add `@starting-style` for page-index active state (Overdrive R2 — HIGH)

**After line 928** (after the `.page-index-button.is-active .page-index-label` rule):

```
ADD:
@starting-style {
  .page-index-button.is-active {
    background: var(--ut-white);
    box-shadow: none;
  }
}
```

This creates a smooth entry animation for the active page-index button. Browsers without `@starting-style` support skip the animation (current instant behavior).

#### 5h. Remove static `border-left-width: 5px` from `is-just-selected` (Delight R2 — HIGH)

**Lines 1062-1064**:

```
OLD:
.rating-option.is-just-selected {
  border-left-width: 5px;
}
NEW:
.rating-option.is-just-selected {
  animation: ratingBorderConfirm 200ms var(--ease-out-quint);
}
```

The animation (defined in animations.css) handles the temporary emphasis, and the settled `.score-*` states already set `border-left: 3px solid`.

---

### 6. `static/css/animations.css`

#### 6a. Update `completePulse` to flash background with section tint (Delight R1 — HIGH)

**Lines 48-56**:

```
OLD:
@keyframes completePulse {
  0% {
    border-color: var(--ut-navy);
  }

  100% {
    border-color: var(--ut-border);
  }
}
NEW:
@keyframes completePulse {
  0% {
    border-color: var(--section-accent-strong, var(--ut-navy));
    background: var(--section-tint, color-mix(in srgb, var(--ut-navy) 10%, var(--ut-white)));
  }

  100% {
    border-color: var(--section-border, var(--ut-border));
    background: var(--section-tint, var(--ut-white));
  }
}
```

Duration stays at 200ms with `--ease-out-quint`. The `.just-completed` class and animation application already exist at `interaction-states.css:589-591`.

#### 6b. Add `ratingBorderConfirm` keyframe (Delight R2 — HIGH)

**After line 68** (after `ratingDotConfirm`):

```
ADD:
@keyframes ratingBorderConfirm {
  0% {
    border-left-width: 2px;
  }
  40% {
    border-left-width: 5px;
  }
  100% {
    border-left-width: 3px;
  }
}
```

---

### 7. `static/js/behavior/pager.js`

#### 7a. Show evaluation-complete status text when on last page (Delight R4 — MEDIUM)

When the reviewer is on the last page (no next page) and overall progress is complete, the status text should acknowledge completion.

**Lines 137-141** (inside the `if (refs.status)` block):

```
OLD:
    if (refs.status) {
      refs.status.textContent = pagerState.activePageDefinition
        ? `Page ${pagerState.activePageIndex + 1} of ${pagerState.pageOrder.length} — ${pagerState.activePageDefinition.pageCode} ${pagerState.activePageDefinition.title}${workflowLabel ? ` · ${workflowLabel}` : ''}`
        : `Page ${Math.max(pagerState.activePageIndex + 1, 1)} of ${pagerState.pageOrder.length}`;
    }
NEW:
    if (refs.status) {
      const isLastPage = !pagerState.nextPageId;
      const overallProgress = state.derived.overallProgress;

      if (isLastPage && overallProgress?.progressState === 'complete') {
        refs.status.textContent = `Evaluation complete — ${pagerState.pageOrder.length} sections reviewed`;
      } else {
        refs.status.textContent = pagerState.activePageDefinition
          ? `Page ${pagerState.activePageIndex + 1} of ${pagerState.pageOrder.length} — ${pagerState.activePageDefinition.pageCode} ${pagerState.activePageDefinition.title}${workflowLabel ? ` · ${workflowLabel}` : ''}`
          : `Page ${Math.max(pagerState.activePageIndex + 1, 1)} of ${pagerState.pageOrder.length}`;
      }
    }
```

Note: The `sync` function receives `state` as its first argument — verify `state.derived.overallProgress` exists in `derive.js`. If the property path differs, adjust accordingly (likely `state.derived.overallProgress.progressState` or `state.derived.pageStates.overallProgress`).

---

### 8. `static/js/render/evidence.js`

#### 8a. Principle-specific evidence empty-state text (Delight R5 — MEDIUM)

**Lines 91-94**:

```
OLD:
const getEvidenceEmptyStateText = (scope) =>
  scope.level === 'evaluation'
    ? 'No evaluation-level evidence attached yet.'
    : 'No criterion-level evidence attached yet.';
NEW:
const PRINCIPLE_EVIDENCE_HINTS = Object.freeze({
  tr: 'No evidence attached. Attach source documentation, screenshots, or methodology disclosures.',
  re: 'No evidence attached. Attach repeated-query results, verification records, or accuracy test data.',
  uc: 'No evidence attached. Attach usability observations, accessibility test results, or workflow screenshots.',
  se: 'No evidence attached. Attach privacy policy excerpts, DPIA notes, or compliance records.',
  tc: 'No evidence attached. Attach provenance path screenshots, source verification records, or attribution samples.',
});

const getEvidenceEmptyStateText = (scope) => {
  if (scope.level === 'evaluation') {
    return 'No evaluation-level evidence attached yet.';
  }

  const principleKey = scope.criterionCode?.slice(0, 2).toLowerCase();
  return PRINCIPLE_EVIDENCE_HINTS[principleKey]
    ?? 'No criterion-level evidence attached yet.';
};
```

---

## Change Count Summary

| File                     | Changes                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`             | 3 edits (text-display, text-mega, @property declaration)                                                                                                                            |
| `accent-scoping.css`     | 11 edits (add --top-accent-color to all 11 accent key blocks)                                                                                                                       |
| `layout.css`             | 3 edits (top-accent height, background, header inset)                                                                                                                               |
| `components.css`         | 7 edits (rating-option transition, panel bg, criterion h3 border, pager shell, score-table header, notice block)                                                                    |
| `interaction-states.css` | 8 edits (top-accent transition, active section bottom-border, form-section transition, @starting-style x2, field-group focus-within, page-index shadow x4, rating is-just-selected) |
| `animations.css`         | 2 edits (completePulse update, ratingBorderConfirm addition)                                                                                                                        |
| `pager.js`               | 1 edit (evaluation-complete status text)                                                                                                                                            |
| `evidence.js`            | 1 edit (principle-specific empty-state text)                                                                                                                                        |
| **Total**                | **~36 discrete edits across 8 files**                                                                                                                                               |

---

## Implementation Order

1. **tokens.css** (1a, 1b) — Foundation: type scale + `@property` declaration
2. **accent-scoping.css** (2a) — Wire `--top-accent-color` to all accent keys
3. **layout.css** (3a, 3b) — Top-accent height + header position
4. **components.css** (4a–4f) — Rating transition, panel bg, criterion h3, pager, table, notice
5. **interaction-states.css** (5a–5h) — All interaction state updates
6. **animations.css** (6a, 6b) — Updated and new keyframes
7. **pager.js** (7a) — Evaluation-complete status text
8. **evidence.js** (8a) — Principle-specific empty-state text

---

## Verification Checklist

After implementation:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. Visual: Top accent bar transitions color smoothly between sections (Chrome/Edge); snaps cleanly in Firefox (no flicker)
4. Visual: Top accent bar is 5px tall, header starts at 5px from top
5. Visual: Panel title (h1) is visibly larger than section headings (h2)
6. Visual: Active form-section has a 2px bottom border in addition to 8px left border
7. Visual: Active form-section left accent bar "grows" from 6px to 8px on activation (Chrome/Edge)
8. Visual: Active page-index button has 3px inset top shadow, animates in from white (Chrome/Edge)
9. Visual: Rating selection shows brief border-left pulse (2→5→3px), not a static jump to 5px
10. Visual: Completion badge briefly flashes with section tint background when page completes
11. Visual: Questionnaire panel has barely-perceptible off-white background; form-section cards are pure white
12. Visual: Criterion card h3 has a bottom border separator
13. Visual: Pager shell has 2px border and subtle shadow — more visually assertive
14. Visual: Score-table header background is darker; th has 2px bottom border
15. Visual: Notice blocks have stronger red tint and bold text
16. Visual: Field-group focus-within shows section accent left border
17. Functional: On last page with all sections complete, pager shows "Evaluation complete — N sections reviewed"
18. Functional: Evidence empty-state text varies by principle (TR/RE/UC/SE/TC)
19. Reduced-motion: All new animations are killed (existing `prefers-reduced-motion` block handles this)
20. Print: No new animations print; layout unchanged
