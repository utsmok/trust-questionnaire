# Wave 4 — Unified Implementation Plan

**Date**: 2026-04-05
**Sources**: w4-arrange.md, w4-normalize.md, w4-clarify.md, w4-optimize.md, w4-harden.md
**Prior waves**: w1-plan.md (typography/color/animation), w2-plan.md (delight/bolder/overdrive), w3-plan.md (diagnostic)
**Total raw findings**: 69 across 5 reports
**After dedup**: 47 actionable changes
**Deferred to W5**: 16 items (see §4)

---

## 1. Deduplication Map

Findings that describe the same issue across multiple reports:

| Unified ID | Sources Merged                            | Description                                                                            |
| ---------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| T1         | Arrange R1 + Normalize R12                | Add --space-1-5/2-5/3-5 tokens + document half-step rationale                          |
| T2         | Arrange R2 + Arrange R10                  | Tokenize all raw gap/margin values (12px→--space-3, 18px→--space-4-5, 24px→--space-6)  |
| T3         | Arrange R5 + Arrange R6                   | Tokenize all raw padding in panel-inner, header-inner, sidebar-tab, form-section tiers |
| T4         | Normalize R4 + Normalize R7 + W3-plan A-2 | Increase --ut-offwhite; make --ut-panel-bg an alias                                    |
| T5         | Normalize R2 + Harden R4                  | Move help-panel.js inline styles to CSS classes                                        |
| T6         | Arrange R4 + Normalize R10                | Remove pager-shell box-shadow (flat design principle)                                  |
| T7         | Clarify R3 + Clarify R12                  | "Section notes / comments" → "Section notes"; keeps bare-noun pattern                  |
| T8         | Harden R5 + Harden R14                    | Field-label overflow + tag min-width:0 (combined CSS edit)                             |
| T9         | Optimize R4 + Optimize R5                 | Remove border-left-width from transitions AND animations                               |
| T10        | Clarify R8 + W3-plan H-3                  | Help panel missing pager shortcuts — depends on keyboard.js feature work               |
| T11        | Harden R1 + W3-plan H-1                   | Pre-declare aria-live regions in static HTML                                           |
| T12        | Harden R15 + W3-plan H-6                  | Evidence item removal confirmation dialog                                              |

---

## 2. Conflict Resolutions

| Conflict                                                                        | Resolution                                                                                                                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normalize R10 says "document or replace" pager-shadow; Arrange R4 says "remove" | **Remove** — the `.impeccable.md` says "No soft shadows — flat with border delineation." The 2px solid border-bottom already provides grounding emphasis. |
| Normalize R1 wants `--ease-out-quart` on accent-bar; current uses raw `ease`    | Use `var(--duration-accent) var(--ease-out-quart)` — system consistency. The easing difference is marginal.                                               |
| Normalize R4 options (a) push --ut-offwhite or (b) pull --ut-grey               | **Push --ut-offwhite to #f7f8fa** — darker canvas would shift too many surface relationships; lighter offwhite widens the gap safely.                     |
| Clarify R8 wants pager shortcuts in help table; no shortcuts exist yet          | **Defer to W5** — feature addition, not a fix. Help table accurately reflects reality.                                                                    |
| Optimize R6 wants selective field re-sync                                       | **Defer to W5** — medium effort, requires careful regression testing. R1's early-return guard handles the easier case.                                    |

---

## 3. Already Resolved

These findings are already fixed in the current codebase:

| Source    | ID  | Issue                                  | Evidence                                                                  |
| --------- | --- | -------------------------------------- | ------------------------------------------------------------------------- |
| Optimize  | R8  | `backdrop-filter` in CSS               | Grep confirms zero results in `static/css/`                               |
| Optimize  | R11 | `font-weight: 800` in Google Fonts URL | `trust-framework.html:9` shows `Inter:wght@400;700` — 800 already removed |
| Normalize | R11 | `.tooltip-trigger-btn` border-radius   | Current code uses `var(--radius-md)` (2px), not 50%                       |

---

## 4. Deferred to Wave 5 (Polish)

These items are valid but better suited for a polish pass:

| ID    | Source       | Description                                             | Reason                                                                         |
| ----- | ------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| W5-1  | Optimize R6  | Selective field re-sync (O(1) per keystroke)            | Medium effort, needs regression testing across all field types                 |
| W5-2  | Optimize R9  | Cache `querySelectorAll` in field-handlers subscriber   | Marginal improvement; depends on R1 guard being insufficient                   |
| W5-3  | Optimize R10 | Memoize `deriveFieldStates` with input comparison       | Large architectural change; current derivation is ~2ms                         |
| W5-4  | Optimize R12 | `content-visibility: auto` on criterion cards           | Progressive enhancement; limited benefit since hidden pages use `display:none` |
| W5-5  | Harden R13   | `aria-describedby` linking field help to controls       | Medium effort; touches field rendering pipeline across multiple modules        |
| W5-6  | Clarify R8   | Help panel keyboard shortcuts table missing pager entry | Depends on implementing Alt+Left/Right in `keyboard.js`                        |
| W5-7  | W3-plan H-3  | Alt+Left/Right pager keyboard shortcuts                 | Feature addition, not a fix                                                    |
| W5-8  | W3-plan H-4  | Alt+J jump-to-first-incomplete shortcut                 | Feature addition                                                               |
| W5-9  | W3-plan H-5  | Number-key input for rating scales                      | Feature addition; needs focus-context logic                                    |
| W5-10 | W3-plan H-2  | Native `<label>` on dynamically rendered fields         | Medium effort; current `aria-labelledby` is WCAG-compliant                     |
| W5-11 | Arrange R7   | Pager center column squeeze at narrow widths            | Minor; cap at 14rem would help but not urgent                                  |
| W5-12 | Arrange R8   | Tooltip dark background discontinuity                   | Design decision; Option B (light bg with navy border) is deferred              |
| W5-13 | Arrange R9   | Evidence intake grid intermediate breakpoint            | Minor; two-column at 960px would help laptop users                             |
| W5-14 | Clarify R6   | Evidence reusable placeholder differentiation           | LOW priority; functional as-is                                                 |
| W5-15 | Clarify R15  | Criterion/Summary focus kicker labels                   | LOW priority cosmetic                                                          |
| W5-16 | Clarify R16  | "Page overview" button label                            | LOW priority cosmetic                                                          |

