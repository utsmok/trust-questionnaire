# In-app testing-tooling and browser-extension ecosystem plan

Date: 2026-04-06
Status: planning only
Scope: next-phase architecture for reusable test tooling, durable evidence handling, and browser-assisted capture

## Executive summary

The recommended sequence is:

1. Implement a backend-backed evidence and review domain plus a standalone in-app test-set workspace.
2. Normalize the current evidence model into durable assets and associations without discarding the current `assetId` concept already present in `static/js/state/evidence-actions.js`.
3. Introduce a browser extension only after review targeting, authentication, upload, and provenance APIs exist.

The extension should be treated as **phase 2**, not phase 1. The current application is a static single-page questionnaire with no backend, no persisted evidence store, and no non-review tooling area. The recent evidence work in the last 24 hours materially improves the front-end capture experience, but it does not yet provide the persistence, security boundary, upload protocol, or shared test-set model needed for extension-driven capture.

The Zotero connector architecture is relevant as an architectural precedent only. The useful patterns are: a WebExtension split between page-side code and a background coordinator, connector-initiated communication, and a multi-step upload/registration flow. The local open HTTP connector server and long-lived API-key model are not appropriate defaults for this application.

## Current state baseline

### Runtime shape

- `trust-framework.html` mounts a single questionnaire shell with `#questionnaireRenderRoot`, a page index mount, and a context panel. There is no second workspace for reusable tooling.
- `static/js/render/questionnaire-pages.js` asserts a fixed 13-page review flow via `CANONICAL_PAGE_SEQUENCE` from `static/js/config/sections.js` and renders only the review pages `S0` through `S10C`.
- `static/js/config/sections.js` and `static/js/state/derive/workflow.js` encode workflow-dependent editability and accessibility. Any future extension or tooling API that associates artifacts with a review must respect the same workflow-derived target availability.

### Current evidence model

The current evidence system is already criterion-aware and materially more advanced than a simple file uploader.

Relevant implementation points:

- `static/js/render/evidence.js`
  - `createEvidenceScope()` distinguishes evaluation-level evidence from criterion-level evidence.
  - `createEvidenceBlockElement()` mounts an evaluation evidence block on `S2` and criterion evidence blocks inside each criterion card.
  - `initializeEvidenceUi()` handles click, paste, drag/drop, lightbox preview, inline note editing, manifest export, and active-page-only sync.
- `static/js/state/evidence-actions.js`
  - Evidence items are normalized and stored under `evaluation.evidence.evaluation` and `evaluation.evidence.criteria`.
  - Reuse across criteria already exists through `assetId` plus association-specific `id` values.
  - Association-level note updates and replace/reuse flows are already implemented.
- `static/js/adapters/evidence-storage.js`
  - `createEvidenceManifest()` and `serializeEvidenceManifest()` provide an export contract only.
  - `EVIDENCE_MANIFEST_VERSION` is `1`.
  - There is still no persistence adapter, upload client, or remote storage boundary.
- `static/js/behavior/field-handlers.js`
  - URL extraction now writes directly into evidence items instead of a separate `evidenceLinks` field.

The active in-memory `EvidenceItem` shape is already close to a useful persisted contract:

| Field | Current usage |
|---|---|
| `id` | Association identifier |
| `assetId` | Reuse key across associations |
| `scope` | `evaluation` or `criterion` |
| `sectionId` / `criterionCode` | Review target |
| `evidenceType` | Screenshot, export, document, policy, benchmark, other, link |
| `note` | Reviewer annotation |
| `name`, `mimeType`, `size` | Asset metadata |
| `dataUrl`, `previewDataUrl` | Inline binary payload in client state |
| `addedAt` | Capture timestamp |

This is sufficient for front-end prototyping but not sufficient for a production capture ecosystem because it stores binary payloads directly in state, has no server identity, no upload lifecycle, no queueing, no retention model, and no access control.

### Current gaps blocking the next phase

