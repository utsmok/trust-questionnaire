# Master Implementation Plan: UI Fixes

Consolidation of plans 01–06 into 5 execution waves. Each wave groups changes by file so an implementing agent has a complete picture.

---

## Wave 1 — Bug Fixes & Foundation

**Goal**: Fix the sidebar collapse form-clearing bug, improve animation performance, and align section-skip CSS. No structural changes.

**Dependencies**: None — can start immediately.

### `static/js/render/sidebar.js`
| Source | Change |
|--------|--------|
| Plan 05 Step 1 | Add `type="button"` to collapse toggle button (~line 744). Without this, clicking toggle inside a `<form>` submits the form and clears all fields. |

### `static/js/state/store.js`
| Source | Change |
|--------|--------|
| Plan 05 Step 4 | Add equality check to `setPanelMetrics` (~line 802). Short-circuit return `previousState` when `progressPercent`, `canScrollUp`, and `canScrollDown` are unchanged. Prevents re-renders during animation. |

### `static/css/layout.css`
| Source | Change |
|--------|--------|
| Plan 05 Step 3 | Add `contain: layout style paint` and `overflow: hidden` to `.page-index-column`. Add `contain: layout style paint` to `.questionnaire-workspace`. Isolates relayouts during sidebar animation. |

### `static/css/components.css`
| Source | Change |
|--------|--------|
| Plan 05 Step 2 | Replace hardcoded transition values on `.workspace-layout` with design tokens: `transition: grid-template-columns var(--duration-normal) var(--ease-out-quart);` |
| Plan 06 Step 1 | Add `[data-section-meta='skip-scaffold']` selectors mirroring the 4 existing `[data-criterion-meta='skip-scaffold']` rule blocks. **Skip this change if Wave 2's skip-accordion (Plan 03) is implemented**, since it replaces all skip-scaffold CSS entirely. |

**Quality gate**:
1. `npm run validate:html` passes
2. `npm run test:e2e` — all existing tests pass
3. Manual: click sidebar collapse toggle — form state is preserved, no field clearing
4. Manual: sidebar collapse/expand animation is smooth, no visible jank

---

## Wave 2 — Structural Rendering Changes

**Goal**: Add custom score dropdown component, convert skip scaffolds to accordions, and rename `evidenceSummary` → `evidence` (prerequisite for Wave 4 evidence work).

**Dependencies**: Wave 1 complete (CSS foundation in place).

### `static/js/config/questionnaire-schema.js`
| Source | Change |
|--------|--------|
| Plan 02 Step 1 | Change `control: 'dropdown'` → `control: 'score_dropdown'` on the criterion score field (~line 347) |
| Plan 01 Step 8a | In `createCriterionFieldIds` (~line 86): rename key `evidenceSummary` → `evidence` |
| Plan 01 Step 8b | Update field definition (~lines 351–359): rename field ID and definition from `evidenceSummary` to `evidence`. Update placeholder to `"Paste screenshots, links, or files to add as evidence."` |
| Plan 01 Step 7 | Remove the `evidenceLinks` field definition entirely |

### `static/js/config/rules.js`
| Source | Change |
|--------|--------|
| Plan 01 Step 8e | Rename `evidenceSummary` → `evidence` in field keys array (~line 635) |
| Plan 01 Step 7b | Remove `evidenceLinks` from field keys |

### `static/js/state/derive/criterion.js`
| Source | Change |
|--------|--------|
| Plan 01 Step 8c | Update all `evidenceSummary` references (~lines 49, 55, 80–81, 97) to `evidence` |
| Plan 01 Step 7c | Update completeness logic to account for merged links (links are now evidence items, not a separate field) |

### `static/js/state/derive/evidence.js`
| Source | Change |
|--------|--------|
| Plan 01 Step 8d | Update `evidenceSummary` references (~lines 54, 56–57) to `evidence` |

