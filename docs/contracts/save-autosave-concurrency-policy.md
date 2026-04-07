# Save, autosave, and optimistic-concurrency policy

Date: 2026-04-06
Status: Wave 0 / T003 substream C complete
Scope: Wave 2 authoritative save behavior for persisted review state, save-status visibility, immutable revision checkpoints, optimistic concurrency, and explicit offline/non-goals

## Purpose

This contract freezes how saved reviews behave once the current questionnaire becomes a server-backed, resumable workspace.

It defines:

- which copy of a review is authoritative;
- what the frontend may treat as a working copy only;
- how autosave is triggered, queued, and surfaced;
- when immutable revisions are created and which of them count as review-history checkpoints;
- how optimistic concurrency must behave in Wave 2;
- what offline behavior is explicitly out of scope.

This document is intentionally limited to the **save/autosave/concurrency** slice of T003.

It does **not** replace:

- `docs/contracts/review-state-contract.md` for the canonical review-record envelope and `current_state_json` compatibility boundary;
- `docs/contracts/schema-versioning-policy.md` for version-axis bump rules and migration policy;
- `docs/contracts/lifecycle-state-map.md` for lifecycle vocabulary and transition rules;
- `docs/contracts/app-shell-route-model.md` for broader route ownership.

## What this document freezes

- the server copy as the authoritative saved review record;
- the frontend questionnaire store as a route-scoped working copy only;
- one serialized outbound save queue per open review workspace;
- autosave cadence and immediate-flush triggers for Wave 2;
- immutable revision creation on accepted writes, plus a narrower checkpoint vocabulary for surfaced review history;
- ETag-based optimistic concurrency with no automatic merge;
- no offline-first persistence and no separate crash-recovery store in Wave 2.

## Corrected first-pass file-level analysis

The first-pass analysis for this substream was reviewed against the master roadmap, the executable implementation plan, the current store/bootstrap/navigation files, and the already-frozen T001 contracts.

The corrected file-level requirements are:

| File | Current responsibility | Save/autosave/concurrency requirement frozen here |
|---|---|---|
| `package.json` | Defines the current static serve, validation, and test command surface. | The saved-review runtime must preserve the existing static validation and test paths while adding same-origin backend serving later. T003 save policy must not assume a second frontend package root or a different test-entry model. |
| `static/js/app.js` | Bootstraps one in-browser store, mounts questionnaire pages, and wires navigation/form/keyboard behavior. | Wave 2 bootstrap must hydrate the workspace from a server review envelope before the questionnaire becomes editable, then attach a save queue around the existing store. The bootstrap path must not bypass the current questionnaire renderer or create a second draft model. |
| `static/js/state/store.js` | Holds the canonical frontend `evaluation` payload plus derived state and current route-local UI state. | The authoritative save payload is the canonical review-record envelope plus `evaluation`-compatible `current_state_json`. Save metadata such as `review_id`, `current_etag`, `current_revision_number`, save status, and queue state must stay outside `evaluation`. Dirty tracking must compare canonical questionnaire state, not derived or UI state. Conditionally hidden values remain persisted until explicit removal. |
| `static/js/behavior/navigation.js` | Owns page visibility, drawer/sidebar state, focus return, panel metrics, and local UI persistence for sidebar width only. | Navigation may present save state, review identity, and conflict banners in Wave 2, but it must not become the source of truth for save completion. Route/page changes may request queue flushes before leaving the workspace, but navigation must not invent a second persistence layer in `localStorage`. |
| `static/js/behavior/context-tracking.js` | Owns hash-based page and sub-anchor tracking inside the questionnaire workspace. | In Wave 2, hash/sub-anchor state remains a workspace-local concern only. Review identity and save authority belong to the routed review shell, not to hash state. Hash changes never count as save events by themselves. |
| Planned `static/js/api/review-state.js` | Future browser API adapter for review load/save calls. | Must send conditional writes using the server-issued concurrency token, surface accepted `current_etag` and `current_revision_number`, and treat the server response as authoritative after each accepted save. |
| Planned `static/js/utils/save-queue.js` | Future save scheduler and serializer. | Must enforce one in-flight write per open review, coalesce trailing changes, pause on conflicts, and distinguish `dirty`, `saving`, `saved`, `save_failed`, and `conflict` states. It must not open parallel writes for the same review. |
| Planned `server/routes/evaluations.js` and `server/routes/revisions.js` | Future persistence endpoints and revision access paths. | Must accept full-state compatibility writes for the review record, update the live server copy, create immutable revisions according to this policy, and reject stale writes using the optimistic-concurrency contract. |

## Reconciliation against roadmap and executable-plan constraints

