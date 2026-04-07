# Evidence manifest compatibility contract

Date: 2026-04-06
Status: Wave 0 / T002 substream B complete
Scope: legacy evidence-manifest v1 compatibility, durable asset/link mapping, and public import boundaries only

This document freezes the **evidence-manifest compatibility** portion of T002 for the current repository. It defines the legacy browser-era evidence manifest shape that must remain supported, the exact version markers that distinguish that format from the canonical review-export package, the mapping rules from manifest items into the durable evidence asset/link model, and the explicit unsupported inputs that later backend import code must reject rather than guess at.

This document is intentionally narrower than the full T002 task bundle. It does **not** replace `docs/contracts/evidence-model-contract.md` or `docs/contracts/import-export-package-contract.md`; it defines the compatibility bridge between the current browser-only manifest export and the later durable evidence/import/export system.

## What this document freezes

- the exact legacy manifest family produced by the current runtime evidence exporter;
- the required version markers and filenames that identify that legacy family;
- the supported top-level JSON shape and the required structural invariants inside it;
- the mapping of legacy manifest items into durable `evidence assets` and `evidence links`;
- the review-level versus criterion-level compatibility rules, including the `S2` projection boundary;
- the fact that legacy manifest v1 has **no** review-inbox representation;
- the public import boundaries for standalone manifest JSON and narrow ZIP bundle forms;
- the explicit malformed or out-of-contract inputs that later import code must reject.

## Corrected first-pass file-level requirements

The first-pass manifest-compatibility analysis was completed against the live runtime exporter, the evidence UI, the current tests, and the new T002 contracts. The corrected file-level requirements are:

| File | Current responsibility | Compatibility requirement frozen here |
|---|---|---|
| `static/js/state/evidence-actions.js` | Normalizes compatibility evidence items before they enter `EvaluationState.evidence`, defaults review-level `sectionId` to `S2`, preserves `assetId` reuse, and treats item `id` as the association identity. | Legacy manifest compatibility must preserve current `assetId` reuse semantics and link-level `id` semantics. The `S2` default is a current-questionnaire projection for review-level evidence, not the durable semantic definition of review scope. |
| `static/js/adapters/evidence-storage.js` | Defines `EVIDENCE_MANIFEST_VERSION = 1`, canonicalizes exported item fields, and emits the root `schemaVersion/generatedAt/evaluation/sections/criteria/summary` structure. | Legacy manifest v1 compatibility is anchored to this emitted shape. Public compatibility support covers the canonical emitted manifest DTO, not arbitrary pre-serialization aliases or undocumented local-state objects. |
| `static/js/render/evidence.js` | Exposes the user-facing export action and downloads `trust-evidence-manifest.json` from the evaluation evidence block. | The current manifest export remains an evidence-only compatibility surface. Its filename and export trigger remain stable and must not be silently repurposed into the canonical full-review export. |
| `tests/e2e/evidence.spec.js` | Locks the manifest download filename and the existence of the export path through the current UI. | Compatibility work must preserve `trust-evidence-manifest.json` as the legacy export filename and must not remove the evaluation-block export path without stronger equivalent coverage. |
| `docs/contracts/evidence-model-contract.md` | Freezes the durable asset/link model and states that review-level `scope_type = evaluation` is not semantically defined by `S2`. | Legacy manifest compatibility must project review-level links back to `sectionId = S2` for current-runtime continuity while keeping canonical durable `section_id` nullable for review-level links. |
| `docs/contracts/import-export-package-contract.md` | Freezes the canonical review-export package and the legacy-manifest import class. | The canonical package must treat review-level `section_id` as conditional/null-capable. `S2` belongs to the manifest-compatible legacy projection only. This mismatch was corrected before freezing this document. |

## Runtime export behavior that defines `legacy_evidence_manifest_v1`

The current runtime behavior is defined by `static/js/adapters/evidence-storage.js` and `static/js/render/evidence.js`.

