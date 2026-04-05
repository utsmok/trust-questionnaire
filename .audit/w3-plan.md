# Wave 3 → Wave 4 Consolidated Diagnostic Plan

**Date**: 2026-04-05
**Sources**: `.audit/w3-audit.md` (score 17.5/20), `.audit/w3-critique.md` (score 34.5/40, 86/100)
**Prior waves**: w1-plan.md (typography, color, animation fundamentals), w2-plan.md (delight, bolder, overdrive refinements)
**Purpose**: Merged, deduplicated, cross-referenced plan for Wave 4 skill execution

---

## Regression Investigation Results

### REG-1: Section kickers at 12px instead of 14px — NOT A REGRESSION

| Aspect        | Detail                                                                                                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flagged by    | w3-critique regression table line 260: "REGRESSION FLAG"                                                                                                                                                                                                  |
| Claim         | Wave 2 moved kickers to 14px; CSS shows `var(--text-sm)` (12px)                                                                                                                                                                                           |
| Investigation | w2-plan.md contains **no change** to `.section-kicker` font-size. The critique header incorrectly listed "section kickers at 14px" as a Wave 2 change. The only kicker-related w2-plan item was Bolder R11 (left border 3px→4px), which was **deferred**. |
| Current code  | `components.css:118` — `font-size: var(--text-sm)` with `font-family: var(--ff-mono)`. Kickers are uppercase monospace section codes (e.g., "TR1 — TRANSPARENCY").                                                                                        |
| Audit verdict | "Consistent with the kicker being an uppercase monospace code, not body text"                                                                                                                                                                             |
| **Action**    | None. This was never a planned change. 12px monospace kickers are correct.                                                                                                                                                                                |

### REG-2: Principle-item border-left at 4px instead of 6px — NOT A REGRESSION

| Aspect        | Detail                                                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flagged by    | w3-critique regression table line 261: "REGRESSION/MISS"                                                                                                          |
| Claim         | Wave 2 intended 6px principle-item borders; CSS shows 4px                                                                                                         |
| Investigation | w2-plan.md contains **no change** to `.principle-item` border-left-width. The critique header incorrectly listed "6px principle-item borders" as a Wave 2 change. |
| Current code  | `components.css:175-217` — all five `principle-item[data-section]` variants use `border-left: 4px solid`. Parent sections use 6px→8px on active.                  |
| Design intent | 4px is **intentional visual hierarchy**: parent (6px) > child (4px). Audit confirms "reasonable design decision, not a regression."                               |
| **Action**    | None required. Document as intentional hierarchy (see N-3).                                                                                                       |

### Invalid Finding: "Rating scale has no ARIA radiogroup role" — ALREADY IMPLEMENTED

| Aspect        | Detail                                                                                                                                                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flagged by    | w3-critique persona Sam, rated "P1"                                                                                                                                                                                                                                        |
| Claim         | Rating scales lack `role="radiogroup"` and options lack `role="radio"` + `aria-checked`                                                                                                                                                                                    |
| Investigation | `dom-factories.js:701` — container has `role: 'radiogroup'` + `aria-labelledby`. `dom-factories.js:747-749` — each option has `role: 'radio'`, `aria-checked: String(isSelected)`, `aria-disabled`, `aria-label`. Full ARIA radiogroup semantics are properly implemented. |
| **Action**    | None. Finding is invalid.                                                                                                                                                                                                                                                  |

---

## Deduplication Map

Overlapping findings merged across reports:

| Merged ID | Audit Source          | Critique Source                                   | Resolution                                                                      |
| --------- | --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| C-1       | —                     | P2 "context sidebar fallback" + persona Jordan #1 | Merged into single finding                                                      |
| H-1       | P2.1 `aria-live`      | —                                                 | Unique to audit                                                                 |
| H-2       | P2.3 native `<label>` | persona Sam #1 (radiogroup)                       | Sam's radiogroup claim INVALID; audit's `<label>` concern is separate and valid |
| N-3       | —                     | P2 "principle-item 4px vs 6px"                    | Not a regression; retained as documentation item                                |
| A-1       | —                     | P1 "field-label 12px undersized"                  | Different element than REG-1 kickers; valid independent concern                 |