This policy resolves the relevant cross-document tensions as follows.

### 1. Saved history must exist at important moments without requiring hidden merge behavior

The master roadmap requires:

- save/continue/resume behavior;
- saved history at important moments.

The executable plan and T001 contracts also require:

- persisted review records plus immutable revisions;
- ETag or equivalent version metadata for conflict handling.

The corrected policy is therefore:

- every accepted authoritative save writes the latest server copy and advances technical revision metadata;
- a narrower subset of revisions is classified as a **checkpoint revision** for surfaced review history;
- autosave is allowed to be frequent without pretending that every autosave deserves equal prominence in the history UI.

This keeps the persistence model auditable while preserving the roadmap requirement for clearly meaningful history checkpoints.

### 2. Wave 2 save authority covers review state first; durable evidence storage remains a separate Wave 3 concern

The roadmap describes save continuity and server-side evidence continuity as Phase 1 outcomes, while the executable plan deliberately sequences durable evidence APIs into Wave 3.

The corrected policy boundary is:

- Wave 2 save/autosave authority applies to the saved review record and `current_state_json` compatibility payload;
- Wave 2 may still round-trip the current frontend evidence shape inside `current_state_json` as a compatibility bridge when such data is already present in the questionnaire state;
- this does **not** redefine inline `dataUrl` or `previewDataUrl` fields as the durable evidence-storage model;
- save-state UI in Wave 2 must therefore describe questionnaire-state persistence truthfully and must not claim that durable backend asset storage is complete before Wave 3.

This resolves the sequencing tension without inventing a second evidence model.

### 3. The current questionnaire remains the working surface, but review identity and save authority move outside hash-only navigation

The current app identifies only the active page via hash. The executable plan requires a routed review shell with review identity owned outside hash state.

The corrected policy is:

- the workspace store remains the working draft engine for questionnaire content;
- review identity, concurrency metadata, and save status belong to the surrounding saved-review runtime;
- workspace hash changes do not create or select a saved review;
- route-owned review identity, not hash state, decides which server copy is being edited.

## Authoritative server-copy rules

The following rules are canonical for Wave 2.

1. **The server copy is the authoritative saved review.**
   - The backend live review record is the only authoritative saved state.
   - The frontend store is a working copy hydrated from that server record.

2. **The frontend working copy is authoritative only for the current unsaved editing session.**
   - Local edits may be newer than the last accepted server state.
   - They are not considered saved until the server accepts a write and returns updated concurrency metadata.

3. **The canonical save payload is the persisted review-record envelope plus `current_state_json`.**
   - Save operations write canonical questionnaire state, not derived state and not transient UI state.
   - `evaluation.workflow.mode` remains inside the canonical questionnaire state.
   - `lifecycle_state`, `current_etag`, `current_revision_number`, and similar review metadata remain outside the inner questionnaire payload.

4. **Derived state is never authoritative persisted state.**
   - Progress, validation summaries, completion percentages, and escalation counts are recomputed after hydrate.
   - Save success must never depend on serializing `derived` or `ui`.

5. **Hash, anchor, and panel state are not saved-review identity.**
   - Hash/sub-anchor movement is route-local workspace navigation only.
   - Save operations do not use hash changes as revision events.

6. **Conditionally hidden questionnaire content remains part of authoritative review state until explicitly removed.**
   - A visibility rule may hide a field in the current UI.
   - It does not authorize dropping previously saved values from the server copy.

7. **One open review workspace owns one outbound save queue.**
   - Multiple independent queues for the same review in the same tab are not allowed.
   - Multi-tab editing still counts as concurrent editing and is handled through stale-write rejection, not local coordination.

## Save-state vocabulary for Wave 2

The minimum save-status vocabulary exposed to the review shell and workspace chrome is:

| State | Meaning | User-visible implication |
|---|---|---|
| `clean` | Working copy matches the last accepted server state. | Nothing unsaved is pending. |
| `dirty` | Local edits exist that have not yet been accepted by the server. | Review can still be edited, but current changes are not saved yet. |
| `saving` | A conditional save request is in flight. | Further edits may continue locally and will be coalesced into the next queued write. |
| `saved` | The most recent queued write was accepted and the working copy now matches the server state. | Save timestamp and/or saved indicator may be shown. |
| `save_failed` | The most recent write failed for a recoverable non-conflict reason. | Retry is needed; local edits may still exist in memory. |
| `conflict` | The write was rejected because the client concurrency token is stale. | Autosave pauses until the conflict is resolved explicitly. |
| `offline_unsaved` | Network/session conditions prevent reaching the authoritative server while local edits exist. | Editing may continue in memory, but the UI must show that changes are not durably saved. |

