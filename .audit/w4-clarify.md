# Wave 4 — /clarify UX Copy Audit

**Date**: 2026-04-04
**Sources**: .impeccable.md (design context), w3-plan.md (Wave 3 findings)
**Target**: All user-facing text across trust-framework.html, static/js/
**Constraint**: Read-only — no source files modified

---

## Already Good — Do Not Change

The following text patterns are well-executed and match the design context:

- **Criterion statements** (questionnaire-schema.js:191–207) — Precise, evaluative language appropriate for domain experts. No jargon issues.
- **Option set labels** (option-sets.js) — Canonical, consistent vocabulary. "Recommended with caveats", "Needs review / provisional" etc. are institutional terms that should not be softened.
- **Context panel guidance** (trust-framework.html:300–443) — Dense, directive prose that matches the "trust user intelligence" principle. Good use of imperative voice.
- **Reference drawer content** (trust-framework.html:76–268) — Tables, checklists, and decision rules are clear and appropriately detailed.
- **Evidence block labels** (evidence.js:81–89) — "Evaluation evidence intake" vs "TR1 evidence association" correctly distinguishes scope.
- **ARIA labels** — Thorough and specific throughout (pager buttons, navigation, evidence controls).
- **Page code display** — Section codes (S0, TR, RE, etc.) are consistently exposed and paired with human-readable titles.

---

## Findings

### R1 — Keyboard shortcut descriptions use wrong principle names

**Priority**: HIGH
**Category**: Accuracy / misleading copy
**Location**: `static/js/render/help-panel.js:359–364`
**Description**: The help panel keyboard shortcuts table maps Alt+1–5 to "Transparent", "Responsible", "Understandable", "Sustainable", "Trustworthy Computing" — these are the generic NIST AI RMF principle names, not the TRUST framework's principle names. The actual TRUST principles are Transparent, **Reliable**, **User-centric**, **Secure**, and **Traceable**.

**Current text**:

```
Alt + 1  →  Jump to Transparent (TR)
Alt + 2  →  Jump to Responsible (RE)
Alt + 3  →  Jump to Understandable (UC)
Alt + 4  →  Jump to Sustainable (SE)
Alt + 5  →  Jump to Trustworthy Computing (TC)
```

**Proposed replacement**:

```
Alt + 1  →  Jump to Transparent (TR)
Alt + 2  →  Jump to Reliable (RE)
Alt + 3  →  Jump to User-centric (UC)
Alt + 4  →  Jump to Secure (SE)
Alt + 5  →  Jump to Traceable (TC)
```

The Alt+t/r/u/s/c rows (lines 364–368) also reference wrong principle descriptions but are already generic ("page with code starting with T") so they are acceptable.

**Dependencies**: None.

---

### R2 — Panel captions contain developer-facing implementation language

**Priority**: HIGH (carries over from w3-plan P3-04)
**Category**: UX writing / audience mismatch
**Location**:

- `trust-framework.html:72` — Questionnaire panel caption
- `trust-framework.html:292` — Context panel caption
  **Description**: These captions describe software architecture (page index, pager, reference drawers, shell surfaces) rather than guiding the user on what to do. This was flagged in w3-plan.md as P3-04.

**Current text** (line 72):

> The questionnaire is the primary surface. The page index and pager govern movement, reference drawers stay above the form, and framework background remains in the Info surface.

**Proposed replacement**:

> Fill out each section using the page index or pager. Reference drawers below provide scoring and evidence guidance. Framework background is in Info.

**Current text** (line 292):

> Active-page guidance lives here. Generic scoring and evidence references stay in drawers; framework background and governance stay in the Info surface. On narrow screens this panel becomes a dismissible drawer.

**Proposed replacement**:

> Page-specific guidance and reference links appear here. Scoring references are in the drawers above. Framework background and governance details are in the Info surface.

**Dependencies**: None.

---

### R3 — Context fallback empty-state text is developer-oriented

**Priority**: MEDIUM
**Category**: UX writing / audience mismatch
**Location**: `trust-framework.html:296–298`
**Description**: The context panel fallback section uses implementation terminology ("route cards", "page anchors", "literal topic blocks", "content registries") that is meaningless to evaluators.

