# Plan 06: Section Skip Alignment

## Summary
Align section-level skip scaffold styling with criterion-level by adding matching CSS selectors for `[data-section-meta='skip-scaffold']`.

## Files to Modify

| File | Changes |
|------|---------|
| `static/css/components.css` | Add `[data-section-meta='skip-scaffold']` selectors |

## Implementation Steps

### Step 1: Add section-meta selectors to skip CSS (`components.css`)

The current CSS at lines 1859-1882 only targets `[data-criterion-meta='skip-scaffold']`. Section skips use `[data-section-meta='skip-scaffold']`. 

**Note**: If Plan 03 (Skip Accordion) is implemented, this plan becomes moot since both will use `.skip-accordion` class instead. If Plan 03 is deferred, apply these CSS-only fixes:

Add parallel selectors to each of the 4 existing rule blocks:

```css
/* Rule 1: Flex layout on field-group */
[data-criterion-meta='skip-scaffold'],
[data-section-meta='skip-scaffold'] {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: color-mix(in srgb, var(--ut-navy) 2%, var(--ut-white));
  margin-top: 0;
}

/* Rule 2: Hide field label */
[data-criterion-meta='skip-scaffold'] .field-label,
[data-section-meta='skip-scaffold'] .field-label {
  display: none;
}

/* Rule 3: Compact controls */
[data-criterion-meta='skip-scaffold'] .mock-control,
[data-criterion-meta='skip-scaffold'] .textarea-mock,
[data-section-meta='skip-scaffold'] .mock-control,
[data-section-meta='skip-scaffold'] .textarea-mock {
  min-height: 36px;
  height: auto;
  padding: 4px 8px;
  margin: 0;
  flex: 1 1 200px;
}

/* Rule 4: Compact textarea */
[data-criterion-meta='skip-scaffold'] textarea,
[data-section-meta='skip-scaffold'] textarea {
  min-height: 36px;
}
```

## Notes
- This is purely a CSS gap — the JS rendering and data attributes are already correct
- If Plan 03 is implemented first, this plan can be skipped entirely
- Section skip instruction text removal is covered in Plan 03
