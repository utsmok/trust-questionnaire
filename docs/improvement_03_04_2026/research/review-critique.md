# UX Critique: Consolidated Findings Report & Implementation Plan

Date: 2026-04-04
Reviewer: critique skill (design director lens)
Subject: Plan evaluation — not the current UI

---

## 1. Overall Assessment

The plan is technically thorough and architecturally sound. It correctly identifies the three dominant themes (broken surfaces, duplicated navigation, inconsistent form controls) and proposes a coherent phased approach. The dependency graph is well-reasoned.

**However**, the plan reads like a developer's bug triage, not a user experience roadmap. It documents 27 issues, scores them by implementation severity (P0–P3), and sequences them by technical dependency. What it does not do is articulate the target user experience — what the reviewer should see, feel, and do after these changes land.

The plan will make the application less broken. It will not necessarily make it more usable.

**Design Health Score — Projected Post-Implementation State**

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Per-section colors + progress strip fix resolve most status gaps. No inline validation feedback addressed. |
| 2 | Match System / Real World | 2 | "Context", "Info", "Help" renaming proposed but not committed. Criterion codes (TR1, RE2) remain unexplained inline. |
| 3 | User Control and Freedom | 2 | PIN removal helps. No undo/redo for form changes. No confirmation for destructive skip actions. |
| 4 | Consistency and Standards | 3 | Evidence control wrapping + per-section accent fix address the worst inconsistencies. |
| 5 | Error Prevention | 2 | No validation UX addressed. Skip rationale enforcement exists but visual feedback for invalid states is absent. |
| 6 | Recognition Rather Than Recall | 3 | Tooltips on 20+ fields improve. Sidebar tabs make reference material accessible. Page index remains the primary nav — good. |
| 7 | Flexibility and Efficiency | 2 | Draggable sidebar width is the only power-user feature. No keyboard shortcuts, no bulk actions, no quick-complete paths. |
| 8 | Aesthetic and Minimalist Design | 3 | Verbose text removal is the plan's strongest UX contribution. Reference drawers out of the form panel is the second. |
| 9 | Error Recovery | 1 | Plan is silent on error states, validation display, and recovery workflows. |
| 10 | Help and Documentation | 3 | Help panel fix + tooltip system + sidebar tabs with Info content significantly improve help access. |
| **Total** | | **24/40** | **Acceptable — significant gaps remain in error handling, validation UX, and user control** |

---

## 2. Visual Hierarchy Analysis

### What works

**Per-section accent fix (Issue 3.2)** is the single most impactful change in the plan. Currently all nav cells show the active section's color, destroying a critical wayfinding cue. Restoring TR=blue, RE=green, UC=purple, SE=orange, TC=teal gives users a color-coded mental model of where they are and where they're going.

**Completion strip + quick jump merger (Issue 3.1)** reduces the header from two competing navigation bars to one. The current state — an `aria-hidden` strip plus five separate buttons — wastes space and confuses. A single clickable strip with per-cell colors will create a clear, scannable progress bar.

**Reference drawers moved to sidebar (Issue 4.3)** removes the biggest visual obstacle in the questionnaire panel. Currently three reference accordions sit above every form, pushing content below the fold. Moving them to the sidebar restores the questionnaire panel as a form-first space.

### What doesn't work

**Sidebar tab congestion.** The plan proposes merging context, about, and help into a tabbed sidebar. Each tab would contain substantial content:

- **Context tab**: route card + anchor card + generated guidance + literal topic sections (currently 13 `<section>` blocks of context guidance in the HTML)
- **Info tab**: framework overview + scope + governance (currently 3 multi-section pages)
- **Help tab**: interaction legend + 13 page help summaries + usage notes

On top of this, Issue 4.3 moves **reference drawers** (scoring rubrics, answer sets, evidence requirements — substantial accordion content) into the sidebar area as well. The plan doesn't specify where reference drawers land relative to the tabs. If they go inside the Context tab, it becomes the dumping ground. If they get their own tab, the sidebar has four tabs, which is too many for the narrow sidebar width.

**Risk**: The sidebar becomes a "junk drawer" panel — too much responsibility, no clear primary content.

