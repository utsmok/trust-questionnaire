# Backend architecture plan for the collaborative TRUST questionnaire

Date: 2026-04-06
Status: Planning only
Scope: Backend, persistence, data model, authentication, authorization, collaboration workflow, API surface, migration, security, and deployment topology for converting the current static questionnaire into a multi-user collaborative web application.

## 1. Current application constraints that must shape the backend

The current application is not a generic form. It is a page-based, keyboard-oriented, dense single-page application with a strict internal state model. The backend must conform to that model instead of forcing an early frontend rewrite.

### 1.1 Current technical anchors

- `trust-framework.html` defines a two-panel shell centered on `#questionnairePanel`, `#frameworkPanel`, `#questionnaireRenderRoot`, `#contextSidebarMount`, and `#referenceDrawerMount`.
- `static/js/app.js` bootstraps the application by creating a local store via `createAppStore()`, rendering pages into `#questionnaireRenderRoot`, then wiring navigation and field handlers.
- `static/js/state/store.js` is the current source-of-truth boundary. The persisted payload already has a useful canonical shape:
  - `workflow`
  - `fields`
  - `sections`
  - `criteria`
  - `evidence`
  - `overrides`
- `static/js/state/derive/index.js` and supporting modules compute all workflow page states, criterion states, evidence completeness, judgments, completion, escalation, validation, and recommendation constraints from that canonical payload.
- `static/js/config/rules.js` already contains `WORKFLOW_PAGE_RULES`, `WORKFLOW_ESCALATION_RULES`, recommendation constraints, evidence completeness rules, and governance rules. This is a significant domain asset and should be preserved.
- `static/js/render/questionnaire-pages.js` renders each page section from schema. `createQuestionnairePageElement()` mounts criterion-level evidence blocks inside each criterion card and mounts evaluation-level evidence on section `S2`.
- `static/js/render/evidence.js` implements the current evidence UI. It already distinguishes:
  - evaluation-level evidence vs criterion-level evidence
  - asset identity (`assetId`) vs association identity (`id`)
  - reusable evidence assets across criteria
  - note metadata per evidence association
- `static/js/adapters/evidence-storage.js` currently serializes a manifest only. It is not a persistence layer.
- `static/js/behavior/navigation.js` assumes a page-based shell with workflow-aware editability and explicit focus management. Backend work should integrate at the store and API level, not by destabilizing this shell.

### 1.2 Architectural implications

1. The initial persisted model should mirror the current `EvaluationState` shape closely.
2. The derived-state layer should remain authoritative in the frontend during the first migration phases.
3. The backend must distinguish UI workflow mode from record lifecycle state.
4. Evidence must be modeled as reusable assets plus scoped associations. A flat "files per criterion" model would regress the current design.
5. The app remains heavily schema-driven. The backend must tolerate schema evolution.

## 2. Backend stack alternatives

Three options are realistic for this repository and institutional context.

### 2.1 Option A — Microsoft 365 native workflow (`Forms` + `Power Automate` + `Lists` + `SharePoint`)

This aligns with the September 2025 roadmap and institutional tooling.

**Advantages**

- Existing institutional authentication and governance posture.
- Minimal custom backend engineering.
- SharePoint document storage is already familiar for evidence bundles.
- Strong fit for simple intake and approval workflows.

**Disadvantages**

- Poor fit for the existing custom shell, keyboard behavior, derived-state logic, and page-by-page workflow semantics.
- Weak support for optimistic concurrency, fine-grained audit history, reusable evidence asset associations, and rich collaboration UX.
- Derived logic from `static/js/state/derive/*` would be duplicated awkwardly across Power Automate, Lists formulas, or custom adapters.
- Difficult to preserve the current dense, engineered interaction model.
- High risk of gradual reversion into a fragmented low-code system rather than a coherent application.

**Assessment**

Suitable if the goal is administrative workflow automation. Not suitable if the goal is to preserve the existing SPA and evolve it into a rigorous collaborative application.

