# Wave 4 — /harden Resilience Audit (Re-evaluation)

**Date**: 2026-04-05
**Auditor**: impeccable /harden skill
**Target**: `trust-framework.html` + `static/css/` (8 files) + `static/js/` (37 modules)
**Scope**: Error handling, edge cases, i18n, text overflow, ARIA semantics, accessibility gaps, production resilience
**Previous**: w4-harden.md (2026-04-04, pre-W3 re-audit). This replaces it with findings based on the re-evaluated W3 audit (17.5/20 score) and fresh codebase sweep.

---

## Hardening Health Score

| #         | Dimension           | Score    | Verdict                                                                    |
| --------- | ------------------- | -------- | -------------------------------------------------------------------------- |
| 1         | Error Handling      | 3.5      | Very good — try/catch in sidebar render, guard clauses, global error hooks |
| 2         | Edge Cases          | 3.0      | Good — long text handled in many places but gaps in field labels, titles   |
| 3         | ARIA Semantics      | 3.0      | Good — strong foundations; gaps in live regions, alert role, focus scoping |
| 4         | i18n Readiness      | 3.5      | Very good — English-only tool for UT team; logical properties where needed |
| 5         | Resource Resilience | 3.0      | Good — event delegation, MutationObserver, cleanup patterns; some leaks    |
| **Total** |                     | **16.0** | **/ 20 — Good (minor gaps)**                                               |

**Rating band**: 14–16 Good. Production-ready with addressed recommendations.

---

## Already Good — Do Not Change

These patterns are solid and should be preserved:

1. **`inert` + `aria-hidden` on inactive pages** (`navigation.js:535–569`): Every page section gets both attributes toggled on every sync. Gold standard for SPA page visibility.

2. **Focus management with retry logic** (`navigation.js:136–175`): `focusElementWithRetry` uses `requestAnimationFrame` with up to 3 attempts, primary/fallback targets, and DOM-connectedness checks.

3. **Sidebar render try/catch with error fallbacks** (`sidebar.js:1078–1138`): Each render sub-operation (quick jump, page index, route card, anchor card, context content) is individually wrapped with try/catch. On failure, a visible `.sidebar-error-fallback` message is rendered. This is exemplary error resilience.

4. **Global error hooks** (`app.js:13–18`): Both `window.error` and `unhandledrejection` are caught and logged. Provides a safety net for unexpected failures.

5. **Evidence lightbox focus trap** (`evidence.js:938–944`): Creates and activates a focus trap on open, deactivates on close. Escape key handled via `onEscape` callback. Return focus to trigger element stored and restored.

6. **Confirm dialog prevents double-open** (`confirm-dialog.js:73`): `activeDialog` sentinel prevents multiple simultaneous dialogs. Focus trap, Escape handling, and backdrop click-to-close are all present.

7. **`prefers-reduced-motion`** (`animations.css:1–26`): Comprehensive zero-duration overrides. Page transition logic in `navigation.js:497–532` checks the media query and skips animation classes entirely.

8. **Event delegation pattern**: Input/change events are caught at `questionnaireRoot`, click events at the element level. Reduces listener count from O(n fields) to O(1).

9. **Cleanup patterns**: All major modules (navigation, pager, evidence, sidebar, keyboard) collect cleanup functions in arrays and iterate them in `destroy()`. Event listeners, observers, and subscriptions are properly deregistered.

10. **Text overflow handling in evidence components**: `.evidence-file-name` (components.css:748–757), `.evidence-item-name` (components.css:905–912), `.evidence-note` (components.css:928–931), `.mock-control .value` (components.css:419–427) all have proper overflow handling with ellipsis or `overflow-wrap: anywhere`.

11. **`<noscript>` fallback** (`trust-framework.html:18–22`): Resets `overflow: auto` on body so page scrolls without JS.

12. **Immutability guard in store** (`store.js:561–572`): `commit()` short-circuits if the updater returns the same reference, preventing unnecessary re-renders.

---

## Detailed Recommendations

### R1 — Pre-declare `aria-live` regions in static HTML

**Priority**: HIGH
**Category**: Accessibility — Screen reader support