---

## Findings by Wave 4 Skill

---

### /arrange — Layout, Spacing, Visual Rhythm (6 findings: 1×P1, 1×P2, 4×P3)

#### [A-1] [P1] Field-label at 12px is undersized for primary wayfinding

- **What**: `.field-label` uses `font-size: var(--text-sm)` (12px) — the smallest text on the page — despite being the primary wayfinding element for each of 132+ fields. At 12px with uppercase Arial Narrow, effective cap-height is ~10px.
- **Why it matters**: Field-help was promoted to `--text-md` (14px) in Wave 1; labels at 12px are now smaller than their own help text. For a dense evaluation form, labels need to be scannable. The design context says "Explicit."
- **Tension**: 12px uppercase labels create strong visual hierarchy (label < body < heading). Bumping to 14px would equalize labels with help text, potentially reducing hierarchy. Alternative: keep 12px but increase letter-spacing or weight differentiation.
- **Location**: `components.css:343`
- **Fix options**: (a) Bump to `var(--text-md)` (14px), (b) add `letter-spacing: 0.04em` to improve readability at 12px, (c) document as intentional density trade-off
- **Effort**: Trivial
- **Source**: w3-critique P1

#### [A-2] [P2] `--ut-grey` and `--ut-offwhite` too close in value

- **What**: `--ut-grey` (canvas: `#eef0f3`) and `--ut-offwhite` (`#f3f4f6`) differ by ~2% lightness. Used for different semantic layers but visually indistinguishable on most monitors.
- **Why it matters**: Evidence blocks (`--ut-offwhite`), mock-controls (`--ut-grey`), and canvas (`--ut-grey`) merge together. Visual hierarchy breaks when surfaces that should be distinct look identical.
- **Location**: `tokens.css:20-22`
- **Fix**: Push `--ut-offwhite` to `#f7f8fa` or pull `--ut-grey` to `#eaecf0`. Minimum 4–5% lightness gap for boundary detection.
- **Effort**: Small
- **Source**: w3-critique P2

#### [A-3] [P3] Panel-caption at 16px is one step too large for secondary text

- **What**: `.panel-caption` uses `font-size: var(--text-body)` (16px) — same size as paragraph text. Captions are secondary instructions and should recede.
- **Location**: `layout.css:331`
- **Fix**: Move to `font-size: var(--text-md)` (14px) for clear visual step-down.
- **Effort**: Trivial
- **Source**: w3-critique P3

#### [A-4] [P3] Completion strip cells overflow at narrow widths

- **What**: 12 strip cells at `min-width: 3.2rem` wrap to multiple rows at 760–1160px. Cell labels don't truncate, causing awkward line breaks.
- **Location**: `layout.css` (completion strip)
- **Fix**: Add `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` to strip-cell labels, or reduce min-width at the 760px breakpoint.
- **Effort**: Small
- **Source**: w3-critique persona Alex

#### [A-5] [P3] Evidence intake grid three-column too tight at 760–1000px

- **What**: `evidence-intake-grid` uses three columns that collapse to single at 760px. Between 760–1000px, columns are cramped.
- **Location**: `components.css` (evidence-intake-grid)
- **Fix**: Consider two-column intermediate breakpoint at 1000px.
- **Effort**: Small
- **Source**: w3-critique observation

#### [A-6] [P3] Pager shell center cell squeezed at 760–960px

- **What**: `grid-template-columns: minmax(8rem, 1fr) auto minmax(8rem, 1fr)` — center status cell gets near-zero width at narrow widths before the 760px stack breakpoint.
- **Location**: `components.css` (pager-shell)
- **Fix**: Add intermediate breakpoint or adjust minmax values.
- **Effort**: Trivial
- **Source**: w3-critique observation

---

### /normalize — Consistency, Design Drift, Token Mismatches (5 findings: 1×P1, 1×P2, 3×P3)

#### [N-1] [P1] Inline styles in JS bypass CSS token system

