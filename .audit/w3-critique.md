# Design Critique — TRUST Framework Questionnaire

**Date**: 2026-04-04
**Auditor**: impeccable-sweep /critique wave 3
**Target**: trust-framework.html + static/css/ (7 files) + static/js/ (key modules)
**Context**: Post-Wave 1–2 diagnostic review

---

## Anti-Patterns Verdict: PASS

This interface does not look AI-generated. It looks engineered. Specific evidence:

- No gradient text, no glassmorphism, no glowing accents, no hero metric layouts
- No dark-mode-with-purple-glow pattern
- No generic sans-serif + Inter-with-tight-spacing + pill-button aesthetic
- No identical card grids with rounded corners
- No decorative illustrations or placeholder SVG patterns
- Uses `color-mix()` for semantic tinting, not Tailwind defaults
- Sharp corners (0–2px), no pill shapes, no soft shadows — matches "regimented functionalism"
- Monospace for data/codes, condensed uppercase for headings — deliberate typographic choices
- The density and verbosity are intentional, not a failure to simplify

**Verdict**: Confirmed human-engineered aesthetic. No AI slop detected.

---

## Overall Score: 73 / 100

This is a high-scoring domain tool. It trades visual polish for functional density, which is the correct trade-off for its audience. The scoring reflects that some polish gaps remain, but the foundation is strong.

---

## Design Health Score — Nielsen's 10 Heuristics

| #         | Heuristic                       | Score     | Key Finding                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | Completion strip, progress bar, section validation states, page-index status chips all visible. Missing: no global save/auto-save indicator.                                                                                                                                                                      |
| 2         | Match System / Real World       | 4         | Domain-appropriate terminology throughout. Section codes (S0, TR1, RE2) match the framework spec exactly. The language trusts the user's expertise.                                                                                                                                                               |
| 3         | User Control and Freedom        | 3         | Pager provides prev/next. Page index allows direct navigation. Escape dismisses overlays. Missing: no undo for individual field changes, no form-level draft recovery.                                                                                                                                            |
| 4         | Consistency and Standards       | 4         | Remarkably consistent. Same border-left accent pattern everywhere. Same chip/tag pattern for all states. Same font-weight hierarchy. No divergent patterns detected.                                                                                                                                              |
| 5         | Error Prevention                | 3         | Data-attribute-driven validation states (attention, invalid, blocked). Conditional field visibility prevents irrelevant questions. Missing: no confirmation on destructive actions (evidence deletion, section skip).                                                                                             |
| 6         | Recognition Rather Than Recall  | 3         | Page index always visible. Context panel provides section-specific guidance. Reference drawers expose scoring models. Keyboard shortcuts (Alt+1–5) exist but are undiscoverable without the Help surface.                                                                                                         |
| 7         | Flexibility and Efficiency      | 3         | Keyboard shortcuts for principle navigation. Arrow keys on rating scales. Escape to close overlays. Missing: no keyboard shortcut for prev/next page, no batch operations, no jump-to-first-incomplete.                                                                                                           |
| 8         | Aesthetic and Minimalist Design | 3         | Dense but purposeful. Every element carries semantic weight. The page-index column and context panel are always visible, which is correct for this audience. Some visual noise from the header region (completion strip + progress summary + nav buttons).                                                        |
| 9         | Error Recovery                  | 2         | Validation states are visually clear (warning/error tinting, field-label color change). But no inline error messages are visible in the static CSS — the field-level messaging relies on JS rendering that can't be fully evaluated from CSS alone. The `.field-help` class exists but no error-specific variant. |
| 10        | Help and Documentation          | 4         | Three-tier help: reference drawers (inline), context panel (per-page), Info/Help surfaces (overlay). The context panel updates per page with specific guidance. The Help surface exposes the interaction legend. Exceptionally thorough for a domain tool.                                                        |
| **Total** |                                 | **32/40** | **Good**                                                                                                                                                                                                                                                                                                          |

---

## Per-Dimension Scores

| Dimension                | Score | Notes                                                                                                                                     |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Visual Hierarchy         | 16/20 | Strong heading scale, clear section delineation. Header region is slightly crowded.                                                       |
| Information Architecture | 18/20 | Well-structured page-based flow with logical section ordering. Excellent context system.                                                  |
| Emotional Resonance      | 14/20 | Correctly austere for the audience. Could benefit from stronger completion/progress satisfaction moments.                                 |
| Cognitive Load           | 13/20 | Acceptable density for experts, but some pages may present 5–7+ fields simultaneously. The split-panel helps by keeping context adjacent. |
| Overall Quality          | 12/20 | Solid engineering, some polish gaps. Typography, color, and interaction states are well above average.                                    |

