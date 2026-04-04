# Wave 1 Animation Recommendations

> For trust-framework.html and supporting CSS/JS.
> Design constraint: "Regimented functionalism" -- efficient, explicit, engineered.
> No decorative animations. Every motion must clarify state or confirm action.

## Guiding principles

1. **Motion clarifies, never decorates.** If removing an animation makes the interface equally clear, remove it.
2. **Use existing tokens.** All durations and easings reference `--duration-instant`, `--duration-fast`, `--duration-normal`, `--ease-out-quart`, `--ease-out-quint`. No new timing values.
3. **GPU-friendly properties only.** Animate `transform` and `opacity`. Avoid layout-triggering properties (`width`, `height`, `top`, `left`, `margin`, `padding`) except where `grid-template-rows` transitions are explicitly noted.
4. **prefers-reduced-motion already covered.** The existing zeroing in `states.css` handles this. Any new animation must work within that existing mechanism -- no separate `@media` blocks needed.
5. **No hover lift/translate effects.** Explicitly prohibited by design direction. Hover feedback uses `background` and `border-color` only.

---

## HIGH priority

### H1. Questionnaire page transition

**Problem:** `navigateToPage()` scrolls instantly (`behavior: 'auto'`) and `syncPageVisibility()` toggles `.is-page-hidden` (which is `display: none`). The user gets no sense of spatial movement between pages.

**Recommendation:** Crossfade outgoing and incoming pages using opacity. Do not animate scroll position.

**CSS -- add to `states.css`:**

```css
/* Page crossfade transition */
.form-section[data-page-id] {
  transition:
    opacity var(--duration-fast) var(--ease-out-quart);
}

.form-section.is-page-transitioning-out {
  opacity: 0;
}

.form-section.is-page-transitioning-in {
  opacity: 0;
}
```

**JS -- modify `navigation.js` syncPageVisibility:**

```js
// Replace the current instant toggle with a two-phase approach:
// 1. Add .is-page-transitioning-out to outgoing page
// 2. After --duration-fast (150ms), swap visibility classes
// 3. Add .is-page-transitioning-in to incoming page
// 4. Remove transition classes after another 150ms

function transitionToPage(root, outgoingId, incomingId) {
  const outgoing = outgoingId ? root.querySelector(`[data-page-id="${outgoingId}"]`) : null;
  const incoming = root.querySelector(`[data-page-id="${incomingId}"]`);

  if (outgoing) {
    outgoing.classList.add('is-page-transitioning-out');
  }

  setTimeout(() => {
    if (outgoing) {
      outgoing.classList.add('is-page-hidden');
      outgoing.classList.remove('is-page-transitioning-out');
    }
    if (incoming) {
      incoming.classList.remove('is-page-hidden');
      incoming.classList.add('is-page-transitioning-in');
      // Force reflow so the browser registers the starting opacity
      incoming.offsetHeight; // eslint-disable-line no-unused-expressions
      incoming.classList.remove('is-page-transitioning-in');
    }
  }, 150);
}
```

**Rationale:** 150ms crossfade is the minimum perceptible transition that still communicates "something changed." It respects the "efficient" constraint. No spatial movement (no slide) because pages are not spatially related in a linear way.

---

### H2. Surface overlay (About, Help) open/close

**Problem:** `aboutSurfaceMount` and `helpSurfaceMount` toggle between `display: none` and `display: flex` with no intermediate state. The surface appears and disappears abruptly.

**Recommendation:** Animate the surface card using opacity for the backdrop and a vertical translate for the card itself.

**CSS -- add to `layout.css`:**

```css
/* Surface overlay animation */
.shell-surface {
  /* Remove display: none toggle; use visibility + opacity instead */
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--duration-fast) var(--ease-out-quart),
    visibility var(--duration-fast) var(--ease-out-quart);
}

.shell-surface:not([hidden]) {
  opacity: 1;
  visibility: visible;
}

.surface-card {
  transform: translateY(8px);
  transition:
    transform var(--duration-normal) var(--ease-out-quart);
}

.shell-surface:not([hidden]) .surface-card {
  transform: translateY(0);
}
```

**JS -- modify `navigation.js` surface handling:**

The `[hidden]` attribute must be removed before the transition starts and added after it ends (for the close direction). Use a transitionend listener:

```js
function openSurface(element) {
  element.removeAttribute('hidden');
  // The CSS handles the rest.
}

function closeSurface(element) {
  element.addEventListener('transitionend', function handler(e) {
    if (e.target === element) {
      element.setAttribute('hidden', '');
      element.removeEventListener('transitionend', handler);
    }
  });
  // Trigger the CSS transition by adding the hidden-class state.
  // Since we use [hidden] for display:none, we need a two-phase approach:
  // 1. Add a closing class
  // 2. On transitionend, set hidden
  element.setAttribute('data-closing', '');
}

// Alternatively, the simpler approach: replace [hidden] toggling with
// a class-based system:
// .shell-surface.is-closed { opacity: 0; visibility: hidden; pointer-events: none; }
// .shell-surface { opacity: 1; visibility: visible; }
```

**Rationale:** 8px vertical translate provides a clear "rising into view" cue without being dramatic. The opacity fade on the backdrop provides context. Total time: 200ms (normal duration). This matches the existing context drawer pattern which already uses `transform` + `opacity`.

---

### H3. Rating scale selection confirmation

**Problem:** Rating options change `background` and `border-color` via CSS transitions, but the selected option has no tactile "lock" feeling. The dot fill and border change are subtle.

**Recommendation:** Add a brief scale pulse on the selected rating option's dot, and a border-width shift on the option itself.

**CSS -- add to `states.css`:**

```css
/* Rating selection confirmation pulse */
.rating-option.is-just-selected .rating-dot {
  animation: ratingDotConfirm var(--duration-fast) var(--ease-out-quint);
}

@keyframes ratingDotConfirm {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}

.rating-option.is-just-selected {
  border-left-width: 5px;
}
```

**JS -- add to `field-handlers.js` syncRatingOption:**

```js
// After adding the score-N class, briefly add is-just-selected:
if (isSelected) {
  option.classList.add('is-just-selected');
  option.addEventListener('animationend', () => {
    option.classList.remove('is-just-selected');
  }, { once: true });
}
```

**Rationale:** A 150ms dot pulse is the lightest possible confirmation -- it says "registered" without being playful. The border-width shift from 3px to 5px is a functional change (makes the active state more prominent) that happens to feel like a lock-in.

---

## MEDIUM priority

### M1. Reference drawer expand/collapse

**Problem:** Reference drawers use native `<details>/<summary>`. They open and close instantly. The content panel has no height animation.

**Recommendation:** Use a `grid-template-rows` transition for the panel height. This avoids height animation (layout thrashing) while still providing smooth expand/collapse.

**CSS -- add to `components.css`:**

```css
/* Animated reference drawer panels */
.reference-drawer {
  --drawer-content-height: 0fr;
}

.reference-drawer-panel {
  display: grid;
  grid-template-rows: var(--drawer-content-height);
  transition:
    grid-template-rows var(--duration-normal) var(--ease-out-quart);
}

.reference-drawer-panel > * {
  overflow: hidden;
}

.reference-drawer[open] {
  --drawer-content-height: 1fr;
}
```

**Note:** This requires the `open` attribute to be toggled by JS rather than the native `<details>` behavior, because the native toggle bypasses CSS transitions. Replace `<details>` with a JS-driven accordion:

```js
// In a new behavior module or in form-controls.js:
document.querySelectorAll('.reference-drawer').forEach(drawer => {
  const summary = drawer.querySelector('.reference-drawer-summary');
  const panel = drawer.querySelector('.reference-drawer-panel');

  summary.addEventListener('click', () => {
    const isOpen = drawer.hasAttribute('open');
    if (isOpen) {
      drawer.removeAttribute('open');
    } else {
      drawer.setAttribute('open', '');
    }
  });
});
```

**Rationale:** 200ms is fast enough to not feel slow, and the `grid-template-rows` trick avoids layout thrashing. This is the standard modern approach for accordion animations. The reference drawers contain important reference material; a smooth open helps users track which drawer they opened.

---

### M2. Criterion card focus-within emphasis

**Problem:** Criterion cards already transition `border-left-width` from 6px to 8px on `:focus-within`. This is subtle and easy to miss.

