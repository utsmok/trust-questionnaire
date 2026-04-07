# Executable implementation plan

Date: 2026-04-06
Status: planning only
Scope: convert the master roadmap and supporting plans into an execution-safe, file-level implementation plan for the current repository

## Executive summary

The selected implementation path is a compatibility-first build around the current questionnaire, not a frontend restart. The current questionnaire remains the permanent core work surface. The execution plan therefore prioritizes a same-origin backend-for-frontend, durable review persistence, evidence storage, and workflow enforcement before any broader UI restructuring.

The chosen architecture is:

- one same-origin web application implemented as one routed compatibility document with an authenticated app shell and a nested review shell;
- one custom Node.js backend-for-frontend, implemented with Fastify;
- one PostgreSQL database for users, preferences, reviews, revisions, assignments, comments, activity, decisions, tooling records, and extension session metadata;
- one private object store for evidence assets;
- the current questionnaire schema, rules, derive layer, and dense workspace retained as the initial canonical review engine.

A React/Vite route-shell migration is **not** on the critical path for this plan. It is treated as an optional later technical evolution because the roadmap explicitly rejects making a frontend replacement the center of delivery, and the current repository already contains the highest-value product asset: the review workspace.

Execution is organized into seven waves:

- **Wave 0** — contract freeze and doc reconciliation;
- **Wave 1** — backend substrate and identity;
- **Wave 2** — saved-review application around the current questionnaire;
- **Wave 3** — durable evidence and collaborative workflow;
- **Wave 4** — shell/work-surface stabilization, shared content architecture, and UX hardening;
- **Wave 5** — tooling workspace and reusable test sets;
- **Wave 6** — browser extension pilot.

Critical path: **Wave 0 -> Wave 1 -> Wave 2 -> Wave 3 -> Wave 5 -> Wave 6**.
Wave 4 is required by scope. After Wave 2 is stable, only non-user-visible Wave 4 enabling work may overlap: shell/rerender/focus stabilization, shortcut architecture, and content inventory. User-facing Phase 3 surfaces and content migration do not begin until Wave 3 user-facing workflow scope is complete.

## Selected architectural assumptions and rationale

### A1. The current questionnaire remains the permanent core work surface.

**Chosen from:** `docs/00-master-implementation-roadmap.md`, `docs/00-simplified-implementation-roadmap.md`, `docs/execution/01-current-state-inventory.md`
**Rationale:** This is the authoritative product guardrail. The current repository already contains the section flow, rules engine, derive layer, evidence model, and dense keyboard-oriented workspace. Replacing that surface early would increase delivery risk without unlocking any roadmap requirement.

### A2. The backend is a same-origin Node.js backend-for-frontend, with Fastify, PostgreSQL, private object storage, and institutional OIDC.

**Chosen from:** `docs/plan-backend-architecture.md`, `docs/simplified-backend-essentials.md`
**Rationale:** This is the simplest architecture that preserves the existing JavaScript codebase, supports secure sessions, avoids browser token storage, and can model evidence assets, revisions, workflow transitions, and exports without forcing low-code compromises or provider-specific BaaS constraints.

### A3. The initial persisted review contract mirrors the current questionnaire `EvaluationState` shape and is versioned from day one.

**Chosen from:** `docs/plan-backend-architecture.md`, `docs/execution/01-current-state-inventory.md`, `docs/execution/03-dependency-wave-assessment.md`
**Rationale:** The current schema is still evolving. A field-per-column database model would introduce avoidable migration churn. Versioned JSON state preserves compatibility with `createAppStore({ initialEvaluation })`, `replaceEvaluation()`, the derive layer, and existing tests.

### A4. Evidence is modeled as reusable assets plus scoped links, not as flat attachments.

**Chosen from:** `docs/plan-backend-architecture.md`, `docs/plan-extension-tooling.md`, `docs/execution/02-roadmap-scope-extraction.md`
**Rationale:** The current frontend already distinguishes `assetId` from scoped association `id`. Flattening evidence into per-criterion files would regress current behavior and block later reuse, review inbox flows, test-run linkage, and extension capture.

### A5. Frontend workflow mode and backend lifecycle state remain separate.

**Chosen from:** `docs/plan-backend-architecture.md`, `docs/execution/02-roadmap-scope-extraction.md`
**Rationale:** The current `workflow.mode` is necessary for page access and editability, but it is not sufficient for assignment, handoff, decision, publication, and permission enforcement. The lifecycle state machine must exist separately on the backend.

### A6. The frontend integration strategy is one routed app shell plus one nested review shell, implemented through compatibility-first vanilla expansion rather than multiple standalone product entrypoints or an immediate framework rewrite.

**Chosen from:** `docs/00-master-implementation-roadmap.md`, `docs/execution/02-roadmap-scope-extraction.md`, `docs/execution/03-dependency-wave-assessment.md`, `docs/plan-frontend-ux.md`, `docs/simplified-core-product-plan.md`
**Rationale:** The supporting plans require one app shell, one review shell, route-owned review identity, and a dedicated review overview surface. This executable plan keeps the implementation compatibility-first and vanilla-JS-friendly, but it no longer leaves the shell model implicit or drifts into multiple standalone HTML application entrypoints.

### A7. Collaboration remains structured and stage-owned; real-time co-editing is deferred.

**Chosen from:** `docs/simplified-backend-essentials.md`, `docs/plan-backend-architecture.md`
**Rationale:** One stage owner plus comments, explicit handoff, revisions, and optimistic conflict handling is sufficient for the product. CRDT-style simultaneous editing adds complexity without supporting a roadmap-critical user need.

### A8. Shared Help, Reference, and About content move to a structured registry after persistence and evidence are stable.

**Chosen from:** `docs/plan-a11y-content.md`, `docs/simplified-ux-content-plan.md`, `docs/00-master-implementation-roadmap.md`
**Rationale:** The current content model is fragmented and already stale in places, but it does not block the saved-review core. It should be moved in Wave 4, not mixed into the Phase 1 persistence critical path.

## Selected shell model

- `trust-framework.html` remains the compatibility document during the saved-review build-out; it is expanded into the routed application shell rather than replaced by multiple product entrypoints.
- The **app shell** owns authenticated entry, dashboard, settings, help, tooling, and global session state.
- The **review shell** owns `reviewId`, review-scoped chrome, and review subviews.
- The saved-review phase must deliver these review-shell routes explicitly:
  - `reviews/:reviewId/overview`
  - `reviews/:reviewId/workspace/:sectionSlug`
- Later review-scoped surfaces (`activity`, `import-export`, and the later `review-inbox`) are added as review-shell subviews, not as standalone documents.
- The current questionnaire remains the `workspace/:sectionSlug` work surface and preserves its page-hash behavior only as an internal workspace concern, not as the sole owner of review identity.

## Scope disposition

### In scope on the immediate critical path (Waves 0-3)

These items are mandatory and must be implemented before later tooling or extension work starts:

- backend contract freeze and document reconciliation;
- same-origin backend runtime;
- login/logout and user/session model;
- user profile defaults and small UI preferences;
- one routed app shell and review shell, including dashboard, review list, and review overview;
- create/open/save/continue/resume of reviews;
- persisted review records and immutable revisions;
- loading and saving the current questionnaire without changing its core workflow model;
- durable evidence asset storage and scoped evidence links;
- assignments, handoff, second review, final decision, comments, activity, export, and import.

### Deferred but committed later in this plan (Waves 4-6)

These items are explicitly deferred in sequence, not omitted:

- shared Help/Reference/About relocation and structured content registry;
- keyboard model completion, focus/surface architecture, and render-path stabilization;
- density and workspace hardening work;
- tooling workspace, versioned test sets, linked test plans, and linked test runs;
- review-inbox surface for later unsorted capture triage;
- Chromium extension pilot with paired sessions and review-scoped capture.

### Explicitly deferred technical options

These are not selected for the initial execution path. They may be revisited only after Wave 4 if the product core is stable:

- React + TypeScript + Vite route-shell migration;
- full replacement of `trust-framework.html` as the working questionnaire surface;
- multi-browser extension rollout beyond Chromium-first;
- presence indicators beyond minimal conflict handling.

### Out of scope unless separately re-approved

These items are not part of this executable plan:

- microservices;
- public self-registration;
- live simultaneous co-editing;
- hidden/background evidence capture;
- automatic criterion suggestion by the extension;
- broad analytics dashboards unrelated to review completion, evidence, or governance.

## Wave map

| Wave | Goal | Depends on | Overlap policy |
|---|---|---|---|
| Wave 0 | Freeze contracts and execution assumptions | None | No implementation work starts before this wave is accepted |
| Wave 1 | Add backend substrate and identity | Wave 0 | Backend modules may proceed in parallel after contracts are frozen |
| Wave 2 | Deliver app shell, review shell, and saved-review application around current questionnaire | Wave 1 | Shell/dashboard and persistence seam work may run in parallel after API stability |
| Wave 3 | Deliver durable evidence and collaborative workflow | Wave 2 | Evidence and workflow modules may run in parallel after state/evidence contracts are fixed |
| Wave 4 | Stabilize shell/focus/rerender architecture, then migrate content and harden the workspace | Wave 2 stable; Wave 3 complete for user-facing Phase 3 work | Only non-user-visible enabling work may overlap after Wave 2; user-facing Phase 3 deliverables start after Wave 3 |
| Wave 5 | Add tooling workspace and reusable test sets | Wave 3 | Tooling backend and UI may run in parallel after review/evidence APIs are stable |
| Wave 6 | Deliver extension pilot | Wave 5 | Extension client work may overlap with pairing UI after capture/session APIs stabilize |

## Detailed task plan

## Wave 0 — contract freeze and execution safety

### T001 — Freeze canonical review-state, lifecycle, and versioning contract

- **Objective:** Define the authoritative persisted review contract, lifecycle vocabulary, and schema-version policy before backend or frontend implementation starts.
- **Dependencies:** None.
- **Concrete file-level changes:**
  - Create `docs/contracts/review-state-contract.md`.
  - Create `docs/contracts/lifecycle-state-map.md`.
  - Create `docs/contracts/schema-versioning-policy.md`.
  - Update `docs/trust-questionnaire.md` to record the authoritative field inventory used for persisted state and to resolve or explicitly annotate the current field-count drift.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering `static/js/state/store.js`, `static/js/config/questionnaire-schema.js`, `static/js/config/sections.js`, and `static/js/state/derive/workflow.js`.
  2. Review the design against `docs/00-master-implementation-roadmap.md`, `docs/plan-backend-architecture.md`, `docs/execution/01-current-state-inventory.md`, and `docs/execution/03-dependency-wave-assessment.md`.
  3. Correct the design if it introduces field-per-column persistence, collapses workflow and lifecycle state, or leaves schema versioning implicit.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Run a document consistency review across the field ids and lifecycle labels referenced in the created contract files and the current questionnaire schema files.
  - Confirm that the contract can round-trip the current `EvaluationState` shape without inventing new required fields.
- **Risk notes:**
  - The current schema-count drift will contaminate persistence, export, and import work if it is not resolved here.
  - Late lifecycle vocabulary changes would invalidate Wave 3 authorization work.
- **Acceptance criteria:**
  - One authoritative review-state contract exists.
  - `workflow_mode` and `lifecycle_state` are explicitly separate.
  - `state_schema_version` and `framework_version` are mandatory persisted fields.
  - The chosen field inventory is explicit and no longer ambiguous across docs.

### T002 — Freeze evidence asset/link contract and import/export compatibility

- **Objective:** Define the persisted evidence model and compatibility bridge before evidence storage or extension-related design proceeds.
- **Dependencies:** T001.
- **Concrete file-level changes:**
  - Create `docs/contracts/evidence-model-contract.md`.
  - Create `docs/contracts/evidence-manifest-compatibility.md`.
  - Create `docs/contracts/import-export-package-contract.md`.
  - Update `docs/trust-questionnaire.md` so evidence terminology no longer refers to obsolete separate `Evidence links` behavior as the primary runtime model.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering `static/js/state/evidence-actions.js`, `static/js/render/evidence.js`, and `static/js/adapters/evidence-storage.js`.
  2. Review the design against `docs/plan-backend-architecture.md`, `docs/plan-extension-tooling.md`, `docs/simplified-tooling-extension-plan.md`, and `docs/execution/02-roadmap-scope-extraction.md`.
  3. Correct the design if it removes `assetId` semantics, merges asset metadata and link metadata, or breaks manifest continuity.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Compare the proposed contract against the current in-memory evidence shape and the current manifest export shape.
  - Verify that review-level evidence, criterion-level evidence, and future review-inbox targets are all represented.
- **Risk notes:**
  - If this contract drifts after backend work starts, Wave 3 evidence integration and Wave 6 capture work will both re-open.
  - Import/export will fail if evidence package shape is defined only after APIs exist.
- **Acceptance criteria:**
  - Evidence assets and evidence links are separate entities.
  - Current `assetId` reuse semantics are preserved as the migration bridge.
  - Manifest/export compatibility is defined.
  - A review-scoped inbox target is reserved for later capture work.

### T003 — Freeze execution topology, app-shell/review-shell route model, save/autosave policy, and policy constraints register

