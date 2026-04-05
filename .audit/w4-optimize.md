# Wave 4 — Optimize Performance Recommendations

**Date**: 2026-04-05
**Auditor**: impeccable /optimize skill
**Target**: TRUST Framework Questionnaire — `trust-framework.html`, `static/css/` (8 files, 5031 lines), `static/js/` (37+ modules, ~16K lines)
**Scope**: CSS rendering performance, JS runtime performance, state derivation cost, DOM update efficiency, loading strategy
**Previous W3 audit score**: Performance 3.5/4.0 — "Very good — minimal waste, one layout-thrash risk on tab indicator"
**Context**: `.impeccable.md` — 132+ field form SPA, vanilla JS/CSS/HTML, no build step, no framework

---

## Baseline Assessment

### What's Already Excellent — Do NOT Change

These patterns are performance-positive and must be preserved:

1. **Event delegation at questionnaire root** — `field-handlers.js:809-810` attaches a single `input` + `change` listener on `questionnaireRenderRoot`, not per-field. This scales perfectly to 132+ fields.

2. **Document fragment for initial render** — `questionnaire-pages.js:1592` creates a `DocumentFragment`, builds all 13 pages into it, then inserts once via `replaceChildren()`. Zero intermediate DOM mutations.

3. **`will-change: transform` used exactly once** — On `.panel-progress-bar` (`layout.css:110`), the only continuously animated element. No abuse.

4. **`contain: layout style paint` on `.framework-panel`** — `layout.css:274` isolates the context panel's rendering from the questionnaire panel. Correct usage.

5. **GPU-composited animations** — `animations.css` keyframes use only `transform` and `opacity` (`cellFill`, `sectionEnter`, `ratingDotConfirm`, `evidenceItemEnter`). GPU-friendly.

6. **`prefers-reduced-motion` zeroing** — `animations.css:1-22` properly zeroes all durations and disables animations globally.

7. **`font-display: swap`** — Google Fonts URL uses `display=swap`, preventing FOIT.

8. **`<link rel="preconnect">` for fonts** — DNS+TCP warmup for `fonts.googleapis.com` and `fonts.gstatic.com`.

9. **Passive scroll listeners** — Both panel scroll handlers use `{ passive: true }` (`navigation.js:934,958`).

10. **Store equality short-circuit** — `store.js:565-567` returns previous state reference if commit returns same object, skipping notification entirely. Field-level equality (`areNormalizedValuesEqual`) prevents commits when value hasn't changed (`store.js:589`).

11. **`inert` + `aria-hidden` on inactive pages** — Gold standard for SPA page visibility. Inert prevents focus and interaction without removing from DOM.

12. **`requestAnimationFrame` debounce on progress decorations** — `navigation.js:484-489` coalesces rapid state changes into a single frame.

13. **MutationObserver throttle** — `navigation.js:1021-1034` uses `observerPending` flag to coalesce multiple mutations into one rAF callback.

14. **`overscroll-behavior: contain`** — `layout.css:120` prevents scroll chaining from the questionnaire panel to the document.

15. **Zero external runtime dependencies** — No framework overhead, no polyfills, no library initialization cost.

---

## Detailed Analysis

### A. State Derivation Cost — The Core Bottleneck

The most significant performance concern is the **full recomputation architecture** in the state derivation pipeline.

**Call chain on every field change:**

```
User types → handleInput (field-handlers.js:742)
  → store.actions.setFieldValue (store.js:580)
    → normalizeFieldValue (store.js:251)
    → areNormalizedValuesEqual (early exit if same)
    → cloneEvaluation (store.js:412) — deep-clones all evaluation state
    → createStateWithEvaluation (store.js:483)
      → deriveQuestionnaireState (derive/index.js:100) — runs ALL 12+ derivation functions
      → createUiState (store.js:445) — re-creates UI state object
    → notify (store.js:555) — calls ALL subscribers
      → field-handlers subscriber (field-handlers.js:876) — DOM sync
      → navigation subscriber (navigation.js:900) — full shell sync
```

**`deriveQuestionnaireState` execution (derive/index.js:100-178) runs every time:**

