# Wave 2 Bolder Design Recommendations

Date: 2026-04-04
Scope: Visual amplification for the TRUST Framework questionnaire tool.
Approach: More confident, more visually impactful, still professional. Bolder means decisive visual authority -- not flashy decoration.

---

## Assessment of Current State

### What works well

The existing design has a solid structural foundation. The design token system is thorough and well-organized. The section-accent theming through CSS custom properties is technically sophisticated. The zero-radius, border-delineated aesthetic is intentional and distinctive -- it already avoids the rounded-rectangle AI slop trap. Typography has clear hierarchy through case, weight, and family switches (Inter body / Arial Narrow headings / JetBrains Mono data).

### What feels too safe

The design reads as flat and monotonous. Despite the strong token system, everything lands at the same visual weight. Surfaces are indistinguishable from each other. The information density is good, but it lacks hierarchy drama -- nothing commands attention over anything else. Spacing is uniform. Color is present but timid -- tints at 6-10% opacity are barely perceptible. The result feels like a wireframe that was declared finished.

Specific weakness sources:

- **Timid color application**: The section accent system exists but uses 6-10% tints that are invisible on most calibrated monitors. The 6px top-accent bar is the boldest color moment on the entire page, and it is six pixels tall.
- **No typographic drama**: The type scale has only five steps (0.64rem to 1.563rem) -- a 2.4x range. Everything is medium. Nothing is large; nothing is small. Headings are only 56% bigger than body text.
- **Uniform surfaces**: Every card, section, mini-card, field-group, and criterion-card uses the same white background with the same 1px border. No elevation, no depth, no visual separation between surfaces.
- **Static and lifeless**: Transitions exist but are 100-200ms -- barely perceptible. The `sectionEnter` animation is a 120ms opacity fade that users will never notice. No choreography, no rhythm.
- **Monotonous spacing**: Gaps are 10-16px everywhere. No breathing room, no compression, no rhythm variation.
- **Weak focal point**: The questionnaire panel header is the same visual treatment as every other section. The page title is the same weight and case as section kickers. Nothing says "you are here."

---

## Strategy

**Personality direction:** Authoritative instrument panel. Not maximalist chaos, not luxury refinement -- confident functionalism with visual conviction. Think mission control, not startup landing page.

**Risk budget:** Medium-high. This is an internal expert tool, not a consumer product. Users are domain professionals who value clarity over comfort. The design can push visual contrast hard because the audience will appreciate decisive information hierarchy.

**Focal point:** The active page's section card. When a reviewer is working on the TR principle, that section should visually dominate. Everything else should recede.

**Core moves:**
1. Dramatically increase the type scale range
2. Make section accents actually visible (not 6% tints)
3. Create clear surface hierarchy through background differentiation
4. Add motion choreography that aids orientation
5. Create spatial rhythm through varied spacing

**Constraints preserved:**
- Zero border-radius remains (this is already distinctive)
- Color encodes state, not decoration
- No gradients, no shadows for decoration
- No pill shapes, no rounded corners
- Light mode primary
- UT brand palette stays canonical
- Keyboard-first, accessibility-first

---

## Recommendations by Priority

### HIGH PRIORITY

#### 1. Amplify the type scale

The current 5-step scale is too compressed. Extend to 7 steps with a wider range, creating real hierarchy drama.

```css
/* tokens.css -- replace type scale block */

/* Current: 0.64rem to 1.563rem (2.4x range) */
/* Proposed: 0.56rem to 2.25rem (4.0x range) */

--text-xs: 0.56rem;      /* was 0.64rem -- tighter for metadata */
--text-sm: 0.75rem;       /* was 0.8rem */
--text-body: 1rem;        /* unchanged */
--text-sub: 1.2rem;       /* was 1.25rem -- tighten slightly */
--text-heading: 1.563rem; /* unchanged */
--text-display: 1.95rem;  /* NEW -- for panel titles, hero moments */
--text-mega: 2.25rem;     /* NEW -- for the questionnaire panel title only */
```

Apply the new sizes:

```css
/* layout.css */

/* Panel title should be the biggest thing in its panel */
.panel-title {
  font-size: var(--text-display);  /* was var(--text-body) */
  letter-spacing: var(--ls-panel-title);
  padding-bottom: 12px;            /* was 10px */
}

/* The questionnaire panel title is the page-level heading -- make it unmissable */
.questionnaire-panel .panel-title,
#questionnairePanelTitle {
  font-size: var(--text-mega);
  letter-spacing: 0.06em;
  border-bottom-width: 3px;        /* was 2px */
}

/* Section kickers should be louder */
.section-kicker {
  font-size: var(--text-sm);       /* was var(--text-sm), keep but pair with: */
  padding: 6px 14px;               /* was 5px 12px */
  margin-bottom: 14px;             /* was 12px */
}
```

**Why:** The questionnaire title at 1rem uppercase is the same size as body text. It should be the most prominent text in the viewport. Going from 1rem to 2.25rem makes it 4.5x bigger than metadata, creating real hierarchy.

---

#### 2. Make section accents visible

The section accent tint at 6-10% opacity is invisible. Increase to 14-20% for backgrounds, and use solid accent colors more often.

```css
/* tokens.css -- increase tint visibility across all section families */

/* Current pattern: 8-10% tint */
/* Proposed pattern: 14-18% tint */

/* Example for control section (apply same ratio to all section families) */
--section-control-tint: color-mix(in srgb, var(--section-control-accent) 16%, var(--ut-white));
--section-control-border: color-mix(in srgb, var(--section-control-accent) 32%, var(--ut-border));

/* Example for TR section */
--section-tr-tint: color-mix(in srgb, var(--section-tr-accent) 16%, var(--ut-white));
--section-tr-border: color-mix(in srgb, var(--section-tr-accent) 32%, var(--ut-border));
```

Apply the visible tints to active states:

```css
/* states.css -- active section should look active, not subtly different */

.doc-section.is-active[data-section],
.form-section.is-active[data-section] {
  background: var(--section-tint);        /* already using tint, but now tint is 16% not 10% */
  border-left-width: 8px;                 /* already present, good */
  border-top-color: var(--section-border);
  border-right-color: var(--section-border);
  border-bottom-color: var(--section-border);
  border-left-color: var(--section-accent);
}

/* Inactive sections should recede */
.doc-section:not(.is-active),
.form-section:not(.is-active) {
  opacity: 0.82;
}
```

**Why:** The current 10% tints are invisible on LCD monitors. 16% is still subtle but perceptible -- it creates an actual visual difference between active and inactive sections. Coupled with reduced opacity on inactive sections, the active page gains real visual dominance.

---

#### 3. Differentiate surface levels through background

Currently every surface is white. Create a clear 3-level background hierarchy.

```css
/* tokens.css -- add surface level tokens */

--surface-base: var(--ut-grey);           /* Level 0: canvas -- already exists as --ut-canvas */
--surface-panel: var(--ut-panel-bg);      /* Level 1: panel backgrounds -- already exists */
--surface-card: var(--ut-white);          /* Level 2: cards and sections on panels */
--surface-elevated: #ffffff;              /* Level 3: elements that need to pop above cards */
```

Apply differentiated surfaces:

```css
/* components.css -- field groups should be visually distinct from their parent section */

.field-group {
  background: color-mix(in srgb, var(--ut-navy) 2%, var(--ut-white));
  /* was var(--ut-white) -- now slightly tinted to distinguish from section bg */
}

/* Mini-cards inside reference drawers should feel recessed */
.mini-card {
  background: color-mix(in srgb, var(--ut-navy) 2%, var(--ut-white));
  /* was var(--ut-white) */
}

/* The completion strip should feel recessed into the header */
.completion-strip {
  background: color-mix(in srgb, var(--ut-navy) 3%, var(--ut-white));
  /* was var(--ut-white) */
}
```

```css
/* layout.css -- framework panel should be visually distinct from questionnaire panel */

.framework-panel {
  background: color-mix(in srgb, var(--ut-navy) 3%, var(--ut-grey));
  /* was var(--ut-panel-bg) -- slightly deeper tint to differentiate */
}
```

**Why:** Without background differentiation, users cannot distinguish surfaces at a glance. A 3-level system (grey canvas / off-white panels / white cards) creates visual depth without shadows or gradients.

---

#### 4. Increase top accent bar presence

The 6px top accent bar is the boldest color element but is so thin it reads as a decorative line. Increase to make it a real visual element that communicates active section.

```css
/* layout.css */

.top-accent {
  height: 8px;  /* was 6px */
}

/* Also shift the header down to match */
.site-header {
  inset: 8px 0 auto 0;  /* was 6px */
}
```