- **Objective:** Record the selected runtime topology, explicit shell model, save policy, and policy-sensitive implementation constraints before coding begins.
- **Dependencies:** T001, T002.
- **Concrete file-level changes:**
  - Create `docs/contracts/execution-topology.md`.
  - Create `docs/contracts/app-shell-route-model.md`.
  - Create `docs/contracts/save-autosave-concurrency-policy.md`.
  - Create `docs/contracts/policy-constraints-register.md`.
  - Create `docs/execution/deferred-scope-register.md`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering `package.json`, the planned `server/**` runtime, app-shell/review-shell route ownership, the dashboard entry path, and the workspace bootstrap path.
  2. Review the design against `docs/00-master-implementation-roadmap.md`, `docs/plan-frontend-ux.md`, `docs/simplified-core-product-plan.md`, `docs/simplified-backend-essentials.md`, and `docs/execution/03-dependency-wave-assessment.md`.
  3. Correct the design if it makes React/Vite mandatory, assumes live co-editing, drifts into multiple standalone product documents, or leaves save/conflict or policy-sensitive workflow behavior undefined.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Validate that the selected topology can be served same-origin and still preserve existing static test coverage paths.
  - Confirm that the route model preserves one routed application document with a nested review shell.
  - Confirm that deferred items are logged rather than silently omitted.
- **Risk notes:**
  - Frontend-stack churn is the largest avoidable schedule risk.
  - Save/autosave behavior will become inconsistent if dashboard, store, and backend assumptions are not fixed here.
  - Policy-sensitive workflow work will branch unpredictably if the constraints register is absent.
- **Acceptance criteria:**
  - The selected runtime is explicitly recorded as a Fastify BFF plus one routed compatibility-first frontend shell.
  - App-shell and review-shell route ownership is explicit.
  - Save, autosave, revision, and conflict policies are written.
  - A policy constraints register freezes or explicitly defers implementation-sensitive decisions for guest reviewer scope, second-reviewer rights, comment granularity, publication/retention boundaries, import/export timing interpretation, and extension capture boundaries.
  - Deferred technical options are explicit and reviewable.

## Wave 1 — backend substrate and durable review identity

### T004 — Add backend workspace scaffold, shared runtime, and local development path

- **Objective:** Introduce a same-origin backend runtime without yet implementing product-specific auth or review logic.
- **Dependencies:** T003.
- **Concrete file-level changes:**
  - Create `server/app.js`.
  - Create `server/config/env.js`.
  - Create `server/db/client.js`.
  - Create `server/plugins/static.js`.
  - Create `server/routes/health.js`.
  - Create `server/routes/index.js`.
  - Update `package.json` to add backend start/dev scripts while preserving the current HTML validation and test scripts.
  - Create `tests/unit/server/app.test.js`.
  - Create `.env.example` and, during implementation, create `.env` with placeholders for required runtime variables.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering the backend folder layout, runtime bootstrap, config loading, and how the backend will serve current static assets.
  2. Review the design against `CLAUDE.md`, `docs/plan-backend-architecture.md`, and `docs/contracts/execution-topology.md`.
  3. Correct the design if it introduces a second package root, breaks existing static serving assumptions, or bypasses same-origin deployment.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add backend inject smoke tests under `tests/unit/server/`.
  - Preserve `npm run validate:html`, `npm run test:unit`, and `npm run test:e2e`.
- **Risk notes:**
  - The backend scaffold must not destabilize the static questionnaire baseline.
  - Environment-variable handling must be explicit from the first backend task.
- **Acceptance criteria:**
  - The repository can start a same-origin backend runtime.
  - Static assets are still served correctly.
  - A health endpoint exists and is covered by unit tests.
  - Existing repo-level validation commands still run.

### T005 — Implement auth/session, current-user profile, and user preferences substrate

- **Objective:** Add real user identity, secure sessions, and a minimal preference model.
- **Dependencies:** T004.
- **Concrete file-level changes:**
  - Create `server/auth/oidc.js`.
  - Create `server/auth/session.js`.
  - Create `server/routes/auth.js`.
  - Create `server/routes/me.js`.
  - Create `server/repositories/users.js`.
  - Create `server/repositories/user-preferences.js`.
  - Create `server/db/migrations/001_auth_users.sql`.
  - Create `static/js/api/session.js`.
  - Create `tests/unit/server/auth.test.js`.
  - Create `tests/e2e/auth.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering cookie sessions, CSRF boundaries, the `/api/me` response shape, and preference storage.
  2. Review the design against `docs/plan-backend-architecture.md`, `docs/simplified-backend-essentials.md`, and `docs/contracts/execution-topology.md`.
  3. Correct the design if it stores long-lived tokens in browser code, omits user defaults needed by the questionnaire, or makes public self-registration part of scope.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add unit tests for login/logout/session bootstrap and preference reads/writes.
  - Add e2e coverage for authenticated entry and logout return behavior.
- **Risk notes:**
  - OIDC integration can produce late environment and callback surprises.
  - Session behavior must be same-origin and server-authoritative from the start.
- **Acceptance criteria:**
  - Login/logout works through the backend.
  - `/api/me` returns current user identity and preferences.
  - User preference defaults can be updated and reloaded.
  - No browser-side long-lived auth token becomes part of the architecture.

### T006 — Implement review and revision persistence APIs with assignment-ready substrate reservation

- **Objective:** Make reviews durable server-side records with stable identity and immutable revisions, while reserving only the assignment-ready substrate needed by later workflow work.
- **Dependencies:** T005.
- **Concrete file-level changes:**
  - Create `server/db/migrations/002_reviews.sql`.
  - Create `server/routes/evaluations.js`.
  - Create `server/routes/revisions.js`.
  - Create `server/repositories/evaluations.js`.
  - Create `server/repositories/revisions.js`.
  - Create `server/services/evaluation-state.js`.
  - Create `server/services/etag.js`.
  - Create `static/js/api/reviews.js`.
  - Create `tests/unit/server/evaluations.test.js`.
  - Create `tests/unit/server/revisions.test.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering review ids, public ids, revision numbering, assignment-ready schema reservation, and ETag/version behavior.
  2. Review the design against `docs/contracts/review-state-contract.md`, `docs/contracts/save-autosave-concurrency-policy.md`, `docs/contracts/policy-constraints-register.md`, `docs/plan-backend-architecture.md`, and `docs/execution/03-dependency-wave-assessment.md`.
  3. Correct the design if it normalizes questionnaire fields into relational columns, stores only mutable latest-state without revisions, or exposes assignment workflow behavior before Wave 3.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add unit and integration tests for create/list/get/update review flows and revision creation.
  - Verify that full-state replace can round-trip the current questionnaire state.
- **Risk notes:**
  - Revision policy errors will cascade into handoff, decision, import/export, and audit later.
  - Assignment-ready substrate must support later role enforcement without reopening the schema.
- **Acceptance criteria:**
  - Reviews have stable ids and public ids.
  - Current state and immutable revisions are both persisted.
  - Assignment-ready substrate is reserved in the schema and contract without exposing public assignment behavior.
  - ETag or equivalent version metadata exists for later conflict handling.

## Wave 2 — saved-review application around the current questionnaire

### T007 — Build the authenticated app shell, dashboard, and review-shell entry