### `static/js/behavior/field-handlers.js`
| Source | Change |
|--------|--------|
| Plan 01 Step 8f | Rename `.evidenceSummary` → `.evidence` in `endsWith` checks (~lines 458, 778) |
| Plan 02 Step 4 | Add `syncScoreDropdown(fieldGroup, fieldState)` function. Updates trigger text, color class (`.score-dropdown--score-N`), toggles panel closed, handles disabled/readonly. Add `case 'score_dropdown':` to `syncFieldGroup` switch. |
| Plan 02 Step 5 | Extend `initializeFieldHandlers` with score dropdown event handlers: click `.score-dropdown-trigger` toggles panel, click `.score-dropdown-option` sets value via `store.actions.setFieldValue`, click-outside closes, keyboard (Enter/Space/arrows/Escape) navigation. |
| Plan 03 Step 5 | In `syncCriterionCards` (~line 534): auto-open `<details>` when skip is requested, inherited, or system-skipped. After toggle-skip click (~line 886): auto-open the skip accordion `<details>`. |

### `static/js/render/dom-factories.js`
| Source | Change |
|--------|--------|
| Plan 02 Step 2 | Add exported function `createScoreDropdown()` after `createRatingScale()` (~line 781). DOM structure: `div.score-dropdown` > `button.score-dropdown-trigger` (with indicator dot, value span, arrow span) + `div.score-dropdown-panel[role="listbox"]` containing `div.score-dropdown-option[role="option"]` elements for scores 0–3. Use `fieldModel.optionSet?.options` for labels. |

### `static/js/render/questionnaire-pages.js`
| Source | Change |
|--------|--------|
| Plan 02 Step 3 | Add `createScoreDropdown` to imports from `dom-factories.js`. Add `score_dropdown` case in `resolveFieldBodyKind()` and `createFieldBodyElement()`. |
| Plan 03 Step 1 | Delete `CRITERION_SKIP_SCAFFOLD_HELP_TEXT` constant (lines 45–46) and remove its usage in `createCriterionSkipElement()`. Delete `SECTION_SKIP_SCAFFOLD_HELP_TEXT` (lines 43–44) and remove its usage in `createSectionMetaElement()`. |
| Plan 03 Step 2 | Rewrite `createCriterionSkipElement()` (lines 1342–1460): replace `createFieldGroup()` with native `<details>/<summary>` using classes `skip-accordion`, `skip-accordion-summary`, `skip-accordion-panel`. Summary shows "Skip criterion" + status display-tag. Panel contains toggle button, reason select, rationale textarea (same as current inner controls). Preserve all `data-*` attributes. |
| Plan 03 Step 3 | In `createSectionMetaElement()` (lines 1295–1311): wrap skip scaffold in `<details>/<summary>` with matching `skip-accordion` classes. Summary shows "Skip section" + status display-tag. |

### `static/css/components.css`
| Source | Change |
|--------|--------|
| Plan 01 Step 8g | Update CSS selector `.evidenceSummary` → `.evidence` (~line 1854) |
| Plan 02 Step 6 | Add ~130 lines of `.score-dropdown*` structural CSS: `.score-dropdown` (relative position), `.score-dropdown-trigger` (styled button, flex), `.score-dropdown-indicator` (8px color dot), `.score-dropdown-value`, `.score-dropdown-arrow`, `.score-dropdown-panel` (absolute positioned listbox), `.score-dropdown-option` (option rows), `.is-open` / `.is-disabled` / `.is-selected` states. |
| Plan 03 Step 4 | Remove old `[data-criterion-meta="skip-scaffold"]` rules (lines 1859–1882) — **and** remove the `[data-section-meta='skip-scaffold']` rules added in Wave 1 if they were applied. Replace with `.skip-accordion` CSS: border + background container, `.skip-accordion-summary` (flex, uppercase, font-heading, `::after` arrow with rotation on `[open]`), `.skip-accordion-panel` (grid, border-top, compact controls). |