---

## Cognitive Load Checklist

| Check                  | Status | Notes                                                                                                                            |
| ---------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Single focus           | PASS   | Page-based navigation isolates one section at a time                                                                             |
| Chunking (≤4 items)    | FAIL   | Some field groups show 5+ fields (e.g., S0 primary has 5 fields; S2 has many input controls). Within tolerance for expert users. |
| Visual grouping        | PASS   | Field grids, criterion cards, and section borders create clear groupings                                                         |
| Visual hierarchy       | PASS   | Heading scale is clear (display → heading → sub → body → sm → xs)                                                                |
| One thing at a time    | PASS   | Pager + page-based form enforces sequential focus                                                                                |
| Minimal choices (≤4)   | PASS   | Rating scale has 4 options. Dropdowns use select controls. Checkbox blocks group related items.                                  |
| Working memory         | PASS   | Context panel visible alongside form; reference drawers collapsible but accessible                                               |
| Progressive disclosure | PASS   | Reference drawers are collapsed by default. Criteria sections expand context on demand. Evidence blocks are sub-sections.        |

**Failure count: 1/8 — Low cognitive load.** The single failure (chunking) is acceptable given the expert audience and the "density is a feature" design principle.

---

## What's Working

### 1. Color-as-state system is exemplary

The entire token architecture (`tokens.css` + `accent-scoping.css`) encodes state through color without decoration. Every semantic state — score levels (0–3), workflow states (editable/read-only/skipped), judgment states (pass/conditional/fail), recommendation states, confidence levels — has a dedicated tint/border/accent family. This is exactly what "color encodes state, not decoration" looks like in practice. The `@property` transition on `--top-accent-color` provides smooth section-to-section color shifts that reinforce spatial awareness.

### 2. Split-panel context architecture

The two-panel layout (questionnaire + context) keeps evaluation guidance adjacent to the form without tab-switching. The context panel updates per-page with specific section guidance, route summaries, and sub-anchors. This eliminates the "memory bridge" cognitive load violation — users don't need to remember what they read on another screen. The drawer mode at 1160px is a graceful degradation.

### 3. Typography hierarchy and voice

The three-font system (Inter body, Arial Narrow headings, JetBrains Mono data) creates clear functional zones. The uppercase + tight letter-spacing on headings and kickers creates an instrument-panel aesthetic that matches "Efficient, Explicit, Engineered." The `text-display: 2.25rem` and `text-mega: 2.75rem` scale (Wave 2) gives the panel titles appropriate weight without being decorative. Monospace field IDs and section codes (`S0`, `TR1`) are exposed by default, honoring "expose the machine."

---

## Priority Issues

### P1: Header region visual competition

**What**: The header contains three distinct information zones (brand + completion strip + nav buttons) that compete for attention. The completion strip, progress summary, and top-nav are all at the same visual weight level.

**Why it matters**: On first load, the eye doesn't settle on a single focal point. The brand area (logos + "Framework" label) and the action buttons fight for the same horizontal band. The `nav-indicator` (red underline) is a nice touch but only activates on hover/active.

**Affected selectors**: `.site-header`, `.header-inner`, `.completion-strip`, `.top-nav`, `.nav-indicator` in `layout.css:12–85`, `components.css:4–85`

**Fix**: Differentiate the brand zone (lower visual weight) from the action zone (higher visual weight). Consider reducing the completion strip's border to a subtle divider or integrating it more tightly with the nav area. The `nav-indicator` should persist on the active item, not just on hover.

**Suggested command**: `/arrange`

### P1: Keyboard shortcuts are undiscoverable

**What**: Alt+1–5 jump to TRUST principles. Arrow keys navigate rating scales. Escape closes overlays. These are documented only in the Help surface, which is behind a button press.

**Why it matters**: The design principle states "Keyboard-first efficiency" and "Every action should have a keyboard shortcut." The shortcuts exist but the target audience (power users) won't find them without opening Help first. This is a recognition-over-recall failure.

**Affected files**: `keyboard.js` (shortcuts defined), `help-panel.js` (documentation)

**Fix**: Add a subtle shortcut hint to the pager ("Alt+←/→" or similar) or to the page-index buttons on first visit. Consider a one-time dismissible hint that shows available shortcuts.

