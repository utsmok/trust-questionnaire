# Investigation: Form Field Styling, Verbose Text, and Missing Tooltips

**Date:** 2025-04-04
**Scope:** UI/UX issues in form controls, instructional copy, and missing contextual help
**Status:** Research complete

---

## 1. Form Field Styling — Evidence Block Controls Unstyled

### 1.1 Root Cause

The questionnaire's main form fields (dropdowns, text inputs, textareas) are wrapped in styled shells (`.mock-control`, `.textarea-mock`) created by `dom-factories.js`. These shells apply a consistent visual treatment: grey background, border, padding, arrow indicator for selects.

**The evidence block controls bypass this system entirely.** In `evidence.js`, the `<select>`, `<textarea>`, and `<input type="file">` are created as raw HTML elements with class names (`evidence-select`, `evidence-textarea`, `evidence-file-input`) that receive minimal CSS — just basic border, background, font inheritance, and dimensions. They do NOT get wrapped in the `.mock-control` / `.textarea-mock` shells that the main questionnaire fields use.

### 1.2 Affected Files and Line Numbers

| File | Lines | What's affected |
|------|-------|----------------|
| `static/js/render/evidence.js` | 246–283 | `createEvidenceSelect()` — creates a bare `<select>` with class `evidence-select`, no `.mock-control` wrapper |
| `static/js/render/evidence.js` | 334–347 | `createEvidenceTextarea()` — bare `<textarea>` with class `evidence-textarea`, no `.textarea-mock` wrapper |
| `static/js/render/evidence.js` | 348–360 | `createEvidenceFileInput()` — bare `<input type="file">` with class `evidence-file-input`, no wrapper at all |
| `static/js/render/evidence.js` | 286–297 | `createReusableEvidenceSelect()` — another bare `<select>` with class `evidence-select` |
| `static/css/components.css` | 663–684 | Evidence control styles — basic border/background/font but NO shell wrapping, NO arrow indicator for select, NO consistent mock-control appearance |

### 1.3 Styling Comparison

**Main questionnaire fields** (via `dom-factories.js`):
- `createSelectControl()` (line 429): Wraps `<select>` in a `div.mock-control` div with inline style `appearance:none`, adds a `▾` arrow span, applies `INLINE_SELECT_STYLE`. Shell gets `.mock-control` class.
- `createTextareaControl()` (line 503): Wraps `<textarea>` in a `div.textarea-mock`, applies `INLINE_TEXTAREA_STYLE` with transparent background/inherit font.
- `createInputControl()` (line 382): Wraps `<input>` in a `div.mock-control`, applies `INLINE_TEXT_CONTROL_STYLE`.

**Evidence fields** (via `evidence.js`):
- `createEvidenceSelect()` (line 246): Returns a raw `<select>` with NO wrapper, NO arrow indicator. Browser default appearance remains.
- `createEvidenceTextarea()` (line 334): Returns a raw `<textarea>` with NO wrapper.
- File input (line 348): Returns a raw `<input type="file">` — browser renders with its own "Choose Files" button styling.

### 1.4 Recommended Fix

1. **Evidence select**: Wrap in `createSelectControl()` from `dom-factories.js` (or replicate the mock-control pattern). This gives the same visual appearance as questionnaire dropdowns — grey background, border, arrow indicator.
2. **Evidence textarea**: Wrap in `createTextareaControl()` from `dom-factories.js` for consistent shell and placeholder treatment.
3. **File input**: Either:
   - Hide the raw input and create a styled button that triggers `fileControl.click()`, or
   - Add a `.mock-control` wrapper div with a styled label acting as the button face
4. **Reusable evidence select** (line 286): Same treatment as the evidence type select.
5. **CSS**: Update `.evidence-select`, `.evidence-textarea`, `.evidence-file-input` in `components.css` (lines 663–684) to either delegate to the mock-control system or be removed in favor of the factory wrappers.

---

## 2. Verbose/Redundant Instructional Text — Complete Inventory

