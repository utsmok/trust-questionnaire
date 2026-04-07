# Roadmap scope extraction

Date: 2026-04-06
Status: research-only synthesis
Scope: extract actionable implementation requirements from the roadmap and planning corpus, with emphasis on product Phase 1 and downstream dependency implications.

## 1. Source set and interpretation rules

### 1.1 Source abbreviations used below

- **MR** — `docs/00-master-implementation-roadmap.md`
- **SR** — `docs/00-simplified-implementation-roadmap.md`
- **BA** — `docs/plan-backend-architecture.md`
- **FUX** — `docs/plan-frontend-ux.md`
- **A11Y** — `docs/plan-a11y-content.md`
- **TE** — `docs/plan-extension-tooling.md`
- **SBE** — `docs/simplified-backend-essentials.md`
- **SCP** — `docs/simplified-core-product-plan.md`
- **STE** — `docs/simplified-tooling-extension-plan.md`
- **SUX** — `docs/simplified-ux-content-plan.md`
- **TQ** — `docs/trust-questionnaire.md`
- **UIM** — `docs/ui-fixes/MASTER_PLAN.md`

### 1.2 Interpretation rules

1. **MR is treated as the product-scope authority.** It defines the committed four-phase roadmap and the primary scope guardrails.
2. **SR confirms MR at lower detail.** Where SR matches MR, it is treated as corroboration rather than an independent scope source.
3. **BA, FUX, A11Y, and TE are technical decomposition documents.** Their internal phase numbers do **not** replace MR product phases. They describe how implementation could be sequenced.
4. **SBE, SCP, STE, and SUX tighten some requirements and expose launch expectations.** Where they exceed or conflict with MR phase timing, the mismatch is flagged rather than silently normalized away.
5. **TQ is the canonical workflow-field specification.** It establishes downstream obligations for evidence completeness, governance fields, recommendation output, and final decision capture.
6. **UIM is a current-state baseline and regression contract, not a product-scope authority.** It is useful only where current UI behavior constrains migration or where regression risk is explicitly documented.

### 1.3 Planning conclusion used for this report

The roadmap can be normalized only by separating **product scope** from **technical sequencing**:

- MR/SR answer **what must exist and when** at product level.
- BA/FUX/A11Y/TE answer **what technical sub-phases are implied** if the product phases are implemented without rework.
- SBE/SCP/STE/SUX expose several places where the current planning set is already pressuring for a broader initial release than MR Phase 1.

## 2. Product-phase normalized feature list

### 2.1 Phase 1 — make the questionnaire a real saved app

- **P1-01 — Authenticated access and session-backed entry**
  Requirement: users sign in and sign out with real user accounts; the system knows who is editing; permissions cannot rely on frontend workflow state alone.
  Downstream implications: this is a prerequisite for assignments, audit trail, extension pairing, and any per-user dashboard queue.
  Sources: MR > “What the app should do”; MR > “Phase 1”; SR > “Phase 1”; SBE > “Login and session handling”; BA > “Authentication model”; SCP > “dashboard after sign-in”.

- **P1-02 — Local user profile details and small user settings**
  Requirement: store basic profile details and a small set of user preferences/defaults; settings continuity is part of the saved-app transition.
  Downstream implications: this is the baseline for prefill, density preferences, sidebar/help defaults, and later extension pairing visibility.
  Sources: MR > “What the app should do”; MR > “Phase 1”; SR > “Product shape”; BA > “User profile model” and “User settings and prefill data”; SBE > “User settings and profile details”.

- **P1-03 — Dashboard and saved-review list**
  Requirement: after sign-in, users land on a dashboard that supports create, open, search, filter, and continue actions over many saved reviews.
  Downstream implications: the product must stop behaving like a single-record static SPA; stable review identity, review listing, and queue metadata become first-class.
  Sources: MR > “What the app should do”; MR > “Phase 1”; SR > “Phase 1”; FUX > “Phase 1 — build the new application shell”; SCP > “Dashboard” and “Review overview”; SBE > “Save/continue”.

- **P1-04 — Persisted review records in a backend/database**
  Requirement: reviews are durable server-side records rather than browser-only state; the current questionnaire state is initially stored as one structured review document, not a field-per-column schema.
  Downstream implications: canonical DTO design, schema versioning, review revision history, stable IDs/public IDs, and import/export packaging all depend on this shape.
  Sources: MR > “Simple architecture choice”; MR > “Phase 1”; BA > “Canonical state strategy” and “Core entities”; SBE > “A database for reviews and workflow”; SR > “saved reviews in the backend and database”.