1. **No backend**
	There is no review API, authentication layer, storage service, or upload endpoint.

2. **No persisted evidence store**
	`static/js/adapters/evidence-storage.js` exports JSON. It does not persist assets or associations.

3. **No standalone tooling area**
	The application shell is review-only. `static/js/render/questionnaire-pages.js` is intentionally organized around the questionnaire pages, not reusable tool management.

4. **Evidence assets and evidence associations are still conflated in the runtime model**
	`assetId` exists, but binaries, target metadata, and association notes still travel together in a single object.

5. **Code/document drift exists**
	`docs/trust-questionnaire.md` still describes criterion-level "Evidence summary" and "Evidence links" fields, while `static/js/config/questionnaire-schema.js` now exposes a merged `*.evidence` field and the runtime writes link evidence as evidence items.

6. **No reporting/test-run abstraction exists**
	Evidence can be attached to an evaluation or criterion, but there is no reusable test-set entity, no run history, and no link from a reusable scenario to a review report.

## Last 24 hours of git activity and why it matters

Recent commits materially change the planning baseline.

Key commits:

- `aaf2d30` — `refactor(evidence): rename evidenceSummary→evidence, remove evidenceLinks, add note update actions`
- `744940e` — `feat(field-handlers): add URL extraction to evidence items and score dropdown sync/handlers`
- `38b3002` — `feat(evidence): simplify intake UI, add drag-and-drop, fingerprint diffing, editable notes`
- `f6e9e30` — `refactor(questionnaire-pages): convert skip scaffolds to accordion, integrate score dropdown rendering`
- `37db684` — `refactor(ui): remove redundant labels, pills, titles, and pager status text`
- `bf2479d` — `style(css): add score dropdown, skip accordion, drop zone styles, tooltip improvements, and layout containment`
- `4df3748` — `feat(score-dropdown): add keyboard navigation for open, arrow select, and close`
- `db063c4` — `fix(navigation): use focusElementWithRetry in scrollQuestionnaireTarget to prevent flaky focus`

Implications:

1. The evidence intake surface has just been simplified and stabilized. The next phase should treat the current evidence UI as the front-end consumer of a future persistence contract, not redesign it again.
2. Drag/drop, editable notes, and URL extraction mean the application now has enough capture vocabulary to define server-side evidence semantics.
3. The evidence refactor removed the previous `evidenceLinks` split. Test tooling and extension ingestion should therefore target the merged evidence model, not the obsolete document description.
4. The layout and keyboard commits indicate the current focus remains on core questionnaire usability. This supports a phased plan in which standalone tooling is added as a separate workspace, not folded into the existing page stack.

## Zotero reference and why it is relevant

The Zotero connector reference suggests several patterns that fit this problem space:

- a WebExtension split between page-side logic and a background coordinator;
- browser message passing as the only supported connector-to-page communication path;
- connector-initiated communication rather than server-push into the extension;
- a focused upload API with explicit authorization and completion steps;
- a background middle layer responsible for preferences, orchestration, and UI updates.

It also demonstrates two patterns that should **not** be copied directly here:

- a local HTTP connector server exposed on localhost; and
- long-lived API keys as the default extension credential.

For this application, the useful lesson is structural: the extension should be a thin page sensor plus a background upload/orchestration layer, while the main application backend remains the system of record.

## Architecture alternatives

### Alternative A — continue as a front-end-only system with manifest import/export

Description:

- Keep the application static.
- Treat `trust-evidence-manifest.json` as the durable interchange format.
- Add test-set management in local browser storage only.
- Let a future extension export captures into manifest files for later import.

Advantages:

- Lowest implementation cost.
- Minimal infrastructure work.
- Can be prototyped quickly.

Disadvantages:

- No shared library of reusable test sets.
- No multi-user ownership, access control, or reporting.
- No reliable active-review targeting.
- No secure upload or server-side provenance trail.
- High probability of data drift and duplicated artifacts.

Assessment:

- Suitable only as a temporary fallback/export mechanism.
- Not suitable as the primary next-phase architecture.

### Alternative B — backend-first normalization plus in-app tooling, followed by extension capture

Description:

- Add a backend for reviews, evidence, test sets, and reporting.
- Normalize assets versus associations while preserving the current front-end evidence semantics.
- Add a standalone tooling workspace for reusable test sets and runs.
- Introduce a browser extension only after the backend contracts and permissions model exist.

Advantages:

- Aligns with the current front-end evidence model and the TRUST governance workflow.
- Creates a stable API surface for both in-app tooling and the extension.
- Supports versioning, sharing, auditability, and reporting from the start.
- Keeps the extension thin and replaceable.

Disadvantages:

- Requires backend and hosting decisions before visible extension work.
- Introduces a wider domain model.
- Requires review/auth integration before capture automation can ship.

Assessment:

- Best balance of risk, sequencing, and long-term maintainability.
- **Recommended.**

### Alternative C — extension-first capture pilot before backend normalization

Description:

- Build an extension immediately.
- Store captured artifacts locally in extension storage or IndexedDB.
- Add backend sync later.

Advantages:

- Fastest route to visible browser capture functionality.
- Good for experimentation with popup UX and page capture mechanics.

Disadvantages:

- Bakes unstable assumptions into the extension before the review domain exists.
- Requires later migration of local capture queues and identifiers.
- Makes authentication, access control, and retention an afterthought.
- Likely duplicates logic that should live in backend services.

Assessment:

- High rework risk.
- Not recommended as the primary path.

## Recommended direction

### Recommendation

Adopt **Alternative B**.

The next phase should deliver two things together:

1. a backend-backed evidence/test-set domain; and
2. a standalone in-app tooling workspace for reusable test sets and run history.

The browser extension should follow only after those pieces exist and are exercised by the web application itself.

### Explicit phase decision

- **Phase 1:** in-app tooling and backend foundation.
- **Phase 2:** browser extension pilot for Chromium browsers.
- **Phase 3:** Firefox support, richer capture types, broader rollout, and any Safari consideration.

The extension should **not** be phase 1.

## Target domain model

The current client-side `EvidenceItem` model should be normalized into durable entities.

### Core entities

| Entity | Purpose | Notes |
|---|---|---|
| `reviews` | Persisted evaluation records | Existing questionnaire state becomes durable and shareable |
| `review_snapshots` | Versioned review state snapshots or audit checkpoints | Supports traceability and rollback |
| `evidence_assets` | Immutable file/link/capture records | Replaces binary-in-state storage |
| `evidence_associations` | Links an asset to a review scope | Mirrors current `assetId` reuse plus per-link notes |
| `test_sets` | Logical reusable suite container | Ownable and shareable |
| `test_set_revisions` | Immutable published revisions | A review always points to a pinned revision |
| `test_cases` | Individual reusable queries/scenarios within a revision | Criterion-targeted, typed, and ordered |
| `review_test_plans` | Attach a test-set revision to a review | Locks revision at time of use |
| `review_test_runs` | Execution records for individual test cases | Stores outcomes, timestamps, actors, and links |
| `capture_events` | Technical capture metadata and upload lifecycle | Extension-facing traceability record |

### Recommended evidence split

#### `evidence_assets`

Immutable technical record. Suggested fields:

- `id`
- `asset_kind` (`image`, `document`, `export`, `url`, `dom_snippet`, `selection`, `metadata_only`)
- `source_type` (`manual_upload`, `clipboard`, `drag_drop`, `extension_capture`, `imported_manifest`)
- `storage_key` or `source_url`
- `content_hash`
- `mime_type`
- `size_bytes`
- `original_name`
- `origin_url`
- `origin_title`
- `captured_at_client`
- `received_at_server`
- `captured_by_user_id`
- `capture_tool_version`
- `browser_name`, `browser_version`
- `page_language`
- `dom_anchor_payload`
- `selection_payload`
- `redaction_status`

