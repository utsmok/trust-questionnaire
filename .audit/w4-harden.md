# Wave 4 — /harden Hardening Recommendations

**Date**: 2026-04-04
**Scope**: Robustness, edge case handling, accessibility hardening
**Sources**: w3-plan.md (Wave 3 findings), full codebase audit of HTML/CSS/JS
**Assigned from w3-plan.md**: P1-01, P2-06, P2-07, P3-03, P3-06, P3-07, P3-08, P3-09

---

## Already Good — Do Not Change

The following patterns are solid and should be preserved:

- **`inert` on inactive page sections** (`navigation.js:507–511`): Active page removes `inert`; all others set it. This is correct and complete.
- **`aria-hidden` on inactive page sections** (`navigation.js:493`): Synchronized with `inert` on every page change.
- **Focus return after overlay close** (`navigation.js:761–818`): About and Help surfaces track the triggering element and return focus via `shell-focus-anchor` elements with retry logic.
- **Focus return after context drawer close** (`navigation.js:276–343`): Includes transition-end fallback timer and multiple fallback targets.
- **Escape key handling** (`navigation.js:944–967`): Correctly closes surfaces in order (Help → About → Context drawer).
- **Rating scale keyboard navigation** (`keyboard.js:25–53`): Arrow keys move between options, Enter/Space activate. Properly uses MutationObserver to bind new scales.
- **`prefers-reduced-motion`** (`animations.css:1–26`): Zeroes all durations and animation iterations. Correctly forces `opacity: 1` and skips transitions in page visibility logic (`navigation.js:442–474`).
- **`aria-live="polite"` on pager status** (`pager.js:37`): Announces page changes to screen readers.
- **`aria-live="polite"` on evidence status** (`evidence.js:529`): Announces evidence actions.
- **Header progress summary** (`sidebar.js:341–391`): Uses `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, and a descriptive `aria-label`. Well done.
- **Event cleanup in `destroy()`**: All modules properly clean up event listeners and timers.
- **`textarea-mock` and form controls have `min-width: 0`** on flex/grid parents: Prevents overflow in dense layouts.
- **Confirmation dialog** (`confirm-dialog.js`): Uses `aria-modal`, `role="dialog"`, traps Escape, returns focus. Well-implemented.
- **Completion strip** uses `aria-hidden="true"` and `role="presentation"` with `visually-hidden` descriptions: Accessible scanning pattern.
- **Page index buttons use `aria-current="page"`** (`sidebar.js:946–948`): Correctly marks the active page for screen readers.
- **Quick jump buttons use `aria-current="page"`** (`sidebar.js:847`): Active TRUST principle button is marked.

---

## Recommendations

### R1 — Evidence lightbox missing focus trap (P1-01)

- **Priority**: HIGH
- **Category**: Accessibility (WCAG 2.1.1 Keyboard, WCAG 2.4.3 Focus Order)
- **Description**: The evidence lightbox (`evidence.js:819–904`) opens with `role="dialog"` and `aria-modal="true"` but has no focus trap. Tab key lets focus escape to underlying page content. The close button receives focus on open (`evidence.js:932–934`) and the triggering element receives focus on close (`evidence.js:954–956`), but there is no Tab/Shift+Tab cycling within the lightbox.
- **Specifics**:
  - In `evidence.js`, add a focus trap function (e.g., `trapFocus(container)`) that listens for `keydown` on `Tab`/`Shift+Tab` within the lightbox.
  - The trap should cycle between the close button (`.evidence-lightbox-close`) and the backdrop button (`.evidence-lightbox-backdrop`). The image element is not focusable.
  - Activate the trap in `openEvidenceLightbox` (after line 934) and deactivate it in `closeEvidenceLightbox` (before line 951).
  - Use the existing `focusElementWithRetry` pattern from `navigation.js` for robustness.
  - The lightbox already listens for Escape at document level (`evidence.js:1584–1588`). The trap should also activate on Escape to close and return focus.
- **Dependencies**: None. Self-contained change in `evidence.js`.

### R2 — About and Help overlay surfaces missing focus trap (P1 extension)

- **Priority**: HIGH
- **Category**: Accessibility (WCAG 2.1.1 Keyboard)
- **Description**: The About (`#aboutSurfaceMount`) and Help (`#helpSurfaceMount`) surfaces use `role="dialog"` and `aria-modal="true"` in the HTML (`trust-framework.html:449,553`) but have no focus trap in JS. Tab key escapes the modal to underlying content. The `aria-modal` attribute alone does not implement a focus trap in all browsers (it's a hint, not enforcement). Focus is moved to the dismiss button on open (`navigation.js:795–801`) and returned on close (`navigation.js:810–817`), but Tab is uncontrolled.
- **Specifics**:
  - In `navigation.js`, add a shared focus trap function that can be applied to the `.surface-card` element of any open overlay.
  - Activate in `setOverlaySurfaceOpen` when `isOpen` is true (after the `requestAnimationFrame` that focuses the dismiss button, around line 795).
  - Deactivate when closing (before the `requestAnimationFrame` that returns focus, around line 810).
  - Focusable elements within `.surface-card` include: dismiss button, tab buttons (About panel), and interactive elements in the surface body.
  - Escape handling already works correctly (`navigation.js:951–960`).