Additionally, make the active section color bleed into the header more decisively:

```css
/* states.css -- the panel progress bar should match the section accent and be taller */

.panel-progress {
  height: 4px;  /* was 3px */
}

.panel-progress-bar {
  background: var(--active-section-accent-strong);
  /* was var(--ut-blue) -- now uses the active section's accent, which it already
     does through the progress bar's dynamic width, but the track itself should
     show a section-aware tint */
}

.panel-progress {
  background: color-mix(in srgb, var(--active-section-accent, var(--ut-blue)) 14%, var(--ut-white));
  /* was 8% -- more visible track */
}
```

**Why:** The top bar and progress bar are the only places where color is applied at full saturation. Making them slightly larger (8px, 4px) and more visible makes the section-aware color actually serve its orienting function.

---

#### 5. Create spatial rhythm through varied gaps

Replace the uniform 14-16px gaps with a deliberate rhythm: tight groupings for related content, generous gaps between major sections.

```css
/* layout.css -- vary the shell-level gaps */

.questionnaire-shell {
  gap: 24px;  /* was 18px -- more breathing room between major shell blocks */
}

.questionnaire-workspace {
  gap: 22px;  /* was 16px */
}

.workspace-layout {
  gap: 22px;  /* was 18px */
}

/* components.css -- tighten internal groupings to contrast with the larger gaps */

.field-grid {
  gap: 10px;   /* was 14px -- tighter because fields within a group are related */
  margin-top: 10px;  /* was 14px */
}

.criteria-stack {
  gap: 12px;  /* was 18px -- criteria within a section are closely related */
  margin-top: 10px;  /* was 14px */
}

.score-cards,
.reference-cards {
  gap: 10px;   /* was 14px -- tighter grouping */
  margin-top: 14px;  /* was 18px */
}

/* But increase gaps between major sections */
.doc-section + .doc-section,
.form-section + .form-section {
  margin-top: 22px;  /* was 16px */
}
```

**Why:** When everything is 14-16px apart, nothing has rhythm. Tight groupings (10px) say "these things belong together." Generous gaps (22-24px) say "this is a new topic." The contrast creates visual information.

---

### MEDIUM PRIORITY

#### 6. Add page transition choreography

The current page transition is a 150ms opacity fade -- imperceptible and disorienting. Replace with a directional slide that communicates forward/backward movement.

```css
/* states.css -- replace the page crossfade with directional slide */

.form-section[data-page-id] {
  transition: none;  /* remove the opacity-only transition */
}

.form-section.is-page-transitioning-out {
  animation: pageSlideOut 160ms var(--ease-out-quart) forwards;
}

.form-section.is-page-transitioning-in {
  animation: pageSlideIn 200ms var(--ease-out-quart) forwards;
}

/* Forward (next page) */
@keyframes pageSlideOut {
  0%   { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(-24px); }
}

@keyframes pageSlideIn {
  0%   { opacity: 0; transform: translateX(24px); }
  100% { opacity: 1; transform: translateX(0); }
}
```

For backward navigation, the JS should apply a modifier class:

```css
.form-section.is-page-transitioning-out.is-backward {
  animation: pageSlideOutBackward 160ms var(--ease-out-quart) forwards;
}

.form-section.is-page-transitioning-in.is-backward {
  animation: pageSlideInBackward 200ms var(--ease-out-quart) forwards;
}

@keyframes pageSlideOutBackward {
  0%   { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(24px); }
}

@keyframes pageSlideInBackward {
  0%   { opacity: 0; transform: translateX(-24px); }
  100% { opacity: 1; transform: translateX(0); }
}
```

**Why:** Directional transitions communicate spatial relationships (forward = right, back = left) and give users a sense of where they are in the questionnaire sequence. 24px is subtle enough for a data-dense tool but perceptible enough to aid orientation.

**JS change required:** The pager/navigation module needs to add `.is-backward` to the transition classes when navigating to a lower page index.

---

#### 7. Make section kickers into real section indicators

Section kickers (the "TR" / "RE" / "UC" etc. labels) are currently small inline pills. They should feel like authoritative section stamps.

```css
/* components.css -- strengthen the section kicker */

.section-kicker {
  padding: 7px 16px;               /* was 5px 12px */
  margin-bottom: 16px;             /* was 12px */
  font-size: var(--text-sm);
  letter-spacing: 0.1em;           /* was 0.08em -- more spaced */
  border-left-width: 4px;          /* this comes from states.css, currently 3px -- make it 4px */
}
```