#### `evidence_associations`

Mutable review linkage. Suggested fields:

- `id`
- `review_id`
- `scope_type` (`evaluation`, `criterion`)
- `section_id`
- `criterion_code` nullable
- `asset_id`
- `note`
- `linked_by_user_id`
- `linked_at`
- `source_run_id` nullable
- `source_test_case_id` nullable
- `source_test_set_revision_id` nullable

This matches the current UI behavior in `static/js/render/evidence.js`: a single asset may be linked more than once, and notes are association-specific.

### Migration note

The current runtime already has `assetId`. That should be preserved as the migration bridge:

- one existing client-side `assetId` becomes one `evidence_assets.id` candidate; and
- each current evidence item `id` becomes one `evidence_associations.id` candidate.

## Test-set management feature

### Purpose

Reusable test sets should formalize repeated evaluation scenarios that currently live in narrative fields such as `S2 sampleQueriesOrScenarios`, `S2 repeatedQueryText`, benchmark notes, and criterion evidence annotations.

They should not be embedded into the current 13-page review flow as pseudo-sections. The current shell is explicitly organized around questionnaire pages. A tooling workspace should exist as a separate application area.

### Required standalone workspace

Recommended top-level workspace split:

- `Reviews` — current questionnaire and review workflow.
- `Tooling` — reusable test sets, test runs, capture inbox, and reporting.

This can be implemented with lightweight routing later, but the critical point is architectural separation. Test-set CRUD should not be stored in the current questionnaire store created around `createAppStore()`.

### Test-set data model

#### `test_sets`

Suggested fields:

- `id`, `slug`, `title`, `description`
- `owner_user_id`
- `visibility` (`private`, `team`, `organization`)
- `status` (`draft`, `published`, `deprecated`, `archived`)
- `latest_revision_id`
- `created_at`, `updated_at`, `archived_at`

#### `test_set_revisions`

Suggested fields:

- `id`, `test_set_id`, `version_number`
- `schema_version`
- `change_summary`
- `created_by_user_id`
- `created_at`, `published_at`
- `is_published`
- `derived_from_revision_id`

Published revisions should be immutable.

#### `test_cases`

Suggested fields:

- `id`, `revision_id`, `ordinal`
- `title`
- `scenario_type` (`known_item`, `exploratory`, `synthesis`, `policy_review`, `provenance_check`, `workflow_integration`, `privacy_review`)
- `query_text` or `instruction_text`
- `expected_observation_type`
- `criteria_targets` (one or more of `TR1`…`TC2`)
- `section_targets` when criterion mapping is not exact
- `requires_capture_types` (`screenshot`, `url`, `selection`, `document`, `export`, `metadata_only`)
- `benchmark_reference_text`
- `sensitivity_level`
- `notes`

#### `review_test_plans`

This is the review-side pinned reference.

Suggested fields:

- `id`
- `review_id`
- `test_set_revision_id`
- `role` (`baseline`, `comparison`, `ad_hoc`, `regression`)
- `linked_by_user_id`
- `linked_at`

#### `review_test_runs`

Suggested fields:

- `id`
- `review_id`
- `test_case_id`
- `test_set_revision_id`
- `status` (`not_started`, `in_progress`, `completed`, `skipped`, `blocked`)
- `executed_by_user_id`
- `executed_at`
- `tool_context_snapshot`
- `result_summary`
- `free_text_result`
- `linked_evidence_count`
- `linked_evidence_asset_ids`

### CRUD workflows

#### Create/edit/publish

1. Create a draft test set.
2. Add or reorder test cases.
3. Tag test cases to criteria and expected evidence types.
4. Publish a revision.
5. Further edits produce a new draft revision rather than mutating the published one.

#### Duplicate/fork

Required for minor variations by discipline or tool category without destroying baseline sets.

#### Archive/deprecate

Deprecated sets remain visible in historical reports but are not selectable for new reviews.

#### Share

Recommended roles:

- `owner`
- `editor`
- `viewer`