### Export surface

- The current UI exports the manifest only from the **evaluation-level** evidence block.
- The downloaded filename is **`trust-evidence-manifest.json`**.
- The exported document is an **evidence-only compatibility export**, not a full review export.
- The current runtime has **no** review-inbox export path.

### Root manifest shape emitted today

The current exporter always emits an object with these top-level keys:

- `schemaVersion`
- `generatedAt`
- `evaluation`
- `sections`
- `criteria`
- `summary`

The current exporter does **not** emit any of the following in the legacy manifest:

- `review_id`
- `public_id`
- `state_schema_version`
- `framework_version`
- `workflow_mode`
- `lifecycle_state`
- revision history
- collaboration metadata
- audit events
- review-inbox links

That absence is part of the contract. `legacy_evidence_manifest_v1` is evidence-only and cannot stand in for the canonical review export package.

### Item canonicalization behavior emitted today

`serializeEvidenceItem()` in `static/js/adapters/evidence-storage.js` currently does all of the following before writing the manifest:

1. Ignores non-plain-object values.
2. Emits canonical exported item keys in **camelCase**.
3. Uses `assetId` as the canonical output field even if the source item arrived as `asset_id`.
4. Uses `name` as the canonical output field even if the source item arrived as `filename`, `fileName`, or `label`.
5. Uses `evidenceType` as the canonical output field even if the source item arrived as `type`.
6. Uses `note` as the canonical output field even if the source item arrived as `notes`.
7. Uses `dataUrl` as the canonical output field even if the source item arrived as `url` or `href`.
8. Uses `addedAt` as the canonical output field even if the source item arrived as `createdAt` or `uploadedAt`.
9. Forces `scope = criterion` when `criterionCode` is present.
10. Defaults review-level exported `sectionId` to `S2`.
11. Derives criterion exported `sectionId` from the criterion registry when `criterionCode` is present.
12. Derives `previewDataUrl` from `dataUrl` for image items when no explicit preview exists.

Compatibility consequence:

- the **exported manifest shape** is canonical for public legacy support;
- the **pre-serialization source aliases** above are runtime-ingress conveniences only;
- public legacy import support must not promise to accept arbitrary source-alias objects that were never serialized as the manifest format.

## Required legacy identity and version markers

The legacy manifest family is identified by the following markers.

| Marker | Required value | Notes |
|---|---|---|
| Compatibility class | `legacy_evidence_manifest_v1` | This class name is used by the T002 contracts and later import/export APIs. It is an external contract label, not a JSON field. |
| Standalone export filename | `trust-evidence-manifest.json` | The current runtime download must keep this filename. |
| ZIP manifest member path | exactly one of `trust-evidence-manifest.json` or `evidence/trust-evidence-manifest.json` | Standalone imports use the root filename. Canonical review packages place the compatibility file under `evidence/`. |
| Serialized version marker | `schemaVersion: 1` | Required top-level JSON field. This is the only serialized format-version marker in legacy manifest v1. |
| Timestamp marker | `generatedAt` = ISO-8601 string | Required top-level timestamp emitted by the exporter. |

### Version-marker boundary

Legacy manifest v1 intentionally does **not** carry the review-state version markers required by the saved-review contract.

Therefore:

- `state_schema_version` is **not** part of `legacy_evidence_manifest_v1`;
- `framework_version` is **not** part of `legacy_evidence_manifest_v1`;
- later public import of a legacy manifest must target an **existing review**;
- a legacy manifest must never be treated as a complete review-record import.

## Supported legacy manifest v1 structure

### Top-level object

| Key | Required | Shape | Notes |
|---|---|---|---|
| `schemaVersion` | Yes | integer | Must equal `1`. |
| `generatedAt` | Yes | string | Must be an ISO-8601 timestamp string. |
| `evaluation` | Yes | object | Review-level evidence block. |
| `sections` | Yes | object | Compatibility grouping by visible workspace section. |
| `criteria` | Yes | object | Criterion-keyed compatibility entries. |
| `summary` | Yes | object | Redundant count block used for consistency validation. |

