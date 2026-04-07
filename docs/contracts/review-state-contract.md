# Canonical review-state contract

Date: 2026-04-06
Status: Wave 0 / T001 complete
Scope: persisted review-state contract only

This document freezes the **review-state** portion of T001 for the current repository. It defines the canonical persisted review record envelope, the embedded questionnaire-state payload, the separation between frontend workflow mode and backend lifecycle state, the minimum schema-version metadata, and the compatibility constraints required to keep the current questionnaire store authoritative.

This document is intentionally narrower than the full T001 task bundle. It does **not** replace the planned dedicated lifecycle-map or schema-versioning-policy documents; it includes only the lifecycle and versioning rules that are required to define the review-state contract now.

## What this document freezes

- the canonical persisted review record envelope for a saved review;
- the embedded `current_state_json` payload shape, kept close to the current frontend `EvaluationState`;
- the required persisted metadata fields needed for versioning, lifecycle, and optimistic concurrency;
- the separation between frontend `workflow_mode` and backend `lifecycle_state`;
- the compatibility boundaries with `createAppStore({ initialEvaluation })`, `replaceEvaluation()`, `questionnaire-schema.js`, and the derive layer;
- the current field-inventory drift, documented explicitly rather than guessed.

## Corrected first-pass file-level requirements

The first-pass design for T001 was reviewed against the roadmap, executable plan, backend plan, state inventory, and dependency assessment. The corrected file-level requirements for the **review-state contract** are:

| File | Current responsibility | Contract requirement frozen here |
|---|---|---|
| `static/js/state/store.js` | Defines the current `EvaluationState` root shape, sparse maps, value normalization, evidence item shape, and the `replaceEvaluation()` seam. | Persisted `current_state_json` must round-trip through `createAppStore({ initialEvaluation })` and `replaceEvaluation()` without requiring an adapter other than schema-version migration. Persist only the `evaluation` payload shape, not `derived` or `ui`. Preserve sparse maps and the current camelCase embedded-state keys. |
| `static/js/config/questionnaire-schema.js` | Defines the runtime field-id namespace, criterion-field ids, per-section field inventories, and currently inconsistent schema metadata counts. | The persisted `fields` namespace is anchored to the **runtime schema registry**, not to Appendix A field counts in `docs/trust-questionnaire.md`. The contract must record the field-count drift explicitly and must not invent a false reconciled total. |
| `static/js/config/sections.js` | Defines the canonical section ids and the five frontend workflow modes used for page accessibility/editability. | Persist `workflow_mode` using the existing `WORKFLOW_MODES` vocabulary only. Do not expand `workflow.mode` to absorb backend lifecycle concepts such as assignment, finalization, publication, or archival. Section ids referenced anywhere in persisted state remain aligned with `SECTION_IDS`. |
| `static/js/state/derive/workflow.js` | Derives page accessibility and editability entirely from `workflow.mode` plus current workflow-page rules; derives escalation state separately. | Backend `lifecycle_state` must remain a record-level metadata field, not a replacement for `workflow.mode`. The derive layer continues to compute page accessibility, workflow skip state, and escalation from the embedded evaluation payload. Progress and escalation remain derived, not persisted counters. |

## Reconciliation against roadmap and execution-plan constraints

The corrected contract reflects the following non-negotiable constraints from the roadmap and execution documents:

1. **Compatibility-first persistence.** The saved review record stores one versioned questionnaire-state document close to the current `EvaluationState` shape. This rejects field-per-column persistence in Wave 0 and Wave 1.
2. **Questionnaire remains the core work surface.** The contract defines saved state for the current questionnaire; it does not redefine the product around a replacement renderer.
3. **Workflow mode and lifecycle state stay separate.** Frontend workflow mode remains necessary for current page gating. Backend lifecycle state remains necessary for assignment, permissions, submission, publication, and audit flow.
4. **Schema versioning is explicit.** `state_schema_version` and `framework_version` are mandatory persisted metadata fields on both the live review record and immutable revisions.
5. **Evidence durability is not redefined here.** This contract preserves the current frontend evidence shape inside `current_state_json` for compatibility. The durable asset/link model is frozen separately in T002.
6. **UI shell and save-policy work are out of scope here.** Route ownership, autosave cadence, conflict UX, app shell, and review shell are intentionally left to later contract tasks.

