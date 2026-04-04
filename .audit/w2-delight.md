# Wave 2 — Delight Assessment

## Audit Summary

This is a professional academic instrument for the EIS-IS team at University of Twente — domain experts who evaluate AI search tools against the TRUST framework. The brand personality is **Efficient, Explicit, Engineered**. Delight here must amplify confidence and precision, never entertain. The tool should feel like a well-calibrated scientific instrument, not a consumer product.

The existing system already has several subtle feedback mechanisms that are well-suited to this domain: the `ratingDotConfirm` pulse, the `cellFill` scale on completion strip cells, the `evidenceItemEnter` slide-in, section enter fades, and the accent bar color shifts. These are exactly the right kind of functional feedback for an instrument UI.

**Delight strategy for this tool: Helpful surprises that reinforce competence** — subtle confirmations that the system is working correctly, that progress is meaningful, and that the reviewer's expertise is respected.

---

## What's Already Good (Do NOT Change)

- **Rating dot confirm animation** (`animations.css:58-68`): The 1.25x scale pulse is perfect. Satisfying but clinical. Do not make it bigger or add color.
- **Completion strip cell fill** (`animations.css:28-36`): The scale(0.85)→scale(1) pop is a clean progress indicator. Do not add particles or glow.
- **Evidence item enter** (`animations.css:70-79`): 4px slide + fade is appropriately restrained.
- **Accent bar color shift** (`interaction-states.css:1-4`): The top bar transitioning between TRUST principle colors as the user navigates is an excellent ambient wayfinding signal. Do not add gradient transitions or rainbow effects.
- **Section enter fade** (`animations.css:38-46`): 120ms opacity fade is fast and professional.
- **Validation state coloring** (`interaction-states.css:1082-1148`): The warning/error tint backgrounds on fields and sections give immediate, clear feedback without being alarming. The `inset box-shadow` top borders on strip cells and nav buttons are a strong, information-dense progress encoding.
- **Context drawer mechanics**: The slide-in/out, backdrop blur, and surface overlay all feel professional and polished.
- **Print styles**: Comprehensive and correct — the tool degrades gracefully to a static document.
- **Skip link**: Present and functional — accessibility delight, invisible but important.

---

## Recommendations

### R1 — Completion badge pulse when a page reaches "Complete" state

**Priority**: HIGH  
**Description**: When all required fields on a page are satisfied and the page transitions from `in_progress` to `complete`, the completion badge (`.completion-badge`) should briefly pulse to acknowledge the milestone. The `just-completed` class and `completePulse` animation already exist in the codebase (`interaction-states.css:589-591`, `animations.css:48-56`) but the pulse animation is weak — it only animates `border-color` from `--ut-navy` to `--ut-border`, which is barely perceptible and doesn't use the section's own accent color.

This is a significant moment: completing a full TRUST principle section (or any page) is a meaningful step in a long evaluation. The feedback should be more visible — still clinical, but unambiguous.

**Specifics**:

- In `animations.css`, update `completePulse` to also briefly flash the background with the section tint:
  ```css
  @keyframes completePulse {
    0% {
      border-color: var(--section-accent-strong, var(--ut-navy));
      background: var(--section-tint, color-mix(in srgb, var(--ut-navy) 10%, var(--ut-white)));
    }
    100% {
      border-color: var(--section-border, var(--ut-border));
      background: var(--section-tint, var(--ut-white));
    }
  }
  ```
- Duration stays at 200ms with `--ease-out-quint` — the existing timing is correct.
- The `.just-completed` class application logic needs to be verified in `navigation.js` or `sidebar.js` — confirm that the class is being toggled when a page's progress state changes to `complete`. If the toggle only fires on initial render, it needs to fire on state-derived progress transitions.

**Dependencies**: None. Builds on existing animation infrastructure.

---

### R2 — Rating option border-left flash on selection

**Priority**: HIGH  
**Description**: When a reviewer selects a rating (0–3), the `is-just-selected` class is applied and the dot does a scale pulse (good), but the border-left width jumps from 2px to 5px (`interaction-states.css:1063-1064`) without any transition. This abrupt width change looks like a rendering glitch rather than intentional feedback. The rating selection is the most frequent evaluative action in the tool — it deserves a clean, momentary emphasis.

**Specifics**:

- Add a transition to `.rating-option` for `border-left-width` in `components.css:465-468`:
  ```css
  .rating-option {
    transition:
      background var(--duration-instant) var(--ease-out-quart),
      border-color var(--duration-instant) var(--ease-out-quart),
      border-left-width var(--duration-instant) var(--ease-out-quart);
  }
  ```
- In `animations.css`, add a `ratingBorderConfirm` keyframe that briefly widens then returns:
  ```css
  @keyframes ratingBorderConfirm {
    0% {
      border-left-width: 2px;
    }
    40% {
      border-left-width: 5px;
    }
    100% {
      border-left-width: 3px;
    }
  }
  ```
- Apply via `.rating-option.is-just-selected { animation: ratingBorderConfirm 200ms var(--ease-out-quint); }` in `interaction-states.css`.
- Remove the static `border-left-width: 5px` from `.rating-option.is-just-selected` — the animation should handle the temporary emphasis, and the settled score state (`.score-0` through `.score-3`) already sets `border-left: 3px solid`.

**Dependencies**: None. Self-contained in rating scale CSS.

---

### R3 — Strip cell filled state should briefly glow before settling

**Priority**: MEDIUM  
**Description**: The `cellFill` animation (`animations.css:28-36`) scales from 0.85 to 1.0 when a strip cell gets the `.just-filled` class. However, the filled strip cells (`.strip-cell.filled.tr`, etc. in `interaction-states.css:6-29`) immediately jump to their final tinted background. For a moment after the scale animation, the cell still has the plain white background of `not_started` before JS updates the data attributes. This creates a visual disconnect — the scale happens but the color doesn't match yet.

The fix is to ensure the filled styling is applied before or simultaneously with the animation trigger.

**Specifics**:

- Verify in the JS that applies `.just-filled` (likely in `sidebar.js` or `navigation.js`) that `data-progress-state="complete"` (or `filled` + the principle class) is set on the same frame as `.just-filled` is added, so the background tint is already visible when the scale animation plays.
- If the timing is correct and the issue is that `.filled` is applied after `.just-filled`, swap the order so the accent background is painted first.
- Alternatively, add a brief background flash to `cellFill`:
  ```css
  @keyframes cellFill {
    0% {
      transform: scale(0.85);
      background: var(--section-tint, var(--ut-white));
    }
    100% {
      transform: scale(1);
    }
  }
  ```

**Dependencies**: May require checking JS timing in sidebar rendering.

---

### R4 — Pager "End" state should acknowledge evaluation completion

**Priority**: MEDIUM  
**Description**: When the reviewer reaches the last page and the next button shows "End →" (disabled, `pager.js:128`), there is no acknowledgment that the evaluation is complete. The pager status text shows "Page 13 of 13" but gives no sense of accomplishment. For a 132+ field evaluation across 10 sections, reaching the end is a significant effort.

The brand says "Efficient, Explicit, Engineered" — so no confetti or celebration. But a brief, explicit confirmation that the evaluation review is complete would reinforce the reviewer's confidence in having finished a thorough assessment.

**Specifics**:

- In `pager.js`, when `nextPageId` is `null` AND the evaluation progress is `complete` (check `state.derived.overallProgress` or equivalent), update the status text:
  ```js
  if (!pagerState.nextPageId && isOverallComplete) {
    refs.status.textContent = `Evaluation complete — ${pagerState.pageOrder.length} sections reviewed`;
  }
  ```
- The status element already has `aria-live="polite"` (`pager.js:40`), so screen readers will announce the completion.
- No color change, no animation, no badge. Just explicit, clear text. The tool's personality demands understatement.

**Dependencies**: Depends on having an `isOverallComplete` or equivalent derived state. Check `derive.js` for an overall progress/completion flag.

---

### R5 — Evidence empty state text should be more specific per context

**Priority**: MEDIUM  
**Description**: The evidence block empty state (`.evidence-empty-state` in `components.css:765-771`) currently shows generic dashed-border styling but the text content is set dynamically in `evidence.js`. This is a good pattern. However, the empty state is a moment where the tool can help the reviewer think about what evidence to attach.

The current empty state likely says something generic. Since the tool already has section-specific context guidance in the sidebar, the evidence empty state could reference the relevant evidence type for that criterion.

**Specifics**:

- In `evidence.js`, when creating the evidence empty state element for a criterion-level block, vary the text based on the criterion code or principle:
  - For TR criteria: "No evidence attached. Attach source documentation, screenshots, or methodology disclosures."
  - For RE criteria: "No evidence attached. Attach repeated-query results, verification records, or accuracy test data."
  - For SE criteria: "No evidence attached. Attach privacy policy excerpts, DPIA notes, or compliance records."
  - For TC criteria: "No evidence attached. Attach provenance path screenshots, source verification records, or attribution samples."
  - For UC criteria: "No evidence attached. Attach usability observations, accessibility test results, or workflow screenshots."
- Keep the text to one sentence. No emoji, no illustration.
- The dashed border and muted styling are correct for this state — do not change the visual treatment.

**Dependencies**: Check `evidence.js` `createEvidenceBlockElement` for the current empty state text generation.

---

### R6 — Field focus-within should show a subtle left-accent reveal

**Priority**: MEDIUM  
**Description**: When a field group receives focus (`field-group:focus-within`, `interaction-states.css:749-753`), the border turns blue. This is functional but doesn't take advantage of the existing section accent system. The criterion cards already do this well — `criterion-card:focus-within` changes border-left-color to the section accent (`interaction-states.css:855-885`). Field groups should follow the same pattern for visual consistency.

**Specifics**:

- Update `.field-group:focus-within` in `interaction-states.css:749-753`:
  ```css
  .field-group:focus-within {
    border-color: var(--section-border, var(--ut-blue));
    border-left: 3px solid var(--section-accent, var(--ut-blue));
  }
  ```
- Add `border-left` to the transition list for `.field-group` (already has `border-color` transition at `interaction-states.css:743-747`):
  ```css
  .field-group {
    transition:
      border-color var(--duration-fast) var(--ease-out-quart),
      border-left var(--duration-fast) var(--ease-out-quart);
  }
  ```
- This creates a visual hierarchy: focused field group → section accent left border → focused criterion card → thicker section accent left border. The progression reinforces spatial orientation within the form.

**Dependencies**: None. Uses existing CSS custom properties.

---

### R7 — Page transition should briefly highlight the target page index button

**Priority**: LOW  
**Description**: When navigating between pages, the page index sidebar updates correctly (`.page-index-button.is-active` styling exists at `interaction-states.css:918-928`), but the transition is instant — the active class is swapped and the previous button loses its highlight with no visual bridge. A brief flash on the newly-active button would help the reviewer's eye track which page they arrived at, especially in the dense page index.

**Specifics**:

- In `navigation.js`, when navigating to a new page, briefly add a class like `.is-navigating` to the target `.page-index-button` that triggers a quick background flash:
  ```css
  .page-index-button.is-navigating {
    animation: pageNavigateFlash 200ms var(--ease-out-quart);
  }
  @keyframes pageNavigateFlash {
    0% {
      background: var(--section-tint, var(--ut-grey));
    }
    50% {
      background: color-mix(in srgb, var(--section-tint) 60%, var(--section-accent));
    }
    100% {
      background: var(--section-tint, var(--ut-grey));
    }
  }
  ```
- Remove the class after `animationend`. The final state is the existing `.is-active` styling, so the flash is a transient overlay.
- The 200ms duration matches the existing page transition timing.

**Dependencies**: Requires adding a class toggle in `navigation.js` around the page navigation logic.

---

### R8 — Reference drawer open/close should animate the panel height

**Priority**: LOW  
**Description**: The `<details>` elements used for reference drawers (`reference-drawer` in `components.css:1389-1479`) open/close with the browser's default instant behavior. The summary gets a subtle background change on `[open]` (`interaction-states.css:1013-1015`), but the content panel appears/disappears abruptly. Since these drawers contain reference tables and checklists that reviewers consult frequently, a smooth height transition would make the UI feel more controlled.

**Specifics**:

- Add `interpolate-size: allow-keywords` (CSS Interpolate Size, supported in Chrome 129+ and Firefox 132+) to `.reference-drawer-panel` and animate `height` from `0` to `auto`:
  ```css
  .reference-drawer-panel {
    interpolate-size: allow-keywords;
    transition: height var(--duration-normal) var(--ease-out-quart);
  }
  ```
- Alternatively, if browser support is a concern, use the `grid-rows` technique:
  ```css
  .reference-drawer-panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows var(--duration-normal) var(--ease-out-quart);
  }
  .reference-drawer[open] .reference-drawer-panel {
    grid-template-rows: 1fr;
  }
  .reference-drawer-panel > * {
    overflow: hidden;
  }
  ```
