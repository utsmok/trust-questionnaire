# Wave 1 — Animation Audit

**Skill:** /animate
**Target:** TRUST Framework Questionnaire SPA
**Brand personality:** Efficient, Explicit, Engineered
**Date:** 2026-04-05
**Revised:** Deep re-analysis after initial audit

---

## Executive Summary

The codebase already has a **well-considered motion foundation**. Token-based durations (`--duration-instant`, `--duration-fast`, `--duration-normal`) and easing curves (`--ease-out-quart`, `--ease-out-quint`) are defined in `tokens.css:317-321` and consistently used. `prefers-reduced-motion` is handled at the token level (zeroing durations), the keyframe level (cancelling animations), and in JS (`navigation.js:501`). Print styles correctly reset all transition and animation classes (`print.css:84-96`).

This is a dense, instrument-like UI for domain experts. Motion should remain **functional feedback only — never decoration**. The findings below are refinements to an already-solid system.

---

## Existing Animation Inventory (GOOD — do not change unless noted)

| Area                       | Implementation                                                                                                               | Location                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Duration/easing tokens     | `--duration-instant` (100ms), `--duration-fast` (150ms), `--duration-normal` (200ms), `--ease-out-quart`, `--ease-out-quint` | `tokens.css:317-321`                                          |
| Section enter              | `sectionEnter` keyframe — opacity 0→1, 120ms                                                                                 | `animations.css:33`, triggered in `interaction-states.css:69` |
| Completion strip cell fill | `cellFill` keyframe — scale 0.85→1, 200ms                                                                                    | `animations.css:23`                                           |
| Completion badge pulse     | `completePulse` keyframe — border/bg color sweep, 200ms                                                                      | `animations.css:43`                                           |
| Rating dot confirm         | `ratingDotConfirm` — scale 1→1.25→1, 150ms                                                                                   | `animations.css:55`                                           |
| Rating border confirm      | `ratingBorderConfirm` — inset box-shadow sweep, 200ms                                                                        | `animations.css:67`                                           |
| Evidence item enter        | `evidenceItemEnter` — opacity + translateY(4px), 200ms                                                                       | `animations.css:79`                                           |
| Evidence item remove       | `is-removing` class — opacity→0 + translateY(-4px), 150ms                                                                    | `interaction-states.css:1052-1058`                            |
| Page transitions           | Fade-out (150ms) → hide → show → fade-in (double-rAF), respects reduced-motion                                               | `interaction-states.css:1028-1038`, `navigation.js:493-532`   |
| Context drawer slide       | `transform: translateX(100%) → 0` + opacity, 280ms quint                                                                     | `layout.css:476-507`                                          |
| Top accent bar color       | `@property --top-accent-color` registered property, 400ms transition                                                         | `interaction-states.css:3`                                    |
| Progress bar               | `scaleX(0→value)` via transform, 200ms, `will-change: transform`                                                             | `layout.css:104-113`                                          |
| Panel scroll shadows       | `::before`/`::after` pseudo-element opacity transition                                                                       | `layout.css:183-213`                                          |
| Sidebar tab indicator      | `transform + width` transition, 200ms quint                                                                                  | `layout.css:427-438`                                          |
| Tooltips                   | Opacity fade-in 100ms, fade-out 75ms                                                                                         | `components.css:1044-1061`                                    |
| Section active state       | `@starting-style` for border-left-width 6→8px                                                                                | `interaction-states.css:120-125`                              |
| Page index active state    | `@starting-style` for background/box-shadow transition                                                                       | `interaction-states.css:904-909`                              |
| Checkbox item hover        | background-color transition at `--duration-instant`                                                                          | `interaction-states.css:679-681`                              |
| `prefers-reduced-motion`   | Global token zeroing + element-specific overrides, JS check in page transition logic                                         | `animations.css:1-21,90-103`, `navigation.js:501`             |
| Print                      | Resets all animation classes to no-op                                                                                        | `print.css:84-96`                                             |

---

## Recommendations

### R1 — Rating `is-just-selected` class IS already cleaned up (VERIFIED)

**Priority:** N/A — PREVIOUS AUDIT INCORRECT
**Description:** The previous audit claimed the `is-just-selected` class was never removed. This is incorrect. `field-handlers.js:232-236` shows:

```js
option.classList.add('is-just-selected');
const removeClass = () => option.classList.remove('is-just-selected');
option.addEventListener('animationend', removeClass, { once: true });
setTimeout(removeClass, 200);
```

The class is removed both on `animationend` AND via a 200ms fallback `setTimeout`. This is robust, defensive code. **No issue exists.**

---

### R2 — Context drawer backdrop has no transition (REAL ISSUE)

**Priority:** HIGH
**Description:** The context drawer slides in smoothly over 280ms (`layout.css:489-491`), but its backdrop (`context-drawer-backdrop`) uses `[hidden] { display: none }` (`layout.css:464-466`) which produces an instant show/hide. The drawer itself is a beautifully choreographed slide+fade, but the semi-transparent overlay behind it snaps on/off. This is the most visually jarring animation gap in the interface.

