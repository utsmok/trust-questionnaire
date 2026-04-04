# Surfaces & Panels Investigation

Date: 2026-04-04

## Summary

The application has three "surfaces" accessible from the header navigation:

| Button   | Surface name     | DOM ID               | Type           | Content source               |
|----------|-----------------|----------------------|----------------|------------------------------|
| Context  | `contextSidebar` | `#frameworkPanel`    | Sidebar panel  | Dynamic (page-dependent)     |
| Info     | `aboutSurface`  | `#aboutSurfaceMount` | Full-screen overlay | Static HTML topics      |
| Help     | `helpSurface`   | `#helpSurfaceMount`  | Full-screen overlay | Dynamically built       |

All three are toggled via `data-surface-toggle` buttons in `#quickJumpMount` and managed through `navigation.js:syncShellSurfaces`.

---

## Issue 1: Context/Info/Help panels broken — layout breaks

### Symptoms

- Clicking Info or Help produces a dark blue rectangle covering the main viewport
- The overlay covers the header quick-jump buttons, blocking navigation
- All three surfaces can be open simultaneously (Context sidebar + one overlay)
- Buttons act as toggles but the visual feedback is insufficient

### Root Causes

#### 1a. Overlay surfaces cover the header nav (by design, but problematic)

The `.shell-surface` elements are styled as full-viewport modal overlays:

**File:** `static/css/layout.css:324-332`
```css
.shell-surface {
  position: fixed;
  inset: var(--header-h) 0 0 0;   /* starts BELOW header visually */
  z-index: 40;                      /* ABOVE header (z-index: 25) */
  background: color-mix(in srgb, var(--ut-text) 88%, var(--ut-grey));
}
```

The z-index 40 exceeds the header's z-index 25 (`layout.css:16`). When an overlay opens, it renders above the Context/Info/Help buttons, making them unreachable. The only way to close the overlay is the "Close" button inside the `.surface-card`.

**Impact:** Users cannot toggle the surface off using the same header buttons that opened it. There is no backdrop-click-to-close handler for overlay surfaces.

**Affected files:**
- `static/css/layout.css:324-332` (surface z-index and positioning)
- `static/js/behavior/navigation.js:615-656` (overlay surface open/close — no backdrop click handler)

#### 1b. No mutual exclusion between contextSidebar and overlay surfaces in desktop mode

In `setContextSidebarOpen` (`navigation.js:260-356`), overlay surfaces are only closed when opening the context drawer **in drawer mode** (<=1160px):

```js
// navigation.js:274-279
if (isOpen && isContextDrawerMode) {
  OVERLAY_SURFACE_NAMES.forEach((surfaceName) => {
    if (selectShellSurfaceState(store.getState(), surfaceName)) {
      store.actions.setSurfaceOpen(surfaceName, false);
    }
  });
}
```

In desktop mode (`!isContextDrawerMode`), the function returns early after setting the store state (`navigation.js:301-303`). The context sidebar and overlay surfaces can coexist.

Similarly, `setOverlaySurfaceOpen` (`navigation.js:781-856`) only closes other overlay surfaces, not `contextSidebar`:

```js
// navigation.js:802-806
OVERLAY_SURFACE_NAMES.filter((candidate) => candidate !== surfaceName).forEach(
  (candidate) => {
    store.actions.setSurfaceOpen(candidate, false);
  },
);
```

`contextSidebar` is NOT in `OVERLAY_SURFACE_NAMES` (`navigation.js:18`). So in desktop mode:
- Context + Info can be open simultaneously
- Context + Help can be open simultaneously
- Info and Help are mutually exclusive (correctly)