### `static/css/interaction-states.css`
| Source | Change |
|--------|--------|
| Plan 02 Step 7 | Add score-dropdown color states for each score N (0–3): `.score-dropdown--score-N .score-dropdown-trigger` gets `background: var(--score-N-tint)`, `border-color: var(--score-N-border)`, `border-left: 3px solid var(--score-N)`, `color: var(--score-N)`, `font-weight: 700`. `.score-dropdown--score-N .score-dropdown-indicator` gets `background: var(--score-N)`. Option colors: `.score-dropdown-option[data-option-value="N"]` border-left, hover tint, selected dot. |
| Plan 02 Step 8 | Add `.score-dropdown` to validation state selectors (~lines 1109, 1116, 1119) alongside `.mock-control, .textarea-mock, .checkbox-block, .rating-scale`. |

**Quality gate**:
1. `npm run validate:html` passes
2. `npm run test:e2e` — all tests pass (update selectors for renamed fields in `evidence.spec.js` and `completion.spec.js`)
3. Manual: score dropdown renders with colored indicator, opens/closes, shows correct score color per selection
4. Manual: skip accordion collapsed by default, auto-opens when skip is active, contains all controls
5. Manual: evidence textarea works with new field ID (`evidence` not `evidenceSummary`)

---

## Wave 3 — UI Cleanup & Redundancy Removal

**Goal**: Remove redundant labels, pills, status text, and improve tooltip styling.

**Dependencies**: Wave 2 complete (sidebar rendering changes are stable).

### `static/js/utils/shared.js`
| Source | Change |
|--------|--------|
| Plan 04 Step 1a | In `formatSectionProgressCompact()` (~line 149–167): remove `" req"` suffix from return value. Change `${...}/${...} req` → `${...}/${...}`. |

### `static/js/behavior/navigation.js`
| Source | Change |
|--------|--------|
| Plan 04 Step 1b | In `formatProgressBadgeText()` (~line 35–51): remove `" req"` suffix. Change `${label} · ${...}/${...} req` → `${label} · ${...}/${...}`. |
| Plan 04 Step 5b | Simplify `ensurePanelTitleSuffix()` (~lines 70–99) — title is now visually hidden, so the suffix update can be simplified or removed. |

### `static/js/render/sidebar.js`
| Source | Change |
|--------|--------|
| Plan 04 Step 1c | In `formatGroupProgressSummary()` (~lines 175–200): remove `" req"` suffix from progress text. |
| Plan 04 Step 2 | In `renderPageIndex()`: remove `workflowState` element creation (~lines 833–835) and remove from `meta.append()` (~line 851). Remove `WORKFLOW_STATE_LABELS` constant (~lines 112–116) if unused elsewhere. |
| Plan 04 Step 3 | In `renderPageIndex()` (~lines 837–844): suppress "not started" status pills when `canonicalState` is `not_started`. |
| Plan 04 Step 4 | In `renderPageIndex()`: remove entire `if (pageDefinition?.completionGroupId !== lastCompletionGroupId)` block (~lines 764–789) and `lastCompletionGroupId` variable (~line 735). Optionally remove `formatGroupProgressSummary()` (~lines 175–200) if no longer used. |

### `static/js/behavior/pager.js`
| Source | Change |
|--------|--------|
| Plan 04 Step 6 | In `sync()` function (~lines 130–141): set `refs.status.textContent = ''` or `refs.status.hidden = true` to clear pager status text. Remove `WORKFLOW_STATE_LABELS` constant (~lines 4–8). |

### `trust-framework.html`
| Source | Change |
|--------|--------|
| Plan 04 Step 5a | Line 63: add `class="visually-hidden"` to `<h1>` (keeps accessible but hides visually). |
| Plan 04 Step 5b | Line 68: remove `<p class="panel-caption">` element entirely. |

### `static/css/components.css`
| Source | Change |
|--------|--------|
| Plan 04 Step 7a | Increase `.tooltip-content` max-width from `18rem` to `28rem`. |
| Plan 04 Step 7c | Reduce `.tooltip-trigger-btn` size from `44px` to `28px` (width and height). |
| Plan 04 Step 3b | Add CSS rules: `.page-index-status[data-progress-state='not_started'] { display: none; }` and `.page-index-progress[data-progress-state='not_started'] { display: none; }`. |

