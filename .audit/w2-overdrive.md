# Wave 2 — Overdrive Assessment

## Context Filter

The TRUST Framework Questionnaire is a **dense, instrument-like professional tool** for academic evaluators at University of Twente. The design context (`.impeccable.md`) explicitly rejects:

- Gradient backgrounds and decorative blurs
- Soft shadows and rounded corners
- Consumer/social media aesthetics
- Anything that infantilizes or hand-holds

The brand personality is **Efficient, Explicit, Engineered**. The emotional goal is that reviewers feel **efficient and in control**.

This means "overdrive" for this project is NOT particle systems, shader effects, or scroll-driven parallax. It's about **pushing the information density and state-exposure system to feel like a precision instrument** — think: oscilloscope UI, IDE performance overlays, industrial HMI panels. The "wow" moment should come from **how state changes are made visible and tangible**, not from decorative effects.

---

## What's Already Good (Do NOT Change)

- **Token-based color system**: The `color-mix()` based accent families (`tokens.css:34-131`) are technically sophisticated — runtime color derivation without preprocessors. This is the right approach for a vanilla CSS project.
- **`prefers-reduced-motion` coverage**: Comprehensive and correct (`animations.css:1-26`).
- **GPU-accelerated transitions**: Progress bar uses `transform: scaleX()` (`layout.css:99`), drawer uses `transform: translateX()` (`layout.css:461`). All correct.
- **Wave 1 improvements**: Surface exit animations, button active states, font rendering — these are already in place and working.
- **The accent-scoping system** (`accent-scoping.css`): `body[data-active-accent-key]` drives CSS custom property swaps that cascade through `:where()` selectors. This is a genuinely sophisticated CSS-only architecture.
- **The completion strip**: Dense, information-rich, color-encoded per principle. Already excellent.
- **Panel scroll indicators**: Sticky pseudo-element gradients at panel edges (`layout.css:171-201`) — subtle and functional.

---

## Recommendations

### R1 — CSS `@property` animated accent transition on `.top-accent` bar

**Priority**: HIGH  
**Description**: The 8px top accent bar (`.top-accent`, `layout.css:4-10`) currently swaps color via a simple `background` transition when the active section changes. Using `@property` to register the color as a `<color>` type enables the browser to **interpolate between accent hues smoothly** instead of snapping. This turns a static indicator into a continuous, perceptible signal of navigation — a subtle but distinctive touch that makes the section-switch feel alive without being distracting.  
**Specifics**:

In `tokens.css`, add before `:root`:

```css
@property --top-accent-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #002c5f;
}
```

In `layout.css`, update `.top-accent`:

```css
.top-accent {
  position: fixed;
  inset: 0 0 auto 0;
  height: 8px;
  background: var(--top-accent-color);
  z-index: 30;
  transition: --top-accent-color 400ms ease;
}
```

In `accent-scoping.css`, within each `body[data-active-accent-key]` block, add:

```css
body[data-active-accent-key='tr'] {
  --top-accent-color: var(--tr);
}
body[data-active-accent-key='re'] {
  --top-accent-color: var(--re);
}
body[data-active-accent-key='uc'] {
  --top-accent-color: var(--uc);
}
body[data-active-accent-key='se'] {
  --top-accent-color: var(--se);
}
body[data-active-accent-key='tc'] {
  --top-accent-color: var(--tc);
}
/* default/control/setup already inherit --ut-primary */
```

This works because `@property` with `syntax: '<color>'` makes the custom property animatable. The 400ms duration gives a smooth hue sweep between sections (blue→green→purple→orange→teal) that is visually informative without being slow.

**Dependencies**: None. Self-contained CSS change. Fallback: browsers without `@property` support snap instantly (identical to current behavior).

---

### R2 — `@starting-style` animated entry for page-index active state

**Priority**: HIGH  
**Description**: When the user navigates between pages, the active page-index button (`.page-index-button.is-active`) currently receives its styling instantly. Using `@starting-style` (supported in all modern browsers), the active button can animate FROM its default state TO the active state — a background fill that sweeps in, making page transitions feel more deliberate. This is the CSS-native equivalent of what currently requires JS class juggling.  
**Specifics**:

In `interaction-states.css`, update `.page-index-button.is-active`:

```css
.page-index-button.is-active {
  transition:
    background 200ms var(--ease-out-quart),
    border-color 200ms var(--ease-out-quart),
    box-shadow 200ms var(--ease-out-quart);
}

@starting-style {
  .page-index-button.is-active {
    background: var(--ut-white);
    box-shadow: none;
  }
}
```