**Problem**: Three elements set `aria-live="polite"` dynamically via JavaScript:

- `pager.js:37` — pager status paragraph
- `sidebar.js:318` — context route card section
- `evidence.js:531` — evidence status paragraph

Some assistive technologies (notably JAWS, older NVDA) may not track content changes in elements that receive `aria-live` after initial page load. The ARIA spec recommends pre-declaring live regions in the static DOM so screen readers can register them during initial document processing.

**Specifics**:

In `trust-framework.html`, add three empty pre-declared live regions before the closing `</body>` tag:

```html
<!-- Pre-declared ARIA live regions -->
<div aria-live="polite" aria-atomic="true" class="visually-hidden" id="livePagerStatus"></div>
<div aria-live="polite" class="visually-hidden" id="liveRouteCard"></div>
<div aria-live="polite" class="visually-hidden" id="liveEvidenceStatus"></div>
```

Then update the JS modules to populate these pre-declared containers instead of relying on dynamically-added `aria-live`:

- `pager.js:36–38`: Keep the visible `.pager-status` element for sighted users but also update `#livePagerStatus` textContent.
- `sidebar.js:317–318`: Remove `routeCard.setAttribute('aria-live', 'polite')` and instead update `#liveRouteCard`.
- `evidence.js:529–533`: Keep the visible `.evidence-status` element but also update `#liveEvidenceStatus`.

Alternatively, if the visible elements should remain the single source, add `aria-live="polite"` directly in the HTML template for the pager and evidence status, and in the `buildContextShell()` function for the route card (since it's always constructed on init).

**Dependencies**: None. Independent change.

---

### R2 — Validation messages should use `aria-live="polite"` instead of `role="alert"`

**Priority**: MEDIUM
**Category**: Accessibility — Screen reader interruption

**Problem**: `field-handlers.js:418` creates validation messages with `role="alert"`, which maps to `aria-live="assertive"`. Assertive announcements immediately interrupt whatever the screen reader is saying. For form validation that appears inline alongside the field, this is too aggressive — the user may be mid-interaction with the field.

**Specifics**:

In `static/js/behavior/field-handlers.js`, change line 418:

```js
// FROM:
msg.setAttribute('role', 'alert');

// TO:
msg.setAttribute('role', 'status');
```

`role="status"` maps to `aria-live="polite"`, which announces the validation message after the current utterance completes. This is the correct assertiveness level for form validation feedback.

Additionally, consider adding `aria-atomic="true"` so the full message text is read (not just the diff):

```js
msg.setAttribute('role', 'status');
msg.setAttribute('aria-atomic', 'true');
```

**Dependencies**: None.

---

### R3 — Focus trap uses global `document` instead of container's ownerDocument

**Priority**: MEDIUM
**Category**: Edge case — iframe/test environment resilience

**Problem**: `focus-trap.js:14,18` references `document.activeElement` directly instead of deriving it from the container's node document. This works in a single-document app but breaks in:

- Test environments where the container may be in a different document
- Any future embedding scenario (iframe, shadow DOM)

**Specifics**:

In `static/js/utils/focus-trap.js`, replace global `document` references:

```js
// Line 14: FROM
if (document.activeElement === first) {
// TO
if (container.ownerDocument.activeElement === first) {

// Line 18: FROM
if (document.activeElement === last) {
// TO
if (container.ownerDocument.activeElement === last) {
```

Note: The `confirm-dialog.js` module already correctly uses `documentRef.activeElement` (lines 78, 115, 133, 137). The focus-trap utility should match this pattern.

**Dependencies**: None.

---

### R4 — Move `help-panel.js` inline table styles to CSS classes

**Priority**: MEDIUM
**Category**: Theming / Maintainability

**Problem**: `help-panel.js:235–266` creates the keyboard shortcuts table using inline `style.cssText` on every row and cell:

```js
row.style.cssText = 'border-bottom:1px solid var(--ut-border);';
keyCell.style.cssText = 'padding:6px 10px;white-space:nowrap;font-family:var(--ff-mono);...';
actionCell.style.cssText = 'padding:6px 10px;color:var(--ut-text);...';
```

And the table itself:

```js
shortcutsTable.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--text-body);';
```

This creates a two-source-of-truth problem: visual changes require editing CSS files AND JS string constants. The values reference CSS custom properties but live outside the stylesheet cascade.

**Specifics**:

Add to `static/css/components.css` (or a new `.help-panel` section):

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
  padding: 6px 10px;
  white-space: nowrap;
  font-family: var(--ff-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--ut-navy);
  vertical-align: top;
}