## Canonical persisted review record

The canonical saved-review record has two layers:

1. a **record envelope** containing persisted metadata used by the backend and review workflow; and
2. an embedded **`current_state_json`** payload that preserves the frontend questionnaire state.

The envelope uses backend-oriented snake_case metadata keys. The embedded questionnaire state preserves the frontend's current camelCase key structure. This split is deliberate.

Compatibility note:

- the canonical persisted review-record envelope uses `review_id` as the stable record identifier;
- storage-layer tables may map that field to internal column names such as `evaluations.id` and `evaluation_revisions.evaluation_id`;
- import/export packages, contract documents, and review-facing API DTOs should continue to use the canonical envelope key `review_id`.

### Required record-envelope fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `review_id` | string | Yes | Stable internal identifier for the review record. |
| `public_id` | string | Yes | Stable human-friendly identifier used in URLs, exports, and operator workflows. |
| `workflow_mode` | enum | Yes | Must be one of the current frontend workflow modes defined in `static/js/config/sections.js`. |
| `lifecycle_state` | enum | Yes | Backend workflow/lifecycle state. Separate from `workflow_mode`. |
| `state_schema_version` | string | Yes | Version identifier for the embedded `current_state_json` contract. Mandatory on live reviews and revisions. |
| `framework_version` | string | Yes | Version identifier for the TRUST framework/questionnaire interpretation used for the review. Mandatory on live reviews and revisions. |
| `current_revision_number` | integer | Yes | Monotonic revision counter for optimistic concurrency and immutable revision linkage. |
| `current_etag` | string | Yes | Opaque concurrency token for conditional update flows. |
| `created_at` | ISO-8601 timestamp | Yes | Record creation time. |
| `updated_at` | ISO-8601 timestamp | Yes | Time of the latest accepted persisted state change. |
| `created_by_user_id` | string | Yes | Actor that created the review record. |
| `current_state_json` | object | Yes | Embedded questionnaire-state payload defined below. |

### Reserved or recommended record-envelope fields

These fields are not required to define the review-state contract itself, but they are reserved or recommended because later waves already depend on them conceptually.

| Field | Status | Notes |
|---|---|---|
| `tool_id` | Recommended | Links repeated reviews of the same tool across time. |
| `title_snapshot` | Recommended | Useful for dashboard/search display without parsing `current_state_json`. |
| `primary_evaluator_user_id` | Reserved | Needed by later collaboration workflow. |
| `second_reviewer_user_id` | Reserved | Needed by later collaboration workflow. |
| `decision_owner_user_id` | Reserved | Needed by later governance workflow. |
| `publication_state` | Reserved | Needed by publication/export policy later. |
| `confidentiality_level` | Reserved | Needed by policy-sensitive review handling later. |
| `submitted_at` | Reserved | Needed for handoff/final-submission timing. |
| `finalized_at` | Reserved | Needed for decision closure timing. |
| `archived_at` | Reserved | Needed for archival state handling. |

### Immutable revision minimum

Every immutable revision derived from a saved review must persist at least:

- `review_id`
- `revision_number`
- `state_schema_version`
- `framework_version`
- `state_json`
- `saved_by_user_id`
- `save_reason`
- `created_at`

The revision payload uses the same embedded-state contract as `current_state_json`.

## Canonical embedded questionnaire-state payload (`current_state_json`)

The embedded questionnaire payload must stay close to the current frontend `EvaluationState` shape.

### Root shape

| Key | Type | Required | Notes |
|---|---|---|---|
| `workflow` | object | Yes | Must contain at least `mode`. |
| `fields` | object | Yes | Sparse map keyed by runtime questionnaire field ids. |
| `sections` | object | Yes | Sparse map keyed by section ids for section-level auxiliary metadata. |
| `criteria` | object | Yes | Sparse map keyed by criterion code for criterion-level auxiliary metadata. |
| `evidence` | object | Yes | Current frontend evidence state shape. Durable asset/link policy is defined later. |
| `overrides` | object | Yes | Currently includes `principleJudgments`. |

