# Wave 5 — Adapt (Responsive Design Review)

**Date**: 2026-04-04
**Scope**: 1160px breakpoint, 760px breakpoint, 480px breakpoint, print layout, touch targets, overflow, readability
**Preceding waves**: W4 reduced header 138→118px, restructured header to grid, mobile header 196→168px

---

## Already Good — Do NOT Change

- **1160px drawer mode JS logic** (navigation.js:234-1033): The `matchMedia('(max-width: 1160px)')` listener correctly toggles `is-context-drawer-mode`, manages focus returns, handles Escape key, and closes context drawer when switching to overlay surfaces. This is well-engineered.
- **`prefers-reduced-motion` support** (animations.css): All transitions and animations are zeroed out. Section enter animations forced to `opacity: 1`. Excellent.
- **Skip links** (base.css:25-36): Properly positioned with `z-index: 50`, become visible on focus. Both questionnaire and context panels have skip-link targets.
- **Rating scale responsive grid** (components.css:452-456, 974-983, 996-999): 4-col → 2-col at 760px → 1-col at 480px. Clean progressive collapse.
- **Evidence intake grid** (components.css:626-629, 990-993): Collapses from 3-col to 1-col at 760px. Correct behavior.
- **Context drawer width** (layout.css:456): `min(34rem, calc(100vw - 12px))` with `max-width: 100%`. Well-guarded against viewport edge overflow.
- **Drawer backdrop** (layout.css:434-443): Properly positioned with `inset: var(--header-h) 0 0 0`, hidden/shown correctly.
- **`overscroll-behavior: contain`** on panels (layout.css:110): Prevents scroll chaining. Good touch behavior.
- **`100dvh` usage** (layout.css:108, 458): Uses dynamic viewport height for mobile browser chrome. Correct.
- **Print layout** (print.css): Hides shell chrome, strips panels to `display: block`, expands all hidden sections, resets animations, forces `page-break-before: always` on TRUST principle sections. Solid foundation.
- **`min-height: 44px`** on rating options, mock controls, context link buttons, evidence file rows — these meet WCAG 44px touch target minimum.

---

## Recommendations

### R1 — Header inner padding not reduced at 1160px

- **Priority**: MEDIUM
- **Description**: At 1160px the header still uses `padding: 10px 24px 8px` (layout.css:23). On tablets/laptops in this width range, the 24px horizontal padding consumes valuable space while the header grid has already collapsed (the context panel is now a drawer). Reducing horizontal padding at 1160px would give more room for the completion strip and nav buttons.
- **Specifics**: In `layout.css`, inside the existing `@media (max-width: 1160px)` block (line 486), add:
  ```css
  .header-inner {
    padding-inline: 16px;
  }
  ```
- **Dependencies**: None. The 760px rule (layout.css:208) already sets `padding-inline: 16px`, so this would just bring the 1160-760px range in line. Consider using 18px at 1160px if 16px feels too tight at that width.

### R2 — No visual indicator that context panel is a drawer below 1160px

- **Priority**: HIGH
- **Description**: When the viewport drops below 1160px, the context panel becomes a drawer that slides in from the right. The "Context" toggle button in the top nav looks identical to its desktop state — there is no affordance indicating that it opens a drawer. On desktop, clicking "Context" expands/collapses the right panel. Below 1160px, it opens a full-height overlay drawer. Users may not realize the interaction model changed.
- **Specifics**: In `layout.css`, inside `@media (max-width: 1160px)`, add a visual indicator to the Context toggle button when the drawer is closed:
  ```css
  .shell-layout.is-context-drawer-mode:not(.is-context-drawer-open)
    .nav-button[data-surface-toggle='contextSidebar']::after {
    content: '▸';
    margin-left: 4px;
    font-size: var(--text-xs);
  }
  ```
  Alternatively, if a CSS-only approach is too fragile, add a small "drawer" icon via JS in the navigation module when `isContextDrawerMode` is true. The button text could change from "Context" to "Context ▸" to signal drawer behavior.
- **Dependencies**: None. Pure CSS or minor JS change.

### R3 — Shell toolbar Context button hidden below 760px on questionnaire panel

