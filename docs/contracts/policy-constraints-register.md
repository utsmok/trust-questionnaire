# Policy constraints register

Date: 2026-04-06
Status: Wave 0 / T003 substream D complete
Scope: bounded policy decisions and implementation constraints that must be treated as frozen until a later explicit contract revision

## Purpose

This register freezes the policy-sensitive implementation constraints required by `T003` before backend, workflow, comment, export/import, and extension work proceed.

It does **not** claim that every institutional policy question is finally resolved. Instead, it converts the currently unresolved items into **bounded implementation constraints** so later waves do not expand scope implicitly or encode contradictory assumptions.

## Reconciliation with the roadmap and executable plan

The source documents are aligned only if product-phase scope is kept distinct from technical sequencing and open policy questions are turned into explicit constraints.

The corrected interpretation used by this register is:

- `docs/00-master-implementation-roadmap.md` remains authoritative for product-phase scope.
- `docs/execution/04-executable-implementation-plan.md` remains authoritative for wave sequencing after its repaired T003 framing.
- `docs/contracts/lifecycle-state-map.md` remains authoritative for lifecycle vocabulary and transition boundaries.
- `docs/contracts/import-export-package-contract.md` remains authoritative for package shape, but **not** for product-phase timing.
- `docs/plan-backend-architecture.md` contributes the open decision set that must now be bounded.

The mismatches corrected here before freezing policy constraints are:

1. **Guest reviewer support is not assumed.** The backend plan leaves it open, but the implementation path cannot branch on that uncertainty in Wave 1.
2. **Second-reviewer overwrite rights are not assumed.** The workflow contract already favors comment-and-challenge semantics; this register freezes that as the default implementation rule.
3. **Field-level comments are not assumed.** Comment granularity remains bounded to review/section/criterion scope unless a later contract explicitly expands it.
4. **Publication and retention are not treated as separate early systems.** Publication remains tied to the same evaluation record; retention remains policy-driven but implementation-constrained now.
5. **Import/export timing follows the roadmap and executable plan, not the broader launch pressure in supporting plans.** Contracts freeze now; user-facing import/export ships with Wave 3 / product Phase 2 scope.
6. **Extension capture policy is frozen before extension implementation.** Later extension work may not invent broader capture privileges than the roadmap and tooling plans allow.

## First-pass file-level analysis

The policy-sensitive decisions in this register directly constrain the following implementation surfaces.

| Policy area | File-level surfaces affected later | Why the constraint is required now |
|---|---|---|
| Guest reviewer scope | `server/auth/oidc.js`, `server/auth/session.js`, `server/routes/auth.js`, `server/routes/me.js`, `server/services/authorization.js`, `server/routes/assignments.js`, `server/routes/extension.js` | Identity scope determines who can authenticate, hold assignments, pair an extension session, and receive review permissions. |
| Second-reviewer rights | `server/services/authorization.js`, `server/services/lifecycle.js`, `server/routes/workflow.js`, `server/routes/comments.js`, `static/js/config/sections.js`, `static/js/config/rules.js`, `static/js/state/derive/workflow.js`, `static/js/behavior/field-handlers.js` | Review-stage editability and reopen behavior cannot be implemented safely if second-review rights remain ambiguous. |
| Comment granularity | `server/routes/comments.js`, `server/repositories/comments.js`, `static/js/pages/review-activity.js`, `static/js/render/activity-log.js`, `static/js/render/questionnaire-pages.js` | Comment storage and UI anchors depend on whether field-level threading is required. |
| Publication boundary | `server/services/lifecycle.js`, `server/routes/workflow.js`, `server/services/exporter.js`, `server/repositories/evaluations.js`, `static/js/pages/review-overview.js`, `static/js/render/review-overview.js` | Publication cannot be modeled as a second editable review record without reopening the lifecycle and export contracts. |
| Retention boundary | `server/repositories/evaluations.js`, `server/repositories/evidence-assets.js`, `server/repositories/audit-events.js`, `server/services/exporter.js`, `server/services/importer.js`, `server/storage/object-store.js` | Retention handling affects delete/archive semantics, evidence cleanup, audit preservation, and export completeness. |
| Import/export timing | `server/routes/exports.js`, `server/routes/imports.js`, `server/services/exporter.js`, `server/services/importer.js`, `static/js/pages/import-export.js`, `static/js/render/import-export.js` | Early waves must preserve compatibility without accidentally turning import/export into a hidden Phase 1 requirement. |
| Extension capture boundaries | `server/routes/extension.js`, `server/routes/captures.js`, `server/services/extension-session.js`, `server/services/capture-service.js`, `extension/*`, `static/js/pages/settings.js` | Capture policy determines whether the extension is a thin client or an uncontrolled parallel system. |

## Frozen policy constraints

### PCR-01 — Identity boundary and guest reviewer scope

| Field | Constraint |
|---|---|
| Current implementation rule | Waves 1-4 assume **internal authenticated users only** through the same backend-for-frontend session model. |
| What is explicitly allowed now | Institutional OIDC / Entra-backed sign-in, local user profiles mirrored from that identity, internal assignments, internal extension pairing. |
| What is explicitly not allowed now | Public self-registration, anonymous reviewers, shared reviewer accounts, magic-link guest access, direct external-identity support as part of the baseline implementation. |
| Deferred question | Whether controlled guest/external reviewer access is added later under a separate policy and contract update. |
| Required downstream effect | Auth, assignment, audit, and extension-pairing code must assume a first-party institutional user record exists for every actor. |

### PCR-02 — Second reviewer rights