- **P1-05 — Load/save/resume of the current questionnaire without changing the core work pattern**
  Requirement: the current questionnaire remains the main review workspace and must load from saved review data and save back to the backend without forcing an early rewrite. Users must resume across sessions and machines.
  Downstream implications: current `EvaluationState` shape and frontend derive logic become migration anchors; route/view shell must wrap the questionnaire rather than replace it.
  Sources: MR > “keep the current questionnaire as the permanent core work screen”; MR > “Phase 1”; SR > “Phase 1”; BA > “Current application constraints”; BA > “Compatibility principle”; FUX > “Phase 2 — add the review shell and host the legacy workspace”; SBE > “Save/continue”.

- **P1-06 — Saved history at important moments / revision checkpoints**
  Requirement: the saved app must retain history at important moments, not just overwrite the current draft.
  Downstream implications: handoff, second review, reopen, decision, export provenance, and conflict handling all depend on immutable revisions existing from early persistence phases.
  Sources: MR > “saved history at important moments”; BA > “evaluation_revisions”; BA > “Revision model”; SBE > “Review revisions”; SCP > “save continuously and trust that work is not trapped in one browser tab”.

- **P1-07 — Server-side evidence storage and evidence links**
  Requirement: evidence files move out of browser memory into private file storage; the system preserves review-level evidence, criterion-level evidence, drag/drop/paste/link/reuse patterns, and reusable assets across targets.
  Downstream implications: the backend must model evidence assets separately from scoped associations from the first persistence release; later test-set reporting and extension capture depend on the same model.
  Sources: MR > “What the app should do”; MR > “Simple architecture choice”; MR > “Phase 1”; SR > “Phase 1”; BA > “Architectural implications”; BA > “Recommended evidence model”; SBE > “Private file storage for evidence” and “Evidence file storage”; TE > “Normalize the current evidence model”; STE > “Capture to evidence”.

- **P1-08 — Authenticated application shell around the questionnaire**
  Requirement: the product must no longer drop users directly into one review page; it needs an authenticated entry shell, dashboard, review-level navigation, and settings/profile access around the existing workspace.
  Downstream implications: view identity, active review identity, and saved-review routing must move out of the current hash-only model. The exact framework choice is not yet a product requirement, but the shell outcome is.
  Sources: MR > “one web app”; MR > “Phase 1”; FUX > “Target product model”; FUX > “Recommended route tree”; FUX > “Phase 1 — build the new application shell”; SCP > “The current questionnaire page becomes the main work screen inside a broader review application”.

### 2.2 Phase 2 — complete the shared review workflow

- **P2-01 — Review ownership and assignments**
  Requirement: reviews gain explicit ownership/assignment state rather than implicit browser possession.
  Downstream implications: permissions, dashboard queues, handoff, and stable role-specific edit surfaces depend on this.
  Sources: MR > “Phase 2”; SR > “Phase 2”; BA > “Authorization model”; BA > “evaluation_assignments”; SBE > “Collaboration roles”.

- **P2-02 — Primary handoff to second reviewer**
  Requirement: a formal handoff step exists; the primary reviewer submits for review, adds handoff context, and the record transitions state.
  Downstream implications: requires revision capture, lifecycle transitions, assignment changes, and workflow-specific authorization.
  Sources: MR > “What the app should do”; MR > “Phase 2”; TQ > “Section 10A — Primary Evaluation Handoff”; BA > “Review handover”; SBE > “Handover”.

- **P2-03 — Second-review capture with agreement/disagreement semantics**
  Requirement: a second reviewer records agreement/disagreement, criteria to revisit, recommendation, comments, and added evidence without silently overwriting primary work by default.
  Downstream implications: requires role separation, reopen/override policy, section/criterion comments, and audit trail.
  Sources: MR > “What the app should do”; MR > “Phase 2”; TQ > “Section 10B — Second Review”; BA > “Second reviewer model”; SBE > “Second reviewer”.

- **P2-04 — Final team decision recording**
  Requirement: the system captures final status, rationale, participants, publication state, and review cycle timing as a first-class workflow stage.
  Downstream implications: requires decision-stage authorization, immutable transition history, and reporting/export support.
  Sources: MR > “What the app should do”; MR > “Phase 2”; TQ > “Section 10C — Final Team Decision”; BA > “Final team decision”; SBE > “Team decision”.

- **P2-05 — Comments and activity history**
  Requirement: the app records comments, activity, and who did what when; traceability is part of the collaboration product, not optional metadata.
  Downstream implications: activity surfaces, audit events, export provenance, disagreement handling, and support operations depend on this.
  Sources: MR > “What the app should do”; MR > “Phase 2”; BA > “audit_events” and “Minimum events”; SBE > “Comments and activity”.

- **P2-06 — Server-side permissions by role and review stage**
  Requirement: lifecycle and editable scope are enforced by the backend, not just hidden in the UI.
  Downstream implications: review routes, target validation, second-review restrictions, and extension capture must all call the same authorization boundary.
  Sources: MR > “Phase 2”; BA > “Authorization boundaries”; BA > “Recommended lifecycle states”; SBE > “Review workflow and permissions”.

