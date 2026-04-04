# Wave 2 Delight Recommendations

Subtle sophistication for the TRUST Framework questionnaire. Every recommendation
here respects the professional, institutional character of the tool. Delight
means responsive feedback, confident transitions, and visual clarity -- not
whimsy or decoration.

All snippets use the existing token system (`--duration-*`, `--ease-out-*`,
`--section-*`, `--score-*`) and respect `prefers-reduced-motion` which is
already wired in `states.css`.

---

## HIGH PRIORITY

These address moments users encounter frequently or where feedback is currently
absent despite being expected.

---

### D1. Section completion badge entrance

**Problem.** When a principle section transitions from "in progress" to "complete",
the `.completion-badge` text and style update instantly. The reviewer gets no
perceptual signal that the milestone was reached.

**Proposal.** Add a scale-and-settle animation to the badge the moment it
receives `.complete`. The existing `completePulse` keyframe only flashes the
border -- it should be accompanied by a brief scale pop.

```css
/* states.css -- extend existing completion-badge rules */

.completion-badge.just-completed {
  animation:
    completePulse 200ms var(--ease-out-quint),
    badgeSettle 300ms var(--ease-out-quint);
}

@keyframes badgeSettle {
  0%   { transform: scale(0.88); opacity: 0.6; }
  60%  { transform: scale(1.06); }
  100% { transform: scale(1);    opacity: 1; }
}
```

**Where it fires.** `navigation.js` already toggles the `.complete` class and
applies `just-completed` via `syncCanonicalProgressDecorations`. No JS change
needed -- just the CSS keyframe addition.

**Why here.** Section completion is the primary success moment in a questionnaire.
A badge that materializes with presence reinforces progress without calling
attention to itself.

---

### D2. Strip cell completion cascade

**Problem.** The completion strip in the header updates all cells simultaneously
on state change. When a section is completed, its cell transitions color but
there is no moment of recognition -- it blends with other cells.

**Proposal.** Add a brief scale-and-color entrance to strip cells that transition
to the `complete` progress state. Combine with the existing `cellFill` keyframe.

```css
/* states.css */

.strip-cell.just-filled {
  animation:
    cellFill 200ms var(--ease-out-quint),
    stripCellGlow 400ms var(--ease-out-quart);
}

@keyframes stripCellGlow {
  0%   { box-shadow: 0 0 0 0 var(--section-accent); }
  50%  { box-shadow: 0 0 0 3px var(--section-accent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
```

**JS hook.** In `sidebar.js` where strip cells are rendered, apply the
`just-filled` class when a cell's progress state transitions to `complete`
(and remove it after `animationend`).

```javascript
// sidebar.js -- inside the strip cell render loop
if (
  prevProgressState !== 'complete'
  && currentProgressState === 'complete'
) {
  cell.classList.add('just-filled');
  cell.addEventListener('animationend', () => {
    cell.classList.remove('just-filled');
  }, { once: true });
}
```

**Why here.** The completion strip is always visible in the header. A subtle
glow on completion provides ambient progress awareness without requiring the
reviewer to look at the strip directly.

---

### D3. Rating option selection border sweep

**Problem.** The current rating selection feedback is a dot pulse
(`ratingDotConfirm`) and a left-border width change. The border change is
instant. A directional sweep from top to bottom would give the selection a
sense of finality.

**Proposal.** Use a pseudo-element sweep that travels the height of the option
on selection, fading in the score-colored left border.

```css
/* states.css */

.rating-option.is-just-selected::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 0;
  background: var(--section-accent);
  animation: borderSweep 200ms var(--ease-out-quart) forwards;
}

@keyframes borderSweep {
  0%   { height: 0;   opacity: 0.4; }
  100% { height: 100%; opacity: 1; }
}
```

Note: `.rating-option` needs `position: relative; overflow: hidden;` added to
its base rule in `components.css` if not already present.

**Why here.** Scoring criteria is the core repetitive action in the
questionnaire. Each selection should feel decisive. A top-to-bottom border sweep
communicates "recorded" more clearly than an instant switch.

---

### D4. Panel progress bar accent color sync

**Problem.** The panel progress bar (`#questionnaireProgress`,
`#frameworkProgress`) always uses `--ut-blue` regardless of which section is
active. The top-accent bar already syncs to the active section via
`--active-section-accent-strong`.

