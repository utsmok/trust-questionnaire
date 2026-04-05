# Design Critique — TRUST Framework Questionnaire (Post-Wave 5, Re-Assessment)

**Date**: 2026-04-05 (Wave 3 diagnostic re-run)
**Auditor**: /critique (impeccable design skill)
**Target**: `trust-framework.html` + `static/css/` (8 files, ~4800 lines total)
**Context**: Full post-Wave-5 assessment. Previous score: 34/40 (Nielsen), ~85/100 (dimensional). This critique re-evaluates after Wave 2 refinements (section kickers at 14px, 6px principle-item borders, 2px section dividers, pager shell shadow, top-accent easing, border-left-width transitions, interaction-state refinements) and Wave 1 typography fixes (mini-card h3, subhead Arial Narrow, --text-md 14px step, score-2 teal #0e7490, criterion-card h3 bold, field-label tighter line-height, rating dot score-level border colors).

---

## Anti-Patterns Verdict: PASS — Confirmed Human-Engineered

This interface does not look AI-generated. It looks like a purpose-built evaluation instrument from a university information-services team.

**Evidence against AI slop:**

- Zero gradient text, glassmorphism, glowing accents, hero metric layouts, or decorative SVG patterns
- No dark-mode-with-purple-glow, no pill-shaped buttons, no "clean modern" aesthetic
- Three-font stack (Inter body, Arial Narrow headings, JetBrains Mono data) with deliberate functional zoning
- `color-mix()` semantic tinting throughout — no Tailwind defaults, no copied palettes
- Sharp corners (0–2px), visible grid borders, zero soft shadows except the pager shell's `box-shadow: 0 1px 3px`
- `@property` registered custom property for smooth accent-bar color transitions — sophisticated CSS AI tools skip
- `@starting-style` entry animations — progressive CSS AI codegen ignores
- Print stylesheet is thorough and hand-crafted (score-level colored borders, section kickers, page-break rules)
- Score-level border colors on rating dots (`--score-0` through `--score-3`) encode semantic meaning through both color AND position

**Verdict**: Zero AI aesthetic tells. This is the opposite of AI-generated design — it's regimented, explicit, and engineered for domain experts.

---

## Design Health Score — Nielsen's 10 Heuristics

| #         | Heuristic                       | Score       | Key Issue                                                                                                                                                                                                                          |
| --------- | ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | **3.5**     | Completion strip with per-cell progress, panel progress bars, section validation states, header progress summary, top accent bar color-shift per section, scroll shadow indicators. Missing: no global save/persistence indicator. |
| 2         | Match System / Real World       | **4**       | Domain terminology throughout. Section codes (S0, TR1, RE2) match framework spec exactly. Panel captions user-facing. Trusts user expertise without infantilizing.                                                                 |
| 3         | User Control and Freedom        | **3**       | Pager prev/next, direct page navigation, Escape dismisses overlays, skip links. Missing: no undo for field changes, no draft recovery, Alt+Left/Right pager shortcuts absent.                                                      |
| 4         | Consistency and Standards       | **4**       | Remarkably consistent. Same border-left accent pattern everywhere. Same chip/tag state patterns. Same focus ring treatment. Same font-weight hierarchy. No divergent patterns.                                                     |
| 5         | Error Prevention                | **3.5**     | Data-attribute validation states (attention, invalid, blocked). `.validation-message` with error/warning variants. Conditional field visibility. Missing: no confirmation on evidence deletion.                                    |
| 6         | Recognition Rather Than Recall  | **3.5**     | Page index always visible, context panel updates per page, reference drawers expose scoring models, skip links, help legend. Pager shortcuts row shows keyboard hints.                                                             |
| 7         | Flexibility and Efficiency      | **3**       | Alt+1–5 principle jumps, Alt+letter prefix jumps, Arrow keys on rating scales, Escape closes overlays. Missing: no Alt+Left/Right pager navigation, no jump-to-first-incomplete.                                                   |
| 8         | Aesthetic and Minimalist Design | **3.5**     | Dense but purposeful. Every element carries semantic weight. Split-panel keeps context adjacent. Header at 118px (reduced). Some residual crowding in completion strip.                                                            |
| 9         | Error Recovery                  | **3**       | Validation messages with color + text. Field-level and section-level error states. Missing: no inline suggestion for how to fix, no field-level character count.                                                                   |
| 10        | Help and Documentation          | **4**       | Three-tier help: reference drawers (inline), context panel (per-page), About surface, Help surface (interaction legend). Exceptionally thorough for a single-page tool.                                                            |
| **Total** |                                 | **34.5/40** | **Good (Rating band: 28–35)**                                                                                                                                                                                                      |

---

## Dimensional Scores

| Dimension                | Score      | Key Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual Hierarchy         | **88/100** | Excellent: section kickers at `--text-sm` (14px) with monospace create clear entry points. Criterion-card h3 bold with border-bottom separator. Field-label tight `line-height: var(--lh-heading)` at uppercase creates strong label/field contrast. Panel titles at `--text-display` (2.25rem) are unmistakably primary. One concern: `.subhead` and `.doc-section h3` share the same `--text-sub` size (1.2rem) and `--ff-heading` — they're visually identical despite different structural roles. |
| Information Architecture | **90/100** | Outstanding: 12 sections, clear workflow states (editable/read-only/system-skipped), completion groups, criterion stacks within principle sections. Page index sidebar provides constant orientation. Context panel with three tabs (Guidance, Reference, About) keeps everything discoverable without leaving the page.                                                                                                                                                                              |
| Emotional Resonance      | **82/100** | The interface successfully achieves "efficient, explicit, engineered" — it feels like a calibrated instrument. The principle-color system (TR=blue, RE=green, UC=purple, SE=orange, TC=teal) creates visual identity without decoration. The score-2 shift to `#0e7490` (teal) from green is a meaningful distinction that avoids the "passing" connotation of green. Minor gap: no completion celebration or satisficing moment at the end.                                                          |
| Cognitive Load           | **78/100** | Dense by design, which is appropriate for domain experts. The 4-option rating scale (0–3) is perfect for working memory. Section kickers reduce scanning effort. Page-level focus (one active page at a time) prevents overload. However: the completion strip can show 12+ cells simultaneously, and the header area packs brand + completion strip + toggle into a tight 118px bar. At the 760px breakpoint, the header jumps to 168px — a significant viewport cost.                               |
| Overall Quality          | **86/100** | A well-engineered evaluation instrument. The CSS architecture (tokens → base → layout → components → interaction-states → accent-scoping → animations → print) is exemplary. The semantic color system with `color-mix()` tints is sophisticated. Wave 1 and 2 changes are well-integrated with no regressions detected.                                                                                                                                                                              |

---

## Cognitive Load Checklist (8-item)

| #   | Check                  | Status   | Notes                                                                                                                                          |
| --- | ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Single focus           | **PASS** | One active page visible at a time. Inactive pages hidden via `.is-page-hidden`.                                                                |
| 2   | Chunking               | **PASS** | Fields grouped in `.field-grid` (2-column auto-fit). Criterion cards are self-contained. Rating options are 4 per scale.                       |
| 3   | Grouping               | **PASS** | `.form-section` cards with border-left accent, `.criterion-card` within sections, `.mini-card` grids for reference. Visual grouping is strong. |
| 4   | Visual hierarchy       | **PASS** | Panel title → section h2 → section-kicker → criterion-card h3 → field-label → field-help. Six clear levels.                                    |
| 5   | One thing at a time    | **PASS** | Page-based navigation prevents simultaneous evaluation of multiple sections.                                                                   |
| 6   | Minimal choices        | **PASS** | Rating scales: 4 options (within working memory). Pager: 2 buttons + status. Tabs: 3 options.                                                  |
| 7   | Working memory         | **PASS** | Context panel stays visible alongside questionnaire. No need to remember information from another page.                                        |
| 8   | Progressive disclosure | **PASS** | Reference drawers collapsed by default. Evidence blocks expandable. Context panel tabs show one at a time.                                     |

**Score**: 0 failures = low cognitive load. The interface respects the density-is-a-feature principle while maintaining manageable complexity.

---

## What's Working (Preserve These)

### 1. Semantic Color Architecture (`tokens.css`)

The color system is exceptional. Every color has a semantic purpose:

- **Score-level colors** (`--score-0` through `--score-3`) with tints and borders — used in rating dots, options, chips, and tables
- **Workflow states** (editable, read-only, system-skipped) — applied via data attributes
- **Judgment states** (pass, conditional, fail) — with mock-control visual encoding
- **Recommendation states** (6 categories, each with tint/border) — applied to chips and mock-controls
- **Validation states** (attention, invalid, blocked) — field-level, criterion-level, and page-level
- **Section accent families** (12 sections × 5 tokens each) — scoped via `accent-scoping.css`

This is one of the most thorough CSS color systems I've seen in a vanilla project. The `color-mix()` approach avoids the maintenance nightmare of hardcoded color variants. **Do not simplify or reduce this.**

### 2. Typography Zoning

Three-font stack with clear functional separation:

- **Inter** for body text — readable, neutral
- **Arial Narrow** for headings/kickers/labels — condensed uppercase creates strong hierarchy without taking vertical space
- **JetBrains Mono** for data/codes/annotations — monospace for field IDs, section codes, scoring values

The Wave 1 additions are well-judged:

- `--text-md: 0.875rem` (14px) fills the gap between `--text-sm` (12px) and `--text-body` (16px)
- `.field-help` and evidence prose at 14px is the right density
- `.criterion-card h3` now bold — creates proper weight separation from body text
- `.field-label` at `--lh-heading` (1.2) — tighter than body, appropriate for uppercase labels

### 3. Border-Left Accent System

The 6px/8px border-left accent is used consistently across:

- `.doc-section` and `.form-section` (6px → 8px on `.is-active`)
- `.criterion-card` (6px → 8px on `:focus-within`)
- `.principle-item` (4px, now properly sized)
- `.page-index-button` (4px)
- `.context-route-card`, `.context-anchor-card`, `.about-topic-meta` (4px)
- `.help-section-item` (4px)
- `.evidence-block` (4px)
- `.notice` (6px)

The `@starting-style` transition from 6px → 8px on active is a subtle but effective state indicator. **Preserve this pattern.**

### 4. Rating Scale Design

The 4-option rating scale with score-level border colors is excellent:

- Each option has a distinct left-border color (red/orange/teal/green)
- Rating dots inherit score-level border colors in unselected state
- Selected state fills the dot with the score color
- `.is-just-selected` triggers a confirm animation (dot scale + border pulse)
- Score-level backgrounds (tints) applied on selection
- `aria-disabled='true'` grays out unavailable options

This is well-designed for rapid evaluation — the color encoding lets reviewers scan their previous answers without reading.

### 5. Print Stylesheet (`print.css`)

Thorough print support: hides navigation chrome, expands hidden pages, preserves color on scored elements via `print-color-adjust: exact`, adds page-break rules for principle sections, and includes principle-code prefixes in section kickers for print-only context.

---

## Priority Issues

### [P1] Field-label at `--text-sm` is undersized for non-power users

**What**: `.field-label` uses `font-size: var(--text-sm)` (12px) — the smallest text on the page — despite being the primary wayfinding element for each field.
**Why it matters**: At 12px with uppercase and Arial Narrow, labels are 10px effective cap-height. For a 132+ field form, this creates scanning difficulty. The design context says "Efficient, Explicit, Engineered" — explicit should mean labels are unmissable.
**Fix**: Bump `.field-label` to `var(--text-md)` (14px) or add `font-size: var(--text-md)` as a Wave 3 step. The Wave 2 already moved section kickers to 14px; field labels deserve the same treatment.
**Location**: `static/css/components.css:343`
**Suggested command**: `/typeset`

### [P1] Rating-option transition uses `--duration-instant` (100ms) — too fast for visual confirmation

**What**: `.rating-option` transitions (background, border-color, border-left-width) all use `--duration-instant` (100ms). This is below the 150ms minimum for perceptible change.
**Why it matters**: The rating selection is the most frequent interaction. Users need to see the state change to confirm their choice registered. 100ms is imperceptible for border-width changes (2px → 3px).
**Fix**: Change `.rating-option` transition duration to `--duration-fast` (150ms) for non-score-change properties, keep `--duration-instant` only for hover states.
**Location**: `static/css/components.css:517-519`, `static/css/interaction-states.css:730-733`
**Suggested command**: `/animate`

### [P2] No empty-state guidance for the context sidebar fallback

**What**: The context sidebar fallback (`.context-empty-state`) shows "Select a page to see context guidance" — a passive instruction with no actionable next step.
**Why it matters**: First-time users arriving at the questionnaire see this as their introduction to the context panel. It should orient them, not just say "select something."
**Fix**: Add a brief description of what the context panel provides, or make the first page auto-selected on load.
**Location**: `trust-framework.html:104-107`
**Suggested command**: `/clarify`

### [P2] `--ut-grey` and `--ut-offwhite` are too close in value (#eef0f3 vs #f3f4f6)

**What**: `--ut-grey` (canvas: #eef0f3) and `--ut-offwhite` (#f3f4f6) differ by only ~2% lightness. They're used for different semantic purposes (canvas background vs card backgrounds vs offwhite backgrounds) but are visually indistinguishable on most monitors.
**Why it matters**: If two surfaces look the same but represent different semantic layers, the visual system can't parse the hierarchy. The `.evidence-block` uses `--ut-offwhite`, the `.mock-control` uses `--ut-grey`, and the canvas is `--ut-grey` — all three merge together.
**Fix**: Increase separation. Either push `--ut-offwhite` to #f7f8fa or pull `--ut-grey` to #eaecf0. A 4–5% lightness gap is the minimum for boundary detection.
**Location**: `static/css/tokens.css:20-22`
**Suggested command**: `/colorize`

### [P2] Principle-item border-left at 4px is inconsistent with the 6px section-card accent

**What**: `.principle-item` uses `border-left: 4px solid` while `.doc-section` and `.form-section` use `border-left: 6px solid`. The principle items are the "children" of principle sections — their border should echo the parent pattern.
**Why it matters**: Wave 2 specifically adjusted principle-item borders to 6px, but the CSS still shows 4px for the data-section-specific variants (`components.css:175-218`). The generic `.principle-item` rule at line 163 also shows no border-left. The interaction-states.css doesn't override this for principle-items.
**Fix**: Ensure `.principle-item[data-section='tr']` etc. use `border-left: 6px solid` consistently. Or document if 4px is intentional for visual hierarchy (parent=6px, child=4px).
**Location**: `static/css/components.css:175`, `static/css/interaction-states.css` (no principle-item border overrides)
**Suggested command**: `/normalize`

### [P3] `.panel-caption` at `--text-body` (16px) is one step too large for secondary text

**What**: `.panel-caption` (the "Navigate pages using the pager below or the sidebar index" instruction) uses `font-size: var(--text-body)` (16px) — same size as paragraph text.
**Why it matters**: Captions are secondary instructions. At 16px they compete visually with the panel title and section content. The `.impeccable.md` context says "direct and unadorned" — captions should recede.
**Fix**: Move `.panel-caption` to `font-size: var(--text-md)` (14px) for a clear visual step-down from body text without being as small as `--text-sm`.
**Location**: `static/css/layout.css:331`
**Suggested command**: `/typeset`

### [P3] Tooltip content uses dark background with no border-radius

**What**: `.tooltip-content` has `background: var(--ut-navy)`, `color: var(--ut-white)`, `border-radius: var(--radius-md)` (2px), and a `1px solid var(--ut-border)` border. The navy-on-dark is functional but the 2px radius on a dark floating box looks severe.
**Why it matters**: Minor — but tooltips are the one element where slight softening (3–4px radius) would look intentional rather than austere, without violating the sharp-corner principle. The current tooltip looks like a debug overlay.
**Fix**: Consider a slightly warmer treatment: either use `--ut-darkblue` with 90% opacity + `backdrop-filter: blur()`, or just bump the radius to 3px.
**Location**: `static/css/components.css:1096-1114`
**Suggested command**: `/polish`

---

## Persona Red Flags

### Alex (Power User / EIS-IS Domain Expert)

**Profile**: Evaluator who processes 2–3 tools per week. Knows the TRUST framework cold. Wants maximum throughput with minimum friction. Will memorize keyboard shortcuts after first session.

**Walkthrough**: Open questionnaire → fill S0 (workflow control) → jump to TR1 → rate criterion → navigate criteria with keyboard → rate all criteria in section → move to next section.

**Red flags found**:

1. **No Alt+Left/Right pager shortcuts** — Alex expects to navigate between pages without reaching for the mouse. The pager has visual shortcut hints but they only show the principle-level Alt+number shortcuts, not page-level prev/next. **Severity: P2** (workaround: click pager buttons, but breaks flow).

2. **No jump-to-first-incomplete** — Alex wants to resume where they left off. They must visually scan the completion strip or page index to find the next incomplete section. A single shortcut (e.g., Alt+J) to jump to the first page with `data-page-validation-state='attention'` or `'invalid'` would save 10–20 seconds per session. **Severity: P2**.

3. **Rating option requires click/tab — no direct number-key input** — When a rating scale is focused, Alex should be able to press 0, 1, 2, or 3 to select a score directly. Currently, they must tab to each option and press Enter, or click. For 15 criteria across 5 principles, that's 60 extra keystrokes. **Severity: P1** (significant efficiency loss for power users).

4. **Completion strip cells at 3.2rem minimum width cause overflow** — With 12 cells in the strip, at narrow widths (760–1160px), the strip wraps to multiple rows. This is acceptable but the cells don't truncate their labels, which could cause awkward line breaks. **Severity: P3**.

### Jordan (First-Time Reviewer)

**Profile**: New EIS-IS team member running their first evaluation. Has read the TRUST framework docs but never used the tool. Will read every label, check every tooltip, and hesitate before each selection.

**Walkthrough**: Open questionnaire → read panel caption → look at S0 fields → wonder what "Submission type" means → look for help → find context panel → read guidance → fill S0 → move to next page.

**Red flags found**:

1. **Context panel starts on "Select a page" empty state** — Jordan doesn't know they need to "select a page" to get guidance. The first page (S0) should auto-load its context, or the empty state should explicitly say "Guidance for the current page appears here automatically." **Severity: P2** (momentary confusion, recoverable).

2. **No inline examples for complex fields** — Fields like "Tool URL" and "Evaluation folder link" have `.field-help` text but no example values. Jordan might wonder if they should enter a full URL or just a domain name. Example placeholder text in the mock controls would help. **Severity: P3** (low risk, but would improve first-time experience).

3. **"Submission type" is the first field but has no explanation of workflow modes** — The field-label just says "SUBMISSION TYPE" in uppercase. Jordan needs to know that this choice determines which pages are accessible. The context panel explains this, but only if they notice it. **Severity: P2** (the context panel exists, but the field itself doesn't signal its importance).

### Sam (Accessibility-Dependent User)

**Profile**: Keyboard-only navigation, relies on ARIA labels and heading structure. Cannot see hover states or visual-only indicators.

**Walkthrough**: Tab to skip link → Enter to skip to questionnaire → Tab through form fields → rate criteria via keyboard → navigate with tab/shift-tab.

**Red flags found**:

1. **Rating scale has no ARIA radiogroup role** — The `.rating-scale` grid contains 4 `.rating-option` elements that function as radio buttons, but the container has no `role="radiogroup"` and the options may lack `role="radio"` + `aria-checked`. Screen readers won't announce the group relationship. **Severity: P1** (WCAG compliance gap — radio-group semantics are required).

2. **`.criterion-card::after` content (data-criterion attribute) is decorative but visible** — The criterion code (e.g., "TR1") is positioned via CSS `::after` with `content: attr(data-criterion)`. Screen readers won't announce this because it's pseudo-element content. If this information is important (and it is — it's the criterion identifier), it needs to be in real DOM text with an associated label. **Severity: P2** (the code is also in the heading, so it's partially redundant, but the `::after` positioning makes it look primary).

3. **Focus ring on `.page-index-button.is-active` is hard to distinguish from the inset box-shadow** — The active state uses `box-shadow: inset 0 3px 0 var(--section-accent)`. When focused, the outline ring is `2px solid var(--ut-blue)` with `2px` offset. At a glance, the inset shadow and the outline can blend together, making it unclear which element has focus. **Severity: P3** (the focus ring exists and is visible, but could be clearer with a larger offset).

---

## Wave 1 & Wave 2 Regression Check

| Change                                              | Status        | Notes                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mini-card h3 → Arial Narrow                         | **Confirmed** | `components.css:236-242` uses `--ff-heading` and `font-weight: 700`                                                                                                                                                                                                                                               |
| Subhead → Arial Narrow                              | **Confirmed** | `components.css:989-995` uses `--ff-heading`                                                                                                                                                                                                                                                                      |
| New `--text-md` 14px step                           | **Confirmed** | `tokens.css:292` — used in `.field-help`, `.evidence-block-description`                                                                                                                                                                                                                                           |
| Score-2 teal shifted to #0e7490                     | **Confirmed** | `tokens.css:142` — distinct from `--tc` (#0d9488) and `--re` (#16a34a)                                                                                                                                                                                                                                            |
| Criterion-card h3 bold                              | **Confirmed** | `components.css:600-609` — `font-weight: 700` with `border-bottom: 1px solid`                                                                                                                                                                                                                                     |
| Field-label tighter line-height                     | **Confirmed** | `components.css:349` — `line-height: var(--lh-heading)` (1.2)                                                                                                                                                                                                                                                     |
| Rating dots score-level border colors               | **Confirmed** | `interaction-states.css:779-790` — nth-child selectors with score-level borders                                                                                                                                                                                                                                   |
| Section kickers at 14px                             | **Confirmed** | `components.css:118` — `font-size: var(--text-sm)` which is 0.75rem (12px). Wait — **REGRESSION FLAG**. The task says Wave 2 moved kickers to 14px, but the CSS shows `var(--text-sm)` (12px). If kickers should be 14px, they should use `var(--text-md)`. Currently inconsistent with stated intent.            |
| 6px principle-item borders                          | **PARTIAL**   | `components.css:175-218` still shows `border-left: 4px solid` for all principle-item data-section variants. The generic `.principle-item` at line 163 has `border: 1px solid` with no explicit border-left override. If Wave 2 intended 6px, it wasn't applied to the data-section variants. **REGRESSION/MISS**. |
| 2px section dividers                                | **Confirmed** | `layout.css:282` — `shell-divider` is 6px total width with a 2px inner track (`::after`), but the visual line is 2px.                                                                                                                                                                                             |
| Pager shell shadow                                  | **Confirmed** | `components.css:1534` — `box-shadow: 0 1px 3px color-mix(...)`                                                                                                                                                                                                                                                    |
| Top-accent easing change                            | **Confirmed** | `interaction-states.css:3` — `transition: --top-accent-color 400ms ease`                                                                                                                                                                                                                                          |
| `border-left-width` transition on doc/form sections | **Confirmed** | `interaction-states.css:65-68` — includes `border-left-width` in transition                                                                                                                                                                                                                                       |
| `@starting-style` for border-left animation         | **Confirmed** | `interaction-states.css:121-126` — from 6px to 8px                                                                                                                                                                                                                                                                |

**Regression summary**: Two items flagged:

1. Section kickers may still be at 12px (`--text-sm`) instead of the stated 14px — need to verify if the Wave 2 intent was actually implemented or if it was a planned-but-not-applied change.
2. Principle-item border-left is 4px in the data-section variants — if 6px was the Wave 2 target, the specific selectors weren't updated.

---

## Minor Observations

1. **`--space-4-5: 18px` and `--space-5-5: 22px`** are non-standard steps in the spacing scale. Every other step follows a 4px grid (4, 8, 12, 16, 20, 24, 28, 32, 40, 48). These two half-steps add cognitive overhead for future developers. Consider rounding to the nearest 4px value or documenting why they exist.

2. **`--radius-lg: 0px`** is defined but never meaningfully used. It's a token that says "this could be rounded but isn't." This is fine as a design system statement but could confuse contributors who see a "large radius" token that's zero.

3. **`--se-dark` and `--tc-dark` tokens** (lines 284–285) exist for WCAG AA compliance on white-text nav buttons. This is good defensive design but the naming suggests these should be generated by the color system rather than manually specified. If `color-mix()` can produce these, the manual tokens are redundant.

4. **The `@property --top-accent-color` registration** is a CSS Houdini feature that's not supported in Firefox < 128 (released July 2024). The fallback is graceful (instant color change instead of animated), but this should be documented for the team.

5. **`.pager-shell` uses `grid-template-columns: minmax(8rem, 1fr) auto minmax(8rem, 1fr)`** — at narrow widths, the center status cell can get squeezed to near-zero. The 760px breakpoint stacks them, but between 760–960px the layout can feel cramped.

6. **Evidence intake grid** (`evidence-intake-grid`) has a three-column layout that collapses to single column at 760px. Between 760–1000px, the three columns might be too tight for comfortable use. Consider a two-column intermediate breakpoint.

7. **The `.tooltip-content.is-flipped` class** positions tooltips above the trigger. But there's no JS logic visible in the HTML to detect when a tooltip would overflow the viewport. If tooltips near the bottom of the page get flipped, they might overlap with other content.

---

## Summary

The TRUST Framework Questionnaire is a well-engineered evaluation instrument that successfully achieves its design goals: efficient, explicit, and engineered. The CSS architecture is sophisticated and consistent. The semantic color system is exemplary. The Wave 1 and Wave 2 changes are well-integrated with only two potential regressions/misses (kicker font-size and principle-item border-width).

**Biggest opportunity**: Keyboard efficiency for the rating interaction. Adding direct number-key input for rating scales would be the single highest-impact improvement for the power-user audience. This is the difference between 60 extra keystrokes per evaluation and zero.

**Overall assessment**: 34.5/40 (Nielsen), ~86/100 (dimensional). Solid "Good" rating. The interface is production-ready for its target audience. Remaining improvements are incremental — P1 issues are real but don't block usability.