- **P2-07 — Export for archive, reporting, and sharing**
  Requirement: the app can export durable review packages rather than trapping data in the application.
  Downstream implications: stable canonical state shape, evidence manifest compatibility, audit extraction, and report views all depend on this.
  Sources: MR > “What the app should do”; MR > “Phase 2”; SR > “Phase 2”; BA > “Export and import endpoints”; SBE > “Export for launch”; SCP > “Import / export view”.

- **P2-08 — Import of older browser-only work / legacy evidence manifests**
  Requirement: older browser-only work must remain recoverable and migratable.
  Downstream implications: import format design, manifest compatibility, and evidence-link reconciliation cannot be deferred indefinitely.
  Sources: MR > “What the app should do”; MR > “Phase 2”; SR > “Phase 2”; BA > “Compatibility and migration strategy”; SBE > “Import for launch”; TQ > “Section 2.10 Evidence folder link” and “Section 8 completion checklist”.

### 2.3 Phase 3 — improve the work surface without replacing the questionnaire

- **P3-01 — Move shared Help/Reference/About content out of the crowded single review page**
  Requirement: page-local guidance stays near the work; shared reference/help/about content moves to app-level surfaces.
  Downstream implications: a structured content registry is required; the current DOM-mining content model cannot remain authoritative.
  Sources: MR > “What the app should do”; MR > “Phase 3”; SR > “Phase 3”; FUX > “How to separate help/context/info surfaces”; A11Y > “Target content architecture”; SUX > “Move help, reference, and about to the right level”.

- **P3-02 — Rewrite help text, labels, validation text, tooltips, and evidence instructions**
  Requirement: rewrite content in direct task language and remove stale/duplicated guidance.
  Downstream implications: content ownership, sourceRefs validation, and tooltip scope rules become necessary governance work.
  Sources: MR > “Phase 3”; SR > “Phase 3”; A11Y > “Content and guidance overhaul”; SUX > “Rewrite / remove / keep content guidance”.

- **P3-03 — Complete keyboard-first navigation and focus behavior**
  Requirement: the current keyboard groundwork is preserved and completed into a coherent model covering navigation clusters, dropdowns, drawers, evidence interactions, and help discoverability.
  Downstream implications: centralized shortcut registry, shared surface/focus manager, and regression testing for Linux/browser conflicts become required.
  Sources: MR > “Phase 3”; SR > “Phase 3”; A11Y > “Keyboard-first interaction model”; SUX > “Keyboard support that must work”.

- **P3-04 — Increase density without reducing explicitness**
  Requirement: forms become denser and clearer, but not more hidden; criterion statements, evidence labels, IDs, and status cues remain visible enough for audit work.
  Downstream implications: several recent hiding/compaction moves are explicitly treated as incomplete or incorrect direction by A11Y/SUX.
  Sources: MR > “Phase 3”; A11Y > “Compactness changes have crossed into hidden-state territory”; SUX > “Dense layout without losing clarity”; FUX > “Form and layout overhaul”.

- **P3-05 — Stabilize scrolling/render behavior and polish evidence UX**
  Requirement: sidebar flicker, broad rerender coupling, tooltip misuse, preview/note-edit/retry friction, and other stability issues are treated as product work, not incidental polish.
  Downstream implications: render-path split, focus/surface manager, and evidence UI stabilization precede visual polish.
  Sources: MR > “Phase 3”; A11Y > “Prioritized remediation backlog”; SUX > “Suggested implementation order”; UIM > current UI regression and quality-gate baseline.

### 2.4 Phase 4 — tooling, test sets, and browser-assisted capture

- **P4-01 — Separate tooling workspace for reusable test sets**
  Requirement: reusable test sets live in a distinct `Tooling` product area, not inside the 13-page review flow.
  Downstream implications: separate routing, data model, versioning, and ownership/sharing are required; review draft store must not be overloaded with tooling CRUD.
  Sources: MR > “Phase 4”; SR > “Phase 4”; TE > “Required standalone workspace”; STE > “Tooling workspace”; SCP > “What should wait until later”.

- **P4-02 — Versioned test sets and linked test runs**
  Requirement: test sets support draft and published revisions; reviews pin published revisions and record run status/outcomes.
  Downstream implications: immutable revision model, review-test-plan linking, and reporting traceability must exist.
  Sources: MR > “Phase 4”; TE > “test_set_revisions”, “review_test_plans”, and “review_test_runs”; STE > “What a useful test-set feature looks like in the app”.

- **P4-03 — Reporting that ties test cases and evidence to the final judgment**
  Requirement: later reporting must show which test cases, runs, and evidence supported review outcomes.
  Downstream implications: provenance fields, evidence-link metadata, and review/export schemas must remain compatible with future reporting from Phase 1 onward.
  Sources: MR > “Phase 4”; TE > “Reporting links back into a review”; STE > “Reports should be able to say which test-set version was used”.