**Suggested command**: `/clarify`

### P2: Validation error messages lack visible CSS treatment

**What**: The CSS defines field-level validation states (`data-field-validation-state="attention|invalid|blocked"`) with background/border tinting and label color changes. However, no visible error message element or styling exists in the CSS — the `.field-help` class is generic (muted text), and there's no `.field-error` or `.validation-message` pattern.

**Why it matters**: Users see a field turn orange/red but may not know _what_ is wrong. Color alone doesn't communicate the specific issue. This is an accessibility concern (meaning conveyed by color alone) and a usability gap.

**Affected selectors**: `.field-group[data-field-validation-state]` in `interaction-states.css:1134–1170`

**Fix**: Add a `.validation-message` or `.field-error` element style with an icon prefix and the specific error text. Ensure the message is associated with the field via `aria-describedby`.

**Suggested command**: `/harden`

### P2: No visible save/auto-save indicator

**What**: The form is a single-page application with centralized state management. The CSS shows no save button, save indicator, or auto-save status anywhere in the shell.

**Why it matters**: Users filling out 132+ fields across 10+ pages need to know their work is persisted. Without visible save feedback, expert users may distrust the tool or duplicate their work in external documents.

**Affected files**: `layout.css` (no save indicator in header), `app.js` (would need to verify persistence behavior)

**Fix**: Add a subtle save status indicator in the header (e.g., "Saved" / "Saving..." / "Unsaved changes") or a save button in the toolbar. This could be as minimal as a monospace status chip.

**Suggested command**: `/harden`

### P2: `font-weight: 800` remnant in print.css

**What**: `print.css:122` uses `font-weight: 800` in the print-only `::before` pseudo-elements for section kickers. Wave 1 explicitly changed all 800 weights to 700 across the codebase.

**Why it matters**: Inconsistency in print output. Minor but contradicts the Wave 1 normalization.

**Affected file**: `print.css:122`

**Fix**: Change `font-weight: 800` to `font-weight: 700`.

**Suggested command**: `/normalize`

### P3: `font-weight: 800` remnant in components.css

**What**: `components.css:919` has `.subhead { font-weight: 800; }`. Same Wave 1 normalization issue.

**Affected file**: `components.css:919`

**Fix**: Change to `font-weight: 700`.

**Suggested command**: `/normalize`

### P3: Surface overlay backdrop-filter is vestigial

**What**: `layout.css:327–328` applies `backdrop-filter: blur(2px)` to `.shell-surface`. A 2px blur is imperceptible on a dark semi-transparent overlay — it adds GPU cost for no visible benefit.

**Why it matters**: The design principles say "Performance is design." This is a free performance win.

**Affected selector**: `.shell-surface` in `layout.css:319`

**Fix**: Remove `backdrop-filter` and `-webkit-backdrop-filter`, or increase to a perceptible value (4–6px) if the blur effect is intentional.

**Suggested command**: `/optimize`

### P3: Missing `font-weight: 800` in Google Fonts import

**What**: The Google Fonts import in `trust-framework.html:9` requests `Inter:wght@400;700;800` but Wave 1 normalized all weights to 700. The 800 weight request is unused overhead.

**Affected file**: `trust-framework.html:9`

**Fix**: Remove `800` from the font-weight request: `Inter:wght@400;700`.

**Suggested command**: `/optimize`

---

## Brand Personality Alignment

**Efficient**: Strong alignment. Page-based navigation, keyboard shortcuts, split-panel context, and dense field layouts all support efficiency. The pager-shell with prev/next and direct page-index access is well-suited for power users.

**Explicit**: Excellent alignment. Every state is visible — field IDs, section codes, score levels, workflow states, progress indicators, validation states. The context panel makes evaluation guidance explicit per page. The "expose the machine" principle is consistently applied.

**Engineered**: Strong alignment. The CSS token system, `color-mix()`-based tinting, `@property` transitions, and data-attribute-driven styling all demonstrate systematic engineering. Zero border-radius (0px) and visible grid lines reinforce the instrument aesthetic.

**Minor gap**: The emotional goal ("Reviewers should feel efficient and in control") is supported structurally but could be stronger in completion moments. The `completePulse` animation is subtle — a more pronounced section-complete acknowledgment would reinforce the sense of progress through a long evaluation.

---

## Persona Red Flags

### Selected Personas: Alex (Power User), Sam (Accessibility-Dependent), Morgan (Domain Expert Evaluator)