### 2.2 Option B — Backend-as-a-service (`Supabase` / hosted Postgres + Auth + Storage + Realtime)

This minimizes custom infrastructure while retaining a custom frontend.

**Advantages**

- Fastest route to persistence, storage, and basic authentication.
- Postgres remains available as the primary data store.
- Good developer velocity for CRUD and file storage.
- Realtime channels and row-level security are useful for presence and notifications.

**Disadvantages**

- Institutional SSO, guest review, and compliance controls may become commercial-plan or procurement constraints.
- Complex workflow authorization and audit-trace requirements would still require substantial custom policy logic.
- The project would become dependent on provider-specific auth and storage semantics.
- Rich evidence governance, export packaging, and long-term archival requirements are likely to outgrow the platform defaults.

**Assessment**

Viable for a prototype. Less appropriate for a controlled institutional review system with traceability, retention, and custom lifecycle requirements.

### 2.3 Option C — Custom backend-for-frontend on Node.js, with PostgreSQL, managed object storage, and institutional OIDC

This option retains the current frontend architecture and adds a purpose-built backend.

**Advantages**

- Best alignment with the existing repository, which is already JavaScript-based and schema-driven.
- Preserves `createAppStore()`, `replaceEvaluation()`, and the derived-state modules as migration anchors.
- Full control over workflow transitions, audit logging, evidence security, export packaging, and authorization boundaries.
- Allows phased adoption without forcing a frontend framework migration.
- Strong fit for same-origin session-based security.

**Disadvantages**

- Highest engineering effort.
- Requires explicit operational ownership for database, storage, backups, and observability.
- More initial design work than BaaS.

**Assessment**

Best fit for this repository and mission.

## 3. Recommended stack

### 3.1 Recommendation

Adopt **Option C**:

- **Frontend**: keep the current vanilla ES module SPA initially.
- **Application server / BFF**: `Fastify` on Node.js 20+.
- **Database**: PostgreSQL.
- **Object storage for evidence**: Azure Blob Storage in production; local object-storage emulation in development.
- **Identity provider**: Microsoft Entra ID (OIDC).
- **Background jobs**: database-backed job runner (`pg-boss` class of approach), not Redis-first.
- **Deployment**: same-origin web app and API, preferably on Azure-managed container hosting.

### 3.2 Why this is the preferred choice

1. **The current repository is JavaScript-first.** A Node backend minimizes language fragmentation.
2. **The current frontend state model is already explicit and usable.** PostgreSQL can store that canonical questionnaire payload directly while the system matures.
3. **The workflow is specialized.** Reviewer assignment, handoff, disagreement, escalation, decision logging, and evidence provenance are central product features, not incidental metadata.
4. **Security requirements favor a BFF.** A same-origin backend issuing secure cookies is materially safer than storing bearer tokens in the browser.
5. **Evidence handling is already more sophisticated than a standard attachment widget.** The current distinction between `assetId` and `id` should become a first-class backend model.

### 3.3 Deployment topology and environments

#### Local development

- Fastify serves the current static frontend and the API from the same origin.
- Local PostgreSQL instance.
- Local object storage emulator.
- Mock OIDC or development Entra application.
- Seed dataset with sample evaluations and evidence metadata.

#### Integration / staging

- Separate Entra application registration.
- Separate Postgres database and object storage container.
- Synthetic or scrubbed evaluation data only.
- Full export/import and migration tests executed here.

#### Production

- Same-origin deployment behind HTTPS.
- Managed PostgreSQL with point-in-time recovery.
- Private object storage with no public containers.
- Application instances in at least one EU region aligned with institutional requirements.
- Centralized structured logs, metrics, and audit export pipeline.

## 4. Authentication, sessions, users, and authorization

### 4.1 Authentication model

Use OpenID Connect against Microsoft Entra ID.

**Recommended pattern**: backend-for-frontend session model.

- User initiates login via the application server.
- OIDC authorization code flow completes on the server.
- Server issues an `HttpOnly`, `Secure`, `SameSite=Lax` session cookie.
- Browser never stores long-lived API tokens.
- Write requests require CSRF protection.
- Logout clears the local session and initiates provider logout where appropriate.