### 2.1 All Verbose Text Instances

#### A. Evidence block description paragraph — `evidence.js`

**Location:** `static/js/render/evidence.js`, lines 89–92 (`getEvidenceBlockDescription`)

```js
// Evaluation-level:
'Capture evaluation-level screenshots, exports, and supporting files. Files stay frontend-only and are included in the exported manifest.'
// Criterion-level:
'Attach files to this criterion. Each stored association requires an evidence type and an explanatory note.'
```

**Rendered at:** `evidence.js:464–468` — Creates a `<p class="evidence-block-description">` element inside the evidence block header.

**Recommendation:** REMOVE. The label ("Evaluation evidence intake" / "XY evidence association") plus the form fields themselves make the purpose clear. The "frontend-only" and "exported manifest" details are implementation concerns, not user guidance. The criterion-level description restates what the form already requires (type + note). If any of this is needed, it belongs in a tooltip on the section heading.

#### B. Evidence empty state text — `evidence.js`

**Location:** `static/js/render/evidence.js`, lines 94–109

```js
PRINCIPLE_EVIDENCE_HINTS = {
  tr: 'No evidence attached. Attach source documentation, screenshots, or methodology disclosures.',
  re: 'No evidence attached. Attach repeated-query results, verification records, or accuracy test data.',
  uc: 'No evidence attached. Attach usability observations, accessibility test results, or workflow screenshots.',
  se: 'No evidence attached. Attach privacy policy excerpts, DPIA notes, or compliance records.',
  tc: 'No evidence attached. Attach provenance path screenshots, source verification records, or attribution samples.',
};

// Evaluation-level:
'No evaluation-level evidence attached yet. Add screenshots, exports, or supporting files using the intake form below.'
// Criterion-level fallback:
'No criterion-level evidence attached yet.'
```

**Recommendation:** SIMPLIFY. Replace all with just "No evidence attached." The specific suggestions (screenshots, exports, etc.) are useful but belong in the Context sidebar or a tooltip on the evidence block heading — not displayed permanently as the empty state message.

#### C. Section note help text — `questionnaire-pages.js`

**Location:** `static/js/render/questionnaire-pages.js`, lines 40–41

```js
const SECTION_NOTE_HELP_TEXT =
  'Optional section-level note for observations not captured elsewhere. This does not satisfy required summary, blocker, or rationale fields.';
```

**Rendered at:** `questionnaire-pages.js:1166` — passed as `helpText` to `createFieldGroup()`.

**Recommendation:** SHORTEN to `"Optional — does not count toward required fields."` or REMOVE entirely. The "Section notes / comments" label + "Optional" tag already communicate the purpose. The negative constraint about not satisfying requirements could go in a tooltip on the label.

#### D. Section skip help text — `questionnaire-pages.js`

**Location:** `static/js/render/questionnaire-pages.js`, lines 42–43

```js
const SECTION_SKIP_SCAFFOLD_HELP_TEXT =
  'Skipping a section overrides all child field requirements. Both a skip reason and rationale are required.';
```

**Rendered at:** `questionnaire-pages.js:1235` — passed as `helpText` to `createFieldGroup()`.

**Recommendation:** SHORTEN to `"Requires reason and rationale. All child fields become non-required."` or move to tooltip. The skip scaffold already has "Select a section skip reason" placeholder and a rationale textarea — the form enforces the requirement.

#### E. Criterion skip help text — `questionnaire-pages.js`

**Location:** `static/js/render/questionnaire-pages.js`, lines 44–45

```js
const CRITERION_SKIP_SCAFFOLD_HELP_TEXT =
  'Use criterion skip only when the criterion cannot be assessed — not as a substitute for a low score. Both a skip reason and rationale are required. Child fields become non-required while the skip is active.';
```

**Rendered at:** `questionnaire-pages.js:1379` — passed as `helpText` to `createFieldGroup()`.

