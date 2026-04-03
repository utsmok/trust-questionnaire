# Navigation, sidebar, and pagination model for replacing synchronized dual-pane scrolling

## Scope

This note reconstructs the missing research artifact for navigation, sidebar behavior, and pagination. It evaluates replacement of the current two-pane synchronized scrolling model in `trust-framework.html` with a single primary form surface, explicit section pagination, and a foldable documentation/background sidebar.

Sources reviewed:

- `trust-framework.html`
- `docs/trust-framework-v2.md`
- `docs/trust-questionnaire.md`
- `docs/improvement_03_04_2026/01_architecture_decomposition.md`
- `docs/improvement_03_04_2026/03_form_schema_and_dependencies.md`
- `docs/improvement_03_04_2026/05_visual_system_and_completion.md`
- `docs/improvement_03_04_2026/06_testing_risks_and_migration.md`
- `docs/review/trust-framework-v2-comparison-and-final-review.md`

This document is limited to interaction architecture and content-mapping rules. It does not propose implementation changes.

## Current behavior problems and why the sync-scroll model is failing

The current prototype is not failing because the visual design is unfinished. It is failing because the interaction model couples three different concerns to one mechanism: navigation, documentation context, and reference material. The questionnaire does not have a one-to-one document twin, so mirrored scrolling is structurally mismatched to the content.

| Problem | Current condition | Operational effect |
|---|---|---|
| No one-to-one section mapping | The framework panel uses `intro`, `scope`, `tr`, `re`, `uc`, `se`, `tc`, `scoring`, `evidence`, and `governance`. The questionnaire panel uses those same keys to stand in for operational sections `0-10`, including repeated use of `scoring` and `governance`. | The mapping is lossy. Distinct form sections collapse into the same documentation target. Context cannot be precise. |
| First-match sync behavior | The current script resolves a target with `firstSection(panelName, sectionKey)`. The questionnaire contains multiple sections with the same `data-section` value, especially `scoring` and `governance`. | Later operational sections cannot be addressed accurately. Synchronization can only land on the first matching block. |
| Principle-only top navigation | The header navigation exposes only `TR`, `RE`, `UC`, `SE`, and `TC`. Sections `0-2` and `8-10` are not first-class destinations. | Primary workflow pages are secondary in the navigation model. Reviewers cannot navigate the entire questionnaire with the same precision used for the five principles. |
| Granularity mismatch | The framework panel is narrative and principle-oriented. The questionnaire panel is section-, criterion-, and field-oriented. | Even when the section key is correct, the left panel remains too coarse once the reviewer is working inside a specific criterion or summary block. |
| Generic reference material is mixed into the synchronized surface | Scoring, evidence, and answer-set reference material appear as ordinary scrolled sections and also appear in separate reference cards. | Stable reference material consumes primary layout space and competes with context-sensitive documentation. |
| Two independent scroll containers compete for attention | The layout is a fixed 50/50 split on desktop and two half-height stacked panels below the responsive breakpoint. | The primary task surface loses width and height. The reviewer must track position in two places. |
| Scroll-coupled state is heuristic, not explicit | The current model uses `IntersectionObserver` dominance, shared `currentKey` state, lock timers, and programmatic `scrollTo()` calls. | Context changes are driven by layout heuristics rather than an explicit page model. Boundary behavior is sensitive to content height differences. |
| Completion model is narrower than the questionnaire | The header strip tracks five principle cells and is filled when score widgets are selected, not when all required fields are satisfied. | Progress is overstated and ignores sections `0-2` and `8-10`. |
| Keyboard model already treats the form as primary | The script removes focusability from the framework panel subtree. | The current prototype already concedes that the documentation pane is secondary. The equal-weight split layout does not match actual interaction priority. |
| Mobile behavior is especially poor | Below the layout breakpoint, the two panels stack and each retains its own scroll container. | The reviewer receives neither a usable full-width form nor a usable documentation surface. |

The current model therefore fails for structural reasons:

1. it assumes scroll position can substitute for page state;
2. it assumes documentation topics and form sections can share one key space;
3. it treats generic reference material as if it were contextual content;
4. it allocates equal space to data entry and background material, even though the form is the primary task.

This is not a tuning issue. It is a mismatch between the information architecture and the interaction mechanism.

## Proposed navigation model

The replacement model should be page-based, not scroll-synchronized.

The primary interaction state should be separated into four distinct layers:

1. **Page state** — which form page is active.
2. **Sub-anchor state** — which subsection or criterion within the current page is in view.
3. **Context topic state** — which documentation block the sidebar should show for the active page or sub-anchor.
4. **Generic reference state** — which always-available reference drawers are open, closed, or pinned.

The navigation model should use one authoritative section registry. That registry should define, at minimum:

- canonical page ID;
- display code and label;
- workflow applicability;
- sequence order;
- completion state;
- sidebar context topic;
- deep-link target;
- optional principle quick-jump membership.

### Recommended primary navigation surfaces

1. **Top page index / page picker**
   - Shows every active page in the current workflow.
   - Uses canonical page IDs, not overloaded documentation keys.
   - Displays completion state per page.

2. **Previous / next controls**
   - Move sequentially through the active page set.
   - Operate on page order, not on scroll position.

3. **Progress summary**
   - Reports completion across the full active questionnaire, not only the five TRUST principles.

4. **Sidebar toggle**
   - Shows or hides the contextual documentation/background sidebar.

5. **Info/About icon**
   - Opens stable background material that should not remain in the operational sidebar.

### Position of the five principle buttons

The existing `TR/RE/UC/SE/TC` control row may remain as a compact quick-jump mechanism, but it should become a subset of the full navigation model rather than the navigation model itself. It should not be the only directly visible section navigation.

### Completion state for navigation

The navigation model should display page state using the full-section completion logic already recommended elsewhere in the improvement notes:

- not started;
- in progress;
- complete;
- blocked / attention required;
- skipped / not applicable.

This state must be derived from all currently applicable required fields, not from score selection counts.

## Proposed pagination model for form sections

The form should be paginated by canonical questionnaire section, not by arbitrary viewport chunk and not by criterion card.

This is the correct granularity for three reasons:

1. the questionnaire specification is section-based;
2. completion and workflow branching are section-based;
3. criterion-level pagination would produce too many page transitions for a 132-field instrument.

### Recommended page set

The canonical page set should be:

1. `S0` — Workflow Control
2. `S1` — Tool Profile
3. `S2` — Evaluation Setup
4. `TR` — Transparent
5. `RE` — Reliable
6. `UC` — User-centric
7. `SE` — Secure
8. `TC` — Traceable
9. `S8` — Critical Fails and Confidence
10. `S9` — Overall Recommendation
11. `S10A` — Primary Evaluation Handoff
12. `S10B` — Second Review
13. `S10C` — Final Team Decision

### Workflow-aware page activation

The pager should not expose the same page list for every submission type.

| Workflow mode | Active editable pages | Notes |
|---|---|---|
| Nomination | `S0`, `S1` | All later pages are system-skipped. |
| Primary evaluation | `S0`-`S9`, `S10A` | Full evaluation path. |
| Re-evaluation | `S0`-`S9`, `S10A` | Same visible structure as primary evaluation, but may preload prior data. |
| Second review | `S10B` plus read-only access to prior evaluation pages | Sequential pager should prioritize the active review page. Prior sections should remain accessible by jump, not as the primary forward path. |
| Final team decision | `S10C` plus read-only access to prior evaluation pages | Same principle as second review. |

### Recommended page behavior

- Only one page is the primary editable surface at a time.
- Page changes preserve draft state.
- Page changes do not auto-scroll any documentation surface.
- Pages may scroll internally if they exceed viewport height.
- Long principle pages remain single pages. Their internal criterion cards and summary blocks drive sidebar context changes.

This model preserves section integrity while eliminating the need to coordinate two separate scrolled documents.

## Proposed sidebar behavior and content-mapping rules per page/section

The sidebar should become a contextual documentation/background surface, not a second synchronized document.

### Recommended sidebar structure

The sidebar should have two layers:

1. **Contextual layer**
   - Changes with the active page.
   - Can change within a page based on the active sub-anchor.
   - Provides only the documentation needed for the page currently being completed.

2. **Persistent reference layer**
   - Holds generic foldable reference material that should be available from every page.
   - Does not change automatically when the page changes.

### Recommended sidebar behavior

- Desktop: visible as a foldable side drawer.
- Narrow viewports: hidden by default and opened on demand as an overlay drawer.
- Context updates occur on page change and, within long pages, on conservative sub-anchor change.
- The sidebar must support a **pin/freeze** state so the reviewer can temporarily stop contextual replacement while reading.
- Sidebar updates must not scroll the form.
- Sidebar updates must not steal focus.

### Mapping rules for principle pages

The principle pages should use a consistent two-level mapping rule.

#### Page-level rule

When the page root or page heading is active, the sidebar shows:

- the principle overview text from `docs/trust-framework-v2.md` section `3.x`;
- the list of criterion codes for that principle;
- a short operational note derived from the corresponding questionnaire section.

#### Criterion-level rule

When a criterion card is the dominant sub-anchor, the sidebar shows:

- the matching framework criterion text;
- the expected evidence payload for that criterion;
- the field obligations for that criterion:
  - score;
  - evidence summary;
  - evidence links;
  - blocker text when the score is `0` or `1`.

#### Summary-level rule