This is preferable to SPA token storage because the application will carry reviewer names, institutional notes, evidence metadata, and potentially sensitive screenshots.

### 4.2 User profile model

Create a persistent local profile record for each authenticated user.

**`users`**

- `id`
- `external_subject_id` (Entra subject)
- `email`
- `display_name`
- `given_name`
- `family_name`
- `affiliation`
- `department`
- `job_title`
- `photo_source`
- `photo_url_cache`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`

### 4.3 Avatars / photos

Do **not** implement local avatar upload in the first release.

Recommendation:

- Read photo metadata from Entra / Microsoft Graph where permitted.
- Cache only a controlled thumbnail URL or opaque reference.
- Fall back to initials when no photo is available.

This reduces storage of biometric-adjacent profile data and avoids unnecessary media handling.

### 4.4 User settings and prefill data

Store user-controlled defaults separately from identity claims.

**`user_preferences`**

- `user_id`
- `default_affiliation_text`
- `default_reviewer_signature`
- `preferred_density`
- `preferred_time_zone`
- `default_sidebar_tab`
- `keyboard_shortcuts_collapsed`
- `created_at`
- `updated_at`

Use this for prefilling fields such as reviewer name, reviewer email, reviewer affiliation, primary evaluator name, and second reviewer name.

### 4.5 Authorization model

Use a two-layer model:

1. **Global application role**
2. **Evaluation-specific assignment**

#### Global roles

- `member` — normal authenticated user; may create nominations and access assigned records.
- `coordinator` — may assign reviewers, reopen records, manage lifecycle transitions, and publish results.
- `decision_member` — may participate in final decisions and edit `S10C` when assigned.
- `auditor` — read-only access to finalized records and audit history.
- `admin` — system administration, retention, configuration, and support operations.

#### Evaluation assignments

- `nominator`
- `primary_evaluator`
- `second_reviewer`
- `decision_participant`
- `observer`

### 4.6 Authorization boundaries

Authorization must not rely on frontend workflow visibility alone.

Backend checks must enforce all of the following simultaneously:

- authenticated session
- active user status
- global role
- assignment on the specific evaluation
- lifecycle state
- current editable sections implied by workflow mode

Examples:

- A `primary_evaluator` may edit `S0`–`S10A` only while the evaluation is in nomination, primary evaluation, or re-evaluation states that permit those sections.
- A `second_reviewer` may edit `S10B` and add review comments, but may not overwrite the primary evaluator's criterion fields unless the record is explicitly reopened.
- A `decision_member` may edit `S10C` only after the record reaches the final decision stage.
- An `auditor` may never mutate questionnaire state.

## 5. Domain model

The data model should preserve compatibility with the current frontend while supporting auditability and collaboration.

### 5.1 Canonical state strategy

The canonical questionnaire payload should initially be stored as a versioned JSONB document matching the frontend's current `EvaluationState` shape.

This is the correct first move because:

- the field schema is still evolving;
- recent work already changed criterion evidence semantics;
- the derived layer depends on field IDs and state shape, not on a fully normalized relational schema.

Do **not** attempt to create one database column per questionnaire field in the first implementation.

### 5.2 Core entities

| Entity | Purpose | Key notes |
|---|---|---|
| `users` | Local identity mirror for authenticated people | Backed by Entra subject ID |
| `user_preferences` | Prefill and UI defaults | Separate from identity claims |
| `teams` | Logical review groups | Optional first release |
| `team_memberships` | User-to-team mapping | Supports future scoped administration |
| `tools` | Canonical tool identity | One tool may have multiple evaluations over time |
| `evaluations` | Current live review record | Holds canonical state JSONB and lifecycle metadata |
| `evaluation_assignments` | Actor assignments per evaluation | Primary, second, decision, observer |
| `evaluation_revisions` | Immutable snapshots of questionnaire state | Enables rollback, audit, and export provenance |
| `workflow_transitions` | Explicit lifecycle changes | Assignment, handoff, reopen, finalization |
| `evaluation_comments` | Section / criterion discussion threads | Used for review disagreement and handoff notes |
| `evidence_assets` | Physical uploaded files | Hash, storage key, mime type, uploader |
| `evidence_links` | Scoped evidence associations | Evaluation-level or criterion-level, with notes |
| `audit_events` | Immutable operational log | State writes, downloads, auth events, publication, deletes |
| `export_jobs` | Generated JSON / CSV / ZIP artifacts | Async generation and retention |
| `notification_jobs` | Due-date reminders and workflow alerts | Optional first release, but recommended |

### 5.3 Recommended `evaluations` shape

**`evaluations`** should include at minimum:

- `id`
- `tool_id`
- `public_id` (stable human-friendly identifier)
- `title_snapshot`
- `workflow_mode` — mirrors frontend modes such as `primary_evaluation`
- `lifecycle_state` — richer backend process state
- `state_schema_version`
- `framework_version`
- `current_state_json`
- `current_revision_number`
- `current_etag`
- `primary_evaluator_user_id`
- `second_reviewer_user_id`
- `decision_owner_user_id` or team reference
- `publication_state`
- `confidentiality_level`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `submitted_at`
- `finalized_at`
- `archived_at`

### 5.4 Recommended evidence model

The backend evidence model should mirror the frontend distinction already present in `render/evidence.js`, `state/evidence-actions.js`, and `adapters/evidence-storage.js`.

#### `evidence_assets`

Represents the physical file once.

- `id`
- `sha256`
- `storage_provider`
- `storage_key`
- `original_filename`
- `sanitized_filename`
- `mime_type`
- `size_bytes`
- `image_width`
- `image_height`
- `uploaded_by_user_id`
- `uploaded_at`
- `virus_scan_status`
- `retention_class`
- `deleted_at`

#### `evidence_links`

Represents the scoped usage of an asset.

- `id`
- `evaluation_id`
- `asset_id`
- `scope_type` (`evaluation` or `criterion`)
- `section_id`
- `criterion_code` (nullable)
- `evidence_type`
- `note`
- `linked_by_user_id`
- `linked_at`
- `replaced_from_link_id` (nullable)
- `deleted_at`

This preserves current behavior where one physical file can be linked to multiple criteria with different notes or evidence-type labels.

### 5.5 Revision model

`evaluation_revisions` should store an immutable snapshot of the canonical questionnaire state every time the server accepts a committed save or lifecycle transition.

Recommended fields:

- `evaluation_id`
- `revision_number`
- `state_json`
- `saved_by_user_id`
- `save_reason` (`autosave`, `manual_save`, `handoff_submit`, `review_submit`, `decision_submit`, `migration`)
- `derived_summary_json` (optional cached reporting summary)
- `created_at`

### 5.6 Relationships

- One `tool` can have many `evaluations`.
- One `evaluation` can have many `revisions`, `assignments`, `workflow_transitions`, `comments`, `evidence_links`, and `audit_events`.
- One `evidence_asset` can have many `evidence_links`.
- One `user` can have many assignments, comments, uploads, audit events, and preference settings.

## 6. Collaboration and review workflow model

### 6.1 Separate workflow mode from lifecycle state

The existing frontend `workflow.mode` is necessary for page editability and should continue to exist. It is not sufficient as the sole backend state machine.

Recommended separation:

- **`workflow_mode`**: current UI mode used by `WORKFLOW_PAGE_RULES`.
- **`lifecycle_state`**: backend process state used for assignment, notifications, permissions, publication, and reporting.

### 6.2 Recommended lifecycle states

| Lifecycle state | Frontend workflow mode | Main editable scope | Main actors |
|---|---|---|---|
| `nomination_draft` | `nomination` | `S0`, `S1` | nominator |
| `nomination_submitted` | `nomination` | none or coordinator-only | coordinator |
| `primary_assigned` | `primary_evaluation` | none until accepted | coordinator, assigned primary |
| `primary_in_progress` | `primary_evaluation` | `S0`–`S10A` | primary evaluator |
| `primary_handoff_ready` | `primary_evaluation` | limited edits or locked | primary evaluator, coordinator |
| `second_review_assigned` | `second_review` | none until accepted | coordinator, second reviewer |
| `second_review_in_progress` | `second_review` | `S10B` plus comments | second reviewer |
| `decision_pending` | `final_team_decision` | `S10C` | decision participants |
| `finalized` | `final_team_decision` | locked except reopen | coordinator, admin |
| `published` | `final_team_decision` | locked | coordinator |
| `re_evaluation_in_progress` | `re_evaluation` | `S0`–`S10A` | assigned re-evaluator |
| `archived` | read-only | none | admin, auditor |

### 6.3 Drafts and save/continue

Use server-authoritative autosave with optional browser shadow cache.

Recommended behavior:

- Save debounced section patches while editing.
- Commit immediately on workflow transitions.
- Maintain a small browser-side shadow cache for crash recovery only.
- Treat the server revision as the only authoritative source.

### 6.4 Presence and edit coordination

Do not implement CRDT-style free-for-all editing in the first release.

Recommended collaboration model:

- advisory presence indicator per evaluation
- optional advisory section lease with timeout
- optimistic concurrency checks on save
- explicit reopen / send-back actions for workflow disputes

This is better aligned with the existing page-based structure and formal review lifecycle.

### 6.5 Review handover

When the primary evaluator submits handover:

1. server validates required fields for the `primary_evaluation` mode;
2. current revision is snapshotted;
3. assignment state changes to `primary_handoff_ready` or `second_review_assigned`;
4. second reviewer is assigned;
5. audit event is written;
6. notification job is enqueued.

### 6.6 Second reviewer model

Second review should default to **comment-and-challenge**, not silent overwrite.

Recommended first-release behavior:

- `S10B` remains the primary structured input surface for the second reviewer.
- Additional comments may be attached to sections and criteria.
- Direct mutation of primary-scored criterion fields requires explicit reopen or coordinator override.

This preserves the semantics already encoded in `WORKFLOW_PAGE_RULES` and the governance sections.

### 6.7 Final team decision

Final decision requires:

- recorded decision participants;
- explicit decision rationale;
- publication state;
- review-cycle frequency;
- immutable workflow transition record.

If critical fail flags or disagreement exist, the record cannot bypass this stage.

### 6.8 Audit trail and traceability

Every material action should produce an immutable audit event.

Minimum events:

- login/logout
- evaluation creation
- assignment changes
- state save accepted
- state save rejected due to concurrency
- evidence upload, replace, unlink, delete
- workflow transition
- export generation/download
- publication/unpublication
- reopen/archive/restore

Each event should include actor, timestamp, evaluation, action type, and structured payload.

## 7. API architecture

A REST-first API is sufficient. WebSocket or server-sent events can be added for presence and workflow updates without changing the persistence model.

### 7.1 Authentication and user endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/auth/login` | Start OIDC login |
| `GET` | `/auth/callback` | Complete OIDC flow and create session |
| `POST` | `/auth/logout` | End local session and provider session |
| `GET` | `/api/me` | Current user profile, roles, assignments summary |
| `PATCH` | `/api/me/preferences` | Update user defaults and UI preferences |
| `GET` | `/api/me/avatar` | Resolved avatar/photo metadata |

