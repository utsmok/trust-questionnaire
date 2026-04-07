# Evidence model contract

Date: 2026-04-06
Status: Wave 0 / T002 substream A complete
Scope: durable evidence asset/link contract and current-questionnaire compatibility boundary

This document freezes the **evidence-model** portion of T002 for the current repository. It defines the corrected file-level interpretation of the live runtime, the durable split between evidence assets and evidence links, the distinction between evidence metadata and provenance, the reserved future review-inbox target, and the compatibility constraints required to keep the current questionnaire workspace functioning while evidence moves out of browser-only state.

This document is intentionally narrower than the full T002 task bundle. It does **not** replace the planned dedicated manifest-compatibility or import/export package documents. It freezes the durable evidence model now so later backend, import/export, tooling, and extension work do not drift.

## What this document freezes

- one durable evidence system for manual uploads, pasted items, imported manifests, and later extension captures;
- the separation between a durable **evidence asset** and a durable **evidence link**;
- the distinction between **asset metadata**, **link metadata**, and **provenance**;
- review-level and criterion-level link semantics, with a reserved future review-inbox target;
- preservation of current `assetId` reuse semantics as the migration bridge;
- the compatibility boundary between the durable model and the current `EvaluationState.evidence` shape;
- the current runtime ambiguities that are real and must be documented rather than guessed away.

## Canonical terminology used here

| Term | Meaning |
|---|---|
| **Evidence asset** | One durable stored evidence object. It represents the uploaded file, captured screenshot, imported artifact, URL capture, selection capture, or metadata-only record once. |
| **Evidence link** | One review-scoped association from a review target to one evidence asset. A single asset may have multiple links. |
| **Review-level link** | Durable link whose target is the review overall. The current runtime uses the scope label `evaluation` for this concept. |
| **Criterion-level link** | Durable link whose target is one criterion such as `TR1` or `SE3`. |
| **Review inbox link** | Reserved future durable target for unsorted captured evidence. Not yet represented in the current questionnaire state shape. |
| **Compatibility evidence item** | The current combined in-memory object that carries both asset-like fields and link-like fields inside `EvaluationState.evidence`. It is a migration bridge, not the durable source-of-truth schema. |

## Corrected first-pass file-level requirements

The first-pass T002 evidence-model analysis was reviewed against the roadmap, the executable implementation plan, the backend/tooling plans, and the current runtime code. The corrected file-level requirements are:

| File | Current responsibility | Contract requirement frozen here |
|---|---|---|
| `static/js/state/store.js` | Defines `EvaluationState.evidence` as `evaluation[]` plus `criteria[criterionCode][]`; clones and normalizes compatibility evidence items inside the questionnaire state. | `EvaluationState.evidence` remains a **compatibility projection** for the current questionnaire workspace. It is not the durable source-of-truth once backend evidence persistence exists. The durable source-of-truth becomes assets plus links outside the questionnaire-state JSON, with projection back into the compatibility shape only when needed for the current UI. |
| `static/js/state/evidence-actions.js` | Normalizes evidence items, assigns `id`, preserves `assetId`, supports reuse/replace/unlink/remove flows, and demonstrates that one asset may back multiple criterion associations. | `id` must remain the **link/association identifier**. `assetId` must remain the **asset reuse identifier**. `note` and `evidenceType` are frozen as **link metadata**, not asset metadata, because reuse and replace flows can change them per association. |
| `static/js/render/evidence.js` | Mounts review-level evidence on the Section `S2` workspace surface, mounts criterion-level evidence inside criterion cards, supports export-manifest, add/reuse/replace/unlink/remove flows, and exposes the user-facing evidence vocabulary. | The current `S2` mount point is a **workspace placement choice**, not the durable semantic definition of review-level scope. The durable contract therefore treats review-level links as review-scoped even though the current UI renders them on `S2`. The contract must also preserve one-asset-many-links behavior and must not invent a visible review-inbox surface yet. |
| `static/js/adapters/evidence-storage.js` | Generates manifest JSON from the current in-memory compatibility shape. It is an export adapter only. | Manifest generation is a **derived compatibility/export view**, not the durable persistence contract. The durable model must be able to emit a manifest-compatible representation later, but the manifest shape does not define storage truth. |
| `docs/contracts/review-state-contract.md` | Already freezes that `current_state_json.evidence` preserves the current frontend shape only for compatibility and explicitly says `dataUrl` / `previewDataUrl` are not the durable storage contract. | T002 narrows that statement into a concrete asset/link split. The review-state contract remains valid, but the durable evidence source-of-truth is no longer inferred from the compatibility evidence arrays. |
| `docs/trust-questionnaire.md` | Still describes separate criterion `Evidence summary` and `Evidence links` questionnaire fields and an `Evidence folder link` workflow artifact. | This document remains a questionnaire-content specification, not the authoritative runtime or durable evidence-storage model. T002 freezes that current runtime evidence continuity is based on assets + links and the merged runtime evidence behavior, not on restoring a separate per-criterion `Evidence links` storage model. |

