# Wave 4 — Optimize Performance Recommendations

**Date**: 2026-04-04
**Scope**: CSS and JS performance analysis across all static assets
**Cross-reference**: w3-plan.md (P2-04, P2-05 assigned to /optimize)

---

## Things That Are Good — Do NOT Change

- **Event delegation**: `field-handlers.js` attaches `input`/`change`/`click` at the `questionnaireRenderRoot` level — correct and efficient.
- **Passive scroll listeners**: Both panel scroll handlers use `{ passive: true }` — no forced layout.
- **State change short-circuiting**: `store.js` compares normalized values via `areNormalizedValuesEqual` before committing — avoids redundant derivation cycles.
- **Subscriber early-exit**: `context-tracking.js` returns immediately if `activePageId` hasn't changed — prevents unnecessary hash writes.
- **MutationObserver throttling**: `navigation.js` debounces its MutationObserver via `observerPending` flag + `requestAnimationFrame` — prevents cascading re-renders.
- **Animation property choices**: All keyframe animations use only `opacity` and `transform` (GPU-composited) — no layout-triggering properties animated.
- **Reduced-motion support**: `animations.css` properly zeros all durations and overrides animations under `prefers-reduced-motion`.
- **`:where()` for accent scoping**: `accent-scoping.css:113` uses `:where()` for zero specificity — excellent for preventing cascade conflicts without perf cost.
- **No `will-change` abuse**: Only one `will-change: transform` on `.panel-progress-bar` — appropriate for the one element that animates continuously.
- **No images**: Zero image assets. CSS-only rendering means zero image decode/decode latency.
- **`font-display: swap`**: Google Fonts URL uses `display=swap` — prevents FOIT.
- **`100dvh` usage**: `layout.css` uses `calc(100dvh - var(--header-h))` for panels — correct mobile viewport handling without JS.

---

## Recommendations

### R1 — Remove `backdrop-filter: blur(2px)` from `.shell-surface`

- **Priority**: HIGH
- **Description**: The 2px blur on the surface overlay (`layout.css:327-328`) triggers per-frame compositing on the entire overlay area. The overlay background is already `color-mix(in srgb, var(--ut-text) 88%, var(--ut-grey))` — 88% opacity makes a 2px blur visually imperceptible. This is the only `backdrop-filter` in the codebase.
- **Specifics**: Delete `backdrop-filter: blur(2px);` and `-webkit-backdrop-filter: blur(2px);` from `layout.css:327-328`.
- **Dependencies**: None. This is P2-05 from w3-plan.md. Zero visual regression at 88% opacity.

---

### R2 — Remove unused `font-weight: 800` from Google Fonts URL

- **Priority**: HIGH
- **Description**: The font import at `trust-framework.html:9` requests `Inter:wght@400;700;800` but weight 800 is not used anywhere in screen CSS (the two remaining `font-weight: 800` in `components.css` are Wave 1 regressions assigned to `/normalize`). Removing weight 800 eliminates ~15-20KB of unused font data from the download.
- **Specifics**: Change `Inter:wght@400;700;800` to `Inter:wght@400;700` in `trust-framework.html:9`.
- **Dependencies**: Coordinate with `/normalize` — the two `font-weight: 800` in `components.css` should also change to 700.

---

### R3 — Transitioning `border-left-width` triggers layout recalculation

- **Priority**: MEDIUM
- **Description**: Three selectors transition `border-left-width` (a layout property, not GPU-composited):
  - `.doc-section, .form-section` — `border-left-width var(--duration-fast)` (`interaction-states.css:107`)
  - `.criterion-card` — `border-left-width var(--duration-fast)` (`interaction-states.css:841`)
  - `@starting-style .doc-section.is-active, .form-section.is-active` — sets initial `border-left-width: 6px` (`interaction-states.css:164`)

  Changing `border-left-width` during transitions forces the browser to recalculate layout for each animation frame. On a page with multiple sections/criteria visible, this can cause jank during page transitions.