### 7.2 Tool and evaluation endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/tools` | Search canonical tools |
| `POST` | `/api/tools` | Create canonical tool if needed |
| `GET` | `/api/evaluations` | List evaluations with filters |
| `POST` | `/api/evaluations` | Create evaluation / nomination |
| `GET` | `/api/evaluations/:id` | Fetch live evaluation record and current state |
| `PATCH` | `/api/evaluations/:id/metadata` | Update assignment-independent metadata |
| `GET` | `/api/evaluations/:id/revisions` | Revision list |
| `GET` | `/api/evaluations/:id/revisions/:revisionNumber` | Fetch immutable revision |
| `POST` | `/api/evaluations/:id/revert` | Revert current state to prior revision (privileged) |

### 7.3 Questionnaire state endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `PUT` | `/api/evaluations/:id/state` | Replace full canonical questionnaire state |
| `PATCH` | `/api/evaluations/:id/sections/:sectionId` | Patch section-scoped content |
| `PATCH` | `/api/evaluations/:id/criteria/:criterionCode` | Patch criterion-scoped content |
| `PATCH` | `/api/evaluations/:id/fields` | Patch one or more field values by field ID |
| `POST` | `/api/evaluations/:id/validate` | Optional server-side validation preview |

Initial implementation should support both full-state replace and targeted patch routes. The frontend can begin with full-state saves, then move to granular saves later.