- **What**: `help-panel.js:255-264` uses inline `style.cssText` for table rows/cells (`border-bottom`, `padding`, `font-family`, `font-size`, `font-weight`, `color`, `line-height`). `dom-factories.js:14-49` defines `INLINE_TEXT_CONTROL_STYLE`, `INLINE_TEXTAREA_STYLE`, `INLINE_SELECT_STYLE`, `INLINE_HIDDEN_CHOICE_INPUT_STYLE` constants that reference CSS variables but live outside the stylesheet cascade.
- **Why it matters**: Two-source-of-truth problem. Visual changes require editing both CSS files and JS string constants. The help-panel table styles are pure presentation that should be CSS classes.
- **Location**: `help-panel.js:255-264`, `dom-factories.js:14-49`
- **Fix**: Move help-panel.js inline styles to CSS classes (e.g., `.help-shortcut-row`, `.help-shortcut-key`, `.help-shortcut-action`). Document dom-factories inline styles as intentional exceptions with a code comment.
- **Effort**: Small (help-panel) + documentation (dom-factories)
- **Source**: w3-audit P1.2

#### [N-2] [P2] Z-index token documentation gap

- **What**: 12 z-index tokens defined in `tokens.css:374-386` and correctly used via `var(--z-*)` references, but the scale lacks comments explaining the layering intent.
- **Location**: `tokens.css:374-386`
- **Fix**: Add inline comments documenting the z-index scale rationale.
- **Effort**: Trivial
- **Source**: w3-audit P2.6 (downgraded from P1.1 after verification that tokens ARE used via `var()`)

#### [N-3] [P2] Principle-item border-left 4px vs 6px section-card — document intent

- **What**: `.principle-item[data-section]` uses `border-left: 4px solid` while parent `.doc-section`/`.form-section` uses `border-left: 6px solid` (→8px active). Visual hierarchy is intentional but undocumented.
- **Why it matters**: The critique flagged this as a potential regression (REG-2 — confirmed NOT a regression). Without documentation, a future developer may "fix" the inconsistency.
- **Location**: `components.css:162-218`
- **Fix**: Add CSS comment: `/* 4px border: intentional hierarchy — parent sections use 6px */`.
- **Effort**: Trivial
- **Source**: w3-critique P2, REG-2 investigation

#### [N-4] [P3] `.shell-focus-anchor` and `.visually-hidden` share identical base styles

- **What**: Both classes in `base.css:42-77` share identical clip/hidden styles. `.shell-focus-anchor` expands on `:focus`. DRY violation.
- **Location**: `base.css:42-77`
- **Fix**: Extract shared `.sr-only` base class, extend with `.shell-focus-anchor` for focus expansion.
- **Effort**: Trivial
- **Source**: w3-audit P3.3

#### [N-5] [P3] Print body colors hardcoded outside tokens

- **What**: `print.css:149-151` uses `color: #000; background: #fff;` — bypasses token system. Intentional for maximum print contrast but undocumented.
- **Location**: `print.css:149-151`
- **Fix**: Add comment `/* Intentional: print forces maximum contrast regardless of theme */`.
- **Effort**: Trivial
- **Source**: w3-audit P3.4

---

### /clarify — Copy, Labels, Error Messages, Microcopy (6 findings: 0×P1, 2×P2, 4×P3)

#### [C-1] [P2] Context panel empty-state guidance is passive

- **What**: `.context-empty-state` shows "Select a page to see context guidance" — a passive instruction with no actionable next step. First-time users don't know the context panel auto-populates.
- **Why it matters**: Jordan persona's first impression of the context panel. The empty state should orient users, not say "select something."
- **Location**: `trust-framework.html:104-107`
- **Fix**: Either (a) trigger context panel population on app bootstrap for the initial active page, or (b) rewrite empty-state text to "Guidance for the current page appears here automatically as you navigate."
- **Effort**: Small
- **Source**: w3-critique P2 + persona Jordan #1 (merged)

#### [C-2] [P2] "Submission type" field doesn't signal its importance

