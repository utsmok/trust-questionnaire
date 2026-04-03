# Consolidated Implementation Plan

Date: 2026-04-03
Scope: refactor `trust-framework.html` into a maintainable static frontend without introducing a runtime framework.

## Executive summary

The complete research set preserves the main implementation direction: a static multi-file frontend, native ES modules, schema-driven questionnaire rendering, explicit state ownership, and minimal tooling added only for verification. That direction remains valid and is not revised.

The material correction introduced by the now-available navigation/sidebar report is the interaction model. The synchronized dual-pane scroll model should not be retained. It should be replaced with a single primary paginated questionnaire surface, a foldable contextual documentation sidebar, persistent reference drawers for generic scoring/evidence material, and a separate Info/About surface for introduction, scope, and governance background. This is the only substantive directional change required by the complete research set.

The resulting target remains a static site with one HTML entry file. The framework prose remains literal HTML content in the shell. The questionnaire becomes schema-rendered. Navigation, pagination, context routing, validation, completion, evidence, and help behavior are driven from explicit registries and rule definitions rather than DOM heuristics.

## Consolidation decisions

1. The assumption that `02_navigation_sidebar_pagination.md` is missing is removed. The report is present and is now treated as authoritative for navigation, sidebar, and page-flow behavior.
2. The architectural baseline from `01_architecture_decomposition.md` remains in force:
   - static multi-file HTML/CSS/JS;
   - no runtime framework;
   - no bundler required for the first implementation pass;
   - questionnaire rendered from schema;
   - framework prose kept as literal HTML content.
3. The interaction baseline is revised in line with `02_navigation_sidebar_pagination.md`:
   - replace synchronized dual-pane scrolling;
   - use section-level pagination;
   - use a contextual sidebar rather than a second primary document pane;
   - keep generic scoring/evidence/reference material in persistent drawers;
   - move introduction, scope, and governance into an Info/About surface.
4. The schema-first model from `03_form_schema_and_dependencies.md` remains in force:
   - `docs/trust-questionnaire.md` is the authoritative field inventory;
   - all answer-bearing fields are typed;
   - skip state is first-class;
   - principle judgments and selected workflow states are computed.
5. The evidence model from `04_uploads_and_evidence_workflow.md` is adopted directly:
   - Section 2 provides evaluation-level evidence intake;
   - Sections 3-7 provide criterion-level evidence association;
   - every uploaded/associated evidence item requires a note;
   - image previews are inline plus modal inspection; non-images are filename rows.
6. The visual-system and completion model from `05_visual_system_and_completion.md` is adopted directly:
   - section context, score, validation/workflow state, judgment state, and help state use distinct token families;
   - completion is section-completion, not score-count completion;
   - the authoritative progress model covers the full questionnaire, not only the five principle sections.
7. The testing and migration guidance from `06_testing_risks_and_migration.md` remains in force:
   - minimal tooling is justified;
   - browser-level regression testing is mandatory;
   - refactor in narrow waves with rollback points.

## Fixed constraints

1. The implementation remains frontend-only within this repository.
2. No runtime `fetch()` of HTML partials or JSON is introduced.
3. The framework prose is not converted into JavaScript strings and is not generated from Markdown in this scope.
4. `trust-framework.html` remains the only page entry point.
5. The primary editable workflow is section-based pagination with one active editable page at a time.
6. The canonical page set is:
   - `S0` Workflow Control
   - `S1` Tool Profile
   - `S2` Evaluation Setup
   - `TR`
   - `RE`
   - `UC`
   - `SE`
   - `TC`
   - `S8` Critical Fails and Confidence
   - `S9` Overall Recommendation
   - `S10A` Primary Evaluation Handoff
   - `S10B` Second Review
   - `S10C` Final Team Decision
7. Workflow mode controls which pages are active and editable.
8. The compact `TR/RE/UC/SE/TC` row remains available only as a quick-jump subset, not as the authoritative navigation surface.
9. Desktop uses a foldable contextual sidebar. Narrow viewports use an overlay/sidebar drawer. The main form remains the primary surface.
10. Print output and reduced-motion behavior remain mandatory supported surfaces.

## Target source-of-truth and state model