- **P4-04 — Review inbox for unsorted captured evidence**
  Requirement: evidence that is not yet clearly mapped to a criterion lands in a review-scoped inbox.
  Downstream implications: target validation, later extension capture, and evidence library flows depend on a third target state beyond review-level and criterion-level link.
  Sources: MR > “Phase 4”; TE > “Capture inbox”; STE > “review-scoped inbox”.

- **P4-05 — Browser extension as a thin capture client, not a second product system**
  Requirement: the extension captures screenshot/URL/title/selected text/note into an existing review through the same backend/evidence model; it does not create reviews or invent a separate evidence system.
  Downstream implications: review IDs, valid target lookup, evidence APIs, provenance fields, pairing-based auth, and privacy policy must already exist before extension work begins.
  Sources: MR > “Phase 4”; TE > “Recommended direction”; TE > “Criterion targeting and active-review targeting”; STE > “Build next” and “Capture to evidence”.

- **P4-06 — Pairing-based extension auth and constrained capture scope**
  Requirement: no long-lived API keys, no cookie scraping, no hidden/background capture, no autonomous review creation; capture remains explicit and narrowly scoped.
  Downstream implications: backend session/pairing APIs, review target validation, redaction/provenance policy, and revocation support are required.
  Sources: TE > “Authentication and session strategy”; TE > “Security, privacy, and provenance concerns”; STE > “Login and session behavior” and “Privacy limits for the first extension release”.

## 3. Product-phase alignment with technical sub-phases

| Product phase | Minimum backend sub-phases implied | Minimum frontend / UX sub-phases implied | Notes |
|---|---|---|---|
| **Roadmap Phase 1** | BA Phase 0 (DTO/API freeze), BA Phase 1 (auth shell), BA Phase 2 (persistent evaluation records), BA Phase 3 (external evidence storage) | FUX Phase 1 (app shell) and FUX Phase 2 (review shell / legacy workspace host) if the multi-view route shell is adopted; FUX Phase 0 is a recommended migration seam, not a separate product phase | BA internal Phase 1 alone is **not** sufficient to satisfy product Phase 1 because product Phase 1 already includes persistence and server-side evidence. |
| **Roadmap Phase 2** | BA Phase 4 (assignments, handoff, decision workflow) plus BA Phase 5 parts for export/import and concurrency | FUX review subviews for overview, activity, assignments, decision; review-level routing becomes operational rather than optional | MR product Phase 2 spans more than one backend technical phase. Export/import timing is one of the main cross-document tensions. |
| **Roadmap Phase 3** | No new backend domain is mandatory beyond earlier phases, but authorization, activity, and evidence APIs must support richer UI surfaces | A11Y Phase 0-5 and FUX Phase 3/4 are the main technical decomposition for content relocation, surface replacement, keyboard completion, and workspace polish | Content-registry extraction may need to start earlier as a technical enabler even though user-visible relocation is later. |
| **Roadmap Phase 4** | TE Phase 1 (backend/tooling foundation), TE Phase 2 (extension pilot), TE Phase 3 (broader extension scope) | Tooling workspace, review inbox, extension integration, and later browser support | Phase 4 is committed roadmap scope, but it is explicitly sequenced after the core saved-review app and evidence model are stable. |

## 4. Explicit acceptance criteria implied by the docs

### 4.1 Phase 1 acceptance criteria

- **AC-P1-01 — Authentication is real, session-backed, and server-enforced.**
  A user can sign in and sign out through an institutional or organization-backed identity flow; the backend can identify the current user and their preferences; write permissions are not enforced only by hidden/disabled frontend controls.
  Sources: MR; SBE; BA.

- **AC-P1-02 — Dashboard exists as the post-login entry point.**
  After sign-in, the user lands on a dashboard that can create a review, open a saved review, search/filter the review list, and continue prior work.
  Sources: MR; SR; SCP; FUX.

- **AC-P1-03 — Reviews are durable server-side records.**
  A review has a stable identifier and is no longer a browser-only session artifact; the current questionnaire state is stored server-side as one structured document initially.
  Sources: MR; BA; SBE.

- **AC-P1-04 — Save/continue/resume works across sessions and machines.**
  A user can leave and resume the same saved review later, including from a different session or machine, with the server copy treated as authoritative.
  Sources: MR; SR; SBE; SCP.

- **AC-P1-05 — The current questionnaire remains the main work screen.**
  The review still happens in the current questionnaire workspace; the current rules/derive model remain canonical in the early migration; no questionnaire rewrite is required to declare Phase 1 done.
  Sources: MR; BA; FUX.

- **AC-P1-06 — History/revisions exist at meaningful checkpoints.**
  The system preserves saved history at important moments rather than only overwriting the latest state; revision capture is a formal capability of the first persisted model.
  Sources: MR; BA; SBE.

