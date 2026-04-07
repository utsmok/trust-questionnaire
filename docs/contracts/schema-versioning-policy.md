# Schema versioning policy

Date: 2026-04-06
Status: Wave 0 / T001 complete
Scope: persisted review-record version axes, bump rules, migration rules, and file-level implementation requirements for T001 substream B.

## Purpose

This contract freezes the persisted versioning model for review records and immutable revisions. It exists so saved reviews, revisions, imports/exports, and future migrations can preserve compatibility with the current frontend `EvaluationState` shape.

## Contract decisions

- The canonical persistence model is a **review-record envelope plus `EvaluationState` JSON**. It is not a field-per-column canonical model.
- `state_schema_version` and `framework_version` are mandatory persisted fields on both the live review record and every immutable revision.
- Initial persisted values are `state_schema_version = "1"` and `framework_version = "2.0"`.
- Version fields live **outside** `current_state_json` / `state_json` so `createAppStore({ initialEvaluation })` and `replaceEvaluation()` can continue to round-trip the current `EvaluationState` shape without new required keys.
- The canonical persisted review-record envelope uses `review_id`; storage-layer tables may map that identifier to `evaluations.id` and `evaluation_revisions.evaluation_id` without changing the contract.
- `workflow_mode` is mirrored as indexed review metadata and must equal `current_state_json.workflow.mode`.
- `lifecycle_state` is persisted as review-record metadata and revision metadata. It is not added to the current inner `EvaluationState` shape.

## Required persisted version fields

| Field | Applies to | Format | Required | Meaning |
|---|---|---|---|---|
| `state_schema_version` | live review record; every immutable revision | string, initially `"1"` | yes | version identifier of the persisted review-state contract |
| `framework_version` | live review record; every immutable revision | dotted string, initially `"2.0"` | yes | version of the TRUST framework semantics used when the revision was authored |
| `workflow_mode` | live review record; every immutable revision; mirrored inside `current_state_json.workflow.mode` / `state_json.workflow.mode` | enum from `static/js/config/sections.js` | yes | frontend workflow vocabulary used for page sequence and baseline section access |
| `lifecycle_state` | live review record; every immutable revision | enum from `docs/contracts/lifecycle-state-map.md` | yes | backend-authoritative review-record lifecycle |
| `current_revision_number` / `revision_number` | live review record; every immutable revision | integer, monotonic per review | yes | immutable revision counter |
| `current_etag` | live review record and write responses | opaque string | yes | optimistic concurrency token for accepted writes |

## Persisted envelope model

The live saved review record and each immutable revision use the following persistence split.

### Live review record envelope (stored in `evaluations`)

| Field family | Required contents |
|---|---|
| Identity | `review_id` (stored as `evaluations.id`), `public_id` |
| Version metadata | `workflow_mode`, `lifecycle_state`, `state_schema_version`, `framework_version`, `current_revision_number`, `current_etag` |
| Canonical questionnaire payload | `current_state_json` containing the current frontend-compatible `EvaluationState` shape |
| Timestamps and operational metadata | `created_at`, `updated_at`, actor ids, publication/review-cycle metadata, and related workflow fields |

### Immutable revision envelope (stored in `evaluation_revisions`)

| Field family | Required contents |
|---|---|
| Identity | `review_id` (stored as `evaluation_revisions.evaluation_id`), `revision_number` |
| Version metadata | `workflow_mode`, `lifecycle_state`, `state_schema_version`, `framework_version` |
| Canonical questionnaire payload | `state_json` containing the exact saved `EvaluationState` snapshot for that revision |
| Provenance | `save_reason`, actor id, `created_at` |

**Rule:** the inner `EvaluationState` remains compatible with the current frontend store shape. The review-record envelope carries the extra persistence metadata needed for indexing, migration, and authorization.

## Version axes and change rules

| Axis | Changes when | Does not change for |
|---|---|---|
| `state_schema_version` | the persisted review contract changes | UI copy, CSS, routing, auth/session implementation, or other non-persisted technical work |
| `framework_version` | TRUST framework semantics change | backend storage implementation changes that do not alter framework meaning |
| `revision_number` | any accepted save or lifecycle transition creates a new immutable revision | rejected writes or client-side unsaved edits |
| `current_etag` | any accepted write changes the latest server state | reads, rejected writes, or local-only edits |

## Mandatory `state_schema_version` bump conditions

A new `state_schema_version` is required when any of the following occur:

1. A persisted questionnaire field id is added, removed, renamed, or repurposed in `static/js/config/questionnaire-schema.js`.
2. The meaning or allowed persisted value set of an existing field changes in a way that requires migration or reinterpretation.
3. The allowed persisted `workflow_mode` values change.
4. The canonical persisted `lifecycle_state` values change.
5. The shape or semantics of persisted `sections`, `criteria`, `evidence`, or `overrides` records change.
6. Data moves between the review-record envelope and the inner canonical state JSON.
7. Export/import canonical JSON packages change in a way that affects round-trip compatibility.

**Rule:** even an additive optional field counts as a schema-contract change and requires a new `state_schema_version`. The migration for that bump may be a no-op for older records, but the version change is still required because the persisted field inventory changed.

## Changes that do **not** require a `state_schema_version` bump

A `state_schema_version` bump is **not** required for:

- documentation-only field-count correction where field ids and persisted semantics do not change;
- CSS, layout, copy, and non-persisted UX changes;
- new derived values that are not stored in canonical review state;
- dashboard, auth/session, or API-route changes that leave the persisted review contract unchanged;
- audit-log or notification schema changes that do not alter the canonical review-state payload.

## Mandatory `framework_version` bump conditions

A new `framework_version` is required when any of the following change in the authoritative TRUST framework materials:

1. principle set, criterion set, or criterion codes;
2. scoring scale, principle-judgment model, or final recommendation categories;
3. critical-fail flags;
4. minimum evidence requirements that materially change how a saved review is interpreted;
5. governance workflow semantics that materially change the meaning of saved review outcomes.

A `framework_version` change may occur **without** a `state_schema_version` change if the meaning of the review changes but the stored JSON shape does not.

## Migration policy

1. **Server-authoritative migrations only.** The backend owns the migration registry and upgrades stored payloads before hydrate or import acceptance.
2. **Forward-only migration chain.** Each supported version migrates stepwise to the latest `state_schema_version`. Down-migrations are not required.
3. **Immutable revisions stay immutable.** Historical revisions retain the `state_schema_version` and `framework_version` with which they were saved. They are not rewritten in place.
4. **New revision on every accepted write.** Any accepted save or lifecycle transition writes a new immutable revision carrying the current `state_schema_version`, `framework_version`, `workflow_mode`, and `lifecycle_state`.
5. **Unknown version rejection.** Records or imports with missing or unknown version metadata are rejected or routed through an explicit legacy-import path. They are not silently guessed.
6. **No silent reinterpretation of old reviews.** A later `framework_version` does not retroactively relabel old evaluations. A new authoritative save, reopen, or re-evaluation writes a new revision under the newer framework version.

## Concrete file-level requirements

| File | Requirement created by this contract |
|---|---|
| `static/js/state/store.js` | Continue to hydrate from plain `EvaluationState`. Any future persistence adapter must unwrap the review-record envelope and migrate to the latest schema before calling `createAppStore({ initialEvaluation })` or `replaceEvaluation()`. |
| `static/js/config/questionnaire-schema.js` | Any persisted field-id or persisted semantic change requires an explicit version-impact review and, in the normal case, a `state_schema_version` bump. |
| `static/js/config/sections.js` | Any add/remove/rename of `WORKFLOW_MODES` values requires a `state_schema_version` review because `workflow.mode` is persisted inside canonical state. |
| `server/services/evaluation-state.js` | Must own `LATEST_STATE_SCHEMA_VERSION`, migration functions, canonical-state validation, and workflow-mode mirror validation. |
| `server/repositories/evaluations.js` | Must persist `state_schema_version`, `framework_version`, `current_revision_number`, and `current_etag` on the live record. |
| `server/repositories/revisions.js` | Must persist immutable snapshots with `state_schema_version`, `framework_version`, `workflow_mode`, and `lifecycle_state` on every accepted save and lifecycle transition. |
| `server/routes/evaluations.js` and `server/routes/revisions.js` | Must emit version metadata on responses and require expected concurrency metadata on writes. |
| `server/services/exporter.js` | Must include `state_schema_version` and `framework_version` in exported review packages and revision metadata. |
| `server/services/importer.js` | Must reject or migrate incoming packages according to declared `state_schema_version` and `framework_version` before hydrate. |
| `tests/unit/server/evaluation-state.test.js` | Must cover migrate -> validate -> hydrate round-trips and unknown-version rejection. |
| `tests/unit/state/store-persistence.test.js` | Must confirm that migrated payloads still round-trip through the current frontend store shape without introducing new required inner-state fields. |

## Contract summary

This policy freezes the initial persisted version axes for saved reviews. The canonical questionnaire state remains compatible with the current frontend `EvaluationState` shape, while the review-record envelope carries the version, lifecycle, revision, and concurrency metadata needed for durable persistence, migration, export/import, and backend workflow enforcement.
