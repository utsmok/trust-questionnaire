# Typeset & Clarity Review of Consolidated Findings

Date: 2026-04-04
Reviewers: `typeset` + `clarify` skill lenses
Scope: Typography hierarchy, text clarity, and copy quality in the TRUST questionnaire UI

---

## 1. Typeset Findings

### 1.1 Issues Found in Source Code

#### T1. `--text-xs` (0.625rem / 10px) is below minimum readability

`tokens.css:290` defines `--text-xs: 0.625rem`. At default browser zoom this is 10px — well below the 16px minimum the typeset skill sets for body text, and below the practical minimum of ~11px for any legible text. It is consumed by:

- `.strip-cell` (completion strip page codes) — `components.css:36`
- `.reference-drawer-code` (drawer code badges) — `components.css:1455`
- `.completion-badge` — `components.css:342`
- `.page-index-code` — `components.css:1071`
- `.page-index-state`, `.page-index-status` — `components.css:1104`
- `.context-route-code` — `components.css:1158`
- `.context-anchor-code` — `components.css:1304`
- `.evidence-input-label`, `.evidence-note-label`, `.evidence-meta-item` — `components.css:656`
- `.context-route-row dt` — `components.css:1216`

These are not decorative elements — they carry essential identity information (page codes, criterion codes, metadata labels). Users with vision impairments or high-DPI scaling will struggle to read them.

**Recommendation**: Raise `--text-xs` to `0.6875rem` (11px) minimum, or `0.75rem` (12px) for better readability. Audit all consumers and ensure foreground contrast meets WCAG AA at the new size.

#### T2. The type scale is not a consistent modular scale

`tokens.css:290–296` defines 7 steps:

| Token | Value | Ratio to previous |
|-------|-------|-------------------|
| `--text-xs` | 0.625rem | — |
| `--text-sm` | 0.75rem | 1.20 |
| `--text-body` | 1rem | 1.33 |
| `--text-sub` | 1.2rem | 1.20 |
| `--text-heading` | 1.563rem | 1.30 |
| `--text-display` | 2.25rem | 1.44 |
| `--text-mega` | 2.75rem | 1.22 |

The ratios range from 1.20 to 1.44. Steps 2→3 (0.75→1.0) and 3→4 (1.0→1.2) are only 1.33 and 1.20 apart — too close for clear hierarchy. The typeset skill recommends a consistent ratio (1.25, 1.333, or 1.5).

**Recommendation**: Adopt a consistent 1.25 ratio: 0.75, 1.0, 1.25, 1.563, 1.95, 2.44 — or keep the current values but acknowledge the hierarchy depends on weight+color+spacing combination, not size alone. The current approach works *only* because weight contrasts are strong (700 vs 400) and color distinguishes heading from body.

#### T3. Panel title tracking is excessive

`layout.css:128–138` — `.panel-title` uses `letter-spacing: var(--ls-panel-title)` where `--ls-panel-title: 0.12em` (`tokens.css:309`). Combined with `text-transform: uppercase`, `font-weight: 700`, and `font-size: var(--text-display)` (2.25rem), this creates a very widely-spaced heading that reads as shouted rather than structured.

**Recommendation**: Reduce `--ls-panel-title` to `0.06em–0.08em`. The heading is already uppercase and bold at a large size — it doesn't need 0.12em tracking to stand out.

#### T4. Reference drawer title has no explicit font-size or weight

`components.css:1458–1460` — `.reference-drawer-title` only sets `line-height: var(--lh-sub)`. It inherits `font-size`, `font-weight`, `font-family`, and `text-transform: uppercase` from `.reference-drawer-summary` (`components.css:1413–1427`), which is `font-size: var(--text-sm)` (0.75rem = 12px), `font-weight: 700`, `font-family: var(--ff-heading)`, `text-transform: uppercase`.

The report (Issue 4.1) correctly diagnoses that the code, title, and status badge run together. But it misses that the drawer **title is only 12px** — the same size as a field label. For the primary clickable element that opens/closes reference drawers, this is undersized.