- **Dependencies**: Should be implemented alongside or before R1 since both address the same focus trap pattern. Consider extracting a shared `createFocusTrap()` utility.

### R3 — Context drawer inert scope missing on overlay surfaces (P3-03)

- **Priority**: MEDIUM
- **Category**: Accessibility
- **Description**: When the context drawer opens on narrow screens, the questionnaire panel correctly gets `inert` + `aria-hidden` (`navigation.js:586–593`). However, the About and Help overlay surfaces (`#aboutSurfaceMount`, `#helpSurfaceMount`) are not blocked. A keyboard user could Tab to a closed overlay surface's buttons (though they are `hidden`, their `display` toggling depends on animation completion — see `navigation.js:610–618` where `finishClose` runs after `animationend` or 250ms timeout). During that window, or if animation is suppressed by `prefers-reduced-motion`, the overlay surface could be visible and focusable.
- **Specifics**:
  - In `syncShellSurfaces` (`navigation.js:550–637`), when `contextDrawerOpen` is true, also set `inert` on `dom.aboutSurface` and `dom.helpSurface` elements.
  - Remove `inert` when the context drawer closes.
  - Add alongside the existing `inert`/`aria-hidden` logic for `dom.questionnairePanel` at lines 586–593.
- **Dependencies**: None. Localized change in `navigation.js`.

### R4 — Validation error messages lack visible element (P2-06)

- **Priority**: HIGH
- **Category**: Accessibility (WCAG 1.4.1 Use of Color)
- **Description**: Field groups receive `data-field-validation-state="invalid"` or `"attention"` which triggers color changes via CSS (`interaction-states.css:1134–1170`). The field label changes color and the control gets a tinted background, but there is no text-based error message explaining what's wrong. Users who cannot perceive color differences (or anyone confused about the meaning) have no guidance. The `.field-help` class exists for general help text but has no error variant.
- **Specifics**:
  - **CSS**: Add a `.validation-message` class in `interaction-states.css` (after line 1170) with: `color: var(--state-error); font-size: var(--text-sm); font-weight: 700; margin-top: 4px;` and a `.validation-message[data-field-validation-state="attention"]` variant using `var(--state-warning)`.
  - **JS**: In `field-handlers.js`, within the `syncFieldGroup` function (around line 390), check if `fieldState.validationState` is `"invalid"` or `"attention"` and render a `<p class="validation-message">` element after the field group's control element. The message text should come from `rules.js` validation rules or a generic fallback (e.g., "This field requires attention" / "This field is required").
  - **ARIA**: Associate the validation message with the field via `aria-describedby` — append the validation message's ID to the existing `aria-describedby` on the control (already set in `questionnaire-pages.js:1027, 1064, 1094`).
  - **Live region**: Consider using `aria-live="polite"` on the validation message so screen readers announce validation changes.
- **Dependencies**: Requires coordination between `field-handlers.js` (rendering), `interaction-states.css` (styling), and potentially `rules.js` (message content). The ARIA `aria-describedby` attribute is already set from `questionnaire-pages.js` so the plumbing exists.

### R5 — Missing `aria-current` on active nav indicator element

- **Priority**: LOW
- **Category**: Accessibility
- **Description**: The `.nav-indicator` element (`trust-framework.html:48`, styled in `components.css:77–85`) is a purely visual red underline. The active quick-jump button already has `aria-current="page"` set in JS (`sidebar.js:847`), which is correct. However, this was flagged in w3-plan as P3-06 to verify. Verification confirms it IS implemented correctly — no change needed for the button itself.
- **Status**: **Already correct.** The `aria-current="page"` attribute is set on the active `.nav-button` at `sidebar.js:847` and on the active `.page-index-button` at `sidebar.js:946`. No action needed.
- **Dependencies**: None.