**Proposal.** Make the progress bar track the section accent, creating visual
coherence between header, progress, and page content.

```css
/* layout.css -- replace the fixed --ut-blue */

.panel-progress-bar {
  height: 100%;
  width: 0%;
  background: var(--active-section-accent, var(--ut-blue));
  will-change: width;
  transition:
    width var(--duration-normal) var(--ease-out-quart),
    background var(--duration-fast) var(--ease-out-quart);
}
```

**Why here.** This is a zero-interaction-cost change that strengthens the
section-accent system already in place. When a reviewer navigates from TR
(blue) to SE (orange), the progress bar follows, reinforcing context.

---

### D5. Page transition crossfade polish

**Problem.** The current page crossfade uses a 150ms `setTimeout` in
`navigation.js` to hide the outgoing page and reveal the incoming one. The
opacity transition works, but the incoming page appears with no spatial
direction -- it fades in place.

**Proposal.** Add a subtle upward slide to the incoming page, giving the
navigation a sense of forward motion through the questionnaire.

```css
/* states.css */

.form-section.is-page-transitioning-out {
  opacity: 0;
  transform: translateY(-4px);
}

.form-section.is-page-transitioning-in {
  opacity: 0;
  transform: translateY(4px);
}

.form-section[data-page-id] {
  transition:
    opacity var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-fast) var(--ease-out-quart);
}
```

**Why here.** Navigation between pages is the second most frequent action after
scoring. A 4px directional slide is imperceptible as "animation" but creates a
clear "moving forward" vs "leaving behind" distinction that pure opacity lacks.

---

## MEDIUM PRIORITY

These improve secondary interactions and ambient feedback.

---

### D6. Checkbox item check confirmation

**Problem.** Checkbox items get the `.has-checked` class on toggle, which
adjusts background and font weight. The transition is instant.

**Proposal.** Add a brief scale pulse on the checkbox input itself when checked,
providing tactile feedback.

```css
/* states.css */

.checkbox-item.has-checked {
  color: var(--ut-navy);
  font-weight: 500;
  background: color-mix(in srgb, var(--ut-navy) 3%, var(--ut-white));
  border-radius: 2px;
  margin: -2px -4px;
  padding: 2px 4px;
  animation: checkboxSettle 150ms var(--ease-out-quint);
}

@keyframes checkboxSettle {
  0%   { transform: scale(0.97); }
  100% { transform: scale(1); }
}
```

**Why here.** Checkboxes are used for critical-fail flags and evidence
checklists. A micro-settle confirms the action without being distracting.

---

### D7. Reference drawer open accent line

**Problem.** Reference drawers open with a background shift on the summary
and a border color change. The content below appears instantly.

**Proposal.** Add a top-to-bottom accent line sweep on the drawer panel when
opened, using the existing `--section-accent` token.

```css
/* states.css */

.reference-drawer[open] .reference-drawer-panel {
  animation: drawerReveal 200ms var(--ease-out-quart);
}

@keyframes drawerReveal {
  0%   { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

**Why here.** Reference drawers contain scoring tables and evidence requirements
that reviewers consult frequently. A clean entrance makes the content feel
intentionally revealed rather than abruptly dumped.

---

### D8. Evidence item entrance refinement

**Problem.** The existing `evidenceItemEnter` animation uses a 4px translateY
with `--duration-normal` (200ms). This is functional but generic.

**Proposal.** Add a slight left-border color flash using the section accent to
tie evidence items to their parent criterion.

```css
/* states.css -- extend existing */

.evidence-item {
  animation: evidenceItemEnter var(--duration-normal) var(--ease-out-quart);
  border-left: 3px solid transparent;
}

.evidence-item {
  animation:
    evidenceItemEnter var(--duration-normal) var(--ease-out-quart),
    evidenceAccentFlash 300ms var(--ease-out-quart) 80ms;
}

@keyframes evidenceAccentFlash {
  0%   { border-left-color: transparent; }
  40%  { border-left-color: var(--section-accent); }
  100% { border-left-color: transparent; }
}
```

**Why here.** Evidence items are closely tied to criteria. A momentary accent
flash reinforces that relationship without adding chrome.

---

### D9. Context drawer slide-in spring feel

**Problem.** The context drawer in drawer mode uses a linear
`transform: translateX` with `--duration-normal`. This feels mechanical.

**Proposal.** Use a slightly overshooting easing to give the drawer a
natural "settling into place" feel.

```css
/* layout.css */