**Specifics:**

- File: `layout.css:457-466`
- The JS at `navigation.js:654-656` sets `dom.contextBackdrop.hidden = !contextDrawerOpen` alongside `dataset.drawerState = contextDrawerOpen ? 'open' : 'closed'`.
- **CSS change** — Replace the `display: none` approach with opacity + visibility:

```css
.context-drawer-backdrop {
  /* existing: position, inset, z-index, background remain unchanged */
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--duration-normal) var(--ease-out-quart),
    visibility 0ms var(--ease-out-quart) var(--duration-normal); /* visibility delays until opacity completes */
}

.context-drawer-backdrop[data-drawer-state='open'] {
  opacity: 1;
  visibility: visible;
  transition:
    opacity var(--duration-normal) var(--ease-out-quart),
    visibility 0ms var(--ease-out-quart) 0ms; /* visibility:visible is instant */
}
```

- **JS change** — In `navigation.js:654-656`, stop setting `hidden` on the backdrop. The `data-drawer-state` attribute already being set (`navigation.js:656`) drives the CSS transition.
- The transition duration (200ms via `--duration-normal`) is shorter than the drawer's 280ms, so the backdrop will be at full opacity before the drawer finishes sliding — this is correct (backdrop should be fully visible before the drawer content arrives).
- Reduced-motion is automatically handled because the global `prefers-reduced-motion` block in `animations.css:1-21` zeros `--duration-normal`, making both transitions instant.

**Dependencies:** Requires coordinated CSS + JS change. The `hidden` attribute removal must only apply to the backdrop, not to other elements that depend on `display: none`.

---

### R3 — Top accent color transition uses `ease` instead of design token

**Priority:** LOW
**Description:** `.top-accent` in `interaction-states.css:3` uses `transition: --top-accent-color 400ms ease`. This is the only place in the entire codebase that uses the CSS `ease` keyword instead of a design-system token. The `ease` curve (`cubic-bezier(0.25, 0.1, 0.25, 1)`) has a slow start that makes the color change feel slightly delayed — inconsistent with the decisive feel of the rest of the UI. Additionally, 400ms is longer than any token-defined duration (max is `--duration-normal` at 200ms).

**Specifics:**

- File: `interaction-states.css:3`
- Change from: `transition: --top-accent-color 400ms ease;`
- Change to: `transition: --top-accent-color 300ms var(--ease-out-quart);`
- The 5px accent bar is a subtle element — 300ms is fast enough to feel responsive but long enough to register the color change. `ease-out-quart` matches every other color transition in the system.
- Note: Since `--top-accent-color` uses `@property` registration (`tokens.css:4-8`) with `syntax: '<color>'`, the browser can interpolate the registered custom property. This works in Chrome/Edge/Safari. Firefox support for `@property` arrived in Firefox 128 (July 2024). In unsupported browsers, the color snaps — which is fine.

**Dependencies:** None.

---

### R4 — Checkbox checked state causes micro-layout-shift

**Priority:** LOW
**Description:** `.checkbox-item:has(input:checked)` in `interaction-states.css:694-701` changes `margin: -2px -4px` and adds `padding: 2px 4px` when a checkbox is checked. Only `background` is transitioned (line 701). The margin/padding change happens instantly, causing a 2px layout pop in each direction. While subtle, this is visible during rapid checkbox toggling and contradicts the principle of using only `transform` and `opacity` for animations.

**Specifics:**

- File: `interaction-states.css:694-701`
- The `.has-checked` class at lines 704-711 duplicates this with the same margin/padding change but no transition at all.
- **Recommended fix:** Apply the expanded margin/padding unconditionally to all `.checkbox-item` elements (compensating with negative padding), so the visual differentiation on checked state comes only from `background-color` and `color` changes (which are already transitioned). Alternatively, use `outline` or `box-shadow: inset` for the emphasis effect instead of margin/padding manipulation.
- Since this is a 2px shift on items with ~44px touch targets, the impact is very small. LOW priority.

**Dependencies:** None.

---

### R5 — Strip cell active state transition is slower than peer transitions

**Priority:** LOW
**Description:** `.strip-cell.is-active` uses `--duration-normal` (200ms) for its transitions (`interaction-states.css:1271-1275`), while all other strip-cell transitions use `--duration-fast` (150ms) (`components.css:45-48`, `interaction-states.css:1268-1270`). This may be intentional (active state change is more significant), but the 50ms difference makes the active cell feel slightly sluggish relative to hover/focus on neighboring cells.

**Specifics:**

- File: `interaction-states.css:1271-1275`
- If intentional, add a comment explaining why the active state uses a longer duration. Otherwise, align to `--duration-fast`.

**Dependencies:** None.

---

### R6 — Add `--duration-slow` token for panel-level animations

**Priority:** LOW
**Description:** The context drawer uses a hardcoded `280ms` in `layout.css:491`. The drawer's `transitionend` fallback timer in `navigation.js:384` uses `320ms`. These are the only non-token durations in the system. Adding a `--duration-slow` token would bring them into the token system.