```css
/* states.css -- increase kicker border-left to match */

.doc-section[data-section] .section-kicker,
.form-section[data-section] .section-kicker {
  border-left: 4px solid var(--section-accent);  /* was 3px */
}
```

**Why:** The kicker is the primary way users identify which TRUST principle they are working on. Making it larger and more spaced signals this importance. The 4px left border creates a stronger color anchor.

---

#### 8. Strengthen the completion strip visual weight

The completion strip cells are currently 20px tall with 1px borders. They are too small and too quiet for a progress indicator that users rely on.

```css
/* components.css */

.strip-cell {
  min-width: 2.8rem;    /* was 2.65rem */
  height: 24px;         /* was 20px */
  padding: 0 7px;       /* was 0 6px */
  font-size: var(--text-xs);
}

.completion-strip {
  gap: 3px;             /* was 4px -- tighter to read as a continuous strip */
  padding: 5px 8px;     /* was 4px 6px */
}
```

```css
/* states.css -- filled cells should be unmistakable */

.strip-cell[data-progress-state="complete"] {
  font-weight: 800;     /* was inherited 700 */
}
```

**Why:** The completion strip is the primary orientation device -- it shows where you are in the 13-page questionnaire. At 20px tall, it is easy to overlook. 24px is still compact but readable. The progress cells should feel like a control panel indicator, not a decorative element.

---

#### 9. Increase rating scale presence

The rating scale is the core interaction of the entire tool. Currently it is a flat grid with thin borders. Make it feel like a deliberate instrument.

```css
/* components.css */

.rating-scale {
  gap: 4px;             /* was 6px -- tighter to read as a single control */
  padding: 8px;         /* was 10px */
  border: 2px solid var(--ut-border);  /* was 1px -- frame the scale more decisively */
}

.rating-option {
  padding: 10px 8px;    /* was 8px 6px */
  min-height: 48px;     /* was 44px */
  border: 1px solid var(--ut-border);
}

/* The score-level left borders should be thicker */
.rating-option:nth-child(1) {
  border-left: 3px solid var(--score-0-border);  /* was 2px */
}
.rating-option:nth-child(2) {
  border-left: 3px solid var(--score-1-border);  /* was 2px */
}
.rating-option:nth-child(3) {
  border-left: 3px solid var(--score-2-border);  /* was 2px */
}
.rating-option:nth-child(4) {
  border-left: 3px solid var(--score-3-border);  /* was 2px */
}
```

```css
/* states.css -- selected rating should feel definitive */

.rating-option.selected {
  border-left-width: 6px;    /* was 3px */
  border-color: var(--score-2-border);
}

.rating-option.score-0 {
  border-left: 6px solid var(--score-0);  /* was 3px */
}
.rating-option.score-1 {
  border-left: 6px solid var(--score-1);  /* was 3px */
}
.rating-option.score-2 {
  border-left: 6px solid var(--score-2);  /* was 3px */
}
.rating-option.score-3 {
  border-left: 6px solid var(--score-3);  /* was 3px */
}
```

**Why:** The rating scale is where evaluators record their assessments. A 2px outer frame and 3px left borders make it feel like a precise instrument rather than a form element that happened to be there. The 6px selected state creates an unambiguous visual commitment.

---

#### 10. Add staggered entrance choreography for criterion cards

When a principle section loads, criterion cards should enter with a stagger that creates visual rhythm and draws the eye through the evaluation sequence.

```css
/* states.css -- enhance the existing sectionEnter */

@keyframes sectionEnter {
  0%   { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}

.doc-section,
.form-section {
  animation: sectionEnter 180ms var(--ease-out-quart) forwards;  /* was 120ms */
}

/* Criterion cards get staggered entrance */
.criterion-card {
  animation: criterionEnter 200ms var(--ease-out-quart) forwards;
  animation-delay: calc(var(--criterion-index, 0) * 60ms);
  opacity: 0;
}

@keyframes criterionEnter {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

**JS change required:** The questionnaire page renderer should set `--criterion-index` as an inline custom property on each `.criterion-card` (0, 1, 2, ...) to drive the stagger delay.

```css
/* Reduced motion: keep existing override, add criterion */
@media (prefers-reduced-motion: reduce) {
  .criterion-card {
    animation-duration: 0ms !important;
    animation-delay: 0ms !important;
    opacity: 1;
  }
}
```

**Why:** A 60ms stagger across 2-4 criterion cards takes 120-180ms total -- fast enough to not delay work, but perceptible enough to create a sense of the evaluation structure unfolding. It aids orientation by making the sequence of criteria legible.

---

#### 11. Strengthen the pager visual presence

The pager is the primary navigation control. It should feel like a control bar, not a form element.

```css
/* components.css */