The same pattern applies to `.page-index-button[data-progress-state='in_progress']:not(.is-active)` and the other progress state variants — the inset `box-shadow` top accent bar can animate in via `@starting-style`.

**Dependencies**: None. Progressive enhancement — browsers without `@starting-style` skip the animation (current instant behavior).

---

### R3 — Animated score-bar via `@property` for completion strip cells

**Priority**: MEDIUM  
**Description**: The completion strip cells (`.strip-cell`) already have good color-coding via `data-progress-state`. A technically ambitious addition: register `--cell-fill` as a `@property <percentage>` and use it to drive a `clip-path: inset()` or `background-size` that visually fills the cell as progress changes. This would make the strip feel like a segmented bar chart that fills incrementally — highly appropriate for an "expose the machine" interface.  
**Specifics**:

In `tokens.css`:

```css
@property --cell-fill {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}
```

In `components.css`, update `.strip-cell`:

```css
.strip-cell {
  /* ... existing styles ... */
  --cell-fill: 0%;
  position: relative;
  overflow: hidden;
}

.strip-cell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--section-accent, var(--ut-navy));
  clip-path: inset(0 (100% - var(--cell-fill)) 0 0);
  transition: clip-path 300ms var(--ease-out-quart);
  z-index: 0;
}

.strip-cell .strip-cell-code {
  position: relative;
  z-index: 1;
}
```

Then set `--cell-fill: 100%` on `.strip-cell[data-progress-state='complete']` and `--cell-fill: 50%` on `.strip-cell[data-progress-state='in_progress']`. The `clip-path` transition is GPU-friendly and creates a smooth fill effect.

**Dependencies**: None. The `::before` pseudo-element requires `overflow: hidden` on `.strip-cell` — verify no content clips. The `z-index` stacking keeps text above the fill.

---

### R4 — Scroll-driven progress indicator on `.panel-progress-bar`

**Priority**: MEDIUM  
**Description**: The panel progress bar (`.panel-progress-bar`, `layout.css:95-105`) currently tracks section completion via `transform: scaleX()` driven by JS. An additional scroll-driven indicator using `animation-timeline: scroll()` could show **how far the user has scrolled within the current page**, providing dual-axis progress (completion + position). This serves the "expose state" principle — the user always knows where they are.  
**Specifics**:

In `layout.css`, add a sibling element or use the existing bar with a dual-layer approach:

```css
.panel-progress {
  position: sticky;
  top: 0;
  z-index: 5;
  height: 4px;
  background: color-mix(in srgb, var(--active-section-accent, var(--ut-blue)) 14%, var(--ut-white));
}

.panel-progress-scroll {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--active-section-accent, var(--ut-blue)) 40%, var(--ut-white));
  transform-origin: left;
  transform: scaleX(0);
  z-index: 6;
}

@supports (animation-timeline: scroll()) {
  .panel-progress-scroll {
    animation: scrollProgress linear;
    animation-timeline: scroll();
  }

  @keyframes scrollProgress {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }
}
```

The existing `.panel-progress-bar` (completion) stays as-is. The new `.panel-progress-scroll` (scroll position) overlays it at reduced opacity. This requires adding a `<div class="panel-progress-scroll">` inside `.panel-progress` in the HTML.