### `evaluation`

| Key | Required | Shape | Notes |
|---|---|---|---|
| `itemCount` | Yes | integer | Must equal `evaluation.items.length`. |
| `items` | Yes | array | Review-level compatibility items only. |

Supported `evaluation.items[*]` rules:

- `scope` must be `evaluation`.
- `sectionId` must be `S2`.
- `criterionCode` must be `null` or absent.

### `sections`

The supported legacy manifest v1 `sections` object must contain exactly these compatibility groupings from the current runtime:

- `S2`
- `TR`
- `RE`
- `UC`
- `SE`
- `TC`

Supported section-entry shapes:

| Section key | Required keys | Notes |
|---|---|---|
| `S2` | `sectionId`, `scope`, `itemCount`, `items` | `scope` must be `evaluation`. `items` must mirror `evaluation.items`. |
| `TR`, `RE`, `UC`, `SE`, `TC` | `sectionId`, `scope`, `criterionCodes`, `itemCount`, `criteria` | `scope` must be `criterion`. `criteria` entries must mirror top-level `criteria[*]`. |

The legacy manifest v1 shape does **not** support section groupings for `S0`, `S1`, `S8`, `S9`, `S10A`, `S10B`, or `S10C`.

### `criteria`

The supported legacy manifest v1 `criteria` object must contain one entry for every current runtime criterion code.

Current required criterion-code set:

- `TR1`, `TR2`, `TR3`
- `RE1`, `RE2`, `RE3`
- `UC1`, `UC2`, `UC3`
- `SE1`, `SE2`, `SE3`, `SE4`
- `TC1`, `TC2`, `TC3`

Each criterion entry must contain:

| Key | Required | Shape | Notes |
|---|---|---|---|
| `criterionCode` | Yes | string | Must match the containing criterion key. |
| `sectionId` | Yes | string | Must match the owning principle section. |
| `itemCount` | Yes | integer | Must equal `items.length`. |
| `items` | Yes | array | Criterion-level compatibility items only. |

Supported `criteria[*].items[*]` rules:

- `scope` must be `criterion`.
- `criterionCode` must match the containing criterion entry.
- `sectionId` must match the owning section for that criterion.

### `summary`

| Key | Required | Shape | Notes |
|---|---|---|---|
| `evaluationItemCount` | Yes | integer | Must equal `evaluation.itemCount`. |
| `criterionItemCount` | Yes | integer | Must equal the sum of all top-level criterion `itemCount` values. |
| `totalItemCount` | Yes | integer | Must equal `evaluationItemCount + criterionItemCount`. |

### Canonical item DTO

The public legacy manifest shape is the canonical emitted item DTO from `serializeEvidenceItem()`.

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | Yes | string | Non-empty string. Legacy association identity. Must be unique across all items in the manifest. |
| `assetId` | Yes | string | Non-empty string. May repeat across multiple items to represent one reused asset with multiple links. |
| `scope` | Yes | string | Must be `evaluation` or `criterion`. |
| `sectionId` | Yes | string | `S2` for `evaluation`; owning principle section for `criterion`. |
| `criterionCode` | Conditional | string or null | Required for `criterion`; null or absent for `evaluation`. |
| `evidenceType` | Yes | string | Non-empty string. Link metadata. |
| `name` | Yes | string | Non-empty string. Display/source filename or label. |
| `note` | Yes | string | Non-empty string. Link metadata. |
| `mimeType` | No | string or null | Optional content type. |
| `size` | No | integer or null | Optional non-negative size. |
| `isImage` | Yes | boolean | Convenience compatibility field. |
| `dataUrl` | No | string or null | Either `null` or a `data:` URL. Not a durable storage field. |
| `previewDataUrl` | No | string or null | Either `null` or a `data:` URL. Preview-only compatibility field. |
| `addedAt` | No | string or null | Legacy timestamp only. Best treated as ambiguous provenance, not canonical link time. |