- **Objective:** Add the routed application shell, dashboard, and review-shell entry without changing the questionnaire workspace.
- **Dependencies:** T006.
- **Concrete file-level changes:**
  - Update `trust-framework.html`.
  - Update `static/js/app.js`.
  - Create `static/js/shell/app-shell.js`.
  - Create `static/js/shell/routes.js`.
  - Create `static/js/render/app-shell.js`.
  - Create `static/js/render/review-shell.js`.
  - Create `static/js/pages/dashboard.js`.
  - Create `static/js/render/dashboard.js`.
  - Create `static/js/render/review-list.js`.
  - Create `static/css/dashboard.css`.
  - Update `static/css/tokens.css` only if shared shell tokens are needed.
  - Update `tests/e2e/helpers.js`.
  - Create `tests/e2e/dashboard.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering dashboard layout, review list filters, empty states, app-shell mounts, review-shell route ownership, and how open/create/continue actions resolve to saved review ids.
  2. Review the design against `docs/00-master-implementation-roadmap.md`, `docs/contracts/app-shell-route-model.md`, `docs/simplified-core-product-plan.md`, `docs/plan-frontend-ux.md`, and `.github/copilot-instructions.md`.
  3. Correct the design if it adopts consumer-dashboard styling, hides explicit status information, assumes the dashboard replaces the questionnaire core, or introduces additional standalone product entrypoints.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add e2e coverage for dashboard load, search/filter, create review, open review, and continue review actions.
  - Preserve existing questionnaire e2e coverage untouched at this stage.
- **Risk notes:**
  - The dashboard must feel like the same instrument, not a disconnected admin shell.
  - Review list metadata must not flatten workflow progress or escalation semantics.
- **Acceptance criteria:**
  - Authenticated users land on a dashboard.
  - Reviews can be listed, filtered, created, opened, and continued.
  - One routed app shell and one review-shell entry exist.
  - The UI remains dense and explicit.
  - No questionnaire behavior regresses.

### T008 — Integrate persisted review load/save/autosave into the current questionnaire

- **Objective:** Make `trust-framework.html` a saved, resumable workspace using the new backend without replacing its existing core logic.
- **Dependencies:** T007.
- **Concrete file-level changes:**
  - Update `trust-framework.html`.
  - Update `static/js/app.js`.
  - Update `static/js/shell/routes.js`.
  - Update `static/js/render/review-shell.js`.
  - Update `static/js/state/store.js`.
  - Create `static/js/api/review-state.js`.
  - Create `static/js/utils/save-queue.js`.
  - Update `static/js/behavior/context-tracking.js`.
  - Create `tests/unit/state/store-persistence.test.js`.
  - Create `tests/e2e/review-persistence.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering review-id bootstrap, review-shell route handoff, hydration, dirty tracking, autosave cadence, ETag usage, and server-authoritative resume boundaries.
  2. Review the design against `docs/contracts/review-state-contract.md`, `docs/contracts/app-shell-route-model.md`, `docs/contracts/save-autosave-concurrency-policy.md`, `docs/execution/01-current-state-inventory.md`, and repository memory files `conditional-field-mounting.md`, `navigation-page-id-scope.md`, and `progress-model-activity.md`.
  3. Correct the design if hidden conditional fields become unmounted, if page-id harvesting broadens beyond top-level sections, if progress starts counting mere field existence instead of meaningful activity, or if a second local crash-recovery store is introduced in Wave 2.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add unit tests for store hydration, persistence metadata, and round-trip state handling.
  - Add e2e coverage for open -> edit -> autosave -> reload -> resume.
  - Re-run the full current questionnaire suite after each persistence change.
- **Risk notes:**
  - This task touches `static/js/app.js` and `static/js/state/store.js`, both high-conflict files.
  - Hash/query coordination can break deep linking if route and page state are mixed carelessly.
- **Acceptance criteria:**
  - A review can be opened by id and hydrated from server state.
  - Changes save back to the backend and create revisions according to policy.
  - Review identity is owned by the routed review shell rather than by hash-only workspace state.
  - The server copy remains authoritative; no separate local crash-recovery store is assumed in Wave 2.
  - The current derive layer remains authoritative.
  - Existing questionnaire tests remain green.

### T009 — Add review overview, save-state visibility, and profile/settings surfaces

- **Objective:** Complete the minimum saved-review application experience around the current questionnaire by adding the review overview and app-level settings surfaces.
- **Dependencies:** T008.
- **Concrete file-level changes:**
  - Create `static/js/pages/review-overview.js`.
  - Create `static/js/render/review-overview.js`.
  - Create `static/js/pages/settings.js`.
  - Create `static/js/render/settings-form.js`.
  - Create `static/css/settings.css`.
  - Update `static/js/shell/routes.js`.
  - Update `static/js/render/review-shell.js`.
  - Update `trust-framework.html` to expose review identity and save-state chrome without crowding the workspace.
  - Update `static/js/behavior/navigation.js` for save-state and review metadata presentation where required.
  - Update `static/js/api/session.js` and `static/js/api/reviews.js`.
  - Create `tests/e2e/review-overview.spec.js`.
  - Create `tests/e2e/settings.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering review-overview content, how save status is displayed, how profile defaults feed the questionnaire, and how settings remain separate from the questionnaire state.
  2. Review the design against `docs/00-master-implementation-roadmap.md`, `docs/contracts/app-shell-route-model.md`, `docs/simplified-core-product-plan.md`, and `docs/contracts/execution-topology.md`.
  3. Correct the design if it overloads the questionnaire with application settings UI, omits a distinct review overview, or makes save-state visibility ambiguous.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add e2e coverage for changing a preference and seeing it applied on a later review load.
  - Confirm that dashboard continue/resume flows and workspace save-state indicators remain stable.
- **Risk notes:**
  - General application UI must not obscure the existing dense workspace.
  - Profile defaults must never overwrite explicit review content silently.
- **Acceptance criteria:**
  - A review overview route exists and summarizes review identity, lifecycle/save state, progress, evidence status, and jump points into the workspace.
  - Users can create, open, continue, and resume reviews.
  - Save state is visible and understandable in the workspace.
  - Preferences persist and reload correctly.
  - The questionnaire remains the primary work surface.

## Wave 3 — durable evidence and collaborative workflow

### T010 — Implement durable evidence asset storage and evidence APIs

- **Objective:** Move evidence bytes out of browser memory and into secure server-side storage while preserving current evidence semantics.
- **Dependencies:** T008.
- **Concrete file-level changes:**
  - Create `server/db/migrations/003_evidence.sql`.
  - Create `server/routes/evidence.js`.
  - Create `server/services/evidence-service.js`.
  - Create `server/storage/object-store.js`.
  - Create `server/storage/upload-policy.js`.
  - Create `server/repositories/evidence-assets.js`.
  - Create `server/repositories/evidence-links.js`.
  - Create `tests/unit/server/evidence.test.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering upload initialization, finalize, download authorization, link/unlink behavior, and manifest generation.
  2. Review the design against `docs/contracts/evidence-model-contract.md`, `docs/contracts/evidence-manifest-compatibility.md`, `docs/plan-backend-architecture.md`, and `docs/plan-extension-tooling.md`.
  3. Correct the design if it stores inline data URLs as the durable model, collapses asset/link separation, or omits authorized download controls.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add unit/integration tests for upload session creation, asset finalize, link creation, unlink, and authorized download.
  - Verify evidence manifest generation against the frozen contract.
