# Import/export package contract

Date: 2026-04-06
Status: Wave 0 / T002 substream C complete
Scope: review export packages, evidence attachment packaging, legacy import boundaries, and backend API compatibility only

This document freezes the **import/export package** portion of T002 for the current repository. It defines the canonical review-export package family, the evidence attachment packaging rules, the narrow legacy-import boundaries that later backend APIs may support, and the compatibility expectations tying those packages back to the current browser-side evidence manifest and the T001 review-state contract.

This document is intentionally narrower than the full T002 task bundle. It does **not** replace the planned dedicated `evidence-model-contract.md` or `evidence-manifest-compatibility.md`; it fixes the package-level envelope those later documents must fit inside.

## What this document freezes

- the canonical **logical review-export package** used for archive, reporting, and sharing;
- the allowed **serialized artifacts** derived from that logical package: canonical JSON, reporting CSV, and archive ZIP;
- the required filenames and package members for the ZIP archive form;
- the evidence attachment packaging rules, including one-asset-many-links handling;
- the legacy import classes that later backend APIs may accept;
- the explicit boundary between the current browser-only evidence manifest and the future backend-owned review export package;
- the compatibility obligations for later backend endpoints that generate or import those packages.

## Corrected first-pass file-level requirements

The first-pass design for this substream was reviewed against the roadmap, scope extraction, executable plan, backend plan, tooling/extension plans, the current browser evidence-export surface, and the T001 review-state contract. The corrected file-level requirements for the **import/export package contract** are:

| File | Current responsibility | Contract requirement frozen here |
|---|---|---|
| `static/js/adapters/evidence-storage.js` | Browser-only evidence manifest serializer. Emits `EVIDENCE_MANIFEST_VERSION = 1` from in-memory evidence state. | Treat this output as the **legacy compatibility view**, not as the canonical full-review export. Preserve the manifest filename and core shape, but do not require future backend exports to inline binary bytes as `dataUrl`/`previewDataUrl`. |
| `static/js/render/evidence.js` | Current UI surface for exporting `trust-evidence-manifest.json` from the evidence block. | The current export button remains an **evidence-only compatibility export**. It does **not** become the authoritative full review-export surface. Full review export belongs to later app-level/export-job surfaces. |
| `tests/e2e/evidence.spec.js` | Non-regression coverage for manifest download behavior and filename. | Preserve the current compatibility filename `trust-evidence-manifest.json`. Add future full-review export coverage separately instead of silently replacing the evidence-manifest behavior. |
| `docs/contracts/review-state-contract.md` | Freezes the canonical saved-review record envelope and `current_state_json` compatibility boundary. | The canonical review export must embed the saved-review record from this contract and must not invent a second questionnaire-state shape for export/import. |
| Planned `server/services/exporter.js` | Later backend export generator for JSON/CSV/ZIP artifacts. | Generate all export artifacts from the persisted review record, immutable revisions, evidence assets/links, collaboration metadata, and audit history. Package one binary per asset, not one binary per criterion link. In canonical JSON export, review-level links may keep `section_id = null`; the manifest-compatible projection is the place that re-emits `sectionId = S2`. |
| Planned `server/services/importer.js` | Later backend import normalizer. | Accept only **documented package classes**: canonical review export packages and legacy evidence-manifest bundles. Do not promise import of arbitrary browser folders, HTML copies, or undocumented local-state dumps. |
| Planned `server/routes/exports.js` and `server/routes/imports.js` | Later API entrypoints for export/import jobs. | Endpoint wrappers must not create endpoint-specific package shapes. JSON and ZIP variants must be two serializations of the same logical contract. |

## Roadmap and plan corrections applied before freezing this contract

The roadmap and planning documents forced several corrections to the first-pass package design.

