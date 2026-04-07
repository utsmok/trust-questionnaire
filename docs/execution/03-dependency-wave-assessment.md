# Dependency and wave assessment

Date: 2026-04-06
Status: planning only
Scope: dependency assessment and initial wave structure for implementing the collaborative TRUST review product without changing the current questionnaire-first product direction.

## Inputs reviewed

- `docs/00-master-implementation-roadmap.md`
- `CLAUDE.md`
- `package.json`
- `docs/plan-backend-architecture.md`
- `docs/plan-frontend-ux.md`
- `docs/simplified-core-product-plan.md`
- `docs/simplified-backend-essentials.md`
- `docs/plan-extension-tooling.md`
- `docs/simplified-tooling-extension-plan.md`
- `docs/ui-fixes/MASTER_PLAN.md`
- current code structure under `static/js/**`, `static/css/**`, and `tests/**`

## Executive assessment

The codebase already contains a stable core review workspace: schema-driven page rendering, a central immutable store, a derived-state layer, an evidence interaction model, and recent regression coverage across rendering, navigation, validation, completion, and evidence flows. The primary delivery problem is not questionnaire authoring. The primary delivery problem is sequencing new product layers around the existing questionnaire without destabilizing that workspace.

The critical path is:

1. freeze canonical review and evidence contracts;
2. introduce server-side identity and durable review records;
3. connect the current questionnaire workspace to create/open/save/continue/resume;
4. move evidence and workflow enforcement to the backend;
5. only then add test-set tooling and extension-driven capture.

The main schedule risk is coupling persistence work to a broad frontend rewrite. The current questionnaire workspace should remain the delivery anchor. Any larger app-shell or framework migration must remain compatibility-first and off the critical path.

## Current dependency baseline

### Architectural anchors already present

- `static/js/app.js` is the single bootstrap seam. It creates the store, renders questionnaire pages, and wires navigation and field handlers.
- `static/js/state/store.js` already exposes a canonical evaluation shape close to a persistable DTO:
  - `workflow`
  - `fields`
  - `sections`
  - `criteria`
  - `evidence`
  - `overrides`
- `static/js/state/derive/**` is the domain engine for workflow, completion, validation, recommendation, judgment, and evidence completeness. It is the highest-value domain asset in the repository.
- `static/js/config/questionnaire-schema.js`, `static/js/config/rules.js`, `static/js/config/sections.js`, and `static/js/config/option-sets.js` define the questionnaire contract and are shared by renderers, handlers, and tests.
- `static/js/render/questionnaire-pages.js` is the central schema-driven renderer for all questionnaire pages.
- `static/js/render/evidence.js` and `static/js/state/evidence-actions.js` already encode reusable evidence semantics through `assetId` plus association-level identity.
- `static/js/adapters/evidence-storage.js` is export-only. It is not yet a persistence boundary.

### Constraints that materially affect sequencing

1. The current store mixes domain state and UI state. This is acceptable for the current SPA, but it creates a conflict zone once routing, persistence, review shell state, and autosave are introduced.
2. Evidence is still browser-resident at runtime (`dataUrl`, `previewDataUrl`) and only exportable as a manifest. Durable evidence storage is therefore downstream of review identity, authorization, and upload APIs.
3. `tests/e2e/helpers.js` and the current Playwright suites assume `trust-framework.html` and the current questionnaire shell. Early waves must preserve this baseline or replace it deliberately with equivalent coverage.
4. The frontend plan recommends a route-driven shell, but the master roadmap explicitly rejects making a framework replacement the center of the roadmap. That makes a compatibility-first migration the only safe interpretation.
5. The tooling/extension plans explicitly depend on stable login, saved reviews, target lookup, durable evidence APIs, and auditability. Tooling and extension work are therefore not first-wave candidates.
6. Documentation drift already exists around evidence semantics. The tooling plan notes that `docs/trust-questionnaire.md` still describes superseded evidence fields. Contract drift must be corrected before implementation work branches.

## Dependency ordering conclusion

The implementation order should follow product dependencies rather than document order alone.

### Hard dependencies

1. **Canonical DTO and versioning** before persistence.
2. **Persistence and review identity** before save/resume UI.
3. **Review identity and permissions** before evidence storage.
4. **Evidence storage and lifecycle states** before collaboration workflow hardening.
5. **Stable review/evidence APIs** before tooling and test-run linkage.
6. **Stable tooling/review target APIs** before browser extension work.

### Important non-dependencies