When the principle summary or principle judgment block is active, the sidebar switches to:

- per-principle judgment rules from the scoring model;
- any additional section-level fields for that principle page.

This yields the following direct mappings:

- `TR` page ↔ framework `3.1 Transparent`
- `RE` page ↔ framework `3.2 Reliable`
- `UC` page ↔ framework `3.3 User-centric`
- `SE` page ↔ framework `3.4 Secure`
- `TC` page ↔ framework `3.5 Traceable`

The principle pages therefore keep one-to-one conceptual correspondence without requiring synchronized document scrolling.

### Mapping rules for non-principle pages

| Page | Contextual sidebar content | Source material | Notes |
|---|---|---|---|
| `S0` Workflow Control | Submission-type definitions, prior-evaluation linkage, responder-role meaning | `docs/trust-questionnaire.md` Section 0 | Introduction and governance narrative should not be repeated here. |
| `S1` Tool Profile | Category definitions, deployment/access terminology, account/sign-in help | `docs/trust-questionnaire.md` Section 1 | The deeper scope definition belongs in the Info/About surface, not in the operational sidebar. |
| `S2` Evaluation Setup | Minimum evidence requirements, repeated-query expectations, manual verification expectations | `docs/trust-framework-v2.md` Section 5 and `docs/trust-questionnaire.md` Section 2 | This page is the strongest candidate for evidence guidance in the contextual layer. |
| `S8` Critical Fails and Confidence | Critical-fail definitions, confidence level definitions, completion checklist guidance | `docs/trust-framework-v2.md` Sections 4.4-4.5 and `docs/trust-questionnaire.md` Section 8 | This page should not require scrolling to a separate scoring page. |
| `S9` Overall Recommendation | Per-principle judgment recap, final recommendation category definitions, drafting guidance for the public summary | `docs/trust-framework-v2.md` Sections 4.2-4.3 and `docs/trust-questionnaire.md` Section 9 | Governance workflow narrative remains in the Info/About surface. |
| `S10A` Primary Evaluation Handoff | Required handoff fields and review-preparation guidance | `docs/trust-questionnaire.md` Section 10A | Add a direct link to About > Governance. |
| `S10B` Second Review | Agreement states, revisit-criteria expectations, disagreement documentation rules | `docs/trust-questionnaire.md` Section 10B | Add a direct link to About > Governance. |
| `S10C` Final Team Decision | Final status definitions, publication status meaning, review-cycle frequency guidance | `docs/trust-questionnaire.md` Section 10C | Add a direct link to About > Governance. |

### Required architectural rule for the sidebar

The sidebar must use its own content-topic registry. It should not reuse the current overloaded `data-section` vocabulary. The following concepts need separate identifiers:

- page ID;
- contextual documentation topic ID;
- generic reference drawer ID;
- about-menu topic ID.

Without that separation, the system will recreate the current `scoring` and `governance` collisions in a new layout.

## Proposed treatment of generic docs (scoring/evidence/reference material)

Generic reference material should remain permanently available, but it should be removed from the main page flow and removed from the contextual synchronization model.

### Recommended persistent drawers

The persistent reference layer should expose at least three foldable drawers:

1. **Scoring model**
   - criterion scale `0-3`;
   - per-principle judgment rules;
   - final recommendation categories;
   - confidence levels.

2. **Evidence requirements**
   - minimum evidence expectations;
   - repeated-query requirements;
   - manual source verification requirements;
   - evidence bundle expectations.

3. **Reference sets**
   - standard answer sets now shown in the `Standard Answer Sets` block;
   - critical-fail flag list;
   - reusable option/reference vocabularies.

### Behavioral rules for generic drawers

- They are always accessible from every page.
- Their open/closed state persists while moving between pages.
- They do not auto-close when contextual content changes.
- They may be pinned open independently of contextual content.
- They are not part of the pager and do not consume page numbers.

### Consequence for current content placement

The current `Standard Answer Sets` section should leave the main form flow and become part of the persistent reference layer. Its current position at the top of the questionnaire panel is a reference convenience, not an operational page.

This change reduces duplication and preserves the form surface for answer-bearing content.

## Proposed info/about menu behavior and content sources

Introduction, scope, and governance are stable background material. They should move out of the contextual sidebar and out of the main page flow.

### Recommended behavior

- The top navigation contains a single **information icon**.
- Activating it opens a non-destructive Info/About surface.
- Desktop: right overlay drawer or large anchored panel.
- Mobile: full-screen modal sheet.
- The current form page and sidebar state remain unchanged when the surface closes.

### Recommended content structure

The Info/About surface should contain foldable sections for:

1. **Introduction / Overview**
   - purpose of the TRUST framework;
   - version note if retained;
   - high-level orientation for reviewers.

