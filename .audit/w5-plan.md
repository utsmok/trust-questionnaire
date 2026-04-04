# Wave 5 — Final Wave Unified Implementation Plan

**Sources**: w5-polish.md, w5-adapt.md
**Cross-reference**: w1-plan.md, w2-plan.md, w3-plan.md, w4-plan.md (all implemented)
**Date**: 2026-04-04
**Scope**: This is the FINAL wave. Only genuine issues — no cosmetic nits.

---

## Conflict Resolutions

| Conflict                                                                                                                                                                                 | Resolution                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Polish R1** changes rating focus outline from `var(--ut-blue)` to `var(--focus-ring)`; **Polish R2** (LOW) discusses whether strip-cell `.is-active` outline conflicts with focus ring | R1 is MEDIUM — apply. R2 is LOW and notes "this may be intentional" — defer (no change). The `.is-active` outline is a selection indicator, not a focus ring. They serve different purposes.                                       |
| **Adapt R1** reduces header-inner padding at 1160px; **Adapt R11** fixes `header-progress-summary` min-width at 1160px                                                                   | No conflict — both target different properties within the same media query. Apply both.                                                                                                                                            |
| **Adapt R5** raises evidence buttons to 44px; **w4-plan 5o** already claims evidence buttons were raised to 44px                                                                         | **Revert check needed.** w4-plan 5o changed `min-height: 36px` → `44px` on evidence buttons. The current file at line 722 still shows `min-height: 36px`. This means w4-plan 5o was NOT applied, or was reverted. Apply again now. |
| **Polish R3** (LOW) aligns pager disabled opacity to 0.55; **Adapt R5/R6/R7** raise touch targets to 44px                                                                                | No conflict — different properties (opacity vs min-height). R3 is LOW, defer.                                                                                                                                                      |
| **Polish R9** (LOW) tokenizes `ul, ol` spacing; **Adapt R10** (LOW) adds text-overflow to panel-title                                                                                    | No conflict — different selectors. Both LOW, both genuine micro-improvements. Include both since this is the final wave.                                                                                                           |
| **Polish R12** (LOW) aligns `.context-route-title` line-height to `var(--lh-sub)`; w4-plan **5u** already changed `reference-drawer-title` line-height to `var(--lh-sub)`                | No conflict — different selectors (`.context-route-title` vs `.reference-drawer-title`). Apply.                                                                                                                                    |

---

## Waves 1-4 Cross-Reference: Do NOT Revert

These changes are already in the codebase and must be preserved:

- **w1**: All `font-weight: 800` → `700`, letter-spacing → tokens, h3 font-family, `.context-route-title` ls, surface exit animations, `.small` class removed, font rendering properties
- **w2**: `@property --top-accent-color`, accent-scoping, top-accent 5px, text scale tokens, `ratingBorderConfirm` keyframe (box-shadow rewrite from w4), `completePulse`, `.field-group:focus-within` border, principle evidence hints
- **w3**: Identified regressions that w4 fixed (font-weight 800 in `.subhead`/governance/print, font import 800, skip-link z-index)
- **w4**: Header grid restructure, brand/nav compression, `--header-h` 118/168px, backdrop-filter removed, `contain` on framework-panel, focus traps (evidence lightbox, about/help, confirm dialog), inert on surfaces during drawer, `.validation-message` CSS, all normalize/copy/arrange changes

**w4 deferred items NOT carried forward** (D1–D12): Per w4-plan, these remain deferred and are out of scope for this final wave.

---

## Recommendations Included

Only HIGH and MEDIUM items, plus LOW items that are trivially safe for a final pass:

| ID         | Source | Priority | Action                                         | Include?                    |
| ---------- | ------ | -------- | ---------------------------------------------- | --------------------------- |
| Polish R1  | polish | MEDIUM   | Rating focus outline → token                   | YES                         |
| Polish R3  | polish | LOW      | Pager disabled opacity align                   | NO — cosmetic only          |
| Polish R4  | polish | LOW      | Tag border-color align                         | NO — may be intentional     |
| Polish R5  | polish | LOW      | `.impeccable.md` doc color fix                 | NO — documentation only     |
| Polish R9  | polish | LOW      | `ul, ol` spacing tokenization                  | YES — trivial               |
| Polish R10 | polish | LOW      | Pager `:active` state                          | YES — trivial               |
| Polish R12 | polish | LOW      | `.context-route-title` line-height             | YES — trivial               |
| Adapt R1   | adapt  | MEDIUM   | Header padding at 1160px                       | YES                         |
| Adapt R2   | adapt  | HIGH     | Drawer mode visual indicator on Context button | YES                         |
| Adapt R3   | adapt  | MEDIUM   | Hide duplicate Context button at 760px         | YES                         |
| Adapt R4   | adapt  | MEDIUM   | Force single-col field-grid at 760px           | YES                         |
| Adapt R5   | adapt  | HIGH     | Evidence buttons → 44px touch target           | YES                         |
| Adapt R6   | adapt  | MEDIUM   | Context/pin buttons → 44px touch target        | YES                         |
| Adapt R7   | adapt  | MEDIUM   | Evidence select/file → 44px touch target       | YES                         |
| Adapt R8   | adapt  | HIGH     | Score-table overflow at 760px                  | YES                         |
| Adapt R10  | adapt  | LOW      | Panel-title text-overflow ellipsis             | YES — trivial               |
| Adapt R11  | adapt  | MEDIUM   | Header-progress-summary min-width at 1160px    | Already fixed at line 1492! |

**Note on Adapt R11**: The file already has `min-width: 0` at line 1492 inside the `@media (max-width: 1160px)` block. This fix was already applied (likely by w4). **No change needed — exclude from plan.**

---

## Implementation Changes — By File

CSS load order: `tokens.css` → `base.css` → `layout.css` → `components.css` → `accent-scoping.css` → `interaction-states.css` → `animations.css` → `print.css`

---

### 1. `static/css/interaction-states.css`

#### 1a. Rating focus outline — use global token (Polish R1 — MEDIUM)

**Line 775**:

```
OLD:   outline: 2px solid var(--ut-blue);
NEW:   outline: var(--focus-ring-width) solid var(--focus-ring);
```

#### 1b. Pager disabled opacity alignment (Polish R3 — LOW, included as final-wave cleanup)

**Line 1009**:

```
OLD:   opacity: 0.45;
NEW:   opacity: 0.55;
```

#### 1c. Add pager-button `:active` state (Polish R10 — LOW)

**After line 1011** (after `.pager-button:disabled` closing brace):

```
ADD:
.pager-button:active {
  background: color-mix(in srgb, var(--ut-grey) 80%, var(--ut-border));
}
```

This mirrors `.nav-button:active` at line 49.

---

### 2. `static/css/components.css`

#### 2a. Evidence buttons → 44px min-height (Adapt R5 — HIGH)

**Line 722**:

```
OLD:   min-height: 36px;
NEW:   min-height: 44px;
```

#### 2b. Evidence disabled opacity — keep at 0.6 (no change)

The evidence disabled controls at line 762 use `opacity: 0.6`. This is a separate category from navigation buttons. Leave as-is.

#### 2c. Context/pin/reference buttons → 44px min-height (Adapt R6 — MEDIUM)

**Line 1164**:

```
OLD:   min-height: 36px;
NEW:   min-height: 44px;
```

#### 2d. Evidence select/file inputs → 44px min-height (Adapt R7 — MEDIUM)

**Line 677**:

```
OLD:   min-height: 38px;
NEW:   min-height: 44px;
```

#### 2e. `.context-route-title` line-height → token (Polish R12 — LOW)

**Line 1128**:

```
OLD:   line-height: 1.25;
NEW:   line-height: var(--lh-sub);
```

#### 2f. `.display-tag` border-color alignment (Polish R4 — LOW)

**Line 330**:

```
OLD:   border: 1px solid var(--neutral-200);
NEW:   border: 1px solid var(--neutral-400);
```

Rationale: Both `.condition-tag` and `.display-tag` appear adjacent in the UI with identical structure. The visual difference from `neutral-200` vs `neutral-400` is unintentional noise. Align to the stronger value.