1. A full frontend rewrite is **not** a prerequisite for login, persistence, evidence APIs, collaboration workflow, or export/import.
2. A React/Vite route shell is **not** a prerequisite for Phase 1 saved-review delivery if the current questionnaire workspace is preserved as the core work surface.
3. Browser extension delivery is **not** a prerequisite for improving evidence capture inside the web application.

## Proposed implementation waves

### Wave 0 — plan concretization and contract freeze

### Purpose

Convert the roadmap and plan set into execution-ready task definitions before any implementation begins.

### Rationale

The current plan set is directionally consistent but not yet execution-safe. Backend, frontend, and tooling documents all assume shared contracts that are not yet explicitly frozen. The highest-risk example is the evidence model, where runtime behavior and documentation are already out of sync.

### Required outputs

- canonical review-state DTO aligned to the current `EvaluationState` shape
- schema versioning and migration policy for saved review state
- workflow mode vs backend lifecycle-state mapping
- evidence asset vs evidence association contract, including manifest compatibility
- explicit app-shell/review-shell route model, including review-id ownership and review overview delivery
- save/autosave/revision/concurrency policy
- policy constraints register for guest reviewer scope, second-reviewer rights, comment granularity, publication/retention boundaries, import/export timing interpretation, and extension capture boundaries
- endpoint contract set for:
  - auth/session
  - current user/preferences
  - review list/detail
  - review state load/save
  - evidence upload/link/download
  - assignments/transitions/comments
- explicit statement that the current questionnaire remains the permanent core work screen
- task template for every implementation task:
  - first-pass file-level change design
  - roadmap/plan review result
  - corrections
  - implementation scope
  - verification scope

### Safe parallel workstreams

- backend contract specification
- frontend integration-seam specification
- content/help extraction inventory
- test strategy and wave gate definition

These are safe in parallel only because they are still documentation and contract work.

### Do not do in parallel

- do not begin backend schema implementation before the DTO, lifecycle, and evidence contracts are frozen
- do not begin frontend autosave/resume implementation before save and concurrency semantics are frozen
- do not begin app-shell/review-shell work before route ownership and shell boundaries are frozen

### Quality gate

- every implementation task has a first-pass file-level change design
- every design has been reviewed against `00-master-implementation-roadmap.md` and the relevant domain plan
- unresolved blockers are limited to later-phase decisions only
- documentation drift on evidence semantics is identified and queued for correction

### Wave 1 — backend substrate and durable review identity

### Purpose

Add the minimum server-side substrate required for a real product: authentication, users, preferences, reviews, revisions, and stable review identity.

### Rationale

This is the first hard implementation dependency for nearly all later work. Without stable review IDs, revisions, and authenticated user context, save/continue, evidence persistence, assignments, comments, exports, tooling, and extension capture all remain blocked.

### Main workstreams

- same-origin backend-for-frontend shell
- login/logout/session handling
- user record and preference persistence
- review list/detail/create APIs
- revision storage model
- canonical state save/load DTO support
- version/ETag strategy for later concurrency control

### Safe parallel workstreams

- auth/session implementation
- user/preferences implementation
- review/revision schema and CRUD endpoints
- backend test harness setup

These can proceed in parallel once Wave 0 contracts are frozen, because they can be partitioned by backend module boundary.

### Do not do in parallel

- do not implement frontend persistence UI at the same time as changing backend DTO shape
- do not start evidence storage implementation before review identity and auth are stable
- do not rewrite questionnaire rendering in this wave

### Quality gate

- backend auth/session tests pass
- review create/list/detail/save/load integration tests pass
- migration/seed flow is repeatable
- current frontend baseline remains non-regressed
- existing validation/test scripts remain green for the questionnaire workspace

### Wave 2 — save/continue integration around the current questionnaire workspace

### Purpose

Make the existing questionnaire a real saved work surface without replacing it.

### Rationale

This wave delivers the first complete product increment described by the master roadmap: login, dashboard entry, create/open/save/continue/resume, and use of the current questionnaire as the main work screen. It should preserve the current schema-driven workspace and its current test baseline.

### Main workstreams

- load persisted review data into the current store boundary
- save the current questionnaire state back through the backend
- autosave/manual-save/save-status behavior
- dashboard and saved review list
- review overview entry point
- user settings surface for the small preference set introduced in Wave 1

### Safe parallel workstreams

- dashboard/review-list UI
- review overview UI
- load/save adapter integration at the store boundary
- save-status and autosave UI

These can run in parallel after list/detail/state endpoints are stable.