## Roadmap and executable-plan mismatch corrections applied before freezing the contract

The following mismatches were corrected before writing the durable contract.

| Drift risk | Corrected contract position |
|---|---|
| Treating `EvaluationState.evidence` as the durable evidence store because it currently contains all evidence data. | Corrected: it is a compatibility DTO for the current questionnaire. Durable persistence stores assets and links separately and projects them back into the DTO only when the current UI needs it. |
| Treating current scope `evaluation` as “Section `S2` evidence” because the UI renders it there. | Corrected: `evaluation` in the current runtime means **review-level** evidence. `S2` is the current workspace mount location only. Durable review-level links are not semantically defined by Section `S2`. |
| Treating the combined compatibility item object as a single entity in which file metadata, link metadata, and provenance are inseparable. | Corrected: the durable model separates physical asset identity from scoped link identity and further separates descriptive metadata from provenance fields. |
| Treating manifest JSON as the storage schema because it is the only current export representation. | Corrected: the manifest is an export/migration surface only. The durable evidence model is defined independently of the manifest serializer. |
| Treating current `addedAt` as an unambiguous durable timestamp. | Corrected: current `addedAt` is ambiguous between intake-time and link-time semantics. Durable storage must keep explicit asset-level and link-level timestamps instead of inferring one meaning from `addedAt`. |
| Treating the future review inbox as an already-existing current runtime target. | Corrected: the durable contract reserves `review_inbox`, but the current questionnaire state shape and UI do not yet expose it. |

## Reconciliation against roadmap and Wave 0 plan constraints

The corrected contract reflects the following non-negotiable constraints from the roadmap and executable plan:

1. **One evidence system, not multiple side systems.** Manual uploads, pasted items, imported artifacts, and later extension captures must all land in the same durable asset/link model.
2. **Asset/link separation is mandatory.** This is a Wave 0 requirement, not a later refactor, because later evidence APIs, import/export, test runs, and extension capture all depend on it.
3. **Current `assetId` reuse semantics are preserved.** The durable `asset_id` remains the migration bridge that allows one stored asset to support multiple scoped links.
4. **Review-level and criterion-level links are both first-class.** The roadmap’s “review-level evidence” and the runtime’s `evaluation` scope refer to the same concept; the contract freezes the semantic equivalence explicitly.
5. **A review-scoped inbox target is reserved now.** It is durable-contract scope only for now, not an exposed questionnaire-state/UI slot.
6. **Durable evidence bytes live outside questionnaire JSON.** The durable model must not require inline `dataUrl` / `previewDataUrl` fields.
7. **Manifest continuity must remain possible.** The durable model must be able to emit a manifest-compatible view even though the manifest is not the durable storage schema.

## Core durable model

The durable evidence model has two record types:

1. a durable **evidence asset** record stored once; and
2. one or more durable **evidence link** records that attach that asset to a review target.

The durable model uses backend-oriented snake_case field names below. The current questionnaire compatibility DTO retains the existing camelCase item shape separately.

### Evidence asset — required durable core

