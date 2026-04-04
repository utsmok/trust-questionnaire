# Review: Polish & Harden Lenses on Consolidated Findings Report

Reviewer: polish + harden skills
Date: 2026-04-04
Source: `CONSOLIDATED_FINDINGS_REPORT.md` + source code audit

---

## 1. Polish Findings

### P-01. Grid-template-columns transition on sidebar toggle is instant

When the context sidebar is toggled on desktop, `.shell-layout` changes `grid-template-columns` between `minmax(0, 1fr)` and `minmax(0, 1.45fr) minmax(20rem, 28rem)`. Grid property changes cannot be transitioned — the sidebar appears and disappears with no animation. This is a polish gap the report does not mention.

**Files**: `layout.css:229, 234`, `navigation.js:567–571`

**Impact**: The report's Issue 2.9 (sidebar toggle) and Issue 2.8 (tabbed sidebar) will both suffer from an instant layout jump unless the transition strategy changes to `transform`/`opacity`-based approach.

**Recommendation**: Use a fixed grid with the sidebar translated off-screen via `transform: translateX()` when collapsed (like the existing drawer mode pattern at `layout.css:464`), rather than changing `grid-template-columns`.

---

### P-02. Spacing scale is not enforced — at least 5 different gap values for similar purposes

The codebase uses gap values of 2px, 4px, 6px, 8px, 10px, 12px, 14px, 18px, 22px, and 24px without a declared spacing scale. Examples:
- `.completion-strip` gap: 2px (`components.css:7`)
- `.context-route-grid` gap: 8px (`components.css:1199`)
- `.field-label` gap: 8px (`components.css:297`)
- `.page-index-button` gap: 10px (`components.css:1057`)
- `.context-anchor-button` gap: 10px (`components.css:1289`)
- `.header-inner` gap: 18px (`layout.css:27`)
- `.workspace-layout` gap: 22px (`layout.css:308`)

**Impact**: The proposed tooltip system (Phase 7) and tabbed sidebar (Phase 8) will add new components with arbitrary gap choices. Without a spacing scale in `tokens.css`, polish debt accumulates.

**Recommendation**: Define spacing tokens (`--space-xs` through `--space-xl`) in `tokens.css` before Phase 4+ work begins.

---

### P-03. Page transition JS/CSS timing desynchronization

Page transitions use a JS `setTimeout(150)` (`navigation.js:484`) while the CSS uses `var(--duration-fast)` (`interaction-states.css:1071`). If the design token value changes, the JS timeout will not follow. This creates a desync risk where the outgoing page hides too early or too late.

**Files**: `navigation.js:484`, `interaction-states.css:1071`

---

### P-04. Reference drawer `<summary>` has no hover or focus-visible state

The `.reference-drawer-summary` has `cursor: pointer` (`components.css:1419`) but no `:hover` or `:focus-visible` styles in `interaction-states.css`. The only hover rule is on `.reference-drawer-summary:hover` at line 919 which changes background/border, but there's no focus-visible rule for keyboard navigation. The `:focus-visible` rule at line 910 covers `.reference-drawer-summary:focus-visible` but only sets outline — no background change to match hover.

**Impact**: Users who navigate with keyboard see an outline but no background change, creating a visual inconsistency with mouse hover. The report's Issue 4.1 (reference drawer styling) fixes the layout but doesn't address this interaction state gap.

---

### P-05. Context pin button lacks transition between pressed/unpressed states

The `.context-pin-button` toggles between `background: var(--ut-white)` and `background: var(--ut-darkblue)` with no CSS transition. The state change is instant and visually jarring. Compare with `.nav-button` which transitions `background`, `color`, `border-color` over `var(--duration-fast)`.

**Files**: `components.css:1163–1194`

---

### P-06. Evidence async operations have no visual loading state

When `draftState.busy` is true (`evidence.js:1545`), buttons show "Reading file(s)…" text but the CSS only applies `:disabled` opacity 0.6. No spinner, no progress indicator, no skeleton. The button text change is the only feedback.

