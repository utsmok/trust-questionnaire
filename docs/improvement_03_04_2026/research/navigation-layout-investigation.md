# Navigation Layout Investigation

Date: 2026-04-04

Scope: Quick jump bar, completion strip, section coloring, sidebar resize, and related surface controls.

---

## Issue 1: Quick Jump Navigation — Styling, Functionality, and Content Problems

### 1A. Context button is always deep dark blue with black text

**Symptom**: The "Context" toggle in the quick jump bar renders as a solid dark navy rectangle with barely legible text whether active or inactive.

**Root cause**: Two-part failure in CSS token resolution.

1. **No per-surface identity for Context**: The Info and Help buttons have dedicated unexpanded styles via `interaction-states.css:1023-1028`:

   ```css
   .shell-action-button[data-surface-toggle='aboutSurface'],
   .shell-action-button[data-surface-toggle='helpSurface'] {
     border-color: var(--help-border);
     background: var(--help-tint);
     color: var(--help-accent-strong);
   }
   ```

   There is **no equivalent rule** for `data-surface-toggle='contextSidebar'`. The Context button falls through to the base `.nav-button` styles (`background: var(--ut-white); color: var(--ut-navy)`) which should be fine in the default state. However, the Context sidebar defaults to **open** (`DEFAULT_SURFACE_VISIBILITY` in `store.js:122` sets `contextSidebar: true`), so the button is almost always in the `aria-expanded='true'` state.