- **AC-P1-07 — Evidence moves to private server-side storage without regressing current semantics.**
  Evidence files are stored outside the browser; review-level and criterion-level links are preserved; one stored asset can support multiple targets; per-link notes remain distinct from asset metadata; drag/drop/paste/link/reuse flows remain part of the user model.
  Sources: MR; SR; BA; SBE; TE; STE.

- **AC-P1-08 — Schema and compatibility protections exist from the first persisted release.**
  The persisted review state is versioned; the framework/schema version is recorded; the backend accepts and emits a payload close to the current `EvaluationState`; later import/export and migration remain possible.
  Sources: BA; SBE; TE.

### 4.2 Phase 2 acceptance criteria

- Ownership, assignee state, and lifecycle transitions are explicit and server-enforced.
- Handoff records the primary reviewer, submission date, key concerns, and uncertainty fields compatible with TQ Section 10A.
- Second review records agreement state, criteria to revisit, second reviewer recommendation, and conflict summary compatible with TQ Section 10B.
- Final decision records date, participants, final status, rationale, publication status, and review-cycle frequency compatible with TQ Section 10C.
- Comments/activity are preserved and exportable enough to support traceability.
  Sources: MR; TQ; BA; SBE; SCP.

### 4.3 Phase 3 acceptance criteria

- Shared Help/Reference/About content is no longer sourced primarily from the single review-page HTML.
- Only page-specific guidance remains on the review workspace; broader help/reference/about content is available at app level.
- Keyboard-only movement covers page navigation, anchor navigation, score selection, evidence operations, drawer/dialog close, and help discoverability.
- Sidebar flicker / broad rerender coupling is removed; focus behavior is stable; tooltip content is shortened and re-scoped; dense layout remains explicit rather than hidden-state.
  Sources: MR; FUX; A11Y; SUX.

### 4.4 Phase 4 acceptance criteria

- Test sets are versioned and immutable once published; reviews pin published revisions rather than floating drafts.
- Review-linked test runs can record status, short outcomes, and linked evidence.
- Reports can state which test-set revision and test cases supported the final judgment.
- Browser extension capture is explicit, review-scoped, provenance-rich, and uses the same backend/evidence model as the web app.
- The extension uses pairing-based, revocable sessions rather than long-lived static credentials.
  Sources: MR; TE; STE.

## 5. Dependency map and downstream implications

### 5.1 Hard feature dependencies

- **Auth/session handling -> dashboard queues, assignments, audit trail, extension pairing**
  Without authenticated users and server sessions, there is no meaningful review ownership, no secure evidence store, and no extension trust boundary.
  Sources: MR; BA; SBE; TE.

- **Stable review identity -> saved-review list, stable review links, evidence targeting, imports/exports, activity history**
  Review IDs/public IDs are required before the app can stop being a single-record browser session.
  Sources: BA; SCP; FUX.

- **Canonical versioned state DTO -> persistence, revisions, import/export, schema migration, reporting**
  The first saved record shape must be close to the current store payload and versioned from day one, otherwise every later phase absorbs migration debt.
  Sources: BA; SBE; TE.

- **Separate `workflow_mode` from `lifecycle_state` -> collaboration workflow, permissions, target validation**
  The current UI workflow mode is necessary but not sufficient as the backend process state machine. This separation is needed early even if Phase 2 user-visible workflow is deferred.
  Sources: BA > “Architectural implications” and “Separate workflow mode from lifecycle state”; FUX > “Review state taxonomy”.

- **Evidence asset/association split -> Phase 1 evidence persistence, Phase 2 workflow traceability, Phase 4 tooling/extension capture**
  A flat attachment model would already regress the current UI and block later reuse, review inbox, and provenance reporting.
  Sources: BA; TE; STE.

- **Revision/history model -> handoff, disagreement handling, reopen, decision, export provenance**
  If revisions do not exist from the first persisted release, later workflow stages lose rollback and traceability.
  Sources: MR; BA; SBE.

- **Review shell and route ownership -> dashboard, overview/evidence/activity/assignments/decision views**
  The current hash-only page navigation cannot scale to the multi-view product model. The shell outcome is therefore a dependency, even if the framework choice remains open.
  Sources: FUX; SCP.

- **Content registry extraction -> Help/Reference/About relocation, tooltip rewrite, app-level reuse**
  Shared content cannot move out of the review page while `trust-framework.html` remains the primary source of truth.
  Sources: FUX; A11Y; SUX.

- **Render-path stabilization and focus architecture -> keyboard completion and dense UI polish**
  A11Y is explicit that visual polish and content rewrite should not proceed on top of unstable rerender and fragmented focus logic.
  Sources: A11Y > “Phased sequencing”.

