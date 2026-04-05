# Wave 5 — Adapt (Responsive Design Validation)

**Date**: 2026-04-05
**Scope**: 1160px drawer breakpoint, 760px/480px sub-breakpoints, touch targets, overflow, readability, W1–W4 regression check
**Preceding waves**: W1–W4 applied. Header restructured to grid, header height reduced to 118px, evidence/context button touch targets fixed to 44px, field-grid single-column forced at 760px, score-table horizontal scroll added at 760px, print `size: A4` added.

---

## Already Good — Do NOT Change

- **1160px drawer mode JS logic** (`navigation.js:17,293-1014`): `matchMedia('(max-width: 1160px)')` listener correctly toggles `is-context-drawer-mode`, manages focus returns, handles Escape key, closes drawer on surface switches, updates `aria-label` on the sidebar toggle button. Well-engineered.
- **Drawer CSS transition** (`layout.css:476-515`): `transform translateX(100% + 3px)` → `translateX(0)` with `ease-out-quint` easing. Opacity fade synchronized. `visibility` with transition-delay pattern prevents flash. Correct.
- **Drawer width clamping** (`layout.css:487`): `min(34rem, calc(100vw - 12px))` prevents drawer wider than viewport. At 760px it expands to `min(100vw, calc(100vw - 8px))`. Well-guarded.
- **`prefers-reduced-motion`** (`animations.css:1-22,93-106`): All transitions and animations zeroed out. Section enter animations forced to `opacity: 1`. Rating dot confirm and evidence item enter animations disabled. Excellent.
- **Skip links** (`base.css:25-36`): Two skip links (questionnaire + context panel), `z-index: 50`, visible on focus. Both targets have `tabindex="-1"` in HTML.
- **Rating scale progressive collapse** (`components.css:490-495,1130-1148,1161-1165`): 4-col → 2-col at 760px → 1-col at 480px. Clean.
- **Evidence intake grid collapse** (`components.css:664-675,1145-1148`): 3-col → 1-col at 760px. Correct.
- **Field-grid single-column at 760px** (`components.css:1150-1152`): Explicit `grid-template-columns: 1fr` override. Reliable.
- **Score-table horizontal scroll at 760px** (`components.css:1154-1158`): `display: block; overflow-x: auto; -webkit-overflow-scrolling: touch`. Standard pattern.
- **`overscroll-behavior: contain`** on panels (`layout.css:120`): Prevents scroll chaining. Good touch behavior.
- **`100dvh` usage** (`layout.css:118,489`): Dynamic viewport height for mobile browser chrome.
- **Panel progress bar** (`layout.css:96-114`): Sticky `top: 0` within the panel, `scaleX` transform for smooth animation. Works at all widths.
- **Print layout** (`print.css`): Hides chrome, expands sections, resets animations, `size: A4`, `page-break-before` on principle sections. Solid.
- **Touch targets already at 44px**: `.strip-cell` (44px), `.mock-control` (44px), `.rating-option` (44px), `.evidence-button/.evidence-remove-button/.evidence-lightbox-close` (44px), `.context-pin-button/.context-overview-button/.context-link-button/.about-topic-button` (44px), `.tooltip-trigger-btn` (44px×44px), `.evidence-file-row` (44px). All confirmed in current CSS.
- **Workspace layout collapse at 1160px** (`layout.css:554-556`): `grid-template-columns: 1fr` with `position: static` on page-index-column. Page index stacks above questionnaire workspace. Correct.
- **Header progress summary at 1160px** (`interaction-states.css:1456-1461`): `min-width: 0; max-width: none; flex-basis: 100%`. Allows shrinking on narrow screens.
- **Context drawer dismiss button** (`layout.css:171-174,506-508`): `display: none` by default, `display: inline-flex` in drawer mode. Correctly shown/hidden.
- **Sidebar tab indicator** (`layout.css:426-438`): Absolutely positioned, animated width/transform. Works in both sidebar and drawer contexts.
- **Shell divider hidden in drawer mode** (`layout.css:259-261,537-539,576-578`): Hidden when sidebar collapsed, at 1160px, and in drawer mode. Correct at all breakpoints.