- **Priority**: MEDIUM
- **Description**: The questionnaire panel header has a toolbar with a "Context" toggle button (trust-framework.html:70-71). At 760px, `.shell-toolbar { width: 100% }` (layout.css:518-520) gives it full width, but the button has no special mobile treatment. On small screens the panel header stacks (flex-wrap), so the Context button may end up alone on its own row with wasted space. More importantly, this Context button duplicates the one in the top nav, and below 1160px both exist. Below 760px, the questionnaire-panel Context button is redundant since the top nav Context button is always visible in the fixed header.
- **Specifics**: In `layout.css`, inside `@media (max-width: 760px)`, add:
  ```css
  .questionnaire-panel .shell-toolbar {
    display: none;
  }
  ```
  This removes the duplicate Context button on mobile, leaving only the one in the fixed header.
- **Dependencies**: None. The top-nav Context button (trust-framework.html:46) remains accessible.

### R4 — `field-grid` minmax(240px) can overflow on narrow screens

- **Priority**: MEDIUM
- **Description**: `.field-grid` uses `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` (components.css:272). On screens narrower than ~520px (after 14px panel padding on each side = 28px, plus form-section padding of 14px on each side = 28px, plus field-group padding of 12px on each side = 24px), the available width is roughly `viewport - 80px`. At 480px viewport, that's ~400px. `minmax(240px, 1fr)` with two columns requires 480px + gaps, so it should gracefully fall to 1 column. However, the 240px minimum is still quite wide for very narrow viewports (360-400px phones). A field group with a 240px input inside a 360px screen is fine as single-column, but the threshold for switching from 2-col to 1-col could be tighter.
- **Specifics**: In `components.css`, inside `@media (max-width: 760px)`, add:
  ```css
  .field-grid {
    grid-template-columns: 1fr;
  }
  ```
  This forces single-column field grids on mobile, ensuring no partial-column squeezing. The current behavior with `auto-fit` already handles this for most cases, but an explicit single-column rule at 760px is more predictable and avoids any edge case where `auto-fit` might produce a cramped 2-column layout between 480-520px.
- **Dependencies**: None. `.field-grid.single` already has `grid-template-columns: 1fr` and would override this.

### R5 — Evidence buttons below 44px touch target minimum

- **Priority**: HIGH
- **Description**: `.evidence-button`, `.evidence-remove-button`, and `.evidence-lightbox-close` all have `min-height: 36px` with `padding: 8px 10px` (components.css:722-724). At 36px height, these are 8px below the WCAG 2.5.8 / 44px minimum touch target guideline. On touch devices, 36px is small enough to cause accidental mis-taps, especially for remove/close actions that are destructive or modal-dismissing.
- **Specifics**: In `components.css`, change:
  ```css
  .evidence-button,
  .evidence-remove-button,
  .evidence-lightbox-close {
    min-height: 44px;
  }
  ```
  The existing `padding: 8px 10px` plus `min-height: 44px` will give adequate tap area. No other changes needed.
- **Dependencies**: None. This only increases the minimum height; existing padding keeps buttons visually proportional.

### R6 — Context pin/overview buttons below 44px touch target minimum

- **Priority**: MEDIUM
- **Description**: `.context-pin-button`, `.context-overview-button`, `.reference-pin-button`, and `.about-topic-button` all have `min-height: 36px` (components.css:1164). Same issue as R5 — these are interactive buttons that fall below the 44px touch target minimum. The pin toggle and overview navigation are used frequently in the context panel.
- **Specifics**: In `components.css`, change:
  ```css
  .context-pin-button,
  .context-overview-button,
  .reference-pin-button,
  .about-topic-button {
    min-height: 44px;
  }
  ```
- **Dependencies**: None.

### R7 — Evidence select and file inputs below 44px touch target minimum

- **Priority**: MEDIUM
- **Description**: `.evidence-select` and `.evidence-file-input` have `min-height: 38px` (components.css:677-678). Native `<select>` and `<input type="file">` controls need adequate tap area. 38px is 6px below the 44px guideline.
- **Specifics**: In `components.css`, change:
  ```css
  .evidence-select,
  .evidence-file-input {
    min-height: 44px;
  }
  ```
- **Dependencies**: None.

### R8 — `score-table` horizontal overflow on narrow screens