- **Valid target lookup and authorization API -> review inbox, test runs, browser extension**
  Later capture features require the backend to answer whether a review is editable, which criteria are valid targets, and which actor is allowed to attach evidence.
  Sources: SBE > “What later tooling and extension work depends on”; TE > “Required API surface”; STE > “Lock down criterion targeting rules”.

### 5.2 Non-deferrable Phase 1 design obligations created by later phases

These items are not all user-visible Phase 1 features, but later phases assume they are correct from the first persisted release:

- record `state_schema_version` and `framework_version` on each evaluation and revision;
- keep the canonical state payload close to current store shape;
- preserve `assetId` / association semantics while moving files out of browser state;
- define stable review IDs/public IDs and route-compatible review identity;
- separate `workflow_mode` from backend lifecycle state;
- preserve export/manifest compatibility even if full import/export UI ships later;
- enforce permissions server-side, not by UI editability alone;
- avoid making a questionnaire rewrite a prerequisite for dashboard/persistence delivery.
  Sources: BA; MR; FUX; TE; SBE.

## 6. Immediate scope vs later-phase scope

### 6.1 In-scope immediately (authoritative product Phase 1)

- login/logout with real user accounts;
- local profile details and small user settings;
- dashboard and saved-review list with create/open/search/filter/continue;
- persisted reviews in the backend/database;
- load/save/resume of the current questionnaire across sessions/machines;
- saved history at important moments / revision checkpoints;
- private server-side evidence storage preserving review-level and criterion-level semantics;
- authenticated application shell around the current questionnaire workspace.

Primary sources: MR > “Phase 1”; SR > “Phase 1”.

### 6.2 Immediate hidden obligations that should be treated as Phase 1 design gates

- canonical DTO and API contract freeze;
- schema/version tracking;
- stable review IDs/public IDs;
- backend role/session boundary;
- evidence asset/link split;
- review routing identity outside the current hash-only model;
- compatibility-preserving load/save seam for the current questionnaire;
- revision model sufficient for later handoff/decision/export.

Primary sources: BA; FUX; SBE; TE.

### 6.3 Explicit later-phase scope (per MR/SR)

- review ownership and assignments;
- primary handoff, second review, final team decision;
- comments and activity history as user-facing product surfaces;
- export/import as user-facing product features;
- shared Help/Reference/About relocation;
- keyboard-first completion, content rewrite, form density work, styling fixes, evidence polish;
- reusable test sets, linked test runs, review inbox, and browser extension capture.

Primary sources: MR > “Phase 2”, “Phase 3”, “Phase 4”; SR > same.

## 7. Concrete implementation obligations by domain

### 7.1 Backend

- **Immediate obligations**
  - one backend service behind the app;
  - one database for users, reviews, revisions, assignments, comments/activity, decisions, and later tooling entities;
  - one private file store for evidence;
  - versioned DTO/API contract aligned to the current questionnaire state;
  - server-authoritative persistence and permission boundary.
- **Later obligations**
  - lifecycle transitions, notifications, export jobs, import tools, reporting, publication, retention automation.
- **Source basis**
  - MR > “Simple architecture choice”; BA > “Recommended stack” and “Core entities”; SBE > “The product needs four durable backend pieces”.

### 7.2 Frontend shell

- **Immediate obligations**
  - keep the current questionnaire as the permanent core work screen;
  - add authenticated app entry, dashboard, review list, and settings/profile access;
  - treat the current workspace as the compatibility baseline rather than rewriting it first;
  - ensure review identity can exist outside the current page hash model.
- **Later obligations**
  - review overview/evidence/activity/assignments/decision routes;
  - utility-rail replacement, route-owned context/help/reference surfaces, and eventual renderer migration if chosen.
- **Source basis**
  - MR > guardrails; FUX > “Recommended route tree”, “Phase 1”, “Phase 2”, “Final recommendation”; SCP > “Proposed app structure”.
- **Important qualification**
  - React/Vite/TypeScript is a recommended implementation path in FUX, not yet an authoritative product-scope requirement in MR.

### 7.3 Auth

- **Immediate obligations**
  - real user accounts;
  - institutional or organization-backed sign-in;
  - backend-issued session handling;
  - current-user and preference retrieval;
  - backend-enforced authorization.
- **Later obligations**
  - guest-reviewer decision if external collaborators are allowed;
  - extension pairing sessions with revocation and refresh.
- **Source basis**
  - MR; BA > “Authentication model”; SBE > “Login/logout”; TE > “Extension session APIs”.

### 7.4 Data model

- **Immediate obligations**
  - store questionnaire state as a versioned JSON document close to the current `EvaluationState` shape;
  - store revisions separately from the live review record;
  - separate UI workflow mode from backend lifecycle state;
  - reserve fields for assignments, public ID, timestamps, and evidence relationships;
  - record schema/framework versions from the first persisted record.
- **Later obligations**
  - reporting projections, publication views, retention classes, tooling/test-set entities, and richer collaboration metadata.
