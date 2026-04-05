# Wave 2 — Bolder Assessment (Fresh)

**Date**: 2026-04-05
**Auditor**: bolder skill
**Scope**: `trust-framework.html`, all CSS files in `static/css/`
**State**: Post-Wave 1 typography (mini-card h3/subhead use Arial Narrow; `--text-md` 14px step added; field-help/evidence prose use 14px; score-2 teal shifted to `#0e7490`; criterion-card h3 bold; field-label tighter line-height; rating dots have score-level border colors)
**Aesthetic**: Efficient, Explicit, Engineered. Bold through weight and structure, not decoration. Regimented functionalism — flat, sharp, dense.

---

## What Is Already Strong (Do NOT Change)

- **Section left-border system** — 6px default, 8px active/focus-within, color-coded by principle. Assertive.
- **Accent-scoping architecture** — Body-level `data-active-accent-key` propagating to top bar, sidebar, tabs, buttons, sections via CSS custom properties. Sophisticated and working.
- **Top accent bar** — 5px, `--top-accent-color` transitioning per section via `@property`. Crisp.
- **Strip-cell progress encoding** — `inset 0 -3px 0` accent lines, full accent fill on complete, dashed for skipped. Information-dense and bold.
- **Nav button progress states** — `inset 0 3px 0` top accent shadow for in_progress/attention/blocked states. Distinctive.
- **Active form-section treatment** — 8px left border + tinted background + darker surrounding borders. Strong grounding.
- **Pager shell** — 2px border + darker bottom + workflow-state left accent. Grounded control surface.
- **Score-table headers** — `--neutral-200` background + 2px bottom border + `--ls-kicker: 0.08em` tracking + uppercase Arial Narrow. Good presence.
- **Notice block** — 14% red tint + 700 weight + 6px left border. Urgent without screaming.
- **Dashed-border for read-only/skipped** — Functional state encoding.
- **Criterion card `::after` code labels** — Monospace in top-right corner. Exposes internal structure.
- **Rating scale score-level differentiation** — Colored left borders + tint backgrounds + filled dots per score. Clear.
- **Type scale** — `--text-display: 2.25rem` for panel titles provides strong top-level hierarchy. `--text-md: 14px` fills the gap between sm and body.
- **Sharp radius policy** — `--radius-lg: 0px; --radius-md: 2px; --radius-sm: 1px`. No rounding creep.
- **Mock control judgment states** — `border-left: 4px solid` + tinted backgrounds + 700 weight for pass/conditional/fail. Decisive.
- **Chip color encoding** — Score, workflow, judgment, recommendation, and confidence states all use tinted backgrounds + colored borders + colored text. Dense information encoding.
- **Tooltip** — `background: var(--ut-navy); color: var(--ut-white)`. High-contrast, dark background. Confident.
- **Animation discipline** — Subtle `sectionEnter`, `ratingDotConfirm`, `ratingBorderConfirm`, `evidenceItemEnter`. No gratuitous motion. `prefers-reduced-motion` respected.
- **Font family assignments** — `--ff-body: Inter`, `--ff-heading: Arial Narrow`, `--ff-mono: JetBrains Mono`. Distinct roles, no ambiguity.

---

## Assessment: Why It Still Feels Safe

1. **Timid label typography** — Section kickers (the primary section identifiers) and field labels (the most critical form text) both sit at `--text-sm` (12px). They whisper instead of announce. In a dense instrument UI, labels should be readable at arm's length.

2. **Weak structural separators** — Consecutive section dividers are 1px `--ut-border`, which blends with the 1px card border. There's no visual "shelf" under section h2 headings. The structure runs together.

3. **Principle items undersold** — The five TRUST principle cards use 4px left borders and 4% tint backgrounds — barely distinguishable from generic bordered boxes despite being the framework's foundational identity.

4. **Generic chrome coloring** — Panel title bottom border, completion strip border, and header divider all use raw `--ut-border` without navy tinting. They lack conviction.

5. **Reference drawer code badges invisible** — At `--text-xs` (11px) in `--ut-muted` on `--ut-offwhite`, the reference drawer codes are the lowest-contrast text on the page.

6. **Framework panel boundary weak** — 3px left border at 18% navy reads as a generic divider rather than a deliberate structural boundary between working and reference surfaces.

---

## Recommendations

### R1 — Enlarge section kickers from `--text-sm` to `--text-md`