**Recommendation:** SHORTEN to `"Not a substitute for low scores. Requires reason and rationale."` The rest is either obvious from the form or can go in a tooltip.

#### F. Questionnaire panel caption — `trust-framework.html`

**Location:** `trust-framework.html`, line 73

```html
<p class="panel-caption">Fill out each section using the page index or pager. Reference drawers below provide scoring and evidence guidance. Framework background is in Info.</p>
```

**Recommendation:** REMOVE. This is the "section subtitle" described in issue #4. Users discover these features through interaction. The page index, reference drawers, and Info button are all visible and self-explanatory.

#### G. Context panel caption — `trust-framework.html`

**Location:** `trust-framework.html`, line 293

```html
<p class="panel-caption">Page-specific guidance and reference links appear here. Scoring references are in the drawers above. Framework background and governance details are in the Info surface.</p>
```

**Recommendation:** REMOVE. Same reasoning as above — the context panel's content speaks for itself.

#### H. Context sidebar fallback text — `trust-framework.html`

**Location:** `trust-framework.html`, lines 296–299

```html
<h2 id="contextSidebarFallbackTitle">Context route ready</h2>
<p>Context guidance loads automatically when a page is selected. If a section has specific guidance, it appears here; otherwise a summary is generated from the section definition.</p>
```

**Recommendation:** SHORTEN to just `"Select a page to see context guidance."` The implementation details about automatic loading and summary generation are not useful to the user.

#### I. Sidebar page fallback copy — `sidebar.js`

**Location:** `static/js/render/sidebar.js`, lines 34–107 (`PAGE_FALLBACK_COPY`)

This object contains verbose guidance for every non-principle section. Examples:

```js
S0: {
  summary: 'Set the workflow mode, canonical tool identity, and responder role first. Later pages and editability rules depend on this control layer.',
  bullets: [
    'Confirm the submission type before interpreting later sections.',
    'Use the canonical tool name and URL fields as the stable evaluation identity.',
    'Nomination-only rationale remains local to this opening page.',
  ],
},
```

**Recommendation:** This content is appropriate for the context sidebar (it IS the context panel content), but the `summary` lines are overly instructional. Trim to be more concise. The bullets are okay but some are obvious (e.g., "Confirm the submission type" — the user is looking at the field). The principle sections (TR, RE, UC, SE, TC) have dedicated HTML context sections and don't use this fallback path.

#### J. Sidebar summary companion text — `sidebar.js`

**Location:** `static/js/render/sidebar.js`, line 484

```js
summary.textContent =
  'Use the section-level summary fields to translate criterion evidence into a page-level judgment and handoff-ready rationale.';
```

**Recommendation:** REMOVE or shorten to `"Translate criterion scores into a section judgment."`

#### K. Sidebar page fallback default text — `sidebar.js`

**Location:** `static/js/render/sidebar.js`, lines 521–522

```js
summary.textContent =
  fallbackCopy?.summary ??
  'This page currently uses registry-driven guidance rather than a dedicated literal context block in the shell.';
```

**Recommendation:** This is a developer-facing message that should never appear in production. Replace with `null` or an empty string.

#### L. Help panel — PAGE_HELP_SUMMARIES — `help-panel.js`

**Location:** `static/js/render/help-panel.js`, lines 19–33

13 page-specific help summaries, each a sentence. Example:

```js
S0: 'Set workflow mode, tool identity, and responder role before relying on later completion or routing behavior.',
```

**Recommendation:** These are acceptable for the Help surface (which is explicitly an explanatory panel), but some are redundant with the sidebar context content. Consider cross-referencing rather than duplicating.

#### M. Help panel — usage notes — `help-panel.js`

**Location:** `static/js/render/help-panel.js`, lines 372–378

Five verbose usage notes rendered as a list. Example:

```
'Use the page index for the authoritative full-questionnaire route; use the TR/RE/UC/SE/TC buttons in the header for fast principle navigation.'
```

**Recommendation:** These are acceptable in the Help panel but could be shorter.