**Dependencies**: Requires minor HTML addition. Firefox does not support `animation-timeline: scroll()` — the `@supports` wrapper ensures no visual regression (the bar simply doesn't appear in Firefox). The JS completion bar remains the primary indicator.

---

### R5 — Animated border-left accent width on `.form-section` using `@starting-style`

**Priority**: MEDIUM  
**Description**: The `.form-section.is-active` state widens `border-left` from 6px to 8px (`interaction-states.css:113`). Currently this transition is defined but `border-left-width` is not in the transition property list (`interaction-states.css:105`). Adding `@starting-style` for the active state would make the left accent bar visually grow when a section becomes active — a satisfying micro-feedback for the dominant navigation action.  
**Specifics**:

Update `.form-section` transition in `interaction-states.css:105-108`:

```css
.doc-section,
.form-section {
  transition:
    border-left-color var(--duration-fast) var(--ease-out-quart),
    border-left-width var(--duration-fast) var(--ease-out-quart),
    background var(--duration-fast) var(--ease-out-quart);
}
```

Add `@starting-style`:

```css
@starting-style {
  .doc-section.is-active,
  .form-section.is-active {
    border-left-width: 6px;
  }
}
```

This makes the accent bar visibly "expand" on activation — a precision instrument metaphor where the active measurement indicator extends.

**Dependencies**: Must verify the transition property list doesn't cause layout thrashing. `border-left-width` changes trigger layout, but since these are `position: relative` block elements and the change is 2px, the performance impact is negligible.

---

### R6 — `backdrop-filter` enhancement on `.shell-surface`

**Priority**: LOW  
**Description**: The surface overlay already uses `backdrop-filter: blur(2px)` (`layout.css:327-328`). Increasing to `blur(4px)` and adding a subtle `saturate(0.8)` would create a more convincing depth separation without violating the anti-gradient principle — this is a functional depth cue, not decoration.  
**Specifics**:

```css
.shell-surface {
  /* ... existing ... */
  backdrop-filter: blur(4px) saturate(0.8);
  -webkit-backdrop-filter: blur(4px) saturate(0.8);
}
```

**Dependencies**: None. Minor visual refinement. `saturate(0.8)` desaturates the blurred background slightly, drawing more attention to the foreground card.

---

### R7 — SVG inline pattern for `.top-accent` bar (optional enhancement)

**Priority**: LOW  
**Description**: The 8px accent bar could use an inline SVG `<pattern>` as a subtle diagonal stripe texture layered behind the solid color via `background-image`. This would give the bar a "caution tape" or "engineering marking" quality appropriate to the instrument metaphor — visible at close inspection but not distracting at normal viewing distance.  
**Specifics**:

```css
.top-accent {
  background:
    repeating-linear-gradient(
      135deg,
      transparent,
      transparent 4px,
      color-mix(in srgb, var(--top-accent-color) 85%, black) 4px,
      color-mix(in srgb, var(--top-accent-color) 85%, black) 8px
    ),
    var(--top-accent-color);
}
```

This creates thin diagonal stripes at 85% of the accent color. Combined with R1's animated `--top-accent-color`, the stripes would transition hue along with the bar. Very subtle — only visible on the 8px strip.

**Dependencies**: Depends on R1 for the animated color variable. Works standalone with a static color too.

---

### R8 — Animated counter for `.pager-status` text via `font-variant-numeric: tabular-nums`

**Priority**: LOW  
**Description**: The pager status (`.pager-status`, `components.css:1364-1370`) already uses `font-family: var(--ff-mono)` for the page counter. An enhancement: when the page number changes, briefly animate the old number sliding up and the new number sliding in from below. This requires minimal JS (adding/removing a class) and a CSS `@starting-style` or keyframe approach.  
**Specifics**:

CSS:

```css
.pager-status {
  /* ... existing ... */
  overflow: hidden;
  height: 1.5em;
}

.pager-status-text {
  display: block;
  transition:
    transform 150ms var(--ease-out-quart),
    opacity 150ms var(--ease-out-quart);
}

.pager-status-text.is-exiting {
  transform: translateY(-100%);
  opacity: 0;
}

.pager-status-text.is-entering {
  transform: translateY(100%);
  opacity: 0;
}

@starting-style {
  .pager-status-text:not(.is-exiting):not(.is-entering) {
    transform: translateY(100%);
    opacity: 0;
  }
}
```

This would need JS to wrap the text in a `<span class="pager-status-text">` and toggle classes during page transitions.

**Dependencies**: Requires minor JS change in `pager.js` to wrap status text and trigger classes. Low effort but adds a polished feel to the most-used navigation element.

---

### R9 — CSS `transition-behavior: allow-discrete` for `display: none` toggling on overlays

**Priority**: LOW  
**Description**: Modern CSS (Chrome 117+, Firefox 129+, Safari 18+) supports `transition-behavior: allow-discrete`, which enables transitioning `display: none` to `display: block`. This could simplify the surface overlay show/hide by removing the need for the `is-closing` class pattern entirely — the overlay could transition from `display: none` to visible with opacity and transform, purely in CSS.  
**Specifics**:

```css
.shell-surface {
  display: none;
  opacity: 0;
  transform: translateY(8px);
  transition-behavior: allow-discrete;
  transition:
    opacity var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-normal) var(--ease-out-quart),
    display var(--duration-fast) allow-discrete;
}

.shell-surface:not([hidden]) {
  display: flex;
  opacity: 1;
  transform: translateY(0);
}

@starting-style {
  .shell-surface:not([hidden]) {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

This eliminates the need for `.is-closing` JS class management. However, browser support is not yet universal, so this should use `@supports (transition-behavior: allow-discrete)` as a progressive enhancement with the current `is-closing` pattern as fallback.

**Dependencies**: Would simplify R1 from w1-animate.md if adopted. Requires browser support check. Non-breaking fallback exists.

---

### R10 — Staggered `animation-delay` on `.strip-cell` initial render

**Priority**: LOW  
**Description**: On initial load, the completion strip cells all appear simultaneously. Adding a staggered `animation-delay` based on `nth-child` would create a wave-fill effect across the strip — cells lighting up sequentially from left to right. This is a one-time "first impression" animation that reinforces the instrument metaphor (like LED indicators booting up).  
**Specifics**:

```css
.strip-cell {
  animation: cellAppear 200ms var(--ease-out-quart) backwards;
}

.strip-cell:nth-child(1) {
  animation-delay: 0ms;
}
.strip-cell:nth-child(2) {
  animation-delay: 20ms;
}
.strip-cell:nth-child(3) {
  animation-delay: 40ms;
}
/* ... or use a CSS calc approach ... */
.strip-cell:nth-child(n) {
  animation-delay: calc(var(--i, 0) * 20ms);
}

@keyframes cellAppear {
  from {
    opacity: 0;
    transform: scaleX(0.7);
  }
}
```

The `--i` approach requires JS to set `--i` on each cell (or using the newer CSS `@property` approach). Total stagger for ~12 cells = 240ms — fast enough to not delay interaction.

**Dependencies**: Must be gated behind `prefers-reduced-motion` (already handled by the global animation kill in `animations.css`). The `cellFill` animation on `.just-filled` must not conflict.

---

## Explicitly Rejected Ideas

These were considered and rejected as inappropriate for this project's design context:

| Idea                                   | Why Rejected                                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canvas/WebGL background effects**    | Anti-pattern: "Gradient backgrounds and decorative blurs" are explicitly rejected in `.impeccable.md`                                              |
| **Scroll-driven parallax on sections** | Dense form UI with keyboard-first navigation — parallax would be disorienting and serve no informational purpose                                   |
| **Glassmorphism on cards/panels**      | "Soft shadows and large rounded corners" are anti-patterns; glass effects would undermine the flat, engineered aesthetic                           |
| **Particle systems or generative art** | Consumer/portfolio aesthetic. This is a professional evaluation tool, not a creative showcase                                                      |
| **Spring physics animations**          | The existing `ease-out-quart` and `ease-out-quint` curves are already well-chosen. Springs add complexity without matching the instrument metaphor |
| **Web Audio feedback**                 | Sound in a professional workplace tool would be inappropriate without explicit opt-in                                                              |
| **Mesh gradient backgrounds**          | Explicitly rejected: "Clean, flat backgrounds without gradients"                                                                                   |
| **Noise texture overlays**             | Adds visual complexity without informational value. The flat canvas (`--ut-canvas`) is intentional                                                 |

---

## Priority Summary

| ID  | Priority | Technique                             | Effort             | Impact                                            |
| --- | -------- | ------------------------------------- | ------------------ | ------------------------------------------------- |
| R1  | HIGH     | `@property` color animation           | CSS, small         | Smooth section-switch feedback on accent bar      |
| R2  | HIGH     | `@starting-style` entry animation     | CSS, small         | Page-index active state animates in               |
| R3  | MEDIUM   | `@property` + `clip-path` fill        | CSS, medium        | Completion strip becomes animated bar chart       |
| R4  | MEDIUM   | `animation-timeline: scroll()`        | CSS + HTML, medium | Dual-axis progress (completion + scroll position) |
| R5  | MEDIUM   | `@starting-style` border expand       | CSS, small         | Active section accent bar grows on activation     |
| R6  | LOW      | `backdrop-filter` refinement          | CSS, trivial       | Deeper surface overlay depth cue                  |
| R7  | LOW      | Diagonal stripe pattern               | CSS, trivial       | Engineering marking texture on accent bar         |
| R8  | LOW      | Counter slide animation               | CSS + JS, small    | Polished page number transitions                  |
| R9  | LOW      | `transition-behavior: allow-discrete` | CSS, medium        | Simplifies overlay show/hide pattern              |
| R10 | LOW      | Staggered cell appear                 | CSS, trivial       | Boot-up wave on completion strip                  |