### Authoritative layers

| Layer | Owns | Notes |
|---|---|---|
| `docs/trust-questionnaire.md` | canonical questionnaire inventory and wording baseline | human-maintained source |
| `docs/trust-framework-v2.md` | framework wording baseline and evaluation model | human-maintained source |
| section/page registry | canonical page order, labels, quick-jump membership, completion grouping, sidebar routing | single source of truth for navigation |
| content-topic registry | contextual sidebar topics, persistent drawer topics, Info/About topics | must be distinct from page IDs |
| questionnaire schema | typed fields, criterion definitions, field groups, option-set references | single source of truth for rendering |
| rules/derived-state layer | branching, requiredness, skip rules, completion, judgments, recommendation constraints | no DOM-owned business rules |
| runtime state store | answers, evidence state, UI state | DOM is projection only |

### Required state partitions

The runtime model must distinguish the following state layers:

1. **Page state** — active page, pager order, workflow activation state.
2. **Sub-anchor state** — active criterion or summary block within the current page.
3. **Context topic state** — which contextual documentation block is shown for the active page/sub-anchor.
4. **Generic reference state** — which persistent drawers are open, closed, or pinned.
5. **Evaluation state** — typed answers, skip states, judgments, completion status, evidence metadata.

The previous model of deriving core interaction state from synchronized scroll position and DOM classes is not carried forward.

## Target file/folder structure

```text
trust-framework.html
static/
  css/
    tokens.css
    base.css
    layout.css
    components.css
    states.css
    print.css
  js/
    app.js
    config/
      section-registry.js
      content-topics.js
      questionnaire-schema.js
      option-sets.js
      rules.js
    state/
      store.js
      derive.js
    render/
      dom-factories.js
      questionnaire-pages.js
      sidebar.js
      reference-drawers.js
      about-panel.js
      help-panel.js
      evidence.js
    behavior/
      navigation.js
      pager.js
      context-tracking.js
      field-handlers.js
      keyboard.js
    adapters/
      evidence-storage.js
tests/
  e2e/
    navigation.spec.js
    rendering.spec.js
    validation.spec.js
    completion.spec.js
    evidence.spec.js
package.json
playwright.config.js
.htmlvalidate.json
```

### Structure notes

1. `trust-framework.html` becomes a shell plus literal framework-content templates, not a split-pane monolith.
2. The contextual sidebar, persistent reference drawers, and Info/About surface are rendered from registries plus literal HTML content blocks already owned in the shell.
3. Questionnaire content is rendered from schema definitions, not maintained as repeated handwritten page markup.
4. The repository remains build-light. If a local static server is needed for tests, it is tooling only, not part of runtime architecture.

## Ten change areas

| Change ID | Change area | Primary basis |
|---|---|---|
| CHG-01 | Multi-file architecture decomposition | `01_architecture_decomposition.md` |
| CHG-02 | Authoritative page/section registry and separate content-topic registry | `02_navigation_sidebar_pagination.md`, `05_visual_system_and_completion.md` |
| CHG-03 | Section-level pagination, page index, quick-jump row, and Info/About routing | `02_navigation_sidebar_pagination.md` |
| CHG-04 | Canonical questionnaire schema and typed option/field metadata | `03_form_schema_and_dependencies.md` |
| CHG-05 | Conditional logic, skip state, validation, and computed judgments | `03_form_schema_and_dependencies.md` |
| CHG-06 | Evidence upload, preview, association, and manifest workflow | `04_uploads_and_evidence_workflow.md` |
| CHG-07 | Visual token system with separated context/state semantics | `05_visual_system_and_completion.md` |
| CHG-08 | Full-questionnaire completion and progress model | `05_visual_system_and_completion.md`, `02_navigation_sidebar_pagination.md` |
| CHG-09 | Static-project testing, validation, responsive, print, and accessibility verification | `06_testing_risks_and_migration.md` |
| CHG-10 | Migration sequencing, rollback, and integration control | `06_testing_risks_and_migration.md` |

## Dependency model

### Critical dependency spine

`T001 -> T002 -> T003 -> T004 -> {T005,T006} -> {T007,T008,T009} -> T010 -> T011 -> T012 -> {T013,T014} -> T015 -> T016 -> T017 -> T018`

