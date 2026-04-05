# Wave 2 — Delight Assessment (Post-Wave 1)

## Audit Summary

Post-Wave 1 assessment of micro-interaction opportunities for the TRUST Framework Questionnaire. Brand personality: **Efficient, Explicit, Engineered.** Delight = instrument-grade feedback that confirms user actions instantly and accurately. No playfulness, no celebration, no personality injection. Every recommendation must make the reviewer feel more in control, not entertained.

**Delight strategy: Precision confirmations.** Every state change in this tool — selecting a rating, checking a box, navigating pages, completing sections — should produce an immediate, unambiguous visual confirmation that the system registered the action correctly. Think laboratory instruments, aviation gauges, industrial control panels.

---

## What's Already Good (Do NOT Change)

1. **Rating dot scale pulse** (`animations.css:56-66`, `interaction-states.css:1053-1055`): The 1.25x scale pulse on `is-just-selected` is perfectly calibrated. Fast (150ms), subtle, clinical. Do not enlarge or add color.

2. **Rating border-left confirm** (`animations.css:68-80`, `interaction-states.css:1057-1059`): The 2px → 5px → 3px border-left width pulse on selection is exactly right. The timing matches the dot pulse. Do not change.

3. **Strip cell fill scale** (`animations.css:24-32`): The `cellFill` scale(0.85→1) pop when a cell gets `.just-filled` is clean and informative. Do not add glow or color shift.

4. **Section enter fade** (`animations.css:34-42`, `interaction-states.css:68-69`): The 120ms opacity fade is fast and professional. Do not add translateY or scale.

5. **Evidence item enter/exit** (`animations.css:82-91`, `interaction-states.css:1061-1071`): 4px slide-down + fade-in on enter, 4px slide-up + fade-out on remove. Both are restrained and correct.

6. **Top accent bar color shift** (`interaction-states.css:1-4`): The `@property --top-accent-color` with 400ms transition between TRUST principle colors is the best ambient feedback in the tool. Perfect as-is.

7. **Panel progress bar** (`layout.css:104-114`): The scaleX transform on `.panel-progress-bar` with smooth easing. Do not add color animation or glow.

8. **Context drawer mechanics** (`layout.css:477-516`): The translateX slide-in, opacity fade, backdrop overlay, and visibility transitions are all professional-grade. The 280ms duration with ease-out-quint feels right.

9. **Tooltip opacity transitions** (`components.css:1112-1130`): The 100ms appear / 75ms disappear is snappy. The `.is-flipped` bottom positioning is a good touch.

10. **@starting-style for active page-index buttons** (`interaction-states.css:917-922`): The transition from white background to tinted with box-shadow inset is a sophisticated CSS detail. Keep it.

11. **Section active border-left width transition** (`interaction-states.css:120-125`): Using `@starting-style` to animate from 6px to 8px on section activation is a precision touch. Do not increase the widths.

12. **Reduced-motion support** (`animations.css:1-22`): Comprehensive zero-duration overrides for all animations and transitions. This is correct accessibility practice.

13. **Validation state tint overlays** (`interaction-states.css:1077-1143`): The section/criterion/field validation backgrounds with warning/error tints are immediately legible. The inset top box-shadows on strip cells and nav buttons encode state without ambiguity.

---

## Recommendations

### R1 — Field-group focus should use section accent color, not generic blue

**Priority**: HIGH  
**Description**: When a field group receives keyboard focus, the border changes to `--ut-blue` (`interaction-states.css:724-727`). This ignores the powerful section accent system that colors everything else — strip cells, nav buttons, criterion cards, kickers, badges — all use `--section-accent`. The field group is the actual input target, yet it alone falls back to generic blue. This breaks the visual continuity and weakens spatial orientation. Reviewers scanning the form should see accent color and immediately know which principle section they're in.

**Specifics**:

In `interaction-states.css`, replace `.field-group:focus-within`:

```css
.field-group:focus-within {
  border-color: var(--section-border, var(--ut-blue));
  border-left: 3px solid var(--section-accent, var(--ut-blue));
}
```

Add `border-left` to the existing `.field-group` transition (currently only `border-color` at line 716):

```css
.mock-control,
.textarea-mock,
.field-group {
  transition:
    border-color var(--duration-fast) var(--ease-out-quart),
    border-left var(--duration-fast) var(--ease-out-quart);
}
```

This creates a consistent visual hierarchy: focused field group → thin 3px section accent left border → focused criterion card → thick 8px section accent left border.

**Dependencies**: None. Uses existing `--section-accent` / `--section-border` custom properties from accent-scoping.css.

---

### R2 — Checkbox state-change confirmation pulse

**Priority**: HIGH  
**Description**: Checking a checkbox triggers a background color shift and font-weight change (`interaction-states.css:694-702`), but there is no momentary visual pulse to confirm the state change. In a dense evaluation with many checklist items (critical-fail flags, evidence requirements, completion checklists), reviewers need instant confirmation that their check registered. The `:has(input:checked)` selector fires immediately but the visual change is purely chromatic — easy to miss in peripheral vision.

A brief 100ms border-color flash from the default border to section-accent-adjacent and back would confirm the action without being playful.

**Specifics**:

Add a new keyframe in `animations.css`:

```css
@keyframes checkboxConfirm {
  0% {
    border-color: var(--ut-border);
  }
  50% {
    border-color: var(--section-accent, var(--ut-navy));
  }
  100% {
    border-color: var(--ut-border);
  }
}
```

In `interaction-states.css`, add a `.just-checked` animation class (applied via JS, same pattern as `is-just-selected`):

```css
.checkbox-item.just-checked {
  animation: checkboxConfirm 100ms var(--ease-out-quart);
}
```

In `field-handlers.js`, in the checkbox change handler (wherever `.has-checked` is toggled — currently `syncCheckboxItem` at line 202-205), add the same transient-class pattern already used for rating options:

```js
const syncCheckboxItem = (item) => {
  const input = item.querySelector('input[type="checkbox"]');
  const wasChecked = item.classList.contains('has-checked');
  item.classList.toggle('has-checked', Boolean(input?.checked));

  if (input?.checked && !wasChecked) {
    item.classList.add('just-checked');
    const removeClass = () => item.classList.remove('just-checked');
    item.addEventListener('animationend', removeClass, { once: true });
    setTimeout(removeClass, 120);
  }
};
```

The 100ms duration is intentionally shorter than the rating pulse (150ms) — checkboxes are lower-stakes actions and should confirm faster.

**Dependencies**: Requires a small JS change in `field-handlers.js:202-205`. Follows the exact same pattern as `syncRatingOption` (line 230-237).

---

### R3 — Mock-control (select) value change should flash border-left

**Priority**: HIGH  
**Description**: When a reviewer changes a judgment (Pass / Conditional pass / Fail) or recommendation status via the mock-control select, the entire control background and text color change to the judgment/recommendation semantic colors (`interaction-states.css:563-654`). This is a significant state change — it affects the overall evaluation outcome. Yet the transition is purely chromatic with no momentary emphasis.

The mock-control already has a 4px `border-left` in judgment/recommendation states (`interaction-states.css:598`). A brief flash of that border-left from 4px to 6px and back would draw the eye to the changed value.

**Specifics**:

Add a new keyframe in `animations.css`:

```css
@keyframes mockControlConfirm {
  0% {
    border-left-width: 4px;
  }
  40% {
    border-left-width: 6px;
  }
  100% {
    border-left-width: 4px;
  }
}
```

In `interaction-states.css`, add:

```css
.mock-control.just-changed {
  animation: mockControlConfirm 150ms var(--ease-out-quint);
}
```

In `field-handlers.js`, in the select sync logic (`syncSelectControl`, around line 275-290), detect when the value changes and add the transient class:

```js
// After: if (select.value !== nextValue) { select.value = nextValue; }
if (select.value !== nextValue) {
  select.value = nextValue;
  const shell = select.closest('.mock-control');
  if (shell instanceof HTMLElement) {
    shell.classList.add('just-changed');
    const removeClass = () => shell.classList.remove('just-changed');
    shell.addEventListener('animationend', removeClass, { once: true });
    setTimeout(removeClass, 180);
  }
}
```

**Dependencies**: Requires a small JS change in `field-handlers.js:syncSelectControl`. Same transient-class pattern.

---

### R4 — Validation state entry should flash the field-group border

**Priority**: MEDIUM  
**Description**: When a field enters a validation state (`attention` or `invalid`), the field-group background shifts to a warning/error tint (`interaction-states.css:1107-1122`). This is clear, but it happens gradually via the existing `border-color` transition (150ms). For validation problems — which represent real issues the reviewer must address — the transition should include a brief border-width pulse to draw attention.

This is especially important for the `invalid` state, which appears when required fields are missing during evaluation finalization. The reviewer needs to notice these immediately.

**Specifics**:

Add a keyframe in `animations.css`:

```css
@keyframes validationFlash {
  0% {
    box-shadow: none;
  }
  50% {
    box-shadow: 0 0 0 2px var(--state-error);
  }
  100% {
    box-shadow: none;
  }
}

@keyframes validationAttentionFlash {
  0% {
    box-shadow: none;
  }
  50% {
    box-shadow: 0 0 0 2px var(--state-warning);
  }
  100% {
    box-shadow: none;
  }
}
```

In `interaction-states.css`, add transient classes:

```css
.field-group.just-entered-invalid {
  animation: validationFlash 150ms var(--ease-out-quart);
}

.field-group.just-entered-attention {
  animation: validationAttentionFlash 150ms var(--ease-out-quart);
}
```

The JS should detect when a field-group's `data-field-validation-state` transitions from a non-problem state to `invalid` or `attention`, and apply the transient class. This detection logic should go wherever `data-field-validation-state` is currently set (likely `field-handlers.js` or `navigation.js` sync logic).

The `box-shadow: 0 0 0 2px` creates a sharp rectangular ring (no blur) that matches the flat aesthetic — no soft shadows, no glow.

**Dependencies**: Requires JS to detect validation state transitions and apply transient classes.

---

### R5 — Pager button directional press feedback

**Priority**: MEDIUM  
**Description**: The prev/next pager buttons have `:active` background styling (`interaction-states.css:987-989`) but no directional feedback. When clicking "← Previous", the button should nudge left; when clicking "Next →", it should nudge right. This is standard instrument feedback — a button should visually travel in the direction of its action.

**Specifics**:

In `interaction-states.css`, update the pager button styles:

```css
.pager-button {
  transition:
    opacity var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-instant) var(--ease-out-quart);
}

.pager-button:active:not(:disabled) {
  background: color-mix(in srgb, var(--ut-grey) 80%, var(--ut-border));
  transform: translateX(-1px);
}

.pager-button[data-page-direction='next']:active:not(:disabled) {
  background: color-mix(in srgb, var(--ut-grey) 80%, var(--ut-border));
  transform: translateX(1px);
}
```

1px is intentionally minimal. At this scale it reads as "button traveled" rather than "button moved." Any more would violate the flat, no-translate design principle.

**Dependencies**: None. Pure CSS.

---

### R6 — Page transition incoming section should have subtle translateY

**Priority**: MEDIUM  
**Description**: When navigating between pages, the outgoing section fades to opacity 0 (`interaction-states.css:1045-1047`) and the incoming section fades in via `sectionEnter` (opacity 0→1, `animations.css:34-42`). The outgoing transition is purely an opacity fade — no movement. The incoming transition is also purely an opacity fade. This makes page changes feel static — the content swaps but there's no sense of traversal.