### `workflow`

Canonical shape:

- `workflow.mode`: required; one of:
  - `nomination`
  - `primary_evaluation`
  - `second_review`
  - `final_team_decision`
  - `re_evaluation`

`workflow.mode` remains the frontend compatibility field used by the current derive layer. No backend lifecycle flags may be embedded into this object.

### `fields`

`fields` is a sparse object keyed by runtime field ids from `static/js/config/questionnaire-schema.js`.

Normalization constraints inherited from the current store:

- single-select, short-text, long-text, URL, date, and person values normalize to non-empty strings;
- multi-select, checklist, people-list, and URL-list values normalize to arrays of strings;
- date ranges normalize to `{ start, end }` objects;
- number and percent values normalize to finite numbers;
- unset values are normally represented by **absence of the key**, not by an explicit empty string;
- empty arrays are normally omitted unless the field explicitly allows an empty selection as meaningful state.

#### Derived field ids versus persisted input fields

The runtime schema currently defines **123** field ids. That is the live field-id namespace, not a promise that all 123 keys appear in persisted `fields`.

The current runtime schema includes **6 derived-only field ids** that are part of the namespace but are not required persisted questionnaire inputs:

- `tr.principleJudgment`
- `re.principleJudgment`
- `uc.principleJudgment`
- `se.principleJudgment`
- `tc.principleJudgment`
- `s8.completionChecklist`

Therefore:

- the runtime field-id namespace is **123 field ids**;
- the current runtime non-derived input field set is **117 field ids**;
- persisted `fields` remains **sparse**, so actual stored key counts vary by review completeness and must not be validated as a fixed total.

### `sections`

`sections` is a sparse object keyed by `SECTION_IDS` values such as `S0`, `TR`, or `S10B`.

Canonical emitted keys for each section record are:

- `sectionNote`
- `sectionSkipReasonCode`
- `sectionSkipRationale`

Compatibility note:

- snake_case aliases such as `section_note`, `section_skip_reason_code`, and `section_skip_rationale` may be accepted when loading legacy or migrated payloads;
- canonical persisted output from this contract uses the camelCase keys above.

### `criteria`

`criteria` is a sparse object keyed by criterion code such as `TR1`, `RE2`, or `SE4`.

Canonical emitted keys for each criterion record are:

- `skipState`
- `skipReasonCode`
- `skipRationale`

Compatibility note:

- legacy or alternative ingress keys may be accepted during migration, including `skip_reason_code`, `criterionSkipReasonCode`, `criterion_skip_reason_code`, `skip_rationale`, `criterionSkipRationale`, and `criterion_skip_rationale`;
- legacy flags such as `userSkipped`, `skipped`, and `systemSkipped` are compatibility-only read aliases, not canonical write keys.

### `evidence`

The review-state contract preserves the current frontend evidence shape for compatibility with the store and current UI.

Canonical shape:

- `evidence.evaluation`: array of evidence items linked at review level;
- `evidence.criteria`: object keyed by criterion code where each value is an array of evidence items.

Current evidence-item compatibility fields are:

- `id`
- `assetId`
- `scope`
- `sectionId`
- `criterionCode`
- `evidenceType`
- `note`
- `name`
- `mimeType`
- `size`
- `isImage`
- `dataUrl`
- `previewDataUrl`
- `addedAt`

Important boundary:

- `dataUrl` and `previewDataUrl` are part of the **current in-memory compatibility shape**;
- they are **not** the durable evidence-storage contract for backend persistence;
- T002 will define how durable evidence assets and scoped evidence links are persisted outside the questionnaire-state JSON.

### `overrides`

Canonical shape for current compatibility:

- `overrides.principleJudgments`: sparse map of downward-only judgment overrides.

No additional override namespaces are frozen by this document.

## Workflow mode and lifecycle state are separate axes

### Frontend workflow mode

`workflow_mode` mirrors the current frontend `workflow.mode` and remains limited to the existing five modes:

- `nomination`
- `primary_evaluation`
- `second_review`
- `final_team_decision`
- `re_evaluation`

It answers: **which questionnaire sections are editable, read-only, or workflow-skipped in the current workspace?**

### Backend lifecycle state

`lifecycle_state` is record-level backend metadata. It answers: **where is this review in the institutionally governed review process?**

Initial canonical lifecycle vocabulary for the review-state contract:

| `lifecycle_state` | Required `workflow_mode` mapping | Notes |
|---|---|---|
| `nomination_draft` | `nomination` | Initial editable nomination record. |
| `nomination_submitted` | `nomination` | Submitted nomination; backend may lock or coordinator-gate edits. |
| `primary_assigned` | `primary_evaluation` | Assignment exists but accepted work may not have started. |
| `primary_in_progress` | `primary_evaluation` | Primary review actively editable through current questionnaire flow. |
| `primary_handoff_ready` | `primary_evaluation` | Primary review complete enough for handoff or lock. |
| `second_review_assigned` | `second_review` | Second-review assignment exists but active work may not have started. |
| `second_review_in_progress` | `second_review` | Second-review stage active. |
| `decision_pending` | `final_team_decision` | Awaiting final governance/decision activity. |
| `finalized` | `final_team_decision` | Decision complete; generally locked except reopen. |
| `published` | `final_team_decision` | Published state after finalization. |
| `re_evaluation_in_progress` | `re_evaluation` | Re-evaluation stage active. |
| `archived` | retain prior compatible mode for presentation only | `archived` is a backend read-only terminal state, not a new frontend workflow mode. Rendering may retain the last compatible `workflow_mode`, but backend authorization must force read-only behavior. |

### Separation rule

The contract freezes the following rule:

- `workflow_mode` and `lifecycle_state` must both be persisted;
- neither field is derived from the other at write time;
- multiple lifecycle states may map to the same workflow mode;
- frontend page gating continues to derive from `workflow.mode`;
- backend authorization, assignment, publication, and submission logic must derive from `lifecycle_state` plus actor/assignment context.

## Compatibility constraints with the current questionnaire store

The canonical review-state contract is only acceptable if all of the following remain true:

1. **`current_state_json` can be hydrated directly into the current store.**
   - `createAppStore({ initialEvaluation })` and `replaceEvaluation()` remain the compatibility seam.
   - Migration may transform older persisted payloads into the current schema version before hydration.

2. **Only `evaluation` is persisted as canonical questionnaire state.**
   - Do not persist `derived`.
   - Do not persist `ui`.
   - `derived` remains recomputed from the embedded evaluation payload on load.

3. **Progress, workflow accessibility, and escalation remain derived.**
   - Persisting cached counters is not canonical.
   - Unresolved workflow escalations must continue to be visible in derived progress even when the affected governance section is currently workflow-skipped.

4. **Conditional visibility must not destroy stored values.**
   - A field becoming hidden under current rules does not authorize dropping its stored value from persisted state.
   - Persisted state must preserve conditionally hidden values until an explicit state-changing action removes them.

5. **Sparse records remain canonical.**
   - Missing map entries mean "unset" or "no auxiliary metadata".
   - Writers should not inflate state with null-filled placeholders.

6. **Canonical emitted embedded-state keys stay close to current JS usage.**
   - Embedded state uses the current camelCase keys.
   - Backend envelope metadata uses snake_case.
   - Snake_case section/criterion aliases remain migration ingress only.

7. **Unknown future keys must not force destructive reads.**
   - Older readers may ignore unknown keys after migration checks, but they should not silently reinterpret them as current canonical semantics.
   - Migrations must be the explicit place where schema-shape changes are normalized.

8. **The current derive layer remains authoritative.**
   - The contract does not re-specify validation, requiredness, or principle-judgment derivation logic.
   - Persisted state must remain compatible with the existing derive modules rather than replacing them with stored computed values.

## Schema-version minimum

The contract freezes the following minimum versioning policy for review-state persistence:

1. `state_schema_version` is mandatory on every live review record and every immutable revision.
2. `framework_version` is mandatory on every live review record and every immutable revision.
3. A change to persisted `EvaluationState` structure, key naming, or field-identity semantics requires a `state_schema_version` change.
4. A change to the TRUST framework interpretation that affects questionnaire meaning requires a `framework_version` change.
5. Historical revisions are immutable. Migration may create a new migrated revision or migrated read model, but it must not silently overwrite historical stored payloads in place.

## Field inventory and drift record

The repository currently contains a real field-inventory drift. This contract records it explicitly.

### Count comparison

| Source | Count | Status | Notes |
|---|---:|---|---|
| `docs/trust-questionnaire.md` Appendix A total | 132 | Stale | Appendix A undercounts the explicit body content. |
| `docs/trust-questionnaire.md` explicit section listings | 135 | Documentation count | Section 6 explicit body content enumerates 21 fields, not the appendix's 18. |
| `static/js/config/questionnaire-schema.js` runtime field-id namespace | 123 | Live runtime source | Includes derived-only field definitions. |
| `static/js/config/questionnaire-schema.js` runtime non-derived input field definitions | 117 | Live runtime source | Excludes the 6 derived-only runtime field ids. |

### Precise causes of drift

1. **Section 0 runtime expansion**
   - The runtime schema includes four additional Section 0 fields not present in `docs/trust-questionnaire.md`:
     - `s0.reviewerName`
     - `s0.reviewerEmail`
     - `s0.reviewerAffiliation`
     - `s0.reviewDate`

2. **Per-criterion evidence-field collapse in the runtime schema**
   - The questionnaire document describes two textual evidence fields per criterion:
     - `Evidence summary`
     - `Evidence links`
   - The runtime schema stores one combined criterion evidence field per criterion:
     - `${criterion}.evidence`
   - Across 16 criteria, that reduces the runtime field total by **16** relative to the explicit questionnaire document.

3. **Appendix A undercounts Section 6 (`SE`)**
   - `docs/trust-questionnaire.md` Appendix A says Section 6 has **18** fields.
   - The explicit Section 6 body actually enumerates **21** fields:
     - 16 criterion-level fields across `SE1`–`SE4`
     - 3 section-level additional fields
     - 2 principle summary/judgment fields

4. **`QUESTIONNAIRE_SCHEMA_META` is internally inconsistent**
   - `appendixFieldCount` = `132`
   - `resolvedFieldCount` = `123`
   - `resolvedFieldCountRationale` text references `139` and says Section 6 contains `21` fields
   - runtime assertion enforces `SECTION_FIELD_COUNTS[SE] === 17`

### Contract decision on field inventory

For the persisted review-state contract:

- the authoritative **runtime field-id namespace** is `static/js/config/questionnaire-schema.js`;
- the contract does **not** claim that the documentation appendix totals are already reconciled;
- the contract does **not** treat any one of `132`, `135`, `123`, or `117` as interchangeable;
- the contract distinguishes between:
  - documentation counts,
  - runtime field-id namespace size, and
  - actual sparse persisted `fields` entries in any one saved review.

## Explicit non-goals

This document does **not** do any of the following:

- define a field-per-column relational schema for questionnaire answers;
- define the durable evidence asset/link storage contract or manifest package format;
- define autosave cadence, save queue behavior, conflict-resolution UX, or route ownership;
- define auth/session, dashboard, assignment APIs, or app-shell/review-shell behavior;
- replace the current derive layer with persisted computed values;
- persist `ui` state such as active page, anchors, panel metrics, drawer state, or sidebar tab selection;
- silently "resolve" the questionnaire documentation drift by picking a single count without explaining the mismatch.

## Acceptance condition for downstream work

Any backend or frontend persistence work that claims to implement this contract must satisfy all of the following before it is considered compliant:

- it persists `state_schema_version` and `framework_version` explicitly;
- it keeps `workflow_mode` and `lifecycle_state` separate;
- it stores questionnaire state as one versioned JSON document close to the current `EvaluationState`;
- it can round-trip the current store payload shape without inventing new required questionnaire keys;
- it does not persist `derived` or `ui` as canonical questionnaire state;
- it treats the documented field-count drift as a known constraint rather than an already-solved fact.