### Do not do in parallel

- do not perform a broad route-shell migration and core persistence integration in the same execution window
- do not replace `questionnaire-pages.js` while save/load hydration is being introduced
- do not split ownership of `store.js`, `app.js`, and `field-handlers.js` across multiple high-churn tasks without a file-owner plan

### Quality gate

- user can create a review, open it, save it, leave it, and resume it later
- state round-trip tests confirm no loss of canonical review data
- Playwright baseline remains green for rendering, navigation, validation, completion, and evidence behavior within the current workspace
- new end-to-end flows exist for create/open/save/continue/resume

### Wave 3 — durable evidence and shared review workflow

### Purpose

Move evidence and workflow authority to the backend and complete the formal collaborative review model.

### Rationale

The roadmap’s second major product step depends on review persistence already being real. This wave adds the features that make the product collaborative and traceable rather than single-user and browser-bound.

### Main workstreams

- server-side evidence assets and evidence links
- secure upload/download and evidence manifest compatibility
- review assignments and lifecycle transitions
- handover to second reviewer
- second-review notes and disagreement capture
- final team decision capture
- comments/activity history
- export/import
- optimistic concurrency and conflict responses

### Safe parallel workstreams

- evidence storage/API implementation
- assignment/lifecycle transition implementation
- comments/activity/audit implementation
- export/import package implementation

These are safe in parallel only after the review identity, canonical DTO, and lifecycle-state contracts are stable.

### Do not do in parallel

- do not build the browser extension in parallel with evidence API design or upload finalization design
- do not let export/import work proceed while state schema versioning is still moving
- do not implement second-review and final-decision UI before the permission matrix and lifecycle transitions are fixed

### Quality gate

- evidence upload, link, reuse, unlink, and authorized download flows are tested
- handover, second review, reopen, and final decision flows are tested end to end
- permission matrix tests cover stage-based editability and read-only behavior
- audit trail assertions exist for key events
- import/export round-trip tests exist for canonical review state and evidence manifests
- concurrency/conflict behavior is explicitly tested

### Wave 4 — shell/work-surface stabilization, content extraction, and UX hardening

### Purpose

Stabilize shell-owned surfaces first, then separate app-level content surfaces from the single HTML shell and harden the dense review workspace without moving the core delivery path onto a full rewrite.

### Rationale

This wave is important, but it is only partially on the critical path. Shared help/reference/about material, route ownership, content reuse, review-shell clarity, and keyboard/focus stability matter for maintainability and usability. They do not block the first saved-review product if the current questionnaire workspace remains functional. However, content migration should not begin on top of unstable rerender and focus mechanics.

### Main workstreams

- separate route/view identity from draft store state
- stabilize review-shell surface ownership and rerender paths
- continue keyboard/focus/accessibility hardening
- extract shared help/reference/about content from `trust-framework.html`
- introduce or refine app-level help/settings surfaces
- continue density/layout cleanup around the saved-review product
- keep the existing workspace inside the routed review shell rather than creating separate product entrypoints

### Safe parallel workstreams

- shell/rerender/focus stabilization
- keyboard and accessibility hardening
- content extraction inventory and normalization after shell boundaries are stable
- visual and density refinements outside core store/render conflicts

### Do not do in parallel

- do not perform a full workspace renderer rewrite while also changing route ownership and evidence integration
- do not let a framework migration become a hidden prerequisite for core product delivery
- do not begin user-facing content migration or help-surface rollout before shell/rerender/focus stabilization is accepted
- do not change `navigation.js`, `context-tracking.js`, `pager.js`, `sidebar.js`, and `trust-framework.html` simultaneously without a shell-level integration plan

### Quality gate

- workspace navigation/focus behavior remains correct
- accessibility regression checks pass for focus, keyboard, and hidden/inert behavior
- extracted content is reusable in both workspace and app-level surfaces
- current workspace e2e coverage remains valid or is replaced with equivalent route-aware coverage

### Wave 5 — tooling workspace and reusable test sets

### Purpose

Add reusable testing assets and review-linked test runs on top of the stable saved review and evidence platform.

### Rationale

The tooling plans correctly place this work after durable reviews and durable evidence exist. Test sets become useful only when they can be versioned, linked to a review, executed, and traced to evidence and final judgments.

### Main workstreams

- tooling workspace separate from the questionnaire page sequence
- test-set CRUD and versioning
- published revision pinning
- review-linked test plans
- per-test-case run tracking
- linkage from test runs to evidence assets and review outputs