**Recommendation**: Limit to three tabs (Guidance, Reference, About). Merge Help content into the Guidance tab as a collapsible section at the bottom. Reference drawers become the Reference tab's primary content — no longer accordions, just sections on a scrollable page. This gives each tab a clear purpose:

| Tab | Purpose | Content |
|-----|---------|---------|
| Guidance | Page-specific help | Context guidance + criterion focus + anchor card + inline help tips |
| Reference | Lookup material | Scoring rubric + answer sets + evidence requirements |
| About | Framework background | Overview + scope + governance |

### Missing from the plan

- **No visual treatment for the sidebar tabs themselves.** The plan proposes tabs but doesn't specify styling, active state indication, or how they integrate with the existing accent color system.
- **The page index (left column) is unaddressed.** This is the reviewer's primary navigation mechanism, yet the plan says nothing about its visual hierarchy, grouping, or interaction design. It should receive the same level of design attention as the header strip.

---

## 3. Information Architecture Analysis

### What works

**Surface consolidation** (Issue 2.8) is the right architectural call. Three mechanisms that look identical but behave differently (persistent sidebar, modal overlay, broken overlay) is a classic IA problem. Merging into one panel with tabs is the textbook fix.

**Nav consolidation** (Issue 3.1) resolves the duplicate information scent problem. Two bars showing the same five principles created ambiguity about which to use. One bar is correct.

**Reference drawer relocation** (Issue 4.3) improves the IA because it moves reference material out of the form flow and into a reference-oriented space (the sidebar). This aligns content purpose with spatial location.

### What doesn't work

**Context/Info/Help labels remain ambiguous.** Issue 2.6 identifies the problem — users can't predict what each surface shows — and proposes renaming to "Guidance", "Background", "Legend". But this recommendation is deferred to Phase 8 (Issue 29) as a small follow-up after the tab merger. The renaming should happen *during* the merger, not after. The tab labels are the first thing users see in the sidebar — they are the IA.

**The plan doesn't define what each tab contains precisely.** The migration steps (2.8 step 3–5) say "move about-panel rendering into a tab panel function" and "move help-panel rendering into a tab panel function" but don't specify what content is kept, what's cut, and how it's organized within each tab. This is an IA gap that will cause the implementation to carry forward the current content structure without rethinking it.

**No IA for the tooltip system.** The plan identifies 20+ fields needing tooltips (Issue 7.2) and proposes adding a `tooltip` property to the field schema. But it doesn't define tooltip writing guidelines — length, tone, when to use a tooltip vs. inline help vs. a link to the Reference tab. Without these rules, tooltip quality will be inconsistent.

### Missing from the plan

- **No user-facing content audit.** The plan removes verbose text (good) but doesn't propose replacement content for the sidebar's context guidance sections. The 13 literal context blocks in the HTML (`trust-framework.html:301–444`) are verbose in the same way the removed text is — they just weren't flagged because they're in the sidebar, not the questionnaire panel.
- **No cross-linking strategy.** The current context sidebar has "Reference drawers" and "Info topics" link buttons that open drawers/overlays. After the merger, these should become "See Reference tab" or "See About tab" links — but the plan doesn't address this navigation pattern.

---

## 4. Cognitive Load Analysis

### Cognitive Load Checklist (8 items)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Single focus | **PASS** | Moving reference drawers out of the form panel means users see the form, not reference material, when filling in answers. |
| 2 | Chunking | **PASS** | 12 sections organized into 9 completion groups is well-structured. |
| 3 | Grouping | **FAIL** | Sidebar will have 3–4 tabs each with dense, unchunked content. Route card + anchor card + generated guidance + topic stack + reference links = 5 distinct sections in the Guidance tab alone. |
| 4 | Visual hierarchy | **PASS** | Per-section accent fix + consolidated nav bar create clear hierarchy. |
| 5 | One thing at a time | **FAIL** | The sidebar asks users to simultaneously process: which tab they're on, what the current guidance says, which anchors are available, and what reference material exists. The current route card already has 6 info rows (Mode, Topic, Focus, Workflow, Status, Required) — that's a lot of state to process before getting to the actual guidance content. |
| 6 | Minimal choices | **PASS** | Tab interface limits visible content to one category at a time. |
| 7 | Working memory | **FAIL** | Users must remember scoring rubric values (0–3) when rating criteria, but the scoring rubric will be in the Reference tab, not visible alongside the form. The current design at least puts the rubric in the same panel (above the form). After the move, users must tab-switch to look up scores, creating a working memory burden. |
| 8 | Progressive disclosure | **PASS** | Tooltips are progressive disclosure. Tab interface is progressive disclosure. Verbose text removal reduces upfront noise. |

