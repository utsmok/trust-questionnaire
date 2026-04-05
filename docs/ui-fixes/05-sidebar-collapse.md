# Plan 05: Sidebar Collapse Bug & Animation

## Summary
Fix the form-clearing bug (missing `type="button"`) and improve the collapse animation by using design tokens, containment, and preventing re-renders during animation.

## Files to Modify

| File | Changes |
|------|---------|
| `static/js/render/sidebar.js` | Add `type="button"` to collapse toggle |
| `static/css/components.css` | Use design tokens for transition; add containment |
| `static/css/layout.css` | Add `contain` and `will-change` to layout columns |
| `static/js/state/store.js` | Add equality check to `setPanelMetrics` |

## Implementation Steps

### Step 1: Fix form-clearing bug (`sidebar.js`)
**Root cause**: Missing `type="button"` on `toggleBtn` causes form submission inside `<form>`.

Add after line ~744:
```js
const toggleBtn = documentRef.createElement('button');
toggleBtn.type = 'button';  // ADD THIS — prevents form submission
toggleBtn.className = 'nav-button sidebar-collapse-toggle';
```

### Step 2: Improve animation timing (`components.css`)
Replace hardcoded values with design tokens:
```css
.workspace-layout {
  transition: grid-template-columns var(--duration-normal) var(--ease-out-quart);
}
```

### Step 3: Add containment (`layout.css`)
Add `contain: layout style paint` to both columns to isolate relayouts:

```css
.page-index-column {
  position: sticky;
  top: 0;
  align-self: start;
  contain: layout style paint;
  overflow: hidden;
}

.questionnaire-workspace {
  min-width: 0;
  display: grid;
  gap: var(--space-5-5);
  contain: layout style paint;
}
```

### Step 4: Prevent re-renders during animation (`store.js`)
Add equality check to `setPanelMetrics` (~line 802):

```js
const setPanelMetrics = (panelName, metrics) =>
  commit((previousState) => {
    if (!Object.values(PANEL_NAMES).includes(panelName)) {
      return previousState;
    }
    const prevMetrics = previousState.ui.panelMetrics?.[panelName];
    if (
      prevMetrics &&
      prevMetrics.progressPercent === metrics.progressPercent &&
      prevMetrics.canScrollUp === metrics.canScrollUp &&
      prevMetrics.canScrollDown === metrics.canScrollDown
    ) {
      return previousState;
    }
    return {
      ...previousState,
      ui: createUiState({
        ...previousState.ui,
        panelMetrics: {
          ...previousState.ui.panelMetrics,
          [panelName]: clonePanelMetrics(metrics),
        },
      }),
    };
  });
```

## Root Cause Analysis
1. **Bug**: `<button>` without `type="button"` inside `<form>` defaults to submit
2. **Jank**: `grid-template-columns` animation forces full relayout every frame; no containment; `setPanelMetrics` fires on every scroll event without equality check, triggering full DOM re-renders during animation