2. **Scope and definitions**
   - what counts as an AI-based search tool;
   - coverage;
   - exclusions.

3. **Governance and review workflow**
   - evaluation cycle;
   - two-person review requirement;
   - disagreement handling;
   - re-evaluation triggers;
   - decision categories and publication handling.

### Canonical content sources

| About topic | Primary source |
|---|---|
| Introduction / Overview | `docs/trust-framework-v2.md` version note and Section 1 |
| Scope and definitions | `docs/trust-framework-v2.md` Section 2 |
| Governance and review workflow | `docs/trust-framework-v2.md` Section 6, supplemented by `docs/trust-questionnaire.md` Section 10 labels and workflow field structure |

### Why these topics belong in Info/About rather than the sidebar

- They are stable background material rather than page-local task guidance.
- They do not need to change when the active form page changes.
- They are important but not continuously consulted during score entry.
- Moving them out of the synchronized surface reduces motion, duplication, and width pressure.

## Accessibility and mobile behavior considerations

The proposed model is materially better for accessibility because it makes the form the only primary interactive surface.

### Accessibility requirements

1. **Single primary scroll surface per page**
   - Remove synchronized dual-panel scrolling.
   - Eliminate scroll-coupled focus disorientation.

2. **No automatic focus transfer on context change**
   - Sidebar content may change visually, but focus remains in the form unless the user explicitly enters the sidebar.

3. **Explicit toggle semantics**
   - Sidebar toggle and Info/About trigger require `aria-expanded`, `aria-controls`, and visible labels or accessible names.

4. **Pin/freeze support**
   - Users must be able to stop automatic sidebar replacement while reading.

5. **No color-only status encoding**
   - Page completion, blocked states, and skipped states require text or icons in addition to color.

6. **Deep-linkable pages and sub-anchors**
   - Page identity must be explicit and externally addressable.

7. **Reduced motion**
   - Page transitions and sidebar updates should not reintroduce the current cross-panel motion effect.

8. **Dialog/drawer focus rules**
   - The Info/About surface and the mobile sidebar overlay must return focus to the trigger when closed.

### Mobile behavior requirements

1. The form remains full width.
2. The contextual sidebar is collapsed by default and opened on demand.
3. The Info/About surface becomes a full-screen sheet.
4. Tap targets for page navigation, sidebar toggle, and Info/About access remain at least `44x44px`.
5. There must be no stacked dual-scroll layout.

The current stacked two-pane model should not be retained in any responsive mode.

## Risks and tradeoffs

| Risk / tradeoff | Description | Mitigation |
|---|---|---|
| Reduced simultaneous full-document comparison | The reviewer no longer sees the entire framework panel and the entire form at the same time. | Provide a direct link or temporary expanded documentation mode for full-document reading. |
| Higher metadata complexity | The new model requires a section registry and a content-topic registry. | This complexity is acceptable because it replaces a structurally incorrect scroll-coupling model. |
| Pagination can hide downstream context | Reviewers may lose the passive overview provided by continuous scrolling. | Keep a visible page index with completion state and direct jump access. |
| More clicks for stable background material | Introduction, scope, and governance move behind an info action. | This is acceptable because those topics are stable background content, not constant inline guidance. |
| Contextual sidebar can still be distracting if over-eager | If sub-anchor switching is too sensitive, the sidebar may change too often within long pages. | Use conservative dominance thresholds and provide a pin/freeze state. |
| Governance help becomes split across two surfaces | Governance pages are operational, while governance narrative moves to Info/About. | Add direct links from `S10A`, `S10B`, and `S10C` to the governance topic in Info/About. |

The main tradeoff is deliberate: the model gives up continuous simultaneous document comparison in exchange for a larger primary form surface, explicit navigation, and precise context mapping. For this questionnaire, that tradeoff is correct because the dominant task is structured evaluation entry, not continuous side-by-side reading.

## Explicit proposed solution summary

1. Replace the current synchronized dual-pane layout with a **single primary paginated form**.
2. Page the form by **canonical questionnaire section/subsection**, not by scroll chunk and not by criterion.
3. Replace scroll synchronization with a **foldable contextual sidebar** whose content is driven by explicit page and sub-anchor mapping rules.
4. Keep **scoring, evidence, and reference material** in always-available persistent drawers rather than in the main page flow.
5. Move **introduction, scope, and governance** into a top-navigation **Info/About** surface accessed from an information icon.
6. Drive navigation, completion, pagination, and sidebar routing from **one section registry and one content-topic registry**. Do not reuse one overloaded key space for all of them.

The recommended interaction model is therefore a **section-level paginated workflow with a contextual documentation sidebar and persistent generic reference drawers**. This model matches the questionnaire’s actual structure and removes the core failure mode of the current prototype: forced synchronization between two non-equivalent scrolled documents.