---

## Recommendations

### R1 — `.evidence-file-button` touch target below 44px minimum

- **Priority**: HIGH
- **Description**: The file selection button (`.evidence-file-button`, `components.css:713-729`) has `padding: 4px 10px` and no `min-height`. Effective height is approximately 12px × 1.2 line-height + 8px padding = ~22px — well below the 44px WCAG touch target minimum. This is the "Attach file" / "Choose file" button in the evidence intake area. Prior W1–W4 fixes corrected `.evidence-button`, `.evidence-remove-button`, and `.evidence-lightbox-close` to 44px, but missed this sibling control.
- **Specifics**: In `components.css`, change:

  ```css
  /* Before */
  .evidence-file-button {
    padding: 4px 10px;
  }

  /* After */
  .evidence-file-button {
    min-height: 44px;
    padding: 4px 10px;
  }
  ```

  File: `components.css:713-729`. Add `min-height: 44px` to the existing `.evidence-file-button` rule block.

- **Dependencies**: None. Purely additive. No layout impact — the button sits inside `.evidence-file-control` which is a flex row with `gap: 8px`. The taller button will align with the adjacent file name text.
- **Affected viewports**: All. Touch targets should meet 44px regardless of screen size per `.impeccable.md` accessibility requirements.

### R2 — `.sidebar-tab` touch target below 44px minimum

- **Priority**: HIGH
- **Description**: The sidebar tab buttons (Guidance / Reference / About) have `padding: 10px 16px 8px` (`layout.css:399`) with no `min-height`. Effective height is ~12px × 1.2 + 18px = ~32px. At the 1160px drawer breakpoint, the context panel becomes a touch-accessible drawer overlay. These tabs are the primary navigation within that drawer. On tablet-sized touch screens (768–1160px), 32px tabs are difficult to tap accurately.
- **Specifics**: In `layout.css`, change:

  ```css
  /* Before (layout.css:399) */
  .sidebar-tab {
    padding: 10px 16px 8px;
  }

  /* After */
  .sidebar-tab {
    min-height: 44px;
    padding: 10px 16px 8px;
  }
  ```

  File: `layout.css:395-415`. Add `min-height: 44px` to the existing `.sidebar-tab` rule block.

- **Dependencies**: None. The sidebar tab bar uses `display: flex; align-items: stretch` so tabs will share the new height. The tab indicator (`layout.css:426-438`) uses absolute positioning relative to the tab bar, so it will adjust naturally.
- **Affected viewports**: Critical at 760–1160px (drawer mode on tablets). Also relevant on all widths since tabs exist in the sidebar too.

### R3 — `.pager-button` touch target below 44px minimum

- **Priority**: MEDIUM
- **Description**: Previous/Next page navigation buttons have `padding: 10px 16px` (`components.css:1520-1534`) with no `min-height`. Effective height is ~12px × 1.2 + 20px = ~34px. These are the primary page-to-page navigation controls. At 760px, the pager shell stacks vertically (`components.css:1738-1745`), and the Previous/Next buttons sit on separate rows — making them more likely to be tapped on small screens.
- **Specifics**: In `components.css`, change:

  ```css
  /* Before (components.css:1520-1534) */
  .pager-button {
    padding: 10px 16px;
  }

  /* After */
  .pager-button {
    min-height: 44px;
    padding: 10px 16px;
  }
  ```

  File: `components.css:1520-1534`. Add `min-height: 44px` to the existing `.pager-button` rule block.

- **Dependencies**: None. The pager shell uses `display: grid; align-items: center`, so the taller buttons will expand the grid row. The pager shell has no fixed height.
- **Affected viewports**: Most critical at ≤760px where the pager stacks vertically. The design context states "Keyboard-first efficiency" but the accessibility requirement in `.impeccable.md` explicitly requires 44px minimum touch targets.

### R4 — Header height estimate may be inaccurate between 760–1160px