**Affected files:**
- `static/js/behavior/navigation.js:18` (OVERLAY_SURFACE_NAMES definition)
- `static/js/behavior/navigation.js:274-279` (context closes overlays only in drawer mode)
- `static/js/behavior/navigation.js:787-806` (overlay opens don't close context)

#### 1c. Visual feedback on toggle buttons is subtle

The `aria-expanded` attribute is updated correctly (`navigation.js:648-656`), and the CSS changes the button appearance (`interaction-states.css:1017-1035`). However:

- Context button uses generic active styling (dark blue fill)
- Info and Help buttons use help-family colors when inactive, dark when active
- The visual change is small relative to the dramatic layout impact of the overlay

**Affected files:**
- `static/css/interaction-states.css:1017-1035`
- `static/js/behavior/navigation.js:648-656`

### Recommended Fix

1. **Make overlay surfaces dismiss on backdrop click.** Add a click listener on `.shell-surface` that calls `setOverlaySurfaceOpen(surfaceName, false)` when the click target is the surface itself (not the card).

2. **Add mutual exclusion** between `contextSidebar` and overlay surfaces in desktop mode. When opening an overlay surface, close `contextSidebar` and vice versa.

3. **Lower surface z-index below the header** or add a close affordance that remains visible when the overlay is open. Consider z-index 22 for surfaces so header buttons stay accessible.

---

## Issue 2: Help panel empty

### Symptoms

The Help sidebar content (`<div class="surface-body"></div>`) never renders any content.

### Root Cause

**Two compound bugs prevent the help panel from ever rendering content.**

#### Bug A: `sync()` uses a wrong DOM selector

**File:** `static/js/render/help-panel.js:439-446`

```js
sync(state) {
  const surfaceEl = documentRef.querySelector('[data-surface="help"]');
  const isOpen =
    surfaceEl?.classList.contains('is-open') ||
    surfaceEl?.getAttribute('aria-hidden') === 'false';
  if (!isOpen) return;
  render(state);
},
```

The selector `[data-surface="help"]` does not match any element in the HTML. The help surface element is:

```html
<!-- trust-framework.html:554 -->
<aside class="shell-surface" id="helpSurfaceMount" hidden role="dialog" ...>
```

It has no `data-surface` attribute. `documentRef.querySelector('[data-surface="help"]')` returns `null`, `surfaceEl` is `null`, and `isOpen` evaluates to `false`. `render(state)` is **never called**.

The correct selector should be `'aside.shell-surface[aria-label...]'`, or better, the element should be selected by ID or by matching the `aria-labelledby` to `helpSurfaceHeading`.

#### Bug B: `createChip` is never defined — would crash if render ran

Even if `sync` called `render`, it would throw a `ReferenceError`. The function that creates chip elements is defined at `help-panel.js:41-51` but is bound to the variable name `PROGRESS_STATE_LABELS`:

```js
// help-panel.js:41 — MISNAMED variable
const PROGRESS_STATE_LABELS = (documentRef, text, dataset = {}) => {
  const chip = documentRef.createElement('span');
  chip.className = 'chip';
  chip.textContent = text;
  Object.entries(dataset).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      chip.dataset[key] = value;
    }
  });
  return chip;
};
```

But every call site uses `createChip(...)`:

- `help-panel.js:294` — `createChip(documentRef, pageDefinition?.pageCode ?? 'PAGE', { helpRole: 'context' })`
- `help-panel.js:295` — `createChip(documentRef, 'Info', { helpRole: 'info' })`
- `help-panel.js:296` — `createChip(documentRef, 'Help', { helpRole: 'help' })`
- `help-panel.js:305-308` — score chips
- `help-panel.js:317-319` — workflow chips
- `help-panel.js:328-330` — judgment chips
- `help-panel.js:339-346` — recommendation chips
- `help-panel.js:355-357` — help pattern chips

Total: **22 call sites** all referencing `createChip`, which is undefined.

**Affected files:**
- `static/js/render/help-panel.js:41` — wrong variable name (`PROGRESS_STATE_LABELS` should be `createChip`)
- `static/js/render/help-panel.js:294-357` — all `createChip` references would throw ReferenceError
- `static/js/render/help-panel.js:440` — wrong selector `[data-surface="help"]`

### Recommended Fix

1. **Rename** `PROGRESS_STATE_LABELS` at line 41 to `createChip`.
2. **Fix the `sync` selector** to use a valid query. Options:
   - `documentRef.getElementById('helpSurfaceMount')`
   - Or add `data-surface="help"` to the HTML element at `trust-framework.html:554`
   - Or check store state directly: `selectShellSurfaceState(state, 'helpSurface')` (most reliable)
3. Consider changing the `sync` guard to use store state rather than DOM inspection:

```js
sync(state) {
  if (!selectShellSurfaceState(state, 'helpSurface')) return;
  render(state);
},
```

---

## Issue 3: Unclear distinction between Info and Context

### Symptoms

Users don't understand the difference between the Context sidebar and the Info overlay.

### Analysis

The two surfaces have distinct technical roles but overlapping user-facing purposes:

| Aspect | Context (`contextSidebar`) | Info (`aboutSurface`) |
|--------|--------------------------|----------------------|
| Scope | Page-specific evaluation guidance | Framework-level background material |
| Content source | `data-topic-area="context"` HTML sections + generated companions | `data-topic-area="about"` HTML sections |
| Updates on navigation | Yes — follows active page or pinned route | Partially — suggests topics based on current page |
| Includes | Criterion companions, page anchors, reference drawer links, source refs | Framework overview, scope/definitions, governance workflow |
| Stability | Changes with every page navigation | Always shows all three topics, just highlights suggestions |

**Why users are confused:**

1. **Button labels are abstract.** "Context" and "Info" don't convey the distinction. A user expects both to provide information about the current section.

2. **Context panel also links to Info topics.** The context route card has an "Info topics" section (`sidebar.js:1181-1211`) with buttons that open the about surface. So clicking something inside "Context" opens "Info," blurring the boundary.

3. **Both show guidance about the same sections.** Context shows page-specific guidance; Info shows framework overview, which also discusses the same sections. The overlap is inherent.

4. **Both use identical visual styling.** Both use `doc-section` blocks with accent-colored borders, `section-kicker` headers, and the same typography tokens.

**Affected files:**
- `trust-framework.html:46-48` — button labels "Context", "Info", "Help"
- `static/js/render/sidebar.js:1144-1215` — context route card includes "Info topics" links
- `static/js/config/sections.js` — `contextTopicId` vs `aboutTopicIds` in section definitions

### Recommended Fix

1. **Rename the buttons** to indicate their purpose:
   - "Context" → "Guidance" or "Page Help"
   - "Info" → "Background" or "Framework"
   - "Help" → "Legend" or "Reference"

2. **Remove Info topic links from the Context panel** or convert them to a single "Open Framework background" link rather than listing individual topics.

3. **Add a one-line description** below each panel title explaining its scope, similar to the existing `panel-caption` elements.

---

## Issue 4: Context/info panel titles not updating properly

### Symptoms

The panel title suffixes (e.g., "Context — Transparent") should update when navigating between pages. This sometimes fails, especially when clicking sidebar links.

### Root Causes

#### 4a. Panel titles updated from DOM reads that may be stale

**File:** `static/js/behavior/navigation.js:542-560`

```js
const syncPanelTitles = (state) => {
  const activePageSection = pageSectionsById.get(state.ui.activePageId) ?? null;
  const activeAccentKey = activePageSection?.dataset.accentKey ?? null;

  ensurePanelTitleSuffix(
    dom.questionnairePanel,
    state.ui.activePageId,
    getHeadingText(activePageSection),
    documentRef,
    activeAccentKey,
  );
  ensurePanelTitleSuffix(
    dom.contextPanel,
    state.ui.activePageId,
    sidebar?.getCurrentContextHeading?.() ?? '',
    documentRef,
    activeAccentKey,
  );
};
```

`getHeadingText` reads the `h2` from the rendered page section in the DOM. If the questionnaire pages haven't been rendered yet for the new active page, `activePageSection` is `null`, and `getHeadingText(null)` returns `''`.

The questionnaire pages are rendered by `questionnaire-pages.js` which is triggered by the store subscription. The subscription fires synchronously from `setActivePage`, but the page rendering happens inside `syncFromState` → `sidebar.sync()` → `refreshPageAnchors()`, which reads existing DOM. The actual form pages are rendered by a separate module.

**File:** `static/js/behavior/navigation.js:58-73`

```js
const getHeadingText = (section) => {
  const heading = section?.querySelector('h2');
  if (!heading) { return ''; }
  // ... filters out completion badges ...
};
```

If `section` is null (page not yet rendered), returns empty string.

**Affected files:**
- `static/js/behavior/navigation.js:542-560` (`syncPanelTitles`)
- `static/js/behavior/navigation.js:58-73` (`getHeadingText`)

#### 4b. Pinned routes prevent title updates

When a user pins the context route (`sidebar.js:1288-1297`), `resolveDisplayedRoute` returns the pinned page's route instead of the live page:

**File:** `static/js/render/sidebar.js:737-753`

```js
const resolveDisplayedRoute = (state) => {
  const liveRoute = buildRoute(state, state.ui.activePageId, state.ui.activeSubAnchorId);

  if (!pinnedRoute?.pageId) {
    return { ...liveRoute, isPinned: false, livePageId: state.ui.activePageId };
  }

  return {
    ...buildRoute(state, pinnedRoute.pageId, pinnedRoute.subAnchorId),
    isPinned: true,
    livePageId: state.ui.activePageId,
  };
};
```

When pinned, `getCurrentContextHeading` returns the pinned page's heading, and `syncPanelTitles` uses it for the context panel title. The questionnaire panel title uses `getHeadingText(activePageSection)` which correctly follows the active page. This creates an inconsistency where the questionnaire title says "Transparent" but the context title says "Reliable" (if pinned to RE).

**Affected files:**
- `static/js/render/sidebar.js:737-753` (`resolveDisplayedRoute`)
- `static/js/render/sidebar.js:1358-1378` (`getCurrentContextHeading`)
- `static/js/behavior/navigation.js:554-559` (context panel title uses `getCurrentContextHeading`)

#### 4c. `navigateToPage` calls `syncPanelTitles` redundantly

`navigateToPage` (`navigation.js:719-756`) calls `syncPanelTitles(store.getState())` at line 754. But `store.actions.setActivePage(pageId)` at line 740 already triggers the subscription which calls `syncFromState` → `syncPanelTitles`. This double invocation is harmless but wastes cycles and can cause a brief visual flicker where the title updates, then re-updates with the same value.

**Affected files:**
- `static/js/behavior/navigation.js:754` (redundant `syncPanelTitles` call)

### Recommended Fix

1. **Fall back to the section definition title** when the page section DOM isn't available:

```js
const getHeadingText = (section, pageId) => {
  if (section) {
    const heading = section.querySelector('h2');
    if (heading) { /* ... existing logic ... */ }
  }
  return getSectionDefinition(pageId)?.title ?? '';
};
```

2. **When pinned, indicate it in the panel title** (e.g., "Context — Reliable (pinned)") so users understand why it doesn't match the active page.

3. **Remove the redundant `syncPanelTitles` call** at `navigation.js:754` since the subscription already handles it.

---

## Issue 5: Proposal — merge into sidebar with tabs

### Current Architecture

The current implementation uses three separate surface mechanisms:

1. **Context sidebar** — Grid column in `.shell-layout`, collapses via `.is-context-collapsed` class
2. **About/Info overlay** — Fixed-position modal overlay at z-index 40
3. **Help overlay** — Fixed-position modal overlay at z-index 40 (currently broken, see Issue 2)

**Key files that would need changes:**

| File | Role | Change needed |
|------|------|--------------|
| `trust-framework.html:46-48` | Surface toggle buttons | Replace with tab bar |
| `trust-framework.html:286-447` | Context panel HTML | Restructure as tabbed panel |
| `trust-framework.html:450-565` | About + Help surfaces | Remove overlay markup, move content into tabbed panel |
| `static/js/behavior/navigation.js:562-657` | `syncShellSurfaces` | Simplify to single panel toggle |
| `static/js/behavior/navigation.js:781-856` | `setOverlaySurfaceOpen` | Remove or refactor |
| `static/js/render/sidebar.js` | Context rendering | Integrate tab state |
| `static/js/render/about-panel.js` | About panel rendering | Adapt to render inside tab instead of overlay |
| `static/js/render/help-panel.js` | Help panel rendering | Adapt to render inside tab instead of overlay |
| `static/css/layout.css:324-391` | Surface overlay CSS | Remove overlay styles, add tab panel styles |
| `static/css/components.css` | Component styles | Add tab bar component styles |
| `static/js/state/store.js:121-125` | Surface visibility state | Simplify from 3 surfaces to 1 panel with active tab |

### Feasibility Assessment

**Pros:**
- Eliminates all overlay-related issues (z-index conflicts, backdrop coverage, simultaneous surfaces)
- Single show/hide toggle is simpler for users
- Reduces surface management complexity in `navigation.js`
- Consistent content location (always the right panel)
- Natural tab model: Context | Info | Help

**Cons:**
- Context sidebar currently shows page anchors and pin controls alongside content — tabs would need to preserve this
- About panel has a two-column layout (nav + view) that would need adaptation
- Help panel is dynamically generated per-state — would need to render on tab switch
- The context sidebar in drawer mode (<=1160px) has its own transitions that would need merging with tab switching
- Significant refactoring of `navigation.js` surface management (~200 lines)

### Implementation Sketch

**State change:**
```
surfaces: {
  contextSidebar: true,
  aboutSurface: false,
  helpSurface: false,
}
→
sidebarPanel: {
  isOpen: true,
  activeTab: 'context', // 'context' | 'info' | 'help'
}
```

**DOM structure:**
```html
<aside class="panel framework-panel" id="frameworkPanel">
  <div class="panel-title-row">
    <div class="sidebar-tab-bar">
      <button data-sidebar-tab="context" class="is-active">Guidance</button>
      <button data-sidebar-tab="info">Background</button>
      <button data-sidebar-tab="help">Legend</button>
    </div>
    <button data-surface-dismiss="contextSidebar">Close</button>
  </div>
  <div class="sidebar-tab-panels">
    <div data-tab-panel="context" class="tab-panel is-active">
      <!-- Existing context content -->
    </div>
    <div data-tab-panel="info" class="tab-panel">
      <!-- About panel content (framework overview, scope, governance) -->
    </div>
    <div data-tab-panel="help" class="tab-panel">
      <!-- Help panel content (legend, shortcuts) -->
    </div>
  </div>
</aside>
```

**Button change in header:**
```html
<!-- Single toggle replaces three buttons -->
<button data-surface-toggle="contextSidebar">Panel</button>
```

Or keep all three buttons but have them open the panel and switch to the corresponding tab.

### Migration Steps

1. Fix Issues 1-4 first (especially Issue 2 — help panel must work before merging)
2. Add `sidebarPanel.activeTab` to store state
3. Create tab bar component in sidebar rendering
4. Move about-panel rendering into a tab panel function
5. Move help-panel rendering into a tab panel function (fix `createChip` bug first)
6. Replace `syncShellSurfaces` with a simpler `syncSidebarPanel` that handles tab switching
7. Remove overlay surface CSS (`layout.css:324-391`)
8. Update responsive behavior (drawer mode still slides in from right, but with tabs)
9. Update keyboard shortcuts (Escape closes panel, tab switching via keyboard)
10. Update focus management and ARIA roles for tab interface

---

## Appendix: File Index

| File | Lines | Relevance |
|------|-------|-----------|
| `trust-framework.html` | 569 | HTML structure for all surfaces |
| `static/js/behavior/navigation.js` | 1093 | Surface toggle/open/close, panel metrics, shell sync |
| `static/js/render/sidebar.js` | 1388 | Context panel rendering, route resolution, pinning |
| `static/js/render/about-panel.js` | 248 | Info overlay rendering, topic navigation |
| `static/js/render/help-panel.js` | 449 | Help overlay rendering (broken: wrong selector + undefined `createChip`) |
| `static/js/render/reference-drawers.js` | 299 | Reference drawer rendering (related but functional) |
| `static/js/behavior/context-tracking.js` | 131 | Hash-based deep linking, sub-anchor tracking |
| `static/js/config/sections.js` | 530 | Section definitions with context/about topic IDs |
| `static/js/state/store.js` | 877 | Surface visibility state, actions |
| `static/css/layout.css` | 556 | Surface overlay layout, shell grid, drawer mode |
| `static/css/components.css` | 1633 | Surface card, context route card, help panel components |
| `static/css/interaction-states.css` | 1500 | Surface toggle button states, aria-expanded styling |
| `static/css/tokens.css` | 378 | Help-family tokens, z-index scale |