### Safe parallel workstreams

- test-set backend model and APIs
- tooling UI/workspace implementation
- reporting linkages from runs to review outputs

These become safe only after Waves 2 and 3 have stabilized review and evidence APIs.

### Do not do in parallel

- do not start extension-driven capture implementation before test-set and target APIs are proven from the web app itself
- do not store test-set state inside the questionnaire store or the 13-page review flow

### Quality gate

- published test-set revisions are immutable once linked to a review
- review-to-test-plan-to-test-run-to-evidence linkage is test-covered
- reporting/export surfaces can name the test-set revision used by a review

### Wave 6 — browser extension pilot

### Purpose

Add explicit browser-assisted evidence capture as a thin client of the already working review/evidence system.

### Rationale

The extension is a convenience layer, not the product foundation. It should start only after the web application already supports saved reviews, durable evidence, target lookup, permissions, and auditability.

### Main workstreams

- extension pairing/session flow
- review and target lookup inside the extension
- capture of screenshot, URL/title, selection text, and note
- upload queue/retry/finalize flow
- attach to review level, criterion level, or review inbox
- provenance metadata and audit alignment

### Safe parallel workstreams

- extension background/upload queue implementation
- extension popup/target-selection UI
- pairing UX in the main web application

These are safe only after capture/session/evidence APIs are stable and already exercised by the web application.

### Do not do in parallel

- do not change capture/evidence endpoints while extension implementation is underway
- do not add broad automation, hidden capture, or aggressive page scraping in the pilot wave
- do not start with multi-browser scope before Chromium-first behavior is stable

### Quality gate

- pairing and revocation flows are tested
- upload retry/idempotency behavior is tested
- provenance metadata survives export/reporting flows
- extension capture respects permission, read-only, and target-validity constraints

## Safe parallelization summary

### Parallelizable after Wave 0 contract freeze

| Workstream pair | Safe condition |
|---|---|
| Auth/session and user preferences | shared auth contract frozen |
| Review schema/revisions and dashboard/review-list UI design | list/detail DTOs frozen |
| Content extraction inventory and backend contract work | content keys do not change DTOs |
| Backend test harness and API implementation | endpoint surface stable |

### Parallelizable after Wave 2

| Workstream pair | Safe condition |
|---|---|
| Evidence backend and assignment/lifecycle implementation | review identity and lifecycle vocabulary frozen |
| Export/import package work and comments/activity work | canonical schema versioning frozen |
| Non-user-visible shell/rerender/focus stabilization and dashboard refinement | workspace persistence integration stable |

### Parallelizable after Wave 3

| Workstream pair | Safe condition |
|---|---|
| Tooling backend and tooling UI | review/evidence APIs stable |
| Extension pairing UX and extension upload queue | capture/session APIs stable |

## What should not be done in parallel

The following combinations should be explicitly prohibited.

1. **Canonical DTO changes** and **frontend save/load implementation**.
2. **Evidence asset/association contract changes** and **extension implementation**.
3. **Core questionnaire renderer rewrite** and **save/continue integration**.
4. **Route-shell migration** and **store/persistence seam changes**.
5. **Lifecycle/permission matrix changes** and **second-review/final-decision UI implementation**.
6. **Schema field ID changes** and **import/export implementation**.
7. **Global shell DOM changes** and **broad Playwright selector updates** before the shell stabilizes.

## Expected shared-file conflict zones

| Conflict zone | Why it is high-risk | Recommendation |
|---|---|---|
| `static/js/state/store.js` | central source of truth; mixes domain and UI state; touched by persistence, routing, autosave, concurrency, and workflow logic | single owner per wave; no parallel structural edits |
| `static/js/app.js` | bootstrap seam for store, render, navigation, and handlers | keep integration changes isolated and staged |
| `static/js/config/questionnaire-schema.js`, `rules.js`, `sections.js`, `option-sets.js` | shared contract surface for renderers, derive logic, and tests | freeze before downstream implementation; batch changes deliberately |
| `static/js/state/derive/**` | shared domain logic; regressions propagate widely | treat as contract-sensitive; require focused unit coverage |
| `static/js/render/questionnaire-pages.js` | central schema-driven renderer for all pages | do not share among unrelated feature branches |
| `static/js/render/evidence.js` and `static/js/state/evidence-actions.js` | evidence UI semantics, reuse model, lightbox behavior, target scoping | isolate evidence work to one stream at a time |
| `static/js/behavior/field-handlers.js` | delegated event handling for many controls and evidence interactions | high merge risk; avoid parallel handler changes |
| `static/js/behavior/navigation.js`, `context-tracking.js`, `pager.js` | active page identity, focus, deep linking, shell behavior | do not mix route migration and workspace fixes loosely |
| `trust-framework.html` plus `render/sidebar.js`, `reference-drawers.js`, `about-panel.js`, `help-panel.js` | shell mount points and DOM-mined content surfaces | requires a coordinated shell/content extraction plan |
| `tests/e2e/helpers.js` and all `tests/e2e/*.spec.js` | root navigation assumptions affect all suites | update only after shell behavior stabilizes |
| `static/css/components.css`, `layout.css`, `interaction-states.css` | dense shared styling surface with cross-component coupling | assign by wave, not by isolated ticket |