#### N. Evidence status placeholder text — `evidence.js`

**Location:** `static/js/render/evidence.js`, line 516

```js
text: 'No files selected.',
```

And lines 807–819 (`describeSelectedFiles`):

```js
'No files selected.'
```

**Recommendation:** KEEP — this is functional status text, not instructional.

#### O. Evidence note placeholder — `evidence.js`

**Location:** `static/js/render/evidence.js`, line 343

```js
placeholder: 'Required note: why this file supports the evaluation or criterion.',
```

**Recommendation:** KEEP — good placeholder text.

### 2.2 Summary: What to Remove vs. Move to Tooltips

| ID | Location | Current text | Action |
|----|----------|-------------|--------|
| A | `evidence.js:89–92` | Evidence block description paragraph | **REMOVE** |
| B | `evidence.js:94–109` | Evidence empty state verbose hints | **SIMPLIFY** to "No evidence attached." |
| C | `questionnaire-pages.js:40–41` | Section note help text | **SHORTEN** or move to tooltip |
| D | `questionnaire-pages.js:42–43` | Section skip help text | **SHORTEN** or move to tooltip |
| E | `questionnaire-pages.js:44–45` | Criterion skip help text | **SHORTEN** or move to tooltip |
| F | `trust-framework.html:73` | Questionnaire panel caption | **REMOVE** |
| G | `trust-framework.html:293` | Context panel caption | **REMOVE** |
| H | `trust-framework.html:298` | Context fallback paragraph | **SHORTEN** |
| I | `sidebar.js:34–107` | PAGE_FALLBACK_COPY summaries/bullets | **TRIM** (context panel content) |
| J | `sidebar.js:484` | Summary companion text | **REMOVE** |
| K | `sidebar.js:521–522` | Registry-driven fallback message | **REMOVE** (dev-facing) |
| L | `help-panel.js:19–33` | PAGE_HELP_SUMMARIES | **KEEP** (appropriate in Help panel) |
| M | `help-panel.js:372–378` | Usage notes list | **KEEP** (appropriate in Help panel) |

---

## 3. Missing Tooltips for Questions/Dropdowns

### 3.1 Current Help Text System

The app has a field-level help text mechanism:
- `dom-factories.js:209–222` — `createFieldHelp()` creates a `<div class="field-help">` element below the field control.
- `questionnaire-pages.js:596–603` — `getFieldHelpText()` aggregates help from three sources:
  1. `field.notes` (from the schema)
  2. `optionSet.notes` (from the option set)
  3. Rule descriptions (from visibility/requirement rules)

Currently, **only 2 fields have `notes`** in the schema, and **2 option sets have `notes`**:

| Field/OptionSet | Notes text | Where shown |
|----------------|-----------|-------------|
| `SE Compliance confidence` field | "The HTML prototype used 'assessment'; the canonical questionnaire uses 'confidence'." | `.field-help` div |
| `S8 Critical fail flags` field | "An explicit empty selection is allowed and means 'none'." | `.field-help` div |
| `Responder role` option set | "The questionnaire specification uses academic responder roles; workflow path is modeled separately by submission type." | `.field-help` div |
| `SE compliance confidence` option set | "This follows the canonical questionnaire wording; the HTML prototype used a different display label." | `.field-help` div |

**Problem:** The current `notes` values are developer-facing rationales, not user-facing help. And there is NO tooltip mechanism — help text is always visible as a `.field-help` div, taking up space.

### 3.2 Fields That Need Tooltip Context

The following fields are ambiguous or would benefit from explanatory tooltip text. This list is based on field labels that don't fully explain what the user should do:

| Field ID | Label | Why it needs a tooltip | Suggested tooltip text |
|----------|-------|----------------------|----------------------|
| `s1.inScopeCheck` | In-scope check | Users may not know what "in scope" means in this framework | "Whether the tool falls within the TRUST framework's definition of an AI-based search tool for academic use." |
| `s1.deploymentType` | Deployment type | Could be confused with hosting model | "How the tool is delivered: cloud SaaS, on-premises, hybrid, browser extension, or API-only." |
| `s1.accessModel` | Access model | May not be clear what "freemium" or "institutional licence" mean in context | "How users gain access: free, freemium, paid subscription, institutional licence, or API key." |
| `s1.accountRequired` | Account required | The "Optional" value is ambiguous | "Whether a user account is mandatory, not required, or optional for basic access." |
| `s1.scopeRationale` | Scope rationale | Why write a rationale? | "Explain why the tool is in scope, partially in scope, or out of scope." |
| `s2.handsOnAccessConfirmed` | Hands-on access confirmed | What counts as "confirmed"? | "Confirm that you were able to test the tool hands-on, not just review documentation." |
| `s2.repeatedQueryTestPerformed` | Repeated query test performed | What is this test? | "Whether at least one query was run multiple times to check output consistency." |
| `s2.benchmarkComparisonPerformed` | Benchmark comparison performed | What benchmark? | "Whether the tool was compared against a known baseline or competing tool." |
| `s2.sensitiveDataEntered` | Sensitive data entered | What sensitive data? | "Whether personally identifiable, institutional, or research-sensitive data was entered during testing." |
| `s8.completionChecklist` | Completion checklist | This is a derived/read-only field — users may not understand why | "Automatically tracked checklist items. Complete the relevant sections to satisfy each item." |
| `s8.overallReviewConfidence` | Overall review confidence | "Confidence" is ambiguous — does it mean confidence in the tool? | "How well-supported the evaluation is by evidence — not how good the tool is." |
| `s9.publicFacingSummaryDraft` | Public-facing summary draft | Who is this for? | "Draft text summarizing the evaluation outcome for a public or institutional audience." |
| `s10b.agreementWithPrimaryEvaluation` | Agreement with primary evaluation | What does "partial agreement" mean? | "Whether the second reviewer agrees, partially agrees, or disagrees with the primary evaluation." |
| `s10b.criteriaToRevisit` | Criteria to revisit | What triggers a revisit? | "Criterion codes that the second reviewer believes need re-examination." |
| `s10c.finalStatusRationale` | Final status rationale | What should go here? | "Explain the conditions, deferrals, escalations, or rejection reasons behind the final status." |
| `s10c.reviewCycleFrequency` | Review cycle frequency | Why does this matter? | "How often the tool should be re-evaluated based on risk, update cadence, and access conditions." |
| Criterion score fields (all 16) | `{CODE} Score` | The 0–3 scale needs context | "0 = Fails, 1 = Partial/unclear, 2 = Meets baseline, 3 = Strong" |
| Principle judgment fields (5) | `{PRINCIPLE} Principle judgment` | This is derived but overridable | "Derived from criterion scores. Override is downward-only (Pass → Conditional → Fail)." |

### 3.3 Recommended Tooltip Implementation

**No tooltip mechanism currently exists.** The `.field-help` div is always visible. To add tooltips:

1. **Add a tooltip component to `dom-factories.js`**:
   - Create a `?` icon button (small, inline, after the label text)
   - On hover/focus, show a small popover with the tooltip text
   - Use `aria-describedby` to link to the tooltip content
   - Use `title` attribute as a simple fallback (no JS needed for basic tooltips)

2. **Add `tooltip` property to the field schema** (`questionnaire-schema.js`):
   - Add a `tooltip` parameter to `createField()` alongside `notes`
   - `tooltip` is user-facing contextual help; `notes` remains developer-facing
   - Keep backward compatibility — fields without `tooltip` simply don't get a `?` icon

3. **Wire tooltip into field rendering** (`questionnaire-pages.js`):
   - In `buildFieldModel()`, include the tooltip text
   - In `createFieldGroupElement()`, render the `?` icon if tooltip text exists
   - Place the `?` icon in the `.field-label` row, after the tag