### Parallel lanes

1. `T005` and `T006` can proceed in parallel after `T004`.
2. `T007`, `T008`, and `T009` can proceed in parallel after Wave 2.
3. `T013` and `T014` can proceed in parallel after `T012`.

### Serial constraints

1. The page/section registry and content-topic registry must exist before navigation, pagination, sidebar routing, or Info/About routing.
2. The questionnaire schema must exist before renderer extraction.
3. The rule layer must exist before validation, completion, or evidence finalization rules.
4. The shell conversion must precede CSS/JS extraction.
5. Browser regression tooling must exist before legacy cleanup is allowed.

## Wave plan

## Wave 1 — Registries and canonical definitions

Wave 1 establishes the canonical metadata surfaces. No UI migration begins before this wave is complete.

### T001 — Create authoritative page/section registry and content-topic registry

- **Dependencies:** none
- **Files to modify/create:** `static/js/config/section-registry.js`, `static/js/config/content-topics.js`
- **Acceptance criteria:**
  - one registry defines canonical page order, page IDs, display labels, quick-jump membership, pager order, completion grouping, and workflow applicability;
  - a separate registry defines contextual-sidebar topics, persistent-reference drawer topics, and Info/About topics;
  - page IDs and topic IDs are not overloaded into one key space;
  - governance subsections `S10A`, `S10B`, and `S10C` are first-class entries.

### T002 — Create canonical questionnaire schema and option sets

- **Dependencies:** `T001`
- **Files to modify/create:** `static/js/config/questionnaire-schema.js`, `static/js/config/option-sets.js`
- **Acceptance criteria:**
  - all 132 fields and all 16 criteria are defined once in typed form;
  - Sections 3-7 use one reusable criterion response model;
  - Section 6 follows the explicit field listing rather than the inconsistent appendix count;
  - renderers do not hard-code questionnaire labels or option arrays.

### T003 — Create rules and derived-state layer

- **Dependencies:** `T001`, `T002`
- **Files to modify/create:** `static/js/config/rules.js`, `static/js/state/derive.js`
- **Acceptance criteria:**
  - workflow branching, requiredness, skip state, principle judgments, recommendation constraints, completion, and evidence-completeness rules are encoded outside the DOM;
  - nomination, primary evaluation, second review, final team decision, and re-evaluation paths are covered;
  - page activation rules and governance editability/read-only rules are explicit.

## Wave 2 — Shell conversion and monolith extraction

Wave 2 converts the current artifact into a stable shell that can host the new page-based interaction model.

### T004 — Convert `trust-framework.html` into a page-based shell

- **Dependencies:** `T001`, `T002`
- **Files to modify/create:** `trust-framework.html`
- **Acceptance criteria:**
  - the shell no longer encodes the synchronized dual-pane document model as the target architecture;
  - the shell contains mount points for the primary paginated form, contextual sidebar, persistent reference drawers, and Info/About surface;
  - framework prose remains literal HTML content in the shell or shell-owned templates;
  - essential landmarks, IDs, and focus return points are defined for later behavior modules.

### T005 — Split CSS into external files by concern

- **Dependencies:** `T004`
- **Files to modify/create:** `static/css/tokens.css`, `static/css/base.css`, `static/css/layout.css`, `static/css/components.css`, `static/css/states.css`, `static/css/print.css`, `trust-framework.html`
- **Acceptance criteria:**
  - no inline stylesheet remains in `trust-framework.html`;
  - token, base, layout, component, state, and print rules are separated;
  - the CSS supports sidebar/drawer/page-based layout rather than permanent dual-scroll panes;
  - print output remains explicitly styled in `print.css`.

### T006 — Split JavaScript into module graph and bootstrap store

- **Dependencies:** `T003`, `T004`
- **Files to modify/create:** `static/js/app.js`, `static/js/state/store.js`, `static/js/behavior/navigation.js`, `static/js/behavior/keyboard.js`, `trust-framework.html`
- **Acceptance criteria:**
  - no inline JavaScript remains in `trust-framework.html`;
  - `app.js` is bootstrap only;
  - UI state is store-owned rather than DOM-owned;
  - legacy scroll-synchronization logic is not retained as a governing architectural pattern.

