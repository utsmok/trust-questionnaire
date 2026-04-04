# Consolidated Findings Report

Date: 2026-04-04
Sources: 5 research investigations (reference-drawers, navigation-layout, surfaces-panels, form-styling-text, section-access-workflow)
Amended: 2026-04-04 — Review synthesis from 6 skill-based reviews (arrange, distill, colorize, normalize, typeset, clarify, audit, polish, harden, critique)

---

## 1. Executive Summary

Five parallel investigations identified **27 distinct issues** across the TRUST questionnaire application. Six subsequent skill-based reviews validated these findings, identified **15 additional issues**, and refined fix approaches for 8 existing issues. The issues range from runtime errors that break features entirely to cosmetic styling problems and missing features.

**Severity breakdown:**

| Severity | Count | Description |
|----------|-------|-------------|
| P0 — Critical | 4 | Runtime errors, complete feature failures, CSS parsing error |
| P1 — High | 11 | Broken functionality, illegible UI, blocked user flows, a11y gaps, performance |
| P2 — Medium | 20 | Styling inconsistencies, redundant UI, architectural debt, text quality |
| P3 — Low | 7 | Minor UX issues, edge cases, dead code, feature requests |

**Files most affected:**

| File | Issues touching it |
|------|--------------------|
| `static/js/behavior/navigation.js` | 12 issues |
| `static/js/render/sidebar.js` | 12 issues |
| `static/css/interaction-states.css` | 8 issues |
| `trust-framework.html` | 9 issues |
| `static/css/components.css` | 7 issues |
| `static/js/render/reference-drawers.js` | 4 issues |
| `static/js/render/evidence.js` | 5 issues |
| `static/css/accent-scoping.css` | 3 issues |
| `static/js/render/help-panel.js` | 2 issues |
| `static/css/tokens.css` | 3 issues |

**Three architectural themes dominate:**

1. **Surface/panel architecture is broken** — three different surface mechanisms (sidebar, two overlays) with overlapping behavior, broken styling, and an empty help panel. Recommendation: merge into a single tabbed sidebar with three tabs: Guidance, Reference, About.
2. **Navigation is duplicated and miscolored** — two nav bars showing the same data, global accent-color override wiping per-section identity, illegible toggle buttons, inaccessible completion strip.
3. **Form controls are inconsistent** — evidence fields bypass the mock-control system, verbose instructional text clutters the UI, no tooltip mechanism exists for field-level help, validation states not exposed to assistive technology.

---

## Review Synthesis

*Added 2026-04-04 after cross-referencing 6 skill-based review reports against the original findings.*

### Alignment Matrix

| # | Original User Issue | Report Issue(s) | Reviews Covering | Conflicts? |
|---|---------------------|-----------------|------------------|------------|
| 1 | Reference drawer accordion headers broken | 4.1 | arrange, distill, typeset, polish | None — all agree |
| 2 | PIN buttons unclear | 4.2 | distill, critique | None — all agree: remove |
| 3 | Quick reference in wrong place | 4.3 | arrange, audit, critique | Width constraint concern (arrange, critique) |
| 4 | Section subtitle unnecessary | 6.2 | distill, typeset, polish, critique | **Yes** — see below |
| 5 | Quick jump nav issues | 2.3, 2.4, 2.6, 3.1, 3.2 | all 6 reviews | Label naming (typeset vs report) |
| 6 | Sections locked | 8.1 | audit | None — all agree |
| 7 | Tooltips needed | 7.1–7.4 | typeset, clarify, audit, polish, critique | Under-specification flagged |
| 8 | Missing reviewer info | 9.1 | — (no conflicts) | None |
| 9 | Duplicate navigation | 3.1 | arrange, colorize, audit | Audit upgrades to P1 |
| 10 | Evidence unstyled | 5.1 | audit, polish | None — all agree |
| 11 | Verbose text | 6.1 | distill, typeset, clarify | **Yes** — see below |
| 12 | Context bar updates | 2.7, 8.3.1–8.3.4 | polish, harden | Store architecture (harden) |

### Cross-Review Consensus Items

These items are validated by 3+ reviews with no dissenting opinions:

1. **Keep the section subtitle** (Issues 6.2, 2.7). Typeset, polish, and distill reviews all argue the subtitle is the only accessible, header-level section identity cue. Fix the bugs (Issue 2.7), don't remove the feature. Panel headers would feel empty without it.
2. **Expand Issue 3.2 fix scope.** Use `[data-accent-key='X']` override rules instead of per-element CSS. This fixes the current bug and prevents recurrence (colorize-normalize).
3. **Reduce sidebar tabs from 3 to 3 named tabs: Guidance, Reference, About.** Merge Help content into Guidance tab as a collapsible section. Reference drawers become the Reference tab's primary content (arrange-distill, critique).
4. **CSS syntax error at `components.css:1365`** is a P0 bug the original research missed (audit).
5. **`--text-xs` (10px) is below readability minimum** — affects 10+ UI elements carrying essential identity information (typeset, P1).
6. **Completion strip `aria-hidden` makes it completely inaccessible** — upgrades Issue 3.1 from P2 to P1 (audit).
7. **Full sidebar DOM rebuild on every state change** is a P1 performance issue (audit, polish).
8. **Panel captions (F, G) should be shortened, not removed** — they serve an onboarding function (typeset-clarify).
9. **Text rewrites for items C, D, E lose critical guidance** when shortened too aggressively. Better rewrites provided (typeset-clarify).
10. **Issue 8.3.1 (sub-anchor batching) requires store architecture change** — the current store has no batch/transaction API (harden).
11. **Reference drawers moving to the 560px-max-width sidebar will cause content reflow** — must address the constraint (arrange, critique).

### Conflicts Between Reviews and Resolution

| Conflict | Reviews | Resolution |
|----------|---------|------------|
| **Section subtitle: remove vs. keep** | Report says remove (6.2). Typeset, distill, polish say keep. Critique doesn't address directly. | **Keep** — 3 reviews with strong a11y arguments vs. report's single assertion. Fix bugs instead. |
| **Panel captions: remove vs. shorten** | Report says REMOVE (items F, G). Typeset-clarify says SHORTEN with replacement text. | **Shorten** — keeping brief orientation text for first-time users. |
| **Proposed text rewrites (C, D, E)** | Report proposes terse rewrites. Typeset-clarify proposes fuller rewrites that preserve actionable guidance. | **Use typeset-clarify rewrites** — they preserve "when to skip" and "what happens" information. |
| **"Help" tab label** | Report proposes "Legend". Typeset-clarify says "Legend" is unclear. | **Use "Help"** — more predictable. Tab labels: Guidance, Reference, About (rename during Phase 8). |
| **Draggable sidebar width** | Report proposes it (2.10). Critique says drop it (over-engineered). Harden says fix the min-width. | **Keep** — user explicitly requested it. Accept harden's recommendation to raise minimum to 20rem. |
| **Context pinning** | Report doesn't question pinning. Distill suggests removing it. | **Defer** — valid concern but not related to original issues. Flag for Phase 8 review. |

### Items from Reviews: Accepted / Deferred / Rejected

**ACCEPTED (incorporated into report):**

