# Wave 4 Clarity Audit — UX Copy, Microcopy, Labels, Error Messages

**Date**: 2026-04-05 (re-run, post-W3 diagnostic)
**Auditor**: /clarify (impeccable design skill)
**Target**: `trust-framework.html`, `static/js/` (37 modules), `static/css/` (8 files)
**Scope**: All user-facing text — field labels, help text, tooltips, error messages, button labels, empty states, navigation microcopy, context guidance, evidence UI, pager status, sidebar chrome, about/help panel text
**Prior waves**: W1–W3 addressed typography, color, animation, accessibility, anti-patterns. This wave focuses exclusively on textual clarity.

---

## Overall Assessment

The UX copy is **exceptionally strong** for its target audience (EIS-IS domain experts at University of Twente). The writing is precise, direct, and free of marketing fluff — perfectly aligned with the `.impeccable.md` brand voice ("Direct and unadorned — no marketing fluff. Technical precision over approachability."). The information architecture of the help system (context guidance, reference drawers, about panel, help legend) is thorough and well-layered.

**Total issues found: 5 HIGH, 8 MEDIUM, 6 LOW.**

---

## What Should NOT Be Changed

These patterns are already excellent and should be preserved:

1. **Criterion statements** (`questionnaire-schema.js:196–324`) — Clear, precise, non-prescriptive. Each statement defines what to evaluate without telling the reviewer how to score it. Example: "The tool generates factually accurate and verifiable outputs, with robust mechanisms to minimize or eliminate hallucinated citations."

2. **Context guidance sections** (`trust-framework.html:104–253`) — The literal context guidance for each page is some of the best technical writing in the codebase. Each section opens with a purpose paragraph, follows with a bold-term bullet list, and avoids redundancy. Example: "The handoff is not a victory lap. It packages the primary evaluation for a second reviewer and should expose the weakest parts of the evidence set clearly."

3. **Reference drawer content** (`trust-framework.html:268–460`) — The standard answer sets, scoring model, evidence requirements, and decision rules are comprehensive, well-organized, and use precise terminology consistently.

4. **Rule descriptions** (`rules.js`) — All visibility and requirement rule descriptions are written as clear, declarative statements. Example: "Critical fail notes are required when any critical fail flag is selected."

5. **Field tooltips** — Tooltips are brief, specific, and add information beyond the label. Examples: "How the tool is delivered: cloud SaaS, on-premises, hybrid, browser extension, or API-only."; "Whether at least one query was run multiple times to check output consistency."

6. **Help panel legend** (`help-panel.js:165–222`) — The state legend cards explain visual encoding systems in plain language without oversimplifying. Example: "Accent color answers 'where am I?'. It follows the active page across chrome, sidebar markers, contextual docs, and the completion strip."

7. **Evidence principle hints** (`evidence.js:94–100`) — The per-principle empty-state text gives specific guidance on what evidence to attach for each principle. Example for TR: "Attach source documentation, screenshots, or methodology disclosures."

8. **Terminology consistency** — The same terms are used throughout: "criterion" (not "question" or "item"), "principle" (not "domain" or "pillar"), "submission type" (not "workflow mode" in user-facing text), "workflow state" (not "page state"). This is well-maintained.

---

## Recommendations

### R1 — Context sidebar empty state is passive and uninformative

**Priority**: HIGH
**Location**: `trust-framework.html:104–107`
**Current**:

```html
<h2>Context guidance</h2>
<p>Select a page to see context guidance.</p>
```

**Problem**: This is the first thing a new reviewer sees in the context panel. "Select a page to see context guidance" is a dead-end instruction that doesn't explain what the context panel provides or why it's valuable. The user may not realize guidance loads automatically when they navigate. First-time users (Jordan persona from W3 critique) won't understand the panel's purpose.
**Recommendation**: Replace with text that explains the panel's function:

```html
<h2>Context guidance</h2>
<p>
  Context guidance for the active page appears here automatically. Use the page index or pager to
  navigate — the guidance updates with each page.
</p>
```

**Dependencies**: None. This is static HTML.

---

### R2 — "Skip criterion" / "Resume criterion" button labels lack context

**Priority**: HIGH
**Location**: `questionnaire-pages.js:1373`
**Current**: `skipScaffold.requested ? 'Resume criterion' : 'Skip criterion'`
**Problem**: The button label doesn't indicate which criterion will be skipped. On a page with 3–4 criteria (e.g., UC, SE), the user sees multiple "Skip criterion" buttons with no differentiation. A screen reader user navigating by button labels would hear "Skip criterion, Skip criterion, Skip criterion, Skip criterion" — all identical.
**Recommendation**: Include the criterion code in the button text:

```js
skipScaffold.requested
  ? `Resume ${criterionModel.criterionCode}`
  : `Skip ${criterionModel.criterionCode}`;
```

Alternatively, keep the visual label short but add `aria-label` with the full context: `aria-label="Skip criterion RE2 — Consistency of consensus"`.
**Dependencies**: None.

---

### R3 — Section skip label "Section skip" is ambiguous

**Priority**: MEDIUM
**Location**: `questionnaire-pages.js:1297`
**Current**: `labelText: 'Section skip'`
**Problem**: Every page has a field group labeled "Section skip" with a select for reason and a textarea for rationale. The label doesn't indicate which section. On its own this is manageable (it appears within the section), but the section notes label above it is "Section notes / comments" — note the inconsistency. "Section skip" vs "Section notes / comments" use different naming conventions (bare noun vs noun with slash alternative).
**Recommendation**: Either make them consistent:

- Change "Section skip" to "Section skip / exclusion" (matching the slash pattern)
- Or change "Section notes / comments" to "Section notes" (matching the bare pattern)

I recommend the bare-noun pattern: "Section notes" and "Section skip" are already clear for domain experts who know what a section skip means. Remove the "/ comments" suffix from the notes label.

**Dependencies**: R12 (if changing the notes label).

---

### R4 — Mock control placeholder "Select an option" is generic

**Priority**: MEDIUM
**Location**: `questionnaire-pages.js:556`
**Current**: `return field.control === 'computed_select' ? 'Auto-calculated' : 'Select an option'`
**Problem**: For all non-computed single-select dropdowns, the placeholder is "Select an option". This is a generic phrase that doesn't tell the user what kind of option they're selecting. For a form with 132+ fields, a more specific placeholder reduces cognitive scanning time.
**Recommendation**: Use the field label to construct a specific placeholder:

```js
case FIELD_TYPES.SINGLE_SELECT:
  return field.control === 'computed_select'
    ? 'Auto-calculated'
    : `Select ${field.label.toLowerCase()}`;
```

This produces "Select submission type", "Select deployment type", "Select in-scope check", etc. — which are more informative and already match the pattern used for SHORT_TEXT at line 554.
**Dependencies**: None.

---

### R5 — Evidence note placeholder is overly prescriptive

**Priority**: MEDIUM
**Location**: `evidence.js:312`
**Current**: `'Required note: why this file supports the evaluation or criterion.'`
**Problem**: This placeholder does double duty — it states that the note is required AND suggests what to write. For criterion-level evidence, "supports the evaluation" is slightly wrong — it should say "supports the criterion". The word "Required" in the placeholder is also redundant: the field is validated by the JS logic that checks `hasMeaningfulText(draftState.note)`, and the "Add evidence" button stays disabled until the note is filled. The requirement is enforced mechanically, not textually.
**Recommendation**: Make the placeholder specific to the scope level:

```js
scope.level === 'criterion'
  ? 'Describe how this evidence supports the criterion.'
  : 'Describe how this evidence supports the evaluation.';
```

Remove the "Required note:" prefix — the disabled-state enforcement makes the requirement clear.
**Dependencies**: None.

---

### R6 — "No reusable evidence available" appears as both placeholder and empty-state select text

**Priority**: LOW
**Location**: `evidence.js:221, 265`
**Current**: Both the populated select (line 221: `'No reusable evidence available'`) and the initial placeholder (line 265: `'No reusable evidence available'`) use the same text.
**Problem**: When evidence items exist but none are reusable for this criterion, the select shows "No reusable evidence available" as the default option alongside other options. When no evidence items exist at all, the select also shows "No reusable evidence available" as the only option. The user can't distinguish "you have evidence but it's already linked here" from "you have no evidence at all".
**Recommendation**: Differentiate the two states:

```js
// Line 221: when items exist but none are reusable for this scope
items.length > 0
  ? 'All existing evidence already linked to this criterion'
  : 'No reusable evidence available';
```

**Dependencies**: None.

---

### R7 — Pager "← Start" label is confusing at page boundaries

