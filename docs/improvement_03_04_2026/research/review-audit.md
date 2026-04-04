# Audit Review: Consolidated Findings Report

Date: 2026-04-04
Reviewer: Technical quality audit (audit skill)
Scope: Validation of CONSOLIDATED_FINDINGS_REPORT.md against source code

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Partial — good structural foundations (landmarks, labels, focus management) but significant gaps in dynamic content announcements, completion strip, and form validation exposure |
| 2 | Performance | 2/4 | Partial — `contain: layout style paint` on framework panel is good, but full sidebar DOM rebuild on every state change causes layout thrashing |
| 3 | Theming | 3/4 | Good — consistent token system, accent scoping architecture is sound, one missing-closing-brace CSS syntax error |
| 4 | Responsive Design | 2/4 | Partial — drawer mode at 1160px works, but reference drawers remain above form in mobile, touch targets on strip cells undersized |
| 5 | Anti-Patterns | 3/4 | Mostly clean — inline styles in help-panel.js, no AI slop, intentional design language |
| **Total** | | **12/20** | **Acceptable (significant work needed)** |

---

## 1. Accessibility Findings

### Issues the report correctly identified

The report's three P0 bugs are all verified as genuine runtime errors that break accessibility:

- **Issue 2.1 (Help panel empty)**: Confirmed. `help-panel.js:440` queries `[data-surface="help"]` which matches nothing. `createChip` at lines 294+ is undefined — `PROGRESS_STATE_LABELS` at line 41 is the actual function name. Both bugs verified.
- **Issue 2.2 (Escape ReferenceError)**: Confirmed. `navigation.js:822` calls undefined `setShellSurfaceOpen`. The correct function is `setOverlaySurfaceOpen` at line 781.
- **Issue 8.1 (Sections locked)**: Confirmed. `helpers.js:667` defaults to `WORKFLOW_MODES.NOMINATION`, locking 11 of 13 pages.

### P1 issues the report missed

#### 1.1 Completion strip invisible to assistive technology

- **Location**: `sidebar.js:800-801`
- **Category**: Accessibility
- **Impact**: Every strip cell gets `aria-hidden='true'` and `role='presentation'`. The completion strip provides zero progress information to screen reader users. The `<ul>` has `aria-labelledby="completionStripLabel"` but every child is explicitly hidden.
- **WCAG**: 1.3.1 Info and Relationships, 4.1.2 Name Role Value
- **Report status**: The report notes this (Issue 3.1) as a P2 "duplicate navigation" issue focused on visual consolidation. It underestimates the severity — the completion strip's `aria-hidden` on every cell is an a11y gap, not just visual clutter.
- **Recommendation**: Either make strip cells keyboard-accessible `<button>` elements with proper labels (as the report suggests in Issue 3.1), or remove the `aria-hidden` and provide accessible names via `aria-label`. The header progress summary (`aria-live="polite"`) partially compensates but doesn't show per-section status.
- **Severity**: **P1**

#### 1.2 No aria-live region for sidebar context changes

- **Location**: `sidebar.js:1222-1253` (renderContextContent)
- **Category**: Accessibility
- **Impact**: When the user navigates to a new page, the context sidebar content is fully replaced. Screen reader users receive no announcement that context has changed. The `.context-route-card`, `.context-anchor-card`, and generated content areas lack `aria-live` attributes.
- **WCAG**: 4.1.3 Status Messages
- **Report status**: Not mentioned.
- **Recommendation**: Add `aria-live="polite"` to the context sidebar shell or route card. Ensure the live region is populated after rendering, not cleared before it (current `clearChildren` pattern would announce "empty" before new content).
- **Severity**: **P1**

#### 1.3 Form validation states not exposed to screen readers

- **Location**: `questionnaire-pages.js:1115-1126` (field group dataset), `interaction-states.css:1136-1172` (validation styling)
- **Category**: Accessibility
- **Impact**: Field validation state is tracked via `data-field-validation-state` dataset attributes and styled via CSS. But there are no `aria-invalid` attributes on actual form controls, and no `.validation-message` elements are rendered in the current code (the CSS for them exists at `interaction-states.css:1174-1184` but the DOM factory never creates them). Screen reader users cannot detect validation errors.
- **WCAG**: 3.3.1 Error Identification, 4.1.2 Name Role Value
- **Report status**: Not mentioned.
- **Recommendation**: When `fieldState.validationState` is `'invalid'` or `'blocked'`, set `aria-invalid="true"` on the control element. Render the `.validation-message` element with `role="alert"` containing the issue text.
- **Severity**: **P1**