| Field | Constraint |
|---|---|
| Current implementation rule | The second reviewer is **comment-and-challenge by default**. |
| Editable scope frozen now | `S10B` and allowed comment surfaces in the `second_review` workflow mode. |
| Mutation boundary frozen now | The second reviewer may **not** directly overwrite primary-review criterion scores, section answers, or other primary-owned questionnaire fields while the record remains in `second_review_in_progress`. |
| Allowed escalation path | Return/reopen transitions defined by `docs/contracts/lifecycle-state-map.md` move the record back to a primary-editable state when substantive changes are required. |
| Deferred question | Whether narrowly scoped selective overwrite is ever allowed later under coordinator-controlled policy. |
| Required downstream effect | Authorization, UI editability, and audit logic must implement reopen-driven correction rather than silent second-review overwrite. |

### PCR-03 — Comment granularity

| Field | Constraint |
|---|---|
| Current implementation rule | First collaborative implementation supports **evaluation-level, section-level, and criterion-level** comments only. |
| What is explicitly deferred | Field-level threaded comments, per-control annotations, and arbitrary DOM-anchor comment placement. |
| Reason for freeze | Neither the roadmap nor the current questionnaire model requires field-level comment threading to satisfy collaboration scope. |
| Required downstream effect | Comment schema, API surface, and UI affordances must use stable review/section/criterion anchors and must not require field-level identity or layout coupling. |

### PCR-04 — Publication boundary

| Field | Constraint |
|---|---|
| Current implementation rule | `published` remains a lifecycle state on the **same canonical evaluation record**. |
| What is explicitly allowed now | Publication metadata, export/report projections, and read-only published views derived from the persisted evaluation record. |
| What is explicitly not allowed now | A second editable “publication record”, a detached public-authoring workflow, or a duplicate canonical questionnaire state created solely for publication. |
| Deferred question | Whether a later curated publication projection or public-facing delivery layer is added as a derivative surface. |
| Required downstream effect | Workflow, export, and reporting work must treat publication as a derived state/projection, not as a second authoring system. |

### PCR-05 — Retention boundary

| Field | Constraint |
|---|---|
| Current implementation rule | Exact retention periods remain institutionally unresolved, but the implementation must preserve **retention classes and reversible state boundaries** from the start. |
| What is explicitly allowed now | Soft delete, archive state, retention classification fields, exportable audit history, and reversible evidence/file lifecycle controls. |
| What is explicitly not allowed now | Automatic hard deletion of evaluations, evidence, revisions, or audit records in Waves 1-4 based on undocumented retention assumptions. |
| Deferred question | Final retention durations and disposal rules for drafts, finalized reviews, published reviews, and evidence assets. |
| Required downstream effect | Storage, deletion, archive, and export code must preserve enough metadata for later retention enforcement and legal/records review. |

### PCR-06 — Import/export timing interpretation

| Field | Constraint |
|---|---|
| Current implementation rule | Import/export **contracts freeze in Wave 0**, but user-facing import/export implementation remains **Wave 3 / roadmap Phase 2** scope. |
| What is explicitly allowed now | Contract definition, compatibility preservation, test-fixture generation, and backend schema/API reservation needed to avoid future breakage. |
| What is explicitly not allowed now | Treating export/import as a hidden Phase 1 acceptance criterion or adding partial user-facing import/export flows in Waves 1-2 just because supporting plans describe them as launch pressure. |
| Deferred question | Whether a later delivery decision brings Wave 3 scope forward operationally; that requires plan revision, not silent implementation drift. |
| Required downstream effect | Early persistence and evidence work must remain import/export-compatible, while product-facing import/export surfaces wait until the collaboration wave. |

### PCR-07 — Extension capture boundary

| Field | Constraint |
|---|---|
| Current implementation rule | Extension work remains a **later thin capture client** of the same review/evidence backend. |
| Capture actions explicitly allowed later | User-triggered capture of screenshot, URL, title, selected text, and note into an existing review target or reserved review inbox target. |
| Authentication boundary frozen now | Paired, revocable, short-lived sessions only. No long-lived API keys, no cookie scraping, no direct browser reuse of main-app session cookies. |
| Capture scope frozen now | No review creation from the extension, no hidden/background monitoring, no autonomous target selection, no silent bulk scraping, no parallel evidence store. |
| Deferred question | Later host restriction policy, stricter review-target filtering, or redaction-preview rules beyond the minimum provenance envelope. |
| Required downstream effect | Extension APIs and client work must remain subordinate to the main review/evidence model and must not widen evidence privileges beyond the paired-session boundary. |

## Cross-constraint implementation rules

The following rules apply across all policy areas above.

1. **No policy-sensitive default may remain implicit in code.** If a later implementation depends on one of these constraints, the chosen behavior must be named directly in the relevant contract, API, or authorization logic.
2. **No later wave may widen actor permissions or capture scope by convenience.** Any widening requires an explicit update to this register and any affected downstream contracts.
3. **No user-facing implementation may assume supporting-plan “launch pressure” overrides the roadmap.** Phase/wave timing remains governed by the master roadmap and executable plan unless those documents are revised.
4. **No downstream task may treat deferred policy as undefined.** Deferred means bounded, not open-ended.

## Change-control rule

This register may be changed only if all affected documents are updated together:

- `docs/execution/04-executable-implementation-plan.md` when wave timing or acceptance scope changes;
- `docs/contracts/lifecycle-state-map.md` when workflow authority changes;
- `docs/contracts/import-export-package-contract.md` when package obligations change;
- any later extension or authorization contract when actor/capture scope changes.

Until such a coordinated update exists, this register is the implementation boundary for the policy-sensitive questions named above.
