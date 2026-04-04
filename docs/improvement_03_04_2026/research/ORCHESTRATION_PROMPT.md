# Orchestration Prompt: TRUST Questionnaire Improvements

## Mission

Implement all fixes described in the consolidated findings report by orchestrating parallel subagent waves. Each wave tackles one implementation phase. Quality gates run after every wave. No phase proceeds until the prior gate passes.

## The Plan

Read this file in full before starting. It contains every issue, root cause, fix approach, file path, line numbers, severity, and dependency:

```
docs/improvement_03_04_2026/research/CONSOLIDATED_FINDINGS_REPORT.md
```

Also read the project conventions:
```
CLAUDE.md
```

## Architecture Constraints

- **Pure vanilla JS/CSS/HTML** — no frameworks, no JSX, no build step, no bundler, no external runtime dependencies
- **ES modules** — plain JS with `import`/`export`
- **CSS custom properties** for all values — use tokens from `tokens.css`, never hardcode colors/spacing/typography
- **Immutable state** — store returns new objects on mutation; changes go through named actions
- **Event delegation** — input/change events caught at questionnaire root
- **CSS load order matters**: tokens.css → base.css → layout.css → components.css → interaction-states.css → print.css
- **Responsive breakpoint**: single breakpoint at 1160px (sidebar collapses to drawer). No other breakpoints.
- **No TypeScript**, no comments in code unless explicitly asked for

## Quality Gate Commands

Run these after every wave. All must pass before proceeding:

```bash
npm run validate:html        # HTML linting
npm run format:check          # Prettier check on JS/CSS
npm run test:unit             # Vitest unit tests
npm run test:e2e              # Playwright e2e (Chromium + Firefox)
```

If formatting fails, run `npm run format` then verify with `npm run format:check`.

If any test fails, the subagent that made changes in that wave must fix the failure before the wave is considered complete.

## Execution Waves

Execute strictly in order. Within each wave, issues marked "parallel" may be assigned to separate subagents simultaneously. Issues marked "sequential" must be done in the listed order within the wave.

---

### Wave 1: P0 Critical Fixes (4 issues, all parallel)

Assign each issue to a separate subagent. These are independent small fixes.

| ID | Issue | File | What to do |
|----|-------|------|------------|
| 1 | Help panel empty — rename function + fix sync selector | `static/js/render/help-panel.js:41, 440` | At line 41, rename `PROGRESS_STATE_LABELS` to `createChip`. At line 440, fix `sync()` to use `documentRef.getElementById('helpSurfaceMount')` instead of `querySelector('[data-surface="help"]')`. |
| 2 | Escape ReferenceError | `static/js/behavior/navigation.js:822` | Replace `setShellSurfaceOpen` with `setOverlaySurfaceOpen` at line 822. |
| 3 | Default workflow locks 11/13 pages | `static/js/state/derive/helpers.js:666–667` | Change default in `getWorkflowMode()` from `WORKFLOW_MODES.NOMINATION` to `WORKFLOW_MODES.PRIMARY_EVALUATION`. |
| 3b | Missing CSS closing brace | `static/css/components.css:1365` | Add `}` after the `box-shadow` line in `.pager-shell` block. The block is missing its closing brace, breaking `.pager-shell` and `.pager-button` parsing. |

**Gate 1**: Run all 4 quality gate commands. All must pass.

---

### Wave 2: P1 Fixes — Independent Issues (6 issues, all parallel)

These have no dependencies on each other. Assign each to a separate subagent.

| ID | Issue | Files | What to do |
|----|-------|-------|------------|
| 4 | Section coloring wiped globally | `static/css/accent-scoping.css:113–136` | **See Section 3.2 of the plan for full details.** Define `[data-accent-key='tr']` through `[data-accent-key='governance']` override blocks mapping to section token families. Remove `.strip-cell`, `.page-index-button`, `.nav-button[data-page-id]` from the `:where()` block. Restrict `:where()` to `.form-section[data-section]`, `.doc-section[data-section]`, `.criterion-card`. Add fallback: always use `var(--section-on-accent, var(--ut-white))`. After changes, visually verify across pages. |
| 6 | Overlay covers header | `static/js/behavior/navigation.js:615–656` | Add click listener on `.shell-surface` that calls `setOverlaySurfaceOpen(surfaceName, false)` when click target is the surface itself (not the card). |
| 8 | Missing reviewer info fields | `static/js/config/questionnaire-schema.js`, `static/js/render/questionnaire-pages.js` | Add to S0: `reviewerName` (SHORT_TEXT), `reviewerEmail` (SHORT_TEXT with email validation), `reviewerAffiliation` (SHORT_TEXT, optional), `reviewDate` (DATE). Add field definitions to `FIELD_IDS.S0` and `S0_FIELDS`, update assertion counts. Add to `PAGE_LAYOUTS.S0`. |
| 9 | No aria-live on sidebar | `static/js/render/sidebar.js:328–341` | Add `aria-live="polite"` to the context sidebar shell or route card container. Ensure live region is populated after rendering (not cleared before). |
| 10 | Validation not exposed to screen readers | `static/js/render/questionnaire-pages.js:967–1095` | When `fieldState.validationState` is `'invalid'` or `'blocked'`, set `aria-invalid="true"` on the control element. Render `.validation-message` with `role="alert"` containing the issue text. |
| 12 | `--text-xs` too small | `static/css/tokens.css:290` | Raise `--text-xs` from `0.625rem` (10px) to `0.6875rem` (11px). Verify consumers in `components.css` still look correct. |