### 7.4 Evidence endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/evaluations/:id/evidence/uploads` | Request upload slot / signed upload session |
| `POST` | `/api/evaluations/:id/evidence/assets` | Confirm uploaded asset metadata |
| `POST` | `/api/evaluations/:id/evidence/links` | Link asset to evaluation or criterion scope |
| `PATCH` | `/api/evaluations/:id/evidence/links/:linkId` | Update note or evidence type |
| `DELETE` | `/api/evaluations/:id/evidence/links/:linkId` | Unlink association |
| `DELETE` | `/api/evaluations/:id/evidence/assets/:assetId` | Remove asset and all associations (privileged) |
| `GET` | `/api/evaluations/:id/evidence/assets/:assetId/download` | Time-limited authenticated download |
| `GET` | `/api/evaluations/:id/evidence/manifest` | Current evidence manifest JSON |

### 7.5 Workflow, assignment, and comment endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/evaluations/:id/assignments` | Assign or reassign actors |
| `DELETE` | `/api/evaluations/:id/assignments/:assignmentId` | Remove assignment |
| `POST` | `/api/evaluations/:id/transitions` | Apply lifecycle transition |
| `POST` | `/api/evaluations/:id/handover` | Submit primary evaluation for second review |
| `POST` | `/api/evaluations/:id/second-review/submit` | Submit second review |
| `POST` | `/api/evaluations/:id/final-decision/submit` | Submit final team decision |
| `POST` | `/api/evaluations/:id/reopen` | Reopen record for changes |
| `GET` | `/api/evaluations/:id/comments` | List comment threads |
| `POST` | `/api/evaluations/:id/comments` | Add comment on evaluation / section / criterion |
| `PATCH` | `/api/evaluations/:id/comments/:commentId` | Resolve or edit comment |