---

## 5. Changes by File

---

### File 1: `static/css/tokens.css`

#### 1.1 [HIGH] Add three missing intermediate spacing tokens (Arrange R1)

**Line**: After 364 (after `--space-12: 48px;`)

```css
--space-12: 48px;
--space-1-5: 6px;
--space-2-5: 10px;
--space-3-5: 14px;
```

Also add a comment above the spacing scale documenting the half-step rationale:

```css
/* Spacing scale — 4px grid with half-steps where 4px is too coarse.
     Half-steps (1-5, 3-5, 4-5, 5-5) serve layout-level gaps where
     adjacent full steps are too tight or too loose. */
--space-1: 4px;
```

#### 1.2 [HIGH] Add --z-confirm token (Normalize R3)

**Line**: After 386 (after `--z-lightbox: 1000;`)

```css
--z-lightbox: 1000;
--z-confirm: 1001;
```

Placed above lightbox so confirm dialogs always layer above lightboxes.

#### 1.3 [MEDIUM] Increase --ut-offwhite separation (Normalize R4 / T4)

**Line 22**:

```css
--ut-offwhite: #f7f8fa;
```

Changes from `#f3f4f6` (2% from `--ut-grey`) to `#f7f8fa` (~5% separation).

#### 1.4 [MEDIUM] Make --ut-panel-bg an explicit alias (Normalize R7)

**Line 29**:

```css
--ut-panel-bg: var(--ut-offwhite);
```

Was `#f3f4f6` (hardcoded duplicate). Now traces through the token it aliases.

#### 1.5 [MEDIUM] Add z-index scale documentation (Normalize R5)

**Line 374**: Add comment above the z-index block:

```css
/* Z-index scale — layered bottom to top.
     Shared layer (50): top-accent, tooltip, skip-link — no conflict
     because they occupy different screen regions. */
--z-panel-shadow: 4;
```

---

### File 2: `static/css/components.css`

#### 2.1 [HIGH] Replace raw 14px gaps with `var(--space-3-5)` (Arrange R1)

Replace `gap: 14px` → `gap: var(--space-3-5)` in:

- `.principle-list` (~line 158)
- `.score-cards, .reference-cards` (~line 224)
- `.field-grid` (~line 315)
- `.pager-shell` (line 1528)

#### 2.2 [HIGH] Replace raw 10px gaps with `var(--space-2-5)` (Arrange R1)

Replace `gap: 10px` → `gap: var(--space-2-5)` in:

- `.mock-control` (~line 414)
- `.checkbox-list` (~line 483)
- `.checkbox-item` (~line 489)
- `.evidence-intake-footer` (~line 773)
- `.evidence-items` (~line 836)
- `.evidence-lightbox-dialog` (~line 959)
- `.two-col-list` (~line 1000) — row gap only: `gap: var(--space-2-5) var(--space-4-5)` (combines with 2.4)
- `.page-index-button` (~line 1227)
- `.context-link-groups` (~line 1397)
- `.context-anchor-list` (~line 1456)
- `.reference-drawer-summary` (~line 1588)
- `.reference-drawer-summary-main` (~line 1614)

#### 2.3 [HIGH] Replace raw 6px gaps with `var(--space-1-5)` (Arrange R1)

Replace `gap: 6px` → `gap: var(--space-1-5)` in:

- `.rating-scale` (~line 503)
- `.rating-option` (~line 514)
- `.evidence-input-group` (~line 684)
- `.evidence-action-strip` (~line 782)
- `.page-index-list` (~line 1203)
- `.page-index-meta` (~line 1261)
- `.context-link-group` (~line 1402)
- `.context-source-block` (~line 1429)
- `.context-source-list` (~line 1436)
- `.context-anchor-list` (~line 1449)
- `.help-section-map` (~line 1706)

#### 2.4 [HIGH] Replace raw 12px/18px gaps with existing tokens (Arrange R2)

Replace `gap: 12px` → `gap: var(--space-3)` in:

- `.evidence-item` (~line 851)
- `.context-route-card, .context-anchor-card, .about-topic-meta` (~line 1284)
- `.context-route-header` (~line 1296)
- `.context-anchor-list, .about-topic-list` (~line 1449)
- `.reference-drawer-stack` (~line 1577)
- `.reference-drawer-panel` (~line 1673)
- `.help-panel-shell` (~line 1692)
- `.help-panel-shell .about-topic-view` (~line 1697)

