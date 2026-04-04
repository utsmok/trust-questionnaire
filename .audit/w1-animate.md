# Wave 1 — Animate Assessment

## Audit Summary

The TRUST Framework Questionnaire already has a **well-considered motion foundation**. Token-based durations (`--duration-instant`, `--duration-fast`, `--duration-normal`) and easing curves (`--ease-out-quart`, `--ease-out-quint`) are defined and consistently used. `prefers-reduced-motion` is handled at both the token level (zeroing durations) and the keyframe level (cancelling animations). Print styles correctly reset all transitions and animations.

This is a dense, instrument-like UI for domain experts. The motion philosophy should remain **functional feedback, not decoration**. Most of the findings below are refinements to an already-solid system rather than fundamental gaps.

---

## What's Already Good (Do NOT Change)

- **Token system**: Durations and easings in `tokens.css:217-221` are well-chosen values that match the skill's recommended ranges.
- **`prefers-reduced-motion`**: Comprehensive coverage in `animations.css:1-21` — zeros CSS variables AND uses `!important` as a safety net. The second block at line 64 adds element-specific overrides. This is thorough.
- **Print reset**: `print.css:84-98` correctly strips all transition/animation classes and resets opacity/transform.
- **Progress bar**: `layout.css:95-105` uses `transform: scaleX()` (GPU-accelerated) with `will-change: transform` — textbook correct.
- **Context drawer slide**: `layout.css:418-426` uses `transform: translateX()` for the drawer — correct GPU-only approach. The 280ms duration is appropriate for a panel slide.
- **Surface overlay**: `layout.css:328-344` uses `@keyframes` with opacity and `translateY` — clean fade+slide pattern. Duration 150ms/200ms is well-calibrated for overlays.
- **Rating dot confirm**: `animations.css:53-57` — the 1.25x scale pulse on rating selection is a subtle, purposeful confirmation. Exactly the kind of micro-interaction this UI needs.
- **Evidence item enter**: `animations.css:59-62` — 4px translateY + fade on new evidence items gives spatial context without being distracting.
- **Cell fill animation**: `animations.css:23-31` — scale(0.85) to scale(1) on completion strip cells is restrained and informative.
- **Section enter animation**: `animations.css:33-41` — simple opacity fade at 120ms is appropriately fast for form sections.
- **Page transitions**: `navigation.js:446-481` correctly checks `prefers-reduced-motion` before applying transition classes, with a 150ms timeout and double-RAF cleanup. The JS logic is clean.
- **Design alignment**: No bounce/elastic easings anywhere. No `width`/`height`/`top`/`left` layout property animations. Everything uses `transform` and `opacity`. This is exactly right.

---

## Recommendations

### R1 — Surface overlay has no exit animation

**Priority**: MEDIUM  
**Description**: When closing the About or Help surface overlay, `element.hidden` is set immediately (via `display: none`) in `navigation.js:602`, which kills any CSS transition. The `@keyframes surfaceFadeIn` and `surfaceSlideIn` only run on entry (`.shell-surface:not([hidden])`). The close is an instant disappear. For an overlay that users open/close frequently, the asymmetry is noticeable.  
**Specifics**:

- In `navigation.js` `setOverlaySurfaceOpen`, when `isOpen` is `false`, do not immediately set `hidden`. Instead add a CSS class like `.is-closing` that triggers a reverse animation, then set `hidden` after the animation completes (via `animationend` or a timeout matching the entry duration of 150ms).
- Add to `layout.css`:
  ```css
  .shell-surface.is-closing {
    animation: surfaceFadeOut var(--duration-fast) var(--ease-out-quart) forwards;
  }
  .shell-surface.is-closing .surface-card {
    animation: surfaceSlideOut var(--duration-normal) var(--ease-out-quart) forwards;
  }
  @keyframes surfaceFadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  @keyframes surfaceSlideOut {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(8px);
      opacity: 0;
    }
  }
  ```
- Add `animation: none` reset for `.shell-surface.is-closing` in `print.css`.
- Update `animations.css` `prefers-reduced-motion` block to also cancel `.shell-surface.is-closing` animations.
  **Dependencies**: None. Self-contained.

### R2 — Context drawer backdrop has no fade transition

**Priority**: LOW  
**Description**: The context drawer backdrop (`layout.css:391-396`) appears/disappears instantly via `hidden` attribute toggling. The drawer itself slides smoothly, but the backdrop pops in/out. This creates a subtle visual disconnect.  
**Specifics**:

- Add to `layout.css`:
  ```css
  .context-drawer-backdrop:not([hidden]) {
    animation: backdropFadeIn var(--duration-fast) var(--ease-out-quart);
  }
  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  ```
- For the exit, apply the same pattern as R1: use a `.is-closing` class with a `backdropFadeOut` keyframe, then set `hidden` after the animation ends.
- The drawer already has `transitionend` handling in `navigation.js:320-344`, so the backdrop close can piggyback on that same timer (320ms fallback).
  **Dependencies**: None. Independent of R1 but follows the same pattern.

### R3 — Rating option `is-just-selected` class is never removed

**Priority**: HIGH  
**Description**: The CSS at `interaction-states.css:1059-1065` applies a `border-left-width: 5px` and an animation to `.rating-option.is-just-selected`, but there is no mechanism to remove this class after the animation completes. Once a rating option is selected, it retains `is-just-selected` permanently, which means:

1. The `border-left-width: 5px` persists, visually conflicting with the `.selected` state's normal border.
2. If the user selects a different option in the same rating scale, the previously selected option keeps the class.

This should be a transient class removed after the animation ends (~150ms).  
**Specifics**:

- In `field-handlers.js` (or wherever rating option click is handled), after adding `is-just-selected`, schedule removal via `requestAnimationFrame` or a 150ms `setTimeout`:
  ```js
  option.classList.add('is-just-selected');
  setTimeout(() => option.classList.remove('is-just-selected'), 200);
  ```
- Alternatively, use the `animationend` event on the rating dot element.
  **Dependencies**: None. JS-only fix.

### R4 — Missing transition on `completion-badge` base state

**Priority**: LOW  
**Description**: The `.completion-badge` has a `transition` declaration at `components.css:346-350` for `color`, `border-color`, and `background`, which is good. However, the `just-completed` animation in `interaction-states.css:589-591` (`completePulse`) animates `border-color` only. If the badge also changes `background` or `color` on completion (which it does — the `data-progress-state` attributes change those properties), those changes happen instantly while the border pulses.  
**Specifics**: Consider either:
a) Extending `completePulse` to also animate `background-color` (same `var(--ut-navy)` → `var(--ut-border)` keyframes for background), or
b) Leaving as-is — the existing behavior is subtle enough that the inconsistency may not be perceptible. This is LOW priority.
**Dependencies**: None.

### R5 — `nav-button` active press state uses `filter: brightness()` instead of `background`

**Priority**: LOW  
**Description**: `interaction-states.css:49-51` uses `filter: brightness(0.92)` for `.nav-button:active`. This is functionally fine, but `filter` can trigger a separate compositing layer and may cause a brief paint on some browsers. Since `.nav-button` already has `background` and `border-color` in its transition list (`components.css:70-75`), a background darkening would be more consistent.  
**Specifics**: Replace with:

```css
.nav-button:active {
  background: color-mix(in srgb, var(--ut-grey) 80%, var(--ut-border));
}
```

**Dependencies**: None. CSS-only change.

### R6 — Reference drawer open/close has no animation

**Priority**: LOW  
**Description**: Reference drawers (`<details>` elements) open/close instantly via the native browser disclosure behavior. The `<details>` element's `[open]` state change at `interaction-states.css:1013-1015` only changes `background` with no transition. The content panel appears/disappears without any motion.  
**Specifics**: This is intentionally left as-is because:

1. The `<details>` element has limited animation support in CSS (no `height` auto-transition without JS).
2. Adding JS-based height animation would add complexity for little UX gain — these are reference panels, not the primary interaction surface.
3. The content is static reference material that users scan, not interactive.

**No action needed.** Noted for awareness. If animation is desired later, the modern approach would be `interpolate-size: allow-keywords` on the `<details>` content, but browser support is still limited.

### R7 — `sectionEnter` animation plays on every section on initial load

**Priority**: LOW  
**Description**: `interaction-states.css:103-108` applies `opacity: 0; animation: sectionEnter 120ms ...` to ALL `.doc-section` and `.form-section` elements. On initial page load, every section in the DOM (including hidden ones) runs this animation. Since only one section is visible at a time (others have `.is-page-hidden` with `display: none`), the animations on hidden sections are wasted.  
**Specifics**: This is harmless (browsers optimize animations on `display: none` elements), but for cleanliness, the initial `opacity: 0` could be scoped to only the initially-active section. The page transition system in `navigation.js:446-481` already handles showing/hiding correctly, so this is a very minor optimization.  
**No action needed** unless initial load performance becomes a concern.

### R8 — Consider a `--duration-slow` token for drawer/overlay exits

**Priority**: LOW  
**Description**: The current token set has `--duration-instant` (100ms), `--duration-fast` (150ms), and `--duration-normal` (200ms). The context drawer uses a hardcoded `280ms` in `layout.css:424`. The surface overlay fallback timer in `navigation.js:343` uses `320ms`. Having these as named tokens would improve consistency.  
**Specifics**: Add to `tokens.css`:

```css
--duration-slow: 280ms;
```

Then replace the hardcoded `280ms` in `layout.css:424` with `var(--duration-slow)`. The 320ms JS fallback timer could be derived as `Math.ceil(280 * 1.15)` or kept as-is since it's a JS safety margin.  
**Dependencies**: None. Token addition is non-breaking.

---

## Priority Summary

| ID  | Priority | Area                                   | Effort           |
| --- | -------- | -------------------------------------- | ---------------- |
| R3  | HIGH     | Rating selection feedback              | JS, small        |
| R1  | MEDIUM   | Surface overlay exit animation         | JS + CSS, medium |
| R2  | LOW      | Drawer backdrop fade                   | JS + CSS, small  |
| R4  | LOW      | Completion badge animation consistency | CSS, trivial     |
| R5  | LOW      | Button active state technique          | CSS, trivial     |
| R6  | LOW      | Reference drawer (no action)           | —                |
| R7  | LOW      | Section enter on load (no action)      | —                |
| R8  | LOW      | Duration token consistency             | CSS, trivial     |