### 7.6 Export and import endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/evaluations/:id/exports` | Start export job |
| `GET` | `/api/evaluations/:id/exports/:jobId` | Export job status |
| `GET` | `/api/evaluations/:id/exports/:jobId/download` | Download JSON / CSV / ZIP package |
| `POST` | `/api/import/evaluations` | Import legacy JSON package |
| `POST` | `/api/import/evaluations/:id/evidence` | Import evidence manifest / asset bundle |

Recommended export formats:

- canonical JSON state package
- reporting CSV
- ZIP artifact containing JSON, CSV, evidence manifest, audit log extract, and optionally evidence files

## 8. Optimistic concurrency and versioning

### 8.1 Recommended strategy

Use explicit optimistic concurrency with both evaluation-level and section-level version checks.

Minimum fields:

- `evaluations.current_revision_number`
- `evaluations.current_etag`
- section version map stored in JSONB or separate table

### 8.2 Client behavior

- Client fetches evaluation with current `etag` and section versions.
- Every write includes the expected version.
- On mismatch, server returns `409 Conflict` with:
  - latest accepted server state fragment
  - current versions
  - conflicting fields or section summary
  - latest revision number

### 8.3 Why not CRDT first

This application is a structured review instrument, not a freeform collaborative editor.

The better first-release behavior is:

- explicit ownership,
- visible presence,
- optimistic conflict handling,
- audited reopen and override steps.

## 9. Security and compliance