.shell-layout.is-context-drawer-mode .framework-panel {
  transition:
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity var(--duration-fast) var(--ease-out-quart);
}
```

The existing `--ease-out-quint` (`cubic-bezier(0.22, 1, 0.36, 1)`) is already
a good deceleration curve. The change here is increasing the duration from 200ms
to 280ms so the deceleration is visible. No new easing token needed.

**Why here.** The context drawer is a primary navigation surface on narrow
screens. A natural slide-in makes the panel feel like it belongs rather than
being overlaid mechanically.

---

### D10. Pager button press feedback

**Problem.** Pager buttons have opacity transition on hover and disabled state
but no active/press feedback.

**Proposal.** Add a subtle translate and shadow change on press.

```css
/* states.css */

.pager-button:not(:disabled):active {
  transform: translateY(1px);
  transition:
    transform 60ms var(--ease-out-quart),
    opacity var(--duration-fast) var(--ease-out-quart);
}
```

This requires adding `transform` to the existing pager-button transition:

```css
.pager-button {
  transition:
    transform 60ms var(--ease-out-quart),
    opacity var(--duration-fast) var(--ease-out-quart);
}
```

**Why here.** Pager buttons are the primary forward/backward navigation.
Physical press feedback makes them feel reliable.

---

### D11. Skip criterion toggle state transition

**Problem.** When a reviewer clicks "Skip criterion" / "Resume criterion", the
button text changes and the tag updates instantly. The skip scaffold fields
appear/disappear without transition.

**Proposal.** Add a smooth height/opacity transition to the skip reason and
rationale controls when they become available.

```css
/* states.css -- new */

[data-criterion-meta="skip-scaffold"] select,
[data-criterion-meta="skip-scaffold"] textarea {
  transition:
    opacity var(--duration-fast) var(--ease-out-quart),
    transform var(--duration-fast) var(--ease-out-quart);
}

[data-criterion-meta="skip-scaffold"][data-criterion-skip-requested="false"] select,
[data-criterion-meta="skip-scaffold"][data-criterion-skip-requested="false"] textarea {
  opacity: 0.5;
  pointer-events: none;
}
```

**Why here.** The skip/restore toggle is a workflow control. Smooth state
transitions prevent the disorienting "everything changed" effect.

---

## LOW PRIORITY

These are polish touches that add warmth without changing interaction patterns.

---

### D12. Focus ring accent sync

**Problem.** All focus rings use `--focus-ring: var(--ut-blue)` regardless of
which section is active. In a blue section (TR) this is fine; in an orange
section (SE) it creates a subtle mismatch.

**Proposal.** Allow focus rings to inherit the section accent within form
sections.

```css
/* states.css */

.form-section[data-accent-key] :focus-visible {
  outline-color: var(--section-accent);
}

.criterion-card[class] :focus-visible {
  outline-color: var(--section-accent);
}
```

**Why here.** This is a detail-oriented refinement. Most users will not
consciously notice, but the overall impression of coherence increases.

---

### D13. Field group focus border accent

**Problem.** Field groups get `border-color: var(--ut-blue)` on focus-within.
Similar to D12, this is always blue.

**Proposal.** Sync to section accent.

```css
/* states.css -- replace existing rule */

.mock-control:focus-within,
.textarea-mock:focus-within,
.field-group:focus-within {
  border-color: var(--section-accent, var(--ut-blue));
}
```

**Why here.** Same rationale as D12. When filling in SE criterion fields, the
focus border should match the orange section identity.

---

### D14. Surface overlay backdrop blur

**Problem.** The shell surface overlay (Info, Help) uses a darkened transparent
background. Modern browsers support `backdrop-filter` for a frosted glass
effect that lets the underlying content remain faintly visible.

**Proposal.** Add a subtle backdrop blur.

```css
/* layout.css */