| Step | Function                          | Work                                                 | Items Iterated                          |
| ---- | --------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| 1    | `normalizeState`                  | Object wrapping                                      | 5 properties                            |
| 2    | `derivePageStates`                | Iterate pages, check workflow rules                  | 13 pages                                |
| 3    | `deriveCriterionStates`           | Per-criterion: skip resolution, validation           | 15 criteria × ~4 fields = ~60 checks    |
| 4    | `derivePrincipleJudgments`        | Per-principle: score aggregation                     | 5 principles                            |
| 5    | `deriveEvidenceCompleteness`      | Per-criterion evidence check                         | 15 criteria + evaluation evidence       |
| 6    | `deriveCompletionChecklist`       | Build checklist from judgments                       | 5 principles                            |
| 7    | `deriveRecommendationConstraints` | Rule matching                                        | Multiple rules                          |
| 8    | `deriveWorkflowEscalations`       | Rule matching                                        | Escalation rules                        |
| 9    | `deriveFieldStates`               | Per-field: visibility, requirement, validation, skip | **132+ fields**                         |
| 10   | `deriveSectionStates`             | Per-section: aggregation                             | 13 sections                             |
| 11   | `deriveCompletionProgress`        | Per-section: required/answered counts                | 13 sections                             |
| 12   | `deriveOverallCompletion`         | Aggregate                                            | 1 aggregation                           |
| 13   | `deriveValidationSummary`         | Filter fields/criteria/sections for errors           | 132+ fields + 15 criteria + 13 sections |
| 14   | `deriveRequiredFieldIds`          | Filter fields                                        | 132+ fields                             |
| 15   | `deriveMissingRequiredFieldIds`   | Filter fields                                        | 132+ fields                             |

**Total iterations per keystroke**: ~5 passes over 132 fields + ~3 passes over 15 criteria + ~3 passes over 13 sections. Each field pass involves rule evaluation via `matchesCondition` (recursive condition tree walk).

**`cloneEvaluation` (store.js:412-430)** deep-clones:

- `fields` object (132+ keys) — shallow copy
- `sections` object (13 keys) — shallow copy of each record
- `criteria` object (15 keys) — shallow copy of each record
- `evidence.evaluation` array — `normalizeEvidenceItems` + `finalizeEvidenceItemsForInsert` (re-runs normalization on every commit)
- `evidence.criteria` — `cloneEvidenceCriteria` (deep clone)
- `overrides.principleJudgments` — shallow copy

This creates significant GC pressure: on every keystroke in a text field, the entire evaluation state is cloned, then all derived state is recomputed from scratch, then all subscribers are notified.

### B. DOM Update Efficiency

**`field-handlers.js` subscriber (line 876-894):**

```js
store.subscribe(
  (state) => {
    const activeSection = questionnaireRoot.querySelector(`[data-page-id="${activePageId}"]`);
    const scope = activeSection ?? questionnaireRoot;
    toArray(scope.querySelectorAll('.field-group[data-field-id]')).forEach((fieldGroup) => {
      syncFieldGroup(fieldGroup, state);
    });
    syncPageSections(questionnaireRoot, state);
    syncCriterionCards(questionnaireRoot, state);
    syncSectionMetaControls(questionnaireRoot, state);
  },
  { immediate: true },
);
```

This re-syncs **all field groups in the active section** on every state change, even when only one field changed. Each `syncFieldGroup` call (field-handlers.js:427-486):

- Sets 13 `dataset` attributes
- Runs `syncFieldTag` (DOM query + class toggle)
- Runs `syncFieldValidationAccessibility` (DOM query + potential DOM mutation)
- Runs a control-specific sync (DOM query + value comparison + class toggles)

For a typical page with 20 visible field groups, that's:

- 260 `dataset` attribute writes
- 20 `querySelector` calls for tags
- 20 `querySelector` calls for validation elements
- 20 control-specific DOM queries + updates

**`navigation.js` subscriber** (line 900-906) calls `syncFromState` which runs 13 sync functions including `syncPageVisibility` that iterates all page sections and calls `syncPageControlAvailability` which does `querySelectorAll('.rating-scale')` + `querySelectorAll('.rating-option')` per section.