**Recommendation**: Give `.reference-drawer-title` explicit `font-size: var(--text-body)` (1rem) and remove `text-transform: uppercase` inheritance by setting `text-transform: none`. The drawer title should be larger and in mixed-case to contrast with the uppercase code badge.

#### T5. Font choices are invisible defaults

`tokens.css:324–326`:
- `--ff-body: 'Inter'` — explicitly flagged by the typeset skill as an "invisible default" lacking personality
- `--ff-heading: 'Arial Narrow'` — a system font that adds no character

For an academic evaluation tool, these are defensible (professional, neutral) but they contribute to a generic feel. The pairing is also same-category (both sans-serif geometric/humanist) without genuine contrast.

**Recommendation**: Not a priority change, but flag for future design iteration. A serif heading font paired with Inter body would create stronger visual hierarchy. If keeping both sans-serif, consider a condensed sans (like the current Arial Narrow) at heavier weights to increase contrast.

#### T6. Font loading strategy not analyzed

No `@font-face` declarations were found in the CSS files. Inter and JetBrains Mono are presumably loaded via an external stylesheet (likely Google Fonts) referenced in `trust-framework.html`. The report doesn't assess:

- Whether `font-display: swap` is used (prevents invisible text during load)
- Whether metric-matched fallbacks exist (prevents layout shift)
- Whether only used weights are loaded (Inter has 9 weights; loading all adds significant page weight)

**Recommendation**: Audit the font loading in `trust-framework.html`. Ensure `font-display: swap` is set, and only load the weights actually consumed (400, 700 appear to be the only two used).

### 1.2 Gaps in the Report (Typeset)

#### G-T1. Section subtitle removal creates a typographic hierarchy gap

Issue 6.2 proposes removing the `.panel-title-section` suffix (e.g., "— Transparent") from panel titles. The report argues "users already know which section they're on via the page index, completion strip, and kicker text."

This is **partially incorrect**:
- The page index is in the left sidebar, which may be collapsed or out of viewport
- The completion strip cells are `aria-hidden="true"` and `role="presentation"` — they are not accessible and are visually small (28px tall, `--text-xs` at 10px)
- The section kicker (`.section-kicker`) is `--text-sm` (12px) and positioned inside the form content, not in the panel header

The panel title suffix is the **only visible, accessible, header-level indicator** of which section the user is viewing. Removing it eliminates the strongest typographic hierarchy signal in the panel chrome.

**Recommendation**: Don't remove the section subtitle. Instead, fix the bugs in `ensurePanelTitleSuffix()` (Issue 2.7) and keep it as a permanent fixture. If it must be removed, add the section name to the panel title via the `data-section` attribute and style it with section accent color for visual identity.

#### G-T2. Reference drawer subtitle typography

`components.css:1486–1491` — `.reference-drawer-subtitle` uses `font-size: var(--text-body)` (1rem) and `color: var(--ut-muted)`. This is fine, but it sits between the 12px summary header and the panel content. No typographic treatment makes it distinct from body text in the panel below. The report doesn't mention this element at all.

#### G-T3. No analysis of `--text-sub` usage

`--text-sub: 1.2rem` is used for h3 headings (`components.css:151–158`) and context route titles (`components.css:1137`). The gap between `--text-sub` (1.2rem) and `--text-heading` (1.563rem) is only 1.30x — muddy hierarchy. The report doesn't flag this.

### 1.3 Typeset Recommendations Summary

| Priority | Finding | Action |
|----------|---------|--------|
| High | T1 — 10px text below readability | Raise `--text-xs` to 0.6875rem+ |
| High | G-T1 — Subtitle removal creates hierarchy gap | Keep the section subtitle; fix bugs instead |
| Medium | T3 — Panel title tracking 0.12em | Reduce to 0.06–0.08em |
| Medium | T4 — Drawer title at 12px, no weight/size | Set `font-size: var(--text-body)`, `text-transform: none` |
| Low | T2 — Inconsistent type scale ratio | Document the intentional hierarchy strategy |
| Low | T5 — Generic font pairing | Flag for future iteration |
| Low | T6 — Font loading audit needed | Check `trust-framework.html` for `font-display` |