Replace `gap: 18px` → `gap: var(--space-4-5)` in `.two-col-list` column gap (~line 1000, combined with 2.2).

#### 2.5 [HIGH] Remove pager-shell box-shadow and tokenize padding (Arrange R4 + T6, Arrange R5)

**Line 1525–1535**: Remove `box-shadow`, tokenize gap and padding:

```css
.pager-shell {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) auto minmax(8rem, 1fr);
  gap: var(--space-3-5);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--ut-border);
  border-bottom: 2px solid color-mix(in srgb, var(--ut-navy) 12%, var(--ut-border));
  background: color-mix(in srgb, var(--ut-navy) 5%, var(--ut-offwhite));
}
```

Was: `gap: 14px`, `padding: 12px 16px`, `box-shadow: 0 1px 3px ...`.

#### 2.6 [MEDIUM] Tokenize form-section padding tiers (Arrange R6 / T3)

**Line 91**: `.doc-section, .form-section` default padding:

```css
padding: var(--space-4-5) var(--space-5);
```

Was `padding: 18px 20px`.

**Line ~109**: Principle sections (`[data-section='tr']` etc.):

```css
padding: var(--space-5-5) var(--space-6);
```

Was `padding: 22px 24px`.

**Line ~131**: `.form-section#questionnaire-standard-answer-sets`:

```css
padding: var(--space-3-5) var(--space-4);
```

Was `padding: 14px 16px`.

**Line ~1157**: 760px breakpoint `.doc-section, .form-section`:

```css
padding: var(--space-3-5);
```

Was `padding: 14px`.

#### 2.7 [MEDIUM] Replace .subhead margin with tokens (Arrange R10 / T2)

**Line ~990**:

```css
margin: var(--space-6) 0 var(--space-3);
```

Was `margin: 24px 0 12px`.

#### 2.8 [MEDIUM] Add text overflow to .field-label and .page-index-label (Harden R5 / T8)

After the `.field-label` rule block (~line 349), add:

```css
.field-label > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

For `.page-index-label` (~line 1251), add to the existing rule:

```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

#### 2.9 [MEDIUM] Add min-width:0 to condition/display tags (Harden R14 / T8)

After the tag rules, add:

```css
.condition-tag,
.display-tag {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### 2.10 [MEDIUM] Fix .notice line-height drift (Normalize R8)

**Line ~1019**: `.notice` rule:

```css
line-height: var(--lh-body);
```

Was `line-height: 1.5` (vs token value 1.55). Imperceptible visual change.

#### 2.11 [MEDIUM] Add position:relative to .rating-option CSS (Harden R8)

In the `.rating-option` rule (~line 507), add:

```css
position: relative;
```

This moves the inline style from `dom-factories.js:752` into CSS where it belongs.

#### 2.12 [MEDIUM] Add help-shortcuts CSS classes (Normalize R2 + Harden R4 / T5)

Append to `components.css`:

```css
.help-shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.help-shortcuts-row {
  border-bottom: 1px solid var(--ut-border);
}

.help-shortcuts-key {
  padding: var(--space-1-5) var(--space-2-5);
  white-space: nowrap;
  font-family: var(--ff-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--ut-navy);
  vertical-align: top;
}

.help-shortcuts-action {
  padding: var(--space-1-5) var(--space-2-5);
  color: var(--ut-text);
  line-height: var(--lh-body);
}
```

Note: Uses the new --space-1-5 and --space-2-5 tokens (depends on 1.1).

#### 2.13 [MEDIUM] Add confirm-dialog CSS (Normalize R3)

Append to `components.css`:

```css
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-confirm));
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--ut-text) 40%, transparent);
}

