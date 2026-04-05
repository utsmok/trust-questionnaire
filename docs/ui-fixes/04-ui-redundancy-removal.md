# Plan 04: UI Redundancy Removal

## Summary
Remove redundant labels, pills, titles, status text, and improve tooltip styling.

## Files to Modify

| File | Changes |
|------|---------|
| `static/js/utils/shared.js` | Remove "req" from `formatSectionProgressCompact()` |
| `static/js/behavior/navigation.js` | Remove "req" from `formatProgressBadgeText()` |
| `static/js/render/sidebar.js` | Remove workflow state pills, "not started" pills, group subheaders |
| `static/js/behavior/pager.js` | Clear pager status text |
| `trust-framework.html` | Visually hide title + subtitle |
| `static/css/components.css` | Hide `.panel-caption`, `.pager-status`; tooltip improvements |

## Implementation Steps

### Step 1: Remove "req" from pills

#### 1a: `formatSectionProgressCompact()` (`shared.js` ~line 149-167)
Change:
```js
// FROM:
return `${sectionProgress.satisfiedRequiredFieldCount}/${sectionProgress.applicableRequiredFieldCount} req`;
// TO:
return `${sectionProgress.satisfiedRequiredFieldCount}/${sectionProgress.applicableRequiredFieldCount}`;
```

#### 1b: `formatProgressBadgeText()` (`navigation.js` ~line 35-51)
Change:
```js
// FROM:
return `${label} · ${sectionProgress.satisfiedRequiredFieldCount}/${sectionProgress.applicableRequiredFieldCount} req`;
// TO:
return `${label} · ${sectionProgress.satisfiedRequiredFieldCount}/${sectionProgress.applicableRequiredFieldCount}`;
```

#### 1c: `formatGroupProgressSummary()` (`sidebar.js` ~line 175-200)
Change:
```js
// FROM:
`${groupProgress.satisfiedRequiredFieldCount}/${groupProgress.applicableRequiredFieldCount} req`
// TO:
`${groupProgress.satisfiedRequiredFieldCount}/${groupProgress.applicableRequiredFieldCount}`
```

### Step 2: Remove editable/read-only/system-skipped pills from page index

In `sidebar.js` `renderPageIndex()`:
- Remove `workflowState` element creation (~lines 833-835)
- Remove `workflowState` from `meta.append()` call (~line 851)
- Remove `WORKFLOW_STATE_LABELS` constant (~lines 112-116) if unused elsewhere

### Step 3: Remove "not started" pills

In `sidebar.js` `renderPageIndex()` (~lines 837-844):
- If `canonicalState` is `not_started`, don't render the status pill, or set its text to empty
- Add CSS rule: `.page-index-status[data-progress-state='not_started'] { display: none; }`
- Also hide progress pill when not started: `.page-index-progress[data-progress-state='not_started'] { display: none; }`

Also check `formatProgressStateLabel()` in `shared.js` — consider returning empty string for `not_started`.

### Step 4: Remove group subheaders from page index

In `sidebar.js` `renderPageIndex()`:
- Remove entire `if (pageDefinition?.completionGroupId !== lastCompletionGroupId)` block (~lines 764-789)
- Remove `lastCompletionGroupId` variable (~line 735)
- Optionally remove `formatGroupProgressSummary()` function (~lines 175-200)

### Step 5: Remove main title + subtitle

In `trust-framework.html`:
- Line 63: Add `class="visually-hidden"` to `<h1>` (keep for accessibility but hide visually)
- Line 68: Remove `<p class="panel-caption">` element entirely, or add `style="display:none"`

In `navigation.js`:
- Simplify `ensurePanelTitleSuffix()` (~lines 70-99) — no longer needs to update visible title

### Step 6: Remove pager status text

In `pager.js`:
- Set `refs.status.textContent = ''` or `refs.status.hidden = true` in the `sync()` function (~line 130-141)
- Remove `WORKFLOW_STATE_LABELS` constant (~lines 4-8)

### Step 7: Tooltip styling improvements

In `components.css`:

#### 7a: Increase tooltip width
```css
.tooltip-content {
  max-width: 28rem;  /* was 18rem */
}
```

#### 7b: Ensure sentence case in tooltip text
No CSS uppercase issue — the tooltip text comes directly from schema definitions. Verify tooltip text in `questionnaire-schema.js` is sentence case. Search all `tooltip:` properties and fix any that are ALL CAPS.

#### 7c: Reduce trigger button size (optional)
```css
.tooltip-trigger-btn {
  width: 28px;  /* was 44px */
  height: 28px; /* was 44px */
}
```

## Notes
- The `formatSectionProgressCompact` function is also used in `help-panel.js` line 135 — removing "req" there too is fine
- Removing `getCompletionGroupLabel` from `shared.js` should wait — it's used in `help-panel.js` line 139