`clean` and `saved` may share the same underlying payload equality but are distinct presentation states: `saved` is a recent acknowledgement event, while `clean` is the steady-state condition.

## Autosave behavior for Wave 2

### Core rule

Wave 2 uses **serialized full-state conditional writes** of the canonical questionnaire payload. It does not use field-level merge writes, background sync, or live collaborative patch streams.

### Autosave triggers

Autosave must be scheduled from canonical questionnaire-state mutations only.

#### Standard debounced autosave

- Start a save timer when the canonical questionnaire payload becomes `dirty`.
- Enqueue an autosave after **10 seconds of edit inactivity**.
- If continuous edits prevent an idle gap, enqueue a save no later than **60 seconds after the first unsaved mutation** in the current dirty window.

This freezes the default Wave 2 cadence. Later tuning may change these numbers only through an explicit contract update.

#### Immediate-flush triggers

The queue must attempt an immediate save when any of the following occurs and the working copy is dirty:

- explicit save action, if a manual save control is exposed;
- navigation away from the current review workspace to another review-shell subview or the dashboard;
- `visibilitychange` to `hidden`;
- `pagehide` / tab-close style lifecycle exit where the platform still allows a final request attempt;
- accepted lifecycle transitions such as handoff submit, second-review submit, final decision submit, reopen, publish, archive, or re-evaluation start;
- import completion or server-authoritative migration application.

### Queue serialization rules

The save queue must obey all of the following:

1. Only one write may be in flight per open review.
2. If additional edits occur while a write is in flight, they are coalesced into **one trailing queued save**, not a fan-out of multiple concurrent requests.
3. After an accepted write, the queue compares the latest local working copy to the newly acknowledged server snapshot. If they still differ, the trailing save proceeds immediately.
4. Save scheduling must ignore pure UI-only state changes such as drawer toggles, active panel tab, page visibility ratios, sidebar width, or active hash anchor.
5. The queue must remain scoped to the current review id. Opening a different review starts a different queue after the current dirty review either saves, conflicts, or is explicitly abandoned.

## Immutable revisions and checkpoint policy

### Revision creation rule

The save policy aligns with the already-frozen versioning policy as follows:

- every **accepted authoritative write** updates the live saved review record;
- every accepted authoritative write creates an immutable revision record with a `save_reason` or equivalent classification;
- every accepted lifecycle transition also creates an immutable revision.

This document does **not** change the versioning contract. It classifies which revisions count as surfaced checkpoints.

### Checkpoint revisions versus technical revisions

Not every revision needs equal prominence in the later review-history UI.

The canonical distinction is:

- **technical revision:** any immutable revision produced by an accepted write;
- **checkpoint revision:** a technical revision whose `save_reason` marks an institutionally meaningful review-history moment.

### Minimum `save_reason` vocabulary

The minimum `save_reason` classification set is:

| `save_reason` | Class | Meaning |
|---|---|---|
| `create_review` | checkpoint | Initial persisted review creation. |
| `autosave` | technical only by default | Debounced or forced background save during normal editing. |
| `manual_save` | checkpoint | User-triggered explicit save, if exposed. |
| `route_leave_flush` | technical only by default | Immediate save forced by leaving the current review route. |
| `visibility_flush` | technical only by default | Immediate save forced by tab/background exit conditions. |
| `lifecycle_transition` | checkpoint | Save coupled to an accepted workflow/lifecycle transition. |
| `import_apply` | checkpoint | Server-accepted import of a review package or legacy payload. |
| `migration_apply` | checkpoint | Server-authored schema/framework migration materialized as a new authoritative revision. |
| `conflict_recovery_save` | checkpoint | First accepted save after an explicit conflict-resolution reload/recovery step. |

If a later implementation needs finer labels, it may add them, but it must preserve the distinction between checkpoint and technical-only revisions.

### Minimum checkpoint set for surfaced review history

At minimum, the later review-history UI must surface checkpoint revisions for:

- review creation;
- explicit manual save, if the product exposes one;
- lifecycle transitions;
- import application;
- migration application;
- explicit post-conflict recovery saves.

Autosave-only revisions may appear in low-level audit/revision logs but should be collapsed or deemphasized in high-level history views by default.

This satisfies the roadmap requirement for “saved history at important moments” without forbidding finer-grained technical traceability.

## Optimistic concurrency behavior

### Concurrency token contract

The live review record exposes at least:

- `current_etag`;
- `current_revision_number`.

The client must send the expected server token on every write.

Canonical requirement:

- writes must be conditional using `If-Match: <current_etag>` or an exact equivalent request field;
- the server must reject stale writes instead of silently overwriting newer server state.