**Gate 2**: Run all 4 quality gate commands. All must pass.

---

### Wave 3: P1 Fixes — Dependent Issues (3 issues, sequential)

Issue 5 depends on Issue 4 (from Wave 2). Issue 7 depends on Issue 4. Issue 11 depends on Issue 4. These must run AFTER Wave 2 and Gate 2 pass.

| ID | Issue | Files | What to do |
|----|-------|-------|------------|
| 5 | Context button illegible | `static/css/interaction-states.css:1017–1035`, `static/css/accent-scoping.css` | **Depends on Issue 4.** Add `.shell-action-button` to the remaining `:where()` entries (if not already covered), or define `--section-on-accent: var(--ut-white)` explicitly on `.shell-action-button[aria-expanded='true']`. Add unexpanded style for `data-surface-toggle='contextSidebar'`. Apply same fix to `#toolbarContextToggle`. |
| 7 | Move reference drawers to sidebar | `trust-framework.html:75–270`, `static/js/render/reference-drawers.js:151`, `static/js/render/sidebar.js:1144–1175`, `static/css/layout.css:262` | **Depends on Issue 4.** Move `<section id="referenceDrawerMount">` and children from questionnaire panel into the framework panel. Remove "Quick Reference" heading from questionnaire panel. Render as scrollable sections (not accordions). Connect sidebar buttons to scroll-to content in same panel. Address `max-width: 560px` on `.framework-panel .panel-inner` — increase to `min(100%, 680px)` or accept single-column layout. |
| 11 | Make completion strip accessible | `trust-framework.html:44–49`, `static/js/render/sidebar.js:776–893`, `static/css/components.css:4–43` | **Depends on Issue 4.** Change strip cells from `<li>` to `<button>` elements. Remove `aria-hidden="true"` and `role="presentation"`. Add click handlers and `aria-label` to each cell. Ensure touch targets are at least 44px tall. Remove the `nav-indicator` sliding underline; replace active indication with CSS transition on cell background/border. |

**Gate 3**: Run all 4 quality gate commands. All must pass.

---

### Wave 4: P1 Performance Fixes (2 issues, parallel)

| ID | Issue | Files | What to do |
|----|-------|-------|------------|
| 13 | Full DOM teardown on every sync | `static/js/render/sidebar.js:822–893` | Cache button references. Update `dataset`/`classList`/`disabled` in-place instead of `clearChildren` + rebuild. Only rebuild when `pageOrder` or `activePageId` changes. |
| 14 | MutationObserver triggers full sync | `static/js/behavior/navigation.js:1056–1063` | Debounce the observer callback. Only call `refreshPageSections` and `syncPageVisibility` on DOM mutations, not the full `syncFromState`. |

**Gate 4**: Run all 4 quality gate commands. All must pass.

---

### Wave 5: P2 Text Cleanup (15 issues, parallel in 3 groups)

Text changes are independent but some touch the same files. Group by file to avoid conflicts. Within each group, one subagent handles all items for those files.

**Group 5A — HTML files** (1 subagent):
- #15: Shorten panel captions in `trust-framework.html:73, 293` (F→"Navigate pages using the pager below or the sidebar index.", G→"Guidance for the current page appears here. Reference drawers provide scoring and evidence rules.")
- #26: Remove `#toolbarContextToggle` from `trust-framework.html:70`
- #20: Shorten context sidebar fallback in `trust-framework.html:296–299` to "Select a page to see context guidance."