- **Risk notes:**
  - Evidence APIs are a future dependency for Wave 5 and Wave 6; churn here is expensive.
  - Private storage and download authorization must be correct before any pilot data is used.
- **Acceptance criteria:**
  - Evidence assets are durably stored outside the questionnaire state.
  - Evidence links preserve scope and note metadata.
  - Manifest export is backed by persisted server data.
  - Authorized download works and is audited.

### T011 — Wire the current evidence UI to backend uploads, downloads, and reuse

- **Objective:** Preserve the current evidence UX direction while changing only the persistence boundary.
- **Dependencies:** T010.
- **Concrete file-level changes:**
  - Update `static/js/render/evidence.js`.
  - Update `static/js/state/evidence-actions.js`.
  - Update `static/js/adapters/evidence-storage.js`.
  - Create `static/js/api/evidence.js`.
  - Update `static/js/behavior/field-handlers.js` where evidence entry flows intersect form behavior.
  - Update `tests/e2e/evidence.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering upload queue states, optimistic UI, backend asset ids, future inbox-target reservation, and reuse flows.
  2. Review the design against `docs/contracts/evidence-model-contract.md`, `docs/simplified-tooling-extension-plan.md`, `docs/plan-a11y-content.md`, and repository memory file `wave4-integration-edge-cases.md`.
  3. Correct the design if evidence lightbox handling loses `document.body` scope assumptions, if upload state is stored as permanent review data, or if the inbox becomes a second evidence system.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Extend e2e coverage for upload, reuse, unlink, note edit, and preview.
  - Add unit tests for evidence adapter shape changes where needed.
- **Risk notes:**
  - Evidence interactions already have complex event scope and preview behavior.
  - UI regressions here are visible immediately and will undermine trust in the saved-review product.
- **Acceptance criteria:**
  - The current evidence UI works against backend-backed assets.
  - One asset can still support multiple criterion links.
  - Review-inbox target support remains reserved at the contract level only.
  - No user-facing review-inbox surface is introduced before the later tooling/extension wave.
  - Existing evidence test coverage is updated rather than discarded.

### T012 — Implement assignments, transitions, permissions, and governance-section enforcement

- **Objective:** Turn the existing workflow sections into a backend-enforced collaborative review model.
- **Dependencies:** T006, T008.
- **Concrete file-level changes:**
  - Create `server/db/migrations/004_workflow.sql`.
  - Create `server/routes/assignments.js`.
  - Create `server/routes/workflow.js`.
  - Create `server/services/authorization.js`.
  - Create `server/services/lifecycle.js`.
  - Create `server/repositories/assignments.js`.
  - Create `server/repositories/workflow-transitions.js`.
  - Update `static/js/config/sections.js`.
  - Update `static/js/config/rules.js`.
  - Update `static/js/state/derive/workflow.js`.
  - Create `static/js/api/workflow.js`.
  - Update `static/js/behavior/navigation.js` and `static/js/behavior/field-handlers.js` as needed to honor server-authoritative read-only state.
  - Create `tests/unit/server/workflow.test.js`.
  - Create `tests/e2e/workflow.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering lifecycle transitions, permission checks, assignment roles, and how server lifecycle state maps back to existing questionnaire workflow modes.
  2. Review the design against `docs/contracts/lifecycle-state-map.md`, `docs/contracts/policy-constraints-register.md`, `docs/plan-backend-architecture.md`, `docs/trust-questionnaire.md`, and repository memory file `progress-model-activity.md`.
  3. Correct the design if it makes lifecycle state a front-end-only concept, allows silent overwrite of primary-review content, or breaks escalation semantics on future governance pages.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add backend tests for permission matrices and transition guards.
  - Add e2e coverage for handoff, second review, final decision, and reopen flows.
- **Risk notes:**
  - This task is highly coupled to the governance sections already present in the questionnaire.
  - Progress and blocked-state semantics can regress if escalations are flattened.
- **Acceptance criteria:**
  - Assignments exist and are enforceable.
  - Handoff, second review, decision, and reopen are server-authoritative transitions.
  - Section editability respects both workflow mode and lifecycle state.
  - The existing governance sections remain the canonical input surfaces.

### T013 — Add comments, activity, audit trail, export, and import

- **Objective:** Complete the collaborative traceability layer and continuity tooling required by the roadmap.
- **Dependencies:** T010, T012.
- **Concrete file-level changes:**
  - Create `server/db/migrations/005_collaboration_exports.sql`.
  - Create `server/routes/comments.js`.
  - Create `server/routes/exports.js`.
  - Create `server/routes/imports.js`.
  - Create `server/services/audit-log.js`.
  - Create `server/services/exporter.js`.
  - Create `server/services/importer.js`.
  - Create `server/repositories/comments.js`.
  - Create `server/repositories/audit-events.js`.
  - Create `server/repositories/export-jobs.js`.
  - Create `server/repositories/import-records.js`.
  - Create `static/js/pages/review-activity.js`.
  - Create `static/js/render/activity-log.js`.
  - Create `static/js/pages/import-export.js`.
  - Create `static/js/render/import-export.js`.
  - Update `static/js/shell/routes.js`.
  - Update `static/js/render/review-shell.js`.
  - Create `tests/e2e/activity.spec.js`.
  - Create `tests/e2e/import-export.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering comment scopes, audit event minimum set, export package contents, and legacy import boundaries.
  2. Review the design against `docs/contracts/import-export-package-contract.md`, `docs/contracts/policy-constraints-register.md`, `docs/simplified-backend-essentials.md`, `docs/00-master-implementation-roadmap.md`, and `docs/plan-extension-tooling.md`.
  3. Correct the design if audit trails are left implicit, export omits revisions/evidence metadata, or import assumes undocumented legacy shapes.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add tests for review-, section-, and criterion-level comments.
  - Add export/import round-trip tests for review state and manifest-linked evidence.
  - Verify audit events for upload, save, handoff, decision, export, and import.
- **Risk notes:**
  - Export/import timing is one of the documented cross-plan tensions; this task must resolve it explicitly rather than postpone it again.
  - Audit incompleteness will break trust, reporting, and extension provenance later.
- **Acceptance criteria:**
  - Comments and activity history are available and persisted.
  - Export packages include current state, revision context, and evidence linkage.
  - Legacy import path exists for existing browser-only work.
  - Key operational events are auditable.

## Wave 4 — shell/work-surface stabilization, shared content architecture, and UX hardening

### T014 — Implement shortcut registry, surface manager, review-shell stabilization, and rerender decoupling

- **Objective:** Stabilize shell-owned surfaces, keyboard/focus behavior, and rerender paths before content migration begins.
- **Dependencies:** T008 stable.
- **Concrete file-level changes:**
  - Create `static/js/config/shortcut-registry.js`.
  - Create `static/js/utils/surface-manager.js`.
  - Update `static/js/shell/routes.js`.
  - Update `static/js/render/review-shell.js`.
  - Update `static/js/behavior/keyboard.js`.
  - Update `static/js/behavior/navigation.js`.
  - Update `static/js/render/sidebar.js`.
  - Update `static/js/utils/focus-trap.js`.
  - Update `static/js/utils/confirm-dialog.js`.
  - Update `static/js/render/evidence.js`.
  - Update `static/js/render/dom-factories.js`.
  - Create `tests/unit/utils/surface-manager.test.js`.
  - Create `tests/e2e/keyboard.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering shortcut scopes, route-owned surface priority rules, live-region strategy, review-shell stabilization boundaries, and sidebar rerender decoupling.
  2. Review the design against `docs/plan-a11y-content.md`, `docs/simplified-ux-content-plan.md`, `docs/contracts/app-shell-route-model.md`, and repository memory files `context-drawer-focus-return.md`, `navigation-page-id-scope.md`, and `playwright-nav-rerender.md`.
  3. Correct the design if it broadens page harvesting, loses delayed focus return, or keeps scroll metrics tied to full sidebar rebuilds.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add unit tests for the surface manager and shortcut registry.
  - Add e2e coverage for drawer close, keyboard navigation clusters, and evidence preview focus return.
  - Re-run the full Playwright suite to catch rerender-related flake.