**Impact**: The report's Issue 5.1 (evidence controls bypass mock-control system) proposes wrapping controls in styled shells but doesn't specify loading/progress states for async file operations.

---

### P-07. Panel headers will feel empty after proposed text removal

The report proposes removing section subtitles (Issue 6.2) and panel captions (items F, G). Currently the questionnaire panel header has:
1. `h1.panel-title` with text-display size + 2px border-bottom
2. `.panel-title-section` span with the section name in a muted color
3. `.panel-caption` paragraph

After removal, only the bare `h1` remains. The title row becomes visually top-heavy — a large heading with a thick bottom border and nothing below it. The space between the heading and the reference drawers/form content increases.

**Recommendation**: Either keep the subtitle as a lightweight section indicator, or reduce the border-bottom weight and margin to compensate.

---

### P-08. Tooltip system underspecified for polish

The report's Phase 7 proposes a tooltip component but specifies only:
- A `?` icon button
- `aria-describedby` for accessibility
- `title` attribute as no-JS fallback

Missing polish details:
- **Touch target**: No minimum size specified (needs 44x44px minimum)
- **Positioning**: No strategy for viewport-edge clipping
- **Trigger**: Hover-only? Focus too? Click on mobile?
- **Transition**: No open/close animation specified
- **Max-width**: Not specified — long tooltip text will create oversized popovers
- **Z-index**: Not specified — could conflict with surface overlays (z-index 40) or lightbox (z-index 1000)
- **Arrow/caret**: Not specified — how does the tooltip visually connect to the trigger?

**Impact**: Without these details, implementation will make arbitrary choices that may conflict with existing patterns.

---

### P-09. Proposed tabbed sidebar has no tab bar design specification

Issue 2.8 proposes merging surfaces into tabs but specifies only the state shape (`sidebarPanel.activeTab`). No details on:
- Tab bar appearance (underline, pill, segment control)
- Active tab indicator (animation, color)
- Tab label text ("Context", "Info", "Help" vs the proposed renames)
- Tab overflow handling at narrow widths
- Divider between tab bar and content area
- Tab switching animation

**Impact**: This is the largest proposed change (Phase 8, "Large" effort) and has the least visual specification.

---

### P-10. `.evidence-intake-grid` column balance issues

The three-column grid (`components.css:627`) uses `minmax(10rem, 12rem) minmax(0, 1fr) minmax(13rem, 16rem)`. The middle column absorbs remaining space but between 760px and ~1100px viewport width, it can become very narrow (under 8rem), making the textarea feel cramped. The report's Issue 5.1 doesn't address this responsive behavior.

---

### P-11. `toolbarContextToggle` has the same illegibility problem as the header Context button

Issue 2.3 identifies the header Context button as illegible due to accent scoping. The duplicate `#toolbarContextToggle` in the questionnaire panel header (`trust-framework.html:70`) has the same classes (`.nav-button.shell-action-button`) and the same `data-surface-toggle="contextSidebar"` attribute. It will have the same color problem. The report doesn't explicitly call out this second button.

**Files**: `trust-framework.html:70`, `interaction-states.css:1017–1021`

---

## 2. Harden Findings

### H-01. Sidebar at minimum width (16rem) will clip content

The draggable sidebar proposal (Issue 2.10) specifies 16rem–40rem. At 16rem:
- `.context-route-grid` uses `grid-template-columns: minmax(5.5rem, auto)` (`components.css:1204`) — the dt column alone takes 5.5rem, leaving ~10rem for the dd value. Long values like "Recommended with caveats" will wrap aggressively.
- `.context-anchor-button` uses `grid-template-columns: auto 1fr` with the code taking auto width. With 16rem total, the label column gets very little space.
- `.page-index-button` uses `grid-template-columns: auto 1fr` with padding `10px 12px`. At 16rem minus the panel padding (24px each side), only ~9.7rem remains for content.
- The tab bar from Issue 2.8 needs minimum width to render three tab labels.