- **Priority**: MEDIUM
- **Description**: The `--header-h: 118px` token (`tokens.css:287`) is used for `inset` on the shell layout, drawer backdrop, and drawer panel. At `max-width: 760px`, it's overridden to `168px` (`layout.css:217`). Between 760–1160px, the header stays at `118px`. However, the completion strip can wrap to 2 rows when viewport is ~780–900px (12 section cells at `min-width: 3.2rem` each = ~614px minimum, plus divider and toggle button ≈ 130px = ~744px total). In a 800px viewport with 36px header padding, the header-bar grid column gets ~580px. The strip wraps internally to 2 rows (~98px height), making the total header ~126px — exceeding the 118px estimate by ~8px. This causes the fixed shell to overlap the header bottom edge.
- **Specifics**: In `layout.css`, inside the `@media (max-width: 1160px)` block (line 532), add:
  ```css
  :root {
    --header-h: 130px;
  }
  ```
  This gives 12px of breathing room for strip wrapping between 760–1160px. The 760px override (`--header-h: 168px`) remains unchanged. Alternatively, a more robust approach: set `--header-h: 118px` at 1160px (unchanged) and add a separate rule at `max-width: 900px`:
  ```css
  @media (max-width: 900px) {
    :root {
      --header-h: 138px;
    }
  }
  ```
  This avoids penalizing the 900–1160px range where the strip likely fits in one row.
- **Dependencies**: This affects the shell layout position, drawer backdrop position, and drawer panel position — all use `var(--header-h)`. All will adjust consistently. The `760px` override must remain at `168px`.
- **Affected viewports**: ~780–900px. At wider widths (>900px), the strip fits in one row. At narrower widths (<760px), the `168px` override handles it.

### R5 — `.context-anchor-button` has no explicit min-height

- **Priority**: MEDIUM
- **Description**: The context anchor buttons in the sidebar/drawer use `padding: 8px 10px` (`components.css:1437-1450`) with no `min-height`. The effective height depends on content (`.context-anchor-label` + `.context-anchor-code`). For short labels, the button could be ~32px tall. These are interactive navigation elements in the context panel that users tap to jump to specific criteria. In drawer mode (760–1160px), they're the primary way to navigate within a section's context.
- **Specifics**: In `components.css`, change:

  ```css
  /* Before (components.css:1437-1450) */
  .context-anchor-button {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px;
    align-items: start;
    padding: 8px 10px;
    ...
  }

  /* After */
  .context-anchor-button {
    min-height: 44px;
    ...
  }
  ```

  Add `min-height: 44px` to the existing `.context-anchor-button` rule block at `components.css:1437`.

- **Dependencies**: None. The anchor list uses `display: grid; gap: 8px`, so taller buttons simply expand their grid row.
- **Affected viewports**: All. Most critical in drawer mode (≤1160px).

### R6 — Header inner padding not reduced at 1160px breakpoint

- **Priority**: LOW
- **Description**: At 1160px, the context panel becomes a drawer and the workspace layout collapses to single-column, but the header inner padding remains at the desktop default `padding: 10px 24px 8px` (`layout.css:20`). At 760px it's reduced to `16px` inline. Between 760–1160px, the 24px padding (48px total horizontal) consumes space that could be used by the completion strip. This isn't a breakage — the strip wraps gracefully — but reducing padding at 1160px would give the strip more room and reduce the likelihood of 2-row wrapping (see R4).
- **Specifics**: In `layout.css`, inside the existing `@media (max-width: 1160px)` block (line 532), add:

  ```css
  .header-inner {
    padding-inline: 18px;
  }
  ```

  File: `layout.css:532-561`. This matches the intermediate value already present in the block at line 546 (the 1160px block already sets `padding-inline: 18px` — wait, let me re-check).

  **Correction**: The 1160px block already has `.header-inner { padding-inline: 18px; }` at `layout.css:545-547`. This is already implemented. **No change needed.**

- **Dependencies**: N/A — already implemented.
- **Affected viewports**: 760–1160px.
- **Status**: ALREADY ADDRESSED. Prior wave applied this. Removing from action list.