- **Priority**: HIGH
- **Description**: `.score-table` is `width: 100%` with `border-collapse: collapse` (components.css:207-215). The scoring table has 3 columns (Score, Label, Meaning). The "Meaning" column contains long descriptive text. On screens below ~500px, the table will overflow its container because `border-collapse` tables don't participate in CSS grid/flex containment, and there is no `overflow` or `table-layout: fixed` rule. The form section padding + panel padding further reduce available width.
- **Specifics**: In `components.css`, add to the `@media (max-width: 760px)` block:
  ```css
  .score-table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  ```
  This wraps the table in a scrollable container on mobile, preventing layout blowout while keeping the full table readable with horizontal swipe.
- **Dependencies**: None. This is a standard mobile table pattern.

### R9 — `context-route-grid` two-column layout not collapsed at 760px

- **Priority**: LOW
- **Description**: `.context-route-grid` uses `grid-template-columns: minmax(5.5rem, auto) minmax(0, 1fr)` (components.css:1193-1195). The info rows in the context route card (Mode, Topic, Focus, Workflow, Status, Required) use this 2-column definition-list layout. On very narrow screens inside the context drawer (which is `min(100vw - 8px, 34rem)` at 760px), the 5.5rem label column plus content column is fine. However, when the drawer opens on a 360px phone, the effective width is ~352px, which should still fit. This is a marginal concern.
- **Specifics**: No action needed now. Monitor if context route labels are truncated on 320px devices. If so, add `minmax(4.5rem, auto)` at 480px.
- **Dependencies**: None.

### R10 — Panel title text may truncate on narrow screens

- **Priority**: LOW
- **Description**: `.panel-title` uses `font-size: var(--text-display)` which is `2.25rem` (36px) (layout.css:131). With the panel title row including a completion badge, the title "Questionnaire — [long section name]" can exceed available width on narrow screens. The flex layout with `min-width: 0` (layout.css:150) allows text truncation, but the title is not explicitly set to truncate with ellipsis. The `text-transform: uppercase` and `letter-spacing: var(--ls-panel-title)` (0.12em) make uppercase text even wider.
- **Specifics**: In `layout.css`, add to `.panel-title`:
  ```css
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ```
  This ensures graceful truncation rather than wrapping or pushing the badge off-screen. The full title is still accessible via the `aria-labelledby` attribute on the panel.
- **Dependencies**: None.

### R11 — `header-progress-summary` overlaps completion strip at narrow widths

- **Priority**: MEDIUM
- **Description**: The `.header-progress-summary` is dynamically inserted after the completion strip in the header grid (sidebar.js:381-389). At 1160px, it gets `flex-basis: 100%` (interaction-states.css:1491-1495), causing it to take a full row. On mobile (760px), the completion strip also gets `width: 100%; order: 10` (components.css:975-979). Both elements take full rows in the header grid, but the progress summary has `min-width: min(24rem, 100%)` (interaction-states.css:1185) which is 384px. On a 375px phone, this is wider than the viewport. The `max-width: none` at 1160px overrides, but the `min-width` still constrains it below 384px viewports.
- **Specifics**: In `interaction-states.css`, inside the `@media (max-width: 1160px)` block (line 1490), change:
  ```css
  .header-progress-summary {
    min-width: 0;
    max-width: none;
    flex-basis: 100%;
  }
  ```
  The `min-width: 0` allows it to shrink below 24rem on very narrow screens. The progress text will wrap naturally since it's in `<p>` block elements.
- **Dependencies**: None. The `min-width: 0` at 1160px is the key fix.

### R12 — Print layout missing `@page` size specification

- **Priority**: LOW
- **Description**: `print.css` sets `@page { margin: 1.5cm; }` (print.css:5-7) but does not specify `size`. Without an explicit size, the browser defaults to the user's printer settings, which is usually correct. However, for a questionnaire that may be exported to PDF, explicitly setting `size: A4` ensures consistent pagination.
- **Specifics**: In `print.css`, change:
  ```css
  @page {
    margin: 1.5cm;
    size: A4;
  }
  ```
- **Dependencies**: None.

### R13 — Print layout does not expose page-index navigation state

- **Priority**: LOW
- **Description**: The page index column is hidden in print (`display: none` on `.page-index-column`, print.css:14). This is correct — the sidebar nav is interactive chrome. However, there is no print-visible replacement showing which page/section the printed content belongs to. The section headings (h2) inside each form-section provide this, so the content is identifiable. This is acceptable as-is.
- **Specifics**: No action needed. Section headings serve as print navigation context.
- **Dependencies**: None.