Compatibility note:

- the canonical exported item DTO uses the camelCase fields above;
- public legacy import support does **not** guarantee support for alias-only keys such as `asset_id`, `filename`, `fileName`, `label`, `type`, `notes`, `url`, `href`, `createdAt`, or `uploadedAt` unless those have already been normalized into the canonical exported shape before import.

## Structural consistency rules

A manifest is within the supported legacy family only if all of the following remain true:

1. **Top-level markers are present and exact.**
   - `schemaVersion` exists and equals `1`.
   - `generatedAt` exists and is a string.

2. **The top-level shape is complete.**
   - `evaluation`, `sections`, `criteria`, and `summary` are all present.

3. **Evaluation block counts match.**
   - `evaluation.itemCount === evaluation.items.length`.

4. **Section-group shape matches the current exporter.**
   - `sections.S2` mirrors `evaluation.items`.
   - each principle section entry mirrors the corresponding `criteria[*]` entries.

5. **Criterion coverage is complete.**
   - all current runtime criterion codes are present in `criteria`.
   - missing zero-count criterion entries are not part of the supported public shape.

6. **Summary counts match actual content.**
   - `summary.evaluationItemCount === evaluation.itemCount`.
   - `summary.criterionItemCount === sum(criteria[*].itemCount)`.
   - `summary.totalItemCount === summary.evaluationItemCount + summary.criterionItemCount`.

7. **Item placement matches item scope.**
   - `evaluation.items[*]` may only contain `scope = evaluation` items.
   - `criteria[*].items[*]` may only contain `scope = criterion` items.

8. **Item identity rules remain intact.**
   - `id` values are unique across the whole manifest.
   - repeated `assetId` values are allowed and mean asset reuse.

9. **Repeated `assetId` values must not conflict on asset-defining fields.**
   - repeated items sharing the same `assetId` may differ in `note`, `evidenceType`, `scope`, `sectionId`, and `criterionCode`;
   - they must not conflict materially on `name`, `mimeType`, `size`, `isImage`, or binary-payload source.

10. **Legacy manifest v1 has no inbox representation.**
    - no supported item may use `scope = review_inbox`;
    - no supported manifest section/group may encode a review inbox.

## Mapping rules into the durable asset/link model

Legacy manifest compatibility imports an evidence-only manifest into the durable T002 evidence model defined in `docs/contracts/evidence-model-contract.md`.

### Review ownership and actor attribution

Because legacy manifest v1 is evidence-only:

- `review_id` comes from the import target, not from the manifest;
- `linked_by_user_id` is the importing actor, not data recovered from the manifest;
- `created_by_user_id` for imported assets is the importing actor unless operator tooling records a stronger historical actor mapping;
- `linked_at` is the durable import/link creation time, not the legacy `addedAt` value.

### Durable link mapping rules

| Legacy source | Durable target | Mapping rule |
|---|---|---|
| `item.id` | `link_id` | Reuse the legacy `id` when it is collision-free and storage-safe. If the system must assign a new durable id, preserve the legacy `id` as import provenance via `import_manifest_item_id`. |
| import target | `review_id` | The destination review is determined by the import request, not the manifest. |
| `item.assetId` | `asset_id` reference | Resolve through the asset mapping bucket described below. All items sharing one legacy `assetId` in one import must resolve to the same durable `asset_id`. |
| `item.scope = evaluation` | `scope_type = evaluation` | Durable review-level link. Canonical durable `section_id` stays `null`; `S2` belongs only to the compatibility projection. |
| `item.scope = criterion` | `scope_type = criterion` | Durable criterion link. Requires `criterion_code` and the validated owning `section_id`. |
| `item.criterionCode` | `criterion_code` | Required for criterion links; null for evaluation links. |
| validated owning section | `section_id` | For criterion links, derive from the criterion registry after validating the legacy `sectionId`. |
| `item.evidenceType` | `evidence_type` | Copy as link metadata. |
| `item.note` | `note` | Copy as link metadata. |
| import time | `linked_at` | Canonical link-creation time for the durable record. |
| importing actor | `linked_by_user_id` | Canonical durable actor attribution. |