A 4px vertical offset on the incoming section (matching the evidence-item enter animation) would give a sense of the new page "arriving" — like a gauge settling into position. This is the same displacement already used for evidence items, so it's consistent with the existing motion vocabulary.

**Specifics**:

Update the `sectionEnter` keyframe in `animations.css`:

```css
@keyframes sectionEnter {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Add `transform` to the section transition in `interaction-states.css:65-67`:

```css
.doc-section,
.form-section {
  transition:
    border-left-color var(--duration-fast) var(--ease-out-quart),
    background var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-fast) var(--ease-out-quart);
  opacity: 0;
  animation: sectionEnter 120ms var(--ease-out-quart) forwards;
}
```

Ensure `print.css` resets the transform:

```css
/* Already in print.css:84-86, add transform: none */
.form-section.is-page-transitioning-out,
.form-section.is-page-transitioning-in,
.rating-option.is-just-selected,
.evidence-item.is-removing {
  opacity: 1;
  transform: none;
  animation: none;
  border-left-width: revert;
}
```

**Dependencies**: Verify print.css already resets `transform: none` on animated sections (it does for `is-removing` but needs the same for `is-page-transitioning-*` if not already present).

---

### R7 — Strip cell active-state change should flash the new cell

**Priority**: MEDIUM  
**Description**: When navigating between pages, the active strip cell changes. The new cell gets `is-active` class which adds an inset box-shadow and changes background/border (`interaction-states.css:1281-1288`). This transition uses `--duration-normal` (200ms) easing, which is good, but there's no momentary emphasis to draw the eye to the newly-active cell.

In a dense 12-cell strip with color-coded progress states, the eye needs help tracking which cell just became active. A brief 150ms scale pulse (same as `cellFill`) would snap attention to the right position.

**Specifics**:

Add a new keyframe in `animations.css`:

```css
@keyframes stripCellActivate {
  0% {
    transform: scale(0.92);
  }
  100% {
    transform: scale(1);
  }
}
```

In `interaction-states.css`, add:

```css
.strip-cell.just-activated {
  animation: stripCellActivate 150ms var(--ease-out-quint);
}
```

In `navigation.js`, when the active strip cell changes (the code that applies `is-active` to the strip cell — search for `strip-cell` class toggling), add the transient class:

```js
// After applying is-active to the new cell:
newActiveCell.classList.add('just-activated');
const removeClass = () => newActiveCell.classList.remove('just-activated');
newActiveCell.addEventListener('animationend', removeClass, { once: true });
setTimeout(removeClass, 180);
```

**Dependencies**: Requires a small JS change in the strip cell update logic in `navigation.js`.

---

### R8 — Reference drawer height animation on open/close

**Priority**: LOW  
**Description**: The `<details>` reference drawers in the context panel open and close instantly via the browser's native behavior. The summary gets a subtle background change on `[open]` (`interaction-states.css:1008-1010`) and the border darkens on `.is-open` (`interaction-states.css:1012-1014`), but the content panel appears with no height transition. Since these drawers contain reference tables and checklists that reviewers consult frequently, a smooth height animation would make the interaction feel more controlled and deliberate — like opening a panel on a control console.

**Specifics**:

Use the `grid-template-rows` technique (widest browser support without JS):

In `components.css`, update `.reference-drawer-panel`:

```css
.reference-drawer-panel {
  display: grid;
  grid-template-rows: 0fr;
  gap: 12px;
  transition: grid-template-rows var(--duration-normal) var(--ease-out-quart);
  overflow: hidden;
}

.reference-drawer-panel > * {
  overflow: hidden;
}