**Specifics:**

- File: `tokens.css`, add: `--duration-slow: 280ms;`
- File: `layout.css:491`, change `280ms` to `var(--duration-slow)`
- This is non-breaking. The `prefers-reduced-motion` block in `animations.css:1-6` would need to also zero `--duration-slow`.

**Dependencies:** None. Additive.

---

### R7 — Sidebar collapse/expand has no transition (ACCEPT AS-IS)

**Priority:** NOT ACTIONABLE
**Description:** When the sidebar collapses, `grid-template-columns` changes between `minmax(0, 1fr) 28rem` and `minmax(0, 1fr)` (`layout.css:242-261`). Grid properties are not animatable in CSS. The layout snaps in one frame.

**Specifics:**

- Options considered:
  1. **Animate sidebar panel width with absolute positioning** — Fragile, creates layout complexity, doesn't match the grid-based architecture.
  2. **Use `interpolate-size: allow-keywords`** — Too new, unreliable browser support.
  3. **Fade the sidebar panel** — A 150ms opacity fade-out/in would soften the snap. But the framework panel already has `contain: layout style paint` (`layout.css:274`), which may interfere with opacity transitions on the element.
  4. **Accept it** — The snap is instant, consistent with "calibrated instrument" personality. Power users toggle the sidebar rarely and expect immediate response.
- **Recommendation:** Accept as-is. The instant layout change is fast and predictable. Do not add opacity hacks.

**Dependencies:** None.

---

### R8 — Reference drawer expand/collapse has no content animation (ACCEPT AS-IS)

**Priority:** NOT ACTIONABLE
**Description:** Reference drawers use native `<details>` elements. The `<details>` disclosure widget has limited animation support. The summary state change is already styled (`.reference-drawer.is-open` changes border at `interaction-states.css:999-1001`). The panel content appears instantly.

**Specifics:**

- The `is-open` class toggling at `reference-drawers.js:207` correctly tracks state.
- Content animation for `<details>` requires either JS height measurement or `interpolate-size` (experimental).
- Reference drawers are secondary UI — users interact with them occasionally for context, not as primary workflow.
- **Recommendation:** No action. The summary state change provides sufficient feedback.

**Dependencies:** None.

---

## What's Already Good (Explicitly Do NOT Change)

1. **No decorative animations** — No bounce, elastic, or spring easings anywhere. Everything uses `ease-out-quart` or `ease-out-quint`. This perfectly matches the "calibrated instrument" personality.

2. **GPU-only properties** — All animations use `transform` and `opacity`. No `width`, `height`, `top`, `left`, `margin`, or `padding` animations (the checkbox issue in R4 is a layout shift, not an animation). The progress bar correctly uses `scaleX` with `will-change: transform`.

3. **Button hover states** — Background and border-color transitions at `--duration-fast`. No scale, translate, or shadow lift. Correct per `.impeccable.md`: "No hover lift/translate effects."

4. **Page transition logic** — The 150ms fade-out → double-rAF fade-in pattern in `navigation.js:493-532` is well-engineered. It checks `prefers-reduced-motion`, uses `activeTimers` set for cleanup, and handles the edge case where the outgoing element may be null.

5. **Scroll behavior** — `scrollTo({ behavior: 'auto' })` in `navigation.js:736`. Smooth scrolling would feel laggy for power users. Correct.

6. **No entrance choreography** — No staggered reveal on page load. The `sectionEnter` 120ms opacity is the right level.

7. **Rating confirm animations** — `ratingDotConfirm` (scale pulse) + `ratingBorderConfirm` (box-shadow sweep) are purposeful, brief, and use `animationend` + fallback `setTimeout` for cleanup. Well-implemented.

8. **`contain: layout style paint`** on framework panel — Good performance isolation.

9. **Tooltip timing** — Entry at 100ms, exit at 75ms (faster exit than entry, per skill guidelines). Already handles `prefers-reduced-motion` with `transition: none` at `components.css:1068-1074`.

10. **`@starting-style`** — Used correctly for transitioning into pseudo-classes that don't have a natural "from" state (active section border width, active page index button). Modern CSS, progressive enhancement.

---

## Priority Summary

| ID  | Priority | Area                                 | Effort                  |
| --- | -------- | ------------------------------------ | ----------------------- |
| R2  | HIGH     | Context drawer backdrop transition   | Small (CSS + 1 JS line) |
| R3  | LOW      | Top accent easing alignment          | Trivial (1 CSS value)   |
| R4  | LOW      | Checkbox checked micro-layout-shift  | Small (CSS refactor)    |
| R5  | LOW      | Strip cell active timing consistency | Trivial (1 CSS value)   |
| R6  | LOW      | `--duration-slow` token addition     | Trivial (add token)     |
| R1  | N/A      | Rating cleanup (already correct)     | —                       |
| R7  | N/A      | Sidebar collapse (accept as-is)      | —                       |
| R8  | N/A      | Reference drawers (accept as-is)     | —                       |