| Field | Type | Required | Notes |
|---|---|---|---|
| `asset_id` | string | Yes | Stable durable asset identifier. Migration target for current `assetId`. |
| `asset_kind` | enum | Yes | Classification of the stored thing itself. Initial allowed values: `image`, `document`, `export`, `url`, `selection`, `metadata_only`. |
| `source_type` | enum | Yes | Intake path. Initial allowed values: `manual_upload`, `drag_drop`, `clipboard`, `pasted_url`, `extension_capture`, `manifest_import`. |
| `storage_provider` | string or null | Conditional | Required when the asset has durable stored bytes or managed external storage. |
| `storage_key` | string or null | Conditional | Required when the asset has durable stored bytes. Not required for `metadata_only` or pure `url` assets. |
| `content_hash` | string or null | Recommended | Hash/checksum of the durable payload when one exists. Required for binary-file ingestion once backend storage is implemented. |
| `created_by_user_id` | string | Yes | Actor that created or imported the durable asset record. |
| `created_at` | ISO-8601 timestamp | Yes | Server-side durable asset creation time. |
| `deleted_at` | ISO-8601 timestamp or null | Reserved | Soft-delete/tombstone support for later governance and retention work. |

### Evidence asset — descriptive metadata

These fields describe the captured thing itself. They are **asset metadata**, not link metadata.

| Field | Type | Status | Notes |
|---|---|---|---|
| `original_name` | string or null | Recommended | Source filename or human label from intake. |
| `sanitized_name` | string or null | Recommended | Durable safe display/download name. |
| `mime_type` | string or null | Recommended | MIME type of the stored thing. |
| `size_bytes` | integer or null | Recommended | Durable payload size. |
| `image_width` | integer or null | Reserved | Useful for preview handling later. |
| `image_height` | integer or null | Reserved | Useful for preview handling later. |
| `preview_storage_key` | string or null | Reserved | Separate preview rendition key if previews become server-generated. |

### Evidence asset — provenance fields

These fields record origin and chain-of-custody. They are **provenance**, not user-facing classification metadata.

| Field | Type | Status | Notes |
|---|---|---|---|
| `captured_at_client` | ISO-8601 timestamp or null | Recommended | Best client-side capture/import time, if known. |
| `received_at_server` | ISO-8601 timestamp | Recommended | Server receipt time; may equal `created_at`. |
| `origin_url` | string or null | Recommended | Page or source URL when applicable. |
| `origin_title` | string or null | Recommended | Page or document title when applicable. |
| `capture_tool_version` | string or null | Reserved | Useful for later extension and import provenance. |
| `browser_name` | string or null | Reserved | Browser provenance for extension capture. |
| `browser_version` | string or null | Reserved | Browser provenance for extension capture. |
| `page_language` | string or null | Reserved | Page language metadata when captured from the browser. |
| `redaction_status` | enum or null | Reserved | Future review/compliance control; do not infer from current runtime. |
| `import_source` | string or null | Reserved | Identifies manifest/import pathway where applicable. |

### Evidence link — required durable core

| Field | Type | Required | Notes |
|---|---|---|---|
| `link_id` | string | Yes | Stable durable association identifier. Migration target for current item `id`. |
| `review_id` | string | Yes | Review to which the asset is linked. |
| `asset_id` | string | Yes | Durable asset referenced by this link. |
| `scope_type` | enum | Yes | Initial canonical values: `evaluation`, `criterion`, `review_inbox`. The current runtime string `evaluation` is the review-level scope label. |
| `section_id` | string or null | Conditional | Required for `criterion`; nullable for `evaluation` and `review_inbox` in durable storage. |
| `criterion_code` | string or null | Conditional | Required for `criterion`; null for `evaluation` and `review_inbox`. |
| `evidence_type` | string | Yes | User-facing classification of the link context. This is **link metadata**, not asset metadata. |
| `note` | string | Yes | User annotation for this link. This is **link metadata**, not asset metadata. |
| `linked_by_user_id` | string | Yes | Actor that created the link. |
| `linked_at` | ISO-8601 timestamp | Yes | Timestamp for creation of this specific link. |
| `replaced_from_link_id` | string or null | Reserved | Supports replace flows without losing history later. |
| `deleted_at` | ISO-8601 timestamp or null | Reserved | Soft-delete/tombstone support for later audit/retention behavior. |

### Evidence link — provenance extensions reserved for later phases

