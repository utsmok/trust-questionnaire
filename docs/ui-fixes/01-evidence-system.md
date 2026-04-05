# Plan 01: Evidence System Overhaul

## Summary
Fix URL parsing, add drag & drop, simplify upload UI, rename fields, merge links into evidence items, reduce flashing.

## Files to Modify

| File | Changes |
|------|---------|
| `static/js/behavior/field-handlers.js` | Fix URL extraction data type handling; rename `.evidenceSummary` → `.evidence` references |
| `static/js/render/evidence.js` | Simplify intake form; rename "Association note" → "Notes"; add drag/drop handlers; add fingerprint diffing to prevent flashing; add `createUrlEvidenceItem`; make notes always editable |
| `static/js/config/questionnaire-schema.js` | Rename `evidenceSummary` → `evidence` in field IDs and definitions; remove `evidenceLinks` field |
| `static/js/state/derive/criterion.js` | Update all `evidenceSummary` references; update completeness logic for merged links |
| `static/js/state/derive/evidence.js` | Update `evidenceSummary` references |
| `static/js/config/rules.js` | Remove `evidenceLinks` from field keys |
| `static/css/components.css` | Update CSS selectors for renamed fields; add drop zone styles |

## Implementation Steps

### Step 1: Fix URL auto-extraction (`field-handlers.js`)
The store normalizes `URL_LIST` fields to arrays. The extraction code reads them as strings.

**Location**: `handleInput` in `field-handlers.js` (~line 775-803)

**Change**: Handle both array and string for current links:
```js
const rawLinks = store.getState().evaluation.fields[linksFieldId];
const currentLinks = Array.isArray(rawLinks)
  ? [...rawLinks]
  : typeof rawLinks === 'string'
    ? rawLinks.split('\n').map(s => s.trim()).filter(Boolean)
    : [];
```

Also move URL extraction from `handleInput` to `handleChange` to avoid running per keystroke.

### Step 2: Prevent image preview flashing (`evidence.js`)
**Root cause**: `renderEvidenceItems` uses `replaceChildren()` on every state change, destroying all image DOM.

**Fix A**: Add fingerprint-based diffing to `renderEvidenceItems` (~line 783):
```js
const fingerprint = items.map(i => `${i.id}:${i.note || ''}`).join('|');
if (container.dataset.renderedFingerprint === fingerprint) return;
container.dataset.renderedFingerprint = fingerprint;
```

**Fix B**: Only sync visible evidence blocks in `syncEvidenceBlocks` (~line 1138):
```js
const activePageId = state.ui?.activePageId;
toArray(questionnaireRoot.querySelectorAll(EVIDENCE_BLOCK_SELECTOR)).forEach((block) => {
  const pageEl = block.closest('[data-page-id]');
  if (pageEl && pageEl.dataset.pageId !== activePageId) return;
  syncEvidenceBlock({ block, state, draftsByKey });
});
```

### Step 3: Simplify evidence intake UI (`evidence.js`)
Remove the type selector, association note textarea, and reuse dropdown from `createEvidenceBlockElement`. Keep only:
- File drop zone (new)
- Evidence items list with preview, notes, unlink

**Changes to `createEvidenceBlockElement`** (~lines 298-539):
- Remove `evidence-input-group` for type selector
- Remove `evidence-input-group evidence-note-group` for note textarea  
- Remove `evidence-input-group` for existing-asset selector
- Keep file input but simplify
- Add a drop zone div with visual indicator
- Remove "Add evidence", "Reuse selected evidence", "Cancel replace" buttons
- Keep "Export manifest" for evaluation-level blocks

### Step 4: Add drag & drop support (`evidence.js`)
**Location**: Inside `initializeEvidenceUi`, add new handlers:

```js
const handleDragOver = (event) => {
  const block = event.target.closest(EVIDENCE_BLOCK_SELECTOR);
  if (!block) return;
  event.preventDefault();
  block.classList.add('is-drag-active');
};
const handleDragLeave = (event) => {
  const block = event.target.closest(EVIDENCE_BLOCK_SELECTOR);
  if (!block) return;
  block.classList.remove('is-drag-active');
};
const handleDrop = async (event) => {
  event.preventDefault();
  const block = event.target.closest(EVIDENCE_BLOCK_SELECTOR);
  if (!block) return;
  block.classList.remove('is-drag-active');
  const files = Array.from(event.dataTransfer.files);
  if (files.length === 0) return;
  const scope = resolveScopeFromElement(block);
  const nextItems = await Promise.all(
    files.map(file => createStoredEvidenceItem({
      file, scope, evidenceType: 'screenshot', note: 'Dropped file'
    }))
  );
  if (scope.level === 'criterion') {
    store.actions.addCriterionEvidenceItems(scope.criterionCode, nextItems);
  } else {
    store.actions.addEvaluationEvidenceItems(nextItems);
  }
  syncEvidenceBlock({ block, state: store.getState(), draftsByKey });
};
```

Register on `questionnaireRoot`:
```js
questionnaireRoot.addEventListener('dragover', handleDragOver);
questionnaireRoot.addEventListener('dragleave', handleDragLeave);
questionnaireRoot.addEventListener('drop', handleDrop);
```

### Step 5: Rename "Association note" → "Notes" (`evidence.js`)
Two occurrences:
- Line ~487: `label: 'Association note'` → `label: 'Notes'`
- Line ~763: `text: 'Association note'` → `text: 'Notes'`

### Step 6: Make notes always editable on evidence items (`evidence.js`)
In `createEvidenceItemElement`, the note is displayed as static text. Change to:
- Click on note text → replace with a textarea for editing
- On blur or Enter → save via store action
- Visual indicator that notes are editable (cursor:pointer, hover style)

### Step 7: Create URL evidence items & merge links (`evidence.js`)
**New helper** `createUrlEvidenceItem`:
```js
const createUrlEvidenceItem = ({ url, scope, note = '' }) => ({
  id: createEvidenceId(),
  scope: scope.level,
  sectionId: scope.sectionId,
  criterionCode: scope.criterionCode,
  evidenceType: 'link',
  note: note || url,
  name: url,
  mimeType: null,
  size: null,
  isImage: false,
  dataUrl: null,
  previewDataUrl: null,
  url: url,
  addedAt: new Date().toISOString(),
});
```

**Update URL extraction** in `field-handlers.js`: Instead of writing to `evidenceLinks` field, create URL evidence items directly:
```js
const nextItems = extractedUrls.map(url => createUrlEvidenceItem({
  url, scope: createEvidenceScope({ criterionCode })
}));
store.actions.addCriterionEvidenceItems(criterionCode, nextItems);
```

**Remove `evidenceLinks` field** from `questionnaire-schema.js` and all references.

### Step 8: Rename `evidenceSummary` → `evidence` (all files)
Update 12 references:
1. `questionnaire-schema.js:86` — key in `createCriterionFieldIds`
2. `questionnaire-schema.js:351-359` — field definition
3. `criterion.js:49,55,80-81,97` — derivation references
4. `evidence.js` (derive): `54,56-57`
5. `rules.js:635` — field keys array
6. `field-handlers.js:458,778` — `endsWith` checks
7. `components.css:1854` — CSS selector

**Update placeholder text** in `field-handlers.js`:
```js
textarea.placeholder = "Paste screenshots, links, or files to add as evidence.";
```

### Step 9: Add CSS for drop zone
```css
.evidence-block.is-drag-active {
  outline: 2px dashed var(--section-accent, var(--ut-blue));
  outline-offset: -2px;
  background: color-mix(in srgb, var(--section-accent, var(--ut-blue)) 5%, var(--ut-white));
}
```

### Step 10: Fix paste handler scope
The current paste handler intercepts ALL textareas in `.criterion-card`. Change to only intercept on `.evidence` textarea specifically, or on the evidence block itself.

## Test Impact
- `tests/e2e/evidence.spec.js` — Update selectors for renamed fields, simplified UI
- `tests/e2e/completion.spec.js` — Skip tests reference criterion fields