---

## 2. Clarify Findings

### 2.1 Issues Found in Source Code

#### C1. Proposed shortening of SECTION_NOTE_HELP_TEXT loses clarity

Current (`questionnaire-pages.js:40–41`):
> "Optional section-level note for observations not captured elsewhere. This does not satisfy required summary, blocker, or rationale fields."

Report proposes: **"Optional — does not count toward required fields."**

The proposed text is clearer in brevity but loses the key information: *what kind of note is this for?* "Does not count toward required fields" is vague — which fields? Why does this matter?

**Better rewrite**: "Free-form note for observations that don't fit elsewhere. Does not satisfy any required field."

#### C2. Proposed shortening of CRITERION_SKIP_SCAFFOLD_HELP_TEXT loses actionable guidance

Current (`questionnaire-pages.js:44–45`):
> "Use criterion skip only when the criterion cannot be assessed — not as a substitute for a low score. Both a skip reason and rationale are required. Child fields become non-required while the skip is active."

Report proposes: **"Not a substitute for low scores. Requires reason and rationale."**

This loses two critical pieces of information:
1. *When* to skip — "only when the criterion cannot be assessed"
2. *What happens* — "child fields become non-required"

The "Not a substitute for low scores" line is also jargon-y. A first-time evaluator may not understand what "low scores" has to do with skipping.

**Better rewrite**: "Skip only when the criterion cannot be assessed (e.g., insufficient data or tool unavailable). Score normally if you can evaluate it. Reason and rationale required. All child fields become optional."

#### C3. Redundant section-code prefixes on field labels

In `questionnaire-schema.js`, section-level fields include the principle code in their labels:

- `re.testMethodDescription` → label: "RE Test method description" (line 301)
- `re.claimsManuallyCheckedCount` → label: "RE Claims manually checked" (line 302)
- `uc.targetUserPersonas` → label: "UC Target user personas" (line 309)
- `se.dpiaPrivacyEscalationRequired` → label: "SE DPIA/privacy escalation required" (line 317)
- `tc.claimsTraceablePercentage` → label: "TC Claims traceable percentage" (line 326)

The `getFieldDisplayLabel()` function (`questionnaire-pages.js:563–573`) strips criterion code prefixes (e.g., "TR1 Score" → "Score") but does NOT strip section prefixes from section-level fields. Since these fields appear inside a section with a visible header ("Reliability", "User-Centric"), the prefix is redundant visual noise.

**Recommendation**: Either strip prefixes in `getFieldDisplayLabel()` or remove them from the schema labels. Criterion field labels are already handled; section-level fields need the same treatment.

#### C4. Developer-facing notes exposed as help text

`questionnaire-schema.js` only two fields have `notes`:

1. `s8.criticalFailFlags` (line 332): `notes: 'An explicit empty selection is allowed and means "none".'` — Acceptable but could be clearer: "Select any that apply, or leave empty for 'none'."
2. `se.complianceConfidence` (line 319): `notes: 'The HTML prototype used "assessment"; the canonical questionnaire uses "confidence".'` — **Pure developer documentation.** This appears in the UI via `getFieldHelpText()` (`questionnaire-pages.js:596–603`), which joins notes with rule descriptions and displays them as `.field-help` text.

The `getFieldHelpText()` function concatenates `field.notes`, `optionSet.notes`, and rule descriptions with bullet separators. This means developer-facing notes like "The HTML prototype used..." are shown to users.

**Recommendation**: Either remove developer-facing notes from the `notes` field (move them to comments), or add a separate `devNotes` property that `getFieldHelpText()` excludes.

#### C5. Placeholder text is developer-facing for derived fields

`questionnaire-pages.js:526–528`:
```js
if (field.derived) {
  return 'Derived from current state';
}
```
And line 546:
```js
return field.control === 'computed_select' ? 'Computed value' : 'Select an option';
```