| Field | Type | Status | Notes |
|---|---|---|---|
| `source_test_run_id` | string or null | Reserved | For later review-linked test-run traceability. |
| `source_test_case_id` | string or null | Reserved | For later review-linked test-run traceability. |
| `source_test_set_revision_id` | string or null | Reserved | For later review-linked test-run traceability. |
| `import_manifest_item_id` | string or null | Reserved | Useful when imported links must trace back to a legacy manifest item. |
| `linked_via_capture_event_id` | string or null | Reserved | Future extension/upload provenance linkage. |

## Contract invariants

The durable evidence model is only compliant if all of the following remain true:

1. **One asset may support multiple links.**
   - One durable asset may be linked at review level and criterion level.
   - Each durable link references exactly one durable asset.

2. **`asset_id` and `link_id` are not interchangeable.**
   - `asset_id` identifies the reusable stored object.
   - `link_id` identifies one scoped association.

3. **`evidence_type` and `note` belong to the link, not the asset.**
   - Current reuse/replace behavior already demonstrates this.
   - The same asset may have different notes or link classifications in different contexts.

4. **Review-level scope is not defined by `S2`.**
   - Durable `scope_type = evaluation` means review-level association.
   - `S2` is the current questionnaire surface where review-level evidence is rendered.

5. **Criterion-level links must carry criterion identity explicitly.**
   - `scope_type = criterion` requires `criterion_code`.
   - `section_id` must match the criterion’s owning section.

6. **Review inbox is reserved but not projected into the current questionnaire state.**
   - `scope_type = review_inbox` is valid in the durable contract.
   - It must not be silently flattened into `evaluation.evidence.evaluation` for the current questionnaire UI.

7. **Removing a link is not the same as deleting an asset.**
   - Unlinking one association must not imply removal of the durable asset if other links still reference it.
   - Deleting an asset implies removing or tombstoning all of its links.

8. **Cross-review asset reuse is not frozen by this contract.**
   - The contract requires link reuse within a review.
   - It does not require or forbid cross-review deduplication; that policy remains open.

## Current-questionnaire compatibility contract

The current questionnaire runtime still expects the existing `EvaluationState.evidence` shape:

- `evaluation.evidence.evaluation`: array of review-level compatibility evidence items;
- `evaluation.evidence.criteria[criterionCode]`: criterion-keyed arrays of compatibility evidence items.

The durable model must therefore support a projection layer from durable assets + links into the current compatibility DTO.

### Compatibility mapping from durable records to the current item shape

| Current compatibility item field | Durable source | Notes |
|---|---|---|
| `id` | `link_id` | Current item `id` remains the association identifier. |
| `assetId` | `asset_id` | Current reuse key survives unchanged as the migration bridge. |
| `scope` | `scope_type` | Current runtime values remain `evaluation` and `criterion`. `review_inbox` has no current DTO slot. |
| `sectionId` | `section_id` or compatibility projection | For `criterion`, use the durable `section_id`. For `evaluation`, current-questionnaire projection may emit `S2` because the UI mounts review-level evidence there. Durable storage itself does not require `section_id = S2`. |
| `criterionCode` | `criterion_code` | Null for review-level links. |
| `evidenceType` | `evidence_type` | Link metadata. |
| `note` | `note` | Link metadata. |
| `name` | `original_name` / `sanitized_name` | Asset metadata projected into the current DTO. |
| `mimeType` | `mime_type` | Asset metadata projected into the current DTO. |
| `size` | `size_bytes` | Asset metadata projected into the current DTO. |
| `isImage` | derived from `asset_kind` / `mime_type` | Compatibility convenience field only. |
| `dataUrl` | transient client hydration aid only | Not canonical durable storage. |
| `previewDataUrl` | transient client hydration aid only | Not canonical durable storage. |
| `addedAt` | compatibility-only legacy timestamp | Ambiguous in the current runtime; do not infer canonical durable semantics from it. |

### Compatibility constraints that must remain true

1. The durable model must be able to project all current `evaluation` and `criterion` links into the current questionnaire state shape without inventing a second evidence system.
2. The current questionnaire may continue to hold `dataUrl` / `previewDataUrl` transiently for local preview/export compatibility, but durable persistence must not require them.
3. The durable model must preserve `assetId` continuity when migrating legacy/current runtime state.
4. The durable model must preserve separate link notes when one asset is reused across multiple criteria.
5. The current questionnaire has **no** compatibility slot for `review_inbox`; durable inbox items must remain outside `EvaluationState.evidence` until a dedicated review-inbox surface exists.
6. The questionnaire-content document `docs/trust-questionnaire.md` is not the authoritative runtime storage model for evidence links. It remains a questionnaire-specification document and currently drifts from runtime evidence behavior.