**Recommendation**: Raise the minimum to 18rem or 20rem (matching the current `minmax(20rem, 28rem)` minimum), and add `overflow: hidden; text-overflow: ellipsis` on long text elements within the sidebar.

---

### H-02. Changing default workflow to `primary_evaluation` creates completion strip overflow

Issue 8.1 changes the default so all 11 review sections become accessible. The completion strip (`components.css:4–18`) uses `flex-wrap: wrap` with `gap: 2px` and each cell is `min-width: 3.2rem`. With 13 cells (including S0 and S1), the strip needs ~43rem minimum. The header's `grid-template-columns: auto 1fr auto` layout may not accommodate this. At the 1160px breakpoint, the strip already wraps.

**Impact**: More visible cells means more wrapping, which the report doesn't account for.

**Recommendation**: Test the completion strip with all 13 cells visible at common viewport widths (1280, 1366, 1440, 1920px).

---

### H-03. Sub-anchor batching requires store architecture change

Issue 8.3.1 proposes batching `activePageId` and `activeSubAnchorId` into a single commit. However, the store's `commit()` function (`store.js:555–566`) takes a single updater function. `setActivePage` and `setActiveSubAnchor` are separate action functions that each call `commit()`. There is no `batch()` or `transaction()` API.

**Files**: `store.js:555–566, 699–731`

**Impact**: The proposed fix cannot be implemented without either:
1. Adding a batch/transaction API to the store, or
2. Creating a combined `setActivePageAndSubAnchor(pageId, anchorId)` action, or
3. Suppressing the subscription callback between the two commits (requires a debouncing or batching mechanism on the subscription side)

The report should specify which approach to take.

---

### H-04. Tab merging creates potential race condition between tab state and surface state

Currently, surface state changes (`store.actions.setSurfaceOpen`) trigger `syncShellSurfaces()` in the subscription. The proposed `sidebarPanel.activeTab` state will also trigger a subscription-based sync. If a user clicks a tab while a surface animation is still running (closing animation at `navigation.js:625–638`), the sync function could try to manipulate the same DOM elements that the closing animation is modifying.

**Files**: `navigation.js:615–656`

**Recommendation**: The migration plan (Issue 2.8, step 6) should specify that `syncSidebarPanel` must check for and cancel any in-flight surface animations before manipulating tab state.

---

### H-05. Hash navigation with hidden sidebar — context not rendered

If the sidebar is hidden (collapsed on desktop or closed in drawer mode) and a deep-link navigates to `#transparent`, `navigateToPage` fires and updates the store. The context sidebar's `sync()` runs but its DOM is either `hidden` or off-screen. When the user later opens the sidebar, the content is correct (it reads from state), but there's no indication that context is available.

**Impact**: The tabbed sidebar proposal should show a badge or indicator on the toggle button when context content has been loaded but the sidebar is hidden.

---

### H-06. No error boundary around sidebar rendering

In `sidebar.js:1255–1264`, `sync()` calls `refreshPageAnchors()`, `renderQuickJump()`, `renderPageIndex()`, `renderRouteCard()`, `renderAnchorCard()`, and `renderContextContent()` sequentially. If any one throws (e.g., `getSectionDefinition()` returns null for an unexpected page ID), the remaining functions don't execute. This could leave the sidebar in a partially rendered state.

**Impact**: The report doesn't address error resilience in rendering. Adding try-catch around each render step would prevent cascading failures.

---

### H-07. localStorage persistence for sidebar width has no fallback

Issue 2.10 proposes storing the preferred sidebar width in `localStorage`. No fallback is specified for:
- Private browsing mode where `localStorage` is unavailable
- Quota exceeded errors
- Disabled cookies/storage

**Recommendation**: Wrap `localStorage` access in try-catch and silently fall back to the CSS default width.

---

### H-08. Tooltip positioning needs viewport-edge awareness