### R7 — No drawer-mode visual indicator on sidebar toggle button below 1160px

- **Priority**: LOW
- **Description**: When the viewport drops below 1160px, clicking the "Sidebar" toggle opens a drawer overlay instead of expanding/collapsing an inline panel. The button text and appearance are identical to the desktop state. Users who resize their browser may not realize the interaction model changed. The JS does update the `aria-label` to "Open sidebar drawer" vs "Toggle sidebar panel" (`navigation.js:993-996`), which is good for screen readers, but there's no visual affordance for sighted users. At 760px, a CSS rule adds a `▸` triangle indicator (`layout.css:584-588`), but this only applies to `is-sidebar-collapsed:not(is-context-drawer-open)` — i.e., when the sidebar is collapsed and drawer is closed, below 760px.
- **Specifics**: Extend the existing 760px indicator to the 1160px breakpoint. In `layout.css`, inside the `@media (max-width: 1160px)` block, add:
  ```css
  .shell-layout.is-sidebar-collapsed:not(.is-context-drawer-open)
    .nav-button[data-sidebar-toggle]::after {
    content: '\25B8';
    margin-left: 4px;
    font-size: var(--text-xs);
  }
  ```
  This applies the same `▸` triangle indicator used at 760px (line 584-588) to the wider 1160px range. The 760px rule can then be removed as it would be redundant.
- **Dependencies**: None. Pure CSS. The `data-sidebar-toggle` attribute is already on the button (`trust-framework.html:47`).
- **Affected viewports**: 760–1160px (drawer mode).

### R8 — `.reference-drawer-summary` has no min-height for touch interaction

- **Priority**: LOW
- **Description**: Reference drawer summary elements (`<summary>` tags) have `padding: 12px` (`components.css:1567-1580`) with no `min-height`. These are clickable disclosure widgets for reference information drawers. With `font-size: var(--text-sm)` (12px) and 12px vertical padding, effective height is ~36px. While below the 44px target, the content area (code + title + status) typically fills enough space to approach ~40px+. Still slightly below the minimum for comfortable touch use.
- **Specifics**: In `components.css`, add to the existing `.reference-drawer-summary` rule block (line 1567):
  ```css
  .reference-drawer-summary {
    min-height: 44px;
  }
  ```
  The existing padding remains. The grid row will expand slightly.
- **Dependencies**: None. Reference drawers use `display: grid; gap: 12px` in their stack, so taller summaries expand their row naturally.
- **Affected viewports**: All. Most relevant in drawer mode where the context panel is touch-accessible.

### R9 — `scroll-margin-top` on sections doesn't adapt to variable header height

- **Priority**: LOW
- **Description**: `.doc-section, .form-section` have `scroll-margin-top: 22px` (`components.css:93`). This is the scroll offset when navigating to a section via anchor link or page index click. Since sections are inside panels that start below the fixed header (`inset: var(--header-h)`), the scroll context is the panel itself, not the viewport. The `scroll-margin-top: 22px` provides clearance from the panel's own sticky elements (progress bar at 4px). This is correct and viewport-independent — the margin relates to the panel's scroll context, not the viewport header.
- **Specifics**: No action needed. The current value is correct for all breakpoints.
- **Dependencies**: None.
- **Affected viewports**: All — but behavior is correct.

### R10 — Help section item grid slightly compressed in drawer mode at 1160px

- **Priority**: LOW
- **Description**: `.help-section-item` uses a 4-column grid (`grid-template-columns: auto auto minmax(0, 1fr) auto`, `components.css:1691`). At 760px, it collapses to 3 columns (`components.css:1763-1770`). Between 760–1160px in drawer mode, the context drawer is `min(34rem, calc(100vw - 12px))` wide. At exactly 1160px, the drawer is 544px. A 4-column grid with 8–10px gaps in 544px gives ~128px per column. The "auto" columns (swatch + code) are small (~20px + ~50px), leaving ~350px for the label column and ~50px for the status badge. This works but is tight.
- **Specifics**: No action needed at this time. The content renders legibly. If the help panel sees heavy use on tablets, consider adding the 3-column collapse at 1160px instead of 760px:
  ```css
  @media (max-width: 1160px) {
    .help-section-item {
      grid-template-columns: auto auto minmax(0, 1fr);
    }
    .help-section-item .page-index-meta {
      grid-column: 1 / -1;
      justify-self: start;
    }
  }
  ```
  But this would duplicate the 760px rule. Low priority — monitor.