### P2 issues the report missed

#### 1.4 Focus trap uses `document.activeElement` instead of scoped reference

- **Location**: `focus-trap.js:14,18`
- **Category**: Accessibility
- **Impact**: The focus trap checks `document.activeElement` for wrap-around detection. If focus somehow escapes to a shadow DOM or iframe, the trap fails silently. Should use `container.contains(document.activeElement)` or track focus within the container.
- **Severity**: **P2**

#### 1.5 Context drawer backdrop has no keyboard dismiss

- **Location**: `trust-framework.html:59`, `navigation.js` (no backdrop keydown handler)
- **Category**: Accessibility
- **Impact**: The context drawer backdrop (`data-surface-dismiss="contextSidebar"`) is a `<div>` with no keyboard handler. Escape dismisses the drawer via the document-level keydown handler (navigation.js:1001-1004), but clicking the backdrop does nothing because the backdrop has no click listener. Only the explicit Close button works.
- **Severity**: **P2**

---

## 2. Performance Findings

### Issues the report correctly identified

- **Issue 8.3.2 (stale anchor map rebuild)**: Confirmed. `sidebar.js:1256` calls `refreshPageAnchors()` unconditionally in `sync()`.
- **Issue 8.3.1 (flash of wrong context)**: Confirmed. Two separate store mutations in `navigateToSubAnchor()` cause two renders.

### P1 issues the report missed

#### 2.1 Full quick-jump DOM teardown and rebuild on every state change

- **Location**: `sidebar.js:830` (`clearChildren(quickJumpMount)`)
- **Category**: Performance
- **Impact**: Every call to `sync()` → `renderQuickJump()` destroys all quick-jump children (including the Context/Info/Help action buttons, which are saved and re-appended at lines 866-869) and recreates 5+ nav buttons from scratch. This is called on every store change including field value updates, causing layout thrashing in the header.
- **Anti-pattern**: Destroy-recreate cycle instead of DOM diffing or selective updates.
- **Recommendation**: Cache button references and update `dataset`/`classList`/`disabled` properties in-place rather than rebuilding. Only rebuild when `pageOrder` or `activePageId` changes.
- **Severity**: **P1**

#### 2.2 MutationObserver triggers full application sync

- **Location**: `navigation.js:1056-1063`
- **Category**: Performance
- **Impact**: The MutationObserver on `questionnaireRenderRoot` calls `refreshPageSections()` AND `syncFromState(store.getState())` on every childList mutation. `syncFromState` re-renders the entire sidebar, pager, reference drawers, about panel, help panel, page visibility, and panel titles. During initial page load, this may fire dozens of times as questionnaire pages are added.
- **Recommendation**: Debounce the observer callback (the `observerPending` flag exists but the `requestAnimationFrame` still triggers the full sync). Only sync what changed — typically just `refreshPageSections` and `syncPageVisibility`.
- **Severity**: **P1**

### P2 issues the report missed

#### 2.3 help-panel.js uses inline styles extensively

- **Location**: `help-panel.js:395-426`
- **Category**: Performance / Anti-pattern
- **Impact**: The keyboard shortcuts table is built with `style.cssText` on every `<tr>`, `<td>` element. This prevents style sharing and makes the CSS harder to maintain.
- **Severity**: **P2**

---

## 3. Responsive Design Findings

### Issues the report correctly identified

- **1160px breakpoint behavior**: The report correctly identifies the single breakpoint and drawer-mode conversion. Verified at `layout.css:489-518` and `navigation.js:20`.

### P1 issues the report missed

#### 3.1 Reference drawers remain above form on mobile