.pager-shell {
  padding: 12px 14px;   /* was 10px 12px */
  border: 2px solid var(--ut-border);  /* was 1px */
  background: var(--ut-offwhite);      /* keep */
}

.pager-button {
  padding: 10px 14px;   /* was 9px 12px */
  font-size: var(--text-sm);
  font-weight: 800;     /* was 700 */
  border: 2px solid var(--ut-border);  /* was 1px */
}

.pager-status {
  font-size: var(--text-sm);
  font-weight: 700;     /* add -- was unbolded */
}
```

**Why:** The pager with 1px borders reads as a decorative strip. 2px borders and bolder type give it the weight of a real control bar. Users should never have to search for the pager.

---

### LOW PRIORITY

#### 12. Add a subtle column separator between sidebar and questionnaire

The framework panel border is currently a 3px solid line. Replace it with a more architectural separator.

```css
/* layout.css */

.framework-panel {
  border-left: 3px solid color-mix(in srgb, var(--ut-navy) 18%, var(--ut-border));
  /* was 3px solid var(--ut-border) -- slightly darker to create a more decisive split */
}
```

This is conservative. A bolder option would be a double-line separator:

```css
/* Alternative -- if you want more visual structure */
.framework-panel {
  border-left: 3px double color-mix(in srgb, var(--ut-navy) 24%, var(--ut-border));
  border-left-width: 6px;  /* double borders need more width to render visibly */
}
```

**Why:** The panel divider is the primary structural line in the interface. Making it slightly stronger reinforces the split between working surface (questionnaire) and reference surface (context).

---

#### 13. Make the header progress summary more visible

```css
/* states.css -- header progress summary is currently very subtle */

.header-progress-summary {
  padding: 10px 12px;   /* was 8px 10px */
  border: 1px solid color-mix(in srgb, var(--ut-navy) 16%, var(--ut-border));
  /* was 1px solid var(--ut-border) -- darker border */
}

.header-progress-title {
  letter-spacing: 0.1em;  /* was 0.08em */
}
```

**Why:** The progress summary in the header is a key orientation device. A slightly darker border and more spaced title make it feel like a dashboard readout rather than a decorative element.

---

#### 14. Add micro-detail: left-border thickness variation for section hierarchy

Use different border-left thicknesses to encode section type hierarchy.

```css
/* states.css -- principle sections get the thickest border */

.doc-section[data-section="tr"],
.form-section[data-section="tr"],
.doc-section[data-section="re"],
.form-section[data-section="re"],
.doc-section[data-section="uc"],
.form-section[data-section="uc"],
.doc-section[data-section="se"],
.form-section[data-section="se"],
.doc-section[data-section="tc"],
.form-section[data-section="tc"] {
  border-left-width: 8px;   /* was 6px for principle sections */
}

/* Control/setup sections get a medium border */
.doc-section[data-section="control"],
.form-section[data-section="control"],
.doc-section[data-section="profile"],
.form-section[data-section="profile"],
.doc-section[data-section="setup"],
.form-section[data-section="setup"] {
  border-left-width: 6px;   /* keep at current */
}

/* Governance sections get a slightly thinner border */
.doc-section[data-section="governance"],
.form-section[data-section="governance"] {
  border-left-width: 5px;   /* thinner to encode secondary hierarchy */
}
```

**Why:** Border-left thickness is the primary section identification system. Varying it (5px / 6px / 8px) creates a visual hierarchy: principle evaluations are the most important, control/setup are secondary, governance is tertiary. This encodes real structural meaning into the visual treatment.

---

#### 15. Evidence block visual reinforcement

```css
/* components.css */

.evidence-block {
  border-left-width: 5px;   /* was 4px */
  background: color-mix(in srgb, var(--ut-navy) 3%, var(--ut-offwhite));
  /* was var(--ut-offwhite) -- slight navy tint */
}