## Manifest and export continuity minimum

The current manifest/export adapter in `static/js/adapters/evidence-storage.js` is versioned as `EVIDENCE_MANIFEST_VERSION = 1` and serializes the current compatibility evidence items.

This contract freezes the following minimum continuity requirement:

1. The durable evidence model must be able to emit a manifest-compatible representation for current `evaluation` and `criterion` links.
2. Manifest emission remains a **derived export** over the durable model rather than a persistence schema.
3. `assetId` and item `id` continuity must remain representable in the export path.
4. Current manifest v1 does **not** represent `review_inbox`. That gap is documented here and must be handled explicitly in the later manifest-compatibility contract rather than guessed away.

## Clinically documented runtime ambiguities

The current runtime contains real ambiguities. They are frozen here as known constraints instead of being papered over.

### A1. `addedAt` is not semantically clean today

Observed behavior:

- uploaded/pasted compatibility items carry one `addedAt` field;
- reused criterion associations may inherit the source item’s `addedAt` rather than a new link-creation time.

Contract handling:

- durable storage must keep explicit asset-level and link-level timestamps;
- compatibility `addedAt` is legacy and ambiguous;
- no downstream system may infer from `addedAt` alone whether it means capture time, upload time, or link time.

### A2. Review-level items currently project through Section `S2`

Observed behavior:

- the current questionnaire renders review-level evidence on `S2` and defaults evaluation-scope compatibility items to `sectionId = S2`.

Contract handling:

- durable `scope_type = evaluation` means review-level evidence link;
- `S2` is treated as the current workspace mount/projection location only;
- durable storage may keep `section_id` null for review-level links.

### A3. Inline `dataUrl` / `previewDataUrl` fields are current-session compatibility fields only

Observed behavior:

- current evidence intake stores binary payloads inline for preview and export;
- current manifest export can therefore serialize inline content.

Contract handling:

- durable storage must not require inline data URLs;
- later backend implementations may hydrate temporary download/preview URLs into the compatibility DTO when the current UI needs them.

### A4. The current runtime does not yet express review inbox state

Observed behavior:

- current store and UI support only `evaluation` and `criterion` scopes.

Contract handling:

- `review_inbox` is frozen as a reserved durable scope now;
- it must remain a durable-only concept until later tooling/extension work exposes a surface for it.

### A5. Current docs and current runtime do not describe evidence the same way

Observed behavior:

- `docs/trust-questionnaire.md` still speaks in terms of separate criterion `Evidence summary` and `Evidence links` questionnaire fields plus an evidence-folder link;
- current runtime behavior stores merged evidence items with reusable `assetId` semantics and no separate primary runtime `Evidence links` structure.

Contract handling:

- this contract freezes the runtime-compatible durable model as assets + links;
- it does not guess that the questionnaire-spec wording is already reconciled;
- later document reconciliation must be explicit.

## Explicit non-goals

This document does **not** do any of the following:

- define the full manifest-compatibility rules for every export/import edge case;
- define the ZIP/package contract for export/import bundles;
- define upload session APIs, signed-upload flows, or download authorization endpoints;
- define cross-review deduplication policy as a requirement;
- define the user-facing review inbox UI or routing model;
- define test-set or test-run entities beyond the reserved provenance fields needed to avoid later churn.

## Acceptance condition for downstream work

Any implementation that claims compliance with this contract must satisfy all of the following:

- durable persistence stores separate evidence assets and evidence links;
- `asset_id` and `link_id` remain separate and migration-compatible with current `assetId` and `id` semantics;
- `evidence_type` and `note` are stored as link metadata rather than asset metadata;
- review-level and criterion-level links are both supported, and `review_inbox` remains reserved without being faked into the current questionnaire state;
- the durable model does not require inline `dataUrl` / `previewDataUrl` fields;
- the current questionnaire can still be hydrated through a compatibility projection rather than a second evidence system;
- current runtime ambiguities are handled explicitly rather than silently reinterpreted.