- **Risk notes:**
  - Focus behavior is timing-sensitive and already known to flake if restored too early.
  - Sidebar rerender fixes can accidentally desynchronize context, pager, and progress UI.
- **Acceptance criteria:**
  - Global and local shortcuts are registry-driven.
  - Focus and `Escape` handling are consistent across drawer, dialog, lightbox, and dropdown surfaces.
  - Scroll no longer triggers full sidebar rerenders.
  - Review-shell subview ownership is stabilized before content migration begins.

### T015 — Extract structured content registry and move shared Help/Reference/About out of the questionnaire HTML

- **Objective:** Stop treating `trust-framework.html` as the primary content store for shared guidance and reference material after shell/rerender/focus stabilization is in place.
- **Dependencies:** T014.
- **Concrete file-level changes:**
  - Create `static/js/content/guidance-topics.js`.
  - Create `static/js/content/reference-topics.js`.
  - Create `static/js/content/about-topics.js`.
  - Update `static/js/shell/routes.js`.
  - Update `static/js/render/app-shell.js`.
  - Update `static/js/render/review-shell.js`.
  - Update `static/js/render/sidebar.js`.
  - Update `static/js/render/reference-drawers.js`.
  - Update `static/js/render/about-panel.js`.
  - Update `static/js/render/help-panel.js`.
  - Update `static/js/config/sections.js`.
  - Update `trust-framework.html` so hardcoded long-form content is no longer the primary source of shared guidance.
  - Create `static/js/pages/help.js`.
  - Create `tests/e2e/help-content.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering topic ids, source references, page-local guidance versus shared guidance, and app-shell help-route reuse.
  2. Review the design against `docs/plan-a11y-content.md`, `docs/simplified-ux-content-plan.md`, `docs/contracts/app-shell-route-model.md`, `docs/plan-frontend-ux.md`, and `.github/copilot-instructions.md`.
  3. Correct the design if it duplicates content again, leaves stale `sourceRefs`, or moves page-specific guidance too far away from the workspace.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add e2e coverage for topic rendering in both workspace and app-shell help views.
  - Validate that every page/topic id resolves to a content record or an explicit empty state.
- **Risk notes:**
  - Topic-id drift will break navigation and reference lookups.
  - Content migration without governance metadata will recreate the existing documentation debt.
- **Acceptance criteria:**
  - Shared Help/Reference/About content is rendered from structured modules.
  - Page-specific guidance remains available in the workspace.
  - Stale `sourceRefs` are removed or corrected.
  - App-level help surface exists as an app-shell route without duplicating the questionnaire.

### T016 — Apply dense-layout, readability, evidence UX, and accessibility hardening

- **Objective:** Complete the product-required work-surface improvements after the architecture underneath them is stable.
- **Dependencies:** T014, T015.
- **Concrete file-level changes:**
  - Update `static/css/layout.css`.
  - Update `static/css/components.css`.
  - Update `static/css/interaction-states.css`.
  - Update `static/css/animations.css`.
  - Update `static/css/tokens.css`.
  - Update `static/js/render/questionnaire-pages.js`.
  - Update `static/js/render/evidence.js`.
  - Update `static/js/render/dom-factories.js`.
  - Extend `tests/e2e/rendering.spec.js`.
  - Extend `tests/e2e/navigation.spec.js`.
  - Extend `tests/e2e/evidence.spec.js`.
  - Create `tests/e2e/workspace-polish.spec.js` if the existing suites become too broad.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering criterion-card compaction, visible statement restoration, evidence state visibility, reduced-motion behavior, and forced-color handling.
  2. Review the design against `.github/copilot-instructions.md`, `docs/plan-a11y-content.md`, `docs/simplified-ux-content-plan.md`, and repository memory file `progress-model-activity.md`.
  3. Correct the design if density becomes hidden-state UI, if essential labels disappear, or if progress/status cues rely on color alone.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Extend e2e coverage for visual/interaction regressions that are already represented by the current workspace tests.
  - Verify reduced-motion and focus behavior using the existing browser automation path.
- **Risk notes:**
  - This wave is prone to “clean up” changes that quietly hide meaning.
  - Layout polish must not re-open store, routing, or evidence contracts.
- **Acceptance criteria:**
  - The workspace is denser without removing essential visible context.
  - Evidence states and note editing remain direct and understandable.
  - Reduced-motion and forced-color behavior are improved.
  - Existing workspace test coverage remains intact or is replaced with equivalent coverage.

## Wave 5 — tooling workspace and reusable test sets

### T017 — Implement the tooling domain and versioned test-set workspace

- **Objective:** Add reusable test sets as a distinct product area built on the saved review and evidence platform.
- **Dependencies:** T013.
- **Concrete file-level changes:**
  - Create `static/js/pages/tooling.js`.
  - Create `static/js/render/test-set-list.js`.
  - Create `static/js/render/test-set-editor.js`.
  - Update `static/js/shell/routes.js`.
  - Update `static/js/render/app-shell.js`.
  - Create `server/db/migrations/006_tooling.sql`.
  - Create `server/routes/test-sets.js`.
  - Create `server/routes/review-test-plans.js`.
  - Create `server/repositories/test-sets.js`.
  - Create `server/repositories/test-set-revisions.js`.
  - Create `server/repositories/review-test-plans.js`.
  - Create `tests/unit/server/test-sets.test.js`.
  - Create `tests/e2e/tooling.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering logical test-set entities, immutable published revisions, workspace separation, and review-plan linking.
  2. Review the design against `docs/contracts/app-shell-route-model.md`, `docs/plan-extension-tooling.md`, `docs/simplified-tooling-extension-plan.md`, and `docs/execution/02-roadmap-scope-extraction.md`.
  3. Correct the design if test sets become extra questionnaire pages, if published revisions remain mutable, or if tooling state is placed inside the questionnaire store.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add tests for create/edit/publish/fork/archive behavior.
  - Add e2e coverage for linking a published test-set revision to a review.