.help-shortcuts-action {
  padding: 6px 10px;
  color: var(--ut-text);
  line-height: var(--lh-body);
}
```

Then in `help-panel.js`, replace inline styles with class names:

```js
shortcutsTable.className = 'help-shortcuts-table';
row.className = 'help-shortcuts-row';
keyCell.className = 'help-shortcuts-key';
actionCell.className = 'help-shortcuts-action';
```

**Dependencies**: None.

---

### R5 — Add text overflow protection to `.field-label` and `.page-index-label`

**Priority**: MEDIUM
**Category**: Edge case — long text

**Problem**: `.field-label` (components.css:336–349) has no overflow handling. It uses `display: flex; justify-content: space-between` with no `min-width: 0` on children. A field with a very long label name (e.g., 132+ field names, some may be verbose) combined with a tag will push content out of bounds in narrow field-grid cells.

`.page-index-label` (components.css:1251–1256) similarly has no overflow handling inside the `min-width: 0` grid cell.

**Specifics**:

In `static/css/components.css`, add overflow protection:

```css
/* After line 349 (.field-label block) */
.field-label > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

```css
/* After line 1256 (.page-index-label block) */
.page-index-label {
  /* existing properties */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

This preserves the flex layout for labels with tags while ensuring very long label text truncates cleanly rather than overflowing the field-group boundary.

**Dependencies**: None. Does not conflict with R2 (validation messages are appended after the label).

---

### R6 — Add error handler to evidence lightbox image

**Priority**: MEDIUM
**Category**: Edge case — broken data URLs

**Problem**: `evidence.js:927` sets `image.src = imageSrc` without any `onerror` handler. If the data URL is corrupted (truncated during store serialization, partially written), the lightbox will show a broken image with no feedback to the user.

**Specifics**:

In `evidence.js`, after line 927 (`image.src = imageSrc`), add an error handler:

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

**Dependencies**: None.

---

### R7 — Replace `style: 'display:none'` with `hidden` attribute on file input

**Priority**: LOW
**Category**: Accessibility / Semantic HTML

**Problem**: `evidence.js:333` creates the hidden file input with `style: 'display:none'`. The `hidden` HTML attribute is the semantic way to hide elements and works consistently with assistive technologies. Inline `display:none` can be overridden by CSS.

**Specifics**:

In `evidence.js`, change line 329–334:

```js
// FROM
attributes: {
  type: 'file',
  multiple: true,
  disabled: !editable ? true : null,
  'aria-label': 'Upload evidence files',
  style: 'display:none',
},

// TO
attributes: {
  type: 'file',
  multiple: true,
  disabled: !editable ? true : null,
  'aria-label': 'Upload evidence files',
  hidden: true,
},
```

The `hidden` attribute is already supported by `setAttributes()` in `dom-factories.js:84–86` which maps it to `element.hidden = Boolean(value)`.

**Dependencies**: None.

---

### R8 — Replace `style: 'position:relative'` on rating options with CSS class

**Priority**: LOW
**Category**: Theming consistency

**Problem**: `dom-factories.js:753` applies `style: 'position:relative;'` inline on every rating option element. This is a single-property inline style that should live in CSS alongside all the other `.rating-option` styles in `components.css:500–520`.

**Specifics**:

In `static/css/components.css`, add to the `.rating-option` rule block (around line 507):

```css
.rating-option {
  position: relative; /* was inline style in dom-factories.js */
  /* ... existing properties ... */
}
```

Then in `dom-factories.js`, remove the inline style from line 753:

```js
// FROM
style: 'position:relative;',