### R6 — No skip-to-context-panel link (P3-07)

- **Priority**: MEDIUM
- **Category**: Accessibility (WCAG 2.4.1 Bypass Blocks)
- **Description**: The existing skip link targets `#questionnairePanel` (`trust-framework.html:26`). On the two-panel layout, the context panel (`#frameworkPanel`) is a significant content area that has no skip link. Keyboard users must Tab through the entire questionnaire panel header to reach the context panel. The context panel title is `#contextPanelTitle` (`trust-framework.html:289`).
- **Specifics**:
  - In `trust-framework.html`, after the existing skip link (line 26), add a second skip link:
    ```html
    <a href="#contextPanelTitle" class="skip-link">Skip to context panel</a>
    </a>
    ```
  - The existing `.skip-link:focus` CSS in `base.css:38–40` will apply. Both links are positioned absolutely at the same location; when focused, only the currently focused link is visible, so they won't visually overlap.
  - Add `id="contextPanelTitle"` to the existing `<h2>` at line 289 if not already present (it is present — confirmed).
- **Dependencies**: None. HTML-only change.

### R7 — Add Alt+Left/Alt+Right pager navigation shortcut (P3-08)

- **Priority**: LOW
- **Category**: Efficiency / keyboard accessibility
- **Description**: Alt+1–5 exists for principle jumps and Alt+T/R/U/S/C for code-prefix jumps (`keyboard.js:3–14`). There is no keyboard shortcut for pager prev/next navigation, which is the most frequent navigation action. The pager buttons are already accessible via Tab but require many keystrokes to reach.
- **Specifics**:
  - In `keyboard.js`, extend `handleDocumentKeydown` (lines 83–103) to also handle `ArrowLeft` and `ArrowRight` when Alt is held:
    ```js
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateToPage(null); // will need pager.navigateRelative
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        // will need pager.navigateRelative
        return;
      }
    }
    ```
  - This requires exposing `navigateRelative` from the pager controller to the keyboard module. Currently `keyboard.js` only receives `navigateToPage`. The pager's `navigateRelative` is created inside `navigation.js` (`pager.js:144–155`) and not exported. Options: (a) pass `navigateRelative` to `initializeKeyboardBehavior`, or (b) handle the shortcut directly in `navigation.js`'s keydown handler.
  - Option (b) is simpler: add the Alt+Arrow handling to the existing `handleDocumentKeydown` in `navigation.js:944–967`, alongside the Escape handler. The pager controller is already in scope.
- **Dependencies**: Depends on whether the shortcut is added to `keyboard.js` or `navigation.js`. Either way, the pager's `navigateRelative` must be accessible.

### R8 — Add context panel toggle keyboard shortcut (P3-09)