**Current text**:

> Route cards, page anchors, and literal topic blocks are driven from the section and content registries. If a page lacks bespoke context prose, the generated route summary remains authoritative.

**Proposed replacement**:

> Context guidance loads automatically when a page is selected. If a section has specific guidance, it appears here; otherwise a summary is generated from the section definition.

**Dependencies**: None.

---

### R4 — Help panel usage note #1 references wrong UI terminology

**Priority**: MEDIUM
**Category**: Terminology consistency
**Location**: `static/js/render/help-panel.js:333`
**Description**: The help panel references "quick-jump" as a concept, but the header nav is labeled "TRUST principle quick jump" in the HTML (line 44). The term "quick jump" is internal jargon that doesn't appear in the visible UI.

**Current text**:

> Use the page index for the authoritative full-questionnaire route; use TR/RE/UC/SE/TC as a fast quick-jump subset only.

**Proposed replacement**:

> Use the page index for the authoritative full-questionnaire route; use the TR/RE/UC/SE/TC buttons in the header for fast principle navigation.

**Dependencies**: None.

---

### R5 — Help panel usage note #4 mentions shortcuts not yet implemented

**Priority**: MEDIUM
**Category**: Accuracy / misleading copy
**Location**: `static/js/render/help-panel.js:336`
**Description**: The usage note states "Alt+1 through Alt+5 jump to TR, RE, UC, SE, and TC; Escape closes the active Context drawer, Info surface, or Help surface." The Escape shortcut exists, but w3-plan P3-08 identified that Alt+Left/Alt+Right pager shortcuts are missing. This note is accurate as written but incomplete — however, more importantly, the keyboard shortcuts section (lines 358–369) documents Alt+t/r/u/s/c shortcuts that **do not exist in the codebase**.

**Location of phantom shortcuts**: `static/js/render/help-panel.js:364–368`

**Current text**:

```
Alt + t  →  Jump to page with code starting with T
Alt + r  →  Jump to page with code starting with R
Alt + u  →  Jump to page with code starting with U
Alt + s  →  Jump to page with code starting with S
Alt + c  →  Jump to page with code starting with C
```

The keyboard.js `QUICK_JUMP_SHORTCUTS` object (keyboard.js:3–13) **does** include these mappings, so they do work. However, the descriptions are misleading because multiple sections start with S (S0, S1, S2, S8, S9, S10A, S10B, S10C) and the shortcut would jump to the first matching one. The description implies a unique match.

**Proposed replacement**: Clarify that letter shortcuts jump to the first matching page:

```
Alt + s  →  Jump to first page with code starting with S
```

**Dependencies**: None.

---

### R6 — "Condition active" vs "Conditional" tag text is unclear

**Priority**: MEDIUM
**Category**: Form field UX / clarity
**Location**: `static/js/render/questionnaire-pages.js:626–630`
**Description**: Conditional fields display either "Condition active" (when the condition is met and the field is required) or "Conditional" (when the condition is not met). "Condition active" is ambiguous — it could mean the field is active/visible, or that some condition is active. Users may not understand whether they need to fill the field.

**Current logic**:

```js
text: fieldState?.required ? 'Condition active' : 'Conditional',
```

**Proposed replacement**:

```js
text: fieldState?.required ? 'Required now' : 'Conditional',
```

"Required now" directly tells the user what to do. "Conditional" is acceptable as-is since it correctly indicates the field may become required.

**Dependencies**: None.

---

### R7 — "Display only" tag for derived fields is ambiguous

**Priority**: LOW
**Category**: Form field UX / clarity
**Location**: `static/js/render/questionnaire-pages.js:623`
**Description**: Derived fields like principle judgments display a "Display only" tag. This is technically accurate but doesn't tell the user _why_ the field can't be edited or _how_ the value is determined.

**Current text**: `Display only`

**Proposed replacement**: `Computed` — this is shorter and more precise. The field's value is computed from criterion scores, not merely displayed. The existing placeholder text "Derived from current state" (line 567) already uses "derived" — using "Computed" for the tag provides a clearer signal without being verbose.