**Priority**: HIGH
**Description**: Section kickers ("TR · Transparent", "RE · Reliable", "S0 · Workflow") are the primary section identifiers. They use `--ff-mono`, uppercase, `--ls-section-kicker: 0.1em`, colored left borders, and 700 weight — all excellent. But at `--text-sm` (12px) they're the smallest meaningful text on the page. In a Swiss-inspired instrument UI, the section identity label should be legible at a glance. Bump to `--text-md` (14px) — the token added in wave 1 for exactly this kind of "important but compact" text.

**Specifics**:

```css
/* components.css — .section-kicker */
.section-kicker {
  font-size: var(--text-md); /* was var(--text-sm) */
  padding: 7px 14px; /* was 6px 14px — slightly more vertical room */
}
```

**Dependencies**: None. Self-contained.

---

### R2 — Enlarge field labels from `--text-sm` to `--text-md`

**Priority**: HIGH
**Description**: Field labels identify what data goes in every form field — they are the most scanned text in the form surface. At `--text-sm` (12px) in Arial Narrow uppercase, they're dense but hard to read quickly. At `--text-md` (14px), they remain compact (Arial Narrow is condensed) but gain enough size to scan at speed. The label vs help-text distinction is maintained through weight (700 vs 400) and transform (uppercase vs lowercase), so sharing the same font-size is safe.

**Specifics**:

```css
/* components.css — .field-label */
.field-label {
  font-size: var(--text-md); /* was var(--text-sm) */
}
```

**Dependencies**: None. Uses existing `--text-md` token.

---

### R3 — Strengthen principle items with thicker borders, stronger tints, and larger names

**Priority**: HIGH
**Description**: The five TRUST principle items in the About panel are the framework's identity cards. They use 4px left borders and 4% tint backgrounds — barely visible. The principle names in `<strong>` inherit body size. For the five foundational concepts, these should be unmissable colored blocks that read as a deliberate, structured unit.

**Specifics**:

```css
/* components.css — principle items */

.principle-item {
  padding: 14px 16px; /* was 12px 14px */
}

.principle-item strong {
  font-size: var(--text-sub); /* was inherited body size */
  letter-spacing: var(--ls-label); /* add tracking */
}

/* Per-principle: thicker borders + stronger tints */
.principle-item[data-section='tr'] {
  border-left: 6px solid var(--tr); /* was 4px */
  background: color-mix(in srgb, var(--tr) 8%, var(--ut-white)); /* was 4% */
}
.principle-item[data-section='re'] {
  border-left: 6px solid var(--re);
  background: color-mix(in srgb, var(--re) 8%, var(--ut-white));
}
.principle-item[data-section='uc'] {
  border-left: 6px solid var(--uc);
  background: color-mix(in srgb, var(--uc) 8%, var(--ut-white));
}
.principle-item[data-section='se'] {
  border-left: 6px solid var(--se);
  background: color-mix(in srgb, var(--se) 8%, var(--ut-white));
}
.principle-item[data-section='tc'] {
  border-left: 6px solid var(--tc);
  background: color-mix(in srgb, var(--tc) 8%, var(--ut-white));
}
```

**Dependencies**: None.

---

### R4 — Thicken consecutive section dividers from 1px to 2px with navy tint

**Priority**: HIGH
**Description**: Consecutive doc-sections and form-sections are separated by `border-top: 1px solid var(--ut-border)` with `margin-top: 16px`. In the context panel, sections stack vertically with substantial content. The 1px separator blends with each section's own 1px border — there is no clear delineation of where one section ends and the next begins. A 2px border in a navy-tinted color creates a decisive structural break.

**Specifics**:

```css
/* components.css — .doc-section + .doc-section, .form-section + .form-section */
.doc-section + .doc-section,
.form-section + .form-section {
  margin-top: 20px; /* was 16px — more breathing room */
  padding-top: 0;
  border-top: 2px solid
    color-mix(/* was 1px solid var(--ut-border) */ in srgb, var(--ut-navy) 14%, var(--ut-border));
}
```

**Dependencies**: None. The navy tint (14%) makes the separator distinct from each section's own 1px `--ut-border`.

---

### R5 — Add bottom-border separator under section h2 headings

**Priority**: HIGH
**Description**: Section h2 headings use `--text-heading` (25px) with Arial Narrow uppercase at 700 weight — good presence. But between the kicker and the h2, there's no horizontal "shelf" anchoring the heading. In the context panel where sections are read linearly, a thin bottom border under the h2 creates a visual break between the heading and its body text, making each section's structure scannable.