### C. CSS Rendering

**Layout-triggering transitions (still present):**

| File:Line                          | Selector                         | Property                                   | Trigger                                |
| ---------------------------------- | -------------------------------- | ------------------------------------------ | -------------------------------------- |
| `interaction-states.css` (various) | `.form-section`                  | `border-left-width`                        | Layout                                 |
| `interaction-states.css` (various) | `.criterion-card`                | `border-left-width`                        | Layout                                 |
| `animations.css:68-80`             | `@keyframes ratingBorderConfirm` | `border-left-width: 2px → 5px → 3px`       | Layout per frame                       |
| `animations.css:44-54`             | `@keyframes completePulse`       | `border-color`, `background`               | Paint per frame                        |
| `components.css:45-48`             | `.strip-cell`                    | `background`, `border-color`, `box-shadow` | Paint                                  |
| `interaction-states.css` (various) | `.form-section.is-active`        | `border-left-width: 6px → 8px`             | Layout                                 |
| `layout.css:433-436`               | `.sidebar-tab-indicator`         | `transform`, `width`                       | Layout (width) + Composite (transform) |

**Tab indicator layout thrash** (already identified in W3 audit):
`navigation.js:623-624` reads `offsetLeft`/`offsetWidth` then immediately writes `style.transform`/`style.width`. Forces synchronous reflow if not batched.

**`content-visibility` not used** — Hidden pages use `display: none` (via `.is-page-hidden`), which is already optimal. But criterion cards within visible pages could benefit from `content-visibility: auto` with `contain-intrinsic-size` for off-viewport cards.

### D. CSS Containment Audit

| Element                | Current `contain`    | Opportunity                                                   |
| ---------------------- | -------------------- | ------------------------------------------------------------- |
| `.framework-panel`     | `layout style paint` | Already optimal                                               |
| `.questionnaire-panel` | None                 | Low priority — content changes frequently                     |
| `.form-section`        | None                 | MEDIUM — inactive pages use `display:none` (already skipped)  |
| `.criterion-card`      | None                 | LOW — only visible within active page                         |
| `.field-group`         | None                 | LOW — many instances, containment overhead may exceed benefit |

---

## Recommendations

### R1 — Add early-return guard to `field-handlers.js` subscriber for UI-only state changes

- **Priority**: HIGH
- **Description**: The `field-handlers.js` subscriber (line 876) re-syncs all field groups on every state change, including changes that only affect `ui` (page navigation, sidebar toggle, scroll metrics). When the user clicks "Next page", the subscriber unnecessarily iterates all field groups in the now-inactive section.
- **Specifics**: At `field-handlers.js:877`, add a guard:
  ```js
  // Before the querySelectorAll loop:
  if (state.evaluation === previousState?.evaluation) {
    return;
  }
  ```
  The store subscriber already receives `(nextState, previousState)` via `notify` (store.js:555-558). The comparison is a reference check — O(1). When `evaluation` reference hasn't changed (UI-only transition), skip all DOM sync work.
- **File**: `static/js/behavior/field-handlers.js:876-894`
- **Dependencies**: None. The subscriber signature already provides previous state.
- **Estimated impact**: Eliminates ~260 DOM attribute writes + ~60 `querySelector` calls per page navigation, sidebar toggle, and scroll event.

---

### R2 — Skip evidence normalization in `cloneEvaluation` when evidence hasn't changed

- **Priority**: HIGH
- **Description**: `cloneEvaluation` (store.js:412-430) calls `normalizeEvidenceItems` + `finalizeEvidenceItemsForInsert` on the evaluation evidence array and `cloneEvidenceCriteria` on criterion evidence on every single field change. Evidence data is large (potentially multi-file with data URLs) and rarely changes — it only changes via dedicated evidence actions. A text field edit should not re-normalize evidence.
- **Specifics**: In `cloneEvaluation`, accept an optional `{ evidenceChanged }` flag. When `false` (the default for `setFieldValue`, `setSectionValue`, `setCriterionValue`), shallow-copy the evidence references instead of re-normalizing:
  ```js
  evidence: evidenceChanged
    ? { evaluation: finalizeEvidenceItemsForInsert(normalizeEvidenceItems(...)), criteria: cloneEvidenceCriteria(...) }
    : { ...(evaluation.evidence ?? {}) }
  ```
  Only evidence actions (`addEvaluationEvidenceItems`, etc.) should pass `evidenceChanged: true`.