"Derived from current state" and "Computed value" are developer concepts. Users don't know what "derived" means.

**Better text**: "Auto-filled based on your responses" for derived fields, and "Auto-calculated" for computed selects.

#### C6. Sidebar fallback copy varies in quality

`sidebar.js:34–107` — `PAGE_FALLBACK_COPY` has 8 entries (S0, S1, S2, S8, S9, S10A, S10B, S10C). Quality varies:

- **S0**: Good — actionable ("Set the workflow mode, canonical tool identity, and responder role first")
- **S1**: Good — explains what the page captures
- **S2**: Good — establishes purpose
- **S8**: Reads as warning rather than guidance ("Critical fails and confidence are evaluation-wide controls")
- **S9**: Reads as instruction manual ("Convert the principle-level evidence into a final institutional recommendation")
- **S10A**: Unclear metaphor ("packages the primary evaluation for second review") and a tone problem ("should expose uncertainties rather than smoothing them away")
- **S10B**: Just restates the section title ("Record agreement, disagreement, and any criteria that need to be revisited")
- **S10C**: Vague ("Capture the final team decision, publication status, and review cadence in a way that can survive handoff")

The report says "TRIM" for all of these, but some need rewriting, not trimming.

**Recommendation**: Classify each entry as "trim", "rewrite", or "keep". S0–S2: trim. S8: rewrite for neutral tone. S9: rewrite as guidance. S10A: rewrite to remove editorializing. S10B–S10C: rewrite with specific actionable guidance.

#### C7. Evidence empty state text should be actionable

`evidence.js:94–109` — The report proposes simplifying all empty states to "No evidence attached." This is clear but passive. A better pattern:

> "No evidence attached. Use the form below to add screenshots, exports, or supporting files."

This tells the user what to do next, following the clarify skill principle of being helpful, not just descriptive.

### 2.2 Gaps in the Report (Clarity)

#### G-C1. Proposed tab labels need user testing

Issue 2.6 proposes renaming surface buttons:
- "Context" → "Guidance"
- "Info" → "Background"
- "Help" → "Legend"

"Legend" is unclear — legend for what? Scoring legend? Color legend? A user encountering a "Legend" tab wouldn't know it contains the help panel content (section map, progress legend, usage notes). "Legend" only makes sense if you already know what's inside.

**Better options**: "Guide", "Reference", "Help" or "Context", "About", "Help". The label should predict content, not categorize it abstractly.

#### G-C2. Pager buttons lack wayfinding context

`components.css:1367–1381` — Pager buttons say "Previous" and "Next". For a 13-page questionnaire, these labels don't tell users where they're going. Adding the target page name improves navigation:

- "Previous: Tool Profile" instead of just "Previous"
- "Next: Evidence Base" instead of just "Next"

The `buildSectionNavigationLabel()` function (`sidebar.js:261–273`) already generates rich `aria-label` text for sidebar buttons. The same pattern could apply to pager buttons.

#### G-C3. Section skip help text is too terse

Current (`questionnaire-pages.js:42–43`):
> "Skipping a section overrides all child field requirements. Both a skip reason and rationale are required."

Report proposes: **"Requires reason and rationale. All child fields become non-required."**

This is acceptable but loses the causal explanation: "overrides all child field requirements" tells the user *why* their fields might stop being required. Without it, "All child fields become non-required" reads as a side effect rather than the intentional behavior of skipping.

**Better rewrite**: "Skip this section to mark it as not applicable. All fields inside become optional. A reason and rationale are required."

#### G-C4. Panel captions (items F, G) should be rewritten, not removed

The report proposes **removing** both panel captions:
- F: `"Fill out each section using the page index or pager. Reference drawers below provide scoring and evidence guidance. Framework background is in Info."`
- G: `"Page-specific guidance and reference links appear here. Scoring references are in the drawers above. Framework background and governance details are in the Info surface."`