**Quality gate**:
1. `npm run validate:html` passes
2. `npm run test:e2e` — all tests pass
3. Manual: sidebar page index shows section links without "req" suffix, no workflow state pills, no group subheaders
4. Manual: main title/subtitle visually hidden but present in DOM for accessibility
5. Manual: pager bar shows navigation but no status text
6. Manual: tooltips are wider (28rem), trigger buttons are smaller (28px)

---

## Wave 4 — Evidence System Overhaul

**Goal**: Fix URL parsing, add drag & drop, simplify upload UI, merge links into evidence items, reduce flashing, make notes editable.

**Dependencies**: Wave 2 complete (`evidenceSummary` → `evidence` rename must be done; `evidenceLinks` field must be removed).

### `static/js/behavior/field-handlers.js`
| Source | Change |
|--------|--------|
| Plan 01 Step 1 | Fix URL extraction data type handling (~lines 775–803): handle both array and string for `rawLinks`. Use `Array.isArray(rawLinks) ? [...rawLinks] : typeof rawLinks === 'string' ? rawLinks.split('\n').map(s => s.trim()).filter(Boolean) : []`. |
| Plan 01 Step 1b | Move URL extraction from `handleInput` to `handleChange` to avoid running per keystroke. |
| Plan 01 Step 10 | Fix paste handler scope: restrict to `.evidence` textarea specifically or evidence block, not all textareas in `.criterion-card`. |
| Plan 01 Step 7d | Update URL extraction to create URL evidence items directly via `createUrlEvidenceItem` instead of writing to `evidenceLinks` field. Call `store.actions.addCriterionEvidenceItems()`. |

### `static/js/render/evidence.js`
| Source | Change |
|--------|--------|
| Plan 01 Step 2a | Add fingerprint-based diffing to `renderEvidenceItems` (~line 783): compute fingerprint from items, skip re-render if unchanged. Prevents image preview flashing. |
| Plan 01 Step 2b | In `syncEvidenceBlocks` (~line 1138): only sync evidence blocks on the active page (`state.ui?.activePageId`). |
| Plan 01 Step 3 | Simplify `createEvidenceBlockElement` (~lines 298–539): remove type selector group, association note textarea, existing-asset selector. Keep file input (simplified). Add drop zone div. Remove "Add evidence", "Reuse selected evidence", "Cancel replace" buttons. Keep "Export manifest" for evaluation-level blocks. |
| Plan 01 Step 4 | In `initializeEvidenceUi`: add `handleDragOver`, `handleDragLeave`, `handleDrop` handlers on `questionnaireRoot`. Drop creates stored evidence items and calls `store.actions.addCriterionEvidenceItems` or `addEvaluationEvidenceItems`. |
| Plan 01 Step 5 | Rename label/text `"Association note"` → `"Notes"` (~lines 487, 763). |
| Plan 01 Step 6 | In `createEvidenceItemElement`: make note text clickable to replace with textarea for editing. On blur or Enter, save via store action. Add visual indicator (cursor:pointer, hover style). |
| Plan 01 Step 7a | Add new helper `createUrlEvidenceItem({ url, scope, note })` that returns a properly structured evidence item object with `evidenceType: 'link'`. |

### `static/css/components.css`
| Source | Change |
|--------|--------|
| Plan 01 Step 9 | Add drop zone styles: `.evidence-block.is-drag-active` with dashed outline using section accent color, offset background tint. |

**Quality gate**:
1. `npm run validate:html` passes
2. `npm run test:e2e` — update `tests/e2e/evidence.spec.js` selectors for simplified UI
3. Manual: drag a file onto evidence block — drop zone highlights, file is added as evidence item
4. Manual: paste URLs into evidence textarea — URLs are extracted and appear as link evidence items (not in a separate links field)
5. Manual: image previews do not flash/flicker when navigating between pages
6. Manual: click a note on an evidence item — inline editing activates, saves on blur

---

## Wave 5 — Final Quality Gate

**Goal**: Full regression and visual review. No code changes in this wave — only verification.

**Dependencies**: Waves 1–4 all complete.

### Automated checks
```bash
npm run validate:html
npm run test:e2e
npm run test
```