- **Dependencies**: None.
- **Affected viewports**: 760–1160px (drawer mode only).

---

## W1–W4 Regression Check

Checked for regressions introduced by prior waves:

| Check                                     | Result                                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Header grid layout (W4 arrange)           | ✅ No regression. Grid `auto minmax(0,1fr) auto` handles all widths.                                                        |
| Header height 118px (W4 arrange)          | ✅ No regression. Token updated in tokens.css. 760px override intact.                                                       |
| Touch targets on evidence buttons (W1–W4) | ✅ All at 44px. `.evidence-button`, `.evidence-remove-button`, `.evidence-lightbox-close` confirmed.                        |
| Touch targets on context buttons (W1–W4)  | ✅ All at 44px. `.context-pin-button`, `.context-overview-button`, `.context-link-button`, `.about-topic-button` confirmed. |
| Field-grid single-column at 760px         | ✅ Present at `components.css:1150-1152`.                                                                                   |
| Score-table horizontal scroll at 760px    | ✅ Present at `components.css:1154-1158`.                                                                                   |
| Print `size: A4`                          | ✅ Present at `print.css:7`.                                                                                                |
| Header progress summary responsive        | ✅ `min-width: 0; flex-basis: 100%` at 1160px (`interaction-states.css:1456-1461`).                                         |
| Workspace layout collapse at 1160px       | ✅ Present at `layout.css:554-556`.                                                                                         |
| Section animation opacity reset           | ✅ `interaction-states.css:68-69` sets `opacity: 0; animation: sectionEnter 120ms forwards`. No regression.                 |
| Rating option transitions                 | ✅ `duration-instant` (100ms) — fast but not zero. Works on touch.                                                          |
| Accent scoping via `[data-accent-key]`    | ✅ Accent variables resolve correctly in both sidebar and drawer modes. Drawer panel inherits body accent.                  |

**New issues not present in prior waves:**

- None identified. All findings (R1–R10) are pre-existing gaps that were either missed or intentionally deferred.

---

## Summary

| ID  | Priority | Area          | Action                                                      | Status       |
| --- | -------- | ------------- | ----------------------------------------------------------- | ------------ |
| R1  | HIGH     | Touch targets | Add `min-height: 44px` to `.evidence-file-button`           | New fix      |
| R2  | HIGH     | Touch targets | Add `min-height: 44px` to `.sidebar-tab`                    | New fix      |
| R3  | MEDIUM   | Touch targets | Add `min-height: 44px` to `.pager-button`                   | New fix      |
| R4  | MEDIUM   | Header height | Adjust `--header-h` between 760–1160px to prevent overlap   | New fix      |
| R5  | MEDIUM   | Touch targets | Add `min-height: 44px` to `.context-anchor-button`          | New fix      |
| R6  | LOW      | Header        | Already addressed — padding reduced to 18px at 1160px       | Already done |
| R7  | LOW      | Drawer UX     | Add `▸` indicator to sidebar toggle at 1160px               | Enhancement  |
| R8  | LOW      | Touch targets | Add `min-height: 44px` to `.reference-drawer-summary`       | Nice-to-have |
| R9  | LOW      | Scroll        | No action needed — current `scroll-margin-top` correct      | No change    |
| R10 | LOW      | Layout        | Monitor help grid in drawer — slightly compressed at 1160px | Monitor      |

**HIGH**: R1, R2 (2 items)
**MEDIUM**: R3, R4, R5 (3 items)
**LOW**: R6 (done), R7, R8, R9 (no change), R10 (monitor) (5 items)

**Total actionable fixes**: 5 (R1–R5). All are additive `min-height` or `--header-h` adjustments with no layout regression risk.