| First-pass risk | Why it mismatched the plans | Corrected rule frozen here |
|---|---|---|
| Treating the current evidence manifest as the canonical review export | The current repository exports only evidence metadata; the roadmap and backend plan require a broader review package for archive, reporting, and sharing. | `trust-evidence-manifest.json` remains a compatibility view only. The authoritative export contract is a separate canonical review package. |
| Treating user-facing import/export as a Phase 1 feature | The roadmap places export/import in product Phase 2 and the executable plan places implementation in Wave 3, even though the contract must be frozen in Wave 0. | Freeze the contract now; implement the user-facing export/import machinery later. |
| Duplicating evidence files per criterion | The current runtime and later plans preserve `assetId` reuse semantics and require asset/link separation. | Export each physical asset once. Criterion, evaluation, and future inbox usage remain link records, not duplicate file payloads. |
| Assuming undocumented browser-only shapes are importable | The current repository has no full review-record serializer. The only documented browser export surface is the evidence manifest. | Public import support is limited to documented package versions and legacy manifest bundles. Any one-off browser-state recovery must be normalized before API import. |
| Requiring inline binary data inside canonical export JSON | The backend plan explicitly moves evidence bytes out of questionnaire state and into durable storage. | Canonical review export stores evidence metadata plus optional attachment references. Inline `dataUrl` fields remain compatibility-only bridge data. |

## Canonical export family

The roadmap and backend plan imply **three export artifacts**, but only **one authoritative logical package**.

| Artifact | Authority | Required contents | Notes |
|---|---|---|---|
| `trust-review-export.json` | **Authoritative structured export** | Review record, revisions, evidence metadata, collaboration metadata, audit extract, attachment index | Standalone JSON; does not need to contain binary evidence bytes. |
| `trust-review-package.zip` | **Authoritative archive container** | `package-manifest.json`, `trust-review-export.json`, `evidence/trust-evidence-manifest.json`, `audit/audit-events.json`, optional `reports/review-summary.csv`, optional `evidence/files/**` | Archive/share package form. ZIP is a container around the canonical JSON export, not a different schema. |
| `reports/review-summary.csv` | Derivative only | Flattened reporting view | Helpful for operators and reporting, but never the source of truth for import. |

## Canonical JSON export payload

The canonical structured export is `trust-review-export.json`.

### Top-level shape

The canonical JSON export uses this logical shape:

```json
{
  "package": { "...": "package metadata" },
  "review": { "record": {}, "tool": {} },
  "revisions": [],
  "evidence": { "assets": [], "links": [], "legacy_manifest_v1": {} },
  "collaboration": {
    "assignments": [],
    "workflow_transitions": [],
    "comments": [],
    "final_decision": null
  },
  "audit": { "events": [] },
  "attachments": { "files_included": false, "items": [] }
}
```

### Required top-level members

| Member | Required | Notes |
|---|---|---|
| `package` | Yes | Package metadata, package version, export timestamp, serialization form, and inclusion flags. |
| `review` | Yes | Review record envelope compatible with `docs/contracts/review-state-contract.md`. |
| `revisions` | Yes | Immutable revisions known to the system at export time. |
| `evidence` | Yes | Evidence assets, scoped links, and a manifest-compatible compatibility view. |
| `collaboration` | Yes | Assignments, comments, workflow transitions, and final-decision metadata. Empty arrays/null are allowed where the system has no records yet. |
| `audit` | Yes | Audit event extract used for traceability. |
| `attachments` | Yes | Attachment index plus file-inclusion flags. Empty when no binary files are bundled. |

### `package` metadata

The `package` object must contain at least:

| Field | Required | Notes |
|---|---|---|
| `package_type` | Yes | Fixed initial value: `trust_review_export`. |
| `package_version` | Yes | Initial value: `1`. Changes to top-level structure or required ZIP members require a package-version bump. |
| `serialization` | Yes | `json` or `zip`. |
| `exported_at` | Yes | ISO-8601 export timestamp. |
| `exported_by_user_id` | Yes | Actor identity for the export job or request. |
| `review_id` | Yes | Stable review identifier from the saved-review record. |
| `public_id` | Yes | Human-facing review identifier. |
| `state_schema_version` | Yes | Copied from `review.record.state_schema_version`. |
| `framework_version` | Yes | Copied from `review.record.framework_version`. |
| `includes` | Yes | Booleans for `revisions`, `legacy_manifest_v1`, `audit_events`, `reporting_csv`, and `evidence_files`. |

### `review`

`review.record` must embed the canonical saved-review record from `docs/contracts/review-state-contract.md`.

Additional `review` members may include stable export-friendly metadata such as:

- `tool` — tool identity/snapshot fields useful for archive and reporting;
- `title_snapshot` — operator-facing title if stored separately from the questionnaire state;
- `publication_state` — if already represented at the record level.

The export contract does **not** authorize a second questionnaire-state shape. `review.record.current_state_json` remains the authoritative questionnaire payload.

### `revisions`

`revisions` is an ordered array of immutable revision records. Each item must contain at least:

- `review_id`
- `revision_number`
- `state_schema_version`
- `framework_version`
- `state_json`
- `saved_by_user_id`
- `save_reason`
- `created_at`

The export should include all revisions known to the persisted review record unless the export request explicitly asks for a reduced set. If a reduced set is ever supported later, `package.includes.revisions` must remain `true`, and the reduction must be recorded explicitly in package metadata rather than implied.

### `evidence`

The `evidence` object contains three layers:

1. canonical `assets`;
2. canonical scoped `links`; and
3. `legacy_manifest_v1`, a compatibility view matching the current browser-export family.

#### Minimum `assets` fields

| Field | Required | Notes |
|---|---|---|
| `asset_id` | Yes | Canonical reusable asset identity. |
| `asset_kind` | Yes | Examples: `image`, `document`, `export`, `url`, `selection`, `metadata_only`. |
| `source_type` | Yes | Examples: `manual_upload`, `clipboard`, `drag_drop`, `extension_capture`, `manifest_import`. |
| `original_filename` | No | Null/empty allowed for metadata-only or URL-only assets. |
| `mime_type` | No | Null allowed where no binary file exists. |
| `size_bytes` | No | Null allowed where no binary file exists. |
| `sha256` | No | Recommended when a binary payload exists. |
| `origin_url` | No | Optional provenance field. |
| `origin_title` | No | Optional provenance field. |
| `captured_at_client` | No | Client-side capture/import timestamp when known. |
| `received_at_server` | No | Server-side receipt timestamp when known. |

#### Minimum `links` fields

| Field | Required | Notes |
|---|---|---|
| `link_id` | Yes | Scoped association identity. |
| `asset_id` | Yes | Foreign key to `evidence.assets`. |
| `target_scope` | Yes | `evaluation`, `criterion`, or reserved `review_inbox`. |
| `section_id` | Conditional | Required for `criterion` links and must match the criterion's owning section. Nullable for `evaluation` and `review_inbox` links in the canonical export. The manifest-compatible legacy projection continues to emit `sectionId = S2` for `evaluation` items to match the current runtime export. |
| `criterion_code` | Conditional | Required for `criterion`; null otherwise. |
| `evidence_type` | No | Screenshot, export, document, policy, benchmark, link, other, etc. |
| `note` | No | Association-specific reviewer note. |
| `linked_by_user_id` | No | Actor attribution for the link. |
| `linked_at` | No | Timestamp for link creation. |

### `collaboration`

The initial package contract reserves collaboration metadata explicitly so later backend APIs can add it without inventing a second export family.

| Member | Required | Notes |
|---|---|---|
| `assignments` | Yes | Array; may be empty in early records. |
| `workflow_transitions` | Yes | Array of lifecycle transition records. |
| `comments` | Yes | Array; comment scope and granularity are still policy-sensitive, but the package reserves the slot now. |
| `final_decision` | Yes | Final decision record or `null`. |

### `audit`

`audit.events` is the structured audit extract. The package contract does not require a separate event taxonomy here; it requires only that the export preserves the operational event history needed for traceability and later reporting.

### `attachments`

`attachments` describes optional binary payloads included alongside the canonical JSON export.

| Field | Required | Notes |
|---|---|---|
| `files_included` | Yes | `true` when binary evidence files are present in the archive; `false` for JSON-only exports. |
| `items` | Yes | Attachment index entries. Empty array when no files are included. |

Each attachment index entry must contain at least:

- `asset_id`
- `archive_path` — relative path inside the ZIP, or `null` for JSON-only export
- `original_filename`
- `mime_type`
- `size_bytes`
- `sha256`

## ZIP package layout

When the export is serialized as `trust-review-package.zip`, the archive must contain these members:

| Path | Required | Notes |
|---|---|---|
| `package-manifest.json` | Yes | Small archive-level manifest pointing to the canonical JSON export and archive members. |
| `trust-review-export.json` | Yes | Canonical structured export defined above. |
| `evidence/trust-evidence-manifest.json` | Yes | Current manifest-compatible evidence view. May be empty but must exist. |
| `audit/audit-events.json` | Yes | Audit-event extract. May be empty but must exist. |
| `reports/review-summary.csv` | No | Optional reporting derivative. |
| `evidence/files/**` | No | Optional binary evidence attachments. |

### `package-manifest.json`

The archive-level manifest must contain at least:

- `package_type`
- `package_version`
- `serialization` = `zip`
- `review_id`
- `public_id`
- paths to `trust-review-export.json`, `evidence/trust-evidence-manifest.json`, and `audit/audit-events.json`
- booleans for included optional members (`reporting_csv`, `evidence_files`)

`package-manifest.json` exists so archive readers can inspect the package contents without parsing the full review export immediately.

## Evidence attachment packaging rules

The package freezes the following evidence rules:

1. **One binary file per asset, not per link.**
   - If one asset is linked to multiple criteria, include the binary payload once under `evidence/files/**`.
   - Link multiplicity is represented only in `evidence.links`.

2. **Attachment filenames are derived from asset identity, not link identity.**
   - Recommended path pattern: `evidence/files/<asset_id>--<sanitized_filename>`.
   - The file path is a transport detail. The canonical identity is still `asset_id`.

3. **Association metadata never moves into filenames.**
   - `criterion_code`, `section_id`, `note`, and `evidence_type` stay in `evidence.links`.
   - The package must not duplicate files just to encode different notes or different target scopes.

4. **Metadata-only and URL-only assets may have no binary payload.**
   - Those assets still appear in `evidence.assets` and may still be linked in `evidence.links`.
   - Their `attachments.items[*].archive_path` is `null`, or no attachment-index item is emitted for them.

5. **Preview derivatives are not first-class attachments.**
   - Browser-era `previewDataUrl` is compatibility-only.
   - Later backend exports should package the original asset bytes only. Preview images may be regenerated by readers when needed.

6. **Strict legacy-manifest coverage remains limited to evaluation and criterion scopes.**
   - The canonical package reserves `review_inbox` as a valid later `target_scope`.
   - The current legacy manifest v1 does not guarantee a first-class inbox representation.
   - Therefore the canonical JSON export must remain authoritative whenever `review_inbox` links exist.

## Legacy manifest compatibility bridge

The current browser-only export surface is the evidence manifest downloaded as `trust-evidence-manifest.json`. The package contract preserves that bridge explicitly.

### Compatibility file obligations

- The ZIP export must include `evidence/trust-evidence-manifest.json`.
- Later backend `GET /api/evaluations/:id/evidence/manifest` responses must be structurally equivalent to that file.
- The compatibility file must preserve the current top-level keys from `static/js/adapters/evidence-storage.js`:
  - `schemaVersion`
  - `generatedAt`
  - `evaluation`
  - `sections`
  - `criteria`
  - `summary`

### Compatibility item obligations

Later manifest-compatible exports must preserve these compatibility fields where known:

- `id`
- `assetId`
- `scope`
- `sectionId`
- `criterionCode`
- `evidenceType`
- `name`
- `note`
- `mimeType`
- `size`
- `isImage`
- `addedAt`

`dataUrl` and `previewDataUrl` remain bridge fields only:

- current browser-side exports may still emit them;
- later backend-generated manifest views may emit them as `null`;
- canonical review exports must not depend on them to represent durable evidence bytes.

## Legacy import classes and boundaries

The roadmap requires import of older browser-only work and existing evidence manifests. The current repository, however, documents only one browser export format today: the evidence manifest. This contract therefore freezes **narrow, explicit import classes**.

### Supported public import classes

#### 1. `canonical_review_export_v1`

Accepted by later `POST /api/import/evaluations`.

Allowed forms:

- standalone `trust-review-export.json`; or
- `trust-review-package.zip` containing `package-manifest.json` and `trust-review-export.json`.

Minimum behavior:

- validate `package.package_version`;
- validate review-state compatibility against `docs/contracts/review-state-contract.md`;
- preserve revisions, evidence metadata, collaboration metadata, and audit extract as imported records or imported provenance where policy allows.