The report's Phase 7 proposes tooltips but doesn't address what happens when the trigger element is near a viewport edge. If a `?` icon is at the bottom-right of the questionnaire panel, a tooltip positioned below-right could clip. If at the top of the page, a tooltip above could be hidden under the fixed header (z-index 25).

**Recommendation**: Implement a flip/collision detection strategy (e.g., position below by default, flip above if insufficient space; shift left/right to stay within viewport).

---

### H-09. Evidence lightbox focus trap leaks on rapid open/close

`evidence.js:939–945` creates a new focus trap on every lightbox open:
```js
if (lightboxFocusTrap) lightboxFocusTrap.deactivate();
lightboxFocusTrap = createFocusTrap(lightbox, { ... });
lightboxFocusTrap.activate();
```

If `openEvidenceLightbox` is called twice rapidly (double-click on preview button), the first trap is deactivated and a second is created on the same element. The `_returnFocusTarget` is overwritten. This is mostly benign but could cause focus to be returned to the wrong element if the first lightbox was still in its opening transition.

---

### H-10. Drawer mode transition may orphan focus

When the viewport crosses 1160px, `handleContextDrawerModeChange` fires (`navigation.js:1013–1039`). If the context sidebar was open in drawer mode, it's closed (`setContextSidebarOpen(false, { focusAfterClose: false })`). Focus is not returned to any element — it could land on `document.body`. On the reverse transition (narrowing to drawer mode), the sidebar state persists but the DOM switches to fixed-position overlay mode without updating focus.

---

### H-11. Text removal may affect screen reader users

The report proposes removing several descriptive text blocks (items A, F, G, H, K) and shortening others (B, C, D, E). For screen reader users, these paragraphs provide context that the field labels alone don't convey. The proposed tooltip system (Phase 7) moves some of this text to tooltips, but tooltips are not announced by screen readers on page load — they require explicit user interaction.

**Recommendation**: Before removing text, verify that `aria-label` or `aria-describedby` attributes on relevant elements provide equivalent information. The tooltip's `aria-describedby` helps for individual fields but doesn't replace panel-level guidance.

---

### H-12. `navigateToPage` redundancy creates double-render risk

`navigation.js:754` calls `syncPanelTitles(store.getState())` after `store.actions.setActivePage(pageId)`. But the store subscription at `navigation.js:891` already calls `syncFromState(state)` which includes `syncPanelTitles(state)`. If the subscription fires synchronously (it does — `notify` calls listeners inline at `store.js:549–553`), `syncPanelTitles` runs twice. The report identifies this redundancy (Issue 2.7, point 3) but classifies it as P2. Under the harden lens, this is a correctness issue — the second call reads potentially stale DOM from the first render.

---

## 3. Suggested Amendments to the Report

### Amendment 1: Add Phase 0 — Spacing Scale and Design Tokens

Before Phase 4 (form styling) and especially before Phase 8 (sidebar architecture), define spacing tokens in `tokens.css`:
```
--space-2xs: 2px;
--space-xs: 4px;
--space-sm: 6px;
--space-md: 8px;
--space-lg: 12px;
--space-xl: 16px;
--space-2xl: 24px;
--space-3xl: 32px;
```
This prevents arbitrary gap values in new components and makes the tooltip/tab implementations consistent.

### Amendment 2: Specify Tooltip Component Requirements

Add to Issue 7.3:
- Minimum touch target: 44x44px
- Max-width: 18rem (or 40ch)
- Overflow: `overflow-wrap: break-word`
- Position: auto-flip with collision detection
- Z-index: 50 (between panels z-25 and surfaces z-40)
- Trigger: both hover (300ms delay) and focus
- Transition: fade-in 100ms, fade-out 75ms
- Close: Escape key, click outside, blur
- Reduced motion: show/hide without animation

### Amendment 3: Specify Tab Bar Component Requirements

Add to Issue 2.8:
- Tab bar style: underline with animated indicator (matching `nav-indicator` pattern)
- Tab labels: icon + text, text hidden below 760px
- Active state: section accent color underline, bold text
- Tab switching: crossfade content (150ms opacity transition)
- Keyboard: arrow keys between tabs, Tab into content
- Overflow: horizontal scroll with fade masks if tabs exceed available width