## Required enabling tasks before backend/frontend integration

These tasks must complete before backend/frontend integration work starts.

1. Freeze the canonical persisted review-state DTO and versioning rules.
2. Freeze the evidence asset/association model and manifest compatibility policy.
3. Define lifecycle states separately from frontend workflow mode.
4. Define save/autosave/revision/concurrency semantics.
5. Define the initial API contract set and error model.
6. Reconcile documentation drift for current evidence semantics.
7. Freeze the app-shell/review-shell route model and review-id ownership boundary.
8. Capture the current verification baseline and required replacement coverage for any shell changes.

## Recommended quality gates by wave

| Wave | Recommended gate |
|---|---|
| Wave 0 | design review complete; file-level designs reviewed against roadmap and plan docs; unresolved blockers documented |
| Wave 1 | auth/session tests, review CRUD/revision integration tests, seed/migration smoke, existing questionnaire baseline non-regressed |
| Wave 2 | create/open/save/continue/resume e2e coverage, state round-trip tests, current rendering/navigation/validation/evidence coverage retained |
| Wave 3 | evidence upload/link/download tests, permission-matrix tests, handover/second-review/final-decision e2e, audit assertions, import/export round-trip tests, concurrency tests |
| Wave 4 | accessibility/focus regression checks, content reuse checks, route/workspace navigation regression checks, visual density review |
| Wave 5 | test-set version pinning tests, test-run-to-evidence linkage tests, reporting/export verification |
| Wave 6 | pairing/revocation tests, upload queue/retry tests, provenance verification, target-validity enforcement tests |

### Existing baseline to preserve

The current repository already has a useful non-regression baseline:

- `npm run validate:html`
- `npm run test:unit`
- `npm run test:e2e`

The current Playwright suites cover:

- schema-driven rendering inventory
- navigation and page accessibility behavior
- conditional validation behavior
- page and criterion completion/skip behavior
- evidence add/remove/export flows

Early waves should preserve this baseline and expand it. They should not discard it.

## Recommended task sequencing inside each wave

Each implementation task should follow the same micro-sequence.

1. **First-pass file-level change design**
	- list target files
	- state contract impact
	- test impact
	- rollback scope
2. **Review against roadmap and domain plan**
	- confirm scope does not violate master roadmap guardrails
	- confirm it does not create contract drift with adjacent plans
3. **Correction pass**
	- revise the file-level design where the review finds mismatch
4. **Implementation**
	- implement only after the corrected design is accepted
5. **Wave gate verification**
	- run the wave-specific quality gates before merging

Multiple tasks may be in design/review simultaneously. Multiple tasks should not be in implementation simultaneously if they target the same contract surface or shared-file conflict zone.

## Critical path

The recommended critical path is:

`Wave 0 -> Wave 1 -> Wave 2 -> Wave 3 -> Wave 5 -> Wave 6`

Wave 4 is important but partly off the critical path. After Wave 2 it may overlap only for non-user-visible shell/rerender/focus stabilization and related enabling work. User-facing Phase 3 outputs such as content migration, help-surface rollout, and workspace-density changes should begin only after Wave 3 user-facing workflow scope is complete. Wave 4 should not delay the saved-review, evidence, and collaboration path.

## Final recommendation

Treat the current questionnaire workspace as the stable product core and sequence new work around it.

The correct initial wave structure is:

1. contract freeze and task concretization;
2. backend identity and durable review substrate;
3. save/continue integration around the current questionnaire;
4. durable evidence plus collaborative workflow enforcement;
5. then, not before, tooling/test sets;
6. extension capture last.

The principal execution control is simple: do not place renderer replacement, route migration, and persistence integration on the same critical path. That combination has the highest rework and regression probability.