- **File**: `static/js/state/store.js:412-430`, all commit updaters in store.js
- **Dependencies**: None. Internal API change only.
- **Estimated impact**: Eliminates evidence array normalization + deep cloning on every text field keystroke. Evidence items can contain data URLs (base64 images) — re-processing these is the single most expensive GC allocation per keystroke.

---

### R3 — Add `requestAnimationFrame` wrapper around tab indicator layout read/write

- **Priority**: MEDIUM
- **Description**: `navigation.js:617-625` (`updateTabIndicator`) reads `activeButton.offsetLeft` and `activeButton.offsetWidth` (forced layout) then immediately writes `style.transform` and `style.width`. This forces a synchronous reflow. While this function is called once per tab switch (not a hot path), it's the only forced-layout read/write in the codebase and was flagged in W3 P2.6.
- **Specifics**: Wrap the style writes in `requestAnimationFrame`:
  ```js
  const updateTabIndicator = (activeTab) => {
    if (!dom.tabIndicator || !dom.tabBar) return;
    const activeButton = dom.tabBar.querySelector(`[data-sidebar-tab="${activeTab}"]`);
    if (!activeButton) return;
    const left = activeButton.offsetLeft;
    const width = activeButton.offsetWidth;
    windowRef.requestAnimationFrame(() => {
      dom.tabIndicator.style.transform = `translateX(${left}px)`;
      dom.tabIndicator.style.width = `${width}px`;
    });
  };
  ```
- **File**: `static/js/behavior/navigation.js:617-625`
- **Dependencies**: None.
- **Estimated impact**: Eliminates the only forced synchronous reflow in the codebase. Cosmetic — tab indicator update is already fast.

---

### R4 — Remove `border-left-width` from CSS transition lists

- **Priority**: MEDIUM
- **Description**: Several selectors transition `border-left-width` — a layout-triggering property that forces the browser to recalculate layout for every frame of the transition. The affected selectors are in `interaction-states.css` (`.form-section`, `.criterion-card` transitions that include `border-left-width`). When a page becomes active, the `border-left-width` change from 6px to 8px triggers layout recalculation on the entire form section.
- **Specifics**: In `interaction-states.css`, remove `border-left-width` from transition property lists on `.form-section` and `.criterion-card`. The width change should be instant (not animated) — the visual transition is already handled by opacity and background changes. Keep the `border-left-width` declaration itself, just don't transition it.
- **File**: `static/css/interaction-states.css` — transition declarations on `.doc-section, .form-section` and `.criterion-card`
- **Dependencies**: None. Visual change is imperceptible — the width snaps instead of animating over 150ms.
- **Estimated impact**: Eliminates layout recalculation during page transitions and criterion focus changes. Affects every page transition in the app.

---

### R5 — Replace `border-left-width` animation in `ratingBorderConfirm` with `box-shadow`

- **Priority**: MEDIUM
- **Description**: `animations.css:68-80` defines `ratingBorderConfirm` which animates `border-left-width` from 2px → 5px → 3px over 200ms. This triggers layout recalculation on every animation frame. When a user clicks a rating, this animation fires simultaneously on the `.rating-option` element, compounding with any `border-left-width` transition on the parent `.criterion-card`.
- **Specifics**: Replace the keyframe animation with a `box-shadow` inset animation (composited property):
  ```css
  @keyframes ratingBorderConfirm {
    0% {
      box-shadow: inset 2px 0 0 0 currentColor;
    }
    40% {
      box-shadow: inset 5px 0 0 0 currentColor;
    }
    100% {
      box-shadow: inset 3px 0 0 0 currentColor;
    }
  }
  ```
  Alternatively, use `transform: scaleX()` on a pseudo-element for a fully GPU-composited animation. The minimum fix is to remove `border-left-width` from the animation and accept an instant snap.