**Recommendation:** Also transition the card's inner content opacity slightly to create a "depth" effect.

**CSS -- add to `states.css`:**

```css
.criterion-card {
  transition:
    border-left-width var(--duration-fast) var(--ease-out-quart),
    border-color var(--duration-fast) var(--ease-out-quart),
    box-shadow var(--duration-fast) var(--ease-out-quart);
}

.criterion-card:focus-within {
  box-shadow: 0 0 0 1px var(--section-border);
}
```

**Rationale:** A 1px inset-like box-shadow using the section border color creates visual containment without a lift effect (no y-translate, no blur). It says "this card is active" functionally.

---

### M3. Field group visibility transition

**Problem:** `syncFieldGroup()` in `field-handlers.js` sets the `hidden` attribute directly on field groups when they appear/disappear based on conditional logic. This is instant.

**Recommendation:** For conditional field groups that appear/disappear based on form logic, use a brief opacity transition instead of instant hide.

**CSS -- add to `states.css`:**

```css
/* Conditional field reveal */
.field-group.is-conditionally-hidden {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  pointer-events: none;
  margin: 0;
  padding: 0;
  border-width: 0;
  transition:
    opacity var(--duration-fast) var(--ease-out-quart),
    max-height var(--duration-normal) var(--ease-out-quart);
}

.field-group {
  transition:
    opacity var(--duration-fast) var(--ease-out-quart);
}
```

**JS -- modify `field-handlers.js`:**

```js
// Instead of setting hidden attribute, toggle is-conditionally-hidden class:
function syncFieldGroup(group, isVisible) {
  if (isVisible) {
    group.classList.remove('is-conditionally-hidden');
    group.removeAttribute('hidden');
  } else {
    group.classList.add('is-conditionally-hidden');
    // After transition completes, add hidden for accessibility
    group.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'opacity') {
        group.setAttribute('hidden', '');
        group.removeEventListener('transitionend', handler);
      }
    });
  }
}
```

**Rationale:** Conditional field appearance is a key UX moment -- the user made a choice and the form responds. A 150ms fade communicates "the form adapted to your input." The `max-height` transition prevents layout jump.

---

### M4. Evidence item add/remove

**Problem:** Evidence items are added/removed via DOM manipulation with no visual feedback. Items appear and disappear instantly.

**Recommendation:** Add a brief entry animation for new evidence items and an exit animation for removed items.

**CSS -- add to `states.css`:**

```css
/* Evidence item entrance */
.evidence-item {
  animation: evidenceItemEnter var(--duration-normal) var(--ease-out-quart);
}

@keyframes evidenceItemEnter {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.evidence-item.is-removing {
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-fast) var(--ease-out-quart);
}
```

**JS -- modify evidence removal handlers:**

```js
// Before removing the DOM node, add is-removing class and wait:
function removeEvidenceItemWithTransition(element) {
  element.classList.add('is-removing');
  element.addEventListener('transitionend', () => {
    element.remove();
  }, { once: true });
}
```

**Rationale:** 4px vertical translate is subtle enough for "regimented functionalism" but provides clear directional feedback: items enter from below, exit upward. Combined with opacity, this reads as "added to list" / "removed from list."

---

### M5. Top accent bar color transition refinement

**Problem:** The top accent bar already transitions `background` on `--duration-normal`. This works, but the transition can feel slightly delayed when navigating quickly between sections.

**Recommendation:** Use the faster `--duration-fast` for the accent bar, since it is a global indicator and should feel responsive.

**CSS -- modify in `states.css`:**

```css
/* Change from --duration-normal to --duration-fast */
.top-accent {
  background: var(--active-section-accent-strong);
  transition: background var(--duration-fast) var(--ease-out-quart);
}
```

**Rationale:** The accent bar is a secondary signal; the page content itself should take priority. A faster bar transition prevents it from lagging behind the main content change.

---

## LOW priority

### L1. Checkbox state feedback enhancement

**Problem:** Checkboxes already have a `:has(input:checked)` style change with a `--duration-instant` background transition. This is fine but could be slightly more noticeable.

**Recommendation:** No change needed. The existing `background` transition at 100ms is appropriate. The `accent-color` styling and the background change together provide sufficient feedback. Adding any motion here would risk feeling decorative.