.evidence-block.criterion {
  border-left-color: color-mix(in srgb, var(--ut-navy) 40%, var(--ut-border));
  /* was 35% -- slightly stronger */
}
```

**Why:** Evidence blocks are critical workflow elements. The slightly stronger tint and border make them easier to locate when scanning a dense criterion card.

---

#### 16. Surface cards (modals) should feel more definitive

```css
/* layout.css */

.surface-card {
  border: 2px solid color-mix(in srgb, var(--ut-navy) 24%, var(--ut-border));
  /* was 2px solid var(--ut-border) -- darker */
  padding: 20px 22px 22px;  /* was 16px 18px 18px -- more generous */
}

.surface-header h2 {
  font-size: var(--text-display);  /* was var(--text-heading) -- use the larger scale */
}

.surface-kicker {
  margin-bottom: 6px;  /* was 4px */
  font-size: var(--text-sm);
  letter-spacing: 0.1em;  /* was 0.08em */
}
```

**Why:** Surface overlays (Info, Help) are modal surfaces that temporarily replace the primary workspace. They should feel architecturally distinct -- heavier borders, larger type, more breathing room -- to signal "you are in a different context now."

---

#### 17. Reference drawer active state reinforcement

```css
/* components.css */

.reference-drawer-summary {
  padding: 12px 14px;  /* was 10px 12px */
  font-size: var(--text-sm);
  letter-spacing: 0.07em;  /* was 0.06em */
}

/* states.css */

.reference-drawer.is-open {
  border-color: color-mix(in srgb, var(--ut-navy) 22%, var(--ut-border));
  /* was 18% -- slightly stronger */
  border-left: 4px solid var(--ut-darkblue);  /* add a left border to echo section cards */
}

.reference-drawer[open] .reference-drawer-summary {
  background: color-mix(in srgb, var(--ut-navy) 6%, var(--ut-white));
  /* was 4% -- slightly stronger */
}
```

**Why:** Open reference drawers should feel structurally integrated with the rest of the card-based system. Adding a left border (like section cards) and strengthening the tint creates visual consistency.

---

#### 18. Nav button weight increase

```css
/* components.css */

.nav-button {
  padding: 10px 16px;  /* was 10px 18px -- slightly tighter horizontal */
  font-weight: 800;     /* was 700 */
  border: 1px solid color-mix(in srgb, var(--ut-navy) 18%, var(--ut-border));
  /* was 1px solid var(--ut-border) -- darker default border */
}

.shell-action-button {
  padding-inline: 14px;  /* was 12px */
}
```

**Why:** Nav buttons are chrome-level controls. The darker default border makes them feel like real buttons rather than text with a faint outline. The weight increase (700 to 800) matches the rest of the heading/control typography.

---

## Summary of Impact

| Dimension | Current State | After Recommendations |
|-----------|--------------|----------------------|
| Type scale range | 2.4x (0.64-1.56rem) | 4.0x (0.56-2.25rem) |
| Active section visibility | 10% tint (barely visible) | 16% tint + reduced opacity on others |
| Surface hierarchy | All white | 3-level (grey/off-white/white) |
| Top accent bar | 6px | 8px with stronger section color |
| Spacing rhythm | Uniform 14-16px | Varied (10px tight / 16px medium / 22-24px generous) |
| Page transitions | 150ms opacity fade | 200ms directional slide |
| Rating scale presence | Thin borders, small | 2px outer frame, 6px selected state |
| Kicker presence | Small inline pill | Larger, more spaced, 4px left border |

## What stays the same

- Zero border-radius throughout
- No gradients or shadows
- No rounded corners or pill shapes
- Light mode only
- UT brand palette (no new colors)
- Color encodes state only
- Monospace for data/codes
- Keyboard-first accessibility
- Print and reduced-motion support
- All existing token naming conventions
- All existing HTML structure and JS behavior

## Implementation order

1. Type scale changes (#1) -- tokens.css only, then update consumers
2. Tint visibility (#2) -- tokens.css + states.css
3. Surface differentiation (#3) -- tokens.css + components.css + layout.css
4. Top accent + progress bar (#4) -- layout.css + states.css
5. Spacing rhythm (#5) -- layout.css + components.css
6. Page transition choreography (#6) -- states.css + JS change
7. Remaining items (#7-18) -- individual component files

Items 1-5 are CSS-only changes that can be implemented in one pass. Item 6 requires a small JS modification. Items 7-18 are incremental component-level improvements.