- **What**: The first field (S0) just says "SUBMISSION TYPE" in uppercase. It determines page accessibility (workflow mode), but this consequence is only explained in the context panel — which new users may not have noticed yet.
- **Location**: `questionnaire-pages.js` (S0 field rendering), `questionnaire-schema.js` (field definition)
- **Fix**: Add `.field-help` text: "This choice determines which sections are editable in this evaluation."
- **Effort**: Small
- **Source**: w3-critique persona Jordan #3

#### [C-3] [P3] No inline examples for complex fields

- **What**: Fields like "Tool URL" and "Evaluation folder link" have `.field-help` text but no example values. First-time users may not know whether to enter a full URL or just a domain.
- **Location**: `questionnaire-schema.js` (field definitions)
- **Fix**: Add `placeholder` or example text to URL/link fields.
- **Effort**: Small
- **Source**: w3-critique persona Jordan #2

#### [C-4] [P3] Document `color-mix()` browser support floor

- **What**: ~100+ instances of `color-mix()` across CSS files with no fallback. Requires Safari 16.2+, Chrome 111+, Firefox 113+.
- **Location**: `CLAUDE.md`
- **Fix**: Add browser support note to architecture section.
- **Effort**: Trivial
- **Source**: w3-audit P2.4

#### [C-5] [P3] Document `@starting-style` graceful degradation