### Accepted write behavior

When a conditional write is accepted:

1. the backend updates the authoritative live review record;
2. the backend creates the immutable revision required by this policy and the versioning contract;
3. the backend returns the accepted review metadata including the new `current_etag`, `current_revision_number`, and accepted save timestamp;
4. the frontend updates its last-known authoritative metadata from the response and clears the acknowledged dirty window.

### Conflict behavior

When the server rejects a write because the client token is stale:

1. the frontend must enter `conflict` state;
2. the current autosave queue pauses;
3. the frontend must not automatically retry with overwrite;
4. the server copy remains authoritative;
5. the user must be shown that another accepted server state now exists.

### Wave 2 conflict-resolution scope

Wave 2 conflict handling is intentionally conservative.

Allowed in Wave 2:

- stale-write detection;
- visible conflict state in review chrome/workspace status;
- fetching the latest authoritative server copy for reload;
- preserving unsaved local edits in memory long enough for the user to inspect or manually copy them before reloading.

Explicitly not in scope for Wave 2:

- automatic three-way merge;
- field-level merge UI;
- CRDT or operational-transform collaboration;
- silent last-writer-wins overwrite;
- spawning parallel saved branches from the conflict screen;
- cross-tab coordination protocols stored in browser persistence.

### Session-expiry and authorization failures

Authentication/session failures are not conflict resolutions.

If a save fails because the session is gone or the user is no longer authorized:

- the frontend enters `save_failed` or `offline_unsaved` depending on reachability/context;
- the UI must state that local changes are not durably saved;
- the client must not relabel this as a merge conflict.

## Offline and crash-recovery policy for Wave 2

### Canonical rule

Wave 2 is **server-authoritative**, not offline-first.

### Allowed behavior

- A user may continue editing locally in memory while the network is temporarily unavailable.
- The UI may continue to show unsaved local edits and queue retry intent in memory for the lifetime of the current page session.
- The application may attempt another save automatically after connectivity returns during the same page session.

### Explicit non-goals for Wave 2

The following are out of scope and must not be implied by product copy or UI wording:

1. durable offline editing;
2. IndexedDB/localStorage/sessionStorage persistence of unsaved questionnaire answers as a second save system;
3. service-worker-backed background sync;
4. guaranteed crash recovery after browser/tab termination;
5. simultaneous live co-editing;
6. field-level merge or review-branch creation;
7. durable evidence-asset upload guarantees before Wave 3 completes the evidence-storage contract.

### Small browser persistence exception

The existing browser persistence of small UI preferences, such as sidebar width, remains allowed because it is not review content and does not represent a second review-save system.

## Concrete downstream implementation requirements

| File or module | Requirement created by this policy |
|---|---|
| `static/js/state/store.js` | Future persistence integration may add a save-meta layer outside `evaluation`, but it must not add save/concurrency metadata into canonical questionnaire state. Dirty tracking must be derived from canonical questionnaire payload only. |
| `static/js/behavior/navigation.js` | Any save-status indicator or conflict banner added in Wave 2 must consume runtime save metadata from the review shell/save queue rather than deriving save truth from navigation state. |
| `static/js/app.js` | Workspace bootstrap must block editable entry until the latest authoritative review snapshot and concurrency metadata are loaded. |
| `static/js/utils/save-queue.js` | Must implement the debounce, max-dirty-age, immediate-flush, serialization, and pause-on-conflict rules frozen here. |
| `static/js/api/review-state.js` | Must send conditional writes and expose accepted save metadata back to the queue/controller layer. |
| `server/routes/evaluations.js` | Must reject stale writes and return updated concurrency metadata on accepted writes. |
| `server/repositories/evaluations.js` | Must update the live saved review record and concurrency metadata atomically. |
| `server/repositories/revisions.js` | Must persist immutable revisions with `save_reason` classification so checkpoint and technical revisions can be distinguished later. |
| `tests/unit/state/store-persistence.test.js` | Must verify that questionnaire-state round-trips do not persist UI-only state and that hidden conditional values survive hydrate/save cycles. |
| `tests/e2e/review-persistence.spec.js` | Must cover open -> edit -> autosave -> reload -> resume and stale-write conflict presentation. |

## Contract summary

For Wave 2, the backend live review record is the only authoritative saved copy. The frontend questionnaire store remains a working copy wrapped by one serialized conditional save queue. Autosave is debounced, immediate flushes occur on meaningful review-exit or lifecycle events, accepted writes create immutable revisions, and a narrower checkpoint subset defines meaningful saved history. Conflicts are detected through stale-write rejection and surfaced explicitly, with no automatic merge and no offline-first crash-recovery promise in Wave 2.
