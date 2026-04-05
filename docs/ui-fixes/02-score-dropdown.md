# Plan 02: Custom Score Dropdown

## Summary
Replace the bare native `<select>` dropdown with a custom styled component that shows score-level colors (red/orange/teal/green) matching the old radio button aesthetic.

## Files to Modify

| File | Changes |
|------|---------|
| `static/js/config/questionnaire-schema.js` | Change control from `'dropdown'` to `'score_dropdown'` |
| `static/js/render/dom-factories.js` | Add `createScoreDropdown()` factory function |
| `static/js/render/questionnaire-pages.js` | Add import, resolve case, render case for `score_dropdown` |
| `static/js/behavior/field-handlers.js` | Add `syncScoreDropdown()` + click/keyboard handlers |
| `static/css/components.css` | Add `.score-dropdown*` structural CSS |
| `static/css/interaction-states.css` | Add score-dropdown color states + validation selectors |

## Implementation Steps

### Step 1: Schema change (`questionnaire-schema.js`)
Line 347: `control: 'dropdown'` → `control: 'score_dropdown'`

### Step 2: Factory function (`dom-factories.js`)
Add new exported function `createScoreDropdown()` after `createRatingScale()` (~line 781).

**DOM structure**:
```
div.score-dropdown[data-field-id][data-control-kind]
  button.score-dropdown-trigger[aria-haspopup="listbox"][aria-expanded="false"]
    span.score-dropdown-indicator   (colored dot)
    span.score-dropdown-value       (selected text or "Select a score")
    span.score-dropdown-arrow       (▾)
  div.score-dropdown-panel[role="listbox"][hidden]
    div.score-dropdown-option[data-option-value="0"][role="option"]
      span.score-dropdown-option-dot
      span.score-dropdown-option-value  "0"
      span.score-dropdown-option-label  "Fails"
    ... (1, 2, 3)
```

**Key details**:
- Use `fieldModel.optionSet?.options` (from `CRITERION_SCORE` option set)
- Each option has `value`, `label`, `shortLabel`
- Hidden native `<select>` is NOT needed — event delegation handles clicks

### Step 3: Rendering integration (`questionnaire-pages.js`)
- Add `createScoreDropdown` to imports from `dom-factories.js`
- In `resolveFieldBodyKind()`: add case for `field.control === 'score_dropdown'`
- In `createFieldBodyElement()`: add `case 'score_dropdown':` calling the factory

### Step 4: Sync handler (`field-handlers.js`)
Add `syncScoreDropdown(fieldGroup, fieldState)`:
- Update trigger text and color class based on value
- Close panel
- Toggle `.score-dropdown--score-N` class for selected color
- Handle disabled/readonly state
- Add to `syncFieldGroup` switch: `case 'score_dropdown':`

### Step 5: Click/keyboard handlers (`field-handlers.js`)
Extend `initializeFieldHandlers`:
- Click `.score-dropdown-trigger` → toggle panel open/closed
- Click `.score-dropdown-option` → set value via `store.actions.setFieldValue`
- Click outside → close panel
- Keyboard: Enter/Space open, arrows navigate, Enter select, Escape close
- Add `data-field-id` to the trigger for event delegation

### Step 6: Structural CSS (`components.css`)
Add ~130 lines for:
- `.score-dropdown` — relative positioning
- `.score-dropdown-trigger` — styled button with flex layout
- `.score-dropdown-indicator` — colored dot (8px circle)
- `.score-dropdown-value` — flex text
- `.score-dropdown-arrow` — dropdown caret
- `.score-dropdown-panel` — absolute positioned panel
- `.score-dropdown-option` — option rows with dot + value + label
- `.is-open`, `.is-disabled`, `.is-selected` states

### Step 7: Color states (`interaction-states.css`)
Add score-dropdown color states mirroring the old rating scale:

For each score N (0-3):
```css
.score-dropdown--score-N .score-dropdown-trigger {
  background: var(--score-N-tint);
  border-color: var(--score-N-border);
  border-left: 3px solid var(--score-N);
  color: var(--score-N);
  font-weight: 700;
}
.score-dropdown--score-N .score-dropdown-indicator { background: var(--score-N); }
```

Option colors in the open panel:
```css
.score-dropdown-option[data-option-value="N"] { border-left-color: var(--score-N-border); }
.score-dropdown-option[data-option-value="N"]:hover { background: var(--score-N-tint); }
.score-dropdown-option[data-option-value="N"].is-selected .score-dropdown-option-dot { background: var(--score-N); }
```

### Step 8: Validation integration (`interaction-states.css`)
Add `.score-dropdown` to validation state selectors at lines ~1109, 1116, 1119:
```css
.field-group[data-field-validation-state='attention'] > :is(.mock-control, .textarea-mock, .checkbox-block, .rating-scale, .score-dropdown),
```

## Existing Tokens (no changes needed)
```css
--score-0: #c60c30;  --score-0-tint: ...;  --score-0-border: ...;
--score-1: #ea580c;  --score-1-tint: ...;  --score-1-border: ...;
--score-2: #0e7490;  --score-2-tint: ...;  --score-2-border: ...;
--score-3: #4a8355;  --score-3-tint: ...;  --score-3-border: ...;
```