- **Risk notes:**
  - Tooling must remain a separate workspace or it will contaminate the questionnaire core.
  - Revision immutability must be enforced before any review uses a published set.
- **Acceptance criteria:**
  - Test sets exist as a separate app-shell workspace.
  - Draft and published revisions are distinct.
  - Reviews can link pinned test-set revisions.
  - Tooling does not alter the 13-page questionnaire flow.

### T018 — Implement review-linked test runs and reporting traceability

- **Objective:** Connect reusable test cases to concrete review execution, evidence, and export/report outputs.
- **Dependencies:** T017, T013.
- **Concrete file-level changes:**
  - Create `server/routes/test-runs.js`.
  - Create `server/repositories/test-runs.js`.
  - Update `server/services/exporter.js`.
  - Create `static/js/render/test-plan-panel.js`.
  - Update `static/js/render/questionnaire-pages.js` where review-linked test context must appear.
  - Update `static/js/render/evidence.js` to expose test-run linkage metadata where appropriate.
  - Create `static/js/api/test-runs.js`.
  - Create `tests/e2e/tooling-review-integration.spec.js`.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering run statuses, result notes, evidence linkage, export/report fields, and placement inside the review workflow.
  2. Review the design against `docs/plan-extension-tooling.md`, `docs/simplified-tooling-extension-plan.md`, and `docs/contracts/import-export-package-contract.md`.
  3. Correct the design if run state is duplicated inside questionnaire fields, if evidence linkage creates a second attachment model, or if reports omit pinned revision identity.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add end-to-end coverage for linked test plans, run status updates, evidence attachment, and export provenance.
  - Verify that reports name the test-set revision used by the review.
- **Risk notes:**
  - Reporting traceability is only valuable if revision and evidence provenance remain exact.
  - Tooling must reuse the core evidence model rather than layering an alternative one.
- **Acceptance criteria:**
  - Review-linked test runs exist.
  - Evidence can be associated with runs and the core review.
  - Export/report outputs preserve test-set revision and run provenance.
  - The core review/evidence model remains singular.

## Wave 6 — browser extension pilot

### T019 — Implement paired extension sessions and capture APIs

- **Objective:** Add the server-side pairing and capture surface required for a thin browser capture client.
- **Dependencies:** T018.
- **Concrete file-level changes:**
  - Create `server/db/migrations/007_extension.sql`.
  - Create `server/routes/extension.js`.
  - Create `server/routes/captures.js`.
  - Create `server/services/extension-session.js`.
  - Create `server/services/capture-service.js`.
  - Update `static/js/pages/settings.js` and `static/js/render/settings-form.js` to expose pair/revoke controls.
  - Update `static/js/shell/routes.js`.
  - Create `tests/unit/server/extension.test.js`.
  - Create `tests/e2e/extension-pairing.spec.js` for the web-application side of the flow.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering pairing artifact issuance, short-lived access, refresh/revoke behavior, target validation, and initialize/upload/finalize endpoints.
  2. Review the design against `docs/contracts/policy-constraints-register.md`, `docs/plan-extension-tooling.md`, `docs/simplified-tooling-extension-plan.md`, `docs/contracts/evidence-model-contract.md`, and `docs/contracts/save-autosave-concurrency-policy.md`.
  3. Correct the design if it introduces long-lived API keys, cookie scraping, hidden capture privileges, or review creation from the extension.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add server tests for pair/exchange/refresh/revoke and capture-init target validation.
  - Add e2e coverage for web-app pairing and revocation UX.
- **Risk notes:**
  - Session scope must stay narrow enough for institutional review and support.
  - Target validation errors will otherwise be pushed into the extension UI instead of the server boundary.
- **Acceptance criteria:**
  - Extension sessions are paired, short-lived, and revocable.
  - Capture initialization validates review and target permissions.
  - No long-lived static credential becomes part of the design.
  - Pairing can be managed from the main application.

### T020 — Deliver the Chromium extension pilot and review-inbox targeting

- **Objective:** Add explicit, user-confirmed browser capture into the existing review/evidence system.
- **Dependencies:** T019.
- **Concrete file-level changes:**
  - Create `extension/manifest.json`.
  - Create `extension/background.js`.
  - Create `extension/content-script.js`.
  - Create `extension/popup.html`.
  - Create `extension/popup.js`.
  - Create `extension/styles.css`.
  - Create `extension/README.md`.
  - Create `static/js/pages/review-inbox.js`.
  - Create `static/js/render/review-inbox.js`.
  - Update `static/js/shell/routes.js`.
  - Update `static/js/render/review-shell.js` as needed for extension-originated assets.
  - Update `static/js/api/evidence.js` for capture finalize and inbox refresh flows.
  - Create unit tests under `tests/unit/extension/` for message and queue logic.
- **Pre-implementation design-review requirement:**
  1. Produce a first-pass file-level design covering popup target selection, screenshot/url/selection capture, queue states, retry behavior, and inbox versus criterion routing.
  2. Review the design against `docs/simplified-tooling-extension-plan.md`, `docs/plan-extension-tooling.md`, and `docs/contracts/evidence-model-contract.md`.
  3. Correct the design if it adds hidden/background monitoring, unrestricted page scraping, or writes directly into the in-page questionnaire store.
  4. Implement only after the corrected design is accepted.
- **Test obligations:**
  - Add unit tests for extension queue logic and message handling under the repo’s unit-test path.
  - Re-run the normal repo gates plus the new extension unit tests.
  - Require a manual pilot checklist for Chromium packaging, pairing, upload, retry, and revoke behavior.
- **Risk notes:**
  - MV3 background-worker suspension can break naive queue implementations.
  - Extension capture must remain a thin client of backend APIs or the architecture will fork.
- **Acceptance criteria:**
  - A user can capture screenshot, URL/title, selected text, and note into an existing review.
  - The capture can target review-level evidence, a criterion, or the review inbox.
  - Upload retry and revocation behavior are explicit.
  - The extension does not invent a second evidence system.

## Progress tracking table