4. **Alternative: repurpose `.field-help` as collapsible/tooltip**:
   - Instead of always showing `.field-help` text, make it togglable
   - Show a `?` icon; clicking it reveals the help text inline
   - This requires less new infrastructure

---

## 4. Section Subtitle Removal

### 4.1 Current Implementation

The "subtitle" beneath "Questionnaire — [section]" is implemented as a `<span class="panel-title-section">` element inside the `<h1 class="panel-title">`. It shows the heading text of the currently active questionnaire section.

**Location:** `static/js/behavior/navigation.js`, lines 75–104 (`ensurePanelTitleSuffix`)

```js
const ensurePanelTitleSuffix = (panel, pageId, label, documentRef, accentKey = null) => {
  const title = panel?.querySelector('.panel-title');
  ...
  suffix.textContent = label ? ` — ${label}` : '';
};
```

This is called at:
- `navigation.js:546–552` — For the questionnaire panel (`"Questionnaire — [section heading]"`)
- `navigation.js:553–559` — For the context panel (`"Context — [context heading]"`)

### 4.2 CSS

**Location:** `static/css/layout.css`, lines 166–171

```css
.panel-title-section {
  color: var(--ut-muted);
  font-weight: 400;
  margin-left: 4px;
  transition: color var(--duration-normal) var(--ease-out-quart);
}
```

### 4.3 HTML Structure

**Location:** `trust-framework.html`, line 68

```html
<h1 class="panel-title" id="questionnairePanelTitle">Questionnaire</h1>
```

The `span.panel-title-section` is dynamically appended as a child of this `<h1>`.

### 4.4 Recommended Fix

The section subtitle should be **removed entirely** as requested:

1. **`navigation.js`**: In `ensurePanelTitleSuffix()`, stop appending text to `suffix.textContent`. Either:
   - Remove the function entirely and the calls to it, OR
   - Set `suffix.textContent = ''` always (keeping the element for potential future use)

2. **`layout.css`**: The `.panel-title-section` CSS can remain (harmless) or be removed.

The questionnaire panel title should remain just "Questionnaire" and the context panel title should remain just "Context". Users already know which section they're on via the page index, completion strip, and kicker text on each section.

---

## 5. Recommended Implementation Order

1. **Section subtitle removal** (Issue #4) — simplest change, touches `navigation.js` only
2. **Remove panel captions** (Issue #2F, #2G) — two HTML deletions in `trust-framework.html`
3. **Remove evidence block descriptions** (Issue #2A) — remove the `<p>` element creation in `evidence.js`
4. **Shorten help text strings** (Issue #2C, #2D, #2E) — edit 3 constants in `questionnaire-pages.js`
5. **Simplify evidence empty states** (Issue #2B) — edit `evidence.js` 
6. **Clean up sidebar fallback text** (Issue #2H, #2J, #2K) — edit `sidebar.js` and `trust-framework.html`
7. **Wrap evidence controls in styled shells** (Issue #1) — refactor `evidence.js` to use `dom-factories.js` wrappers
8. **Add tooltip mechanism and field-level tooltips** (Issue #3) — new component + schema additions

---

## 6. File Change Summary

| File | Changes needed |
|------|---------------|
| `static/js/render/evidence.js` | Remove description paragraph, simplify empty states, wrap controls in styled shells |
| `static/js/render/questionnaire-pages.js` | Shorten 3 help text constants (lines 40–45) |
| `static/js/render/dom-factories.js` | Add tooltip component factory |
| `static/js/render/sidebar.js` | Remove/shorten fallback text, remove summary companion text |
| `static/js/behavior/navigation.js` | Remove or neutralize `ensurePanelTitleSuffix()` |
| `static/js/config/questionnaire-schema.js` | Add `tooltip` property to field definitions |
| `static/css/components.css` | Update evidence control styles, add tooltip styles |
| `static/css/layout.css` | Optionally remove `.panel-title-section` styles |
| `trust-framework.html` | Remove two `.panel-caption` `<p>` elements (lines 73, 293), shorten fallback text |