**Result: 3 failures — moderate cognitive load. Address soon.**

### Net effect analysis

**Removes complexity:**
- 12 instances of verbose text eliminated
- Duplicate nav bar removed
- PIN buttons removed (reducing reference drawer header complexity)
- Panel captions removed

**Adds complexity:**
- Sidebar tabs (new interaction pattern to learn)
- Draggable divider (new interaction, but isolated)
- 20+ tooltip icons (but these are progressive disclosure — invisible until needed)
- Clickable completion strip cells (but they replace non-clickable cells, so net neutral)

**Verdict**: The plan's net effect is simpler. The cognitive load reduction from removing verbose text and reference drawers from the form flow outweighs the added complexity of tabs and tooltips.

**However**, the working memory failure is significant. Moving the scoring rubric away from the form without providing an inline score reference means reviewers will constantly tab-switch to remember what "2 = Meets baseline" means. The plan should address this — either with a persistent mini-score reference in the criterion card, or by keeping the score labels in the rating scale options (which the current implementation already does via `.rating-text span`).

Actually, looking at the current `dom-factories.js` rating scale implementation: each rating option already shows the score number and label ("0 — Fails", "1 — Partial/unclear", "2 — Meets baseline", "3 — Strong"). So the working memory burden for scoring is already mitigated. The remaining concern is for the judgment override (Pass/Conditional/Fail) which also has labels. **Downgrading this to a minor concern.**

---

## 5. User Journey Analysis

### Proposed flow walkthrough

**1. Reviewer opens the app.**

Sees: UT/TRUST branding in header. Completion strip showing 13 page cells (S0–S10C), all in their section colors, with progress states. Context/Info/Help buttons (or renamed: Guidance/Reference/About).

Below header: two-panel layout. Left panel has page index (sticky) + form area. Right panel has tabbed sidebar showing Guidance tab with S0 Workflow Control context.

**Assessment**: Good. The form is immediately visible. The default workflow is `primary_evaluation` (Issue 8.1 fix), so all review sections are accessible. Progress states are visible in the strip.

**Gap**: What does S0 look like? It has 5 fields (submission type, tool name, tool URL, existing evaluation ID, responder role). The reviewer sees these fields but has no indication of what to fill in first, what's required, or what happens after S0 is complete. The plan doesn't address onboarding or progressive form guidance.

**2. Reviewer fills in S0 and moves to the next section.**

They click the next cell in the completion strip, or use the pager, or click the page index. The completion strip cells are now clickable (Issue 3.1 fix). The pager has prev/next buttons.

**Assessment**: Three navigation mechanisms (strip, pager, page index) is redundant but not harmful — different users prefer different mechanisms. The strip provides overview, the pager provides sequential flow, the page index provides direct access with metadata.

**3. Reviewer reaches a principle page (e.g., TR — Transparent).**

Sees: Section kicker "Section 3 — TR". Three criterion cards (TR1, TR2, TR3), each with a rating scale (0–3), evidence block, and skip controls. Principle summary fields and judgment at the bottom.

The sidebar (Guidance tab) shows context guidance for Transparent. If the reviewer needs the scoring rubric, they switch to the Reference tab. If they need help understanding a field, they hover the `?` tooltip icon.

**Assessment**: This flow works. The tooltip system (Issue 7.x) provides inline help without leaving context. The rating scale labels are visible inline. Evidence blocks are styled consistently (Issue 5.1 fix).