- The grid-rows approach has wider support and is well-tested. It's the same technique used in many design systems.

**Dependencies**: None. Self-contained in components CSS. Verify that `print.css` already handles the `[open]` state correctly (it does — `print.css:67-69` hides the summary and shows the panel).

---

### R9 — Pager button arrows should briefly animate on navigation

**Priority**: LOW  
**Description**: The pager buttons ("← Previous →") are clicked frequently during evaluation. Currently they have hover and disabled states but no click feedback animation. A brief directional nudge (← shifts left, → shifts right) on click would provide tactile-like feedback.

**Specifics**:

- Add to `interaction-states.css`:
  ```css
  .pager-button:active:not(:disabled) {
    transform: translateX(-1px);
  }
  .pager-button[data-page-direction='next']:active:not(:disabled) {
    transform: translateX(1px);
  }
  ```
- Add `transform` to the existing pager-button transition (currently only has `opacity` at `interaction-states.css:1078-1080`):
  ```css
  .pager-button {
    transition:
      opacity var(--duration-fast) var(--ease-out-quart),
      transform var(--duration-instant) var(--ease-out-quart);
  }
  ```
- 1px is intentionally tiny — this is a micro-nudge, not a slide. The brand demands subtlety.

**Dependencies**: None.

---

### R10 — Context sidebar should show a brief "scanning" state when switching pages

**Priority**: LOW  
**Description**: When navigating between pages, the context sidebar updates its content to show the relevant section guidance. If the update involves DOM manipulation that takes a frame or two, there may be a brief flash of stale content. Even if the update is instant, a minimal "settling" indicator would reinforce that the context is actively tracking the questionnaire position.

**Specifics**:

- In `navigation.js`, when navigating to a new page, briefly add a class to the context panel content area that shows a 2px accent-colored top border (similar to the `can-scroll-down` shadow but horizontal):
  ```css
  .context-sidebar-shell.is-switching {
    opacity: 0.6;
    transition: opacity var(--duration-fast) var(--ease-out-quart);
  }
  ```
- Remove the class after the context content has been updated (same frame or next frame).
- This is not a loading spinner — it's a 50-100ms dip that signals "content is updating" without implying delay.

**Dependencies**: Requires a class toggle in `navigation.js` around the context sidebar update logic.

---

### R11 — Consider a subtle console message for developers

**Priority**: LOW  
**Description**: This is a niche delight opportunity. Since this is a vanilla JS tool with no build step, developers inspecting it in DevTools might appreciate a brief, on-brand console message. This is invisible to end users and costs nothing.

**Specifics**:

- In `app.js`, after bootstrap completes, add:
  ```js
  console.log(
    '%cTRUST Framework Questionnaire',
    'font-family: Arial Narrow, sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #002c5f;',
  );
  ```
- One line. No ASCII art, no emoji, no hiring link. Matches the brand voice.

**Dependencies**: None. Add to `app.js` after initialization.

---

## Things Explicitly NOT Recommended

1. **Confetti, particles, or celebratory animations on completion** — Inappropriate for the brand and audience. Reviewers are doing serious academic work.
2. **Sound effects** — Academic office environments. No.
3. **Onboarding tours or tooltips** — The `.impeccable.md` explicitly lists "Onboarding flows and hand-holding" as an anti-reference. The help panel and context sidebar already serve this function.
4. **Gamification (streaks, badges, points)** — The tool is an instrument, not a game. Progress tracking exists in the completion strip and page states — that is sufficient.
5. **Animated illustrations or SVG characters** — Contradicts the "regimented functionalism" aesthetic.
6. **Gradient or glow effects** — Explicitly listed as anti-patterns in the design context.
7. **Personalized messages ("Great job, Sarah!")** — The tool should not know or use reviewer names in this way. State and structure, not personality.
8. **Seasonal themes or time-of-day variations** — The tool should look identical in every session. Consistency is a feature.
9. **Easter eggs or hidden features** — An instrument should not have surprises. Every behavior should be documented and predictable.
10. **Micro-copy humor** — Error messages and labels should be direct and technical. The existing copy ("Any critical-fail flag triggers a mandatory team review") is exactly right.