**Priority**: MEDIUM
**Location**: `pager.js:107`
**Current**: `'← Start'` (when there's no previous page)
**Problem**: When the user is on the first page (S0), the previous button shows "← Start". This could be interpreted as "go to start" (an action) rather than "you are at the start" (a state). The button is disabled, which helps, but the text implies navigation rather than position.
**Recommendation**: Change to an empty or dashed label that signals boundary rather than action: `'←'` (arrow only) or `'—'`. The pager status text already shows "Page 1 of N" which provides orientation. Alternatively, hide the previous button entirely when on the first page.
**Dependencies**: None.

---

### R8 — Help panel keyboard shortcuts table is missing the pager shortcut

**Priority**: HIGH
**Location**: `help-panel.js:239–251`
**Current**: 10 shortcuts listed (Alt+1–5, Alt+T/R/U/S/C, Escape). No Alt+Left/Right for pager navigation.
**Problem**: The help panel's keyboard shortcuts table doesn't include any pager navigation shortcuts. The pager itself has no keyboard shortcut (no Alt+Left/Right was implemented — noted as a W3 critique finding). The shortcuts table accurately reflects reality, but the table lists 10 shortcuts and the user still can't navigate between pages by keyboard without tabbing to the pager buttons. This is a clarity issue: the help table tells users what shortcuts exist, but the most common action (next page) has no shortcut.
**Recommendation**: Either (a) add Alt+Left/Right pager shortcuts to keyboard.js and add them to this table, or (b) add a note in the shortcuts section that explicitly says "Use Tab to reach pager buttons for page navigation." Option (a) is better — it's a W3 P2 finding for power users and this table should document it once implemented.
**Dependencies**: Depends on implementing Alt+Left/Right pager navigation in `keyboard.js`.

---

### R9 — Evidence "Remove file everywhere" button label doesn't explain scope

**Priority**: HIGH
**Location**: `evidence.js:731`
**Current**: `'Remove file everywhere'`
**Problem**: The confirmation dialog (`evidence.js:1450–1453`) explains the scope well ("Remove 'X' everywhere? This will remove N linked associations."), but the button label itself doesn't indicate that "everywhere" means "from all criteria that reference this file". A reviewer on the SE criterion page might not realize "everywhere" includes TR, RE, UC, and TC associations. The label and the confirmation dialog need to agree on terminology.
**Recommendation**: Change button label to `'Remove from all criteria'` which is more specific than "everywhere" and matches the mental model of "this file is linked to multiple criteria, I'm removing it from all of them."
**Dependencies**: None. The confirmation dialog text can stay as-is since it provides full context.

---

### R10 — "Display only" tag text doesn't explain why the field can't be edited

**Priority**: MEDIUM
**Location**: `questionnaire-pages.js:601`
**Current**: `{ text: 'Display only', kind: 'display' }`
**Problem**: The tag "Display only" appears next to derived fields (principle judgments, completion checklist). It tells the user they can't edit the field, but not why. A reviewer might think the tool is broken ("why can't I change the judgment?") rather than understanding that the judgment is computed from criterion scores.
**Recommendation**: Change to `'Auto-derived'` — this conveys both that the field is display-only AND why (it's derived from other data). This matches the tooltip text on principle judgment fields: "Derived from criterion scores. Override is downward-only (Pass → Conditional → Fail)."
**Dependencies**: None.

---

### R11 — Validation messages may lack actionable guidance

**Priority**: HIGH
**Location**: `questionnaire-pages.js:1134`
**Current**: `const text = issues.map((issue) => issue.message).join(' ');`
**Problem**: Validation messages are rendered from `issue.message` strings, but the `createTextValidationRule` and `createCrossFieldValidationRule` schemas in `rules.js` store a `description` field for the rule, not a user-facing error message. The actual validation logic that populates `issues[].message` lives in `derive.js`. The pattern of joining messages with spaces (`join(' ')`) risks producing concatenated fragments like "Field is required Uncertainty/blocker follow-up is required for low or unclear scores" without proper punctuation or separation.
**Recommendation**:

1. Verify that validation issue messages in `derive.js` are complete, punctuated sentences (not fragments).
2. If messages are fragments, change the join separator to `'; '` (semicolon + space) for proper separation.
3. Consider prefixing validation messages with the field code: `[TR1] Score is required.` — this helps when the `.validation-message` element is announced by screen readers out of the field's immediate context.
   **Dependencies**: Requires reading `derive.js` validation logic to confirm current message format.

---

### R12 — "Section notes / comments" label uses slash disjunction

**Priority**: LOW
**Location**: `questionnaire-pages.js:1208`
**Current**: `labelText: 'Section notes / comments'`
**Problem**: The slash pattern ("notes / comments") is ambiguous — are these the same thing or two different things? The field is a single textarea, so it's one thing. Domain experts won't be confused by this, but it's a minor inconsistency in an otherwise precise label system.
**Recommendation**: Use "Section notes" — singular, clear, no disjunction. If the concern is that users might not write "comments" in a field labeled "notes", add a more descriptive help text or placeholder instead of expanding the label.
**Dependencies**: R3 (which proposes this same change from the other direction).

---

### R13 — Evidence status text uses "files are attached" at both scope levels

**Priority**: MEDIUM
**Location**: `evidence.js:1044–1046`
**Current**:

```js
`${decoratedItems.length} ${decoratedItems.length === 1 ? 'file is' : 'files are'} attached.`;
```

**Problem**: At the criterion level, "attached" is correct — files are attached to the criterion. But at the evaluation level (S2), the concept is "evaluation evidence" which is the pool of files. The status says "3 files are attached" at both levels without distinguishing scope. This is functional but could be more precise.
**Recommendation**: Differentiate the level in the status text:

```js
scope.level === 'evaluation'
  ? `${count} ${count === 1 ? 'file is' : 'files are'} in the evaluation evidence pool.`
  : `${count} ${count === 1 ? 'file is' : 'files are'} associated with this criterion.`;
```

**Dependencies**: None.

---

### R14 — `formatSectionProgressDetail` fallback strings are inconsistent

**Priority**: MEDIUM
**Location**: `sidebar.js:151–173`
**Current**: Multiple fallback messages with different tones and levels of verbosity:

- `'Progress unavailable.'` (short, period)
- `'Skipped by workflow mode.'` (short, period, passive)
- `'Skip reason and rationale satisfied.'` (short, period, passive)
- `'No answers recorded yet.'` (short, period)
- `'No currently applicable required fields remain on this page.'` (verbose)

**Problem**: "No currently applicable required fields remain on this page" is the longest string in the set and uses "currently" and "remain" — both hedging words that don't match the direct voice of the rest of the UI. It's also technically describing a positive state (all fields satisfied or suppressed) but phrased negatively.
**Recommendation**: Replace with a positive, shorter statement: `'All applicable required fields satisfied.'` This is consistent with the direct, explicit voice and tells the user they're done rather than what's missing.
**Dependencies**: None.

---

### R15 — "Criterion focus" / "Summary focus" kicker labels in generated context sections are vague

**Priority**: LOW
**Location**: `sidebar.js:367, 386`
**Current**: `kicker.textContent = 'Criterion focus'` / `kicker.textContent = 'Summary focus'`
**Problem**: When the context panel generates a companion section for a specific criterion or summary anchor, it uses kickers "Criterion focus" and "Summary focus". These don't tell the user which criterion or which summary. Compare with the static context sections that use specific kickers like "TR · Transparent" or "S0 · Workflow". The generated kickers are generic.
**Recommendation**: Include the criterion code in the kicker:

```js
// For criterion companion:
kicker.textContent = `${criterion.code} · Focus`;
// For summary companion:
kicker.textContent = `${route.pageDefinition?.pageCode ?? 'Page'} · Summary`;
```

**Dependencies**: None.

---

### R16 — "Page overview" button label is ambiguous alongside "Page anchors"

**Priority**: LOW
**Location**: `sidebar.js:874`
**Current**: `overviewButton.textContent = 'Page overview'`
**Problem**: The anchor card in the context sidebar has a heading "Page anchors" and a button "Page overview". The button resets the sub-anchor to page-level, but "Page overview" could be confused with the About panel or a separate overview page. The action it performs is "clear the active sub-anchor and show page-level context" — which is a navigation reset, not an "overview".
**Recommendation**: Change to `'Page-level view'` which matches the route card's "Page-level overview" label, or `'Clear anchor focus'` which describes the action (un-selecting a specific anchor).
**Dependencies**: None.

---

### R17 — `getMockControlPlaceholder` returns bare `field.label` as fallback

**Priority**: LOW
**Location**: `questionnaire-pages.js:558`
**Current**: `default: return field.label;`
**Problem**: For field types that don't match any specific case (LONG_TEXT, CHECKLIST, MULTI_SELECT), the placeholder falls back to the field label itself. This means the placeholder is identical to the label text, which is redundant. When the user types, the placeholder disappears and takes the label-like text with it — but the label is still visible above. This is harmless but slightly noisy.
**Recommendation**: Change the default to `null` (no placeholder for types that don't need one):

```js
default: return null;
```

**Dependencies**: None.

---

### R18 — "Reference drawers" label in route card uses UI jargon

**Priority**: LOW
**Location**: `sidebar.js:979`
**Current**: `label.textContent = 'Reference drawers'`
**Problem**: The term "drawers" is UI jargon (collapsible panels). The user-facing meaning is "reference materials" or "reference documentation". The label is used in the context panel's route card to list available reference sections. While "drawers" is technically accurate (they are `<details>` drawer elements), the label should describe the content, not the UI pattern.
**Recommendation**: Change to `'Reference materials'` — this describes what the user will find, not how it's presented.
**Dependencies**: None.

---

### R19 — Score tooltip text is generic across all 16 criteria

**Priority**: MEDIUM
**Location**: `questionnaire-schema.js:349`
**Current**: `tooltip: '0 = Fails, 1 = Partial/unclear, 2 = Meets baseline, 3 = Strong'`
**Problem**: Every criterion score field (all 16) has this identical tooltip. The same information is available in the "Standard answer sets" reference drawer (`trust-framework.html:273–302`) with more detail. The tooltip adds no criterion-specific guidance — it's a generic scale definition repeated 16 times.
**Recommendation**: Either (a) keep the tooltip as-is (it's useful for quick reference without opening the drawer), or (b) add criterion-specific guidance after the scale: `'0 = Fails, 1 = Partial/unclear, 2 = Meets baseline, 3 = Strong. Score against the criterion statement above.'`. Option (b) adds value beyond what the reference drawer provides.
**Dependencies**: None.

---

## Summary Table

| ID  | Priority | Area                 | File(s)                                | Effort                               |
| --- | -------- | -------------------- | -------------------------------------- | ------------------------------------ |
| R1  | HIGH     | Empty state          | trust-framework.html:106               | Trivial                              |
| R2  | HIGH     | Button label         | questionnaire-pages.js:1373            | Small                                |
| R8  | HIGH     | Help panel           | help-panel.js:239–251                  | Medium (requires keyboard.js change) |
| R9  | HIGH     | Button label         | evidence.js:731                        | Trivial                              |
| R11 | HIGH     | Validation messages  | questionnaire-pages.js:1134, derive.js | Medium                               |
| R4  | MEDIUM   | Placeholder          | questionnaire-pages.js:556             | Trivial                              |
| R5  | MEDIUM   | Placeholder          | evidence.js:312                        | Trivial                              |
| R7  | MEDIUM   | Pager label          | pager.js:107                           | Trivial                              |
| R10 | MEDIUM   | Tag text             | questionnaire-pages.js:601             | Trivial                              |
| R13 | MEDIUM   | Status text          | evidence.js:1044                       | Trivial                              |
| R14 | MEDIUM   | Progress detail      | sidebar.js:171                         | Trivial                              |
| R19 | MEDIUM   | Tooltip              | questionnaire-schema.js:349            | Trivial                              |
| R3  | MEDIUM   | Section label        | questionnaire-pages.js:1297            | Trivial                              |
| R6  | LOW      | Select placeholder   | evidence.js:221                        | Trivial                              |
| R12 | LOW      | Label                | questionnaire-pages.js:1208            | Trivial                              |
| R15 | LOW      | Kicker text          | sidebar.js:367,386                     | Trivial                              |
| R16 | LOW      | Button label         | sidebar.js:874                         | Trivial                              |
| R17 | LOW      | Placeholder fallback | questionnaire-pages.js:558             | Trivial                              |
| R18 | LOW      | Section label        | sidebar.js:979                         | Trivial                              |

**Effort breakdown**: 13 trivial, 3 small, 3 medium. Most changes are single-line string replacements.

---

## Consistency Audit

Terminology was checked across all source files:

| Term              | Count | Consistent? | Notes                                                          |
| ----------------- | ----- | ----------- | -------------------------------------------------------------- |
| "criterion"       | 200+  | Yes         | Never "question", "item", or "metric"                          |
| "principle"       | 100+  | Yes         | Never "domain", "pillar", or "dimension"                       |
| "submission type" | 30+   | Yes         | Consistent in labels, option sets, rules                       |
| "workflow state"  | 50+   | Yes         | Never "page state" or "section state" in user-facing text      |
| "evidence"        | 200+  | Yes         | Consistent as noun (never "proof" or "documentation")          |
| "judgment"        | 40+   | Yes         | Consistent (not "rating" or "assessment" for principles)       |
| "score"           | 80+   | Yes         | Used for criterion-level (0–3), not for principles             |
| "recommendation"  | 50+   | Yes         | Never "verdict" or "conclusion" in form labels                 |
| "skip"            | 60+   | Yes         | Both section and criterion skip use same term                  |
| "association"     | 20+   | Yes         | Used for evidence-criterion links (not "link" or "attachment") |
| "drawers"         | 15+   | Mostly      | Used in code and one sidebar label — see R18                   |
| "display only"    | 5     | Minor       | See R10 for suggested improvement                              |

---

_End of Wave 4 Clarity Audit_