- **File**: `static/css/animations.css:68-80`
- **Dependencies**: None. The visual pulse effect is preserved with `box-shadow`.
- **Estimated impact**: Eliminates per-frame layout recalculation during rating selection.

---

### R6 — Avoid full field re-sync when only one field changed

- **Priority**: MEDIUM
- **Description**: When the user types in a text field, `handleInput` → `store.actions.setFieldValue` → subscriber → `syncFieldGroup` runs on ALL field groups in the active section. For a page with 20 visible fields, this means 20 full field sync cycles (each setting 13 dataset attributes + querying DOM) when only one field's value actually changed.
- **Specifics**: In the `field-handlers.js` subscriber, compare `state.derived.fieldStates.byId` against `previousState.derived.fieldStates.byId` to identify which fields actually changed state. Only call `syncFieldGroup` for those fields. Fall back to full sync if the comparison is not feasible (e.g., first render).

  Alternatively (simpler): track the last-changed `fieldId` from the event handler and only sync that field group in the subscriber, with a periodic full sync on page change.

- **File**: `static/js/behavior/field-handlers.js:876-894`
- **Dependencies**: R1 (the early-return guard) should be implemented first, as it handles the easier case (UI-only changes). This recommendation handles the harder case (field changes that do need sync, but not for all fields).
- **Estimated impact**: Reduces per-keystroke DOM work from O(n) fields to O(1) field, where n is typically 10-30 visible fields per page.

---

### R7 — Add `contain: layout style paint` to `.framework-panel` (already done — verify)

- **Priority**: LOW
- **Description**: W3 audit (P3.5) noted that `contain: layout style paint` on `.framework-panel` (`layout.css:274`) may clip focus outlines. The containment is already present and correct. The W3 audit flagged a theoretical concern about absolutely positioned elements near the panel boundary being clipped.
- **Specifics**: Verify that focus outlines on elements near the top/bottom edges of the context panel are not clipped. If they are, downgrade to `contain: layout paint` (removing `style` containment). No action needed if no clipping is observed.
- **File**: `static/css/layout.css:274`
- **Dependencies**: None.
- **Estimated impact**: Already implemented. Verification only.

---

### R8 — Remove `backdrop-filter` if still present

- **Priority**: HIGH
- **Description**: W3 audit confirmed `backdrop-filter: blur(2px)` was removed from `.shell-surface`. Verify this hasn't been re-introduced. `backdrop-filter` is the single most expensive CSS property — it forces per-pixel compositing on the entire element area every frame.
- **Specifics**: Run `grep -r "backdrop-filter" static/css/` — expect zero results.
- **File**: All CSS files
- **Dependencies**: None.
- **Estimated impact**: Verification only. If present, removal eliminates per-frame compositing overhead.

---

### R9 — Cache `querySelectorAll` results in field-handlers subscriber

- **Priority**: LOW
- **Description**: `field-handlers.js` subscriber calls `scope.querySelectorAll('.field-group[data-field-id]')` on every state change. The result set doesn't change between state updates (only field values change, not the DOM structure). The MutationObserver in `navigation.js` already handles structural changes by calling `refreshPageSections`.
- **Specifics**: Cache the `querySelectorAll` result and invalidate when the MutationObserver fires. Store as `let cachedFieldGroups = null;` at module scope, populate on first subscriber call and after MutationObserver triggers. This trades memory (holding ~20 element references) for reduced DOM traversal.
- **File**: `static/js/behavior/field-handlers.js:876-894`
- **Dependencies**: R1 (early-return guard) reduces the need for this optimization significantly. Only pursue if R1 is insufficient.
- **Estimated impact**: Eliminates one `querySelectorAll` traversal per keystroke. Marginal — `querySelectorAll` with a class+attribute selector on ~100 elements is already sub-millisecond.

---

### R10 — Consider memoizing `deriveFieldStates` with input comparison