**Group 5B — JS files** (1 subagent):
- #17: Remove evidence block description in `evidence.js:89–92, 464–468`
- #18: Simplify evidence empty states in `evidence.js:94–109` to "No evidence attached. Attach {principle-specific noun}."
- #19: Shorten help text strings in `questionnaire-pages.js:40–45` (C→"Free-form note for observations that don't fit elsewhere. Does not satisfy any required field.", D→"Skip this section to mark it as not applicable. All fields inside become optional. A reason and rationale are required.", E→"Skip only when the criterion cannot be assessed (e.g., insufficient data or tool unavailable). Score normally if you can evaluate it. Reason and rationale required. All child fields become optional.")
- #20: Clean sidebar text in `sidebar.js:484, 521–522` (J→remove/shorten, K→remove)
- #21: Remove header progress summary in `sidebar.js:352–401`
- #22: Remove route card redundant rows in `sidebar.js:1100–1127` (keep Mode, Topic, Focus, conditional Live page; remove Workflow, Status, Required)
- #23: Remove criterion companion field enumeration in `sidebar.js:446–461`
- #24: Remove/reduce buildSummaryCompanion in `sidebar.js:467–503`
- #27: Fix developer-facing notes in `questionnaire-schema.js:319` (move to code comments)
- #28: Fix derived field placeholders in `questionnaire-pages.js:526–528, 546` ("Derived from current state"→"Auto-filled based on your responses", "Computed value"→"Auto-calculated")
- #29: Strip section-code prefixes in `questionnaire-schema.js` labels + update `getFieldDisplayLabel()` in `questionnaire-pages.js:563–573`

**Group 5C — Title/subtitle fix** (1 subagent):
- #16: Fix section subtitle bugs in `navigation.js:75–104, 542–560`. Do NOT remove the function — fix it: fall back to section definition title when DOM is unavailable. Remove redundant `syncPanelTitles` call at line 754. Optionally reduce `--ls-panel-title` in `tokens.css:309` from `0.12em` to `0.06–0.08em`.

**Group 5D — Reference drawers** (1 subagent):
- #25: Remove drawer subtitles in `reference-drawers.js:133–140`

**Gate 5**: Run all 4 quality gate commands. All must pass.

---

### Wave 6: P2 Form Styling (3 issues, parallel)

| ID | Issue | Files | What to do |
|----|-------|-------|------------|
| 30 | Evidence controls unstyled | `static/js/render/evidence.js:246–360`, `static/css/components.css:663–684` | Refactor evidence selects/textareas/file-inputs to use `createSelectControl()`, `createTextareaControl()` from `dom-factories.js`. Hide raw file input, create styled button triggering `click()`. Remove/update evidence-specific CSS. |
| 31 | Drawer header styling broken | `static/css/components.css:1413–1460, 1617–1619`, `static/css/interaction-states.css:910, 919` | Style `.reference-drawer-code` as badge (padding, border, background, border-radius). Set `.reference-drawer-title` to `font-size: var(--text-body)`, `font-weight: 700`, `text-transform: none`, `color: var(--ut-navy)`. Add `border-left` on actions area. Add `:focus-visible` background state. |
| 32 | Remove PIN buttons | `static/js/render/reference-drawers.js:123–131, 196–199, 255–279` | Remove PIN button creation, pin state Set, forced-open logic, and related CSS. |

**Gate 6**: Run all 4 quality gate commands. All must pass.

---

### Wave 7: P2 Navigation Consolidation (1 issue)

| ID | Issue | Files | What to do |
|----|-------|-------|------------|
| 33 | Consolidate nav bars | `trust-framework.html:44–49`, `static/js/render/sidebar.js:776–893`, `static/css/layout.css:24–28` | **Depends on Issues 4 and 11 from Wave 3.** Remove 5 principle buttons from quick jump. Keep Context/Info/Help toggles at right end of completion strip with visual separator. Define explicit column sizing in header grid. Add animated active indicator on active cell. |

**Gate 7**: Run all 4 quality gate commands. All must pass.

---

### Wave 8: P2–P3 Context Lifecycle + Color Fixes (7 issues, parallel in 2 groups)

**Group 8A — Lifecycle** (1 subagent):
- #34: Add `store.actions.setActivePageWithAnchor(pageId, anchorId)` combined action in `store.js` + `navigation.js:758–779`
- #35: Move `refreshPageAnchors()` call to MutationObserver callback in `sidebar.js:1256`
- #36: Fix title staleness in `navigation.js:542–560` — fall back to section definition title

**Group 8B — Color/CSS fixes** (1 subagent):
- #37: Fix reference drawer border override in `interaction-states.css:488, 182` (raise specificity on per-section rules)
- #38: Fix SE/TC contrast in `tokens.css` + `interaction-states.css:73–81` (darken `--se-dark` or increase button font size)
- #39: Add backdrop click dismiss in `trust-framework.html:59` + `navigation.js`
- #40: Remove dead `data-target` rules in `interaction-states.css:6–29, 58–81`

**Gate 8**: Run all 4 quality gate commands. All must pass.

---

### Wave 9: P2 Tooltip System (3 issues, sequential)