Visibility should default to team-internal, not public.

### How test sets are referenced during an active review

Recommended integration points:

1. **Section `S2` / Evaluation Setup**
	Add a review-level panel for linked test-set revisions. This aligns with the existing role of `S2` as the reproducibility and evidence boundary section.

2. **Criterion cards**
	Each criterion card can display linked test cases and completed runs relevant to that criterion, adjacent to the existing criterion evidence block rendered by `static/js/render/questionnaire-pages.js`.

3. **Recommendation/governance sections (`S9`, `S10A`, `S10B`, `S10C`)**
	Reports should list which test-set revisions were executed, which runs remain incomplete, and which captured artifacts support the final rationale.

4. **Capture inbox**
	Unassigned assets from the extension should first land in a review-scoped inbox before explicit criterion association, unless the user selected a criterion at capture time.

### Versioning, ownership, sharing, and reporting

- Reviews must always point to a **pinned revision**, never to a mutable draft.
- Reports should display `test_set title + revision number`, not only the logical set name.
- Ownership and sharing should be at the `test_set` level, while immutable revisions remain attributable to the publishing user.
- Every `review_test_run` should have a stable deep link and should appear in review exports.

### Reporting links back into a review

Required reporting relationships:

- `review -> linked test-set revisions`
- `review -> test runs`
- `test run -> evidence assets`
- `evidence asset -> criterion/evaluation associations`

This creates a full chain from reusable scenario to concrete captured evidence to final review judgment.

## Browser extension architecture

### Browser support targets and packaging model

#### Recommended target order

1. **Chromium first** — Chrome and Edge via Manifest V3.
2. **Firefox second** — same WebExtension codebase with compatibility shims.
3. **Safari later, if needed** — only after the product scope is proven.

Rationale:

- Internal team rollout is likely easiest on Chromium browsers.
- Safari adds packaging/signing and support overhead disproportionate to likely first-wave value.
- The Zotero connector repository itself shows the operational cost of multi-browser packaging.

#### Packaging model

- Keep the extension in a separate package or workspace from the current static SPA.
- Give it its own build, release, permissions review, and test pipeline.
- For early rollout, prefer **internal side-loading or managed enterprise distribution** rather than public store publication.

This avoids forcing the current no-build static app into extension-specific build assumptions.

### Recommended component split

#### Content script

Responsibilities:

- read `url`, `title`, `selection`, viewport metrics, and basic DOM anchors;
- capture nearby DOM context and normalized text quotes;
- read active app-review context when running on the trusted application origin;
- send only structured messages to the background coordinator.

Constraints:

- no long-lived auth credentials;
- no direct upload logic;
- no assumption that the review app tab is open.

#### Optional injected page script

Use only if required for page-context access that a content script cannot reach. This should be a later optimization, not a default. The initial design should stay within ordinary content-script isolation.

#### Background/service worker

Responsibilities:

- session/token management;
- active-review and criterion target cache;
- screenshot orchestration;
- upload queue and retry logic;
- extension preferences;
- notifications and error state handling.

Design note:

The Zotero repository’s recent service-worker-oriented changes are a reminder that MV3 lifecycle behavior is operationally significant. The background logic should therefore be stateless or resumable. It must not depend on long-lived in-memory state.

#### Popup or side-panel UI

Responsibilities:

- select review target and criterion target;
- preview capture payload;
- show upload queue state;
- allow reviewer confirmation or redaction before upload.

### Capture flows

#### Phase-2 capture types

The phase-2 extension should support:

- visible-tab screenshot;
- page URL and title;
- capture timestamp;
- selected text;
- limited DOM anchor/context;
- reviewer-entered note;
- active review and criterion target.

It should **not** support unrestricted full-page HTML snapshotting in phase 2.

#### Recommended capture envelope

Every capture should produce a metadata envelope containing at least:

- `review_id`
- `scope_type`
- `section_id`
- `criterion_code` nullable
- `captured_at_client`
- `origin_url`
- `origin_title`
- `browser_name`, `browser_version`
- `extension_version`
- `capture_mode` (`screenshot`, `selection`, `url_only`, `metadata_only`)
- `selection_text` nullable
- `dom_anchor_payload` nullable
- `viewport` and scroll context
- `user_note` nullable
- `content_hash` if a binary payload exists

#### DOM context model

Recommended DOM payload:

- CSS selector path
- text quote
- text prefix/suffix
- frame indicator
- optional sanitized HTML snippet

This is sufficient for traceability without defaulting to full document capture.

### Criterion targeting and active-review targeting

#### Review targeting

The extension should never create reviews autonomously. It should only:

- attach to an existing review;
- use a review-scoped inbox when no criterion is selected; or
- refuse direct upload when no valid review context exists.

#### Criterion targeting

Recommended target modes:

- evaluation-level (`S2`/evaluation evidence)
- criterion-level (`TR1`…`TC2`)

The extension should not expose arbitrary section-level evidence targets initially. The current application already models evidence primarily at evaluation and criterion scope.

#### Validation boundary

Backend validation should reject capture association when:

- the review is closed or read-only;
- the workflow mode does not allow attachment at that stage;
- the criterion is user-skipped, inherited-skipped, or system-skipped;
- the user lacks permission to modify the review.

This should reuse the same logic family currently represented client-side by `static/js/config/sections.js`, `static/js/config/rules.js`, and `static/js/state/derive/workflow.js`.

### Authentication and session strategy

#### Recommendation

Use **backend-issued, scoped, revocable extension sessions**, not long-lived API keys.

Recommended model:

1. The main app authenticates via institutional SSO.
2. The web app offers an explicit "pair extension" action.
3. The backend issues a one-time pairing artifact tied to the authenticated user.
4. The extension exchanges that artifact for:
	- a short-lived access token; and
	- a revocable refresh token limited to capture-related scopes.

Required scopes:

- `review:read`
- `review:evidence:write`
- `testset:read`
- `testrun:write`

Rationale:

- avoids cookie scraping;
- avoids embedding the full web login flow into the content script;
- keeps credentials revocable and auditable;
- preserves separation between browser runtime and main app session.

#### Alternative to keep in reserve

If the pairing flow proves operationally difficult, direct OIDC Authorization Code with PKCE inside the extension is the fallback. Cookie reuse and long-lived static API keys should not be used.

### Upload protocol and failure/retry behavior

Recommended upload flow, explicitly inspired by the Zotero multi-step authorization/register pattern:

1. **Initialize capture**
	`POST /api/captures/init` with metadata envelope, scope target, capture kind, size, and content hash.

2. **Authorize upload**
	Backend validates permissions and returns either:
	- a direct upload URL / object-store form fields; or
	- an inline small-payload instruction for metadata-only captures.

3. **Upload binary payload**
	Extension uploads screenshot/document bytes.

4. **Finalize capture**
	`POST /api/captures/{captureId}/complete` with checksum confirmation and any late-bound metadata.

5. **Create or confirm evidence association**
	Association can be automatic if the capture was fully targeted at initialization, or explicit if it was routed through a review inbox.

#### Retry behavior

Use a persistent local queue in extension storage or IndexedDB.

Suggested queue states:

- `queued`
- `uploading`
- `awaiting_finalize`
- `completed`
- `failed_retryable`
- `failed_auth`
- `failed_policy`

Retry rules:

- Retry `429` and `5xx` with exponential backoff.
- Do not silently retry `401`, `403`, or validation failures.
- Use idempotency keys to prevent duplicate evidence assets.
- Preserve reviewer-visible failed items until the user resolves or discards them.

#### Important design choice

The extension should never write directly into the in-page questionnaire store. It should send data to the backend, and the web app should later read that persisted state. This avoids coupling extension correctness to whether the questionnaire tab is open.

## Required API surface

### Review and target APIs