**Dependencies**: None.

---

### R8 — Placeholder text inconsistency for number fields

**Priority**: LOW
**Category**: Form field UX / consistency
**Location**: `static/js/render/questionnaire-pages.js:578`
**Description**: Number-type fields show the generic placeholder "Enter number", while the schema defines specific field meanings (e.g., `RE Claims manually checked` is a count of claims verified).

**Current text**: `Enter number` (for all number fields)

**Proposed approach**: The generic placeholder is acceptable for a domain-expert audience. The field label (e.g., "RE Claims manually checked") already provides context. No change needed, but flagging for completeness.

**Dependencies**: None.

---

### R9 — Section skip help text is unnecessarily wordy

**Priority**: LOW
**Category**: UX writing / conciseness
**Location**: `static/js/render/questionnaire-pages.js:47`
**Description**: The section skip help text is 31 words and could be more direct.

**Current text**:

> Section skip overrides child field dependencies and requiredness for this page, but both a skip reason and a substantive rationale are required.

**Proposed replacement**:

> Skipping a section overrides all child field requirements. Both a skip reason and rationale are required.

**Dependencies**: None.

---

### R10 — Criterion skip help text is unnecessarily wordy

**Priority**: LOW
**Category**: UX writing / conciseness
**Location**: `static/js/render/questionnaire-pages.js:48`
**Description**: The criterion skip help text is 43 words — the longest help text in the schema. It can be tightened.

**Current text**:

> Criterion skip is separate from a low or negative score. Use it only when the criterion cannot be assessed; both a skip reason and a substantive rationale are required, and criterion child fields stop contributing requiredness while the skip is active.

**Proposed replacement**:

> Use criterion skip only when the criterion cannot be assessed — not as a substitute for a low score. Both a skip reason and rationale are required. Child fields become non-required while the skip is active.

**Dependencies**: None.

---

### R11 — Evidence empty-state messages are directive but inconsistent in structure

**Priority**: LOW
**Category**: UX writing / consistency
**Location**: `static/js/render/evidence.js:91–97`
**Description**: Principle-specific evidence hints follow the pattern "No evidence attached. Attach [specific items]." The evaluation-level empty state (line 101) uses a different pattern: "No evaluation-level evidence attached yet." All could be more actionable by stating what to do next.

**Current texts**:

- `No evidence attached. Attach source documentation, screenshots, or methodology disclosures.`
- `No evaluation-level evidence attached yet.`

**Proposed evaluation-level text**:

> No evaluation-level evidence attached yet. Add screenshots, exports, or supporting files using the intake form below.

**Dependencies**: None.

---

### R12 — "Canonical page progress strip" aria-label is jargon

**Priority**: LOW
**Category**: Accessibility / screen reader clarity
**Location**: `trust-framework.html:42`
**Description**: The completion strip's aria-label uses "Canonical" which is an internal term not meaningful to evaluators.

**Current text**: `Canonical page progress strip`

**Proposed replacement**: `Questionnaire progress strip`

**Dependencies**: None.

---

### R13 — "Canonical page index" heading is jargon

**Priority**: LOW
**Category**: UX writing / jargon
**Location**: `static/js/render/sidebar.js:889`
**Description**: The page sidebar heading uses "Canonical" — internal terminology not exposed to users elsewhere in the UI.

**Current text**: `Canonical page index`

**Proposed replacement**: `Page index`

**Dependencies**: None.

---

### R14 — "Context route" kicker is internal terminology

**Priority**: LOW
**Category**: UX writing / jargon
**Location**: `static/js/render/sidebar.js:1055`
**Description**: The context route card kicker says "Context route" — this describes the software architecture, not what the user should do.

**Current text**: `Context route`

**Proposed replacement**: `Current page` — this matches the help panel's usage (help-panel.js:139) and is more meaningful to evaluators.

**Dependencies**: None.

---

### R15 — Context route info row labels could be more descriptive

**Priority**: LOW
**Category**: UX writing / clarity
**Location**: `static/js/render/sidebar.js:1071–1098`
**Description**: The context route card info grid uses terse labels: "Mode", "Topic", "Focus", "Workflow", "Status", "Required". "Topic" and "Focus" are vague. "Mode" is acceptable given the audience.