.confirm-card {
  background: var(--ut-white);
  border: var(--border-default) solid var(--ut-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  max-width: 420px;
  width: calc(100% - var(--space-8) * 2);
}

.confirm-message {
  margin: 0 0 var(--space-5);
  font-size: var(--text-body);
  line-height: var(--lh-body);
  color: var(--ut-text);
}

.confirm-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

.confirm-btn {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-family: var(--ff-body);
  font-weight: 700;
  letter-spacing: var(--ls-label);
  border: var(--border-default) solid var(--ut-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  background: var(--ut-white);
  color: var(--ut-text);
}

.confirm-btn[data-primary='true'] {
  background: var(--ut-red);
  border-color: var(--ut-red);
  color: var(--ut-white);
}

.confirm-btn:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
```

Key changes from the JS version:

- Removed all fallback hex values (CSS vars guaranteed available)
- `z-index: 10000` → `calc(var(--z-confirm))`
- `rgba(0,0,0,0.4)` → `color-mix(in srgb, var(--ut-text) 40%, transparent)`
- Removed `box-shadow: 0 8px 24px rgba(0,0,0,0.15)` — flat design, no soft shadows

---

### File 3: `static/css/layout.css`

#### 3.1 [HIGH] Replace raw padding in header-inner (Arrange R5 / T3)

**Line 20**:

```css
padding: var(--space-2-5) var(--space-6) var(--space-2);
```

Was `padding: 10px 24px 8px`.

#### 3.2 [HIGH] Replace raw padding in panel-inner (Arrange R5 / T3)

**Line ~135**: `.panel-inner`:

```css
padding: var(--space-5) var(--space-5) var(--space-12);
```

Was `padding: 20px 20px 48px`.

**Line ~320**: `.questionnaire-panel .panel-inner`:

```css
padding: var(--space-5) var(--space-7) var(--space-12);
```

Was `padding: 20px 28px 48px`.

**Line ~325**: `.framework-panel .panel-inner`:

```css
padding: var(--space-5) var(--space-6) var(--space-12);
```

Was `padding: 20px 24px 48px`.

#### 3.3 [MEDIUM] Replace raw padding in sidebar-tab (Arrange R5 / T3)

**Line 399**:

```css
padding: var(--space-2-5) var(--space-4) var(--space-2);
```

Was `padding: 10px 16px 8px`.

#### 3.4 [MEDIUM] Replace raw 12px gaps with tokens (Arrange R2)

- `.panel-title-row` (~line 154): `gap: var(--space-3)`
- `.context-sidebar-shell, .context-generated-slot, .context-topic-stack` (~line 364): `gap: var(--space-3)`
- `.about-panel-shell` (~line 520): `gap: var(--space-3)`
- `.about-panel-shell .about-topic-view` (~line 530): `gap: var(--space-3)`

#### 3.5 [MEDIUM] Replace raw 10px gaps with tokens (Arrange R1)

- `.brand` (~line 52): `gap: var(--space-2-5)`

#### 3.6 [MEDIUM] Replace raw 6px gaps with tokens (Arrange R1)

- `.header-bar-toggles` (~line 45): `gap: var(--space-1-5)`

#### 3.7 [MEDIUM] Completion strip cell compression at medium viewport (Arrange R3)

Add after the existing strip-cell rules:

```css
@media (max-width: 1000px) {
  .strip-cell {
    min-width: 2.4rem;
    padding: 0 var(--space-1);
    font-size: 0.625rem;
  }
}
```

Reduces cell minimum from 51.2px to 38.4px, allowing 12 cells to fit in ~462px.

#### 3.8 [MEDIUM] Reduce panel-caption to --text-md (W3-plan A-3)

**Line ~331**: `.panel-caption`:

```css
font-size: var(--text-md);
```

Was `font-size: var(--text-body)` (16px). Captions are secondary and should recede.

---

### File 4: `static/css/interaction-states.css`

#### 4.1 [HIGH] Use --duration-accent token and --ease-out-quart in top-accent transition (Normalize R1)

**Line 3**:

```css
transition: --top-accent-color var(--duration-accent) var(--ease-out-quart);
```

Was `transition: --top-accent-color 400ms ease`. The `--duration-accent: 400ms` token already exists at `tokens.css:324`.

#### 4.2 [MEDIUM] Remove border-left-width from form-section transition (Optimize R4 / T9)

**Lines 65-68**: `.doc-section, .form-section` transition:

```css
.doc-section,
.form-section {
  transition:
    border-left-color var(--duration-fast) var(--ease-out-quart),
    background var(--duration-fast) var(--ease-out-quart);
```

Removed `border-left-width var(--duration-fast) var(--ease-out-quart)` from the list. The width change from 6px→8px on activation will now snap instantly instead of animating over 150ms. This eliminates layout recalculation during page transitions. Visual impact is imperceptible.

---

### File 5: `static/css/animations.css`

#### 5.1 [MEDIUM] Replace border-left-width animation with box-shadow (Optimize R5 / T9)

**Lines 68-80**: `@keyframes ratingBorderConfirm`:

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

Was `border-left-width: 2px → 5px → 3px`. The `box-shadow` inset creates the identical visual effect (a colored bar on the left edge) without triggering layout recalculation. `box-shadow` is paint-only, not layout-triggering.

---

### File 6: `trust-framework.html`

#### 6.1 [HIGH] Improve context panel empty-state text (Clarify R1)

**Line 106**: Replace:

```html
<p>Select a page to see context guidance.</p>
```

With:

```html
<p>
  Context guidance for the active page appears here automatically. Use the page index or pager to
  navigate — the guidance updates with each page.
</p>
```

#### 6.2 [HIGH] Pre-declare aria-live regions (Harden R1 / T11)

Before `</body>`, add:

```html
<div aria-live="polite" aria-atomic="true" class="visually-hidden" id="livePagerStatus"></div>
<div aria-live="polite" class="visually-hidden" id="liveRouteCard"></div>
<div aria-live="polite" class="visually-hidden" id="liveEvidenceStatus"></div>
```

These pre-declared live regions ensure assistive technologies register them during initial document processing. The corresponding JS modules will update these alongside their visible counterparts.

---

### File 7: `static/js/render/help-panel.js`

#### 7.1 [HIGH] Replace inline styles with CSS classes (Normalize R2 + Harden R4 / T5)

**Lines ~235-266**: Replace all `style.cssText` assignments with `className` assignments:

```js
shortcutsTable.className = 'help-shortcuts-table';
```

Was: `shortcutsTable.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--text-body);';`

```js
row.className = 'help-shortcuts-row';
```

Was: `row.style.cssText = 'border-bottom:1px solid var(--ut-border);';`

```js
keyCell.className = 'help-shortcuts-key';
```

Was: `keyCell.style.cssText = 'padding:6px 10px;white-space:nowrap;font-family:var(--ff-mono);font-size:var(--text-sm);font-weight:700;color:var(--ut-navy);vertical-align:top;';`

```js
actionCell.className = 'help-shortcuts-action';
```

Was: `actionCell.style.cssText = 'padding:6px 10px;color:var(--ut-text);line-height:var(--lh-body);';`

---

### File 8: `static/js/utils/confirm-dialog.js`

#### 8.1 [HIGH] Remove inline styles; reference CSS (Normalize R3)

**Lines 3-60**: Remove the `DIALOG_STYLES` template literal entirely.

**Lines 62-69**: Remove the `styleInjected` variable and `injectStyles` function.

**Line 75**: Remove the `injectStyles(documentRef);` call.

The confirm dialog DOM creation (lines 80-161) remains unchanged — the elements already have the correct class names (`confirm-overlay`, `confirm-card`, `confirm-message`, `confirm-actions`, `confirm-btn`). The CSS rules added in `components.css` (see 2.13) will style them.

The overlay's z-index is now handled by the `.confirm-overlay` CSS class. No JS z-index needed.

---

### File 9: `static/js/behavior/field-handlers.js`

#### 9.1 [HIGH] Add early-return guard for UI-only state changes (Optimize R1)

**Line 876-894**: Add a reference-equality check before the DOM sync loop:

```js
const unsubscribe = store.subscribe(
  (state, previousState) => {
    if (state.evaluation === previousState?.evaluation) {
      return;
    }

    const activePageId = state.ui?.activePageId;
    const activeSection = activePageId
      ? questionnaireRoot.querySelector(`[data-page-id="${activePageId}"]`)
      : null;
    const scope = activeSection instanceof HTMLElement ? activeSection : questionnaireRoot;
    toArray(scope.querySelectorAll('.field-group[data-field-id]')).forEach((fieldGroup) => {
      if (fieldGroup instanceof HTMLElement) {
        syncFieldGroup(fieldGroup, state);
      }
    });

    syncPageSections(questionnaireRoot, state);
    syncCriterionCards(questionnaireRoot, state);
    syncSectionMetaControls(questionnaireRoot, state);
  },
  { immediate: true },
);
```

The store's `notify` function already passes `(nextState, previousState)`. The `evaluation` reference check is O(1) — when only UI state changes (page navigation, sidebar toggle, scroll), the evaluation object reference is unchanged and the entire DOM sync is skipped.

**Impact**: Eliminates ~260 DOM attribute writes + ~60 `querySelector` calls per page navigation, sidebar toggle, and scroll event.

#### 9.2 [MEDIUM] Change validation role="alert" to role="status" (Harden R2)

In the validation message creation (search for `setAttribute('role', 'alert')`), change:

```js
msg.setAttribute('role', 'status');
msg.setAttribute('aria-atomic', 'true');
```

Was: `msg.setAttribute('role', 'alert')`. `role="status"` maps to `aria-live="polite"` — the correct assertiveness for form validation. `role="alert"` is `aria-live="assertive"` which immediately interrupts the screen reader.

---

### File 10: `static/js/state/store.js`

#### 10.1 [HIGH] Skip evidence normalization when evidence hasn't changed (Optimize R2)

**Lines 412-430**: Modify `cloneEvaluation` to accept an options parameter:

```js
const cloneEvaluation = (
  evaluation = createEmptyEvaluationState(),
  { evidenceChanged = true } = {},
) => ({
  workflow: { ...(evaluation.workflow ?? {}) },
  fields: { ...(evaluation.fields ?? {}) },
  sections: cloneRecordLookup(evaluation.sections),
  criteria: cloneRecordLookup(evaluation.criteria),
  evidence: evidenceChanged
    ? {
        ...(evaluation.evidence ?? {}),
        evaluation: finalizeEvidenceItemsForInsert(
          normalizeEvidenceItems(evaluation.evidence?.evaluation, {
            scope: 'evaluation',
          }),
        ),
        criteria: cloneEvidenceCriteria(evaluation.evidence?.criteria),
      }
    : { ...(evaluation.evidence ?? {}) },
  overrides: {
    ...(evaluation.overrides ?? {}),
    principleJudgments: { ...(evaluation.overrides?.principleJudgments ?? {}) },
  },
});
```

Then update all commit updaters that don't touch evidence to pass `{ evidenceChanged: false }`. Specifically, the `setFieldValue`, `setSectionValue`, and `setCriterionValue` action creators should pass `{ evidenceChanged: false }` to `cloneEvaluation`. The evidence-specific actions (`addEvaluationEvidenceItems`, `removeEvaluationEvidenceItem`, etc.) keep the default `{ evidenceChanged: true }`.

**Impact**: Eliminates evidence array normalization + deep cloning on every text field keystroke. Evidence items can contain data URLs (base64 images) — re-processing these is the single most expensive GC allocation per keystroke.

---

### File 11: `static/js/behavior/navigation.js`

#### 11.1 [MEDIUM] Wrap tab indicator style writes in requestAnimationFrame (Optimize R3)

**Lines 617-625**:

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

Batches the layout read (offsetLeft/offsetWidth) separately from the style writes (transform/width), eliminating the forced synchronous reflow.

---

### File 12: `static/js/render/dom-factories.js`

#### 12.1 [MEDIUM] Remove position:relative inline style from rating option (Harden R8)

**Line 752**: Remove `style: 'position:relative;'` from the rating option attributes:

```js
attributes: {
  tabindex: readOnly ? '-1' : '0',
  role: 'radio',
  'aria-checked': String(isSelected),
  'aria-disabled': String(Boolean(readOnly)),
  'aria-label': option.label,
  title: option.label,
},
```

The `position: relative` is now in the `.rating-option` CSS rule (see 2.11).

#### 12.2 [MEDIUM] Clean up tooltip document click listener (Harden R10)

**Lines 899-907**: Add `isConnected` check to self-remove the listener:

```js
const handleDocumentClick = (e) => {
  if (!wrapper.isConnected) {
    documentRef.removeEventListener('click', handleDocumentClick, true);
    return;
  }
  if (!wrapper.contains(e.target)) {
    hide();
  }
};
documentRef.addEventListener('click', handleDocumentClick, true);
```

Was an anonymous arrow function with no cleanup path. The `isConnected` check ensures the listener self-removes once the tooltip's parent element is removed from the DOM.

---

### File 13: `static/js/utils/focus-trap.js`

#### 13.1 [MEDIUM] Use container.ownerDocument instead of global document (Harden R3)

**Line 14**:

```js
if (container.ownerDocument.activeElement === first) {
```

Was: `if (document.activeElement === first) {`

**Line 18**:

```js
if (container.ownerDocument.activeElement === last) {
```

Was: `if (document.activeElement === last) {`

Resilience for test environments and potential future iframe embedding.

---

### File 14: `static/js/render/questionnaire-pages.js`

#### 14.1 [HIGH] Add criterion code to skip/resume button labels (Clarify R2)

**Line ~1373**: Change the button label:

```js
skipScaffold.requested
  ? `Resume ${criterionModel.criterionCode}`
  : `Skip ${criterionModel.criterionCode}`;
```

Was: `skipScaffold.requested ? 'Resume criterion' : 'Skip criterion'`. This differentiates buttons when a page has 3-4 criteria.

#### 14.2 [HIGH] Change validation message join separator (Clarify R11)

**Line ~1134**: Change the join separator:

```js
const text = issues.map((issue) => issue.message).join('; ');
```

Was: `.join(' ')`. Semicolon separation prevents concatenated fragments from running together.

#### 14.3 [MEDIUM] Improve mock control placeholder (Clarify R4)

**Line ~556**: For `SINGLE_SELECT` case:

```js
return field.control === 'computed_select'
  ? 'Auto-calculated'
  : `Select ${field.label.toLowerCase()}`;
```

Was: `return field.control === 'computed_select' ? 'Auto-calculated' : 'Select an option'`.

#### 14.4 [MEDIUM] Change "Display only" to "Auto-derived" (Clarify R10)

**Line ~601**:

```js
{ text: 'Auto-derived', kind: 'display' }
```

Was: `{ text: 'Display only', kind: 'display' }`. "Auto-derived" explains why the field can't be edited (computed from other data).

#### 14.5 [MEDIUM] Change "Section notes / comments" to "Section notes" (Clarify R3 + R12 / T7)

**Line ~1208**:

```js
labelText: 'Section notes';
```

Was: `labelText: 'Section notes / comments'`. Resolves slash disjunction inconsistency.

#### 14.6 [LOW] Change default placeholder fallback to null (Clarify R17)

**Line ~558**:

```js
default: return null;
```

Was: `default: return field.label;`. Avoids redundant label-as-placeholder for LONG_TEXT, CHECKLIST, MULTI_SELECT.

---

### File 15: `static/js/render/evidence.js`

#### 15.1 [HIGH] Change "Remove file everywhere" to "Remove from all criteria" (Clarify R9)

**Line ~731**:

```js
'Remove from all criteria';
```

Was: `'Remove file everywhere'`. More specific — matches the mental model of criteria associations.

#### 15.2 [MEDIUM] Differentiate evidence note placeholder by scope (Clarify R5)

**Line ~312**: Replace the placeholder logic:

```js
scope.level === 'criterion'
  ? 'Describe how this evidence supports the criterion.'
  : 'Describe how this evidence supports the evaluation.';
```

Was: `'Required note: why this file supports the evaluation or criterion.'`

#### 15.3 [MEDIUM] Differentiate evidence status text by scope (Clarify R13)

**Line ~1044**: Replace:

```js
const count = decoratedItems.length;
scope.level === 'evaluation'
  ? `${count} ${count === 1 ? 'file is' : 'files are'} in the evaluation evidence pool.`
  : `${count} ${count === 1 ? 'file is' : 'files are'} associated with this criterion.`;
```

Was: identical text for both levels.

#### 15.4 [MEDIUM] Add onerror handler to evidence lightbox image (Harden R6)

After the line that sets `image.src = imageSrc` (~line 927), add:

```js
image.onerror = () => {
  image.onerror = null;
  image.alt = 'Image preview failed to load';
  image.style.display = 'none';
  const errorNotice = documentRef.createElement('p');
  errorNotice.className = 'evidence-lightbox-note';
  errorNotice.textContent =
    'The image preview could not be loaded. The data may be corrupted or too large.';
  image.parentElement.appendChild(errorNotice);
};
```

#### 15.5 [MEDIUM] Add confirmation dialog for evidence item removal (Harden R15 / T12)

**Line ~1399**: Add confirmation before the `remove-item` action:

```js
if (action === 'remove-item') {
  const itemId = actionTarget.dataset.evidenceItemId;
  if (!itemId) return;

  const sourceItem = getEvidenceItemById({ state: store.getState(), scope, itemId });
  const shouldRemove = await confirmDialog(
    `Remove "${sourceItem?.name ?? 'this evidence item'}"?`,
    { documentRef },
  );
  if (!shouldRemove) return;

  // ... existing removal logic
```

The `confirmDialog` is already imported in `evidence.js` (line ~19).

#### 15.6 [MEDIUM] Use hidden attribute instead of inline display:none (Harden R7)

**Line ~333**: Change the file input attributes:

```js
attributes: {
  type: 'file',
  multiple: true,
  disabled: !editable ? true : null,
  'aria-label': 'Upload evidence files',
  hidden: true,
},
```

Was: `style: 'display:none'`. The `hidden` attribute is semantic HTML and `setAttributes()` in `dom-factories.js:84-86` already maps it to `element.hidden = Boolean(value)`.

#### 15.7 [HIGH] Update pre-declared aria-live region for evidence status (Harden R1 / T11)

In the evidence status update logic (~line 531), after updating the visible status element, also update the pre-declared live region:

```js
const liveRegion = documentRef.getElementById('liveEvidenceStatus');
if (liveRegion) {
  liveRegion.textContent = statusText;
}
```

---

### File 16: `static/js/behavior/pager.js`

#### 16.1 [HIGH] Update pre-declared aria-live region for pager status (Harden R1 / T11)

In the status update logic (~line 37), after updating the visible status element, also update the pre-declared live region:

```js
const liveRegion = documentRef.getElementById('livePagerStatus');
if (liveRegion) {
  liveRegion.textContent = refs.status.textContent;
}
```

#### 16.2 [MEDIUM] Change "← Start" pager label (Clarify R7)

**Line ~107**: When there's no previous page, use:

```js
'←';
```

Was: `'← Start'`. The arrow-only label signals boundary rather than action. The pager status already shows "Page 1 of N".

---

### File 17: `static/js/render/sidebar.js`

#### 17.1 [HIGH] Remove dynamic aria-live setAttribute; wire pre-declared region (Harden R1 / T11)

**Line ~318**: Remove the dynamic `setAttribute('aria-live', 'polite')` on the route card. Instead, update the pre-declared live region after rendering:

```js
const liveRegion = documentRef.getElementById('liveRouteCard');
if (liveRegion) {
  liveRegion.textContent = routeCard.textContent;
}
```

#### 17.2 [MEDIUM] Replace verbose progress fallback string (Clarify R14)

**Line ~171**: Replace:

```js
'All applicable required fields satisfied.';
```

Was: `'No currently applicable required fields remain on this page.'` Positive, shorter, direct voice.

#### 17.3 [LOW] Change "Reference drawers" to "Reference materials" (Clarify R18)

**Line ~979**:

```js
label.textContent = 'Reference materials';
```

Was: `label.textContent = 'Reference drawers'`. Describes content, not UI pattern.

---

## 6. Implementation Order

Execute in dependency order. Each phase is independently testable.

### Phase 1: Token Foundation (CSS only, zero visual change)

| Step | File         | Change                                                                                  | IDs     |
| ---- | ------------ | --------------------------------------------------------------------------------------- | ------- |
| 1    | `tokens.css` | Add --space-1-5/2-5/3-5, --z-confirm; update --ut-offwhite, --ut-panel-bg; add comments | 1.1–1.5 |

### Phase 2: Tokenization Sweep (CSS only, zero visual change)

| Step | File             | Change                                                                   | IDs     |
| ---- | ---------------- | ------------------------------------------------------------------------ | ------- |
| 2    | `components.css` | Replace all raw gap values with token refs (14px, 10px, 6px, 12px, 18px) | 2.1–2.4 |
| 3    | `layout.css`     | Replace all raw gap/padding values with token refs                       | 3.1–3.6 |
| 4    | `components.css` | Tokenize form-section padding, subhead margin, pager-shell padding       | 2.5–2.7 |

### Phase 3: Layout & Visual Fixes (CSS, minor visual changes)

| Step | File                     | Change                                                                                                                       | IDs           |
| ---- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 5    | `layout.css`             | Completion strip compression at 1000px; panel-caption to --text-md                                                           | 3.7, 3.8      |
| 6    | `components.css`         | Remove pager-shell box-shadow; add overflow/ellipsis rules; fix .notice line-height; add position:relative to .rating-option | 2.5, 2.8–2.11 |
| 7    | `interaction-states.css` | Use --duration-accent token; remove border-left-width from transitions                                                       | 4.1, 4.2      |
| 8    | `animations.css`         | Replace border-left-width animation with box-shadow inset                                                                    | 5.1           |

### Phase 4: JS Performance (no visual change)

| Step | File                | Change                                              | IDs  |
| ---- | ------------------- | --------------------------------------------------- | ---- |
| 9    | `field-handlers.js` | Early-return guard for UI-only changes              | 9.1  |
| 10   | `store.js`          | Skip evidence normalization when evidence unchanged | 10.1 |

### Phase 5: JS Resilience (minor functional changes)

| Step | File                | Change                                                     | IDs        |
| ---- | ------------------- | ---------------------------------------------------------- | ---------- |
| 11   | `navigation.js`     | rAF wrapper on tab indicator                               | 11.1       |
| 12   | `dom-factories.js`  | Remove inline position:relative; clean up tooltip listener | 12.1, 12.2 |
| 13   | `focus-trap.js`     | Use container.ownerDocument                                | 13.1       |
| 14   | `field-handlers.js` | Change role="alert" to role="status"                       | 9.2        |

### Phase 6: Accessibility (HTML + JS)

| Step | File                                      | Change                                                               | IDs              |
| ---- | ----------------------------------------- | -------------------------------------------------------------------- | ---------------- |
| 15   | `trust-framework.html`                    | Improve context empty-state text; add pre-declared aria-live regions | 6.1, 6.2         |
| 16   | `pager.js` + `sidebar.js` + `evidence.js` | Wire pre-declared aria-live updates                                  | 15.7, 16.1, 17.1 |

### Phase 7: UX Copy (JS string changes)

| Step | File                     | Change                                                                                               | IDs        |
| ---- | ------------------------ | ---------------------------------------------------------------------------------------------------- | ---------- |
| 17   | `questionnaire-pages.js` | Button labels, placeholders, validation separator, tag text                                          | 14.1–14.6  |
| 18   | `evidence.js`            | Button label, placeholders, status text, image error handler, removal confirmation, hidden attribute | 15.1–15.7  |
| 19   | `pager.js`               | Arrow-only boundary label                                                                            | 16.2       |
| 20   | `sidebar.js`             | Progress fallback, "Reference materials" label                                                       | 17.2, 17.3 |

### Phase 8: Help Panel + Confirm Dialog Cleanup

| Step | File                | Change                                            | IDs        |
| ---- | ------------------- | ------------------------------------------------- | ---------- |
| 21   | `components.css`    | Add help-shortcuts and confirm-dialog CSS classes | 2.12, 2.13 |
| 22   | `help-panel.js`     | Replace inline styles with className              | 7.1        |
| 23   | `confirm-dialog.js` | Remove DIALOG_STYLES and injectStyles             | 8.1        |

---

## 7. Verification Checklist

After implementing all changes:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. `rg "gap: 6px|gap: 10px|gap: 14px|gap: 12px|gap: 18px" static/css/` — expect 0 matches (all tokenized)
4. `rg "backdrop-filter" static/css/` — expect 0 results
5. `rg "border-left-width" static/css/interaction-states.css` — only in declaration values (not in `transition` property lists)
6. `rg "border-left-width" static/css/animations.css` — expect 0 results (replaced with box-shadow)
7. `rg "style\.cssText" static/js/render/help-panel.js` — expect 0 results
8. `rg "DIALOG_STYLES" static/js/utils/confirm-dialog.js` — expect 0 results
9. `rg "rgba\(" static/js/utils/confirm-dialog.js` — expect 0 results
10. `rg "position:relative" static/js/render/dom-factories.js` — expect 0 results
11. Visual: --ut-offwhite surfaces (principle items, evidence blocks) are distinguishable from --ut-grey canvas
12. Visual: Panel caption at 14px is clearly secondary to body text
13. Visual: Completion strip cells fit at 800-1000px without wrapping
14. Visual: Page transitions have no layout-thrash (Chrome DevTools Performance tab — no purple layout bars during transition)
15. Visual: Rating selection pulse still perceptible (box-shadow inset)
16. Visual: Confirm dialog renders with flat styling (no soft shadow)
17. Functional: Typing in a text field does not re-normalize evidence items
18. Functional: Page navigation does not re-sync field DOM
19. Functional: Evidence item removal shows confirmation dialog
20. Functional: Pre-declared aria-live regions announce changes to screen readers
21. Functional: Skip/Resume buttons show criterion codes
22. Functional: All field values persist correctly after navigation
23. Functional: Evidence items render correctly after field edits

---

## 8. Change Count Summary

| File                     | Changes                                | Priority    |
| ------------------------ | -------------------------------------- | ----------- |
| `tokens.css`             | 5 edits                                | HIGH–MEDIUM |
| `components.css`         | 13 edits                               | HIGH–MEDIUM |
| `layout.css`             | 8 edits                                | HIGH–MEDIUM |
| `interaction-states.css` | 2 edits                                | HIGH–MEDIUM |
| `animations.css`         | 1 edit                                 | MEDIUM      |
| `trust-framework.html`   | 2 edits                                | HIGH        |
| `help-panel.js`          | 1 edit (4 line changes)                | HIGH        |
| `confirm-dialog.js`      | 1 edit (remove ~65 lines)              | HIGH        |
| `field-handlers.js`      | 2 edits                                | HIGH–MEDIUM |
| `store.js`               | 1 edit                                 | HIGH        |
| `navigation.js`          | 1 edit                                 | MEDIUM      |
| `dom-factories.js`       | 2 edits                                | MEDIUM      |
| `focus-trap.js`          | 2 edits                                | MEDIUM      |
| `questionnaire-pages.js` | 6 edits                                | HIGH–LOW    |
| `evidence.js`            | 7 edits                                | HIGH–MEDIUM |
| `pager.js`               | 2 edits                                | HIGH–MEDIUM |
| `sidebar.js`             | 3 edits                                | HIGH–LOW    |
| **Total**                | **~59 discrete edits across 17 files** |             |

---

_End of Wave 4 Unified Implementation Plan_