### Visual review checklist

| Area | What to verify |
|------|---------------|
| Sidebar collapse | Toggle preserves form state; animation is smooth; no jank during scroll |
| Score dropdown | Colored indicator dot matches score; panel opens/closes; keyboard works; validation highlight works |
| Skip accordion | Collapsed by default; auto-opens when skip active; section-level and criterion-level look identical |
| Sidebar page index | No "req" suffix; no workflow state pills; no "not started" pills; no group subheaders |
| Main title | Visually hidden but present for screen readers |
| Pager | Navigation arrows work; no status text displayed |
| Tooltips | Wider content area (28rem); smaller trigger buttons (28px) |
| Evidence intake | No type selector, no association note group, no reuse dropdown; drop zone present |
| Evidence items | Notes are inline-editable; URL items render as link type; no flashing on page switch |
| Field renames | All `evidenceSummary` references updated; `evidenceLinks` field removed entirely |

### Test file updates
The following test files may need selector/text updates across waves:
- `tests/e2e/evidence.spec.js` — renamed fields, simplified UI, removed elements
- `tests/e2e/completion.spec.js` — skip tests reference criterion fields, renamed evidence fields
- `tests/e2e/navigation.spec.js` — sidebar pills removed, pager status cleared
- `tests/e2e/rendering.spec.js` — score dropdown replaces native select, skip accordion replaces field-group
- `tests/e2e/validation.spec.js` — score dropdown validation state integration

---

## File Change Matrix

Complete reference of every file touched by any plan, with all changes listed.

| File | Wave 1 | Wave 2 | Wave 3 | Wave 4 |
|------|--------|--------|--------|--------|
| `static/js/behavior/field-handlers.js` | — | Score dropdown sync + handlers; skip auto-open; evidenceSummary rename | — | URL extraction fix + move to handleChange; paste scope fix; URL item creation |
| `static/js/render/evidence.js` | — | — | — | Fingerprint diffing; active-page-only sync; simplify intake UI; drag & drop; rename notes; editable notes; createUrlEvidenceItem |
| `static/js/config/questionnaire-schema.js` | — | Score dropdown control change; evidenceSummary → evidence rename; remove evidenceLinks | — | — |
| `static/js/config/rules.js` | — | Rename evidenceSummary → evidence; remove evidenceLinks | — | — |
| `static/js/state/derive/criterion.js` | — | Rename evidenceSummary → evidence; update completeness for merged links | — | — |
| `static/js/state/derive/evidence.js` | — | Rename evidenceSummary → evidence | — | — |
| `static/js/render/dom-factories.js` | — | Add createScoreDropdown factory | — | — |
| `static/js/render/questionnaire-pages.js` | — | Import + render score_dropdown; remove help text constants; rewrite skip as accordion | — | — |
| `static/js/render/sidebar.js` | Add type="button" to toggle | — | Remove "req" from group progress; remove workflow pills; remove not-started pills; remove group subheaders | — |
| `static/js/state/store.js` | Equality check in setPanelMetrics | — | — | — |
| `static/js/utils/shared.js` | — | — | Remove "req" from formatSectionProgressCompact | — |
| `static/js/behavior/navigation.js` | — | — | Remove "req" from formatProgressBadgeText; simplify ensurePanelTitleSuffix | — |
| `static/js/behavior/pager.js` | — | — | Clear status text; remove WORKFLOW_STATE_LABELS | — |
| `static/css/components.css` | Transition tokens; section-skip CSS alignment* | evidenceSummary selector rename; score-dropdown CSS; skip-accordion CSS replaces skip-scaffold | Tooltip width + button size; not-started pill hide rules | Drop zone styles |
| `static/css/interaction-states.css` | — | Score-dropdown color states + validation selectors | — | — |
| `static/css/layout.css` | Containment + will-change | — | — | — |
| `trust-framework.html` | — | — | Visually-hidden h1; remove panel-caption | — |

*\* Section-skip CSS alignment (Plan 06) is superseded if skip-accordion (Plan 03) is implemented in Wave 2.*