- "Topic" → "Context topic" (matches help panel, line 156)
- "Focus" → "Active focus" or keep as-is (it already shows either a criterion code or "Page-level overview")

**Proposed**: Change "Topic" to "Context topic" for consistency with the help panel. Leave other labels as-is — they are concise and the domain audience will understand them.

**Dependencies**: None.

---

### R16 — "Generated guidance" kicker is implementation-oriented

**Priority**: LOW
**Category**: UX writing / jargon
**Location**: `static/js/render/sidebar.js:509`
**Description**: When a page uses registry-driven fallback content, the context panel kicker shows "Generated guidance" — this describes the content delivery mechanism, not the content itself.

**Current text**: `Generated guidance`

**Proposed replacement**: `Page guidance`

**Dependencies**: None.

---

### R17 — Pager completion message says "sections reviewed" not "sections completed"

**Priority**: LOW
**Category**: UX writing / accuracy
**Location**: `static/js/behavior/pager.js:135`
**Description**: When the evaluation is complete, the pager shows "Evaluation complete — 13 sections reviewed". "Reviewed" implies a second-review workflow; "completed" is more accurate since the user may have filled out the primary evaluation.

**Current text**: `Evaluation complete — ${count} sections reviewed`

**Proposed replacement**: `Evaluation complete — ${count} sections completed`

**Dependencies**: None.

---

### R18 — Keyboard shortcuts section missing from discoverability assessment

**Priority**: HIGH (carries over from w3-plan P1-03)
**Category**: Discoverability / UX writing
**Description**: The keyboard shortcuts are documented only in the Help surface (behind a button press). Per w3-plan P1-03, this is a recognition-over-recall failure. The clarify skill should recommend adding subtle shortcut hints to the pager area, since that's where navigation happens.

**Recommendation**: Add a small, muted-text hint below or beside the pager status line, e.g.:

> `Alt+1–5 principles · Esc close`

This should be visually subordinate — monospace, small font, muted color — consistent with the "engineered" aesthetic. It should not be a tooltip (design context explicitly avoids tooltips).

**Location for implementation**: `static/js/behavior/pager.js` — add hint element within the pager shell.

**Dependencies**: Should be implemented alongside w3-plan P3-08 (Alt+Left/Alt+Right pager shortcuts, assigned to /harden). If pager shortcuts are added, the hint should include them too.

---

## Summary

| Priority | Count | Key themes                                                                                                                            |
| -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH     | 3     | Wrong principle names in help (R1), implementation language in captions (R2), shortcut discoverability (R18)                          |
| MEDIUM   | 4     | Developer-oriented empty states (R3), jargon in usage notes (R4), phantom shortcut descriptions (R5), ambiguous conditional tags (R6) |
| LOW      | 11    | Wordiness (R9, R10), jargon in labels (R12–R16), minor inconsistencies (R7, R11, R17), acceptable-as-is (R8)                          |

**Recommended implementation order**:

1. R1 — Wrong principle names (factual error, trivial fix)
2. R2 — Panel captions (user-facing implementation leak)
3. R18 — Shortcut discoverability hint (design decision + small implementation)
4. R6 — "Condition active" → "Required now"
5. R3 + R14 + R16 — Context panel jargon cleanup (batch)
6. R4 + R5 — Help panel terminology fixes (batch)
7. R12 + R13 — Aria label / heading jargon (batch)
8. R9 + R10 — Help text conciseness (batch)
9. R7, R11, R15, R17 — Minor improvements (batch or defer)

---

## Verification

After implementation:

1. Grep: `Responsible|Understandable|Sustainable|Trustworthy Computing` — should return zero matches in help-panel.js
2. Grep: `primary surface|govern movement|reference drawers stay` — should return zero matches
3. Visual: Open Help surface → verify principle names match TRUST framework
4. Visual: Check pager area for shortcut hint text
5. Visual: Check context panel — no implementation language visible
6. Screen reader: Verify "Questionnaire progress strip" aria-label is announced correctly