## Wave 3 — Rendering and page/context navigation

Wave 3 replaces handwritten questionnaire markup and installs the navigation model defined by the complete research set.

### T007 — Render canonical questionnaire pages from schema

- **Dependencies:** `T002`, `T003`, `T005`, `T006`
- **Files to modify/create:** `static/js/render/dom-factories.js`, `static/js/render/questionnaire-pages.js`, `static/css/components.css`
- **Acceptance criteria:**
  - the questionnaire is rendered by canonical page/section definitions, not by repeated handwritten blocks;
  - the page set includes `S0`, `S1`, `S2`, `TR`, `RE`, `UC`, `SE`, `TC`, `S8`, `S9`, `S10A`, `S10B`, and `S10C`;
  - rendered markup includes stable `data-*` hooks for page, criterion, field, and summary anchors;
  - no repeated criterion-card markup remains as a maintained source.

### T008 — Implement contextual sidebar, persistent reference drawers, and Info/About surface

- **Dependencies:** `T001`, `T004`, `T005`, `T006`
- **Files to modify/create:** `static/js/render/sidebar.js`, `static/js/render/reference-drawers.js`, `static/js/render/about-panel.js`, `static/css/layout.css`, `static/css/components.css`
- **Acceptance criteria:**
  - the contextual layer changes with active page and, on long pages, with active sub-anchor;
  - scoring, evidence, and reference material are exposed as persistent drawers rather than paged questionnaire content;
  - introduction, scope, and governance are available through an Info/About surface rather than a synchronized second pane;
  - sidebar and drawer state support open/closed/pinned behavior.

### T009 — Implement page index, quick-jump row, and registry-driven navigation surfaces

- **Dependencies:** `T001`, `T005`, `T006`
- **Files to modify/create:** `static/js/render/sidebar.js`, `static/js/behavior/navigation.js`, `static/css/components.css`
- **Acceptance criteria:**
  - the sidebar is the authoritative navigation surface;
  - the compact `TR/RE/UC/SE/TC` row is implemented as a quick-jump subset only;
  - all top-level sections and governance subsections are reachable without relying on scroll heuristics;
  - navigation surfaces are generated from the same registry.

### T010 — Implement sequential pager and page/context tracking

- **Dependencies:** `T007`, `T008`, `T009`
- **Files to modify/create:** `static/js/behavior/pager.js`, `static/js/behavior/context-tracking.js`, `static/js/behavior/navigation.js`, `static/js/render/sidebar.js`
- **Acceptance criteria:**
  - previous/next navigation follows canonical page order;
  - workflow mode controls which pages are editable, read-only, or system-skipped;
  - contextual-sidebar topic changes are driven by page/sub-anchor state rather than synchronized document scrolling;
  - deep-linkable page identity exists for every canonical page.

## Wave 4 — Real form behavior, completion, and evidence

Wave 4 replaces presentation-only behavior with schema-driven state transitions.

### T011 — Implement field interaction and store updates

- **Dependencies:** `T007`, `T006`
- **Files to modify/create:** `static/js/behavior/field-handlers.js`, `static/js/state/store.js`, `static/js/render/questionnaire-pages.js`
- **Acceptance criteria:**
  - score controls, text inputs, textareas, selects, checkbox groups, and governance fields update typed state in one model;
  - rendered state reflects store values rather than direct class mutation as the primary source of truth;
  - keyboard and ARIA behavior for answer-bearing controls is preserved or improved.

### T012 — Implement validation, skip state, and computed outcomes

- **Dependencies:** `T003`, `T011`
- **Files to modify/create:** `static/js/config/rules.js`, `static/js/state/derive.js`, `static/css/states.css`
- **Acceptance criteria:**
  - conditional requiredness, skip reason/rationale rules, principle judgments, recommendation constraints, and governance disagreement rules are enforced from the rules layer;
  - question-level and section-level skip are distinct from negative answers;
  - low-score blocker requirements and critical-fail follow-up rules are computed consistently.

### T013 — Implement full-questionnaire completion and progress model