**Gap**: The principle judgment field is a dropdown with "Pass / Conditional pass / Fail" but the plan doesn't address whether the judgment is auto-derived from criterion scores or manually set. Looking at the codebase: `rules.js` defines judgment derivation rules, and the judgment field has `control: 'computed_select'`. This means the judgment should be auto-computed — but the current UI shows it as a regular dropdown. The plan doesn't address this discrepancy.

**4. Reviewer completes all principle sections and reaches S8 (Critical Fails).**

Sees: Critical fail flags (checkboxes), completion checklist, overall review confidence.

**Gap**: The completion checklist is a `derived_checklist` — auto-computed from the state of other sections. But the plan doesn't address how derived/read-only fields are visually distinguished from editable fields. Currently they use the tag "Display only" which is small and easy to miss.

**5. Reviewer finishes and wants to submit/export.**

The plan is completely silent on the submission/export workflow. There's a hidden submit button in the HTML (`trust-framework.html:65`) but no visible action for completing the evaluation.

### Journey verdict

The plan fixes the broken entry point (default workflow mode) and removes obstacles (reference drawers, verbose text). The resulting journey is functional but lacks:

- First-run guidance
- Completion confirmation or celebration
- Export/submission workflow
- Validation feedback during the journey (not just at the end)

---

## 6. Missing Considerations

### P1: Form validation UX is unaddressed

The plan identifies validation states in the data model (`fieldValidationState`, `fieldAttention`, `fieldInvalid`, `fieldBlocked`) but proposes zero changes to how validation errors are surfaced to users. The current implementation sets `data-*` attributes on field groups but provides no visible error indicators, no inline validation messages, and no summary of invalid fields.

This is the plan's most significant UX gap. A reviewer can fill in 13 pages of form data with no indication that required fields are missing or values are invalid until they inspect the page index status badges.

**Recommendation**: Add a Phase 2.5 (or extend Phase 4) that defines:
1. Inline validation indicators on field groups (border color change, icon, message)
2. Validation summary in the page index (the current progress states partially address this)
3. "Attention" state styling for fields that need review

### P1: First-run experience

The plan fixes Issue 8.1 (default workflow mode) which is the biggest first-run blocker. But it doesn't address what happens after that fix. When a reviewer opens the app for the first time, they see S0 with five fields and no guidance about the overall workflow. The panel captions (which the plan removes in Issue 9) currently provide some orientation, however verbose.

**Recommendation**: Replace the removed panel captions with a single, concise orientation line or an empty state on S0 that explains the evaluation flow. Something like: "Start by setting the submission type and tool identity, then work through each principle section."

### P2: Skip workflow confirmation

The plan mentions skip scaffolds (section skip, criterion skip) but doesn't address the confirmation UX. Currently, clicking "Skip criterion" immediately changes the criterion state. There's no confirmation, no summary of what will be hidden, and no clear path to undo (the "Resume criterion" button is the same toggle, which is reversible, but not obviously so).

### P2: Empty state design for evidence blocks

Issue 6.1 (B) simplifies empty states to "No evidence attached." This is concise but not actionable. A better empty state would guide the user: "No evidence attached. [Attach file] or [Link to evidence folder]."

### P3: Mobile/drawer mode

The plan mentions responsive behavior in Issue 2.8 (responsive drawer mode tab handling) but doesn't detail how the tabbed sidebar works in drawer mode. Currently, the context panel slides in from the right on mobile. With tabs, the drawer needs tab navigation at the top, which eats into the already narrow drawer width (min 34rem → on a 375px phone, this is tight).

### P3: Derived field transparency

The questionnaire has several computed/derived fields (principle judgments, completion checklist items). The plan doesn't address how to communicate "this value was computed from your other answers" vs. "you set this value manually." The current "Display only" tag is insufficient — users need to understand *why* a derived value is what it is.

---

## 7. Over-Engineering Risks

### Risk 1: Draggable sidebar width (Issue 2.10) — HIGH RISK

The plan proposes a fully interactive draggable divider with:
- Pointer event handling
- CSS custom property updates
- localStorage persistence
- Responsive hiding
- Clamped range (16rem–40rem)