These are indeed verbose, but they serve an onboarding function for first-time users. Removing them entirely means new users have no orientation. The correct fix is to **rewrite**, not remove:

- F → "Navigate pages using the pager below or the sidebar index."
- G → "Guidance for the current page appears here. Reference drawers provide scoring and evidence rules."

#### G-C5. "Select an option" is generic placeholder text

`questionnaire-pages.js:546` — The fallback placeholder for select controls is "Select an option". The clarify skill principle is to be specific. Better: "Choose {field.label.toLowerCase()}" — e.g., "Choose a deployment type", "Choose an access model".

### 2.3 Clarity Recommendations Summary

| Priority | Finding | Action |
|----------|---------|--------|
| High | C4 — Developer notes shown as help text | Move to comments or `devNotes` property |
| High | C3 — Redundant section prefixes on field labels | Strip in `getFieldDisplayLabel()` |
| Medium | C2 — Criterion skip text loses actionable info | Rewrite with fuller guidance |
| Medium | G-C4 — Panel captions removed instead of rewritten | Shorten, don't remove |
| Medium | G-C1 — "Legend" tab label unclear | Use "Help" or test alternatives |
| Medium | C5 — "Derived from current state" placeholder | Change to "Auto-filled based on your responses" |
| Medium | C1 — Section note help text too vague | Add "free-form" and clarify purpose |
| Low | C6 — Fallback copy quality varies | Classify as trim/rewrite/keep and address individually |
| Low | C7 — Evidence empty state passive | Add call to action |
| Low | G-C2 — Pager buttons lack wayfinding | Add target page name |
| Low | G-C3 — Section skip text terse | Add "mark as not applicable" framing |

---

## 3. Suggested Amendments to the Report

### 3.1 Typeset Amendments

1. **Add new issue T-NEW-1**: "Text at `--text-xs` (10px) falls below readability minimums." Severity: P1. Files: `tokens.css:290`, all consumers of `--text-xs` in `components.css`.

2. **Amend Issue 4.1** (Reference drawer header): Add that `.reference-drawer-title` should receive explicit `font-size: var(--text-body)` and `text-transform: none` — the report's fix focuses on the code badge and visual separators but doesn't address the title being 12px.

3. **Amend Issue 6.2** (Section subtitle removal): Change action from "Remove" to "Fix and keep". The section subtitle provides the only accessible, header-level section identity cue. Remove the bugs (Issue 2.7) but retain the suffix. If removed, add a replacement section identity element in the panel header at `--text-sub` size with section accent color.

4. **Add new issue T-NEW-2**: "Panel title letter-spacing (`--ls-panel-title: 0.12em`) is excessive for an already-uppercase, bold, 2.25rem heading." Severity: P3. File: `tokens.css:309`.

5. **Add to Phase 3** or Phase 7: Audit font loading in `trust-framework.html`. Ensure `font-display: swap` and only load weights 400 and 700.

### 3.2 Clarity Amendments

1. **Amend Issue 6.1 item C** (Section note help): Change proposed text from "Optional — does not count toward required fields." to "Free-form note for observations that don't fit elsewhere. Does not satisfy any required field."

2. **Amend Issue 6.1 item E** (Criterion skip help): Change proposed text from "Not a substitute for low scores. Requires reason and rationale." to "Skip only when the criterion cannot be assessed. Score normally if you can evaluate it. Reason and rationale required. All child fields become optional."

3. **Amend Issue 6.1 item D** (Section skip help): Change proposed text from "Requires reason and rationale. All child fields become non-required." to "Skip this section to mark it as not applicable. All fields inside become optional. A reason and rationale are required."

4. **Amend Issue 6.1 items F and G**: Change action from **REMOVE** to **SHORTEN**. Replace verbose captions with concise orientation text (see G-C4 above for suggested rewrites).

5. **Amend Issue 2.6** (Tab labels): Change "Help" → "Legend" to something more predictable. Suggest: "Guide", "Background", "Help" — or user-test alternatives.