**Specifics**:

```css
/* components.css — .doc-section h2, .form-section h2 */
.doc-section h2,
.form-section h2 {
  margin: 0 0 14px;
  padding-bottom: 8px; /* add space below */
  border-bottom: 1px solid color-mix(in srgb, var(--ut-navy) 10%, var(--ut-border));
}
```

The `.criterion-card h3` has its own separate `border-bottom: 1px solid var(--ut-border)` and won't be affected since this selector targets h2 only.

**Dependencies**: None.

---

### R6 — Make panel title bottom border use active section accent color

**Priority**: MEDIUM
**Description**: The panel title (`.panel-title`) uses `border-bottom: 2px solid var(--ut-border)` — a generic gray. This is the highest-level heading in the working surface. Using the active section accent color ties the title visually to the current section, reinforcing which section the user is working in. The accent-scoping mechanism already provides `--active-section-accent` at the body level.

**Specifics**:

```css
/* layout.css — .panel-title */
.panel-title {
  border-bottom: 2px solid
    var(/* was: 2px solid var(--ut-border) */ --active-section-accent, var(--ut-border));
}
```

On the questionnaire panel, the border shows blue for TR, green for RE, purple for UC, etc. On the context panel, it follows the same active section.

**Dependencies**: None. Uses existing accent-scoping mechanism.

---

### R7 — Make sidebar tabs more visually assertive

**Priority**: MEDIUM
**Description**: The sidebar tab bar (Guidance / Reference / About) uses `--text-sm` (12px) with `padding: 10px 16px 8px`. This is the primary navigation surface for the context panel. At 12px the tabs feel like decoration rather than controls. Bump to `--text-md` (14px) and increase padding for a more confident tab bar.

**Specifics**:

```css
/* layout.css — .sidebar-tab */
.sidebar-tab {
  padding: 12px 18px 10px; /* was 10px 16px 8px */
  font-size: var(--text-md); /* was var(--text-sm) */
}
```

**Dependencies**: None.

---

### R8 — Enlarge reference drawer code badges and make them darker

**Priority**: MEDIUM
**Description**: Reference drawer code badges (`.reference-drawer-code`) use `--text-xs` (11px) in `--ut-muted` (`#576578`) on `--ut-offwhite` (`#f3f4f6`). This is the lowest-contrast text on the page. These badges label each reference drawer — they should be visible enough to scan. Bump to `--text-sm` (12px) and darken the text to `--ut-navy`.

**Specifics**:

```css
/* components.css — .reference-drawer-code */
.reference-drawer-code {
  padding: 3px 8px; /* was 2px 6px */
  font-size: var(--text-sm); /* was var(--text-xs) */
  color: var(--ut-navy); /* was var(--ut-muted) */
}
```

**Dependencies**: None.

---

### R9 — Strengthen framework panel left border from 3px to 4px

**Priority**: MEDIUM
**Description**: The framework/context panel left border is `3px solid color-mix(in srgb, var(--ut-navy) 18%, var(--ut-border))`. This is the structural divider between the working surface and the reference surface. At 3px with only 18% navy, it reads as a generic border. A 4px border with stronger navy (24%) makes the panel boundary more decisive.

**Specifics**:

```css
/* layout.css — .framework-panel (two occurrences) */

/* First occurrence (~line 125, original position) */
.framework-panel {
  border-right: 3px solid color-mix(in srgb, var(--ut-navy) 18%, var(--ut-border));
  /* NOTE: this is the border-right on the left-panel layout. The framework panel
     is now on the right side, so the relevant border is border-left below. */
}

/* Second occurrence (~line 272, current position) */
.framework-panel {
  border-left: 4px solid
    color-mix(/* was 3px solid at 18% */ in srgb, var(--ut-navy) 24%, var(--ut-border));
}
```

Only the `border-left` on the right-positioned framework panel needs updating. The `border-right` on line 125 applies to the original left-positioned layout and is overridden.

**Dependencies**: None.

---

### R10 — Add left accent border to reference drawer mini-cards

**Priority**: MEDIUM
**Description**: Mini-cards inside reference drawer panels are plain white boxes with 1px borders and no color identity. These contain evaluation reference material — scoring models, evidence requirements, judgment criteria. A left accent border in the reference section color (UT Pink) ties them to the reference drawer container and gives them structural alignment with the rest of the card system.

**Specifics**:

```css
/* components.css — add new scoped rule */
.reference-drawer-panel .mini-card {
  border-left: 3px solid color-mix(in srgb, var(--ut-pink) 40%, var(--ut-border));
}
```

Uses `--ut-pink` at 40% blend because reference sections use `--section-reference-accent: var(--ut-pink)`. The 40% blend keeps it subtle but visible.

**Dependencies**: None. Scoped to `.reference-drawer-panel .mini-card` only.

---

### R11 — Increase scoring section top border from 3px to 4px

**Priority**: MEDIUM
**Description**: The scoring/critical-fail section uses `border-top: 3px solid var(--ut-pink)`. This is the same weight as the left border on principle sections, so the visual distinction between "control section" vs "principle section" relies only on color. At 4px, the top border creates clearer structural differentiation for this critical control section.

**Specifics**:

```css
/* interaction-states.css — scoring section */
.doc-section[data-section][data-section='scoring'],
.form-section[data-section][data-section='scoring'] {
  border-left-color: var(--ut-pink);
  border-top: 4px solid var(--ut-pink); /* was 3px */
}
```

**Dependencies**: None.

---

### R12 — Thicken completion strip border from 1px to 2px

**Priority**: MEDIUM
**Description**: The completion strip in the header uses `border: 1px solid var(--ut-border)`. As the primary progress-tracking surface in the header bar, a 1px border reads as fragile. A 2px border gives the strip more visual weight commensurate with its role as the top-level navigation indicator.

**Specifics**:

```css
/* components.css — .completion-strip */
.completion-strip {
  border: 2px solid
    color-mix(/* was 1px solid var(--ut-border) */ in srgb, var(--ut-navy) 14%, var(--ut-border));
}
```

**Dependencies**: None.

---

### R13 — Increase criterion card background tint visibility

**Priority**: LOW
**Description**: Criterion cards use `background: color-mix(in srgb, var(--section-tint) 36%, var(--ut-white))`. Since `--section-tint` is already a 16% mix of accent into white, the resulting color is ~6% accent — barely perceptible. Increase to 50% blend for ~8% accent, which is still subtle but more noticeable.

**Specifics**:

```css
/* interaction-states.css — .criterion-card[class] */
.criterion-card[class] {
  background: color-mix(in srgb, var(--section-tint) 50%, /* was 36% */ var(--ut-white));
}
```

**Dependencies**: None.

---

### R14 — Increase panel progress bar height from 4px to 5px

**Priority**: LOW
**Description**: Panel progress bars are 4px tall — on standard displays this can read as a rendering artifact. Matching the top accent bar's 5px creates visual consistency between the two horizontal accent elements.

**Specifics**:

```css
/* layout.css — .panel-progress */
.panel-progress {
  height: 5px; /* was 4px */
}
```

**Dependencies**: None.

---

### R15 — Thicken header-bar divider from 1px to 2px with darker color

**Priority**: LOW
**Description**: The header-bar divider between completion strip and sidebar toggle is 1px in `--ut-border`. On the header bar — a primary navigation surface — 1px is nearly invisible. A 2px divider with navy tint creates a clearer visual break.

**Specifics**:

```css
/* layout.css — .header-bar-divider */
.header-bar-divider {
  width: 2px; /* was 1px */
  background: color-mix(/* was var(--ut-border) */ in srgb, var(--ut-navy) 22%, var(--ut-border));
}
```

**Dependencies**: None.

---

### R16 — Make shell divider handle more visible

**Priority**: LOW
**Description**: The shell divider handle (between questionnaire and context panels) is 2px wide and 24px tall. At 2px, it's nearly invisible and users won't discover that panels are resizable. Increase to 3px and 28px.

**Specifics**:

```css
/* layout.css — .shell-divider::after */
.shell-divider::after {
  width: 3px; /* was 2px */
  height: 28px; /* was 24px */
}
```

Also make the default (non-hover) handle slightly visible:

```css
/* layout.css — .shell-divider::after — add background */
.shell-divider::after {
  background: color-mix(in srgb, var(--ut-navy) 25%, var(--ut-border));
}
```

**Dependencies**: None.

---

### R17 — Enlarge evidence block left border from 4px to 6px

**Priority**: LOW
**Description**: Evidence blocks inside criterion cards use `border-left: 4px solid var(--section-accent)`. The parent criterion card uses a 6px left border. Matching the evidence block to the card's border width creates visual continuity within the criterion card's accent system.

**Specifics**:

```css
/* components.css — .evidence-block */
.evidence-block {
  margin-top: 16px;
  border-left: 6px solid var(--section-accent, var(--ut-blue)); /* was 4px */
  background: var(--ut-offwhite);
}
```

**Dependencies**: None.

---

## Summary Table

| ID  | Priority | Area        | Change                                                       | File                   |
| --- | -------- | ----------- | ------------------------------------------------------------ | ---------------------- |
| R1  | HIGH     | Typography  | Section kickers `--text-sm` → `--text-md` + padding          | components.css         |
| R2  | HIGH     | Typography  | Field labels `--text-sm` → `--text-md`                       | components.css         |
| R3  | HIGH     | Identity    | Principle items 4px→6px borders, 4%→8% tints, larger names   | components.css         |
| R4  | HIGH     | Structure   | Consecutive section dividers 1px→2px + navy tint + more gap  | components.css         |
| R5  | HIGH     | Hierarchy   | Section h2 bottom border separator                           | components.css         |
| R6  | MEDIUM   | Color       | Panel title border uses active section accent                | layout.css             |
| R7  | MEDIUM   | Navigation  | Sidebar tabs larger padding + `--text-md`                    | layout.css             |
| R8  | MEDIUM   | Typography  | Reference drawer code badges `--text-xs`→`--text-sm`, darker | components.css         |
| R9  | MEDIUM   | Structure   | Framework panel left border 3px→4px + stronger navy          | layout.css             |
| R10 | MEDIUM   | Structure   | Reference drawer mini-cards get left accent border           | components.css         |
| R11 | MEDIUM   | Structure   | Scoring section top border 3px→4px                           | interaction-states.css |
| R12 | MEDIUM   | Chrome      | Completion strip border 1px→2px + navy tint                  | components.css         |
| R13 | LOW      | Color       | Criterion card tint blend 36%→50%                            | interaction-states.css |
| R14 | LOW      | Chrome      | Panel progress bar 4px→5px                                   | layout.css             |
| R15 | LOW      | Chrome      | Header-bar divider 1px→2px + navy tint                       | layout.css             |
| R16 | LOW      | Interaction | Shell divider handle 2px→3px, 24px→28px, visible default     | layout.css             |
| R17 | LOW      | Structure   | Evidence block left border 4px→6px                           | components.css         |

---

## Implementation Order

1. **R1** (section kickers) + **R2** (field labels) — Both use `--text-md`; batch together. Highest readability impact.
2. **R3** (principle items) — Framework identity reinforcement.
3. **R4** (section dividers) + **R5** (h2 bottom border) — Structural clarity batch.
4. **R6** (panel title accent) — Color authority, uses existing mechanism.
5. **R7** (sidebar tabs) — Navigation presence.
6. **R12** (completion strip) — Header chrome consistency.
7. **R9** (framework panel border) — Panel boundary.
8. **R8** (reference drawer badges) — Typography detail.
9. **R10** (mini-card accent) — Reference structure.
10. **R11** (scoring top border) — Section differentiation.
11. **R13, R14, R15, R16, R17** — LOW priority batch, implement in any order.

---

## NOT Recommended (explicitly rejected)

- **Gradient backgrounds or text effects** — Violates "flat, not hierarchical" and "clean, flat backgrounds without gradients."
- **Box shadows on form sections or criterion cards** — Violates "no soft shadows — flat with border delineation."
- **Larger border-radius** — The 0-2px policy is core to the aesthetic. Anti-reference: soft rounded corners.
- **More vibrant/saturated principle colors** — The hex values are already strong (`#2563EB`, `#16A34A`, `#9333EA`, `#EA580C`, `#0D9488`). The issue is application strength, not hue.
- **Animated section transitions beyond existing fade** — Would slow power users. Anti-reference: motion-heavy onboarding.
- **Background patterns, textures, or noise** — Violates design principles.
- **Colorful section backgrounds (strong tints >10%)** — Would reduce text readability and violate "color encodes state, not decoration."
- **Icon additions to section headers** — "Verbosity over opacity" is a stated principle.
- **Hover lift/translate effects** — Explicitly prohibited in design context.
- **Pill-shaped buttons or chips** — Explicitly prohibited. Anti-reference.
- **Neon accents, glassmorphism, or gradient text** — Generic AI slop, not bold design.
- **Introducing a new `--text-label` token at 13px** — Unnecessary now that `--text-md` (14px) exists. Label vs help-text hierarchy is maintained through weight (700 vs 400) and transform (uppercase vs lowercase). Adding more type steps would dilute the scale.