#### 2. `legacy_evidence_manifest_v1`

Accepted by later `POST /api/import/evaluations/:id/evidence`.

Allowed forms:

- standalone `trust-evidence-manifest.json`; or
- ZIP bundle containing that manifest plus optional evidence files.

Minimum behavior:

- import evidence assets/links into an existing review;
- preserve `assetId` and association `id` semantics where possible;
- create import audit events;
- do **not** mutate questionnaire answers, lifecycle state, assignments, comments, or decision fields.

### Explicit non-support boundaries

The public import contract does **not** guarantee import for any of the following:

- arbitrary browser `localStorage` or `sessionStorage` dumps;
- copied HTML documents or DOM snapshots;
- unversioned folders of screenshots/exports without a manifest;
- CSV as a source-of-truth review record;
- extension queue files, cache directories, or other temporary client-state artifacts.

### Operator-side migration boundary for older browser-only review state

If older browser-only questionnaire state is recovered outside the documented package family, it must be normalized **before** it reaches the public import API.

Required rule:

- any such recovered payload must first be transformed into the canonical review-state contract (`docs/contracts/review-state-contract.md`) or into `canonical_review_export_v1`.

This preserves the roadmap promise that older browser-only work can be recovered **when needed** without forcing the backend to guess undocumented historical shapes.

## Compatibility expectations for later backend APIs

The backend plan already names the relevant endpoints. This contract freezes how those later APIs must relate to the package family.

| Endpoint | Contract expectation |
|---|---|
| `GET /api/evaluations/:id/evidence/manifest` | Must return the same logical manifest view that is written to `evidence/trust-evidence-manifest.json` in ZIP exports. |
| `POST /api/evaluations/:id/exports` | May let callers choose `json` or `zip`, and may optionally include CSV or evidence files, but must always generate the same logical package contract. |
| `GET /api/evaluations/:id/exports/:jobId/download` | Must download either `trust-review-export.json` or `trust-review-package.zip` without endpoint-specific schema drift. |
| `POST /api/import/evaluations` | Must accept only documented canonical review-export packages and validate package/version compatibility explicitly. |
| `POST /api/import/evaluations/:id/evidence` | Must accept only documented legacy manifest imports or manifest bundles and must limit mutations to evidence records plus import audit history. |

### Round-trip expectations

For later backend implementation, the package contract is considered satisfied only if these expectations hold:

1. **Canonical review export round-trip**
   - Exporting and re-importing `canonical_review_export_v1` preserves the review-state envelope, current questionnaire state, revision history, evidence asset/link metadata, and traceability metadata subject to policy-controlled identifier remapping.

2. **Legacy evidence-manifest round-trip**
   - Exporting/importing `legacy_evidence_manifest_v1` preserves current browser-era evidence semantics (`assetId`, link id, scope, section/criterion targeting, note, evidence type) where that data is present.
   - It does not need to preserve transient browser-only preview URLs or object URLs.

3. **No UI-state dependency**
   - Import/export must not depend on page hash, active drawer state, or any other `ui` slice data from the browser application.

4. **No inline-byte dependency in canonical review export**
   - Later backend APIs must support canonical exports even when evidence bytes are carried only as packaged files or referenced durable assets.

## Explicit non-goals

This document does **not** do any of the following:

- define the full durable evidence-domain schema outside the fields needed for packaging;
- define CSV column layout beyond its status as a derivative artifact;
- define import UI flows, job lifecycle UX, or permission screens;
- guarantee manifest-v1 representation of future `review_inbox` links;
- authorize import of undocumented browser-state artifacts by public API;
- replace the review-state contract with a package-specific questionnaire payload shape.

## Acceptance condition for downstream work

Any later backend or frontend implementation claiming to satisfy this contract must meet all of the following:

- canonical JSON review export exists and is versioned;
- ZIP export is a container around the canonical JSON export, not a separate schema;
- evidence binaries are packaged once per asset, not once per link;
- `trust-evidence-manifest.json` remains available as a compatibility bridge;
- legacy evidence-manifest import is explicitly bounded and does not silently mutate non-evidence review state;
- later backend export/import APIs implement the same logical package contract across JSON and ZIP variants.