// TO
(remove the attribute entirely)
```

**Dependencies**: None.

---

### R9 — Confirm dialog returns `false` silently when already open

**Priority**: LOW
**Category**: Error handling — edge case

**Problem**: `confirm-dialog.js:73` returns `Promise.resolve(false)` if a dialog is already active. This is silently treated as "user cancelled," which is correct behavior but could mask bugs if two removal actions are triggered rapidly. The caller (evidence.js:1454) awaits the result and proceeds based on `true`/`false`, so a concurrent request would silently no-op.

**Specifics**:

This is acceptable as-is. The `activeDialog` sentinel prevents stacked overlays, which is the correct behavior. Document this as intentional:

```js
// confirm-dialog.js:73 — add comment
if (activeDialog) return Promise.resolve(false); // Prevents stacked dialogs; concurrent requests treated as cancel
```

No code change required. Flagged for documentation only.

**Dependencies**: None.

---

### R10 — Tooltip document-level click listener is never cleaned up

**Priority**: MEDIUM
**Category**: Resource resilience — event listener leak

**Problem**: `dom-factories.js:899–907` adds a capture-phase click listener to `documentRef` for every tooltip created:

```js
documentRef.addEventListener(
  'click',
  (e) => {
    if (!wrapper.contains(e.target)) {
      hide();
    }
  },
  true,
);
```

This listener is never removed. If the tooltip's parent element is removed from the DOM (e.g., during page re-render), the listener persists on the document, keeping the tooltip's closure alive in memory. With 100+ fields each potentially having a tooltip trigger, this accumulates.

**Specifics**:

Refactor `createTooltipTrigger` to return a cleanup function. Store the listener reference and clean up when the tooltip wrapper is removed from the DOM using a `MutationObserver` or by having the calling code handle cleanup.

Simplest fix — use `{ once: true }` pattern or check wrapper connectivity:

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

The `isConnected` check ensures the listener self-removes once the tooltip is garbage-collectable. Alternatively, the tooltip could use a single delegated handler at the questionnaire root level (matching the app's existing event delegation pattern).

**Dependencies**: None.

---

### R11 — Store `setActivePage` does not validate page accessibility

**Priority**: LOW
**Category**: Edge case — defensive programming

**Problem**: `store.js:706–719` validates that `pageId` is in the `pageOrder` array but does not check whether the page is accessible (per workflow rules). The navigation module (`navigation.js:755–759`) checks accessibility before calling `store.actions.setActivePage`, but there's no defense-in-depth at the store level.

If any other code path calls `setActivePage` directly (e.g., keyboard shortcuts in `keyboard.js:97`, hash-based navigation in `context-tracking.js`), the accessibility check may be bypassed.

**Specifics**:

In `store.js`, add an accessibility guard:

```js
const setActivePage = (pageId) =>
  commit((previousState) => {
    if (!previousState.ui.pageOrder.includes(pageId)) {
      return previousState;
    }

    // Guard: prevent navigation to inaccessible pages
    const pageState = previousState.derived.pageStates.bySectionId[pageId];
    if (pageState?.isAccessible === false) {
      return previousState;
    }

    return {
      ...previousState,
      ui: createUiState({
        ...previousState.ui,
        activePageId: pageId,
      }),
    };
  });
```

Note: `keyboard.js:97` calls `navigateToPage()` which has its own accessibility check, so this is a defense-in-depth measure, not fixing an active bug.

**Dependencies**: None.

---

### R12 — Document inline-style constants in `dom-factories.js` as intentional exceptions

**Priority**: LOW
**Category**: Documentation / Maintainability

**Problem**: `dom-factories.js:14–49` defines five inline-style string constants (`INLINE_TEXT_CONTROL_STYLE`, `INLINE_TEXTAREA_STYLE`, `INLINE_SELECT_STYLE`, `INLINE_HIDDEN_CHOICE_INPUT_STYLE`, `INLINE_STACK_STYLE`) that bypass the CSS token system. These are structural styles that make native form controls visually transparent so the `.mock-control` wrapper provides the visual treatment.

This is a known architectural trade-off documented in W3 P1.2 and the audit's systemic patterns section. The constants reference CSS custom properties (`var(--ut-text)`) so they're not fully disconnected from the token system.

**Specifics**:

Add a block comment at line 14 explaining the pattern:

```js
/*
 * Inline control styles — INTENTIONAL EXCEPTION to the CSS token system.
 * These make native <input>, <textarea>, and <select> elements visually
 * transparent so their .mock-control / .textarea-mock wrappers handle
 * all visual treatment. The styles reference CSS custom properties so
 * they remain connected to the token system. Moving these to CSS classes
 * would require per-control specificity management that's harder to
 * maintain than the constant-string approach.
 */