- **Dependencies:** `T012`, `T009`, `T010`
- **Files to modify/create:** `static/js/state/derive.js`, `static/js/render/sidebar.js`, `static/js/behavior/navigation.js`, `static/css/states.css`
- **Acceptance criteria:**
  - completion is based on all currently applicable required fields, not rating-count completion;
  - the canonical state model distinguishes `not_started`, `in_progress`, `complete`, `invalid/attention`, `skipped`, and `blocked/escalated`;
  - progress covers the full questionnaire, including non-principle sections and governance subsections;
  - accessible textual progress is exposed independently of any compact visual strip.

### T014 — Implement evidence workflow and evidence manifest boundary

- **Dependencies:** `T011`, `T012`
- **Files to modify/create:** `static/js/render/evidence.js`, `static/js/adapters/evidence-storage.js`, `static/js/state/store.js`, `static/css/components.css`, `static/css/states.css`
- **Acceptance criteria:**
  - Section 2 supports evaluation-level evidence intake;
  - Sections 3-7 support criterion-level add/reuse/replace/remove/unlink evidence actions;
  - image evidence is previewed inline and inspectable in a modal; non-image evidence is shown as filename rows;
  - each evidence association captures evidence type and mandatory note;
  - the UI can emit an evaluation/section/criterion keyed evidence manifest without requiring an in-repo backend.

## Wave 5 — Visual normalization and regression boundary

Wave 5 normalizes the finished behavior into the intended design system and adds the minimum safe verification layer.

### T015 — Normalize visual state system and explicit help pattern

- **Dependencies:** `T008`, `T009`, `T010`, `T012`, `T013`, `T014`
- **Files to modify/create:** `static/css/tokens.css`, `static/css/components.css`, `static/css/states.css`, `static/js/render/help-panel.js`, `static/js/render/sidebar.js`, `static/js/render/about-panel.js`
- **Acceptance criteria:**
  - section context, score, validation/workflow state, judgment state, recommendation state, and help state each use distinct token families;
  - section accent application is consistent across page chrome, sidebar markers, quick-jump row, contextual docs, and progress surfaces;
  - recommendation colors are semantically corrected;
  - essential guidance no longer depends on native `title` tooltips;
  - help/info triggers open explicit surfaces with correct focus management.

### T016 — Add minimal static-project tooling and regression harness

- **Dependencies:** `T015`
- **Files to modify/create:** `package.json`, `playwright.config.js`, `.htmlvalidate.json`, `tests/e2e/navigation.spec.js`, `tests/e2e/rendering.spec.js`, `tests/e2e/validation.spec.js`, `tests/e2e/completion.spec.js`, `tests/e2e/evidence.spec.js`
- **Acceptance criteria:**
  - the project can run HTML validation and browser regression tests against a local static server;
  - tests cover navigation surfaces, page activation, sidebar/context routing, schema rendering, branching rules, completion states, evidence flow, keyboard behavior, reduced motion, and responsive layout;
  - only test/validation tooling is added;
  - no bundler or runtime framework is introduced.

## Wave 6 — Legacy removal, parity verification, and release gate

Wave 6 removes temporary compatibility surfaces and closes the migration.

### T017 — Remove dual-pane legacy remnants and verify canonical parity

- **Dependencies:** `T016`
- **Files to modify/create:** `trust-framework.html`, `static/css/*`, `static/js/*`
- **Acceptance criteria:**
  - no synchronized dual-pane scroll model remains in layout or behavior code;
  - no duplicate handwritten questionnaire markup remains as a maintained source;
  - no temporary compatibility shims remain for old navigation/state assumptions;
  - rendered field inventory, criterion count, labels, and option sets match canonical documents;
  - print and responsive audits are complete.

### T018 — Final release gate, rollback packaging, and handover

- **Dependencies:** `T017`
- **Files to modify/create:** project files as required; no additional runtime architecture files are introduced by this task
- **Acceptance criteria:**
  - all quality gates pass;
  - rollback points remain valid at wave boundaries;
  - integration order and ownership for shared files are recorded;
  - the result is a maintainable static implementation with clear config/state/render/behavior boundaries.

## Change-area to task mapping

