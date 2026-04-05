# Plan 03: Skip Section Accordion

## Summary
Convert skip sections into foldable `<details>/<summary>` accordions (collapsed by default). Remove instruction text. Align section-level and criterion-level skip styling.

## Files to Modify

| File | Changes |
|------|---------|
| `static/js/render/questionnaire-pages.js` | Rewrite `createCriterionSkipElement()` and skip portion of `createSectionMetaElement()`; remove `CRITERION_SKIP_SCAFFOLD_HELP_TEXT` |
| `static/css/components.css` | Replace skip-scaffold CSS with `.skip-accordion` CSS; add section-meta selectors |
| `static/js/behavior/field-handlers.js` | Add auto-open logic when skip is active |

## Implementation Steps

### Step 1: Remove instruction text (`questionnaire-pages.js`)
- Delete constant `CRITERION_SKIP_SCAFFOLD_HELP_TEXT` (line 45-46)
- Remove `helpText: CRITERION_SKIP_SCAFFOLD_HELP_TEXT` from `createCriterionSkipElement()` (line ~1446)
- Optionally also remove `SECTION_SKIP_SCAFFOLD_HELP_TEXT` (line 43-44) and its usage (line ~1302)

### Step 2: Rewrite criterion skip as accordion (`questionnaire-pages.js`)
Replace `createCriterionSkipElement()` (lines 1342-1460):

Change from `createFieldGroup()` to native `<details>/<summary>`:

```js
const createCriterionSkipElement = (criterionModel, documentRef) => {
  // Build summary header
  const summary = createElement('summary', {
    documentRef,
    className: 'skip-accordion-summary',
    children: [
      createElement('span', { documentRef, text: 'Skip criterion' }),
      createElement('span', { documentRef, className: 'display-tag', text: statusText }),
    ],
  });

  // Build panel with toggle button, reason select, rationale textarea
  const panel = createElement('div', {
    documentRef,
    className: 'skip-accordion-panel',
    children: [
      /* toggle button row (same as current) */
      /* reason select (same as current) */
      /* rationale textarea (same as current) */
    ],
  });

  return createElement('details', {
    documentRef,
    className: 'skip-accordion',
    dataset: {
      pageId: criterionModel.pageId,
      criterion: criterionModel.criterionCode,
      criterionMeta: 'skip-scaffold',
      criterionSkipRequested: skipScaffold.requested,
      criterionSkipInherited: skipScaffold.inheritedSectionSkip,
      criterionSkipSystem: skipScaffold.systemSkipped,
    },
    attributes: { id: skipScaffold.elementId },
    children: [summary, panel],
  });
};
```

### Step 3: Rewrite section skip as accordion (`questionnaire-pages.js`)
In `createSectionMetaElement()` (lines 1295-1311), wrap the skip scaffold in `<details>/<summary>`:

```js
const skipSummary = createElement('summary', {
  documentRef,
  className: 'skip-accordion-summary',
  children: [
    createElement('span', { documentRef, text: 'Skip section' }),
    createElement('span', { documentRef, className: 'display-tag', text: statusText }),
  ],
});

const skipPanel = createElement('div', {
  documentRef,
  className: 'skip-accordion-panel',
  children: [/* reason select, rationale textarea - same as current */],
});

const skipDetails = createElement('details', {
  documentRef,
  className: 'skip-accordion',
  dataset: {
    pageId: sectionMeta.pageId,
    sectionMeta: 'skip-scaffold',
  },
  children: [skipSummary, skipPanel],
});
```

### Step 4: Replace CSS (`components.css`)
Remove old `[data-criterion-meta="skip-scaffold"]` rules (lines 1859-1882). Replace with:

```css
/* Skip Accordion */
.skip-accordion {
  border: 1px solid var(--ut-border);
  background: color-mix(in srgb, var(--ut-navy) 2%, var(--ut-white));
}

.skip-accordion-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  list-style: none;
  font-family: var(--ff-heading);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--ls-label);
  color: var(--ut-navy);
}

.skip-accordion-summary::-webkit-details-marker { display: none; }
.skip-accordion-summary::marker { display: none; content: ''; }

.skip-accordion-summary::after {
  content: '▸';
  font-size: var(--text-sm);
  transition: transform var(--duration-fast) var(--ease-out-quart);
}

.skip-accordion[open] > .skip-accordion-summary::after {
  transform: rotate(90deg);
}

.skip-accordion-panel {
  display: grid;
  gap: 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid var(--ut-border);
}

.skip-accordion-panel .mock-control,
.skip-accordion-panel .textarea-mock {
  min-height: 36px;
  height: auto;
  padding: 4px 8px;
  margin: 0;
}
```

### Step 5: Auto-open logic (`field-handlers.js`)
In `syncCriterionCards` (~line 534), after updating data attributes:
```js
if (skipScaffold.requested || skipScaffold.inheritedSectionSkip || skipScaffold.systemSkipped) {
  if (skipFieldGroup instanceof HTMLDetailsElement && !skipFieldGroup.open) {
    skipFieldGroup.open = true;
  }
}
```

After toggle-skip click (~line 886), auto-open:
```js
const skipDetails = questionnaireRoot.querySelector(
  `details[data-criterion-meta="skip-scaffold"][data-criterion="${criterionCode}"]`
);
if (skipDetails instanceof HTMLDetailsElement) {
  skipDetails.open = true;
}
```

### Step 6: Also remove section skip instruction text
Remove `SECTION_SKIP_SCAFFOLD_HELP_TEXT` constant (line 43-44) and its usage in `createSectionMetaElement()`.