```

No code change required. Documentation only.

**Dependencies**: None.

---

### R13 — Add `aria-describedby` linkage between field help and controls

**Priority**: MEDIUM
**Category**: Accessibility — programmatic association

**Problem**: Fields have `.field-help` elements (created in `dom-factories.js:208–221`) and control elements (inputs, selects, textareas). The field help has an `id` attribute and the control has `aria-labelledby` pointing to the label. But there's no `aria-describedby` connecting the control to its help text.

Screen readers announce the label via `aria-labelledby` but the help text (which often contains critical usage instructions like "Required note: why this file supports the evaluation") is not programmatically associated with the control.

**Specifics**:

This requires two coordinated changes:

1. In `questionnaire-pages.js` (or wherever `getFieldControlId` is defined), ensure each control gets `aria-describedby` pointing to the help element's ID. The pattern would be:

```js
// In the field rendering logic, when creating the control:
if (helpId) {
  controlAttributes['aria-describedby'] = helpId;
}
```

2. Verify that `createFieldGroup` in `dom-factories.js` passes the `helpId` through to the control creation.

The IDs are already generated — `getFieldControlId(fieldId)` for the control and a matching help ID. The missing link is the `aria-describedby` attribute on the control element.

**Dependencies**: Requires reading `questionnaire-pages.js` to understand field rendering flow. This is a medium-effort change that touches the field rendering pipeline.

---

### R14 — `.field-label` flex children lack `min-width: 0` for tag overflow

**Priority**: LOW
**Category**: Edge case — long tag text

**Problem**: `.field-label` (components.css:336–349) uses `display: flex; justify-content: space-between`. The label `<span>` and the condition/display `<span>` tag share space. If a tag text is very long (e.g., "Condition active"), the tag can push the label text or overflow the container because flex children default to `min-width: auto`.

**Specifics**:

Add to `components.css` after the `.field-label` rule:

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

This allows tags to shrink when space is limited. The label span should keep `flex: 1 1 auto` (which it inherits from the default).

**Dependencies**: Related to R5 (field-label overflow). Can be combined in one CSS edit session.

---

### R15 — Evidence "Remove" action lacks confirmation dialog for single-use items

**Priority**: MEDIUM
**Category**: Error prevention — destructive action

**Problem**: In `evidence.js`, there are two removal paths:

- `remove-asset` (line 1443–1480): Shows a confirmation dialog before removing an evidence file everywhere. This is correct.
- `remove-item` (line 1399–1418): Removes an evaluation-level evidence item immediately with no confirmation. This is a destructive action that cannot be undone (the file data is lost from the store).
- `unlink-item` (line 1421–1441): Unlinks a criterion-level evidence association with no confirmation. Less severe (the file remains in the store) but still destructive to the evaluation state.

**Specifics**:

Add confirmation for `remove-item` in `evidence.js`, around line 1399:

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
}
```

For `unlink-item`, a confirmation is optional since the evidence file itself is preserved. Consider adding one only if the association count is 1 (last link).

**Dependencies**: Uses `confirmDialog` from `confirm-dialog.js` which is already imported in `evidence.js:19`.

---

## What NOT to Change

These are intentionally designed and should be preserved as-is:

1. **`dom-factories.js` inline style constants (lines 14–49)**: The `INLINE_*_STYLE` constants are a necessary architectural trade-off for transparent native controls. They reference CSS custom properties and are documented in R12.

2. **English-only content**: The tool is for the EIS-IS team at University of Twente. All users are English-speaking domain experts. i18n infrastructure (message catalogs, RTL support, Intl formatters) would add complexity with zero user benefit.