| Change ID | Change area | Task IDs |
|---|---|---|
| CHG-01 | Multi-file architecture decomposition | `T004`, `T005`, `T006`, `T017` |
| CHG-02 | Authoritative page/section registry and separate content-topic registry | `T001`, `T008`, `T009`, `T010` |
| CHG-03 | Section-level pagination, page index, quick-jump row, and Info/About routing | `T008`, `T009`, `T010` |
| CHG-04 | Canonical questionnaire schema and typed option/field metadata | `T002`, `T007` |
| CHG-05 | Conditional logic, validation, skip state, and computed judgments | `T003`, `T011`, `T012`, `T013` |
| CHG-06 | Evidence upload, preview, association, and manifest workflow | `T014` |
| CHG-07 | Visual token system with separated context/state semantics | `T005`, `T015` |
| CHG-08 | Full-questionnaire completion and progress model | `T003`, `T010`, `T013`, `T015` |
| CHG-09 | Static-project testing, validation, responsive, print, and accessibility verification | `T016`, `T018` |
| CHG-10 | Migration sequencing, rollback, and integration control | `T016`, `T017`, `T018` |

## Risk register

| Risk ID | Risk | Effect | Mitigation |
|---|---|---|---|
| R1 | Interaction-model drift from prior split-pane assumptions | partial refactor retains scroll-coupled architecture | enforce page/context/drawer model from `T001`, `T004`, `T008`, `T010` |
| R2 | Drift between runtime schema and canonical docs | missing or renamed fields/criteria | lock schema in `T002`; run parity audit in `T017` |
| R3 | Registry duplication | sidebar, pager, and help surfaces diverge | require one section registry and one content-topic registry only |
| R4 | Rule logic implemented in DOM instead of derivation layer | inconsistent completion/validation behavior | block completion and validation work until `T003` exists |
| R5 | Visual semantic collisions | context/state meanings remain ambiguous | separate token families in `T015` |
| R6 | Evidence workflow exceeds repo scope | hidden backend dependency or lossy evidence state | keep explicit adapter boundary and manifest model in `T014` |
| R7 | Accessibility regression | keyboard, focus, or ARIA failure | preserve landmarks in `T004`; verify through `T016` and `T018` |
| R8 | Responsive or print regression | degraded operational usability | isolate layout and print concerns in `T005`; verify in `T016` and `T017` |
| R9 | Merge conflicts on shared shell/layout files | slowed integration and unstable rebases | one integrating owner per wave for `trust-framework.html` and top-level layout files |
| R10 | Tooling creep | plan drifts into framework migration | constrain `T016` to validation/testing dependencies only |

## Quality gates

### QG-01 — Canonical parity gate

- verify section/page inventory against `docs/trust-questionnaire.md`;
- verify criterion inventory and wording alignment with `docs/trust-framework-v2.md`;
- verify governance subsections remain intact.

**Blocking condition:** any missing or renamed canonical field or criterion without an explicit source-document change.

### QG-02 — Static structure gate

- validate HTML structure, landmark usage, unique IDs, labels, and ARIA references;
- verify page IDs and help/drawer control relationships.

**Blocking condition:** invalid structure, duplicate IDs, unlabeled controls, or broken ARIA references.

### QG-03 — Navigation and context-routing gate

- verify sidebar navigation, quick-jump row, pager, contextual-topic routing, persistent drawers, and Info/About routing;
- verify workflow mode changes page editability correctly;
- verify page identity is deep-linkable and stable.

**Blocking condition:** any surface derives order or routing outside the registries, or context changes remain scroll-heuristic driven.

### QG-04 — Validation and rule gate

- verify branching for nomination, primary evaluation, second review, final decision, and re-evaluation;
- verify skip state, low-score blockers, recommendation constraints, second-review disagreement logic, and critical-fail follow-up logic.

**Blocking condition:** any branch behaves contrary to canonical rules.

### QG-05 — Completion gate

- verify completion uses all currently applicable required fields;
- verify progress covers the full questionnaire;
- verify skipped, blocked, invalid, in-progress, and complete states are distinct.

**Blocking condition:** any page can be shown as complete while required applicable fields remain incomplete.

### QG-06 — Evidence workflow gate