| Source | Item | Added as |
|--------|------|----------|
| audit | CSS syntax error: missing `}` in `.pager-shell` | New P0 issue 2.2b |
| audit | Completion strip invisible to assistive technology | Upgraded Issue 3.1 to P1 |
| audit | No `aria-live` for sidebar context changes | New P1 issue 9.2 |
| audit | Form validation states not exposed to screen readers | New P1 issue 9.3 |
| audit | Full quick-jump DOM teardown on every state change | New P1 issue 9.4 |
| audit | MutationObserver triggers full application sync | New P1 issue 9.5 |
| audit | Context drawer backdrop has no keyboard dismiss | New P2 issue 9.6 |
| audit | Reference drawers worse on mobile than described | Added context to Issue 4.3 |
| audit | Evidence controls DO have aria-labels | Added note to Issue 5.1 |
| typeset | `--text-xs` (10px) below readability minimum | New P1 issue 9.7 |
| typeset | Panel title tracking excessive (0.12em) | New P3 issue 9.8 |
| typeset | Reference drawer title is only 12px | Added to Issue 4.1 fix |
| typeset | Better rewrites for items C, D, E | Updated Issue 6.1 |
| typeset | Captions should be shortened not removed | Updated Issue 6.1 items F, G |
| clarify | Section-code prefixes on field labels redundant | New P2 issue 9.9 |
| clarify | Developer-facing notes shown as UI help text | New P2 issue 9.10 |
| clarify | Derived field placeholder jargon | New P2 issue 9.11 |
| clarify | "Legend" label unclear — use "Help" instead | Updated Issue 2.6 |
| colorize | Expand Issue 3.2 fix to `[data-accent-key]` approach | Updated Issue 3.2 |
| colorize | Dead `data-target` color rules in interaction-states.css | New P3 issue 9.12 |
| colorize | Reference drawer border color override bug | New P2 issue 9.13 |
| colorize | SE/TC contrast fails WCAG AA for normal text | New P2 issue 9.14 |
| colorize | `--section-on-accent` should have fallback values | Added note to Issue 3.2 |
| distill | Remove header progress summary block | New item in 6.1 (N) |
| distill | Remove route card redundant rows | New item in 6.1 (O) |
| distill | Remove criterion companion field enumeration | New item in 6.1 (P) |
| distill | Remove or reduce buildSummaryCompanion | New item in 6.1 (Q) |
| distill | Remove reference drawer subtitles | New item in 6.1 (R) |
| distill | Remove duplicate Context toggle (#toolbarContextToggle) | New item in 6.1 (S) |
| distill | Sidebar max-width 560px too narrow for reference drawers | Added note to Issue 4.3 |
| distill | Card de-nesting needed for sidebar tabs | Added note to Issue 2.8 |
| arrange | Header grid needs explicit column sizing for nav consolidation | Added note to Issue 3.1 |
| polish | Grid-template-columns can't be transitioned for sidebar toggle | Added note to Issue 2.8 |
| polish | Page transition JS/CSS timing desync | Added note to Issue 8.3.1 |
| polish | Reference drawer summary lacks focus-visible state | Added to Issue 4.1 fix |
| polish | Evidence async operations have no loading state | Added note to Issue 5.1 |
| polish | Sidebar minimum width should be 20rem, not 16rem | Updated Issue 2.10 |
| polish | Tooltip component specification needed | Added to Issue 7.3 |
| polish | Tab bar component specification needed | Added to Issue 2.8 |
| polish | Error resilience for sidebar sync() | Added note to Issue 8.3 |
| polish | Store batching: use combined action approach | Added to Issue 8.3.1 |
| harden | Store has no batch API — sub-anchor fix needs combined action | Updated Issue 8.3.1 |
| harden | localStorage persistence needs try-catch fallback | Added to Issue 2.10 |
| harden | Text removal affects screen readers — need aria alternatives | Added note to Issue 6.1 |
| critique | Rename tabs during Phase 8, not after | Updated Issue 2.8 |
| critique | Reference drawers should be flat sections, not accordions | Added to Issue 4.3 |
| critique | Consolidate tooltip issues 23–26 into one feature | Updated Phase 7 |
| critique | Split Phase 8 into 8a (bug fixes) and 8b (tabbed sidebar) | Updated Phase 8 |
| critique | Add text-review step to Phase 8 migration | Added to Issue 2.8 |

**DEFERRED (noted but not added):**

| Source | Item | Reason |
|--------|------|--------|
| arrange | Spacing scale adoption prerequisite | Valid but large scope, tangential to original issues |
| arrange | Panel progress bars / shadow edge noise | Minor, not related to original issues |
| arrange | Context pinning removal suggestion | Valid concern but not requested by user |
| colorize | Inconsistent button styling patterns | Valid but larger scope than requested |
| colorize | Token violations in components.css | Valid but tangential |
| colorize | Non-principle section color consumption | Valid but tangential |
| typeset | Type scale ratio inconsistency | Document-only change, not a fix |
| typeset | Font choices are generic | Future design iteration, not a bug |
| typeset | Font loading audit | Tangential, not a user-reported issue |
| clarify | Pager buttons lack wayfinding | Nice-to-have, not related to original issues |
| clarify | Generic "Select an option" placeholder | Nice-to-have |
| clarify | Sidebar fallback copy quality varies | Larger scope rewrite |
| critique | Validation UX phase (Phase 2.5) | Large scope addition not requested by user |
| critique | First-run experience | Nice-to-have, user didn't request |
| critique | Skip workflow confirmation | Nice-to-have |
| critique | Session persistence | Out of scope |
| critique | Export/submission workflow | Out of scope |
| critique | "Next incomplete section" button | Feature request, out of scope |
| polish | Context pin button transition | Minor polish, tangential |
| polish | Evidence intake grid responsive | Tangential |
| polish | Tab merge race condition | Phase 8 implementation detail |
| polish | Hash navigation with hidden sidebar | Edge case |
| polish | Evidence lightbox focus trap | Edge case, tangential |
| polish | Drawer mode transition focus orphan | Edge case |
| harden | Focus trap uses document.activeElement | Edge case |
| audit | help-panel.js inline styles | Tangential |
| audit | z-index layering fragile | Tangential |

**REJECTED (discarded with reason):**

| Source | Item | Reason |
|--------|------|--------|
| critique | Drop draggable sidebar width entirely | **Contradicts user's explicit request** (issue 9: "add draggable sidebar") |
| critique | Add success metrics | Out of scope for a findings report |
| critique | Content quality audit for sidebar guidance sections | Out of scope — user didn't request content review |
| critique | Session persistence | Out of scope entirely |

---

## 2. Sidebar & Surface Architecture Overhaul

This is the largest theme, spanning 8 issues across 3 investigation reports. The core problem: the app has three "surface" mechanisms (context sidebar, about overlay, help overlay) that look identical but behave differently, with multiple bugs in each.

### 2.1 Help Panel Renders No Content

- **Problem**: The Help surface is always empty — no content ever renders.
- **Root cause**: Two compound bugs:
  1. `help-panel.js:440` — `sync()` uses selector `[data-surface="help"]` which matches no element. The actual element is `#helpSurfaceMount` (`trust-framework.html:554`) with no `data-surface` attribute. `querySelector` returns `null`, `render()` is never called.
  2. `help-panel.js:41` — The chip factory function is named `PROGRESS_STATE_LABELS` but all 22 call sites (lines 294–357) reference `createChip`. Even if `render()` ran, it would throw `ReferenceError`.
- **Impact**: Complete feature failure. Users see an empty overlay panel.
- **Fix approach**: Rename `PROGRESS_STATE_LABELS` to `createChip` at line 41. Fix `sync()` to use `documentRef.getElementById('helpSurfaceMount')` or check store state via `selectShellSurfaceState(state, 'helpSurface')`.
- **Severity**: **P0 — Critical**

### 2.2 `setShellSurfaceOpen` ReferenceError on Escape

- **Problem**: Pressing Escape while focus is trapped inside the About or Help surface card throws `ReferenceError`.
- **Root cause**: `navigation.js:822` calls `setShellSurfaceOpen(escSurfaceName, false, ...)` which does not exist. The correct function is `setOverlaySurfaceOpen` (defined at line 781).
- **Impact**: Runtime error breaks the Escape-to-close interaction for overlay surfaces.
- **Fix approach**: Replace `setShellSurfaceOpen` with `setOverlaySurfaceOpen` at line 822.
- **Severity**: **P0 — Critical**

### 2.2b CSS Syntax Error: `.pager-shell` Missing Closing Brace

- **Problem**: The `.pager-shell` rule block at `components.css:1357` opens with `{` but never closes with `}` before the next selector `.pager-button` starts at line 1367.
- **Root cause**: Missing `}` after `box-shadow` declaration at line 1365.
- **Impact**: CSS error recovery causes both `.pager-shell` and `.pager-button` selectors to be compromised. The pager's box-shadow is lost and button styles may parse incorrectly depending on browser error recovery.
- **Fix approach**: Add closing `}` after line 1365 (`box-shadow: 0 1px 3px color-mix(...)`).
- **Severity**: **P0 — Critical** (CSS parsing error affecting core navigation component)
- **Files**: `components.css:1365`
- *(Found by audit review)*

### 2.3 Context Toggle Button Illegible

- **Problem**: The "Context" button in the header renders as dark navy background with dark navy text — unreadable. The duplicate `#toolbarContextToggle` in the questionnaire panel header (`trust-framework.html:70`) has the same classes and the same illegibility problem.
- **Root cause**: Two CSS failures:
  1. `interaction-states.css:1017–1021` — When `aria-expanded='true'`, the rule sets `color: var(--section-on-accent)`. But `--section-on-accent` is undefined on `.shell-action-button` because that class is not in the `:where()` block in `accent-scoping.css:113–136` that resolves section tokens. The `color` inherits `var(--ut-navy)` (dark navy).
  2. `interaction-states.css:1023–1028` — Info and Help buttons have dedicated unexpanded styles using their color families. Context has no equivalent rule.
  3. `store.js:122` — `contextSidebar` defaults to `true`, so the button is almost always in expanded state.
- **Impact**: Users cannot read the Context button label in either location. Core navigation is impaired.
- **Fix approach**: Add `.shell-action-button` to the `:where()` block in `accent-scoping.css`, or define `--section-on-accent: var(--ut-white)` explicitly on `.shell-action-button[aria-expanded='true']`. Add a dedicated unexpanded style for `data-surface-toggle='contextSidebar'`. Apply the same fix to `#toolbarContextToggle`.
- **Severity**: **P1 — High**
- *(Updated to include toolbarContextToggle per polish review P-11)*

### 2.4 Overlay Surfaces Cover Header Navigation

- **Problem**: Clicking Info or Help opens a dark semi-transparent overlay that covers the header quick-jump buttons, preventing the user from toggling the surface off using the same button that opened it.
- **Root cause**: `.shell-surface` uses `z-index: 40` (`layout.css:324–332`) which exceeds the header's `z-index: 25`. There is no backdrop-click-to-close handler (`navigation.js:615–656`).
- **Impact**: Users must find and click the small "Close" button inside the surface card. No other dismiss mechanism exists.
- **Fix approach**: Add a click listener on `.shell-surface` that calls `setOverlaySurfaceOpen(surfaceName, false)` when the click target is the surface itself (not the card). Alternatively, lower surface z-index below header.
- **Severity**: **P1 — High**

### 2.5 Surfaces Can Be Activated Simultaneously

- **Problem**: Context sidebar + About overlay + Help overlay can all be open at the same time on desktop.
- **Root cause**: `contextSidebar` is not in `OVERLAY_SURFACE_NAMES` (`navigation.js:18`). Mutual exclusion between context and overlays only fires in drawer mode (≤1160px) at `navigation.js:274–280` and `787–793`. On desktop, the sidebar is persistent and intentionally coexists with overlays.
- **Impact**: Visual confusion amplified by the other surface styling bugs. Not a logic error on desktop — the sidebar IS persistent. The real fix is the architectural merger (Issue 2.8 below).
- **Fix approach**: Resolve as a side effect of the sidebar tab merger (Issue 2.8). In the interim, add mutual exclusion in desktop mode if the overlays are kept.
- **Severity**: **P3 — Low**

### 2.6 Context/Info/Help Labels Are Unclear

- **Problem**: Users don't understand the distinction between "Context", "Info", and "Help" buttons.
- **Root cause**: The three surfaces have distinct technical roles but overlapping user-facing purposes. Context shows page-specific guidance; Info shows framework background; Help would show a legend. Button labels are abstract. The Context panel also links to Info topics (`sidebar.js:1181–1211`), blurring the boundary.
- **Impact**: Users can't predict what each button will show.
- **Fix approach**: Rename buttons to indicate purpose during the tab merger (Issue 2.8): "Context" → "Guidance", "Info" → "About", "Help" → keep as "Help" (merged into Guidance tab content). Remove or consolidate Info topic links from the Context panel. Add a one-line description below each panel title. Ultimately resolved by the tab merger.
- **Severity**: **P2 — Medium**
- *(Updated label from "Legend" to "Help" per typeset-clarify review — "Legend" is unclear without prior context)*

### 2.7 Context Panel Titles Not Updating Properly

- **Problem**: Panel title suffixes ("Questionnaire — Transparent", "Context — Transparent") sometimes fail to update, especially when navigating via sidebar links or when context is pinned.
- **Root cause**: Three compounding issues:
  1. `navigation.js:542–560` — `syncPanelTitles()` reads the `h2` from the rendered page section in the DOM. If questionnaire pages haven't rendered yet, `activePageSection` is `null` and `getHeadingText(null)` returns `''`.
  2. `sidebar.js:737–753` — When context is pinned, `resolveDisplayedRoute()` returns the pinned route. The context panel title shows the pinned page heading while the questionnaire panel title shows the active page heading — an inconsistency.
  3. `navigation.js:754` — `navigateToPage()` calls `syncPanelTitles()` redundantly since `store.actions.setActivePage()` already triggers the subscription which calls `syncPanelTitles()`. This causes double-rendering — the second call reads potentially stale DOM from the first render.
- **Impact**: Panel titles show stale or empty text after navigation.
- **Fix approach**: Fall back to the section definition title when the page section DOM isn't available. When pinned, indicate it in the title (e.g., "Context — Reliable (pinned)"). Remove the redundant `syncPanelTitles` call at line 754.
- **Severity**: **P2 — Medium**
- **Files**: `navigation.js:58–73, 542–560, 754`, `sidebar.js:737–753`
- *(Updated point 3 per harden review H-12: double-render is a correctness issue, not just cosmetic)*

### 2.8 Proposal: Merge All Surfaces into a Tabbed Sidebar

- **Problem**: Three separate surface mechanisms create complexity, bugs, and user confusion.
- **Current architecture**:
  - Context sidebar: Grid column in `.shell-layout`, collapses via `.is-context-collapsed` class
  - About/Info overlay: Fixed-position modal at z-index 40
  - Help overlay: Fixed-position modal at z-index 40 (currently broken)
- **Proposed architecture**: Single sidebar panel with three tabs:
  ```
  sidebarPanel: {
    isOpen: true,
    activeTab: 'guidance' | 'reference' | 'about'
  }
  ```
- **Tab structure** (updated per arrange-distill and critique reviews):

  | Tab | Purpose | Content |
  |-----|---------|---------|
  | Guidance | Page-specific help | Context guidance + criterion focus + anchor card + help legend (collapsible) |
  | Reference | Lookup material | Scoring rubric + answer sets + evidence requirements (moved from questionnaire panel) |
  | About | Framework background | Overview + scope + governance (from current Info/About surface) |

- **DOM structure**: Tab bar at the top of `#frameworkPanel`, each tab panel containing the content from one current surface.
- **Benefits**: Eliminates all overlay-related issues (z-index, backdrop, simultaneous surfaces), single show/hide toggle, simpler state management, consistent content location.
- **Cost**: Significant refactoring of `navigation.js` (~200 lines of surface management), adaptation of `about-panel.js` and `help-panel.js` to render inside tabs, responsive drawer mode tab handling.
- **Component specifications** (added per polish and critique reviews):
  - **Tab bar**: Underline style with animated indicator, active tab uses section accent color, icon + text labels (text hidden below 760px)
  - **Tab switching**: Crossfade content (150ms opacity transition), arrow keys between tabs, Tab into content
  - **Responsive**: Tab bar horizontal scroll with fade masks if tabs exceed available width
  - **Card de-nesting**: Strip card styling (borders, backgrounds, padding) from inner containers (`context-route-card`, `context-anchor-card`). Use spacing and typography alone for grouping within tab panels
  - **Transition strategy**: Use `transform: translateX()` for sidebar show/hide (grid-template-columns cannot be transitioned)
  - **Text review**: After DOM migration, audit all text in all three tab panels for references to old surface names and behaviors
- **Migration steps**:
  1. Fix the help panel bugs (Issue 2.1) first
  2. Add `sidebarPanel.activeTab` to store state
  3. Create tab bar component in sidebar rendering with underline indicator
  4. Move about-panel rendering into the "About" tab panel function
  5. Move help-panel rendering into the "Guidance" tab as a collapsible section
  6. Move reference drawers (Issue 4.3) into the "Reference" tab as flat scrollable sections (not accordions)
  7. Replace `syncShellSurfaces` with `syncSidebarPanel` (check for and cancel in-flight animations before manipulating tab state)
  8. Remove overlay surface CSS (`layout.css:324–391`) including `@keyframes` animations
  9. Update responsive behavior and keyboard shortcuts
  10. Audit text for references to old surface names
- **Severity**: **P2 — Medium** (architectural improvement, not a bug fix)
- *(Updated per arrange-distill (reduce to 3 tabs, card de-nesting), critique (tab structure, rename during Phase 8 not after), polish (tab specs, transition strategy), harden (animation race condition))*

### 2.9 Sidebar Show/Hide Toggle

- **Problem**: The context sidebar can only be toggled via the Context button in the header, which is itself broken (Issue 2.3). There is no toggle within or near the sidebar itself.
- **Root cause**: The `#toolbarContextToggle` button exists inside the questionnaire panel header (`trust-framework.html:70`) but is not prominently placed and has the same illegibility issue (Issue 2.3). The header Context button is the primary toggle and is illegible.
- **Fix approach**: As part of the sidebar tab merger, add a visible close/dismiss button in the sidebar panel header. Optionally add a collapse toggle on the panel edge.
- **Severity**: **P2 — Medium**

### 2.10 Draggable Sidebar Width

- **Problem**: The context sidebar width is fixed by CSS grid (`layout.css:229`): `minmax(20rem, 28rem)`. No resize mechanism exists.
- **Fix approach**: Add a draggable divider between the questionnaire panel and framework panel:
  - HTML: `<div class="shell-divider" role="separator">` between the two panels
  - CSS: Absolutely positioned on the left edge of the framework panel, 6px wide, `cursor: col-resize`
  - JS: Pointer events to update `--sidebar-width` CSS custom property on the shell root, clamped to **20rem–36rem** (updated from 16rem–40rem — at 16rem, context cards clip content; at 40rem, questionnaire panel becomes too narrow on 1280px screens)
  - Persistence: Store preferred width in `localStorage` (wrap in try-catch for private browsing fallback)
  - Responsive: Hidden when sidebar is in drawer mode (≤1160px)
  - Dynamic max: Adjust maximum width based on viewport width, ensuring questionnaire panel never drops below ~600px
- **Files**: `trust-framework.html` (add divider), `layout.css` (divider styles, keep 2-column grid), `navigation.js` (drag handler), `store.js` (optional width persistence)
- **Severity**: **P2 — Medium** (feature request)
- *(Updated per harden review: raise minimum to 20rem, reduce maximum to 36rem, add localStorage try-catch, add dynamic max-width)*

---

## 3. Navigation Consolidation

### 3.1 Duplicate Navigation Bars

- **Problem**: The header contains two navigation bars showing overlapping data:
  - **Completion strip** (`trust-framework.html:44`): 13 page cells (S0–S10C) with progress state, but `aria-hidden="true"` and `role="presentation"` — not clickable, not keyboard accessible, **completely invisible to assistive technology**.
  - **Quick jump nav** (`trust-framework.html:45`): 5 principle buttons (TR/RE/UC/SE/TC) that ARE clickable, plus Context/Info/Help toggles.
  Both display the same 5 principle codes with the same progress states.
- **Root cause**: Two separate rendering functions (`renderCompletionStrip()` at `sidebar.js:776–820` and `renderQuickJump()` at `sidebar.js:822–893`) produce overlapping navigation.
- **Impact**: Wasted horizontal space, visual clutter, user confusion about which bar to use. The `aria-hidden` on every strip cell is an a11y gap — screen reader users receive zero per-section progress information.
- **Fix approach**: Consolidate into one bar:
  1. Make completion strip cells clickable `<button>` elements (currently `<li>`).
  2. Add click handlers and `aria-label` to each cell.
  3. Remove the 5 principle buttons from quick jump (keep Context/Info/Help toggles).
  4. Remove the `nav-indicator` sliding underline. Replace with a CSS transition on the active cell's background or border for section-change animation.
  5. Move Context/Info/Help toggles to the right end of the completion strip bar, with a visual separator from section cells.
  6. Define explicit column sizing for the header grid (`layout.css:24–28`) — `grid-template-columns: auto minmax(0, 1fr) auto` with the consolidated strip in the middle column.
  7. Ensure touch targets are at least 44px tall when cells become interactive (currently 28px).
- **Severity**: **P1 — High** (upgraded from P2 — `aria-hidden` on all cells makes the progress strip completely inaccessible)
- **Files**: `trust-framework.html:44–49`, `sidebar.js:776–893`, `components.css:4–85`, `interaction-states.css:6–29, 53–81, 1254–1357`, `layout.css:24–28, 77–84`, `sections.js:518–520`
- *(Upgraded per audit review 1.1, header grid per arrange review 1.2.5, touch targets per audit review 3.2)*

### 3.2 Section Coloring Applied Globally Instead of Per-Section

- **Problem**: In the completion strip and page-index sidebar, ALL cells/buttons use the CURRENTLY VIEWED section's color. When viewing "Transparent" (TR, blue), all cells are blue. Each cell should retain its own section color (TR=blue, RE=green, UC=purple, SE=orange, TC=teal).
- **Root cause**: A `:where()` block in `accent-scoping.css:113–136` overrides `--section-accent`, `--section-tint`, etc. on ALL matching elements to equal the body's active section values. This includes `.strip-cell`, `.page-index-button`, and `.nav-button[data-page-id]`. While `data-accent-key` is set correctly on each element by `sidebar.js:804` and `sidebar.js:955`, there are no CSS rules that use `data-accent-key` to resolve per-element colors — the `:where()` override wipes them out.
- **Impact**: Navigation elements have no individual color identity. Users lose a key visual cue for distinguishing sections.
- **Fix approach** (updated — uses `[data-accent-key]` approach per colorize-normalize review):
  1. Define a general `[data-accent-key='X']` override block that maps each key to its section token family. This covers all current and future elements:
     ```css
     [data-accent-key='tr'] {
       --section-accent: var(--section-tr-accent);
       --section-accent-strong: var(--section-tr-accent-strong);
       --section-tint: var(--section-tr-tint);
       --section-border: var(--section-tr-border);
       --section-on-accent: var(--section-tr-on-accent);
     }
     /* Repeat for re, uc, se, tc, control, profile, setup, reference, recommendation, governance */
     ```
  2. Restrict the `:where()` block to only elements that should follow the active section (`.form-section[data-section]`, `.doc-section[data-section]`, `.criterion-card`).
  3. Add fallback for `--section-on-accent`: always use `var(--section-on-accent, var(--ut-white))` to prevent silent failures when the token is unresolvable.
  4. After the change, run `npm run test:e2e` and do a manual visual regression check across all 13 pages in all 5 workflow modes.
  This preserves all `var(--section-accent)` consumption in `interaction-states.css` without JS changes, and prevents the bug from recurring when new elements are added.
- **Severity**: **P1 — High**
- **Files**: `accent-scoping.css:113–136` (primary change), no JS changes needed
- *(Updated fix approach per colorize-normalize review — [data-accent-key] approach is more scalable than per-element rules; added testing strategy and fallback concern)*

---

## 4. Reference Drawers

### 4.1 Accordion Header Styling Broken

- **Problem**: The summary header text runs together: "REF-AStandard answer setsPAGE LINK". The code badge, title, and status badge lack visual separation.
- **Root cause**: Three CSS deficiencies:
  1. `components.css:1452–1456` — `.reference-drawer-code` has `color`, `font-family`, `font-size` but NO padding, border, or background. The code ("REF-A") is tiny muted text visually indistinguishable from the title.
  2. `components.css:1458–1460` — `.reference-drawer-title` has only `line-height`. No color override, no font-weight distinction, no visual separator from the code. The title is only **12px** (`--text-sm`) — the same size as a field label — and inherits `text-transform: uppercase` from the parent, making it visually identical to the code badge.
  3. `components.css:1413–1427` — The two-column grid separating main (code+title) from actions (status+pin) has a 10px gap but no border, background contrast, or divider. On mobile (`1617–1619`), the grid collapses to single column with no spacing.
- **Impact**: All three drawer headers appear as a jumble of undifferentiated text.
- **Fix approach** (CSS only, updated per typeset review):
  1. Style `.reference-drawer-code` as a badge — add `padding: 2px 6px`, `border`, `background`, `border-radius`, matching the `.reference-drawer-status` treatment.
  2. Give `.reference-drawer-title` explicit `font-size: var(--text-body)` (1rem, up from 12px), `font-weight: 700`, `color: var(--ut-navy)`, and `text-transform: none` (to contrast with the uppercase code badge).
  3. Add a visual separator between main and actions — `border-left` on `.reference-drawer-summary-actions` or a subtle background difference.
  4. Add `margin-top` between main and actions in the mobile single-column layout.
  5. Add `:focus-visible` state with background change to match the existing `:hover` style (`interaction-states.css:919`).
- **Severity**: **P2 — Medium**
- **Files**: `components.css:1413–1460, 1617–1619`, `interaction-states.css:910, 919`
- *(Updated per typeset review T4 — drawer title is 12px and uppercase; per polish review P-04 — missing focus-visible state)*

### 4.2 PIN Buttons Serve No Useful Purpose

- **Problem**: PIN buttons in the accordion headers appear to just expand the drawers. Their purpose is unclear.
- **Root cause**:
  1. The first drawer ("answer-sets") defaults to open (`store.js:128`), so PIN on it does nothing visible.
  2. For closed drawers, clicking PIN opens them — identical to clicking the `<summary>` to expand.
  3. Pin state is stored in a local `Set` (`reference-drawers.js:255–279`) — not persisted, resets on reload.
  4. Pinned drawers are forced open on every `sync()` cycle (lines 196–199), conflicting with native `<details>` toggle behavior.
  5. No tooltip, icon, or affordance explains what "pinning" means.
- **Impact**: Confusing UI element that adds complexity without value.
- **Fix approach**: **Remove PIN entirely.** The pin feature adds complexity with minimal value: state is not persisted, the sidebar already has buttons to open drawers, and the forced-open behavior conflicts with native `<details>` UX. Removing it simplifies the accordion headers and removes the status/pin button area (which also addresses part of Issue 4.1).
- **Severity**: **P3 — Low**

### 4.3 Reference Drawers in Wrong Panel

- **Problem**: The reference drawers (scoring rubrics, answer sets, evidence requirements) occupy prime vertical space at the top of the questionnaire panel, above the actual form. Users must scroll past all reference material to reach the questionnaire.
- **Root cause**: `#referenceDrawerMount` is inside the questionnaire panel (`trust-framework.html:75–76`), between the panel header and the `workspace-layout` grid. The drawers are static reference material occupying the most valuable screen real estate.
- **Impact**: Every page is affected — reference drawers always appear above the form. On mobile (<1160px), the problem is amplified: the workspace-layout collapses to single column, but drawers still appear between the panel header and the page index, forcing users to scroll past 200+ lines of reference material.
- **Fix approach**: Move `#referenceDrawerMount` to the sidebar as the primary content of the "Reference" tab (see Issue 2.8). The sidebar already has infrastructure for reference drawer link buttons (`sidebar.js:1144–1175`). After the move, these buttons should scroll-to or auto-expand content in the same panel.
  - Move `<section id="referenceDrawerMount">` and its children from `trust-framework.html:75–270` into the framework panel's Reference tab.
  - Remove the "Quick Reference" heading from the questionnaire panel.
  - Render as flat scrollable sections (not accordions) — the accordion wrapper styling is broken (Issue 4.1) and PIN is being removed (Issue 4.2), so removing the accordion wrapper entirely is simpler and more readable.
  - Connect sidebar buttons to drawer open/scroll in the same panel.
  - Address the `max-width: 560px` constraint on `.framework-panel .panel-inner` (`layout.css:262`) — either increase to `min(100%, 680px)` or accept single-column drawer content. Tables in the scoring model and evidence requirements grids need horizontal space.
  - On mobile, default reference drawers to closed/collapsed.
- **Severity**: **P1 — High**
- **Files**: `trust-framework.html:75–76, 270`, `reference-drawers.js:151`, `sidebar.js:1144–1175`, `navigation.js:863–869`, `layout.css:262`
- *(Updated per audit review 3.1 — mobile impact; arrange review 1.2.2 — sidebar width constraint; critique review Amendment 5 — flat sections not accordions)*

---

## 5. Form Field Styling

### 5.1 Evidence Controls Bypass Mock-Control System

- **Problem**: Evidence block form controls (selects, textareas, file inputs) are raw HTML elements with minimal styling, while all other form fields use styled shells (`.mock-control`, `.textarea-mock`) from `dom-factories.js`.
- **Root cause**: `evidence.js` creates controls directly:
  - `createEvidenceSelect()` (line 246) — bare `<select class="evidence-select">`, no wrapper, no arrow indicator
  - `createEvidenceTextarea()` (line 334) — bare `<textarea class="evidence-textarea">`, no wrapper
  - `createEvidenceFileInput()` (line 348) — bare `<input type="file" class="evidence-file-input">`, browser default styling
  - `createReusableEvidenceSelect()` (line 286) — another bare `<select>`
  
  Compare with the main questionnaire fields which use `createSelectControl()` (dom-factories.js:429), `createTextareaControl()` (dom-factories.js:503), and `createInputControl()` (dom-factories.js:382) — all wrapped in styled shells.
- **Impact**: Evidence controls look unstyled and inconsistent with the rest of the form. Browser-default appearance for file inputs and select dropdowns. Note: evidence controls DO have `aria-label` attributes (`evidence.js:254,295,343,358`), so the a11y situation is better than the visual styling suggests.
- **Fix approach**: Refactor `evidence.js` to use the factory functions from `dom-factories.js`:
  1. Evidence selects → wrap with `createSelectControl()` for grey background, border, arrow indicator
  2. Evidence textarea → wrap with `createTextareaControl()` for consistent shell and placeholder treatment
  3. File input → hide raw input, create styled button that triggers `fileControl.click()`
  4. Update/remove `components.css:663–684` evidence-specific styles in favor of factory wrappers
  5. Add a visual loading/progress state for async file operations — currently only text change ("Reading file(s)…") with disabled opacity
- **Severity**: **P2 — Medium**
- **Files**: `evidence.js:246–360`, `components.css:663–684`, `dom-factories.js:382–503`
- *(Updated per audit review 5.3 — aria-labels present; polish review P-06 — no loading state)*

---

## 6. Verbose Text Cleanup

### 6.1 Complete Inventory of Verbose Text Instances

All instances that should be removed, shortened, or moved to tooltips:

| ID | Location | Current text | Action | Severity |
|----|----------|-------------|--------|----------|
| A | `evidence.js:89–92` | Evidence block description paragraph ("Capture evaluation-level screenshots, exports, and supporting files. Files stay frontend-only and are included in the exported manifest.") | **REMOVE** | P2 |
| B | `evidence.js:94–109` | Per-principle evidence empty state hints (5 verbose variants like "No evidence attached. Attach source documentation, screenshots, or methodology disclosures.") + evaluation-level and criterion-level fallback text | **SIMPLIFY** to "No evidence attached. Attach {principle-specific noun}." (e.g., "Attach source documentation" for TR, "Attach verification records" for RE) | P2 |
| C | `questionnaire-pages.js:40–41` | `"Optional section-level note for observations not captured elsewhere. This does not satisfy required summary, blocker, or rationale fields."` | **SHORTEN** to "Free-form note for observations that don't fit elsewhere. Does not satisfy any required field." | P2 |
| D | `questionnaire-pages.js:42–43` | `"Skipping a section overrides all child field requirements. Both a skip reason and rationale are required."` | **SHORTEN** to "Skip this section to mark it as not applicable. All fields inside become optional. A reason and rationale are required." | P2 |
| E | `questionnaire-pages.js:44–45` | `"Use criterion skip only when the criterion cannot be assessed — not as a substitute for a low score. Both a skip reason and rationale are required. Child fields become non-required while the skip is active."` | **SHORTEN** to "Skip only when the criterion cannot be assessed (e.g., insufficient data or tool unavailable). Score normally if you can evaluate it. Reason and rationale required. All child fields become optional." | P2 |
| F | `trust-framework.html:73` | Questionnaire panel caption: `"Fill out each section using the page index or pager. Reference drawers below provide scoring and evidence guidance. Framework background is in Info."` | **SHORTEN** to "Navigate pages using the pager below or the sidebar index." | P2 |
| G | `trust-framework.html:293` | Context panel caption: `"Page-specific guidance and reference links appear here. Scoring references are in the drawers above. Framework background and governance details are in the Info surface."` | **SHORTEN** to "Guidance for the current page appears here. Reference drawers provide scoring and evidence rules." | P2 |
| H | `trust-framework.html:296–299` | Context sidebar fallback: `"Context guidance loads automatically when a page is selected. If a section has specific guidance, it appears here; otherwise a summary is generated from the section definition."` | **SHORTEN** to "Select a page to see context guidance." | P2 |
| I | `sidebar.js:34–107` | `PAGE_FALLBACK_COPY` — verbose per-section summaries and bullets for all non-principle sections (S0–S10A) | **TRIM** summaries to be more concise | P3 |
| J | `sidebar.js:484` | Summary companion text: `"Use the section-level summary fields to translate criterion evidence into a page-level judgment and handoff-ready rationale."` | **REMOVE** or shorten to "Translate criterion scores into a section judgment." | P3 |
| K | `sidebar.js:521–522` | Fallback default: `"This page currently uses registry-driven guidance rather than a dedicated literal context block in the shell."` | **REMOVE** (developer-facing message that should never appear in production) | P2 |
| L | `help-panel.js:19–33` | `PAGE_HELP_SUMMARIES` — 13 page-specific help summaries | **KEEP** (appropriate for Help panel) | — |
| M | `help-panel.js:372–378` | Five verbose usage notes | **KEEP** (appropriate for Help panel) but could be shorter | P3 |
| N | `sidebar.js:352–401` | Header progress summary: three-paragraph block ("Questionnaire progress / 5/23 applicable required fields satisfied / 3/13 active pages resolved…") | **REMOVE** — duplicates progress info from completion strip and page index. If aggregate needed, replace with compact badge. | P2 |
| O | `sidebar.js:1100–1127` | Route card info grid rows: Workflow, Status, Required — duplicate badges already visible in page index buttons | **REMOVE** rows 4–6, keep only Mode, Topic, Focus, and conditional Live page row | P2 |
| P | `sidebar.js:446–461` | Criterion companion "Field obligations" list — enumerates fields visible on the questionnaire page | **REMOVE** — the user is already looking at the form | P2 |
| Q | `sidebar.js:467–503` | Summary companion field enumeration — lists section-level fields with labels and required policies | **REMOVE** or reduce to single-line prompt ("Section-level summary fields are below") | P2 |
| R | `reference-drawers.js:133–140` | Drawer subtitle paragraphs (e.g., "Reusable answer vocabularies, confidence levels, and critical-fail flag references.") — repeat info in the title | **REMOVE** | P2 |
| S | `trust-framework.html:70` | `#toolbarContextToggle` — duplicate Context toggle in questionnaire panel header (same as header button, hidden on mobile) | **REMOVE** | P2 |

**Note on text removal and accessibility** (per harden review H-11): Before removing descriptive text blocks, verify that `aria-label` or `aria-describedby` attributes on relevant elements provide equivalent information for screen reader users. Tooltips' `aria-describedby` helps for individual fields but doesn't replace panel-level guidance. Consider adding `aria-live` announcements for significant context changes.

*(Items C, D, E rewrites updated per typeset-clarify review C1, C2, G-C3 — preserve actionable guidance. Items F, G changed from REMOVE to SHORTEN per typeset-clarify G-C4 — keep brief orientation for first-time users. Item B updated per typeset-clarify C4 and critique — keep principle-specific hints. Items N–S added per arrange-distill review 2.3.1–2.3.7.)*

### 6.2 Section Subtitle — Fix and Keep

- **Problem**: The dynamic section subtitle appended to panel titles (e.g., "Questionnaire — Transparent") sometimes fails to update (see Issue 2.7), but the subtitle itself is valuable.
- **Root cause**: `ensurePanelTitleSuffix()` in `navigation.js:75–104` dynamically appends a `<span class="panel-title-section">` to `<h1 class="panel-title">`. The function has bugs but the feature is correct.
- **Why keep it** (per typeset, distill, and polish reviews):
  - The completion strip cells are `aria-hidden="true"` and `role="presentation"` — not accessible
  - The section kicker (`.section-kicker`) is `--text-sm` (12px) and positioned inside the scrollable content, not in the fixed panel header
  - The page index is in the left sidebar, which may be collapsed or out of viewport
  - The subtitle is the **only visible, accessible, header-level indicator** of which section the user is viewing
  - Removing it would leave the panel header feeling empty — just a bare `h1` with a thick bottom border and nothing below it
- **Fix approach**: Fix the bugs in `ensurePanelTitleSuffix()` (see Issue 2.7) rather than removing the function. When pinned, indicate it in the subtitle (e.g., "Context — Reliable (pinned)"). Optionally reduce `--ls-panel-title` from `0.12em` to `0.06–0.08em` for less aggressive tracking.
- **Severity**: **P2 — Medium** (fix bugs, don't remove)
- **Files**: `navigation.js:75–104, 542–560, 754`, `layout.css:166–171`, `tokens.css:309`
- *(Changed from "Remove" to "Fix and Keep" per typeset review G-T1, distill review 2.2, polish review P-07 — 3 reviews agree the subtitle should be kept)*

---

## 7. Tooltip System

### 7.1 No Tooltip Mechanism Exists

- **Problem**: The application has no tooltip or contextual help mechanism. The only help system is `.field-help` divs that are always visible and take up space. Only 4 fields currently have `notes` (all developer-facing rationales, not user help).
- **Root cause**: No tooltip component has been implemented. The `notes` property in the field schema was intended for developer documentation, not user-facing help.
- **Impact**: Users have no way to discover what ambiguous fields mean without consulting external documentation.
- **Severity**: **P2 — Medium**

### 7.2 Fields Requiring Tooltip Text (20+)

| Field ID | Label | Suggested tooltip |
|----------|-------|-------------------|
| `s1.inScopeCheck` | In-scope check | "Whether the tool falls within the TRUST framework's definition of an AI-based search tool for academic use." |
| `s1.deploymentType` | Deployment type | "How the tool is delivered: cloud SaaS, on-premises, hybrid, browser extension, or API-only." |
| `s1.accessModel` | Access model | "How users gain access: free, freemium, paid subscription, institutional licence, or API key." |
| `s1.accountRequired` | Account required | "Whether a user account is mandatory, not required, or optional for basic access." |
| `s1.scopeRationale` | Scope rationale | "Explain why the tool is in scope, partially in scope, or out of scope." |
| `s2.handsOnAccessConfirmed` | Hands-on access confirmed | "Confirm that you were able to test the tool hands-on, not just review documentation." |
| `s2.repeatedQueryTestPerformed` | Repeated query test performed | "Whether at least one query was run multiple times to check output consistency." |
| `s2.benchmarkComparisonPerformed` | Benchmark comparison performed | "Whether the tool was compared against a known baseline or competing tool." |
| `s2.sensitiveDataEntered` | Sensitive data entered | "Whether personally identifiable, institutional, or research-sensitive data was entered during testing." |
| `s8.completionChecklist` | Completion checklist | "Automatically tracked checklist items. Complete the relevant sections to satisfy each item." |
| `s8.overallReviewConfidence` | Overall review confidence | "How well-supported the evaluation is by evidence — not how good the tool is." |
| `s9.publicFacingSummaryDraft` | Public-facing summary draft | "Draft text summarizing the evaluation outcome for a public or institutional audience." |
| `s10b.agreementWithPrimaryEvaluation` | Agreement with primary evaluation | "Whether the second reviewer agrees, partially agrees, or disagrees with the primary evaluation." |
| `s10b.criteriaToRevisit` | Criteria to revisit | "Criterion codes that the second reviewer believes need re-examination." |
| `s10c.finalStatusRationale` | Final status rationale | "Explain the conditions, deferrals, escalations, or rejection reasons behind the final status." |
| `s10c.reviewCycleFrequency` | Review cycle frequency | "How often the tool should be re-evaluated based on risk, update cadence, and access conditions." |
| 16 criterion score fields | `{CODE} Score` | "0 = Fails, 1 = Partial/unclear, 2 = Meets baseline, 3 = Strong" |
| 5 principle judgment fields | `{PRINCIPLE} Principle judgment` | "Derived from criterion scores. Override is downward-only (Pass → Conditional → Fail)." |

### 7.3 Recommended Implementation

1. **Add tooltip component to `dom-factories.js`**: A `?` icon button placed inline after the field label. On hover/focus, show a small popover with tooltip text. Use `aria-describedby` for accessibility. Use `title` attribute as a no-JS fallback.

   **Component specifications** (added per polish and audit reviews):
   - Minimum touch target: 44×44px
   - Max-width: 18rem (or 40ch) with `overflow-wrap: break-word`
   - Position: below label by default, auto-flip with collision detection for viewport edges
   - Z-index: 50 (between panels z-25 and surfaces z-40)
   - Trigger: both hover (300ms delay) and focus
   - Transition: fade-in 100ms, fade-out 75ms; no animation when `prefers-reduced-motion`
   - Close: Escape key, click outside, blur
   - Accessibility: `role="tooltip"` on tooltip element, `aria-describedby` linkage, Tab should not trap in tooltip

2. **Add `tooltip` property to field schema** (`questionnaire-schema.js`): Alongside `notes`, add a `tooltip` parameter with user-facing contextual help. Fields without `tooltip` simply don't get the `?` icon.

3. **Wire into field rendering** (`questionnaire-pages.js`): In `buildFieldModel()`, include tooltip text. In `createFieldGroupElement()`, render the `?` icon if tooltip exists, placed in the `.field-label` row after the tag.

4. **Alternative approach**: Repurpose the existing `.field-help` div as collapsible/tooltip — show a `?` icon, clicking it reveals the help text inline. Less new infrastructure needed.

*(Specifications added per polish review P-08 and audit review 7.2. Consider consolidating the implementation into a single coherent feature rather than 4 separate issues — per critique review Amendment 6.)*

---

## 8. Section Access & Workflow

### 8.1 Sections Locked Unnecessarily in Default Mode

- **Problem**: When the form first loads, only S0 (Workflow Control) and S1 (Tool Profile) are accessible. Sections S2–S10A (all review sections including the 5 principles) are system-skipped and locked. The user sees only 2 pages out of 13 until they explicitly set `submissionType = primary_evaluation`.
- **Root cause**: `getWorkflowMode()` in `derive/helpers.js:666–667` defaults to `WORKFLOW_MODES.NOMINATION` when no submission type is selected. Nomination mode only allows S0 and S1 — all other sections are in `systemSkippedSectionIds` (`rules.js:136–179`).
- **Impact**: Poor first-run experience. Users cannot explore the questionnaire without first selecting a workflow mode.
- **Fix approach**: Change the default workflow mode from `NOMINATION` to `PRIMARY_EVALUATION` in `getWorkflowMode()`. This makes all review sections (S2–S10A) immediately accessible on first load. Governance sections (S10B, S10C) remain locked until the appropriate workflow stage — this already works correctly in primary_evaluation mode.
- **Note**: After this change, all 13 completion strip cells will be visible. Test the strip at common viewport widths (1280, 1366, 1440, 1920px) to ensure no overflow.
- **Severity**: **P0 — Critical** (blocks user from accessing 11 of 13 pages by default)
- **Files**: `derive/helpers.js:666–667` (1-line fix)
- *(Added completion strip overflow note per harden review H-02)*

### 8.2 Governance Sections Correctly Locked

- **Status**: S10B (Second Review) and S10C (Final Team Decision) are locked in primary_evaluation mode. This is intentional and correct — these governance sections should only be accessible during second review and final decision workflow stages.
- **No fix needed.**

### 8.3 Context Bar Update Bugs

Four related bugs in the context sidebar update lifecycle:

**Error resilience note** (per harden review H-06): Wrap each render call in `sync()` with try-catch. Log errors to console but continue rendering remaining sections. Add a fallback "unable to render" message for failed sections.

#### 8.3.1 Flash of Wrong Context on Anchor Click

- **Problem**: Clicking an anchor in the context sidebar causes a one-frame flash where the context shows the wrong state.
- **Root cause**: In `navigateToSubAnchor()` (`navigation.js:758–779`), the page change triggers `sync()` which renders the sidebar with no active sub-anchor. The sub-anchor is set on the next line, triggering a second `sync()` and re-render.
- **Fix approach**: Batch `activePageId` and `activeSubAnchorId` into a single store commit. The store currently has no batch/transaction API (`store.js:555–566` — `commit()` takes a single updater). Options:
  1. Add `store.actions.setActivePageWithAnchor(pageId, anchorId)` as a combined action that sets both `ui.activePageId` and `ui.activeSubAnchorId` in one `createUiState()` call
  2. This avoids the need for a full batch/transaction API
- **Severity**: **P2 — Medium**
- **Files**: `navigation.js:758–779`, `sidebar.js:1255–1264`, `store.js:555–566`
- *(Updated per harden review H-03 — store architecture change required, specifies combined action approach. Per polish review P-03 — page transition JS uses `setTimeout(150)` while CSS uses `var(--duration-fast)`; these must stay in sync.)*

#### 8.3.2 Stale Anchor Map Rebuilt Every Sync

- **Problem**: `refreshPageAnchors()` is called on every state change even when the DOM hasn't changed.
- **Root cause**: `sidebar.js:1256` calls it unconditionally in `sync()`.
- **Fix approach**: Only call `refreshPageAnchors()` when the questionnaire DOM has actually changed. The `MutationObserver` in `navigation.js:1054–1068` already detects this — `refreshPageAnchors` could be called from there instead.
- **Severity**: **P2 — Medium**
- **Files**: `sidebar.js:1256`

#### 8.3.3 Pinned Anchor Clicks Fail Silently

- **Problem**: When context is pinned and the user clicks an anchor that belongs to the pinned page while viewing a different page, the scroll target element is on a hidden page. The click fails silently.
- **Root cause**: `sidebar.js:1320–1326` doesn't guard against pinned anchors targeting hidden pages.
- **Fix approach**: When pinned and the anchor's page differs from the live active page, either navigate to that page and unpin, or show a message indicating the target is not visible.
- **Severity**: **P3 — Low**
- **Files**: `sidebar.js:1320–1326`

#### 8.3.4 Hash Navigation Race Condition

- **Problem**: Browser back/forward or programmatic `location.hash` changes can cause double-navigation if the hash change fires between a click and the store update.
- **Root cause**: `context-tracking.js:75–86` `hashchange` handler doesn't check if the target page is already active before calling `navigateToPage()`.
- **Fix approach**: Compare the resolved page ID against `state.ui.activePageId` before navigating.
- **Severity**: **P3 — Low**
- **Files**: `context-tracking.js:75–86`

---

## 9. Missing Features & Additional Issues

### 9.1 Reviewer Information Fields

- **Problem**: The questionnaire has no fields for the reviewer's name, email, or affiliation at the top level. The only person-identification fields are `s10a.primaryEvaluator` (page 10 of 13) and `s10b.secondReviewer` (page 11) — too late in the workflow for a reviewer to identify themselves.
- **Current S0 fields**: `submissionType`, `toolName`, `toolUrl`, `existingEvaluationId`, `responderRole`, `nominationReason`
- **Missing fields needed**:
  - `s0.reviewerName` — `SHORT_TEXT` or `PERSON` type
  - `s0.reviewerEmail` — `SHORT_TEXT` type (with email validation)
  - `s0.reviewerAffiliation` — `SHORT_TEXT` (optional)
  - `s0.reviewDate` — `DATE` (date the review is being conducted)
- **Fix approach**: Add field definitions to `questionnaire-schema.js` in `FIELD_IDS.S0` and `S0_FIELDS`, update assertion counts. Add to `PAGE_LAYOUTS.S0` in `questionnaire-pages.js`. No rule changes needed. No store changes needed (field normalization handles new types).
- **Severity**: **P1 — High**
- **Files**: `questionnaire-schema.js` (add field definitions), `questionnaire-pages.js` (add to page layout)

### 9.2 No aria-live Region for Sidebar Context Changes

- **Problem**: When the user navigates to a new page, the context sidebar content is fully replaced. Screen reader users receive no announcement that context has changed.
- **Root cause**: `sidebar.js:1222–1253` (renderContextContent) — the `.context-route-card`, `.context-anchor-card`, and generated content areas lack `aria-live` attributes.
- **Impact**: WCAG 4.1.3 Status Messages failure. Screen reader users don't know context has updated.
- **Fix approach**: Add `aria-live="polite"` to the context sidebar shell or route card. Ensure the live region is populated after rendering, not cleared before it (the current `clearChildren` pattern would announce "empty" before new content).
- **Severity**: **P1 — High**
- **Files**: `sidebar.js:328–341`
- *(Found by audit review 1.2)*

### 9.3 Form Validation States Not Exposed to Screen Readers

- **Problem**: Field validation state is tracked via `data-field-validation-state` dataset attributes and styled via CSS, but there are no `aria-invalid` attributes on actual form controls and no `.validation-message` elements rendered (CSS for them exists at `interaction-states.css:1174–1184` but the DOM factory never creates them).
- **Root cause**: `questionnaire-pages.js:1115–1126` sets dataset attributes but not ARIA attributes.
- **Impact**: WCAG 3.3.1 Error Identification and 4.1.2 Name Role Value failures. Screen reader users cannot detect validation errors.
- **Fix approach**: When `fieldState.validationState` is `'invalid'` or `'blocked'`, set `aria-invalid="true"` on the control element. Render the `.validation-message` element with `role="alert"` containing the issue text.
- **Severity**: **P1 — High**
- **Files**: `questionnaire-pages.js:967–1095`, `interaction-states.css:1174–1184`
- *(Found by audit review 1.3)*

### 9.4 Full Quick-Jump DOM Teardown on Every State Change

- **Problem**: Every call to `sync()` → `renderQuickJump()` destroys all quick-jump children (including the Context/Info/Help action buttons, which are saved and re-appended) and recreates 5+ nav buttons from scratch. This is called on every store change including field value updates.
- **Root cause**: `sidebar.js:830` (`clearChildren(quickJumpMount)`) — destroy-recreate cycle instead of DOM diffing or selective updates.
- **Impact**: Layout thrashing in the header on every keystroke in any form field.
- **Fix approach**: Cache button references and update `dataset`/`classList`/`disabled` properties in-place rather than rebuilding. Only rebuild when `pageOrder` or `activePageId` changes.
- **Severity**: **P1 — High**
- **Files**: `sidebar.js:822–893`
- *(Found by audit review 2.1)*

### 9.5 MutationObserver Triggers Full Application Sync

- **Problem**: The MutationObserver on `questionnaireRenderRoot` calls `refreshPageSections()` AND `syncFromState(store.getState())` on every childList mutation. `syncFromState` re-renders the entire sidebar, pager, reference drawers, about panel, help panel, page visibility, and panel titles.
- **Root cause**: `navigation.js:1056–1063` — the `observerPending` flag exists but the `requestAnimationFrame` still triggers the full sync. During initial page load, this may fire dozens of times as questionnaire pages are added.
- **Impact**: Compounding performance problem with Issue 9.4 — sidebar DOM is rebuilt on every questionnaire DOM mutation.
- **Fix approach**: Debounce the observer callback. Only sync what changed — typically just `refreshPageSections` and `syncPageVisibility`.
- **Severity**: **P1 — High**
- **Files**: `navigation.js:1056–1063`
- *(Found by audit review 2.2)*

### 9.6 Context Drawer Backdrop Has No Keyboard Dismiss

- **Problem**: The context drawer backdrop (`data-surface-dismiss="contextSidebar"` at `trust-framework.html:59`) is a `<div>` with no click listener. Only the explicit Close button works for dismissal. Escape handles it at the document level, but clicking the backdrop does nothing.
- **Root cause**: No click handler on the backdrop element.
- **Fix approach**: Add a click listener on the backdrop that calls the context sidebar close action.
- **Severity**: **P2 — Medium**
- **Files**: `trust-framework.html:59`, `navigation.js`
- *(Found by audit review 1.5)*

### 9.7 `--text-xs` (10px) Below Readability Minimum

- **Problem**: `tokens.css:290` defines `--text-xs: 0.625rem` (10px at default zoom). This is well below the practical minimum of ~11px for legible text. It is consumed by 10+ elements carrying essential identity information: strip-cell page codes, reference drawer codes, completion badges, page-index codes/states, context route codes, evidence labels, and route grid terms.
- **Impact**: Users with vision impairments or high-DPI scaling will struggle to read essential metadata. At 10px, even high-contrast text fails readability standards.
- **Fix approach**: Raise `--text-xs` to `0.6875rem` (11px) minimum, or `0.75rem` (12px) for better readability. Audit all consumers and ensure foreground contrast meets WCAG AA at the new size.
- **Severity**: **P1 — High**
- **Files**: `tokens.css:290`, all consumers of `--text-xs` in `components.css`
- *(Found by typeset review T1)*

### 9.8 Panel Title Letter-Spacing Excessive

- **Problem**: `--ls-panel-title: 0.12em` (`tokens.css:309`) combined with `text-transform: uppercase`, `font-weight: 700`, and `font-size: var(--text-display)` (2.25rem) creates excessively widely-spaced headings that read as shouted rather than structured.
- **Fix approach**: Reduce `--ls-panel-title` to `0.06em–0.08em`. The heading is already uppercase and bold at a large size — it doesn't need 0.12em tracking to stand out.
- **Severity**: **P3 — Low**
- **Files**: `tokens.css:309`
- *(Found by typeset review T3)*

### 9.9 Redundant Section-Code Prefixes on Field Labels

- **Problem**: Section-level fields include the principle code in their labels (e.g., "RE Test method description" when already on the Reliability page). `getFieldDisplayLabel()` strips criterion code prefixes but not section prefixes.
- **Root cause**: `questionnaire-schema.js` labels include prefixes; `questionnaire-pages.js:563–573` only strips criterion codes.
- **Impact**: Redundant visual noise on every section page.
- **Fix approach**: Either strip prefixes in `getFieldDisplayLabel()` or remove them from the schema labels.
- **Severity**: **P2 — Medium**
- **Files**: `questionnaire-schema.js` (labels), `questionnaire-pages.js:563–573`
- *(Found by clarify review C3)*

### 9.10 Developer-Facing Notes Shown as UI Help Text

- **Problem**: `se.complianceConfidence` has `notes: 'The HTML prototype used "assessment"; the canonical questionnaire uses "confidence".'` — pure developer documentation that appears in the UI via `getFieldHelpText()` (`questionnaire-pages.js:596–603`).
- **Impact**: Users see internal development notes.
- **Fix approach**: Either remove developer-facing notes from the `notes` field (move them to code comments), or add a separate `devNotes` property that `getFieldHelpText()` excludes.
- **Severity**: **P2 — Medium**
- **Files**: `questionnaire-schema.js:319`, `questionnaire-pages.js:596–603`
- *(Found by clarify review C4)*

### 9.11 Derived Field Placeholder Text Uses Developer Jargon

- **Problem**: Derived fields show "Derived from current state" (`questionnaire-pages.js:526–528`) and computed selects show "Computed value" (line 546). These are developer concepts.
- **Impact**: Users don't understand what "derived" means.
- **Fix approach**: Replace with "Auto-filled based on your responses" for derived fields and "Auto-calculated" for computed selects.
- **Severity**: **P2 — Medium**
- **Files**: `questionnaire-pages.js:526–528, 546`
- *(Found by clarify review C5)*

### 9.12 Dead `data-target` Color Rules in interaction-states.css

- **Problem**: `.nav-button.active[data-target='tr']` through `[data-target='tc']` rules at `interaction-states.css:58–81` and `.strip-cell.filled.tr` through `.tc` rules at lines 6–29 use raw principle tokens (Pattern A). These are always overridden by the later section-token rules at lines 1254–1264 and 1304–1357 (Pattern B) which have the same specificity but appear later in the file.
- **Impact**: Dead code that creates confusion about which color pattern applies.
- **Fix approach**: Remove the dead `data-target` rules at lines 58–81 and the raw-token strip rules at lines 6–29.
- **Severity**: **P3 — Low**
- **Files**: `interaction-states.css:6–29, 58–81`
- *(Found by colorize-normalize review 2.1)*

### 9.13 Reference Drawer Border Color Override

- **Problem**: `interaction-states.css:488` applies `border-left-color: var(--section-accent)` to all `.doc-section[data-section]`, which overrides the explicit `border-left-color: var(--ut-pink)` for scoring sections (`interaction-states.css:182`). The generic rule has the same specificity and appears later, so it wins.
- **Impact**: Reference drawers for scoring show the active principle's color instead of pink.
- **Fix approach**: Either raise specificity on per-section rules, or remove the generic `border-left-color` rule and rely solely on explicit per-section rules.
- **Severity**: **P2 — Medium**
- **Files**: `interaction-states.css:488, 182`
- *(Found by colorize-normalize review 2.2)*

### 9.14 SE/TC Button Contrast Fails WCAG AA for Normal Text

- **Problem**: `--se-dark` is `color-mix(in srgb, #ea580c 86%, black)` (~`#c24609`). White text on this background yields ~3.9:1 contrast — passes WCAG AA for large text (3:1) but fails for normal text (4.5:1). The button label is `text-sm` (0.75rem) — normal text size.
- **Impact**: WCAG 1.4.3 Contrast (Minimum) failure for SE and TC nav buttons.
- **Fix approach**: Either darken the `--se-dark` token further, or increase the font size of affected buttons to qualify as "large text" (18px or 14px bold).
- **Severity**: **P2 — Medium**
- **Files**: `tokens.css` (SE token), `interaction-states.css:73–81`
- *(Found by colorize-normalize review 1.2)*

---

## 10. Implementation Priority & Dependencies

### Phase 1: Critical Fixes (P0)

These are runtime errors, complete feature failures, or CSS parsing errors. No dependencies between them.

| # | Issue | Files | Effort |
|---|-------|-------|--------|
| 1 | Fix help panel: rename `PROGRESS_STATE_LABELS` → `createChip`, fix sync selector | `help-panel.js:41, 440` | Small |
| 2 | Fix `setShellSurfaceOpen` → `setOverlaySurfaceOpen` typo | `navigation.js:822` | Small |
| 3 | Change default workflow to `primary_evaluation` | `derive/helpers.js:666–667` | Small |
| 3b | Add missing `}` closing brace in `.pager-shell` | `components.css:1365` | Trivial |

### Phase 2: High-Priority Fixes (P1)

These block user flows, make core UI illegible, or represent significant a11y/performance gaps. Issue 3.2 should be done before 3.1.

| # | Issue | Dependencies | Files | Effort |
|---|-------|-------------|-------|--------|
| 4 | Fix section coloring (per-element accent via `[data-accent-key]`) | None | `accent-scoping.css:113–136` | Medium |
| 5 | Fix Context button illegibility (both header and toolbarContextToggle) | Issue 4 done first | `interaction-states.css:1017–1035`, `accent-scoping.css:113–136` | Small |
| 6 | Fix overlay covering header (backdrop click dismiss) | None | `navigation.js:615–656` | Small |
| 7 | Move reference drawers to sidebar (Reference tab) | Issue 4 done first | `trust-framework.html:75–270`, `reference-drawers.js`, `sidebar.js`, `layout.css:262` | Medium |
| 8 | Add reviewer info fields to S0 | None | `questionnaire-schema.js`, `questionnaire-pages.js` | Medium |
| 9 | Add `aria-live="polite"` to context sidebar shell | None | `sidebar.js:328–341` | Small |
| 10 | Set `aria-invalid` on controls with validation errors | None | `questionnaire-pages.js:967–1095` | Medium |
| 11 | Consolidate completion strip (make cells accessible) | Issue 4 (per-section colors) | `trust-framework.html:44–49`, `sidebar.js:776–893`, `components.css:4–43` | Medium |
| 12 | Raise `--text-xs` from 10px to 11px+ | None | `tokens.css:290`, consumers in `components.css` | Small |

### Phase 2.5: Performance Fixes (P1)

| # | Issue | Dependencies | Files | Effort |
|---|-------|-------------|-------|--------|
| 13 | Refactor renderQuickJump to update in-place (not destroy-recreate) | None | `sidebar.js:822–893` | Medium |
| 14 | Debounce MutationObserver — only sync what changed | None | `navigation.js:1056–1063` | Medium |

### Phase 3: Verbose Text Cleanup (P2, low-risk)

All text changes are independent and can be done in any order. Quick wins.

| # | Issue | Files | Effort |
|---|-------|-------|--------|
| 15 | Shorten panel captions (F, G) | `trust-framework.html:73, 293` | Small |
| 16 | Fix section subtitle bugs (don't remove) | `navigation.js:75–104, 542–560`, `tokens.css:309` | Small |
| 17 | Remove evidence block description (A) | `evidence.js:89–92, 464–468` | Small |
| 18 | Simplify evidence empty states (B) | `evidence.js:94–109` | Small |
| 19 | Shorten help text strings (C, D, E) | `questionnaire-pages.js:40–45` | Small |
| 20 | Clean up sidebar fallback text (H, J, K) | `sidebar.js:484, 521–522`, `trust-framework.html:296–299` | Small |
| 21 | Remove header progress summary block (N) | `sidebar.js:352–401` | Small |
| 22 | Remove route card redundant rows (O) | `sidebar.js:1100–1127` | Small |
| 23 | Remove criterion companion field enumeration (P) | `sidebar.js:446–461` | Small |
| 24 | Remove or reduce buildSummaryCompanion (Q) | `sidebar.js:467–503` | Small |
| 25 | Remove reference drawer subtitles (R) | `reference-drawers.js:133–140` | Small |
| 26 | Remove duplicate Context toggle (S) | `trust-framework.html:70` | Small |
| 27 | Fix developer-facing notes in UI (9.10) | `questionnaire-schema.js:319` | Small |
| 28 | Fix derived field placeholder jargon (9.11) | `questionnaire-pages.js:526–528, 546` | Small |
| 29 | Strip section-code prefixes from field labels (9.9) | `questionnaire-schema.js`, `questionnaire-pages.js:563–573` | Small |

### Phase 4: Form Styling (P2)

| # | Issue | Dependencies | Files | Effort |
|---|-------|-------------|-------|--------|
| 30 | Wrap evidence controls in mock-control shells | None | `evidence.js:246–360`, `components.css:663–684` | Medium |
| 31 | Fix reference drawer header styling (including title font-size and focus-visible) | None | `components.css:1413–1460, 1617–1619`, `interaction-states.css:910, 919` | Small |
| 32 | Remove PIN buttons from reference drawers | None | `reference-drawers.js:123–131, 196–199, 255–279` | Small |

### Phase 5: Navigation Consolidation (P2)

| # | Issue | Dependencies | Files | Effort |
|---|-------|-------------|-------|--------|
| 33 | Consolidate completion strip + quick jump into one bar (with header grid sizing) | Issue 4 (per-section colors), Issue 11 (accessible cells) | `trust-framework.html:44–49`, `sidebar.js:776–893`, `layout.css:24–28` | Medium |

### Phase 6: Context Bar Lifecycle Fixes (P2–P3)

| # | Issue | Dependencies | Files | Effort |
|---|-------|-------------|-------|--------|
| 34 | Add combined `setActivePageWithAnchor` action for sub-anchor batching | None | `navigation.js:758–779`, `sidebar.js:1255–1264`, `store.js` | Medium |
| 35 | Debounce `refreshPageAnchors()` to DOM mutations only | None | `sidebar.js:1256` | Small |
| 36 | Fix context panel title staleness | Issue 34 (batching) helps | `navigation.js:542–560` | Small |
| 37 | Fix reference drawer border color override | None | `interaction-states.css:488, 182` | Small |
| 38 | Fix SE/TC contrast failure | None | `tokens.css`, `interaction-states.css:73–81` | Small |
| 39 | Add context drawer backdrop keyboard dismiss | None | `trust-framework.html:59`, `navigation.js` | Small |
| 40 | Remove dead `data-target` color rules | None | `interaction-states.css:6–29, 58–81` | Small |

### Phase 7: Tooltip System (P2, new feature)

Consolidated into a single feature with a unified design specification (per critique review Amendment 6).

| # | Issue | Dependencies | Files | Effort |
|---|-------|-------------|-------|--------|
| 41 | Implement tooltip component (with a11y, positioning, touch targets, collision detection) | None | `dom-factories.js`, `components.css` | Medium |
| 42 | Add `tooltip` property to field schema and write 20+ tooltip texts | Issue 41 | `questionnaire-schema.js` | Medium |
| 43 | Wire tooltips into field rendering | Issues 41, 42 | `questionnaire-pages.js` | Medium |

### Phase 8a: Surface Bug Fixes (P2)

Fix existing surface bugs without restructuring. Decision gate before Phase 8b.

| # | Issue | Dependencies | Files | Effort |
|---|-------|-------------|-------|--------|
| 44 | Fix context panel title update bugs (2.7) | None | `navigation.js:58–73, 542–560, 754`, `sidebar.js:737–753` | Medium |
| 45 | Add error resilience to sidebar sync() | None | `sidebar.js:1255–1264` | Small |

### Phase 8b: Tabbed Sidebar Architecture (P2, large refactor)

Depends on Phase 1 + 2 + 8a being complete. This is the largest change and should be the last phase.

| # | Issue | Dependencies | Files | Effort |
|---|-------|-------------|-------|--------|
| 46 | Merge surfaces into tabbed sidebar (Guidance, Reference, About tabs) | Issues 1, 5, 6, 7, 44 | `navigation.js`, `sidebar.js`, `about-panel.js`, `help-panel.js`, `layout.css`, `components.css`, `store.js`, `trust-framework.html` | Large |
| 47 | Add draggable sidebar width (20rem–36rem) | Issue 46 (sidebar must be stable) | `trust-framework.html`, `layout.css`, `navigation.js` | Medium |

### Dependency Graph

```
Phase 1 (P0 fixes) ── independent, do first
    │
    ├── Phase 2 (P1 fixes)
    │       ├── 3.2 (per-section colors) ←── 3.1 (nav consolidation), 5 (context button)
    │       ├── 7 (move drawers) ←── 3.2
    │       ├── 11 (accessible strip) ←── 3.2
    │       └── 9, 10, 12 (a11y) ── independent
    │
    ├── Phase 2.5 (performance) ── independent
    ├── Phase 3 (text cleanup) ── independent
    ├── Phase 4 (form styling) ── independent
    ├── Phase 5 (nav consolidation) ── depends on 3.2, 11
    ├── Phase 6 (context lifecycle) ── independent
    ├── Phase 7 (tooltip system) ── independent
    │
    ├── Phase 8a (surface bug fixes) ── independent
    │
    └── Phase 8b (tabbed sidebar) ── depends on Phase 1 + 2 + 8a
            └── 47 (draggable width) ←── 46 (tabbed sidebar)
```

Phases 2.5, 3, 4, 6, and 7 are all independent and can be worked on in parallel after Phase 1. Phase 8b should come last because it requires the help panel to be functional, surface styling to be stable, and title bugs to be fixed. Phase 8a provides a decision gate — if 8b is deferred, the application is still functional with fixed surface bugs.