2. **Broken `--section-on-accent` on `.shell-action-button`**: When `aria-expanded='true'`, the rule at `interaction-states.css:1017-1021` applies:

   ```css
   .shell-action-button[aria-expanded='true'] {
     background: var(--ut-darkblue);
     border-color: var(--ut-darkblue);
     color: var(--section-on-accent);
   }
   ```

   `--section-on-accent` is only defined inside the `:where()` block at `accent-scoping.css:113-136`, which targets `.doc-section, .form-section, .criterion-card, .nav-button[data-page-id], .page-index-button, .strip-cell, ...`. The `.shell-action-button` class is **not in this list**, so `--section-on-accent` is **undefined** on the button. The `color` property becomes invalid-at-computed-value-time and inherits from the parent — which resolves to `var(--ut-navy)` (#002c5f, dark navy).

   Result: **dark navy background** (`var(--ut-darkblue)`) with **dark navy text** (inherited `color`) — essentially illegible.

**Affected files and lines**:
| File | Lines | Issue |
|------|-------|-------|
| `static/css/interaction-states.css` | 1017-1021 | Uses undefined `--section-on-accent` on `.shell-action-button` |
| `static/css/accent-scoping.css` | 113-136 | `:where()` block excludes `.shell-action-button` |
| `static/js/state/store.js` | 122 | `contextSidebar` defaults to `true`, ensuring the button is almost always in expanded state |
| `static/css/interaction-states.css` | 1023-1028 | Info/Help have dedicated unexpanded styles; Context does not |

**Recommended fix**:
- Add `.shell-action-button` to the `:where()` block in `accent-scoping.css`, OR define `--section-on-accent` explicitly on `.shell-action-button[aria-expanded='true']` (e.g., `color: var(--ut-white)`).
- Add a dedicated unexpanded style for `data-surface-toggle='contextSidebar'` matching the pattern used for aboutSurface/helpSurface.
- Consider whether Context should default to open. If so, the button styling must work in expanded state.

### 1B. Surfaces break layout / unclear toggle behavior

**Symptom**: Clicking Context, Info, or Help opens a large dark-blue semi-transparent rectangle covering the viewport. They appear to be simple toggles but behave differently from each other.

**Root cause**: Three surfaces with different behaviors that look identical:

1. **Context sidebar** (`contextSidebar`): On desktop (>1160px), this is a persistent side panel controlled by `shell-layout` CSS grid (`layout.css:225-235`). Opening/closing it changes `is-context-collapsed` on the shell root, which toggles between a two-column and single-column grid. The Context button toggles this panel visibility.

2. **About surface** (`aboutSurface`): A fixed-position overlay (`shell-surface`, `layout.css:324-336`) with a semi-transparent dark backdrop (`background: color-mix(in srgb, var(--ut-text) 88%, var(--ut-grey))` → dark navy). Contains a `.surface-card` on the right.

3. **Help surface** (`helpSurface`): Same overlay pattern as About.

The "large blue rectangle" is the `.shell-surface` overlay background — `color-mix(in srgb, #172033 88%, #eef0f3)` is a very dark navy. This is working as designed (overlay pattern), but visually it looks broken because:
- The backdrop is very dark and opaque
- The surface card appears on the right with no visual connection to the button that opened it
- The Context sidebar is NOT an overlay on desktop, so users don't expect the same visual treatment

**Toggle ambiguity**: All three buttons are styled identically (`.nav-button.shell-action-button`) with no visual differentiation. Users cannot tell that Context controls a sidebar while Info/Help open overlays.

**Affected files and lines**:
| File | Lines | Issue |
|------|-------|-------|
| `trust-framework.html` | 45-49 | Three buttons look identical in the nav |
| `static/css/layout.css` | 324-336 | `.shell-surface` overlay styling (dark backdrop) |
| `static/css/interaction-states.css` | 1023-1035 | Info/Help have their own color family but Context does not |
| `static/js/behavior/navigation.js` | 898-936 | All three use the same click handler pattern |

### 1C. Surfaces can be activated simultaneously

**Symptom**: Context sidebar + About overlay + Help overlay can all be open at the same time.

**Root cause**: Mutual exclusion is incomplete:

- **About ↔ Help**: Properly mutually exclusive. `navigation.js:802-806` closes other overlay surfaces when opening one:
  ```js
  OVERLAY_SURFACE_NAMES.filter((candidate) => candidate !== surfaceName).forEach(
    (candidate) => { store.actions.setSurfaceOpen(candidate, false); }
  );
  ```
  `OVERLAY_SURFACE_NAMES = ['aboutSurface', 'helpSurface']` (line 18).

- **Context ↔ Overlays on desktop**: NOT mutually exclusive. The exclusion at `navigation.js:787-793` only fires when `isContextDrawerMode` is true (viewport ≤1160px):
  ```js
  if (isOpen && isContextDrawerMode && selectShellSurfaceState(..., 'contextSidebar')) {
    setContextSidebarOpen(false, { focusAfterClose: false });
  }
  ```
  On desktop (>1160px), the context sidebar is a persistent panel, so it intentionally coexists with overlays.

- **Overlay → Context**: When opening context sidebar in drawer mode (`navigation.js:274-280`), overlays are closed. But this only applies to drawer mode.

- **Escape key**: `navigation.js:982-1005` handles Escape to close surfaces in priority order (help → about → context drawer). This works correctly.

**Assessment**: The simultaneous state is arguably correct on desktop — the sidebar is persistent, and overlays float above it. The real issue is visual confusion from 1A/1B, not a logic bug.

**Affected files and lines**:
| File | Lines | Issue |
|------|-------|-------|
| `static/js/behavior/navigation.js` | 18 | `OVERLAY_SURFACE_NAMES` excludes `contextSidebar` |
| `static/js/behavior/navigation.js` | 274-280 | Context drawer closes overlays (drawer mode only) |
| `static/js/behavior/navigation.js` | 787-793 | Overlay opening closes context (drawer mode only) |

### 1D. Bug: `setShellSurfaceOpen` is not defined

In `navigation.js:822`, the focus trap's `onEscape` callback calls:
```js
setShellSurfaceOpen(escSurfaceName, false, { trigger: null });
```

This function does not exist. The correct function is `setOverlaySurfaceOpen` (defined at line 781). This causes a `ReferenceError` when pressing Escape while focus is trapped inside the About or Help surface card.

**Affected file**: `static/js/behavior/navigation.js:822`

---

## Issue 2: Duplication of Navigation Bars

### Current structure

The header contains two navigation bars side by side:

**Completion strip** (`<ul class="completion-strip">`, `trust-framework.html:44`):
- Populated by `renderCompletionStrip()` in `sidebar.js:776-820`
- Shows ALL 13 pages: S0, S1, S2, TR, RE, UC, SE, TC, S8, S9, S10A, S10B, S10C
- Each cell displays a page code (e.g., "TR") and progress state
- Cells have `data-accent-key` but colors are overridden (see Issue 3)
- Cells have `aria-hidden="true"` and `role="presentation"` — **not keyboard accessible, not clickable**
- Styled as small colored blocks (`min-width: 3.2rem`, `height: 28px`)

**Quick jump nav** (`<nav class="top-nav" id="quickJumpMount">`, `trust-framework.html:45`):
- Populated by `renderQuickJump()` in `sidebar.js:822-893`
- Shows 5 principle buttons: TR, RE, UC, SE, TC (from `QUICK_JUMP_SECTION_IDS` in `sections.js:518-520`)
- Also contains Context, Info, Help toggle buttons (hardcoded in HTML)
- Has a `nav-indicator` sliding underline
- Principle buttons are keyboard-accessible and clickable for navigation
- Context/Info/Help buttons toggle surfaces

### Overlap and redundancy

Both bars display the 5 principle codes (TR, RE, UC, SE, TC). The completion strip shows progress via `data-progress-state` on each cell; the quick jump shows the same progress via `data-progress-state` on each button.

The completion strip cells are purely presentational (`aria-hidden="true"`, `role="presentation"`) — they cannot be clicked for navigation. The quick jump buttons CAN be clicked for navigation.

The header grid layout (`layout.css:20-28`):
```css
.header-inner {
  grid-template-columns: auto 1fr auto;
}
```
Places brand | completion-strip | top-nav, with the completion strip taking `1fr`.

### Proposal assessment: Consolidate into one bar

**Move Context/Info/Help to top-right as a "show/hide sidebar" toggle**:
- The Context toggle already exists as `#toolbarContextToggle` inside the questionnaire panel header (`trust-framework.html:70`). This could be promoted to the header.
- Info and Help could be consolidated into a single "More" or "?" button that opens a combined surface.
- Alternatively, they could become icons instead of text buttons.

**Drop TR/RE/UC/SE/TC blocks from quick jump**:
- The quick jump's principle buttons would be removed.
- The `nav-indicator` would no longer be needed.

**Make completion-strip blocks clickable for navigation**:
- Currently `aria-hidden="true"` and `role="presentation"`.
- Would need to become `<button>` elements (currently `<li>`).
- Would need click handlers (currently none).
- Would need `aria-label` for screen readers.
- Would need keyboard focus management.

**Keep progress indication**:
- The `data-progress-state` + CSS rules in `interaction-states.css:1315-1357` already provide visual progress indication per cell.
- The completion strip already has `filled` class toggle for complete state.

**Affected files for consolidation**:
| File | Lines | Role |
|------|-------|------|
| `trust-framework.html` | 44-49 | HTML structure of both bars |
| `static/js/render/sidebar.js` | 776-893 | `renderCompletionStrip()` and `renderQuickJump()` |
| `static/css/components.css` | 4-53 | `.completion-strip` and `.strip-cell` styles |
| `static/css/components.css` | 55-85 | `.nav-button` and `.nav-indicator` styles |
| `static/css/interaction-states.css` | 6-29, 53-81 | `.strip-cell.filled` and `.nav-button.active` colors |
| `static/css/interaction-states.css` | 1254-1302, 1304-1357 | Nav button and strip cell progress states |
| `static/css/layout.css` | 77-84 | `.top-nav` layout |
| `static/js/config/sections.js` | 518-520 | `QUICK_JUMP_SECTION_IDS` |

---

## Issue 3: Section Coloring Wrong — Active Section Color Applied Globally

### Symptom

In the completion strip and the page-index left sidebar, ALL cells/buttons are colored using the CURRENTLY VIEWED section's color tokens. When viewing "Transparent" (TR, blue), all strip cells appear blue. When switching to "Reliable" (RE, green), all cells turn green. Each cell should retain its own section color (TR=blue, RE=green, UC=purple, SE=orange, TC=teal) regardless of which section is currently active.

### Root cause

The accent color system has two layers that conflict:

**Layer 1: Body-level active accent** (`accent-scoping.css:1-111`)

Sets `--active-section-accent`, `--active-section-accent-strong`, `--active-section-tint`, `--active-section-border`, `--active-section-on-accent` on `<body>` based on `data-active-accent-key`:
```css
body[data-active-accent-key='tr'] {
  --active-section-accent: var(--section-tr-accent);
  --active-section-tint: var(--section-tr-tint);
  /* ... */
}
```

This is driven by `syncActiveAccent()` in `navigation.js:531-539`:
```js
const accentKey = activePageSection?.dataset.accentKey ?? 'control';
documentRef.body.dataset.activeAccentKey = accentKey;
```

**Layer 2: Element-level override** (`accent-scoping.css:113-136`)

A `:where()` block overrides `--section-accent`, `--section-tint`, etc. on ALL matching elements to equal the body's active values:
```css
:where(
  .doc-section,
  .form-section,
  .criterion-card,
  .nav-button[data-page-id],
  .page-index-button,
  .context-route-card,
  .context-anchor-card,
  .context-anchor-button,
  .about-topic-meta,
  .about-topic-button,
  .about-topic-page,
  .context-route-code,
  .strip-cell,
  .surface-card[data-accent-key],
  .panel-title-section[data-accent-key],
  .help-section-item
) {
  --section-accent: var(--active-section-accent);
  --section-accent-strong: var(--active-section-accent-strong);
  --section-tint: var(--active-section-tint);
  --section-border: var(--active-section-border);
  --section-on-accent: var(--active-section-on-accent);
}
```

This `:where()` selector has zero specificity but applies to **every** `.strip-cell` and `.page-index-button` in the DOM. It forces all of them to resolve `--section-accent` (and friends) to the ACTIVE section's color tokens, overriding any per-element `data-accent-key` that might have been set.

**Layer 3: Per-element `data-accent-key` is set but unused**

In `sidebar.js`, `renderCompletionStrip()` sets `data-accent-key` on each cell:
```js
cell.dataset.accentKey = pageDefinition?.accentKey ?? 'control';  // line 804
```

And `renderPageIndex()` does the same:
```js
button.dataset.accentKey = pageDefinition?.accentKey ?? 'control';  // line 955
```

These attributes are set correctly (e.g., TR cells get `data-accent-key="tr"`, RE cells get `data-accent-key="re"`). However, there are **no CSS rules** that use `data-accent-key` to resolve per-element section colors. The `:where()` override wipes out any individuality.

**How colors are consumed**: The interaction-states.css rules reference `var(--section-accent)` etc.:

```css
/* interaction-states.css:1304-1308 */
.strip-cell[data-accent-key] {
  border-color: var(--section-border);
  box-shadow: inset 0 -2px 0 var(--section-border);
}

/* interaction-states.css:1345-1350 */
.strip-cell[data-progress-state='in_progress'] {
  background: var(--section-tint);
  border-color: var(--section-border);
  box-shadow: inset 0 -3px 0 var(--section-accent);
  color: var(--section-accent-strong);
}

/* interaction-states.css:931-936 */
.page-index-button.is-active {
  background: var(--section-tint);
  border-color: var(--section-border);
  border-left-color: var(--section-accent);
}
```

All of these resolve to the active section's colors because of the `:where()` override.

### Which elements are affected

| Element | File | Lines | Has `data-accent-key` | Affected by `:where()` override |
|---------|------|-------|----------------------|--------------------------------|
| `.strip-cell` | `sidebar.js` | 799-804 | Yes | **Yes** — always uses active color |
| `.page-index-button` | `sidebar.js` | 953-955 | Yes | **Yes** — always uses active color |
| `.nav-button[data-page-id]` | `sidebar.js` | 841-843 | Yes | **Yes** — always uses active color |
| `.context-route-card` | `sidebar.js` | 1017 | Yes | **Yes** — but this is correct (shows current route) |
| `.context-anchor-card` | `sidebar.js` | 1017 | Yes | **Yes** — correct (shows current route) |
| `.doc-section` / `.form-section` | `questionnaire-pages.js` | 1483-1500 | Yes | **Yes** — correct (only active section is visible) |
| `.criterion-card` | `questionnaire-pages.js` | 1411-1455 | Yes (via accentClass) | **Yes** — correct (belongs to active page) |

The bug specifically affects **navigation elements** that need per-element identity: `.strip-cell`, `.page-index-button`, and `.nav-button[data-page-id]`. The active-accent override is correct for content elements (doc sections, criterion cards, context panels) because only the active page is visible.

### Recommended fix approach

**Option A: Per-element accent-key CSS rules**

Remove `.strip-cell`, `.page-index-button`, and `.nav-button[data-page-id]` from the `:where()` block in `accent-scoping.css`. Then add explicit per-key rules:

```css
/* In accent-scoping.css or a new file */
.strip-cell[data-accent-key='tr'],
.page-index-button[data-accent-key='tr'],
.nav-button[data-page-id][data-accent-key='tr'] {
  --section-accent: var(--section-tr-accent);
  --section-accent-strong: var(--section-tr-accent-strong);
  --section-tint: var(--section-tr-tint);
  --section-border: var(--section-tr-border);
  --section-on-accent: var(--section-tr-on-accent);
}
/* Repeat for re, uc, se, tc, control, profile, setup, reference, recommendation, governance */
```

This preserves the existing `var(--section-accent)` consumption in `interaction-states.css` without requiring changes to those rules. Each element resolves its own colors from its `data-accent-key`.

**Option B: Use CSS custom properties directly in JS**

When rendering each cell/button, set inline CSS custom properties:
```js
cell.style.setProperty('--section-accent', `var(--section-${accentKey}-accent)`);
cell.style.setProperty('--section-tint', `var(--section-${accentKey}-tint)`);
// etc.
```

This avoids adding many CSS rules but couples rendering more tightly to the token system.

**Option A is recommended** because it keeps the token mapping in CSS where it belongs and is consistent with how `body[data-active-accent-key]` works.

### Files to modify

| File | Change |
|------|--------|
| `static/css/accent-scoping.css:113-136` | Remove `.strip-cell`, `.page-index-button`, `.nav-button[data-page-id]` from `:where()` block |
| `static/css/accent-scoping.css` | Add per-`data-accent-key` rules for navigation elements |
| No JS changes needed | `data-accent-key` is already set correctly on all elements |

---

## Issue 4: Sidebar Width Dragging

### Current state

The context sidebar width is fixed by CSS grid:
```css
/* layout.css:229 */
.shell-layout {
  grid-template-columns: minmax(0, 1.45fr) minmax(20rem, 28rem);
}
```

The sidebar (`framework-panel`) takes `minmax(20rem, 28rem)` — between 320px and 448px. There is no resize handle, no `resize` CSS property, and no drag-related JS code.

### Implementation approach

A draggable divider would need:

1. **HTML**: A resize handle element between the two panels:
   ```html
   <div class="shell-divider" role="separator" aria-orientation="vertical" 
        aria-label="Resize panels" tabindex="0"></div>
   ```

2. **CSS**: Position the handle on the panel boundary:
   ```css
   .shell-divider {
     grid-column: 2;
     grid-row: 1;
     width: 6px;
     cursor: col-resize;
     background: transparent;
     position: relative;
     z-index: 5;
   }
   .shell-divider:hover,
   .shell-divider.is-dragging {
     background: var(--ut-blue);
   }
   ```

3. **JS**: Pointer event handling to update the grid template:
   ```js
   // On pointerdown: record initial X and sidebar width
   // On pointermove: calculate delta, clamp sidebar width (min 16rem, max 40rem)
   // Set shell.style.gridTemplateColumns = `minmax(0, 1fr) ${newWidth}px`
   // On pointerup: cleanup
   ```

4. **State persistence**: Store the user's preferred width in `localStorage` and restore on load.

5. **Responsive considerations**:
   - On mobile (≤1160px), the sidebar becomes a drawer and the divider should be hidden.
   - The divider should not appear when the sidebar is collapsed.
   - Min/max widths should prevent the sidebar from becoming unusably narrow or too wide.

### Affected files

| File | Change |
|------|--------|
| `trust-framework.html` | Add `.shell-divider` element between questionnaire panel and framework panel |
| `static/css/layout.css` | Add `.shell-divider` styles, update grid to 3 columns |
| `static/js/behavior/navigation.js` | Add pointer event handling for drag |
| `static/js/state/store.js` | Optionally persist sidebar width in UI state |

### Grid layout change

Current: `grid-template-columns: minmax(0, 1.45fr) minmax(20rem, 28rem)`
Proposed: `grid-template-columns: minmax(0, 1fr) var(--sidebar-width, 24rem) minmax(0, 1fr)` (if divider takes a column) or keep 2-column with the divider absolutely positioned on the edge.

The simpler approach is to keep the 2-column grid and absolutely position the divider on the left edge of the framework panel. The drag handler updates a CSS custom property `--sidebar-width` on the shell root.

---

## Summary of All Findings

| # | Issue | Severity | Root cause | Primary files |
|---|-------|----------|------------|---------------|
| 1A | Context button illegible | High | `--section-on-accent` undefined on `.shell-action-button`; no per-surface style for context | `interaction-states.css:1017-1021`, `accent-scoping.css:113-136` |
| 1B | Surfaces look broken | Medium | Three different surface types styled identically; dark overlay appears jarring | `layout.css:324-336`, `trust-framework.html:45-49` |
| 1C | Simultaneous surfaces | Low | Intentional on desktop (sidebar is persistent); confusion from 1A/1B amplifies perception | `navigation.js:18, 274-280, 787-793` |
| 1D | `setShellSurfaceOpen` undefined | High | Typo in focus trap onEscape callback — should be `setOverlaySurfaceOpen` | `navigation.js:822` |
| 2 | Duplicate navigation bars | Medium | Completion strip and quick jump both show TR/RE/UC/SE/TC; strip is not interactive | `sidebar.js:776-893`, `trust-framework.html:44-49` |
| 3 | Section coloring wrong | High | `:where()` in `accent-scoping.css` overrides per-element `data-accent-key` colors with active section colors | `accent-scoping.css:113-136` |
| 4 | Sidebar width dragging | Feature | No resize mechanism exists; fixed `minmax(20rem, 28rem)` grid column | `layout.css:229` |