.reference-drawer[open] .reference-drawer-panel,
.reference-drawer.is-open .reference-drawer-panel {
  grid-template-rows: 1fr;
}
```

Remove the existing `border-top: 1px solid` from `.reference-drawer-panel` (line 1674) — the border should be on the summary element instead, or moved to a `::before` on the panel that's always visible.

**Dependencies**: Verify that the `<details>` `[open]` attribute change triggers the CSS transition. In some browsers, `<details>` content is removed from layout when closed, which may require using `is-open` class via JS instead. Check if `reference-drawers.js` already applies `.is-open` — if so, use that class instead of `[open]`.

---

### R9 — Evidence count badge should pulse when count changes

**Priority**: LOW  
**Description**: When evidence items are added or removed, the evidence count text updates. There is no visual emphasis on this change. Since the evidence count is a small monospace number in the evidence block header, it's easy to miss in peripheral vision. A brief 120ms scale pulse on the count element would confirm the change.

**Specifics**:

Add a keyframe in `animations.css`:

```css
@keyframes countPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}
```

In `interaction-states.css`, add:

```css
.evidence-count.just-updated {
  animation: countPulse 120ms var(--ease-out-quart);
}
```

In `evidence.js`, wherever the evidence count text is updated after add/remove operations, apply the transient class to the `.evidence-count` element.

**Dependencies**: Requires JS change in evidence rendering. Small — same transient-class pattern.

---

### R10 — Tooltip appear should include a 2px vertical settle

**Priority**: LOW  
**Description**: Tooltips currently appear via a pure opacity transition (100ms fade). Adding a subtle 2px translateY shift (from -2px to 0) would make the tooltip feel like it "settles" into position rather than just blinking into existence. This matches the precision-engineered aesthetic — the tooltip arrives at its exact position.

**Specifics**:

Update `.tooltip-content` in `components.css:1096-1114`:

```css
.tooltip-content {
  opacity: 0;
  transform: translateX(-50%) translateY(-2px);
  transition:
    opacity var(--duration-instant) var(--ease-out-quart),
    transform var(--duration-instant) var(--ease-out-quart);
}