| Task ID | Wave | Status | Notes |
|---|---|---|---|
| T001 | Wave 0 | COMPLETE | Canonical review-state, lifecycle, and schema-versioning contracts frozen; `docs/trust-questionnaire.md` drift annotated |
| T002 | Wave 0 | COMPLETE | Evidence asset/link contract, legacy manifest compatibility, and canonical import/export package contract frozen; `docs/trust-questionnaire.md` evidence terminology aligned to the T002 runtime model |
| T003 | Wave 0 | COMPLETE | Runtime topology, shell model, save policy, policy constraints, and deferred-scope register frozen |
| T004 | Wave 1 | COMPLETE | Same-origin Fastify scaffold, static compatibility serving, health endpoint, env files, and backend smoke tests validated via `validate:html`, `test:unit`, and `test:e2e` |
| T005 | Wave 1 | COMPLETE | Dev-compatible server-authoritative auth/session substrate, `/api/me` profile/preferences APIs, frontend session client, auth migration, and auth coverage validated via `validate:html`, `test:unit`, focused Playwright auth run, and full `test` |
| T006 | Wave 1 | COMPLETE | Review/revision persistence APIs, immutable revision substrate, versioned state envelope, assignment-ready nullable review columns, and ETag/If-Match conditional saves validated via focused Vitest, `validate:html`, `test:unit`, and full `test` |
| T007 | Wave 2 | COMPLETE | Routed authenticated app shell, dense dashboard/review list, compatibility-preserving review-shell overview/workspace entry, and dashboard e2e coverage validated via `format:check`, `validate:html`, `test:unit`, focused dashboard Playwright, and full `test` |
| T008 | Wave 2 | COMPLETE | Persisted questionnaire load/save/autosave, save-state surfacing, optimistic-concurrency conflict handling, and compatibility-route preservation validated via `format:check`, `validate:html`, `test:unit`, and full `test` |
| T009 | Wave 2 | COMPLETE | Review overview, explicit workspace save-state/identity chrome, and profile/application settings surfaces validated via `format:check`, `validate:html`, `test:unit`, focused Playwright, and full `test` |
| T010 | Wave 3 | COMPLETE | Durable evidence asset storage, upload init/finalize APIs, persisted asset/link manifest projection, and authorized download auditing validated via `validate:html`, `test:unit`, focused Playwright evidence coverage, `test:e2e`, and full `test` |
| T011 | Wave 3 | COMPLETE | Backend-backed evidence UI wired to durable upload/download/reuse APIs, with saved-review Playwright coverage for upload, manifest export, note edit, unlink, and remove-everywhere flows validated via `validate:html`, `test:unit`, `test:e2e`, and full `test` |
| T012 | Wave 3 | COMPLETE | Workflow assignments/transitions, server-authoritative permissions, governance-section enforcement, and frontend authority surfacing validated via `npm run test` |
| T013 | Wave 3 | COMPLETE | Review-scoped comments/activity, structured audit events, canonical JSON/ZIP export, legacy evidence-manifest import, canonical review-package import, and review-shell activity/import-export surfaces validated via `validate:html`, `test:unit`, `test:e2e`, and full `test` |
| T014 | Wave 4 | COMPLETE | Shortcut registry, shared surface/focus management, review-shell stabilization, and rerender decoupling validated via `npm run format:check`, `npm run validate:html`, `npm run test:unit`, `npm run test:e2e`, and `npm run test` |
| T015 | Wave 4 | COMPLETE | Structured guidance/reference/about registries, app-shell `/help` route, workspace-local guidance retention, and registry-backed help/reference/about rendering validated via `npm run format:check`, `npm run validate:html`, `npm run test:unit`, `npm run test:e2e`, and `npm run test` |
| T016 | Wave 4 | COMPLETE | Dense-layout, evidence explicitness, and accessibility hardening validated via `npm run format:check`, `npm run validate:html`, `npm run test:unit`, `npm run test:e2e`, and `npm run test` |
| T017 | Wave 5 | COMPLETE | Tooling workspace and versioned test sets validated via `npm run format:check`, `npm run validate:html`, `npm run test:unit`, `npm run test:e2e`, and `npm run test` |
| T018 | Wave 5 | COMPLETE | Review-linked test runs, evidence linkage metadata, tooling-aware export provenance, and focused review/workspace coverage validated via `npm run format:check`, `npm run validate:html`, `npm run test:unit`, `npm run test:e2e`, and `npm run test` |
| T019 | Wave 6 | COMPLETE | Paired extension sessions, explicit web-managed pairing/revocation UX, scoped capture initialize/upload/finalize APIs, and shared evidence-system integration validated via `npm run format:check`, `npm run validate:html`, focused `tests/unit/server/extension.test.js`, focused `tests/e2e/extension-pairing.spec.js`, `npm run test:unit`, `npm run test:e2e`, and full `npm run test` |
| T020 | Wave 6 | COMPLETE | Chromium MV3 extension pilot, review-inbox targeting, shared evidence/capture API reuse, and routed inbox triage validated via `npm run format:check`, `npm run validate:html`, `npm run test:unit`, `npm run test:e2e`, and full `npm run test` |

## Quality gate commands

The repository already provides the baseline quality gates that must remain authoritative during implementation. Do not replace them; extend the existing unit and end-to-end coverage under the same command surface.

### Baseline repository commands

- `npm run format:check`
- `npm run validate:html`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run test`

### Required usage by wave

| Wave | Minimum required command usage |
|---|---|
| Wave 0 | No product-code gate. Validate document consistency and task dependencies before implementation begins. |
| Wave 1 | `npm run test:unit` after each backend module increment; `npm run validate:html` and `npm run test` before merging Wave 1 tasks that touch shared repo config or static serving. |
| Wave 2 | `npm run validate:html`, `npm run test:unit`, and focused e2e runs during development; `npm run test` before merge. |
| Wave 3 | `npm run validate:html`, `npm run test:unit`, `npm run test:e2e`, and full `npm run test` before merge. |
| Wave 4 | Same as Wave 3, plus manual keyboard/focus verification for drawer, lightbox, and evidence-note interactions. |
| Wave 5 | Same as Wave 3. Extend unit and e2e coverage under the existing commands rather than adding a second test runner. |
| Wave 6 | Same as Wave 5, plus extension-specific unit tests added under the repo’s `tests/unit/**` path and a manual Chromium pilot checklist. |

### Quality gate rules

1. Every task implementation must keep the current questionnaire test baseline intact unless a test is being replaced with stronger equivalent coverage.
2. New backend code must be covered by `npm run test:unit` rather than by an isolated, undocumented command.
3. New frontend flows must extend Playwright coverage under `tests/e2e/**`.
4. Any task that touches `trust-framework.html`, `static/js/app.js`, `static/js/state/store.js`, `static/js/render/evidence.js`, or `static/js/behavior/navigation.js` must run the full repo gate before merge.
5. No task is complete until its design-review sequence, implementation, and wave-appropriate quality gate are all complete.

## Final sequencing statement

The executable delivery order is:

1. freeze contracts and architecture;
2. stand up the backend and identity model;
3. turn the current questionnaire into a real saved-review application;
4. move evidence and workflow authority to the backend;
5. harden the work surface and content architecture;
6. add tooling and reusable test sets;
7. add the extension only after the application already supports saved reviews, durable evidence, valid targeting, and auditability.

This plan preserves the current questionnaire as the permanent core work surface, follows the simplest architecture consistent with the roadmap, and makes every deferred requirement explicit rather than silently dropping it.

It also freezes one routed app-shell/review-shell model for the saved-review build-out, defers the user-facing review inbox to the later tooling/extension phase, and prevents user-facing Phase 3 work from starting before the Phase 2 collaborative workflow is complete.