### Durable asset mapping rules

Manifest compatibility imports must group items by legacy `assetId` before creating durable assets.

Within one import operation:

1. Every distinct legacy `assetId` maps to exactly one durable asset.
2. All links referencing the same legacy `assetId` must reference the same durable `asset_id`.
3. If the durable system cannot reuse the legacy `assetId` value directly, it must still maintain a stable one-import mapping so all repeated legacy `assetId` values collapse to one durable asset.

Asset-field mapping rules:

| Legacy source | Durable target | Mapping rule |
|---|---|---|
| `item.assetId` | `asset_id` | Reuse when possible; otherwise allocate a new durable id and keep a stable mapping for all occurrences of that legacy `assetId` within the import. |
| `item.name` | `original_name` / `sanitized_name` | Use as the imported source label/filename. |
| `item.mimeType` | `mime_type` | Copy when present. |
| `item.size` | `size_bytes` | Copy when present. |
| importing actor | `created_by_user_id` | Canonical durable actor attribution for the imported asset record. |
| import time | `created_at` / `received_at_server` | Canonical durable asset receipt time. |
| `item.addedAt` | `captured_at_client` | Best-effort legacy provenance only. Do **not** reinterpret this as authoritative durable link time. |
| `generatedAt` | import batch provenance | Useful for audit/import metadata, not a per-asset canonical timestamp. |

### Asset-kind decision rules

The durable importer must classify each grouped legacy asset using the following precedence order:

1. **Binary image asset**
   - if a deterministic bundle file or `dataUrl` exists and the item is image-like (`isImage = true` or `mimeType` is image/*), map to `asset_kind = image`.

2. **Binary export asset**
   - if a deterministic bundle file or `dataUrl` exists and `evidenceType = export`, map to `asset_kind = export`.

3. **Binary document asset**
   - if a deterministic bundle file or `dataUrl` exists and neither of the above applies, map to `asset_kind = document`.

4. **URL asset**
   - if no binary payload exists and `evidenceType = link` and either `name` or `note` is a valid absolute URL, map to `asset_kind = url` and store the resolved URL as provenance/source metadata.

5. **Metadata-only asset**
   - if no binary payload exists and the item is not a valid URL capture, map to `asset_kind = metadata_only`.

All legacy-manifest imports use `source_type = manifest_import`.

### Binary-payload source rules

The compatible byte source for one grouped legacy asset is determined in this order:

1. matching ZIP bundle file, if the import is a supported bundle form;
2. inline `dataUrl`, if present and valid;
3. no binary payload, in which case the asset becomes `url` or `metadata_only` according to the rules above.

`previewDataUrl` is never the canonical original-payload source. It is preview-only compatibility data.

## Supported public legacy import forms

The public legacy import class remains the one frozen in `docs/contracts/import-export-package-contract.md`: `legacy_evidence_manifest_v1`.

### 1. Standalone manifest JSON

Supported form:

- one file named `trust-evidence-manifest.json` containing the canonical manifest v1 JSON shape described above.

### 2. Narrow ZIP bundle form

Supported form:

- a ZIP archive containing exactly one manifest member at either:
  - `trust-evidence-manifest.json`, or
  - `evidence/trust-evidence-manifest.json`
- optional evidence files under `evidence/files/**`

### ZIP file-association rule

Because legacy manifest v1 does not carry archive paths per item, public ZIP support is intentionally narrow.

Supported deterministic mapping rule:

- at most one file may be associated with one legacy `assetId`;
- bundle file names must begin with `<assetId>--` so the importer can map them to the grouped legacy asset;
- if more than one file matches the same `assetId`, the bundle is unsupported;
- if no bundle file matches an `assetId`, the importer falls back to the standalone-manifest rules for that asset.

This keeps ZIP support deterministic without pretending that the legacy manifest format itself carried a complete file-index contract.

## Explicit unsupported inputs

The public `legacy_evidence_manifest_v1` compatibility contract does **not** support any of the following:

1. **Unknown or missing manifest version markers**
   - missing `schemaVersion`;
   - `schemaVersion !== 1`;
   - missing `generatedAt`.

2. **Manifests that try to be full review exports**
   - attempting to treat a legacy evidence manifest as a complete review-record import;
   - relying on absent review-state markers such as `state_schema_version` or `framework_version`.

3. **Malformed root structure**
   - missing `evaluation`, `sections`, `criteria`, or `summary`;
   - non-object values where objects are required;
   - non-array values where item arrays are required.

4. **Out-of-family scope values**
   - `scope = review_inbox`;
   - any scope other than `evaluation` or `criterion`.

5. **Evaluation items that are not projected as `S2` review-level links**
   - evaluation items with `sectionId !== S2`;
   - evaluation items with non-null `criterionCode`.

6. **Criterion items with unresolved criterion identity**
   - missing `criterionCode`;
   - unknown `criterionCode`;
   - `sectionId` not matching the criterion’s owning section.

7. **Incomplete or conflicting identity data**
   - missing or empty `id`;
   - missing or empty `assetId`;
   - duplicate `id` values across multiple items;
   - repeated `assetId` values with conflicting `name`, `mimeType`, `size`, `isImage`, or payload source.

8. **Non-canonical alias-only item payloads**
   - items expressed only with `asset_id`, `filename`, `fileName`, `label`, `type`, `notes`, `url`, `href`, `createdAt`, or `uploadedAt` without prior normalization into the canonical exported DTO.

9. **Unsupported payload encodings**
   - `dataUrl` values that are not `null` and do not use the `data:` scheme;
   - preview-only items where `previewDataUrl` exists but there is no valid `dataUrl` or deterministic bundle file and the import cannot classify the asset as `url` or `metadata_only` without data loss.

10. **Broken count or mirror invariants**
    - `itemCount` values that do not match array lengths;
    - `summary` totals that do not match actual items;
    - `sections.S2.items` not mirroring `evaluation.items`;
    - principle-section `criteria` mirrors that do not match the top-level `criteria` entries.

11. **Ambiguous ZIP bundles**
    - no manifest member;
    - more than one manifest member;
    - files outside the supported bundle paths that are required for interpretation;
    - more than one bundle file matching one `assetId`.

12. **Undocumented browser-state artifacts**
    - raw `localStorage` dumps;
    - copied DOM/HTML snapshots;
    - clipboard cache directories;
    - arbitrary screenshot folders without a supported manifest.

Operator-side migration tooling may normalize such artifacts into the canonical legacy manifest DTO or the canonical review-export package before public import, but that normalization is outside the public compatibility contract.

## Acceptance condition for downstream work

Any implementation claiming to satisfy this compatibility contract must meet all of the following:

- it preserves `trust-evidence-manifest.json` as the legacy evidence-only compatibility export filename;
- it validates `schemaVersion = 1` explicitly for the supported public legacy manifest family;
- it treats the canonical exported manifest DTO as the supported public shape, not arbitrary pre-serialization aliases;
- it maps repeated legacy `assetId` values to one durable asset and multiple durable links;
- it keeps review-level `S2` as a manifest-compatibility projection only, not as the durable semantic definition of review scope;
- it rejects review-inbox claims in legacy manifest v1 rather than silently inventing support;
- it imports legacy `addedAt` only as best-effort provenance, not as authoritative durable link time;
- it rejects malformed or ambiguous bundles instead of guessing.