---

### L2. Page index active state transition

**Problem:** Page index buttons currently transition via `box-shadow` changes when becoming active. The `inset 0 2px 0` shadow appears instantly because it is applied via `.is-active` class with no explicit transition on `box-shadow`.

**Recommendation:** Add `box-shadow` to the existing transition properties on `.page-index-button`:

**CSS -- modify in `components.css`:**

```css
.page-index-button {
  /* Add to existing declarations */
  transition:
    background var(--duration-fast) var(--ease-out-quart),
    border-color var(--duration-fast) var(--ease-out-quart),
    box-shadow var(--duration-fast) var(--ease-out-quart);
}
```

**Rationale:** The shadow currently snaps. Adding it to the transition list makes the active indicator slide in smoothly. This is purely functional -- the shadow indicates which page is active.

---

### L3. Pager button disabled state

**Problem:** Pager buttons change to `opacity: 0.45` when disabled, but this happens instantly.

**Recommendation:** Add a transition on opacity:

**CSS -- modify in `states.css`:**

```css
.pager-button {
  transition:
    opacity var(--duration-fast) var(--ease-out-quart);
}
```

**Rationale:** A 150ms opacity fade when reaching the first or last page provides gentle feedback that the boundary was reached. Subtle enough to not be decorative.

---

### L4. Completion strip cell active outline

**Problem:** `.strip-cell.is-active` applies `outline: 1px solid` instantly. This is fine for initial load but when the active cell changes via scrolling, the outline jumps.

**Recommendation:** No outline transition. Outlines do not transition smoothly in most browsers, and the visual change is already accompanied by background/border transitions. Leave as-is.

---

### L5. Section kicker border-left transition

**Problem:** Section kickers change `border-left` color when the active section changes. This already transitions via inherited styles.

**Recommendation:** No change needed. The existing transition is sufficient.

---

## Summary table

| ID | Element | Change | Duration | Priority |
|----|---------|--------|----------|----------|
| H1 | Page transition | Crossfade opacity swap | 150ms | HIGH |
| H2 | Surface overlays | Opacity + 8px translateY | 200ms | HIGH |
| H3 | Rating selection | Dot scale pulse + border width | 150ms | HIGH |
| M1 | Reference drawers | grid-template-rows 0fr/1fr | 200ms | MEDIUM |
| M2 | Criterion card focus | 1px box-shadow | 150ms | MEDIUM |
| M3 | Conditional fields | Opacity + max-height | 150ms/200ms | MEDIUM |
| M4 | Evidence items | Enter/exit translateY + opacity | 150ms/200ms | MEDIUM |
| M5 | Top accent bar | Faster background transition | 150ms | MEDIUM |
| L2 | Page index button | Add box-shadow to transition | 150ms | LOW |
| L3 | Pager disabled | Opacity transition | 150ms | LOW |

## Implementation order

1. **H1, H2, H3** together -- these are the three highest-impact changes that affect the core interaction loop (navigating, opening overlays, scoring).
2. **M1** -- reference drawers are frequently used; the animation improves discoverability.
3. **M3, M4** -- conditional fields and evidence items affect form interaction quality.
4. **M2, M5** -- polish refinements.
5. **L2, L3** -- final touches.

## Tokens to add

No new timing tokens needed. All recommendations use existing `--duration-instant` (100ms), `--duration-fast` (150ms), `--duration-normal` (200ms) with `--ease-out-quart` or `--ease-out-quint`.

## Testing checklist

- [ ] All animations respect `prefers-reduced-motion: reduce` (verify zero durations in states.css apply)
- [ ] Page crossfade does not cause layout shift (only opacity changes)
- [ ] Surface overlay close properly sets `[hidden]` after transition for accessibility
- [ ] Reference drawer animation works after JS-driven toggle replaces native `<details>`
- [ ] Evidence item removal cleans up DOM node after exit transition
- [ ] Rating dot pulse does not interfere with keyboard focus indication
- [ ] Conditional field hide properly sets `[hidden]` after transition for screen readers
- [ ] Print stylesheet still disables all animations (verify print.css rules still apply)
- [ ] No animation causes content to be unreachable or invisible
- [ ] Fast navigation (clicking through pages rapidly) does not create animation artifacts