### R14 — `nav-button` padding creates inconsistent touch targets

- **Priority**: LOW
- **Description**: `.nav-button` has `padding: 8px 14px` (components.css:63) with no explicit `min-height`. The effective height depends on font-size (`var(--text-sm)` = 12px) + line-height + padding. At approximately `12px * 1.2 (default) + 16px = ~30px`, this is well below 44px. However, these are primarily keyboard-driven (per the design context: "Keyboard-first efficiency. Power users drive the interface.") and are used in the fixed header where space is constrained. Adding 44px height would break the header layout.
- **Specifics**: No action needed. These buttons are in the fixed header where vertical space is at a premium, and the design context explicitly prioritizes keyboard use. The completion strip cells (28px height) are similarly compact by design. Both are used by expert users on desktop. If touch use becomes a requirement, a separate mobile nav pattern would be needed.
- **Dependencies**: None.

### R15 — No `landscape` orientation handling

- **Priority**: LOW
- **Description**: The app uses `100dvh` which adapts to viewport changes including orientation, and the 1160px breakpoint catches most tablet landscape scenarios. However, on phones in landscape orientation, the viewport width may exceed 760px (triggering tablet layout) while the viewport height is very shallow (~300-400px). The fixed header at 118px (or 168px at 760px if the width is still >760px) consumes a significant portion of the available height, leaving very little scroll area for the questionnaire.
- **Specifics**: No new breakpoint needed. The existing `100dvh` and panel `overflow: auto` handle this acceptably. If landscape phone usability becomes an issue, consider reducing `--header-h` via a `@media (max-height: 500px)` query in a future wave.
- **Dependencies**: None. Flagged for future consideration.

### R16 — Drawer backdrop click area starts below header

- **Priority**: LOW
- **Description**: The context drawer backdrop uses `inset: var(--header-h) 0 0 0` (layout.css:436). This means the header area is not covered by the backdrop, so clicking the header while the drawer is open does not dismiss it. This is intentional — the header contains the Context toggle button which should remain clickable. However, the completion strip and nav buttons in the header are not inert while the drawer is open.
- **Specifics**: No action needed. The Escape key handler (navigation.js:992-995) closes the drawer, and the Context button toggles it. The header remaining interactive is correct behavior.
- **Dependencies**: None.

---

## Summary

| ID  | Priority | Area          | Action                                                             |
| --- | -------- | ------------- | ------------------------------------------------------------------ |
| R1  | MEDIUM   | Header        | Reduce header-inner padding at 1160px                              |
| R2  | HIGH     | Drawer UX     | Add visual indicator for drawer mode on Context button             |
| R3  | MEDIUM   | Mobile        | Hide duplicate Context button in questionnaire toolbar below 760px |
| R4  | MEDIUM   | Form layout   | Force single-column field-grid at 760px                            |
| R5  | HIGH     | Touch targets | Increase evidence buttons min-height to 44px                       |
| R6  | MEDIUM   | Touch targets | Increase context/reference/pin buttons min-height to 44px          |
| R7  | MEDIUM   | Touch targets | Increase evidence select/file inputs min-height to 44px            |
| R8  | HIGH     | Overflow      | Make score-table scrollable horizontally at 760px                  |
| R9  | LOW      | Layout        | Monitor context-route-grid on 320px devices                        |
| R10 | LOW      | Typography    | Add text-overflow ellipsis to panel-title                          |
| R11 | MEDIUM   | Header        | Fix header-progress-summary min-width at 1160px                    |
| R12 | LOW      | Print         | Add `size: A4` to @page rule                                       |
| R13 | LOW      | Print         | No action needed — section headings suffice                        |
| R14 | LOW      | Touch targets | No action needed — keyboard-first design                           |
| R15 | LOW      | Orientation   | Flagged for future — landscape phone height concern                |
| R16 | LOW      | Drawer UX     | No action needed — intentional behavior                            |

**HIGH**: R2, R5, R8 (3 items)
**MEDIUM**: R1, R3, R4, R6, R7, R11 (6 items)
**LOW**: R9, R10, R12, R13, R14, R15, R16 (7 items — mostly no-action-needed)