| Endpoint | Purpose |
|---|---|
| `GET /api/reviews?status=active` | List active reviews available to the user |
| `GET /api/reviews/{reviewId}` | Review metadata and current workflow state |
| `GET /api/reviews/{reviewId}/targets` | Valid evaluation/criterion targets for evidence association |
| `GET /api/reviews/{reviewId}/evidence` | Existing linked assets and inbox items |
| `GET /api/reviews/{reviewId}/report` | Review report and traceability summary |

### Test-set APIs

| Endpoint | Purpose |
|---|---|
| `GET /api/test-sets` | List/filter reusable test sets |
| `POST /api/test-sets` | Create logical test-set container |
| `GET /api/test-sets/{id}` | Retrieve current draft and published metadata |
| `PATCH /api/test-sets/{id}` | Update draft-level metadata |
| `POST /api/test-sets/{id}/revisions` | Create new draft revision |
| `POST /api/test-set-revisions/{revisionId}/publish` | Publish immutable revision |
| `POST /api/reviews/{reviewId}/test-plans` | Attach a published revision to a review |
| `POST /api/review-test-runs` | Create/update test execution records |
| `GET /api/test-sets/{id}/usage` | Cross-review usage and reporting |

### Capture and evidence APIs

| Endpoint | Purpose |
|---|---|
| `POST /api/captures/init` | Validate target and authorize upload |
| `POST /api/captures/{captureId}/complete` | Finalize uploaded capture |
| `POST /api/evidence-associations` | Link an asset to a review scope |
| `PATCH /api/evidence-associations/{id}` | Update association note/target |
| `DELETE /api/evidence-associations/{id}` | Unlink asset from a specific scope |
| `DELETE /api/evidence-assets/{id}` | Remove an asset entirely, subject to policy |
| `GET /api/reviews/{reviewId}/evidence-manifest` | Export manifest-compatible view |

### Extension session APIs

| Endpoint | Purpose |
|---|---|
| `POST /api/extension/pair/start` | Create one-time pairing artifact from the web app |
| `POST /api/extension/pair/exchange` | Exchange pairing artifact for extension tokens |
| `POST /api/extension/session/refresh` | Refresh extension access token |
| `DELETE /api/extension/session/current` | Revoke extension session |

## Security, privacy, and provenance concerns

### Privacy and security implications of page capture

Browser capture introduces materially different risk from manual upload.

Primary concerns:

- captures may include personal data, account information, internal licensing pages, or sensitive research context;
- screenshots may inadvertently include unrelated browser tabs or browser UI in some implementations;
- DOM snippets may contain hidden text, form values, or session-specific identifiers;
- extension permissions are subject to browser-store review and internal governance.

Required controls:

- explicit user-triggered capture only in phase 2;
- minimal extension permissions (`activeTab`, `storage`, `scripting`, and only what is strictly needed);
- reviewer preview before upload;
- optional redaction/crop before finalize;
- host allowlist/blocklist policy;
- retention and deletion policy enforced by backend;
- full audit log of capture, upload, association, re-association, and deletion events.

### Provenance and traceability metadata

Every persisted asset should preserve a chain of custody sufficient for TRUST traceability and governance review.

Required provenance fields:

- capture origin (`manual`, `drag_drop`, `clipboard`, `extension_capture`, `manifest_import`)
- user identity
- timestamps for client capture, server receipt, and association
- original URL/title
- review target and criterion target
- hash/checksum
- tool version and browser version
- redaction/transform metadata
- linked test set revision and test case where applicable

This is the data needed to support later reporting and to keep extension-generated evidence defensible during `S10A`–`S10C` governance steps.

## Operational rollout strategy

### Phase 0 — contract stabilization

Deliverables:

- reconcile `docs/trust-questionnaire.md` with the current merged runtime evidence model;
- define the persisted evidence asset/association contract;
- keep `createEvidenceManifest()` as an export/import fallback and migration bridge.

Why first:

- the application code and questionnaire documentation have diverged on evidence semantics;
- test tooling should not be built against obsolete field definitions.

### Phase 1 — backend and in-app tooling

Deliverables:

- authenticated backend;
- persisted reviews;
- durable evidence assets/associations;
- standalone tooling workspace for test-set CRUD;
- review-side test-plan linking and run reporting;
- manifest import/export compatibility.

Exit criteria:

- a review can link a published test-set revision;
- a test run can produce persisted evidence assets without any extension;
- `S2`, criterion evidence, and review exports read from persisted records.

### Phase 2 — extension pilot

Deliverables:

- Chromium extension;
- screenshot/url/title/selection capture;
- pairing-based extension auth;
- upload queue and retry;
- review inbox and direct criterion targeting.

Exit criteria:

- extension captures are persisted with provenance metadata;
- association permissions honor workflow/read-only rules;
- pilot users can complete a review without manual file export/import.

### Phase 3 — broader extension scope

Deliverables:

- Firefox support;
- richer DOM context where justified;
- optional automation around test-run execution and evidence bundling;
- enterprise distribution hardening;
- optional SharePoint export/sync if still required operationally.

## Risks and dependencies

### Highest-risk dependencies

1. **Backend platform and hosting decision**
	No next-phase capture ecosystem exists without a server boundary.

2. **Identity and session model**
	Extension auth must be decided before packaging and rollout.

3. **Evidence storage target**
	The framework documentation points toward SharePoint document libraries, but extension ingestion will likely require a simpler primary object-store API first.

4. **Code/document reconciliation**
	The questionnaire document still reflects superseded evidence fields.

5. **Privacy review**
	Extension-based page capture requires explicit policy, retention, and redaction decisions.

### Specific technical risks

- current client-side `dataUrl` handling will not scale to extension-sized capture volumes;
- MV3 service-worker suspension can break naive queue logic;
- overloading the existing review SPA with test-set CRUD will increase coupling and reduce maintainability;
- direct SharePoint/Graph-first upload from the extension would likely complicate auth and retry behavior beyond what is justified initially.

## Recommended decisions to carry into implementation planning

1. Keep the current review SPA and evidence UI, but put durable state behind them.
2. Add a separate tooling workspace rather than extending the questionnaire page sequence.
3. Normalize `evidence_assets` versus `evidence_associations` and preserve `assetId` as the migration bridge.
4. Make test sets revisioned, immutable once published, and review-linked by pinned revision.
5. Treat the extension as a background-orchestrated, connector-initiated client of backend APIs.
6. Use scoped, revocable extension sessions rather than long-lived API keys.
7. Use a multi-step initialize/upload/finalize protocol for binary evidence.

## Unresolved decisions requiring explicit follow-up

1. **Backend technology and hosting**
	Node-based service aligned with the existing JavaScript stack is the lowest-friction option, but the hosting and institutional support model still need a decision.

2. **Primary evidence store**
	Choose between:
	- application-owned object storage with later SharePoint export; or
	- direct SharePoint-centric storage from the start.
	The former is operationally simpler for extension uploads.

3. **Extension login UX**
	Confirm whether web-app pairing is acceptable or whether direct OIDC/PKCE in the extension is required.

4. **Capture policy envelope**
	Decide the initial allowlist/blocklist and whether redaction is mandatory before upload on certain domains.

5. **Report granularity**
	Decide whether phase-1 reports need only review-level summaries or full test-run-level drill-through.

## Final recommendation

The next phase should be defined as **backend-backed in-app tooling plus evidence normalization**, not as extension delivery.

The concrete recommendation is:

- phase 1: build the persistent review/evidence/test-set platform and tooling workspace;
- phase 2: deliver a Chromium extension pilot using a content-script plus background/service-worker architecture;
- phase 3: broaden browser support and capture sophistication only after policy, queueing, and reporting are stable.

This sequencing matches the current codebase reality, the last 24 hours of evidence-system changes, and the most useful lessons from the Zotero connector architecture.