6. **Add new issue C-NEW-1**: "Field labels for section-level fields include redundant principle-code prefixes (e.g., 'RE Test method description' when already on the RE page). `getFieldDisplayLabel()` strips criterion prefixes but not section prefixes." Severity: P2. Files: `questionnaire-schema.js` (labels), `questionnaire-pages.js:563–573`.

7. **Add new issue C-NEW-2**: "Developer-facing `notes` field on `se.complianceConfidence` appears in UI help text via `getFieldHelpText()`. Move developer notes to code comments or a separate `devNotes` property." Severity: P2. Files: `questionnaire-schema.js:319`, `questionnaire-pages.js:596–603`.

8. **Add new issue C-NEW-3**: "Derived field placeholder text ('Derived from current state', 'Computed value') uses developer jargon. Replace with user-facing language ('Auto-filled based on your responses', 'Auto-calculated')." Severity: P2. Files: `questionnaire-pages.js:526–528, 546`.

---

## 4. Concerns

### 4.1 Removing the section subtitle (Issue 6.2) is the highest-risk change in the report

The section subtitle ("— Transparent", "— Reliable", etc.) is:
- The **only accessible** section identity element in the panel header (the completion strip is `aria-hidden`)
- The **most visually prominent** section indicator (2.25rem, bold, in the fixed panel header)
- Colored by section accent (via `.panel-title-section.tr`, `.panel-title-section.re`, etc. in `interaction-states.css:83–101`)

Removing it means the user's only section identity cues are:
- A 12px kicker inside the scrollable content
- A small code in the page index sidebar (which may be hidden on narrow viewports)

The report dismisses this with "users already know which section they're on" — but for a 13-page form with 5 color-coded principle sections, this assumption doesn't hold for first-time users or users returning to a partially-completed evaluation.

**Recommendation**: Keep the subtitle. Fix the bugs (Issue 2.7). If anything, enhance it by making the suffix text use the section accent color consistently (it already does via CSS — just fix the stale-update bugs).

### 4.2 The tooltip text proposals (Section 7.2) are well-written but the implementation plan is underspecified

The suggested tooltip texts are specific, clear, and follow clarify skill principles well. However:
- Section 7.3 proposes a `?` icon + popover but doesn't specify popover sizing, placement (above? below? left-aligned?), or how it handles narrow viewports
- The "alternative approach" (collapsible inline `.field-help`) is mentioned but not evaluated against the popover approach
- No design for how tooltips interact with the existing `.field-help` divs (which show `notes` content currently)

**Recommendation**: Before implementing, decide between popover and inline-collapsible. The inline approach is simpler and more accessible (no focus management needed), but takes vertical space. The popover approach is cleaner but needs more infrastructure.

### 4.3 The sidebar tab merger (Issue 2.8) is a large refactor with cascading text implications

Merging three surfaces into tabbed sidebar changes the context for every piece of text in all three panels:
- The context panel's "Reference drawers" and "Info topics" link sections become self-referential (drawers would be in the same panel)
- The help panel's `PAGE_HELP_SUMMARIES` would need their section-identity language updated (e.g., "Section color marks transparency context" — but what is "section color" in the new tabbed UI?)
- The about panel's topic buttons would need to know they're opening within a tab, not a modal

**Recommendation**: Add a text-review step to the migration plan in Issue 2.8. After the DOM migration, audit all text in all three tab panels for references to the old surface names and behaviors.

### 4.4 The "Simplify evidence empty states" (Issue 6.1 item B) loses differentiation

The report proposes collapsing 5 different principle-specific empty state hints plus evaluation-level and criterion-level fallbacks to a single "No evidence attached." The current text, while verbose, at least provides principle-specific guidance (e.g., "Attach source documentation, screenshots, or methodology disclosures" for Transparency evidence). The single replacement text loses this context.

**Recommendation**: Keep a short principle-specific hint. E.g., "No evidence attached. Attach {principle-specific noun}." — "Attach source documentation" for TR, "Attach verification records" for RE, etc. One sentence, not the current 2–3 sentence variants.