- verify evaluation-level and criterion-level evidence flows;
- verify note requirement, replace/unlink behavior, and image/non-image preview behavior;
- verify evidence manifest integrity.

**Blocking condition:** evidence cannot be traced back to evaluation, section, and criterion with preserved note metadata.

### QG-07 — Accessibility and motion gate

- manual keyboard-only traversal;
- screen-reader smoke test for page index, rating controls, drawers, and help surfaces;
- reduced-motion verification;
- focus return verification for sidebar overlays, help panels, and Info/About surface.

**Blocking condition:** focus traps, unlabeled interactive elements, or essential guidance available only through pointer-only affordances.

### QG-08 — Responsive and print gate

- verify desktop sidebar layout, narrow overlay behavior, and print output;
- run mandatory browser coverage in Chromium and Firefox;
- run recommended additional WebKit pass when available.

**Blocking condition:** unusable narrow-screen navigation, degraded print structure, or unreadable evidence/rating surfaces.

## Rollback notes

Rollback is wave-based. Partial rollback inside a completed wave is not the default path. Revert to the previous wave boundary unless a smaller change was explicitly isolated.

| Rollback point | Reached after | Revert scope |
|---|---|---|
| `RB-01` | Wave 1 | registries, schema, and rules only |
| `RB-02` | Wave 2 | shell conversion and asset extraction |
| `RB-03` | Wave 3 | rendering, sidebar, and pager model |
| `RB-04` | Wave 4 | stateful form behavior, completion, and evidence |
| `RB-05` | Wave 5 | visual normalization and regression harness |
| `RB-06` | Wave 6 | release candidate |

Additional rollback rules:

1. Do not remove legacy questionnaire markup until the renderer-based implementation passes `QG-01` through `QG-07`.
2. Do not remove compatibility hooks for old navigation assumptions until `T016` has passed.
3. Because the repository has no in-repo backend or database migration, rollback remains code-only.

## Progress tracking

| Task ID | Wave | Status | Notes | Completed Date |
|---|---:|---|---|---|
| T001 | 1 | COMPLETE | Canonical page/section registry and separate content-topic registry implemented in `static/js/config/sections.js`; includes page order, quick-jump membership, completion grouping, workflow applicability, and first-class `S10A`/`S10B`/`S10C` entries. | 2026-04-03 |
| T002 | 1 | COMPLETE | Canonical schema and option sets implemented in `questionnaire-schema.js` and `option-sets.js`; 16 criteria are typed once and the explicit Section 6 listing resolves the inventory to 135 fields rather than the stale appendix total of 132. | 2026-04-03 |
| T003 | 1 | COMPLETE | `rules.js` and `state/derive.js` encode workflow branching, requiredness, skip state, principle judgments, recommendation constraints, completion, evidence completeness, and explicit governance/page activation behavior outside the DOM. | 2026-04-03 |
| T004 | 2 | PENDING | Convert `trust-framework.html` into a page-based shell | — |
| T005 | 2 | PENDING | Split CSS into external files by concern | — |
| T006 | 2 | PENDING | Split JavaScript into module graph and bootstrap store | — |
| T007 | 3 | PENDING | Render canonical questionnaire pages from schema | — |
| T008 | 3 | PENDING | Implement contextual sidebar, persistent reference drawers, and Info/About surface | — |
| T009 | 3 | PENDING | Implement page index, quick-jump row, and registry-driven navigation surfaces | — |
| T010 | 3 | PENDING | Implement sequential pager and page/context tracking | — |
| T011 | 4 | PENDING | Implement field interaction and store updates | — |
| T012 | 4 | PENDING | Implement validation, skip state, and computed outcomes | — |
| T013 | 4 | PENDING | Implement full-questionnaire completion and progress model | — |
| T014 | 4 | PENDING | Implement evidence workflow and evidence manifest boundary | — |
| T015 | 5 | PENDING | Normalize visual state system and explicit help pattern | — |
| T016 | 5 | PENDING | Add minimal static-project tooling and regression harness | — |
| T017 | 6 | PENDING | Remove dual-pane legacy remnants and verify canonical parity | — |
| T018 | 6 | PENDING | Final release gate, rollback packaging, and handover | — |
