# Wave 3 -- UX Critique & Recommendations

**Source**: trust-framework.html + static/css/* + static/js/*
**Date**: 2026-04-04
**Scope**: Visual hierarchy, information architecture, usability, design consistency
**Method**: Nielsen's 10 heuristics, cognitive load checklist, persona walkthroughs, AI slop detection

---

## Anti-Patterns Verdict

**Pass.** The interface does not look AI-generated. Specific checks:

- No cyan-on-dark, purple-to-blue gradients, or neon accents on dark backgrounds
- No glassmorphism, blur cards, or glow borders
- No hero metric layout (big number, small label, gradient accent)
- No identical card grids with icon + heading + text
- No gradient text for "impact"
- No rounded rectangles with generic drop shadows as the dominant pattern
- No sparklines as decoration
- No center-everything layout
- No redundant hero sections restating the heading

The aesthetic is utilitarian and institutional -- navy, white, muted greys with colored left borders. It reads as purpose-built government/university tooling, not AI-template output.

**One borderline concern**: The typography uses Inter for body text, which the design skill flags as overused. However, for an institutional evaluation tool, Inter is a defensible choice -- it is highly legible at small sizes and performs well in dense data-entry contexts. The heading font (Arial Narrow) is a system font, which is unremarkable but functional. This is low priority given the context.

---

## Design Health Score

| #  | Heuristic                              | Score | Key Issue                                                                                     |
|----|----------------------------------------|-------|-----------------------------------------------------------------------------------------------|
| 1  | Visibility of System Status            | 3     | Progress is visible in 4 places (strip, progress bar, page index badges, header summary) -- strong but potentially redundant |
| 2  | Match System / Real World              | 3     | Vocabulary maps to TRUST framework principles; no gratuitous jargon                          |
| 3  | User Control and Freedom               | 2     | No undo mechanism visible; pager is one-directional (prev/next) with no way to jump back easily from deep in the form without the sidebar |
| 4  | Consistency and Standards              | 3     | Very consistent internally; left-border accent system is applied uniformly                    |
| 5  | Error Prevention                       | 2     | Validation states exist but are reactive (show after error) rather than proactive (prevent error); critical-fail flags are checkboxes with no confirmation guard |
| 6  | Recognition Rather Than Recall         | 2     | Reference drawers help, but completing a page requires remembering what the scoring model means; the rating scale labels (0-3) are terse |
| 7  | Flexibility and Efficiency             | 2     | No keyboard shortcuts; no way to collapse all reference drawers at once; pager forces sequential movement |
| 8  | Aesthetic and Minimalist Design        | 2     | Header is dense (brand, strip, nav, progress summary all compete); context panel has 12+ doc-sections; visual noise is high |
| 9  | Error Recovery                         | 2     | Validation states color-code problems but provide no inline fix guidance; blocked state tells you something is wrong but not what to do about it |
| 10 | Help and Documentation                 | 3     | Context panel, Info surface, Help surface, and reference drawers provide multiple help channels |
|    | **Total**                              | **23/40** | **Moderate** -- functional but with meaningful friction points                            |

---

## Overall Impression

The TRUST Framework questionnaire is a densely structured institutional evaluation tool with a sophisticated state system (workflow states, validation states, skip scaffolding, evidence blocks) hidden behind a visually austere, border-heavy UI. The engineering is thorough -- the CSS custom property architecture, the section accent key resolution, and the 13-page canonical sequence all show careful systems thinking. The design, however, prioritizes information density over cognitive manageability. The result is a tool that an expert can navigate efficiently but that presents a steep learning curve and high initial cognitive load.

The single biggest opportunity: **reduce simultaneous visual competition in the header and clarify the primary action path through the form**.

---

## What's Working

1. **Color system architecture.** The CSS custom property cascade (section families, accent keys, color-mix derivation) is exceptional. Every component can be themed per-section without class explosion. The principle colors (TR blue, RE green, UC purple, SE orange, TC teal) are distinctive and the tint/border/accent-strong derivation creates coherent palettes automatically. This is genuinely well-designed systems work.

2. **State communication density.** The page-index sidebar communicates workflow state, progress state, section accent, and active status simultaneously through color, border style (solid vs dashed), inset shadows, and badge chips. For expert users who learn the vocabulary, this is informationally rich. The strip cells use the same accent system at a compressed scale.

3. **Multiple help channels.** The separation into context panel (active-page guidance), reference drawers (persistent lookup tables), Info surface (framework background), and Help surface (interaction legend) is architecturally sound. It keeps contextual help near the form while allowing deeper reference material without navigation.

---

## Priority Issues

### [P1] Header visual competition -- too many signals in one bar

**What**: The fixed header contains brand logos (3 images), completion strip (13 cells), nav buttons (3), nav indicator, and (on some pages) a header-progress-summary block. At desktop widths, this creates a dense information band where no single element commands attention.

**Why it matters**: The header consumes 138px of vertical space permanently. On a 1080p screen, that leaves ~940px for the two-panel workspace. The completion strip's 13 tiny cells compete with the progress summary for attention without providing distinct value -- they communicate overlapping progress information.

**Fix**:
- Remove the header-progress-summary block from the header entirely and place it as the first child of the page-index sidebar instead. It provides the same information more naturally in that context.
- Consider collapsing the completion strip into a single progress bar that lives inside the questionnaire panel's progress bar element, removing it from the header.
- Target header height reduction from 138px to approximately 90-100px, reclaiming ~40px of vertical workspace.

**Suggested command**: `/arrange`

---

### [P1] Cognitive overload at first page -- no progressive disclosure

**What**: Landing on page S0 (Workflow Control) presents: the page title, a section kicker, 5 primary fields in a 2-column grid, a single-column detail field, reference drawers (3 collapsed `<details>`), a page index sidebar with 13 entries, and the full context panel. All visible simultaneously.

**Why it matters**: The cognitive load 8-item checklist scores 3 failures (see below), which is "moderate but approaching critical." For a first-time evaluator, the initial screen presents too many navigation options, too many help channels, and too many visible fields without clear prioritization.

**Fix**:
- Collapse the page-index sidebar by default on first visit, showing only the current page and next/prev buttons. Expand it on explicit user action.
- Start reference drawers collapsed (already the case) but visually quiet them -- reduce their visual weight so they recede from initial scan.
- Add a brief one-line instruction below the page title on S0: "Start by selecting a submission type and entering the tool name."
- Consider a first-visit state that hides the context panel until the user completes S0.

**Suggested command**: `/onboard`

---

### [P1] Rating scale affordance is weak

**What**: The rating scale presents 4 options in a grid, each with a colored left border, a dot, a number (0-3), and a short label. The dot is a 16px circle with a 2px border. On hover, the background lightens and the border darkens. On selection, the dot fills and the background tints.

**Why it matters**: The rating scale is the primary data-entry mechanism for criterion scoring (the core of the evaluation). Currently it reads as a flat row of similar-looking blocks. The visual weight difference between "unselected" and "selected" is subtle -- a background tint and a filled dot. There is no scale or directional cue communicating that 0 is negative and 3 is positive. Users must read the labels ("Fails", "Partial / unclear", "Meets baseline", "Strong") to understand the semantic direction.

**Fix**:
- Add a color gradient that transitions from red (score-0) through neutral to green (score-3) across the 4 options, making the semantic direction visually obvious without reading labels.
- Increase the size contrast between unselected and selected states -- the selected option should feel distinctly "pressed" or "active" (stronger border, bolder text, larger dot).
- Consider adding a subtle background bar or range indicator behind the 4 options to communicate that they are points on a continuum.
- Add a brief microcopy line above the scale: "Rate this criterion from 0 (fails) to 3 (strong)."

**Suggested command**: `/clarify`

---

### [P2] Left-border accent is the only visual differentiator for sections

**What**: Sections are distinguished almost entirely by their left-border color (6px solid, expanding to 8px on active). The background, padding, border-radius, and internal layout are identical across all 13 sections. Criterion cards, context route cards, page-index buttons, and strip cells all use the same left-border pattern.

**Why it matters**: While the left-border system is architecturally clean and consistent, it creates a monotonous visual rhythm. When scrolling through a long page with multiple criteria, every card looks the same except for a thin colored line on the left. The accent color is the sole carrier of section identity, which puts high demand on color perception and provides no redundant encoding for accessibility.

**Fix**:
- Introduce a subtle section-specific background tint variation -- not just the left border but a very light wash across the entire section card that differs by principle.
- Add a small colored badge or icon in the section header area that reinforces the section identity beyond the left border.
- For criterion cards within a principle section, consider varying the card border style slightly (e.g., slightly different padding, a faint top-border) to break the identical-card rhythm.
- Ensure that color is never the only differentiator -- add section code text (TR, RE, etc.) in a visible position on each card.

**Suggested command**: `/colorize`

---

### [P2] No keyboard navigation efficiency

**What**: The form is a standard HTML form with no keyboard shortcuts. Moving between pages requires clicking the pager buttons. There are no hotkeys for common actions like "next page," "previous page," "toggle context panel," or "save and continue."

**Why it matters**: For a 13-page evaluation with dozens of fields, keyboard-only operation is significantly slower than it needs to be. Expert evaluators who complete multiple evaluations will feel the friction acutely.

**Fix**:
- Add keyboard shortcuts: Alt+Arrow for pager navigation, Escape to dismiss surfaces/drawers, Ctrl+K for a command palette or quick-jump.
- Ensure Tab order flows logically through the form fields on each page without trapping focus in the sidebar or context panel.
- Add visible shortcut hints in the pager and nav button tooltips.

**Suggested command**: `/harden`

---

### [P2] Validation states communicate "what" but not "how to fix"

**What**: Field-level, criterion-level, and page-level validation states exist (attention, invalid, blocked) with distinct color coding (warning amber, error red). The field label changes color, the control background tints, and the card border changes. However, there is no inline text explaining what is wrong or how to fix it.

**Why it matters**: A field highlighted in red tells the user "something is wrong here" but does not tell them whether the issue is a missing required field, a format error, a dependency violation, or a blocked state. The user must infer the problem from context.

**Fix**:
- Add a validation message element below each field group when it enters an attention/invalid/blocked state. The message should be specific: "This field is required when [condition]", "Select a valid option", "This section is blocked pending resolution of [upstream issue]."
- Use the existing `field-help` slot for validation messages, replacing (not appending to) the help text.
- For blocked states specifically, name the blocking criterion or page so the user knows where to go.

**Suggested command**: `/clarify`

---

### [P2] Context panel content is dense and undifferentiated

**What**: The context panel renders 12+ `doc-section` elements for the 13 canonical pages. Each has a section kicker, heading, body text, and a bulleted list. The visual treatment is identical for all sections -- same padding, same border-left, same heading size, same list style.

**Why it matters**: When the evaluator is on page TR (Transparent) looking at the context panel, they see the TR guidance section, but it looks exactly like the RE, UC, SE, and TC sections above and below it. There is no visual signal that "this is the section relevant to your current page." The `is-active` state adds a thicker left border and a slight background tint, but in a scrolling panel with many sections, this is easy to miss.

**Fix**:
- When a page is active, scroll the context panel to the matching section and apply a stronger visual distinction -- not just border-width and background but also a subtle elevation (box-shadow) or a colored top-border.
- Consider hiding non-adjacent context sections (show only the current section and its immediate neighbors) with an option to expand all.
- Add a sticky "you are here" indicator at the top of the context panel that names the current page.

**Suggested command**: `/arrange`

---

### [P3] Type scale compression -- heading levels are too similar

**What**: The type scale defines 7 steps from `--text-xs` (0.56rem) to `--text-mega` (2.25rem). However, the actual usage compresses this range significantly:
  - Section kickers: `--text-sm` (0.75rem)
  - Field labels: `--text-sm` (0.75rem)
  - Field labels uppercase + letter-spacing
  - Section h2: `--text-heading` (1.563rem)
  - Criterion card h3: `--text-sub` (1.2rem)
  - Mini-card h3: `--text-sub` (1.2rem)

The effective heading range on any given page is: panel title (1.95rem), section h2 (1.563rem), h3 (1.2rem), field labels (0.75rem). The ratio between panel title and field labels is only 2.6:1, which is adequate but not generous.

**Why it matters**: For a dense form, strong typographic hierarchy helps the eye navigate quickly. The current scale is functional but does not create strong enough contrast between "page you are on" (panel title) and "field you are filling in" (field label).

**Fix**:
- Increase the panel title size slightly (e.g., from 1.95rem to 2.1rem) or increase the field label size to `--text-body` (1rem) to create a clearer size jump.
- Use weight contrast more aggressively: field labels are 700 weight, but h2 headings are 800 -- this 100-weight difference is barely perceptible. Consider dropping field labels to 600 or bumping headings to 900.
- The `--text-xs` (0.56rem / ~9px) used for strip cells, badges, and meta items is at the edge of legibility. Consider raising to 0.625rem (10px).

**Suggested command**: `/typeset`

---

### [P3] Surface overlays lack size and position variation

**What**: The Info surface and Help surface both use the same `.shell-surface` overlay with the same `.surface-card` width (`min(44rem, 100%)`), same slide-in animation, and same close-button position. The context panel drawer (on narrow screens) also uses a similar full-height slide-in.

**Why it matters**: Three different surfaces (Info, Help, Context drawer) all look and behave almost identically. The user cannot distinguish them by spatial memory alone -- they must read the content to know which surface they are looking at. This violates the "different things should look different" principle.

**Fix**:
- Give the Help surface a narrower card width (e.g., `min(32rem, 100%)`) since it contains a legend, not prose.
- Position the Info surface slightly differently (e.g., slide from left instead of right, or use a centered modal) to create spatial distinction.
- Use different accent colors for each surface's card top-border: help uses the help-accent (navy-blue), info could use a distinct color.

**Suggested command**: `/arrange`

---

### [P3] Mobile experience is amputated, not adapted

**What**: At the 1160px breakpoint, the two-panel layout collapses to a single column with the context panel becoming a right-side drawer. At 760px, the context drawer becomes full-width. The page-index sidebar stacks above the form. Rating scales collapse to 2-column and then 1-column grids.

**Why it matters**: While the responsive breakpoints handle layout, the experience is primarily about hiding the context panel and sidebar behind toggles. The form itself remains as dense as on desktop -- the same number of fields, the same field grids, the same validation states. No content is simplified or reorganized for mobile context.

**Fix**:
- On mobile, consider showing field groups in an accordion pattern (expand one group at a time) instead of the full-page grid.
- Reduce the number of simultaneously visible fields on mobile by using progressive disclosure within each page.
- Ensure the pager is easily thumb-reachable (bottom of screen, not top).
- Test with actual mobile touch targets -- the current `min-height: 44px` on rating options is appropriate, but field labels and chips may be too small.

**Suggested command**: `/adapt`

---

## Persona Red Flags

### Jordan (First-Timer)

Jordan is a team member asked to complete their first TRUST evaluation. They open the tool and see a dense two-panel interface with 13 pages to complete.

- **Landing page has no orientation**. There is no welcome message, no "start here" cue, no indication of how long the evaluation will take. The page title says "Questionnaire" and the panel caption mentions "primary surface" and "page index" -- framework jargon, not user-facing language.
- **Completion strip is cryptic**. 13 small cells with abbreviated codes (S0, S1, S2, TR, RE...) provide no labels until hovered. Jordan does not know what these mean.
- **Rating scale labels are hidden in a reference drawer**. The scoring model (0 = Fails, 3 = Strong) is in a collapsed `<details>` element. Jordan must discover and expand this before understanding how to score criteria.
- **Context panel shows all guidance at once**. The panel contains 12+ sections of guidance. Jordan sees a wall of text and does not know which part is relevant to the current page.
- **Red flags**: Will likely skip the context panel entirely, miss the reference drawers, and begin filling in fields without understanding the scoring model. High risk of completing the evaluation incorrectly on first attempt.

### Sam (Accessibility)

Sam uses keyboard navigation and a screen magnifier. They navigate forms sequentially.

- **Skip link exists but goes to questionnaire panel**, not to the first form field. After skipping, Sam still needs to tab past the panel title, toolbar, reference drawers, and page index before reaching the first input.
- **Focus ring is consistent** (2px solid blue with 2px offset) across all interactive elements, which is good. However, the focus ring on rating options, criterion cards, and page-index buttons all look identical, making it hard to know what type of element is focused.
- **Color is the primary state indicator** for validation (red border, amber border) and progress (green, blue, amber, red, grey chips). No icons or text labels accompany these color changes within the chips.
- **`aria-live="polite"` on the render root** is appropriate for page transitions but there is no live-region announcement for validation state changes or progress updates.
- **Red flags**: Will struggle to understand validation errors without descriptive text. Progress state chips rely entirely on color. Focus management after page transitions is unclear.

### Casey (Mobile)

Casey attempts to complete an evaluation on a tablet (768px width) during a testing session.

- **Context panel is hidden behind a toggle**. Casey must tap the Context button, wait for the drawer slide-in, read the guidance, close the drawer, and return to the form. This context-switching overhead is significant on a page with 4-6 criteria.
- **Rating scale collapses to 2-column** at 760px, which is functional but the options become very narrow. On a 768px tablet, each rating option is approximately 350px wide -- acceptable but tight with the dot + label + description text.
- **Evidence blocks with file upload and image preview** will be challenging on mobile browsers. The 3-column evidence intake grid collapses to 1 column, which is good, but the file input and image preview UX varies significantly across mobile browsers.
- **Pager and page index compete for space**. The page-index column stacks above the form, and the pager sits below it. On a tablet in landscape, this means significant scrolling before reaching the first field.
- **Red flags**: Will miss context guidance frequently due to the overhead of toggling the drawer. Evidence capture (screenshots, file uploads) will be the most friction-heavy part of the mobile experience.

---

## Cognitive Load Checklist

> 8-item checklist. Failure count: 3 (moderate).

| # | Check                                                                                      | Pass/Fail | Notes                                                                                  |
|---|--------------------------------------------------------------------------------------------|-----------|----------------------------------------------------------------------------------------|
| 1 | Are there more than 7 top-level navigation options visible at once?                        | **Fail**  | Completion strip shows 13 cells; page index shows 13 entries.                          |
| 2 | Does any single screen require more than 4 simultaneous decisions?                         | **Pass**  | Each page focuses on one section; criterion-level scoring is sequential.               |
| 3 | Is critical information hidden behind progressive disclosure that users are likely to miss?| **Fail**  | Scoring model, evidence requirements, and critical-fail definitions are in collapsed drawers. |
| 4 | Can users identify the primary action on each page within 2 seconds?                       | **Pass**  | Form fields are the dominant visual element; the "next" pager button is always visible.|
| 5 | Is related content grouped spatially?                                                      | **Pass**  | Fields are grouped by anchor (primary, detail, summary, supplementary).                |
| 6 | Are there redundant displays of the same information?                                      | **Fail**  | Progress appears in: completion strip, header progress summary, page index badges, and progress bar. Four displays of overlapping data. |
| 7 | Does the interface require the user to hold more than 4 items in working memory?           | **Pass**  | Context panel provides reference; fields are labeled; help text is inline.             |
| 8 | Are error states descriptive and actionable?                                               | **Pass**  | Validation states exist with color coding, though message text could be more specific. |

---

## Minor Observations

1. **Animation timing is conservative.** `--duration-instant: 100ms`, `--duration-fast: 150ms`, `--duration-normal: 200ms`. These are appropriate for a data-entry tool -- fast enough to provide feedback, slow enough to perceive. The page crossfade (`opacity` transition) is subtle and does not impede workflow. No issues here.

2. **Print stylesheet is functional.** Hides chrome, resets layout to block, adds principle code prefixes. The `break-inside: avoid` on sections is correct. The `::before` content injection for principle codes (TR, RE, etc.) is a good print-only addition.

3. **`text-rendering: optimizeSpeed`** is set on body. This disables kerning and ligature optimizations in favor of rendering speed. For a form-heavy tool, this is a reasonable trade-off, but it may make the small text (0.56rem badges, strip cells) slightly less legible. Consider switching to `optimizeLegibility` for text below 12px.

4. **Evidence block design is thorough.** The 3-column intake grid, preview images with aspect ratio, file links, meta chips, and lightbox overlay are all well-structured. The lightbox uses fixed positioning with `place-items: center` and a semi-transparent backdrop -- standard and functional.

5. **The `.visually-hidden` and `.shell-focus-anchor` utilities** provide proper accessibility infrastructure. The skip link is present. The `aria-labelledby`, `aria-describedby`, and `aria-live` attributes are used appropriately in the HTML and JS.

6. **`border-radius: 0` or `1px` throughout.** The design is intentionally sharp-cornered. This is a consistent aesthetic choice that gives the tool an institutional, non-frivolous character. It works for the context.

7. **The `data-*` attribute usage is extensive** -- every component carries page, section, field, criterion, workflow, validation, and progress metadata as data attributes. This is excellent for testing and debugging but adds significant DOM weight. On a page with 50+ field groups, this creates a large DOM tree. Not a UX issue directly, but worth monitoring for performance on lower-end devices.

8. **Condition tags and display tags** are visually similar (same padding, same font, same size) but use different border/background colors. The distinction between "conditional" and "display only" is subtle. Consider using different shapes (e.g., rounded for condition, square for display) or adding an icon.

---

## Summary of Recommended Commands

Priority order based on impact:

1. **`/arrange`** -- Reduce header density, separate progress displays, create visual distinction between surface overlays
2. **`/onboard`** -- Add progressive disclosure for first-time users, reduce initial cognitive load on S0
3. **`/clarify`** -- Strengthen rating scale affordance, add validation fix guidance, improve condition/display tag distinction
4. **`/colorize`** -- Break the left-border monotony, add section-level background variation beyond accent-only differentiation
5. **`/harden`** -- Add keyboard shortcuts, improve focus management, strengthen accessible state communication
6. **`/typeset`** -- Increase heading/label contrast, raise minimum text size, improve weight differentiation
7. **`/adapt`** -- Improve mobile/touch experience with accordion patterns and thumb-reachable controls
8. **`/polish`** -- Final pass on animation timing, evidence block refinements, and edge case states