- **Location**: `trust-framework.html:75-76` (drawer mount position), `layout.css:507-509` (workspace collapse)
- **Category**: Responsive
- **Impact**: The report's Issue 4.3 correctly identifies that reference drawers occupy "prime vertical space" but rates it P1 only for desktop. On mobile (below 1160px), the problem is worse: the workspace-layout collapses to single column, but the drawers still appear between the panel header and the page index. On a phone-height viewport, users may need to scroll past 200+ lines of reference material to reach any form fields.
- **Recommendation**: The report's fix (move drawers to context panel) is correct. Adding that on mobile, the drawers should default to closed/collapsed.
- **Severity**: **P1** (compounds the report's existing P1)

#### 3.2 Completion strip cells undersized for touch

- **Location**: `components.css:21-43` (strip-cell: 28px height, 3.2rem min-width)
- **Category**: Responsive
- **Impact**: Touch targets are 28px tall — well below the 44px minimum recommended by WCAG 2.2 SC 2.5.8. Since the cells are `aria-hidden` and non-interactive, this is mitigated. But if Issue 3.1 makes them interactive (as recommended), the touch targets must be enlarged.
- **Severity**: **P2** (becomes P1 if cells are made interactive)

---

## 4. Anti-Pattern Findings

### P0 issue the report missed

#### 4.1 CSS syntax error: `.pager-shell` missing closing brace

- **Location**: `components.css:1365-1367`
- **Category**: Anti-pattern / Technical quality
- **Impact**: The `.pager-shell` rule block at line 1357 opens with `{` but never closes with `}`. Line 1365 ends with `box-shadow: 0 1px 3px color-mix(...);` and line 1367 immediately starts `.pager-button {`. CSS error recovery will cause `.pager-shell` to lose its `box-shadow` declaration (since `.pager-button` is parsed as a malformed value), and `.pager-button` may inherit into a broken parse context. The visual impact depends on browser error recovery, but both selectors are compromised.
- **Verification**: Read `components.css` lines 1357-1367 — there is no `}` between the box-shadow property and the next selector.
- **Recommendation**: Add closing `}` after line 1365.
- **Severity**: **P0** (CSS parsing error affecting core navigation component)

### P2 issues the report missed

#### 4.2 z-index layering is fragile

- **Location**: Multiple files
- **Category**: Anti-pattern
- **Values observed**: top-accent (30), header (25), shell-surface (40), context-drawer-backdrop (18), framework-panel drawer (20), evidence-lightbox (1000)
- **Impact**: The report mentions z-index issues in Issue 2.4 (overlay covers header at z-40 vs z-25) but doesn't call out the systemic z-index management problem. There's no z-index scale or documentation. The evidence lightbox at z-1000 is particularly concerning — it would appear above any future modal.
- **Recommendation**: Define z-index tokens in `tokens.css` with a documented scale.
- **Severity**: **P2**

---

## 5. Technical Quality Findings

### Report accuracy assessment

The report is generally accurate in its technical analysis. Specific findings:

| Report claim | Verified | Notes |
|---|---|---|
| `setShellSurfaceOpen` undefined at navigation.js:822 | Yes | Confirmed as ReferenceError |
| `help-panel.js:440` sync selector wrong | Yes | `[data-surface="help"]` matches nothing |
| `createChip` undefined in help-panel.js | Yes | Function is named `PROGRESS_STATE_LABELS` at line 41 |
| `accent-scoping.css:113-136` wipes per-section colors | Yes | `.strip-cell` and `.page-index-button` are in the `:where()` block |
| `interaction-states.css:1017-1021` Context button illegible | Yes | `--section-on-accent` not resolved on `.shell-action-button` |
| Default workflow is NOMINATION (helpers.js:667) | Yes | Falls back to `WORKFLOW_MODES.NOMINATION` |
| Completion strip is `aria-hidden` (sidebar.js:800) | Yes | But report underestimates a11y impact |
| `store.js:122` contextSidebar defaults to true | Yes (verified via derive/index.js:72) | `workflow.mode` defaults to NOMINATION |

### Issues with the report itself

#### 5.1 Missed P0: CSS syntax error in components.css

- The report reviewed `components.css` (Issue 4.1 references lines 1413-1460, 1617-1619) but missed the missing closing brace at line 1365. This is a CSS parsing error that should be P0.
- **Severity**: Gap in report coverage

#### 5.2 Issue 2.1 root cause description slightly misleading

- The report says "The chip factory function is bound to `PROGRESS_STATE_LABELS`". Actually, `PROGRESS_STATE_LABELS` IS the chip factory function (it's a function expression, not a constant object as the name suggests in other files). The issue is that the call sites use the name `createChip` which doesn't exist. The report's fix (rename to `createChip`) is correct.
- **Severity**: Minor inaccuracy, fix is still correct

#### 5.3 Issue 5.1 evidence controls DO have aria-labels

- The report says evidence controls have "minimal styling" which is correct. But evidence controls at `evidence.js:254,295,343,358` all have `aria-label` attributes. The report doesn't claim they're missing, but it's worth noting that the a11y situation for evidence controls is better than the raw HTML styling suggests.
- **Severity**: Not an error, but a nuance worth capturing

#### 5.4 File reference: `states.css` does not exist

- The task description referenced `static/css/states.css` which doesn't exist. The correct file is `static/css/interaction-states.css`. The report itself uses the correct filename.
- **Severity**: N/A (report is correct)

#### 5.5 Dependency graph accuracy

- The dependency graph at the end of the report is accurate. Phase 1 items are genuinely independent. Phase 2 Issue 3.2 (per-section colors) correctly blocks Issues 3.1 and 2.3. Phase 8 correctly depends on Phase 1 and 2.
- **Severity**: No issues found

#### 5.6 Severity ratings mostly correct, two items should be higher

- Issue 3.1 (duplicate navigation) is rated P2 but the `aria-hidden` on all strip cells makes it an a11y P1.
- Issue 4.3 (reference drawers position) is rated P1 but the mobile impact makes it more severe.
- The three P0 ratings are all correct.

---

## 6. Suggested Amendments to the Report

### Add to Phase 1 (P0 fixes)

| # | Issue | Files | Effort |
|---|-------|-------|--------|
| 0 | Add missing `}` closing brace in `.pager-shell` | `components.css:1365` | Trivial |

### Add to Phase 2 (P1 fixes)

| # | Issue | Files | Effort |
|---|-------|-------|--------|
| 9a | Add `aria-live="polite"` to context sidebar shell | `sidebar.js:328-341` | Small |
| 9b | Set `aria-invalid` on controls with validation errors | `questionnaire-pages.js:967-1095` | Medium |
| 9c | Refactor renderQuickJump to update in-place | `sidebar.js:822-893` | Medium |

### Upgrade severity

- **Issue 3.1** (duplicate navigation): Upgrade from P2 to P1 due to `aria-hidden` on all strip cells making the progress strip completely inaccessible.

### Add context to existing issues

- **Issue 4.3** (drawers in wrong panel): Add note that on mobile (<1160px), the problem is amplified because workspace-layout collapses to single column.
- **Issue 5.1** (evidence controls): Clarify that `aria-label` attributes are present; the issue is purely visual styling inconsistency.

---

## 7. Concerns

### 7.1 Sidebar rebuild frequency is the highest risk for perceived performance

The `sync()` function in `sidebar.js:1255-1264` calls `refreshPageAnchors()`, `renderQuickJump()`, and `renderPageIndex()` on every state change. Since the store fires on every field value change, this means typing in a text field triggers a full sidebar DOM rebuild. Combined with the MutationObserver also triggering full syncs (navigation.js:1056-1063), there's a compounding performance problem that will degrade as the questionnaire grows. The report identifies this pattern (Issue 8.3.2) but rates it P2 — I'd argue it's P1 because it affects every keystroke interaction.

### 7.2 The tooltip proposal (Section 7) needs a11y requirements

The report proposes a tooltip system with "On hover/focus, show a small popover" but doesn't specify:
- Focus management for the tooltip (Tab should not trap in tooltip)
- Dismiss behavior (Escape should close)
- `aria-describedby` linkage between trigger and tooltip content
- `role="tooltip"` on the tooltip element
- Screen reader announcement strategy

Without these, the tooltip implementation could introduce new a11y issues. Recommend adding WCAG-compliant tooltip requirements to the proposal.

### 7.3 The sidebar tab merger (Issue 2.8) is high-risk

Merging three surfaces into a tabbed sidebar is the right architectural direction, but it touches ~200 lines of navigation.js, all three surface renderers, the store, HTML, and CSS. The report correctly identifies this as Phase 8 (last). However, the migration step "Remove overlay surface CSS (layout.css:324-391)" should also account for:
- The `@keyframes` for surface animations (layout.css:347-390)
- The `.surface-card`, `.surface-header`, `.surface-body` styles consumed by about-panel.js and help-panel.js
- The `hidden` and `style.display` manipulation in navigation.js:631-644
- The `is-closing` animation class logic

### 7.4 Positive findings worth preserving

The codebase has several good patterns that should be maintained during refactoring:
- **Immutable state with action pattern**: Store subscriptions and derived state are well-architected
- **Accent scoping via CSS custom properties**: The `data-accent-key` + `accent-scoping.css` pattern is elegant and should be preserved
- **Focus management with retry logic**: `focusElementWithRetry()` at navigation.js:141-180 handles async rendering well
- **Semantic HTML structure**: Proper landmarks, headings, and `aria-labelledby` associations throughout
- **`contain: layout style paint`** on framework-panel (layout.css:252): Good CSS containment for performance
- **`will-change: transform`** on progress bars (layout.css:100): Correct performance hint
- **`overscroll-behavior: contain`** on panels (layout.css:110): Prevents scroll chaining
- **Keyboard shortcuts**: Alt+1-5 and Alt+t/r/u/s/c for quick navigation (keyboard.js)
- **`prefers-reduced-motion`** support (navigation.js:454): Skips transitions when reduced motion is preferred