.tooltip-trigger.is-active .tooltip-content {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

For `.tooltip-content.is-flipped`, the direction reverses:

```css
.tooltip-content.is-flipped {
  transform: translateX(-50%) translateY(2px);
}

.tooltip-trigger.is-active .tooltip-content.is-flipped {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

**Dependencies**: None. Pure CSS. The existing `prefers-reduced-motion` block already kills all transitions.

---

### R11 — Completion badge should use a stronger pulse when page completes

**Priority**: MEDIUM  
**Description**: The `completePulse` animation (`animations.css:44-54`) and `.just-completed` class (`interaction-states.css:559-561`) exist but the pulse is weak — it only animates `border-color` and `background` between very similar values. Completing a TRUST principle section (TR1+TR2+TR3 with evidence) is a significant moment. The pulse should be more visible without crossing into celebration territory.

**Specifics**:

Update `completePulse` in `animations.css` to include a brief scale pulse:

```css
@keyframes completePulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--section-accent, var(--ut-navy));
  }
  30% {
    transform: scale(1.06);
    box-shadow: 0 0 0 3px var(--section-accent, var(--ut-navy));
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 transparent;
  }
}
```

The `box-shadow: 0 0 0 3px` creates a sharp rectangular ring (no blur = flat aesthetic). The 1.06 scale is barely perceptible but creates a satisfying "settling" feel. The 30% peak means the pulse is front-loaded and returns quickly — confirming rather than lingering.

Ensure the completion badge has `transform` in its transition list and that `will-change: transform` is added to avoid jank.

**Dependencies**: Verify that the JS logic in `navigation.js` (around `syncCanonicalProgressDecorations`) actually toggles `.just-completed` when a page's progress state transitions to `complete`. If it only fires on initial render, the JS needs updating to detect state transitions.

---

### R12 — Panel scroll shadow transition should be smoother

**Priority**: LOW  
**Description**: The panel scroll shadows (`.panel::before` and `.panel::after` in `layout.css:183-213`) use opacity transitions to indicate scroll overflow. The transition duration is `--duration-fast` (150ms), which is snappy but slightly abrupt for an ambient indicator. The shadows should ease in more gradually since they're environmental context, not action feedback.

**Specifics**:

In `layout.css:192`, change the transition timing for panel scroll shadows:

```css
.panel::before,
.panel::after {
  transition: opacity var(--duration-normal) var(--ease-out-quart);
}
```

200ms with ease-out-quart feels more like a gauge settling than a UI snapping. The shadows are background information — they should arrive smoothly.

**Dependencies**: None. Pure CSS timing change.

---

## Things Explicitly NOT Recommended

1. **Confetti, particles, or celebration animations** — Inappropriate for academic evaluation work. Reviewers are making institutional recommendations, not winning games.
2. **Sound effects** — Office environment. Never appropriate for this audience.
3. **Onboarding tours, walkthroughs, or progressive disclosure** — Explicitly listed as anti-reference in `.impeccable.md`. The help panel and context sidebar already serve this function.
4. **Gamification (streaks, badges, points, progress percentages)** — The tool is an instrument. Progress is encoded in the completion strip and page states — that is sufficient and appropriate.
5. **Animated illustrations, SVG characters, or decorative icon motion** — Contradicts the "regimented functionalism" aesthetic.
6. **Gradient transitions, glow effects, or blur shifts** — Explicitly listed as anti-patterns in the design context.
7. **Personalized messages or name usage** — The tool should not address the reviewer by name. State and structure, not personality.
8. **Seasonal themes, time-of-day variations, or weather-based changes** — The tool must look identical in every session. Consistency is a feature for an evaluation instrument.
9. **Easter eggs, Konami codes, or hidden features** — An instrument should have zero surprises. Every behavior must be documented and predictable.
10. **Micro-copy humor, winking error messages, or casual language** — Error messages and labels must be direct and technical. The existing copy ("Any critical-fail flag triggers a mandatory team review") is exactly right.
11. **Hover lift/translate effects** — `.impeccable.md` explicitly states "No hover lift/translate effects" under Navigation Buttons.
12. **Custom cursors** — Would undermine the engineered, functional aesthetic.
13. **Skeleton screens or loading shimmer** — The tool loads instantly (static HTML + JS modules). There are no network requests during normal operation.

---

## Implementation Priority Order

| Priority | ID  | Effort                | Impact                                                      |
| -------- | --- | --------------------- | ----------------------------------------------------------- |
| HIGH     | R1  | CSS only              | Consistent accent system across all interactive elements    |
| HIGH     | R2  | CSS + small JS        | Confirms every checkbox action (high-frequency interaction) |
| HIGH     | R3  | CSS + small JS        | Confirms judgment/recommendation changes (high-stakes)      |
| MEDIUM   | R4  | CSS + JS              | Draws attention to validation problems                      |
| MEDIUM   | R5  | CSS only              | Tactile pager feedback                                      |
| MEDIUM   | R6  | CSS only              | Page traversal feels directional                            |
| MEDIUM   | R7  | CSS + small JS        | Eye-tracking aid in dense strip                             |
| MEDIUM   | R11 | CSS + JS verification | Stronger completion acknowledgment                          |
| LOW      | R8  | CSS + possible JS     | Smoother drawer interaction                                 |
| LOW      | R9  | CSS + small JS        | Evidence count change confirmation                          |
| LOW      | R10 | CSS only              | Precision tooltip arrival                                   |
| LOW      | R12 | CSS only              | Ambient shadow smoothing                                    |

---

## Cross-Cutting Notes

- All new animations should be added to the `prefers-reduced-motion` block in `animations.css` to ensure they're zeroed out for users who prefer reduced motion.
- All transient animation classes (`just-checked`, `just-changed`, `just-activated`, `just-updated`) follow the same pattern already established by `is-just-selected` and `just-completed`: add class → remove on `animationend` → fallback `setTimeout`.
- The maximum animation duration for any new micro-interaction is 200ms (the existing `--duration-normal`). Most should be 100-150ms. Nothing should exceed 280ms.
- No new CSS custom properties are needed — all recommendations use existing tokens.
- No new dependencies are needed — all animations use CSS keyframes and transitions.