.shell-surface {
  background: color-mix(in srgb, var(--ut-text) 20%, transparent);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
```

Keep the blur value low (2px). This is not a design statement -- it is a
depth cue that separates the overlay from the content beneath.

**Why here.** Overlays that use backdrop blur feel lighter and less "blocking"
than solid-color overlays, which matters for a tool where reviewers frequently
consult reference material.

---

### D15. Criterion card subtle entrance stagger

**Problem.** When a questionnaire page renders, all criterion cards appear
simultaneously via the `sectionEnter` animation. A slight stagger would make
the page feel constructed rather than dumped.

**Proposal.** Use `animation-delay` with `nth-child` for a subtle stagger.

```css
/* states.css */

.criterion-card {
  animation: sectionEnter 120ms var(--ease-out-quart) forwards;
}

.criterion-card:nth-child(1) { animation-delay: 0ms; }
.criterion-card:nth-child(2) { animation-delay: 40ms; }
.criterion-card:nth-child(3) { animation-delay: 80ms; }
.criterion-card:nth-child(4) { animation-delay: 120ms; }
```

40ms per card is below the threshold of conscious perception but creates a
top-to-bottom "reveal" effect.

**Why here.** Pages with 3-4 criterion cards benefit from a slight stagger
that guides the eye downward naturally.

---

### D16. Top accent bar section transition

**Problem.** The top accent bar already transitions its background color via
`--active-section-accent-strong`. The transition is 150ms and linear.

**Proposal.** Increase the duration slightly for a more confident color sweep.

```css
/* states.css -- modify existing */

.top-accent {
  background: var(--active-section-accent-strong);
  transition: background 280ms var(--ease-out-quart);
}
```

The longer duration lets the eye register the color change as intentional
rather than flickering.

**Why here.** The top accent bar is the first thing visible. A confident color
transition there sets the tone for the rest of the section.

---

### D17. Print stylesheet refinement

**Problem.** The print stylesheet resets animation classes but does not add
any print-specific visual refinements like section separators or page headers.

**Proposal.** Add principle-colored top borders to printed sections for visual
separation.

```css
/* print.css */

.form-section[data-section="tr"] {
  border-top: 3px solid #2563EB;
}
.form-section[data-section="re"] {
  border-top: 3px solid #16A34A;
}
.form-section[data-section="uc"] {
  border-top: 3px solid #9333EA;
}
.form-section[data-section="se"] {
  border-top: 3px solid #EA580C;
}
.form-section[data-section="tc"] {
  border-top: 3px solid #0D9488;
}
```

**Why here.** Printed evaluations are shared in governance review. Clear
section identification on paper aids readability.

---

## Implementation Notes

### Token compliance

All durations use existing tokens:
- `--duration-instant` (100ms) for near-instant feedback
- `--duration-fast` (150ms) for micro-interactions
- `--duration-normal` (200ms) for state transitions

Where a duration falls between tokens (e.g., 280ms for drawer slide), use the
literal value. Do not introduce new duration tokens for one-off values.

### prefers-reduced-motion

The existing global rule in `states.css` zeroes all animation and transition
durations when reduced motion is preferred. All recommendations above are
automatically suppressed by this rule. No additional guards needed.

### Performance

All proposed animations use `transform` and `opacity` only (compositor-friendly).
The one exception is the strip cell glow (D2) which uses `box-shadow`, but this
fires once per section completion and self-removes on `animationend`.

### No new dependencies

Everything above is achievable with vanilla CSS and minor JS additions to
existing render/sync functions. No animation libraries or runtime dependencies.

---

## Summary Table

| ID | Priority | Area | Effort | Files |
|----|----------|------|--------|-------|
| D1 | HIGH | Completion badge | Small | states.css |
| D2 | HIGH | Strip cell glow | Small | states.css, sidebar.js |
| D3 | HIGH | Rating border sweep | Small | states.css, components.css |
| D4 | HIGH | Progress bar accent | Trivial | layout.css |
| D5 | HIGH | Page transition slide | Small | states.css |
| D6 | MED | Checkbox settle | Trivial | states.css |
| D7 | MED | Drawer reveal | Small | states.css |
| D8 | MED | Evidence accent flash | Small | states.css |
| D9 | MED | Drawer spring feel | Trivial | layout.css |
| D10 | MED | Pager press feedback | Small | states.css |
| D11 | MED | Skip toggle transition | Small | states.css |
| D12 | LOW | Focus ring accent | Trivial | states.css |
| D13 | LOW | Field focus accent | Trivial | states.css |
| D14 | LOW | Surface backdrop blur | Trivial | layout.css |
| D15 | LOW | Card entrance stagger | Trivial | states.css |
| D16 | LOW | Top accent duration | Trivial | states.css |
| D17 | LOW | Print section borders | Small | print.css |