#### 2g. Force single-column field-grid at 760px (Adapt R4 — MEDIUM)

**Inside the `@media (max-width: 760px)` block at line 974-994**, after the `.evidence-intake-grid` rule (before the closing `}` at line 994), add:

```
  .field-grid {
    grid-template-columns: 1fr;
  }
```

#### 2h. Score-table horizontal overflow at 760px (Adapt R8 — HIGH)

**Inside the same `@media (max-width: 760px)` block at line 974-994**, add:

```
  .score-table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
```

---

### 3. `static/css/layout.css`

#### 3a. Reduce header-inner padding at 1160px (Adapt R1 — MEDIUM)

**Inside the `@media (max-width: 1160px)` block at line 486-511**, add after `.panel` rule (after line 493):

```
  .header-inner {
    padding-inline: 18px;
  }
```

Using 18px (between the 24px default and 16px mobile) for the 1160-760px range.

#### 3b. Panel-title text-overflow ellipsis (Adapt R10 — LOW)

**After line 150** (inside `.panel-title-row .panel-title` rule), add:

```
OLD:
.panel-title-row .panel-title {
  flex: 1 1 auto;
  min-width: 0;
  margin-bottom: 0;
}
NEW:
.panel-title-row .panel-title {
  flex: 1 1 auto;
  min-width: 0;
  margin-bottom: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### 3c. Hide duplicate Context toolbar at 760px (Adapt R3 — MEDIUM)

**Inside the `@media (max-width: 760px)` block at line 513**, after `.shell-toolbar { width: 100%; }` (line 518-520), add:

```
  .questionnaire-panel .shell-toolbar {
    display: none;
  }
```

---

### 4. `static/css/base.css`

#### 4a. Tokenize `ul, ol` spacing (Polish R9 — LOW)

**Line 93-94**:

```
OLD:   margin: 10px 0 0;
      padding-left: 20px;
NEW:   margin: var(--space-3) 0 0;
      padding-left: var(--space-5);
```

`--space-3` = 12px (close to 10px, standardizes), `--space-5` = 20px (exact match).

---

### 5. `static/css/print.css`

#### 5a. Add `size: A4` to `@page` rule (Adapt R12 — LOW)

**Lines 5-7**:

```
OLD:   @page {
      margin: 1.5cm;
    }
NEW:   @page {
      margin: 1.5cm;
      size: A4;
    }
```

---

### 6. `static/js/behavior/navigation.js`

#### 6a. Add drawer indicator to Context button text (Adapt R2 — HIGH)

In the function that manages drawer mode (around the `matchMedia('(max-width: 1160px)')` listener at line 234), when setting `isContextDrawerMode` to true, update the Context toggle button text:

Find the Context toggle button (the `.nav-button[data-surface-toggle='contextSidebar']`) and append a visual indicator when in drawer mode.

**Approach**: In the `matchMedia` callback where `isContextDrawerMode` is set, add logic to update the button label:

```js
// After setting isContextDrawerMode = true:
const contextBtn = document.querySelector('.nav-button[data-surface-toggle="contextSidebar"]');
if (contextBtn) {
  contextBtn.setAttribute('aria-label', 'Open context drawer');
}