**This is over-engineered.** The current fixed width (`minmax(20rem, 28rem)`) is reasonable. Academic evaluators filling in a structured form do not need to resize their reference panel. This feature serves developer aesthetics, not user needs.

**Cost**: Medium implementation effort, ongoing maintenance burden, accessibility testing for pointer events, touch device handling.

**Recommendation**: Drop this from the plan. If users specifically request resize capability, add it later. The fixed width works.

### Risk 2: Tabbed sidebar architecture (Issue 2.8) — MODERATE RISK

The merger itself is architecturally sound and the plan correctly identifies it as a "large refactor." The risk is not in the concept but in the execution scope:

- Phase 8 touches `navigation.js` (~200 lines of surface management), `sidebar.js`, `about-panel.js`, `help-panel.js`, `layout.css`, `components.css`, `store.js`, and `trust-framework.html`
- It depends on Phase 1 (help panel fix) and Phase 2 (surface styling fixes)
- The migration steps are high-level ("move about-panel rendering into a tab panel function") without detailed component specifications

**Recommendation**: Before starting Phase 8, create a detailed component specification for the tabbed sidebar that defines:
1. Tab bar HTML structure and styling
2. Content layout for each tab
3. Active tab state management
4. Drawer mode behavior
5. Keyboard navigation between tabs
6. How reference drawers integrate (separate tab or within Guidance tab)

### Risk 3: Tooltip system (Issues 7.1–7.4) — LOW RISK

Building a custom tooltip component is justified for this application. The existing `.field-help` always-visible approach doesn't scale to 20+ fields, and native `title` attributes are insufficient for the amount of contextual help needed.

**However**, the plan proposes four separate issues for the tooltip system (component, schema property, rendering wire, text writing). These should be a single coherent feature with a unified design specification.

**Recommendation**: Consolidate Issues 23–26 into one feature with a tooltip design doc that specifies:
- Trigger mechanism (hover + focus? click?)
- Maximum text length
- Positioning strategy (below label? beside field?)
- Mobile behavior
- Accessibility (aria-describedby)

### What's NOT over-engineered

- **Verbose text removal**: Each removal is justified. The plan correctly identifies what to remove vs. shorten vs. keep.
- **PIN button removal**: The analysis is correct — PIN adds complexity with no persisted value. Clean removal.
- **Per-section accent fix**: This is a CSS-only fix with enormous UX impact. Exactly the right kind of change.
- **Default workflow mode fix**: One-line change, removes the biggest user-facing blocker. Perfect.

---

## 8. Suggested Amendments

### Amendment 1: Add validation UX phase

Insert between Phase 2 and Phase 3:

**Phase 2.5: Validation Feedback (P1)**

| # | Issue | Files | Effort |
|---|-------|-------|--------|
| — | Define validation state styles (invalid, attention, blocked) | `components.css`, `interaction-states.css` | Medium |
| — | Add inline validation messages to field group rendering | `dom-factories.js` | Medium |
| — | Add validation summary to page index items | `sidebar.js` | Small |

### Amendment 2: Rename sidebar tabs during Phase 8, not after

Issue 29 (rename surface buttons) should be absorbed into Issue 27 (tabbed sidebar). The tab labels should be:
- "Guidance" (not "Context")
- "Reference" (not "Reference drawers" — this is where the moved drawers live)
- "About" (not "Info")

### Amendment 3: Drop draggable sidebar width

Remove Issue 2.10 from the plan entirely. Reallocate the effort to validation UX (Amendment 1).

### Amendment 4: Add first-run content for S0

In Phase 3 (verbose text cleanup), replace the removed panel caption (Issue 9, caption F) with a concise S0-specific orientation line, not just deletion. Something like:

> "Set the submission type and tool identity to unlock the evaluation sections."

This should be a one-liner rendered conditionally when S0 has no activity.

### Amendment 5: Define reference drawer placement explicitly

Issue 4.3 (move reference drawers to sidebar) should specify that reference drawers become the primary content of the "Reference" tab, not drawers within the Guidance tab. They should be rendered as scrollable sections, not accordions, since the accordion header styling is broken (Issue 4.1) and the PIN feature is being removed (Issue 4.2). Removing the accordion wrapper entirely and rendering as flat sections is simpler and more readable.