- **Priority**: LOW
- **Description**: `deriveFieldStates` (fields.js) iterates all 132+ fields and runs visibility rules, requirement rules, validation rules, and skip logic for each. This is the most expensive single derivation. If the field values haven't changed (e.g., only `ui` state changed), the output is identical. A simple reference equality check on `state.fields` could short-circuit the entire derivation.
- **Specifics**: In `derive/index.js:129`, add a check:
  ```js
  const fieldStates = previousFieldStates && state.fields === previousFields
    ? previousFieldStates
    : deriveFieldStates(state, { ... });
  ```
  This requires the main `deriveQuestionnaireState` function to accept and return a `previousDerivation` context for memoization.
- **File**: `static/js/state/derive/index.js:100-178`, `static/js/state/derive/fields.js`
- **Dependencies**: Significant architectural change. Only pursue if profiling shows derivation is a bottleneck. With only 132 fields and simple rule evaluation, the total derivation time is likely under 2ms — below the perceptual threshold.
- **Estimated impact**: Could reduce derivation time by ~60% for UI-only state changes. Marginal for field changes (derivation is still needed).

---

### R11 — Remove `font-weight: 800` from Google Fonts URL if not used

- **Priority**: HIGH
- **Description**: `trust-framework.html:9` loads `Inter:wght@400;700;800`. Weight 800 may not be used in any screen CSS. If unused, this downloads ~15-20KB of unnecessary font data.
- **Specifics**: Change the Google Fonts URL from `Inter:wght@400;700;800` to `Inter:wght@400;700`. Verify no screen CSS uses `font-weight: 800` (the W3 audit noted two instances in `components.css` that were flagged as regressions).
- **File**: `trust-framework.html:9`
- **Dependencies**: Coordinate with `/normalize` to ensure the two `font-weight: 800` instances in `components.css` are changed to 700.
- **Estimated impact**: Eliminates ~15-20KB of unused font data download.

---

### R12 — Consider `content-visibility: auto` for criterion cards below the fold

- **Priority**: LOW
- **Description**: Pages with many criteria (TR, RE, UC, SE, TC each have 3 criteria = 3 criterion cards) could benefit from `content-visibility: auto` on `.criterion-card` elements that are below the viewport. This allows the browser to skip layout/paint for off-screen cards. With `contain-intrinsic-size: auto 200px`, the browser reserves space to prevent layout shift.
- **Specifics**: Add to `components.css` or `layout.css`:
  ```css
  .criterion-card {
    content-visibility: auto;
    contain-intrinsic-size: auto 200px;
  }
  ```
- **File**: `static/css/components.css` (criterion-card section)
- **Dependencies**: None. `content-visibility: auto` is progressive enhancement — browsers that don't support it render normally.
- **Estimated impact**: Skips layout/paint for off-screen criterion cards. With 3-5 cards per page and only 1-2 typically visible, this could reduce initial page render cost by 30-50%. However, since pages are rendered via document fragment and then shown/hidden with `display:none`, the benefit is limited to the active page's below-fold content.

---

### R13 — Add `contain-intrinsic-size` to `.page-index-column` for sticky positioning optimization

- **Priority**: LOW
- **Description**: `.page-index-column` uses `position: sticky; top: 0` (`layout.css:376-379`). Sticky elements require the browser to track scroll position for containment recalculation. Adding `contain: layout style` would help, but may interfere with sticky positioning. Instead, ensuring the column has a fixed width (it does: `minmax(13rem, 16rem)`) prevents layout shift.
- **Specifics**: No action needed. The current implementation is already efficient — the sticky column has a constrained width and doesn't change size during scroll.
- **File**: N/A
- **Dependencies**: None.

---

## Priority Summary