- **Specifics**: Replace `border-left-width` transitions with `transform: scaleX()` on a pseudo-element, or use `outline` (which doesn't affect layout) for the active indicator. Alternatively, simply set `border-left-width` without transition and rely on the opacity fade for the perceived transition.

  Minimum viable fix: Remove `border-left-width` from the transition lists in `interaction-states.css:107` and `interaction-states.css:841`. The `@starting-style` block can remain (it only fires on first style application, not continuously).

- **Dependencies**: None. Visual change is subtle — the width snaps instead of animating.

---

### R4 — 219 `color-mix()` calls across CSS create computation at parse time

- **Priority**: LOW
- **Description**: `tokens.css` (90 calls), `interaction-states.css` (100 calls), `components.css` (19 calls), and `layout.css` (9 calls) use `color-mix(in srgb, ...)`. These are evaluated at CSS parse time and cached as computed values — they do NOT re-evaluate at runtime unless the variables they reference change. Since all inputs are static hex values or references to other static tokens, this is effectively zero ongoing cost.

  However, `color-mix()` is used inside `@keyframes completePulse` (`animations.css:51-56`), which IS evaluated per-frame during animation. The function references `var(--section-accent-strong)` and `var(--section-tint)` — these are `--active-section-*` tokens that change per-page via `body[data-active-accent-key]`. If the accent changes during the animation (unlikely but possible), the browser must re-evaluate the color-mix per frame.

- **Specifics**: No action needed for the 218 static `color-mix()` calls. For the 1 animated usage in `completePulse`, consider precomputing the colors or accepting the negligible cost (the animation is only 200ms).
- **Dependencies**: None.

---

### R5 — No CSS `contain` or `content-visibility` on off-screen sections

- **Priority**: MEDIUM
- **Description**: Hidden page sections use `display: none` (via `.is-page-hidden`), which is already optimal — the browser skips layout/paint for `display: none` elements. However, the context panel and its content (sidebar, reference drawers, framework docs) are always in the DOM even when hidden at narrow viewports (using `transform: translateX(100%)` + `visibility: hidden`).

  Adding `contain: layout style paint` to `.framework-panel` would allow the browser to skip layout recalculation of its contents when the panel is off-screen or collapsed.

- **Specifics**: Add to `layout.css`:
  ```css
  .framework-panel {
    contain: layout style paint;
  }
  ```
  Do NOT add to `.questionnaire-panel` — its content changes frequently and containment would inhibit style sharing.
- **Dependencies**: Verify that the context panel's reference drawers still open/close correctly with containment. The `overflow: auto` on `.panel` already creates a formatting context, so `contain` should be safe.

---

### R6 — Subscriber in `field-handlers.js` queries all field groups on every state change

- **Priority**: MEDIUM
- **Description**: The store subscriber in `field-handlers.js:838-856` runs on every state change (including UI-only changes like `setActivePage`). It queries `scope.querySelectorAll('.field-group[data-field-id]')` which traverses the active page's DOM. It also calls `syncPageSections`, `syncCriterionCards`, and `syncSectionMetaControls` which each run their own `querySelectorAll`.

  On a typical page with 10-20 field groups, this is 30-60 `querySelectorAll` calls per state change. Each keystroke in a text field triggers a state commit → notify → full DOM sync cycle.

- **Specifics**:
  1. Add a guard at the top of the subscriber to early-return when only `ui` changed (no `evaluation` or `derived` changes). The store passes both `nextState` and `previousState` — compare `nextState.evaluation === previousState.evaluation` and `nextState.derived === previousState.derived` to skip DOM sync for pure UI transitions.
  2. Cache the `querySelectorAll` results and only re-query when the active page changes (MutationObserver already fires for structural changes).
- **Dependencies**: Requires store subscriber to receive `(nextState, previousState)` — it currently does receive both per `store.js:549-553`. No API change needed.

---

### R7 — `syncCanonicalProgressDecorations` runs `querySelector` for each principle section on every state change

- **Priority**: LOW
- **Description**: `navigation.js:387-422` iterates over `PRINCIPLE_SECTION_IDS` (5 items) and calls `pageSectionsById.get()` + `section.querySelector('h2')` + `heading.querySelector('.completion-badge')` + `dom.completionStrip?.querySelector('.strip-cell[...]')` per iteration. This is already debounced via `requestAnimationFrame` (line 427), so it only runs once per frame. With only 5 iterations, the cost is negligible.

- **Specifics**: No action needed. The existing `requestAnimationFrame` debounce is appropriate.
- **Dependencies**: None.

---

### R8 — `syncFromState` calls 9 sync functions on every state change

- **Priority**: LOW
- **Description**: `navigation.js:639-658` calls `pager.sync`, `sidebar.sync`, `referenceDrawers.sync`, `aboutPanel.sync`, `helpPanel.sync`, `syncPageVisibility`, `syncActiveAccent`, `syncShellSurfaces`, `syncShellProgressState`, `syncPanelTitles`, `syncPanelMetrics` (×2), and `scheduleCanonicalProgressDecorations` — 13 function calls per state notification.

  Most of these are cheap (dataset writes, classList toggles). The `requestAnimationFrame` debounce on progress decorations (R7) helps. But `syncPageVisibility` iterates all page sections and calls `syncPageControlAvailability` which runs `querySelectorAll('.rating-scale')` and `querySelectorAll('.rating-option')` per section.

- **Specifics**: Low priority — the function calls are individually cheap and the total work is bounded by the small number of page sections (12). The main optimization opportunity is R6 (skip DOM sync for UI-only changes). No standalone action needed here.
- **Dependencies**: R6 partially addresses this.

---

### R9 — `ratingBorderConfirm` keyframe animates `border-left-width` (layout property)

- **Priority**: MEDIUM
- **Description**: `animations.css:72-82` defines `ratingBorderConfirm` which animates `border-left-width` from 2px → 5px → 3px over 200ms. This triggers layout recalculation on each frame. Combined with R3's `border-left-width` transition on the parent `.criterion-card`, there may be compounded layout work when a rating is selected near a criterion card that's also transitioning.

- **Specifics**: Replace with a `transform: scaleX()` animation on a pseudo-element overlay, or use `box-shadow` (composited) for the visual pulse. Minimum fix: change to animating `border-left-color` or `box-shadow` instead of width.
- **Dependencies**: None.

---

### R10 — No `font-display` on Google Fonts `JetBrains Mono`

- **Priority**: LOW
- **Description**: The Google Fonts URL (`trust-framework.html:9`) uses `display=swap` for the entire request, which applies to both Inter and JetBrains Mono. This is correct — both fonts will show fallback text immediately and swap when loaded. No issue here.

  However, JetBrains Mono is only used for `.ff-mono` elements (field IDs, codes, monospace data). Consider adding `<link rel="preload" href="..." as="font" type="font/woff2" crossorigin>` for Inter only (the body font) to speed up LCP text rendering.

- **Specifics**: Optional: self-host Inter and JetBrains Mono woff2 files with `<link rel="preload">`. This eliminates the Google Fonts redirect chain (DNS → TCP → CSS → font file). Expected LCP improvement: 200-500ms on cold loads.
- **Dependencies**: Requires font file hosting. Out of scope if the project intentionally uses Google Fonts CDN.

---

### R11 — CSS total size: 108KB uncompressed (4548 lines across 8 files)

- **Priority**: LOW
- **Description**: Total CSS payload is 108KB across 8 files. With gzip (typical 70-80% compression ratio), this is ~22-32KB transferred. The largest files are:
  - `interaction-states.css`: 41.7KB (1486 lines) — data-driven state styling
  - `components.css`: 32.8KB (1621 lines) — component definitions
  - `tokens.css`: 13.7KB (375 lines) — design tokens

  For a questionnaire app with 132+ fields and complex state styling, this is reasonable. There is no framework CSS overhead.

- **Specifics**: No action needed. The CSS is well-structured by layer. If compression becomes a concern, the only optimization would be minifying for production (out of scope for this project's no-build-step approach).
- **Dependencies**: None.

---

### R12 — JS total size: 502KB uncompressed (40+ modules)

- **Priority**: LOW
- **Description**: Total JS is 502KB across 40+ ES modules. With gzip, expect ~100-130KB transferred. The largest modules are:
  - `render/sidebar.js`: 50KB
  - `render/evidence.js`: 48.5KB
  - `render/questionnaire-pages.js`: 52.4KB
  - `config/questionnaire-schema.js`: 33.7KB
  - `config/rules.js`: 24.9KB
  - `config/sections.js`: 19.9KB
  - `behavior/navigation.js`: 33.3KB

  These are all loaded synchronously via ES module imports from `app.js`. The schema and rules are data-heavy (field definitions, validation rules) — they're large but simple object literals that parse quickly.

- **Specifics**: No action needed for the current architecture. If loading performance becomes a concern, the config modules (`questionnaire-schema.js`, `rules.js`, `sections.js`, `option-sets.js` — ~98KB combined) could be loaded lazily after initial render. But for a desktop-primary tool used by a single team, this is premature.
- **Dependencies**: None.

---

## Priority Summary

| ID  | Priority | Category | Effort  | Description                                                 |
| --- | -------- | -------- | ------- | ----------------------------------------------------------- |
| R1  | HIGH     | CSS      | Trivial | Remove `backdrop-filter: blur(2px)`                         |
| R2  | HIGH     | Loading  | Trivial | Remove `font-weight: 800` from Google Fonts URL             |
| R3  | MEDIUM   | CSS      | Low     | Stop transitioning `border-left-width` (layout thrashing)   |
| R9  | MEDIUM   | CSS      | Low     | Stop animating `border-left-width` in `ratingBorderConfirm` |
| R5  | MEDIUM   | CSS      | Trivial | Add `contain: layout style paint` to context panel          |
| R6  | MEDIUM   | JS       | Medium  | Skip DOM sync on UI-only state changes                      |
| R4  | LOW      | CSS      | None    | `color-mix()` in keyframes — acceptable cost                |
| R7  | LOW      | JS       | None    | Progress decoration queries — already RAF-debounced         |
| R8  | LOW      | JS       | None    | 13 sync functions — individually cheap                      |
| R10 | LOW      | Loading  | Medium  | Optional: self-host fonts with preload                      |
| R11 | LOW      | Bundle   | None    | CSS size reasonable for feature scope                       |
| R12 | LOW      | Bundle   | None    | JS size reasonable, lazy loading premature                  |

---

## Execution Order

1. **R1 + R2** — Trivial CSS/HTML deletes. Do first.
2. **R3 + R9** — Remove `border-left-width` from transition/animation lists. Test page transitions and rating selection visually.
3. **R5** — Add `contain` to `.framework-panel`. Test context panel rendering.
4. **R6** — Add early-return guard to `field-handlers.js` subscriber. Test all field types still sync correctly.

---

## Verification

After implementing:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all suites pass
3. Chrome DevTools Performance tab: no layout thrashing during page transitions
4. Chrome DevTools Performance tab: no layout thrashing during rating selection
5. Chrome DevTools Layers panel: no unexpected compositing layers
6. Network tab: Google Fonts request no longer includes `800` weight
7. Grep: zero `backdrop-filter` in CSS
8. Grep: zero `transition.*border-left-width` in CSS
9. Grep: zero `border-left-width` inside `@keyframes` (except `print.css` overrides)
10. Visual: surface overlay (about/help) looks identical without backdrop-filter
11. Visual: rating selection pulse still perceptible
12. Visual: page transitions still smooth