### Amendment 4: Raise Sidebar Minimum Width

Change Issue 2.10 sidebar width range from 16rem–40rem to 20rem–36rem. At 20rem:
- Existing `minmax(20rem, 28rem)` already works at this width
- Context cards have adequate space for grid content
- Tab labels have room to render
- 36rem maximum prevents the questionnaire panel from becoming too narrow on 1280px screens (1280 - 36rem = ~703px for questionnaire)

### Amendment 5: Add Error Resilience to Sidebar sync()

Add to Issue 8.3:
- Wrap each render call in `sync()` with try-catch
- Log errors to console but continue rendering remaining sections
- Add a fallback "unable to render" message for failed sections

### Amendment 6: Specify Store Batching Mechanism

Add to Issue 8.3.1:
- Add `store.actions.setActivePageWithAnchor(pageId, anchorId)` as a single action
- Implement as a combined commit that sets both `ui.activePageId` and `ui.activeSubAnchorId` in one `createUiState()` call
- This avoids the need for a full batch/transaction API

### Amendment 7: Add Interaction State Audit to Phase 4

Every new/modified component in Phase 4–8 should verify:
- Default, hover, focus-visible, active, disabled, loading states
- Transitions between states
- Reduced motion handling
- Keyboard accessibility

---

## 4. Concerns

### Concern 1: Phase 8 scope is underspecified for its size

Phase 8 (sidebar architecture) is rated "Large" effort but has the least design specification of any phase. It:
- Removes overlay surfaces and replaces with tabs
- Adds tab state management
- Requires responsive behavior changes
- Must handle the sidebar transition animation
- Integrates help panel content that's currently broken (Phase 1)

The migration steps in Issue 2.8 are architecture-level but skip the visual/interaction design. Implementing Phase 8 without a detailed component specification will produce inconsistent results.

### Concern 2: Polish debt will accumulate without a spacing/design token system

The codebase already has inconsistent spacing (P-02). Phases 4–8 add new components (tooltips, tabs, draggable dividers, styled evidence controls) that will each make independent spacing decisions. Retrofitting a token system after these components are built is significantly more expensive than doing it first.

### Concern 3: The report's severity ratings may be too conservative

Several P2 issues have polish/harden implications that raise their effective severity:
- Issue 2.7 (panel title staleness) — H-12 shows this causes a double-render correctness issue, not just cosmetic staleness
- Issue 5.1 (evidence controls bypass mock-control) — P-06 shows async operations have no loading state, making the controls feel broken during file uploads
- Issue 8.3.1 (sub-anchor flash) — H-03 shows the fix requires store architecture changes, making it harder than the "Medium" effort estimate

### Concern 4: The `--section-on-accent` token is undefined for the Context button

The root cause of Issue 2.3 is that `--section-on-accent` is undefined on `.shell-action-button`. The `accent-scoping.css:113–136` `:where()` block resolves section tokens for matching elements, but `.shell-action-button` is not in that block. The fix is described as either adding the class to the block or hardcoding the value. However, the `:where()` block also contains `.strip-cell`, `.nav-button[data-page-id]`, and `.page-index-button` — all elements that should have their own per-section colors (Issue 3.2). Removing them from the block (Issue 3.2 fix) is correct, but the Context button fix must not re-add them. The dependency chain (Issue 3.2 before 2.3) is noted but the interaction between the two fixes is subtle.

### Concern 5: No performance considerations for proposed changes

The report doesn't address performance implications of:
- Tooltip system: 20+ tooltip instances, each with hover/focus listeners and positioned popovers
- Draggable sidebar: continuous pointer event handling during drag, causing layout recalculation
- Tab switching: rendering three tab panels worth of content (context, about, help) instead of one
- More accessible sections: 11 sections rendered simultaneously instead of 2, each with evidence blocks, criterion cards, and field groups