### 9.1 Session and transport security

- HTTPS only.
- Secure cookie sessions.
- CSRF protection on mutating requests.
- Session rotation after login.
- Idle timeout and absolute session lifetime.
- Structured auth event logging.

### 9.2 Evidence file security

Evidence files may contain account names, query history, screenshots of licensed systems, or policy excerpts. Treat them as internal records.

Required controls:

- private object storage only
- short-lived signed download URLs or streamed downloads
- server-side authorization before download
- file-type validation and MIME sniffing
- maximum size limits
- malware scanning
- hash-based deduplication
- encryption at rest
- audit log on upload, link, unlink, and download

### 9.3 Authorization checks

Enforce authorization on every state mutation and evidence action. Never rely on disabled controls or frontend workflow mode as the enforcement boundary.

### 9.4 Audit logging and provenance

Audit logs should be append-only and difficult to tamper with operationally.

For evidence provenance, store:

- uploader identity
- upload timestamp
- hash
- original filename
- storage key
- all association records
- revision number where first linked

### 9.5 Backup and retention

Minimum recommendation:

- PostgreSQL point-in-time recovery
- daily backups
- object storage versioning or snapshot policy
- periodic restore drills
- exportable audit archive

Retention policy must be confirmed with institutional records management. Until then, the implementation should support retention classes rather than hardcoded deletion assumptions.

## 10. Compatibility and migration strategy

### 10.1 Compatibility principle

The first persisted backend should accept and emit a canonical questionnaire payload intentionally close to the current `createAppStore()` evaluation shape.

This allows the following frontend seams to remain valid:

- `createAppStore({ initialEvaluation })`
- `replaceEvaluation()`
- `setFieldValue()` / `setSectionValue()` / `setCriterionValue()`
- the entire `deriveQuestionnaireState()` pipeline

### 10.2 Evidence compatibility

Current evidence items in the browser include `dataUrl` and `previewDataUrl`. Production persistence should not store large inline data URLs in the canonical evaluation JSON.

Migration path:

1. keep evidence link metadata in canonical state-compatible DTOs;
2. move actual file bytes into object storage;
3. replace inline `dataUrl` values with server-generated asset references and secured download URLs;
4. keep `assetId`, scoped association `id`, `evidenceType`, `note`, `criterionCode`, and `sectionId` semantics unchanged.

### 10.3 Schema versioning requirement

Every evaluation and every revision must store:

- `state_schema_version`
- `framework_version`

Add migration functions that transform stored payloads between schema versions. This is mandatory because the questionnaire schema is still changing.

### 10.4 Phased rollout

#### Phase 0 — backend contract definition

- Define canonical DTOs for evaluation state, evidence links, assignments, transitions, and revisions.
- Add explicit schema version constants.
- Freeze an initial API contract.

#### Phase 1 — same-origin authentication shell

- Introduce Fastify serving the current static frontend.
- Implement login, logout, session handling, `/api/me`, and user preferences.
- No collaborative editing yet.

#### Phase 2 — persistent evaluation records

- Implement `tools`, `evaluations`, `evaluation_revisions`, and listing/search.
- Hydrate the SPA from persisted state.
- Save full-state revisions first; keep frontend derive logic unchanged.

#### Phase 3 — external evidence storage

- Replace browser-only evidence storage with uploaded assets and scoped evidence links.
- Preserve current UI semantics for evaluation-level vs criterion-level evidence.
- Generate evidence manifests from server data.

#### Phase 4 — assignments, handoff, second review, decision workflow

- Add reviewer assignment and lifecycle transitions.
- Add comments and disagreement capture.
- Enforce workflow-specific authorization on the backend.

#### Phase 5 — concurrency, notifications, export/import

- Add optimistic concurrency checks.
- Add export jobs, JSON/CSV/ZIP artifacts, and import tools for legacy records.
- Add due-date and handoff notifications.

#### Phase 6 — reporting, publication, retention automation

- Add reporting views, publication endpoints, scheduled re-evaluation queues, and retention enforcement.