### Amendment 6: Consolidate tooltip issues

Merge Issues 23–26 into a single feature with a tooltip design specification written before implementation begins.

---

## 9. Concerns

### Concern 1: The plan optimizes for developer understanding, not user experience

The 27 issues are organized by implementation phase and technical dependency. This makes sense for a developer but obscures the user-facing impact. A reviewer doesn't care about "surface architecture" — they care about "where do I find the scoring rubric?" The plan should include a user-facing change summary organized by user journey stage.

### Concern 2: No success metrics

The plan doesn't define what "done" looks like from a user perspective. How will you know if the changes worked? Consider defining:
- Task completion time for a full evaluation (before/after)
- Error rate for form validation (before/after)
- User satisfaction with navigation (qualitative)
- First-run completion rate (do users complete S0 without help?)

### Concern 3: The sidebar may become too responsibility-heavy

With the proposed changes, the right panel handles: page-specific guidance, criterion focus tracking, anchor navigation, reference material lookup, framework background, interaction legend, and progress display. This is a lot for one panel, even with tabs. Consider whether some of this content (especially the route card's metadata grid) can be simplified or relocated.

### Concern 4: Content quality is assumed, not audited

The plan focuses on moving and removing content but doesn't audit the quality of what remains. The 13 context guidance sections in `trust-framework.html` are verbose and repetitive. The tooltip text for 20+ fields will need to be written. The sidebar's guidance content should be reviewed for conciseness and actionability alongside the structural changes.

### Concern 5: Phase 8 scope risk

Phase 8 (sidebar architecture) is a large refactor that touches the most complex files in the codebase (`navigation.js` at 1093 lines, `sidebar.js` at 1388 lines). It depends on 5 prior issues being complete. If any dependency is only partially fixed, Phase 8 will inherit technical debt. Consider splitting Phase 8 into two sub-phases: 8a (fix existing surface bugs without restructuring) and 8b (tabbed sidebar merger), with a decision gate between them.

---

## Persona Red Flags

### Dr. Elena — Academic Evaluator (project-specific persona)

**Profile**: Information specialist at a university. Evaluates AI tools for institutional recommendation. Methodical, evidence-oriented. Fills in the questionnaire over multiple sessions. Needs to cite specific observations.

**Red flags found**:
- No session persistence or save/resume mechanism. Elena fills in 13 pages over days, but the plan doesn't address state persistence across browser sessions.
- Evidence block empty states say "No evidence attached" with no call to action. Elena needs clear upload/attach affordances.
- The principle judgment field appears to be a manual dropdown, but the codebase marks it as `computed_select`. Elena might override a computed judgment without understanding it was auto-derived from her criterion scores.
- No way to review all answers before submission. Elena needs a summary view to check her work before the evaluation is finalized.

### Jordan — First-Time Reviewer (from persona library)

**Red flags found**:
- After Issue 8.1 fix, Jordan sees 13 accessible pages but has no indication of the recommended order. The pager shows prev/next, but should there be a "Start here" indicator on S0?
- Criterion codes (TR1, RE2, UC3) appear throughout but are never defined inline. Jordan must switch to the Guidance tab to learn what TR1 covers.
- Section skip and criterion skip are "Optional" by default with no explanation of when skipping is appropriate. The plan removes the verbose skip help text but doesn't replace it with a concise alternative.
- No confirmation after completing a section. Jordan fills in the last required field on TR and gets no signal that the section is now "Complete."

### Alex — Power User (from persona library)

**Red flags found**:
- No keyboard shortcuts for page navigation. Alex must click the page index or completion strip for every page change.
- No bulk actions. If Alex needs to mark multiple criteria as "Skip," they must do it one at a time.
- No quick-jump to incomplete sections. Alex has to visually scan the completion strip for "Not started" cells. A "Next incomplete section" button would dramatically speed up the workflow.
- The draggable sidebar width (Issue 2.10) is the only power-user feature proposed, and it's the least useful one for this audience.