- **Source basis**
  - BA > “Canonical state strategy”, “Core entities”, “Recommended evaluations shape”, “Schema versioning requirement”; SBE > “What data needs to be saved”.

### 7.5 Evidence

- **Immediate obligations**
  - move files out of browser memory into private storage;
  - preserve evaluation-level and criterion-level evidence;
  - preserve reusable assets across multiple links/targets;
  - keep per-link note metadata distinct from the physical asset;
  - maintain manifest compatibility as a migration bridge.
- **Later obligations**
  - review inbox, upload queue, richer provenance, test-run linkage, extension capture envelopes, asset cleanup workflows.
- **Source basis**
  - MR; BA > “Recommended evidence model”; SBE > “Evidence file storage”; TE > “Target domain model”; STE > “Capture to evidence”.

### 7.6 Import / export

- **Immediate obligations**
  - at minimum, do not block later import/export by breaking manifest compatibility or canonical package shape;
  - preserve enough metadata for later archive/report packages.
- **Later obligations**
  - export UI/jobs, JSON/CSV/ZIP packages, legacy import tools, evidence-manifest import, archive/report views.
- **Source basis**
  - MR > “Phase 2”; BA > “Export and import endpoints”; SBE > “Export and import support”; SCP > “Import / export view”.
- **Important qualification**
  - timing is unresolved: MR places import/export in Phase 2, while SBE/SCP treat them as launch-essential.

### 7.7 Workflow

- **Immediate obligations**
  - preserve the existing questionnaire sections and governance pages (`S10A`, `S10B`, `S10C`) as the domain model for later collaboration;
  - design lifecycle-state separation now so later handoff/review/decision logic does not require schema reversal.
- **Later obligations**
  - ownership, assignments, handoff submission, second review, final decision, comments, reopen, and stage-specific backend authorization.
- **Source basis**
  - MR > “What to keep from the current app”; MR > “Phase 2”; TQ > Sections 10A/10B/10C; BA > “Collaboration and review workflow model”; SBE > “Good enough first collaboration model”.

### 7.8 Help / reference relocation

- **Immediate obligations**
  - if any app-level help routes are introduced early, treat them as shell scaffolding only unless full content migration is intentionally pulled forward;
  - avoid creating additional hardcoded content silos.
- **Later obligations**
  - structured content registry;
  - migration of guidance/reference/about content out of `trust-framework.html` as primary source;
  - stale link cleanup;
  - tooltip scope reduction and content governance.
- **Source basis**
  - MR > “Phase 3”; FUX > “Content surfaces and hardcoded content model”; A11Y > “Target content architecture”; SUX > “Move help, reference, and about to the right level”.

### 7.9 Keyboard-first work

- **Immediate obligations**
  - preserve existing keyboard/focus behavior while auth/dashboard/persistence are added;
  - do not regress score-dropdown, drawer close, page switching, evidence preview, or inert/focus-return behavior during shell changes.
- **Later obligations**
  - centralized shortcut registry;
  - roving focus for dense navigation clusters;
  - shared surface/focus manager;
  - generated keyboard help;
  - reduced-motion and forced-colors completion;
  - keyboard-only scenario test matrix.
- **Source basis**
  - MR > “What to keep from the current app”; MR > “Phase 3”; A11Y > “Keyboard-first interaction model” and “Phased sequencing”; SUX > “Keyboard support that must work”.

### 7.10 Test sets

- **Immediate obligations**
  - none as a user-facing Phase 1 feature;
  - however, Phase 1 must preserve the data and evidence model needed for later test-set linking, run tracking, and reporting.
- **Later obligations**
  - separate Tooling workspace;
  - draft/published test-set revisions;
  - review-linked pinned revisions;
  - per-case run state and outcomes;
  - report traceability from test case to evidence to final judgment.
- **Source basis**
  - MR > “Phase 4”; TE > “Test-set management feature”; STE > “What a useful test-set feature looks like in the app”.

### 7.11 Browser extension

- **Immediate obligations**
  - none as a user-facing Phase 1 feature;
  - do not make any Phase 1 design choice that assumes extension-local IDs, local-only evidence state, or API-key auth.
- **Later obligations**
  - Chromium-first extension;
  - explicit user-triggered screenshot/URL/title/selection/note capture;
  - target existing review / criterion / inbox only;
  - pairing-based, revocable extension session;
  - provenance-rich upload initialize/finalize flow;
  - privacy envelope and retention/redaction rules.
- **Source basis**
  - MR > “Phase 4”; TE > “Recommended direction”, “Browser extension architecture”, “Authentication and session strategy”; STE > “Build next” and “Privacy limits for the first extension release”.

## 8. Ambiguities and conflicts requiring resolution