### Morgan (Domain Expert Evaluator) — Project-Specific Persona

**Profile**: EIS-IS team member at University of Twente. Evaluates 5–15 AI tools per semester. Has deep knowledge of the TRUST framework. Needs to complete evaluations efficiently and produce auditable documentation. Works on a desktop in a university office.

**Red flags**:

- The header region at 138px is tall. On a 1080p screen, this consumes significant vertical space before the form begins. The `--header-h: 138px` could be reduced by tightening the brand area.
- The `.panel-caption` text ("The questionnaire is the primary surface...") is developer-facing documentation, not user-facing guidance. Morgan doesn't need to know about "reference drawers staying above the form" — this is implementation detail leaked into the UI.
- No visible field-level character count or word count for textarea fields. Evaluation text often has implicit length expectations.

### Alex (Power User)

**Red flags**:

- No Alt+←/→ shortcut for pager prev/next (only Alt+1–5 for principle jump). The keyboard.js module handles rating-scale arrow keys and principle jumps, but not pager navigation.
- No keyboard shortcut to toggle the context panel (only the Context button). Power users who want to maximize form width would appreciate a toggle shortcut.
- The completion strip shows page codes but requires hover to see detail. On a 12-section evaluation, scanning for incomplete sections in the strip requires individual hover.

### Sam (Accessibility-Dependent User)

**Red flags**:

- The `nav-indicator` (red underline) is purely visual with no ARIA association. Screen readers won't perceive which nav button is "active" from the indicator alone. However, the `.active` class on `nav-button` should provide the semantic active state — verify that ARIA `aria-current` is set.
- The `.strip-cell[data-progress-state]` states use color and box-shadow to communicate status. The text color changes (muted → accent → error) provide some non-color differentiation, but the "in_progress" and "complete" states rely heavily on background color.
- No visible skip-to-context-panel link. The skip-link goes to `#questionnairePanel` but there's no equivalent for the context panel, which is the secondary content area.

---

## Minor Observations

1. **`.panel-caption` is implementation language**: The captions in `trust-framework.html:72` and `trust-framework.html:292` describe the software architecture ("reference drawers stay above the form," "framework background and governance stay in the Info surface") rather than helping the user. These should be user-facing guidance or removed.

2. **Rating scale dot is 16px**: The `.rating-dot` is 16px with a 2px border, making the effective interactive target 16px. This is below the 44x44px minimum for touch. Acceptable for desktop-only use but worth noting.

3. **`.evidence-intake-grid` is 3-column**: The evidence intake form uses a 3-column grid (`10rem | 1fr | 13rem`). On narrow panels, this may compress uncomfortably. The 760px breakpoint collapses it to single-column, but the questionnaire panel max-width of 1680px means this only collapses on narrow viewports.

4. **Print stylesheet is thorough**: The print.css handles section-break-before, rating-border reinforcement, color-adjust, and animation reset. This is above-average print support for a web application.

5. **`@starting-style` usage is progressive**: The Wave 2 addition of `@starting-style` for active state transitions (section border-width, page-index box-shadow) shows intentional use of modern CSS capabilities for smooth state changes.

---

## Comparison to Brand Personality

| Principle                 | Alignment | Evidence                                                               |
| ------------------------- | --------- | ---------------------------------------------------------------------- |
| Density is a feature      | Strong    | Split-panel layout, compact field grids, minimal padding               |
| Color encodes state       | Excellent | Full semantic token system, no decorative color                        |
| Sharp and rational        | Strong    | 0–2px radius, visible borders, no soft shadows                         |
| Expose the machine        | Excellent | Field IDs, section codes, monospace data, progress states visible      |
| Keyboard-first efficiency | Good      | Shortcuts exist, rating keyboard nav, Escape dismisses. Discovery gap. |
| Direct and unadorned      | Strong    | No marketing copy, no illustrations, no decorative elements            |
| Trusts user intelligence  | Excellent | No tooltips, no hand-holding, no onboarding flow                       |

---

## Summary

This is a well-engineered domain tool that successfully achieves its "regimented functionalism" aesthetic. The token system is comprehensive, the state encoding is thorough, and the split-panel architecture eliminates context-switching. The main opportunities are: (1) tightening the header region, (2) making keyboard shortcuts discoverable, (3) adding visible validation error messages, and (4) providing a save/persistence indicator. These are P1–P2 issues in a system that otherwise scores well against its design principles.