| ID | Issue | Files | What to do |
|----|-------|-------|------------|
| 41 | Tooltip component | `static/js/render/dom-factories.js`, `static/css/components.css` | Create `createTooltipTrigger(label, tooltipText)` returning a `?` icon button + positioned popover. Specs: 44×44px touch target, max-width 18rem, auto-flip collision detection, z-index 50, hover (300ms delay) + focus trigger, fade-in 100ms/fade-out 75ms, Escape/click-outside/blur dismiss, `role="tooltip"`, `aria-describedby`, `prefers-reduced-motion` support. |
| 42 | Schema + text | `static/js/config/questionnaire-schema.js` | Add `tooltip` property to 20+ field definitions. Text is in Section 7.2 of the plan. |
| 43 | Wire into rendering | `static/js/render/questionnaire-pages.js` | In `createFieldGroupElement()`, render tooltip trigger after field label when `field.tooltip` exists. |

**Gate 9**: Run all 4 quality gate commands. All must pass.

---

### Wave 10: P2 Surface Bug Fixes (2 issues, parallel)

| ID | Issue | Files | What to do |
|----|-------|-------|------------|
| 44 | Fix context panel title update bugs | `static/js/behavior/navigation.js:58–73, 542–560, 754`, `static/js/render/sidebar.js:737–753` | Fix `ensurePanelTitleSuffix()`: fall back to section definition title when DOM unavailable. Show "(pinned)" when context is pinned. Remove redundant syncPanelTitles call at line 754. |
| 45 | Error resilience for sidebar sync | `static/js/render/sidebar.js:1255–1264` | Wrap each render call in `sync()` with try-catch. Log errors, continue rendering remaining sections. Add fallback "unable to render" message. |

**Gate 10**: Run all 4 quality gate commands. All must pass.

---

### Wave 11: P2 Tabbed Sidebar Architecture (2 issues, sequential)

This is the largest wave. **Depends on Waves 1–3 and 10 being complete.** Issue 46 must finish before 47 starts.

| ID | Issue | Files | What to do |
|----|-------|-------|------------|
| 46 | Merge surfaces into tabbed sidebar | `navigation.js`, `sidebar.js`, `about-panel.js`, `help-panel.js`, `layout.css`, `components.css`, `store.js`, `trust-framework.html` | **See Section 2.8 of the plan for full migration steps and component specs.** This is a large refactor. Three tabs: Guidance (context + help legend), Reference (moved drawers as flat scrollable sections), About (framework background). Add `sidebarPanel.activeTab` to store. Create tab bar with underline indicator, section accent color on active tab, animated indicator. Strip card styling from inner containers. Use `transform: translateX()` for sidebar toggle (grid-template-columns can't be transitioned). Remove overlay CSS (`layout.css:324–391`) including `@keyframes`. Update responsive drawer mode. Audit text for old surface name references. |
| 47 | Draggable sidebar width | `trust-framework.html`, `layout.css`, `navigation.js` | Add `<div class="shell-divider" role="separator">` between panels. CSS: absolute positioned, 6px wide, `cursor: col-resize`. JS: pointer events updating `--sidebar-width` clamped to 20rem–36rem. Dynamic max based on viewport (questionnaire panel ≥600px). localStorage with try-catch fallback. Hidden in drawer mode. |

**Gate 11**: Run all 4 quality gate commands. All must pass.

---

## Final Validation

After Wave 11 passes its gate, run a full validation sweep:

```bash
npm run validate:html
npm run format
npm run format:check
npm run test:unit
npm run test:e2e
npm run test               # runs validate:html + unit + e2e
```

Serve the app and manually spot-check:
```bash
npm run serve:static        # http://127.0.0.1:4173
```

Verify:
1. All 13 pages accessible on first load (default workflow = primary_evaluation)
2. Per-section colors in completion strip (TR=blue, RE=green, UC=purple, SE=orange, TC=teal)
3. Context button readable (not dark-on-dark)
4. Help panel renders content
5. Escape closes overlays without errors
6. Reference drawers appear in sidebar, not above form
7. Evidence controls styled consistently
8. Tooltips appear on hover/focus for tooltip-enabled fields
9. Sidebar has Guidance / Reference / About tabs
10. Section subtitle updates correctly on navigation
11. No verbose instructional text remaining
12. Pager shell renders correctly (CSS brace fix)

## Error Recovery

If a quality gate fails:
1. Identify which subagent's changes caused the failure (check which files changed in that wave)
2. Send a fix agent to address only the failing issues
3. Re-run the quality gate
4. Do not proceed to the next wave until the gate passes

If an e2e test fails and the cause is unclear, run `npm run test:e2e:headed` to observe the failure visually.

## Summary Statistics

- **11 waves** total
- **47 issues** across 10 phases
- **4 P0 critical** (Wave 1)
- **11 P1 high** (Waves 2–4)
- **28 P2 medium** (Waves 5–10)
- **4 P3 low** (absorbed into P2 waves)
- **Quality gates** after every wave (11 gates minimum)