- **Priority**: LOW
- **Category**: Efficiency
- **Description**: Power users who want to maximize form width have no keyboard shortcut to toggle the context panel. They must click the "Context" button. Alt+1–5 shortcuts exist but there's no panel toggle shortcut.
- **Specifics**:
  - Add `Alt+C` to toggle the context sidebar. This could be added to `navigation.js`'s `handleDocumentKeydown` (lines 944–967):
    ```js
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'c') {
      const isCurrentlyOpen = selectShellSurfaceState(state, 'contextSidebar');
      setContextSidebarOpen(!isCurrentlyOpen, { trigger: null });
      return;
    }
    ```
  - Guard against Alt+C when a textarea is focused (the browser's copy shortcut). Only fire when `document.activeElement` is not a `textarea` or `input[type="text"]`.
  - Document in the Help surface's keyboard shortcuts table (`help-panel.js:358–370`).
- **Dependencies**: None. Localized change in `navigation.js`.

### R9 — Save/auto-save indicator UI (P2-07)

- **Priority**: MEDIUM
- **Category**: UX / trust
- **Description**: Users filling out 132+ fields across 10+ pages have no visible confirmation that their work is persisted. The app currently has no persistence layer (`evidence-storage.js` is a placeholder). Even without persistence, a visual indicator improves perceived reliability.
- **Specifics**:
  - Add a subtle status chip in the header (`.header-inner`) showing "All changes in memory" or similar. Since there is no persistence, the indicator is purely informational.
  - CSS: Small chip near the completion strip, using `.context-pin-button` styling as a base (monospace, uppercase, border). Position after the header progress summary.
  - JS: Create the element once in `sidebar.js` (alongside `ensureHeaderProgressSummary`) and update it on state change. Since all state is in-memory, the indicator is always "active" — no network calls.
  - This is intentionally a UI-only placeholder. Full persistence architecture is out of scope.
- **Dependencies**: Prerequisite: design decision on what the indicator should say given the in-memory-only state. No functional dependencies.

### R10 — Confirm dialog missing focus trap

- **Priority**: MEDIUM
- **Category**: Accessibility
- **Description**: The custom `confirmDialog` in `utils/confirm-dialog.js` uses `aria-modal="true"` and `role="dialog"` but has no focus trap. Tab escapes the dialog to the underlying page. The dialog has two buttons (Cancel and Confirm) and Escape closes it, but Tab is uncontrolled.
- **Specifics**:
  - Add a keydown listener in the `confirmDialog` function that traps Tab/Shift+Tab between the Cancel and Confirm buttons.
  - Activate when the dialog is appended to the DOM (after `confirmButton.focus()` at line 146).
  - Deactivate in `teardown` (before the dialog is removed, around line 114).
  - The trap is simple: only two focusable elements. On Tab from Confirm, focus Cancel. On Shift+Tab from Cancel, focus Confirm.
- **Dependencies**: None. Self-contained change in `confirm-dialog.js`.

### R11 — Text overflow handling for long field values

- **Priority**: LOW
- **Category**: Edge cases
- **Description**: Text inputs, textareas, and dropdown mock controls may receive very long values (long tool names, URLs, evidence notes). The `.mock-control .value` and `.evidence-item-name` elements use `min-width: 0` (inherited from flex parent) but no explicit overflow handling. Long file names in evidence items could break grid layout.
- **Specifics**:
  - `.evidence-item-name` (`components.css:837–840`) already has no overflow handling. Add `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` to prevent long filenames from breaking the evidence item grid.
  - `.mock-control .value` (`components.css:378–381`) should add `min-width: 0` and `overflow: hidden; text-overflow: ellipsis;` as a safety net.
  - `.evidence-file-link` (`components.css:829–835`) already has `overflow-wrap: anywhere` — this is correct.
  - Textarea controls inherently handle long text via scrolling. No change needed.
  - `.field-label` (`components.css:295–307`) has no overflow handling. Very long field labels (unlikely given schema, but possible) could break layout. Add `min-width: 0` and `overflow-wrap: break-word`.
- **Dependencies**: None. CSS-only changes.

### R12 — Missing `type="button"` on surface toggle buttons

- **Priority**: LOW
- **Category**: Accessibility (form submission prevention)
- **Description**: The Context toggle button in the questionnaire panel toolbar (`trust-framework.html:69`) and the top nav toggle buttons (`trust-framework.html:45–47`) all correctly have `type="button"`. This is correct. Flagging as verified-good — no change needed.
- **Status**: **Already correct.** All buttons in the HTML have `type="button"`. Dynamically created buttons in JS also set `type: "button"` (verified in `evidence.js`, `questionnaire-pages.js`, `sidebar.js`, `pager.js`).
- **Dependencies**: None.

### R13 — Lightbox backdrop button should have `role="button"`

- **Priority**: LOW
- **Category**: Accessibility
- **Description**: The `.evidence-lightbox-backdrop` element (`evidence.js:835–844`) is a `<button>` with `type="button"` and `aria-label="Close evidence preview"`. This is correct — it's a button element. No change needed.
- **Status**: **Already correct.** The backdrop is a `<button>` with proper ARIA attributes.
- **Dependencies**: None.

### R14 — No visible focus management on rapid page navigation

- **Priority**: LOW
- **Category**: Edge cases
- **Description**: Rapid Alt+1–5 key presses (or rapid pager clicks) could queue multiple `requestAnimationFrame` callbacks that compete for focus. The existing `focusElementWithRetry` has a retry limit of 3, which mitigates most race conditions. The page transition logic uses a 150ms timeout (`navigation.js:472`) to handle outgoing/incoming page swaps.
- **Specifics**: The current implementation is resilient enough. The retry limit prevents infinite focus loops. No change needed unless specific issues are observed.
- **Status**: **Already adequate.** The retry pattern and transition timing are well-designed.
- **Dependencies**: None.

### R15 — `data-surface-dismiss="contextSidebar"` on backdrop uses `hidden` attribute

- **Priority**: LOW
- **Category**: Edge cases
- **Description**: The context drawer backdrop (`trust-framework.html:58`) uses `hidden` and `aria-hidden="true"` attributes. When the backdrop is visible, `hidden` is removed in `navigation.js:581`. The backdrop is a `<div>`, not a button — it relies on the click handler registered on `documentRef` in `evidence.js:1592` (not the surface dismiss handler). Actually, the backdrop click is handled by `surfaceDismissButtons` in `navigation.js:900–920`, which does `button.closest('[data-surface-dismiss]')`. Since the backdrop is a `<div>` (not a button), `event.target.closest` would need to match the div itself. This works because `closest` returns the element itself if it matches.
- **Specifics**: Verify that the backdrop click handler correctly identifies the `data-surface-dismiss` attribute on a `<div>` element. The `surfaceDismissButtons` selector is `[data-surface-dismiss]` and uses `event.target.closest(...)`. The `<div>` element matches `[data-surface-dismiss="contextSidebar"]`, and `closest` returns the element itself — so this works. No change needed.
- **Status**: **Already correct.** `Element.closest()` returns the element itself if it matches the selector.
- **Dependencies**: None.

---

## Execution Priority Order

| Rank | ID  | Description                      | Priority | Effort      | Rationale                                                    |
| ---- | --- | -------------------------------- | -------- | ----------- | ------------------------------------------------------------ |
| 1    | R1  | Evidence lightbox focus trap     | HIGH     | Medium      | P1 from w3-plan. Most severe keyboard accessibility gap.     |
| 2    | R2  | About/Help overlay focus trap    | HIGH     | Medium      | Same pattern as R1. `aria-modal` without trap is incomplete. |
| 3    | R4  | Validation error messages        | HIGH     | Medium-High | WCAG 1.4.1 violation. Color-only error communication.        |
| 4    | R10 | Confirm dialog focus trap        | MEDIUM   | Low         | Same pattern as R1/R2. Simple two-element trap.              |
| 5    | R3  | Context drawer inert on overlays | MEDIUM   | Low         | Prevents edge case keyboard access to hidden overlays.       |
| 6    | R6  | Skip-to-context-panel link       | MEDIUM   | Trivial     | HTML-only change. One line.                                  |
| 7    | R9  | Save indicator UI                | MEDIUM   | Low-Medium  | Needs design decision on wording for in-memory state.        |
| 8    | R8  | Context panel toggle shortcut    | LOW      | Low         | Small JS change.                                             |
| 9    | R7  | Alt+←/→ pager shortcuts          | LOW      | Low         | Small JS change, needs pager access.                         |
| 10   | R11 | Text overflow for long values    | LOW      | Trivial     | CSS-only defensive improvement.                              |
| 11   | R5  | Verify aria-current on nav       | —        | —           | Already correct. No action needed.                           |
| 12   | R12 | Verify type="button" on buttons  | —        | —           | Already correct. No action needed.                           |
| 13   | R13 | Lightbox backdrop role           | —        | —           | Already correct. No action needed.                           |
| 14   | R14 | Rapid navigation focus races     | —        | —           | Already adequate. No change needed.                          |
| 15   | R15 | Backdrop click handler           | —        | —           | Already correct. No action needed.                           |

---

## Shared Utility Recommendation

Both R1, R2, and R10 require focus trap logic. Recommend extracting a shared `createFocusTrap(container, { activate, deactivate })` utility:

```js
// utils/focus-trap.js
export const createFocusTrap = (container, { onEscape } = {}) => {
  let active = false;
  const handleKeydown = (event) => {
    if (!active) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      const focusable = container.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
        }
      }
    }
    if (event.key === 'Escape' && onEscape) {
      onEscape(event);
    }
  };
  return {
    activate() {
      if (active) return;
      active = true;
      container.addEventListener('keydown', handleKeydown);
    },
    deactivate() {
      active = false;
      container.removeEventListener('keydown', handleKeydown);
    },
    destroy() {
      deactivate();
    },
  };
};
```

This can be imported by `evidence.js`, `navigation.js`, and `confirm-dialog.js` to avoid duplicating focus trap logic across three files.