| ID | Issue | Impact | Source basis |
|---|---|---|---|
| **AMB-01** | **Definition of “first real version” / launch is inconsistent.** MR Phase 1 is a saved-review app without collaboration workflow. SBE and SCP describe the minimum real product as including handoff, second review, team decision, comments/activity, and export/import. | Delivery brief, staffing, schema scope, permissions, and route planning will differ materially depending on which interpretation is chosen. | MR > “Phase 1”; SBE > “Bottom line”; SCP > “Recommended v1 target”. |
| **AMB-02** | **Import/export timing is inconsistent.** MR places export/import in product Phase 2. SBE says launch needs both export and import. SCP treats import/export as normal core-product screens. | Migration tooling, package format design, admin workflows, and schedule cannot be finalized until this is decided. | MR > “Phase 2”; SBE > “Export and import support”; SCP > “Import / export view”. |
| **AMB-03** | **Collaboration workflow timing is inconsistent.** MR defers assignments/handover/second review/final decision to Phase 2; SBE/SCP treat them as part of the minimum real product. | Determines whether Phase 1 is a single-reviewer saved app or an actually collaborative first release. | MR > “Phase 2”; SBE > “Good enough first collaboration model”; SCP > “Recommended v1 target”. |
| **AMB-04** | **Frontend implementation strategy is not settled.** MR guardrails say not to make React/Vite/full replacement the center of the roadmap. FUX strongly recommends a React + TypeScript + Vite route shell with compatibility island. | The product outcome is stable, but the technical plan, migration cost, and testing model differ substantially. | MR > “Guardrails”; FUX > “Recommended stack path”. |
| **AMB-05** | **Help/FAQ/contact route timing is split from content-relocation timing.** FUX puts help/FAQ/contact routes in its technical Phase 1 shell. MR places Help/Reference/About relocation in product Phase 3. | Without an explicit decision, early shell work may accidentally expand scope or create placeholder surfaces without a content strategy. | FUX > “Phase 1 — build the new application shell”; MR > “Phase 3”. |
| **AMB-06** | **Questionnaire spec and current/planned evidence model diverge.** TQ still contains `Evidence summary`, `Evidence links`, and a shared evidence-folder link. TE/UIM and current UI plans treat evidence as stored assets/links with merged runtime semantics. | Backend contract freeze, import/export, user training, reporting, and documentation all depend on one canonical evidence model. | TQ > Section 2.10 and criterion evidence fields; TE > “Code/document drift exists”; UIM > evidence rename/removal baseline. |
| **AMB-07** | **Guest reviewer / identity boundary is unresolved.** Simplified product docs say internal-only v1 is acceptable; BA keeps guest/external identity as an open decision. | Affects authentication architecture, permissions, reviewer onboarding, and extension/session design. | SCP > “Important scope note”; BA > “Open decisions”. |
| **AMB-08** | **Primary evidence store choice is unresolved.** BA recommends managed object storage; TE notes SharePoint is an institutional reference point but argues object storage is simpler for capture uploads. | Affects upload flow, extension design, retention controls, and operational ownership. | BA > “Recommended stack”; TE > “Primary evidence store”. |
| **AMB-09** | **Second reviewer rights and comment granularity remain policy decisions.** BA leaves open whether second review is comment-only by default and whether comments are criterion/section/field-level. | Affects permissions, UI design, data model, and disagreement workflow. | BA > “Second reviewer rights” and “Comment granularity” open decisions; TQ > Section 10B. |
| **AMB-10** | **Audit/history scope is split across documents.** MR Phase 1 requires “saved history at important moments”. MR Phase 2 adds comments/activity history. SBE expects a basic activity log at launch. | Determines how much audit/event infrastructure must ship in the first delivery brief. | MR > “Phase 1” and “Phase 2”; SBE > “Comments and activity”. |

## 9. Recommended planning interpretation for execution briefing

Until the ambiguities above are explicitly resolved, the least-distorting interpretation is:

1. treat **MR/SR** as the authority for **product-phase scope**;
2. treat **BA/FUX/A11Y/TE** as the authority for **technical sub-phase dependencies**;
3. treat **SBE/SCP/STE/SUX** as evidence of **scope pressure and likely near-term expansion**, not automatic overrides;
4. write the next delivery brief so that **Phase 1 product scope** is explicit, while also locking the **non-deferrable data/auth/evidence decisions** that later phases already depend on.

Under that interpretation, the highest-risk mistake would be to scope product Phase 1 as “auth only” or “dashboard only.” The documents do not support that. Product Phase 1 already implies:

- auth,
- dashboard,
- persisted review records,
- load/save/resume of the current questionnaire,
- revision/history checkpoints,
- and server-side evidence storage preserving current semantics.

The second highest-risk mistake would be to let late-phase requirements distort the initial saved-review architecture. The documents repeatedly reject that path. The questionnaire must remain the permanent core work screen, and later tooling/extension features must build on the same review/evidence model rather than trigger a parallel system.