3. **`color-mix()` without fallback**: The browser support floor (Safari 16.2+, Chrome 111+, Firefox 113+) is acceptable for a university-internal tool. Adding fallback declarations would double the CSS maintenance burden.

4. **`@starting-style` without fallback**: Graceful degradation in Firefox — animations simply won't animate. No visual breakage.

5. **Print body colors hardcoded**: `print.css:149-151` uses `color: #000; background: #fff;` intentionally for maximum print contrast.

6. **Sidebar render error fallbacks**: The try/catch pattern in `sidebar.js:1078–1138` is exemplary and should not be simplified.

7. **`.tooltip-trigger-btn` at `border-radius: 50%`**: Universal icon button convention at 44×44px touch target. The `.impeccable.md` sharp-corner rule is for rectangular UI elements, not circular icon buttons.

8. **No save/persistence indicator**: The tool runs entirely in-memory with no backend save mechanism. Adding a save indicator would imply persistence that doesn't exist.

---

## Summary Table

| ID  | Priority | Category            | Effort  | Description                                                     |
| --- | -------- | ------------------- | ------- | --------------------------------------------------------------- |
| R1  | HIGH     | Accessibility       | Small   | Pre-declare aria-live regions in static HTML                    |
| R2  | MEDIUM   | Accessibility       | Trivial | Change validation `role="alert"` to `role="status"`             |
| R3  | MEDIUM   | Edge case           | Trivial | Focus trap: use `container.ownerDocument` not global `document` |
| R4  | MEDIUM   | Theming             | Small   | Move help-panel.js inline table styles to CSS classes           |
| R5  | MEDIUM   | Edge case           | Trivial | Add text overflow to `.field-label` and `.page-index-label`     |
| R6  | MEDIUM   | Edge case           | Small   | Add onerror handler to evidence lightbox image                  |
| R7  | LOW      | Accessibility       | Trivial | Use `hidden` attribute instead of inline `display:none`         |
| R8  | LOW      | Theming             | Trivial | Move rating-option `position:relative` to CSS                   |
| R9  | LOW      | Documentation       | Trivial | Document confirm-dialog double-open behavior                    |
| R10 | MEDIUM   | Resource resilience | Small   | Clean up tooltip document click listeners on removal            |
| R11 | LOW      | Edge case           | Trivial | Add accessibility guard to store `setActivePage`                |
| R12 | LOW      | Documentation       | Trivial | Document inline-style constants as intentional exception        |
| R13 | MEDIUM   | Accessibility       | Medium  | Add `aria-describedby` linking field help to controls           |
| R14 | LOW      | Edge case           | Trivial | Add `min-width: 0` to condition/display tags in field labels    |
| R15 | MEDIUM   | Error prevention    | Small   | Add confirmation dialog for evidence item removal               |

**Recommended implementation order**: R1 → R2 → R13 → R15 → R6 → R10 → R5 → R3 → R4 → R7 → R8 → R11 → R14 → R9 → R12

---

## Methodology

- **Static analysis** of all 8 CSS files (~4,800 lines), all JS modules (~16,000 lines total), and `trust-framework.html` (565 lines)
- **Pattern matching** for: `aria-live` usage, `role` attributes, inline styles, `document.activeElement` references, `onerror` handlers, overflow/text-overflow rules, confirmation dialogs on destructive actions
- **Accessibility audit** via grep of `aria-*`, `role`, `inert`, `hidden` attributes across HTML and JS
- **Edge case analysis**: long text in labels, titles, names; broken data URLs; concurrent dialog requests; focus scoping in nested contexts
- **Resource leak analysis**: event listener registration vs. cleanup paths, MutationObserver lifecycle, timer cleanup
- **Cross-referenced** with W3 audit findings (w3-audit.md) and W3 critique (w3-critique.md) to avoid duplicating known issues
- **Design direction compliance** checked against `.impeccable.md` (133 lines) — all recommendations preserve the "efficient, explicit, engineered" brand personality

---

_End of Wave 4 Hardening Audit Report_