// After setting isContextDrawerMode = false:
const contextBtn = document.querySelector('.nav-button[data-surface-toggle="contextSidebar"]');
if (contextBtn) {
  contextBtn.setAttribute('aria-label', 'Toggle context panel');
}
```

Additionally, add a CSS-only visual indicator in layout.css. This is a companion to the JS `aria-label` change. Add inside the `@media (max-width: 1160px)` block in `layout.css` (at section 3 above):

**Inside the `@media (max-width: 1160px)` block**, also add:

```css
.shell-layout.is-context-drawer-mode:not(.is-context-drawer-open)
  .nav-button[data-surface-toggle='contextSidebar']::after {
  content: '\25B8';
  margin-left: 4px;
  font-size: var(--text-xs);
}
```

This adds a small `▸` triangle after the button text when the drawer is closed, signaling it opens a panel. When the drawer is open (`.is-context-drawer-open` is present), the indicator disappears.

---

## Implementation Order

### Batch 1: CSS touch targets and overflow (~10 min)

1. `interaction-states.css`: 1a (rating focus token), 1b (pager disabled opacity), 1c (pager active state)
2. `components.css`: 2a (evidence buttons 44px), 2c (context/pin 44px), 2d (evidence select/file 44px)
3. Run `npm run validate:html && npm run test:e2e`

### Batch 2: Responsive layout (~10 min)

4. `layout.css`: 3a (header padding 1160px), 3b (panel-title ellipsis), 3c (hide duplicate toolbar 760px)
5. `components.css`: 2g (field-grid single-col), 2h (score-table overflow)
6. Run `npm run validate:html && npm run test:e2e`

### Batch 3: Polish + drawer indicator (~10 min)

7. `components.css`: 2e (context-route-title line-height), 2f (display-tag border)
8. `base.css`: 4a (ul/ol spacing)
9. `print.css`: 5a (A4 size)
10. `layout.css`: CSS companion for 6a (drawer indicator `::after`)
11. `navigation.js`: 6a (aria-label update for drawer mode)
12. Run `npm run validate:html && npm run test:e2e`

---

## Change Count Summary

| File                     | Changes                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `interaction-states.css` | 3 edits (rating focus, pager opacity, pager active)                                                                                             |
| `components.css`         | 6 edits (evidence buttons 44px, context/pin 44px, select/file 44px, line-height token, tag border, field-grid single-col, score-table overflow) |
| `layout.css`             | 4 edits (header padding, panel-title ellipsis, hide toolbar, drawer indicator CSS)                                                              |
| `base.css`               | 1 edit (ul/ol spacing)                                                                                                                          |
| `print.css`              | 1 edit (A4 size)                                                                                                                                |
| `navigation.js`          | 1 edit (aria-label for drawer mode)                                                                                                             |
| **Total**                | **~16 discrete edits across 6 files**                                                                                                           |

---

## Verification Checklist

After implementation:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. Grep: `var(--focus-ring-width) solid var(--focus-ring)` in interaction-states.css line 775 (confirmed)
4. Grep: `.pager-button:active` exists in interaction-states.css (confirmed)
5. Grep: `opacity: 0.55` on `.pager-button:disabled` (confirmed)
6. Grep: `min-height: 44px` on `.evidence-button` rule (confirmed)
7. Grep: `min-height: 44px` on `.context-pin-button` rule (confirmed)
8. Grep: `min-height: 44px` on `.evidence-select` rule (confirmed)
9. Grep: `grid-template-columns: 1fr` inside `@media (max-width: 760px)` for `.field-grid` (confirmed)
10. Grep: `overflow-x: auto` inside `@media (max-width: 760px)` for `.score-table` (confirmed)
11. Grep: `padding-inline: 18px` inside `@media (max-width: 1160px)` for `.header-inner` (confirmed)
12. Grep: `display: none` inside `@media (max-width: 760px)` for `.questionnaire-panel .shell-toolbar` (confirmed)
13. Grep: `text-overflow: ellipsis` on `.panel-title-row .panel-title` (confirmed)
14. Grep: `size: A4` in print.css (confirmed)
15. Grep: `line-height: var(--lh-sub)` on `.context-route-title` (confirmed)
16. Grep: `border: 1px solid var(--neutral-400)` on `.display-tag` (confirmed)
17. Grep: `margin: var(--space-3) 0 0` on `ul, ol` (confirmed)
18. Visual: resize to 1150px — header padding tightens, drawer `▸` appears on Context button
19. Visual: resize to 750px — field-grid is single column, duplicate Context button hidden, score-table scrollable
20. Visual: click pager buttons — `:active` background feedback present
21. Visual: rating option receives keyboard focus — focus ring matches global pattern
22. Touch: evidence buttons, context/pin buttons, select/file inputs all ≥ 44px min-height
23. Accessibility: Context button has updated aria-label in drawer mode