| ID  | Priority | Category | Effort  | Description                                                       | Impact                                                               |
| --- | -------- | -------- | ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| R1  | HIGH     | JS       | Small   | Early-return guard in field-handlers subscriber                   | Eliminates ~260 DOM writes per UI-only change                        |
| R2  | HIGH     | JS       | Medium  | Skip evidence normalization on non-evidence changes               | Eliminates largest GC allocation per keystroke                       |
| R8  | HIGH     | CSS      | Trivial | Verify no `backdrop-filter` in CSS                                | Verification — eliminates per-frame compositing if present           |
| R11 | HIGH     | Loading  | Trivial | Remove `font-weight: 800` from Google Fonts                       | ~15-20KB less font data                                              |
| R3  | MEDIUM   | JS       | Trivial | rAF wrapper on tab indicator reads/writes                         | Eliminates only forced reflow                                        |
| R4  | MEDIUM   | CSS      | Small   | Remove `border-left-width` from transition lists                  | Eliminates layout recalc on page transitions                         |
| R5  | MEDIUM   | CSS      | Small   | Replace `border-left-width` animation with `box-shadow`           | Eliminates layout recalc on rating selection                         |
| R6  | MEDIUM   | JS       | Medium  | Selective field re-sync instead of full section sync              | Reduces per-keystroke DOM work from O(n) to O(1)                     |
| R7  | LOW      | CSS      | None    | Verify `.framework-panel` containment doesn't clip focus outlines | Already implemented                                                  |
| R9  | LOW      | JS       | Small   | Cache `querySelectorAll` results in subscriber                    | Marginal — sub-ms savings                                            |
| R10 | LOW      | JS       | Large   | Memoize `deriveFieldStates` with input comparison                 | ~60% derivation reduction for UI changes, marginal for field changes |
| R12 | LOW      | CSS      | Trivial | `content-visibility: auto` on criterion cards                     | Skips layout/paint for below-fold cards                              |
| R13 | LOW      | CSS      | None    | Page index column already efficient                               | No action needed                                                     |

---

## Execution Order

1. **R8 + R11** — Verification and trivial HTML edit. Zero risk.
2. **R1** — Early-return guard in field-handlers. Small change, high impact on page navigation performance.
3. **R2** — Skip evidence normalization. Medium effort, eliminates biggest per-keystroke allocation.
4. **R4 + R5** — CSS layout-thrash fixes. Remove `border-left-width` from transitions and animations.
5. **R3** — rAF wrapper on tab indicator. Trivial.
6. **R6** — Selective field re-sync. Medium effort, builds on R1's pattern.
7. **R12** — `content-visibility` on criterion cards. Progressive enhancement, zero risk.
8. **R9, R10, R13** — Only if profiling indicates need.

---

## Verification

After implementing:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. **Chrome DevTools → Performance tab**: Record a typing session in a text field. Verify:
   - No layout shifts (purple bars) during typing
   - No forced synchronous layouts (yellow triangles with red border)
   - Total scripting time per keystroke < 5ms
4. **Chrome DevTools → Performance tab**: Record a page transition. Verify:
   - No layout recalculation during transition
   - No paint spikes from `border-left-width` animation
5. **Chrome DevTools → Layers panel**: Verify no unexpected compositing layers
6. **Network tab**: Google Fonts request no longer includes `800` weight
7. **grep**: Zero `backdrop-filter` in `static/css/`
8. **grep**: Zero `transition.*border-left-width` in `static/css/` (except `print.css` overrides)
9. **grep**: Zero `border-left-width` inside `@keyframes` (except `print.css` overrides)
10. **Visual**: Page transitions remain smooth
11. **Visual**: Rating selection pulse still perceptible
12. **Visual**: All field values persist correctly after navigation
13. **Visual**: Evidence items still render correctly after field edits

---

## Architecture Note: When to Pursue R10 (Derivation Memoization)

The current derivation architecture is simple and correct: recompute everything from scratch on every change. For a 132-field form with 15 criteria and 13 sections, the total iteration count per keystroke is ~800-1000 simple operations (equality checks, rule evaluations, property reads). On modern hardware, this completes in 1-3ms — well within the 16ms frame budget.

R10 (memoization) should only be pursued if:

- Profiling shows derivation time > 5ms consistently
- The form grows significantly beyond 132 fields
- Evidence items grow to dozens of large data URLs
- The app is used on low-powered devices (tablets, old laptops)

The current simplicity is a feature — full recomputation guarantees correctness without cache invalidation bugs.

---

_End of Wave 4 Optimize Report_