- **What**: Two `@starting-style` blocks (`interaction-states.css:121-126, 918-923`). No Firefox support as of 2026-04. Graceful degradation (animations simply don't animate).
- **Location**: `CLAUDE.md`
- **Fix**: Document as intentional progressive enhancement.
- **Effort**: Trivial
- **Source**: w3-audit P2.5

#### [C-6] [P3] Document class-vs-data-attribute state convention

- **What**: Codebase uses class-based state (`.is-active`, `.selected`) for visual states and data-attribute state (`data-progress-state`) for semantic states. Convention works well but is undocumented.
- **Location**: `CLAUDE.md`
- **Fix**: Add convention note to CLAUDE.md code style section.
- **Effort**: Trivial
- **Source**: w3-audit systemic observation #3

---

### /optimize — Performance, Bundle Size, Rendering (2 findings: 1×P1, 1×P2)

#### [O-1] [P1] Rating-option transition at 100ms is below perception threshold

- **What**: `.rating-option` transitions (background, border-color, border-left-width) use `--duration-instant` (100ms). Below the 150ms minimum for perceptible change. The rating selection is the most frequent interaction (15 criteria × 4 options = 60 per session).
- **Why it matters**: At 100ms, border-width changes (2px → 3px) are imperceptible. The `is-just-selected` confirm animation (200ms) partially compensates, but the base transition should also be visible.
- **Location**: `components.css:516-519`
- **Fix**: Change to `--duration-fast` (150ms) for all properties. Keep `--duration-instant` for hover-only states.
- **Effort**: Trivial
- **Source**: w3-critique P1

#### [O-2] [P2] Tab indicator layout read/write not batched via rAF

- **What**: `navigation.js:623-624` reads `offsetLeft`/`offsetWidth` then immediately writes styles. Not a hot path (one call per tab switch) but violates read-then-write batching.
- **Location**: `navigation.js:623-624`
- **Fix**: Wrap style writes in `requestAnimationFrame`.
- **Effort**: Trivial
- **Source**: w3-audit P2.2

---

### /harden — Error Handling, Edge Cases, Accessibility, Robustness (7 findings: 0×P1, 4×P2, 3×P3)

#### [H-1] [P2] `aria-live` regions not pre-declared in HTML

- **What**: Live regions added via `setAttribute('aria-live', 'polite')` at render time in `pager.js:37`, `sidebar.js:318`, `evidence.js:531`. Some assistive technologies may not announce content changes to dynamically added live regions.
- **Location**: `trust-framework.html` (add empty containers), JS files (remove dynamic setAttribute)
- **Fix**: Add three empty `<div aria-live="polite" class="visually-hidden">` containers in the HTML for pager status, sidebar route card, and evidence count. Remove dynamic `setAttribute` calls.
- **Effort**: Small
- **Source**: w3-audit P2.1

#### [H-2] [P2] No native `<label>` on dynamically rendered text/select fields

- **What**: Text inputs, selects, and textareas use `aria-labelledby` instead of explicit `<label for="...">`. While WCAG 2.1 compliant, native `<label>` provides click-to-focus and some AT announce differently.
- **Note**: Rating options already use native `<label>` wrapping (`dom-factories.js:733`). This applies only to text/select/textarea fields.
- **Location**: `questionnaire-pages.js`, `dom-factories.js`
- **Fix**: Consider `<label for="fieldId">` alongside existing `aria-labelledby`.
- **Effort**: Medium
- **Source**: w3-audit P2.3

#### [H-3] [P2] No Alt+Left/Right pager navigation shortcuts

- **What**: Power users expect keyboard prev/next navigation. The pager has visual shortcut hints but only shows principle-level Alt+number shortcuts, not page-level prev/next.
- **Location**: `keyboard.js`
- **Fix**: Add `Alt+ArrowLeft` (previous) and `Alt+ArrowRight` (next) keyboard shortcuts.
- **Effort**: Small
- **Source**: w3-critique persona Alex #1

#### [H-4] [P2] No jump-to-first-incomplete shortcut

- **What**: Users must visually scan the completion strip to find the next incomplete section. A shortcut (e.g., `Alt+J`) to jump to the first page with `data-page-validation-state='attention'` or `'invalid'` would save 10–20 seconds per session.
- **Location**: `keyboard.js`
- **Fix**: Add `Alt+J` shortcut that navigates to first incomplete page.
- **Effort**: Small
- **Source**: w3-critique persona Alex #2

#### [H-5] [P3] No direct number-key input for rating scales

- **What**: When a rating scale is focused, users should be able to press 0, 1, 2, or 3 to select directly. Currently requires click or tab+Enter. 60 extra keystrokes per evaluation.
- **Location**: `keyboard.js` or `field-handlers.js`
- **Fix**: Intercept number keys 0–3 when `.rating-scale` has focus. Only activate within rating context.
- **Effort**: Medium
- **Source**: w3-critique persona Alex #3

#### [H-6] [P3] No confirmation on evidence deletion

- **What**: Evidence items can be deleted without confirmation. For evaluation data that may be difficult to re-attach, this is an error-prevention gap.
- **Location**: `evidence.js`
- **Fix**: Add `confirm()` dialog or inline undo pattern before deleting.
- **Effort**: Small
- **Source**: w3-critique heuristic 5

#### [H-7] [P3] Focus ring on active page-index-button hard to distinguish

- **What**: Active state uses `box-shadow: inset 0 3px 0 var(--section-accent)`. Focused state adds `2px solid var(--ut-blue)` outline with `2px` offset. Inset shadow and outline blend together.
- **Location**: `interaction-states.css` (page-index-button active + focus-visible)
- **Fix**: Increase outline-offset to 3px or change focus ring color when combined with active state.
- **Effort**: Trivial
- **Source**: w3-critique persona Sam #3

---

## Priority Summary

| Priority             | Count | IDs                                                             |
| -------------------- | ----- | --------------------------------------------------------------- |
| **P1**               | 3     | A-1, N-1, O-1                                                   |
| **P2**               | 11    | A-2, C-1, C-2, H-1, H-2, H-3, H-4, N-2, N-3, O-2                |
| **P3**               | 16    | A-3, A-4, A-5, A-6, C-3, C-4, C-5, C-6, H-5, H-6, H-7, N-4, N-5 |
| **Invalid**          | 1     | (radiogroup — already implemented)                              |
| **Total actionable** | 26    |                                                                 |

---

## Wave 1 + Wave 2 Change Verification (All Confirmed, Zero Regressions)

| Wave | Change                                       | Verified                                       |
| ---- | -------------------------------------------- | ---------------------------------------------- |
| W1   | Mini-card h3 → Arial Narrow                  | `components.css:241` ✓                         |
| W1   | Subhead → Arial Narrow                       | `components.css:994` ✓                         |
| W1   | `--text-md: 0.875rem` step                   | `tokens.css:292` ✓                             |
| W1   | field-help uses `--text-md`                  | `components.css:472` ✓                         |
| W1   | Evidence prose uses `--text-md`              | `components.css:651-655` ✓                     |
| W1   | Score-2 shifted to `#0e7490`                 | `tokens.css:142` ✓                             |
| W1   | Criterion-card h3 bold                       | `components.css:607` ✓                         |
| W1   | Field-label tighter line-height              | `components.css:349` ✓                         |
| W1   | Rating dots score-level border colors        | `interaction-states.css:779-810` ✓             |
| W2   | `--text-display: 2.25rem`                    | `tokens.css:296` ✓                             |
| W2   | `@property --top-accent-color`               | `tokens.css:1-5` ✓                             |
| W2   | Top-accent 5px + animated color              | `layout.css:7-8`, `interaction-states.css:3` ✓ |
| W2   | Panel bg `neutral-50`                        | `components.css:241` ✓                         |
| W2   | Criterion h3 bottom border                   | `components.css:608` ✓                         |
| W2   | Pager shell 2px border + shadow              | `components.css:1534` ✓                        |
| W2   | Active section `border-bottom: 2px`          | `interaction-states.css:114` ✓                 |
| W2   | `@starting-style` entry animations           | `interaction-states.css:121-126, 918-923` ✓    |
| W2   | Field-group focus-within section accent      | `interaction-states.css:725-728` ✓             |
| W2   | Page-index inset 3px shadow                  | `interaction-states.css:922` ✓                 |
| W2   | Rating border confirm animation              | `animations.css` ✓                             |
| W2   | Principle-specific evidence empty-state text | `evidence.js` ✓                                |
| W2   | Evaluation-complete pager status             | `pager.js` ✓                                   |

---

## Recommended Implementation Sequence

### Phase 1: /optimize (2 quick wins)

| Step | ID  | File                     | Description                                        | Effort  |
| ---- | --- | ------------------------ | -------------------------------------------------- | ------- |
| 1    | O-1 | `components.css:516-519` | Bump rating-option transition to `--duration-fast` | Trivial |
| 2    | O-2 | `navigation.js:623-624`  | Wrap tab indicator writes in rAF                   | Trivial |

### Phase 2: /normalize (5 token-consistency items)

| Step | ID   | File                     | Description                                    | Effort  |
| ---- | ---- | ------------------------ | ---------------------------------------------- | ------- |
| 3    | N-1a | `help-panel.js:255-264`  | Move inline table styles to CSS classes        | Small   |
| 4    | N-1b | `dom-factories.js:14-49` | Add comment documenting inline-style exception | Trivial |
| 5    | N-2  | `tokens.css:374-386`     | Add z-index scale comments                     | Trivial |
| 6    | N-3  | `components.css:162`     | Add hierarchy comment to principle-item border | Trivial |
| 7    | N-4  | `base.css:42-77`         | Extract shared `.sr-only` base class           | Trivial |
| 8    | N-5  | `print.css:149-151`      | Add intentional-contrast comment               | Trivial |

### Phase 3: /arrange (6 visual-rhythm items)

| Step | ID  | File                 | Description                                     | Effort  |
| ---- | --- | -------------------- | ----------------------------------------------- | ------- |
| 9    | A-1 | `components.css:343` | Evaluate field-label size (12px vs 14px)        | Trivial |
| 10   | A-2 | `tokens.css:20-22`   | Increase `--ut-offwhite` to `#f7f8fa`           | Small   |
| 11   | A-3 | `layout.css:331`     | Reduce panel-caption to `--text-md`             | Trivial |
| 12   | A-4 | `layout.css`         | Add ellipsis overflow to strip-cell labels      | Small   |
| 13   | A-5 | `components.css`     | Add evidence-grid 2-col intermediate breakpoint | Small   |
| 14   | A-6 | `components.css`     | Adjust pager-shell grid for narrow widths       | Trivial |

### Phase 4: /clarify (6 copy and documentation items)

| Step | ID  | File                           | Description                             | Effort  |
| ---- | --- | ------------------------------ | --------------------------------------- | ------- |
| 15   | C-1 | `trust-framework.html:104-107` | Improve context panel empty-state text  | Small   |
| 16   | C-2 | `questionnaire-schema.js`      | Add field-help to submission-type field | Small   |
| 17   | C-3 | `questionnaire-schema.js`      | Add placeholder examples to URL fields  | Small   |
| 18   | C-4 | `CLAUDE.md`                    | Document `color-mix()` browser floor    | Trivial |
| 19   | C-5 | `CLAUDE.md`                    | Document `@starting-style` degradation  | Trivial |
| 20   | C-6 | `CLAUDE.md`                    | Document class-vs-data-attr convention  | Trivial |

### Phase 5: /harden (7 accessibility and robustness items)

| Step | ID  | File                                         | Description                             | Effort  |
| ---- | --- | -------------------------------------------- | --------------------------------------- | ------- |
| 21   | H-1 | `trust-framework.html` + JS                  | Pre-declare aria-live regions           | Small   |
| 22   | H-2 | `questionnaire-pages.js`, `dom-factories.js` | Add native `<label>` to text fields     | Medium  |
| 23   | H-3 | `keyboard.js`                                | Add Alt+ArrowLeft/Right pager shortcuts | Small   |
| 24   | H-4 | `keyboard.js`                                | Add Alt+J jump-to-first-incomplete      | Small   |
| 25   | H-5 | `keyboard.js` or `field-handlers.js`         | Add number-key rating input             | Medium  |
| 26   | H-6 | `evidence.js`                                | Add deletion confirmation               | Small   |
| 27   | H-7 | `interaction-states.css`                     | Increase page-index focus ring offset   | Trivial |

---

## Verification Checklist

After Wave 4 implementation:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. Visual: Rating option transitions are perceptibly smooth (150ms)
4. Visual: `--ut-offwhite` surfaces are distinguishable from `--ut-grey` canvas
5. Visual: Panel caption at 14px is clearly secondary to body text
6. Visual: Field-label legibility is acceptable at chosen size (12px or 14px)
7. Functional: Alt+ArrowLeft/Right navigates between pages
8. Functional: Alt+J jumps to first incomplete page
9. Functional: Number keys 0–3 select rating when scale is focused
10. Functional: Context panel shows meaningful content on first load
11. Functional: Evidence deletion requires confirmation
12. Accessibility: Screen reader announces pager status changes via pre-declared live regions
13. Accessibility: Focus ring is distinguishable on active page-index buttons
14. No changes break any Wave 1 or Wave 2 verified changes

---

## Positive Patterns to Preserve

Both reports agree these are exemplary — **do not regress**:

1. **Token system** — 387 lines of semantically named tokens; every visual property traces to `:root`
2. **`@property --top-accent-color`** — smooth CSS-only color transitions on section switch
3. **`@starting-style` entry animations** — native CSS for section/page-index activation
4. **`prefers-reduced-motion`** — comprehensive zero-duration overrides
5. **Accessibility foundations** — skip links, ARIA landmarks, radiogroup semantics, focus management with retry, `inert` + `aria-hidden` on inactive pages
6. **CSS containment** — `.framework-panel` uses `contain: layout style paint`
7. **Print stylesheet** — comprehensive collapse, color preservation, section identifiers
8. **Event delegation** — input/change events caught at questionnaire root
9. **Immutable state** — store returns new objects; derive.js is sole source of computed state
10. **Zero runtime dependencies** — no framework, no library, no polyfills
11. **Semantic scoring colors** — `--score-0` through `--score-3` with tints/borders
12. **Typography zoning** — Inter (body) / Arial Narrow (headings) / JetBrains Mono (data)
13. **Border-left accent hierarchy** — 6px/8px sections > 4px principle items > 2px other elements

---

_End of Wave 3 Consolidated Diagnostic Plan_