## 11. How the last 24 hours of git activity should influence this plan

Recent commits materially affect the backend design.

### 11.1 Evidence model is actively changing

Recent commits added or changed all of the following:

- evidence drag-and-drop
- evidence note editing
- fingerprint-based evidence rendering behavior
- `assetId` vs `id` evidence semantics
- removal of separate evidence-links field semantics
- updated evidence completeness logic

Backend consequence:

- the server must adopt the asset/association split immediately;
- backend schema must be versioned from day one;
- evidence should remain modeled as reusable linked assets, not a single attachment column.

### 11.2 Frontend shell behavior is still being refined

Recent commits adjusted navigation focus behavior, sidebar/backdrop behavior, score dropdown keyboard support, skip accordions, and layout containment.

Backend consequence:

- avoid coupling persistence logic to transient DOM details;
- integrate at the store/API seam, not the navigation/render seam;
- avoid planning a large UI rewrite in the same wave as backend introduction.

### 11.3 Planning docs are still in active consolidation

The new `docs/ui-fixes/MASTER_PLAN.md` consolidates multiple recent frontend changes. This indicates the frontend is in a stabilization phase.

Backend consequence:

- keep the initial migration narrow and compatibility-first;
- avoid rigid relational field-per-column modeling while the questionnaire schema is still moving.

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Questionnaire field IDs continue to change | Migration complexity, broken saved records | Versioned state schema and explicit migration functions |
| Evidence files contain sensitive screenshots | Compliance exposure | Private storage, malware scanning, audit logging, retention classes |
| Second reviewer needs to challenge criterion scores directly | Workflow friction | Support comments and reopen flow before direct overwrite |
| Concurrent edits cause reviewer confusion | Lost updates | ETags, section versions, presence indicator, advisory leases |
| Institutional SSO guest access is limited | Reviewer onboarding friction | Decide early whether external reviewers are allowed |
| Reporting needs outgrow JSONB-only storage | Query complexity | Add projections/materialized summaries later without changing canonical state |

## 13. Open decisions

1. **Guest reviewers**: internal Entra-only, or allow external guest identities?
2. **Second reviewer rights**: comment-only by default, or selective field overwrite under policy?
3. **Retention period**: how long should draft, finalized, and evidence records be retained?
4. **Publication boundary**: should public/internal publication be generated from the same record or via a curated publication projection?
5. **Comment granularity**: criterion-only and section-only, or field-level comments?
6. **Realtime scope**: presence only in first release, or live workflow notifications as well?
7. **Canonical tool registry**: should evaluations always attach to a deduplicated `tools` record, or may a nomination create a temporary tool identity first?

## 14. Implementation sequencing recommendation

Highest-priority sequence:

1. Freeze a versioned canonical evaluation-state DTO aligned with `createAppStore()`.
2. Introduce Fastify as a same-origin BFF with Entra login/logout and secure cookie sessions.
3. Implement PostgreSQL-backed `tools`, `evaluations`, `evaluation_revisions`, and `evaluation_assignments`.
4. Hydrate the current SPA from persisted state using `initialEvaluation` / `replaceEvaluation()`; keep the existing derive layer unchanged.
5. Implement object storage-backed `evidence_assets` and `evidence_links`, preserving current `assetId` and scoped-association semantics.
6. Add lifecycle transitions for handoff, second review, final decision, reopen, and re-evaluation.
7. Add optimistic concurrency, presence indicators, and audit events before broad multi-user rollout.
8. Add export/import packages and retention controls before production publication workflows.

## 15. Final recommendation

Build a custom same-origin Node.js backend-for-frontend around the current vanilla SPA. Use PostgreSQL for canonical state, revisions, lifecycle metadata, and audit records; use private object storage for evidence assets; use Microsoft Entra ID for authentication; and preserve the existing frontend state/derive architecture as the migration boundary.

This is the lowest-risk path that preserves the current application's engineered interaction model while adding persistence, auditability, secure evidence handling, and formal multi-user review workflow support.
