# Deferred scope register

Date: 2026-04-06
Status: Wave 0 / T003 substream D complete
Scope: explicitly deferred product scope and technical options that later waves must honor without silent pull-forward into earlier implementation work

## Purpose

This register records the scope that is **committed but deferred**, **reserved but not yet user-facing**, or **explicitly not selected** for the current execution path.

Its purpose is to prevent later waves from being distorted by accidental early implementation. A deferred item is still in scope unless marked otherwise, but it is not available to earlier waves by implication.

## Reconciliation with the roadmap and executable plan

The authoritative ordering used by this register is:

- `docs/00-master-implementation-roadmap.md` defines product-phase order.
- `docs/execution/04-executable-implementation-plan.md` defines execution waves.
- `docs/execution/03-dependency-wave-assessment.md` defines what may overlap safely and what must not.

The corrected interpretation applied here is:

1. the saved-review application remains the first user-facing product increment;
2. collaborative workflow, comments/activity, export/import, and durable evidence complete the next major increment;
3. user-facing work-surface/content migration follows workflow completion, except for tightly bounded non-user-visible enabling work;
4. tooling/test sets follow stable saved-review and evidence APIs;
5. the browser extension follows the stable tooling/review/evidence platform;
6. React/Vite migration, live co-editing, and other optional technical expansions remain deferred technical options, not prerequisites.

## First-pass file-level analysis

The deferred items below map to concrete file-level guardrails so early implementation does not drift into later-wave work.

| Deferred scope area | File-level guardrails |
|---|---|
| User-facing assignment workflow before Wave 3 | Do not expose assignment UX or public assignment endpoints before `T012`. `server/routes/assignments.js` and workflow-facing assignment UI must remain absent from Wave 1 behavior beyond substrate reservation. |
| User-facing import/export before Wave 3 | Do not create `static/js/pages/import-export.js` or `static/js/render/import-export.js` in Waves 1-2. Contract and backend reservation work may proceed; product-facing import/export surfaces do not. |
| User-facing review inbox before Wave 6 | Do not create `static/js/pages/review-inbox.js`, `static/js/render/review-inbox.js`, or inbox-facing review-shell routes before the extension/tooling phase. Reserve only the target contract where needed. |
| Help/Reference/About relocation before Wave 4 | Do not move shared long-form content ownership out of `trust-framework.html` during Waves 1-3. App-shell placeholders are allowed only if they do not become a second content source. |
| Broad shell/rerender/focus changes during persistence work | Do not combine large edits to `trust-framework.html`, `static/js/behavior/navigation.js`, `static/js/behavior/context-tracking.js`, `static/js/behavior/pager.js`, and `static/js/render/sidebar.js` with Wave 2 persistence integration unless the work is explicitly classified as post-Wave-2 enabling stabilization. |
| Tooling/test-set work before Wave 5 | Do not create `server/routes/test-sets.js`, `server/routes/review-test-plans.js`, `static/js/pages/tooling.js`, `static/js/render/test-set-list.js`, or questionnaire-embedded tooling state before the tooling wave. |
| Browser extension work before Wave 6 | Do not create `extension/*`, `server/routes/extension.js`, `server/routes/captures.js`, or paired-session UI earlier than the extension wave. |
| React/Vite/frontend replacement as a hidden prerequisite | Do not add a second package root, Vite runtime, React app shell, or separate framework bootstrap as a dependency for Waves 1-4. |
| Local crash-recovery shadow store in Wave 2 | Do not introduce a second authoritative local recovery store during save/resume integration. The server copy remains authoritative in Wave 2. |

## Deferred scope entries

### DSR-01 — Assignment behavior is deferred to the collaborative workflow wave

| Field | Constraint |
|---|---|
| Earliest wave for user-facing behavior | Wave 3 (`T012`) |
| What may happen earlier | Schema reservation and assignment-ready substrate only in Wave 1 review persistence work. |
| What is explicitly deferred | Public assignment APIs, assignee management UI, handoff UI, stage-owned permissions, and role-driven review queues beyond basic saved-review ownership display. |
| Why deferred | The roadmap places ownership/assignments in the shared-review workflow phase, not in the initial saved-review increment. |

### DSR-02 — User-facing import/export remains deferred until Wave 3 / product Phase 2

| Field | Constraint |
|---|---|
| Earliest wave for user-facing behavior | Wave 3 (`T013`) |
| What may happen earlier | Contract freeze, compatibility preservation, and backend package-shape reservation. |
| What is explicitly deferred | Import/export pages, export jobs, import workflows, archive downloads, and user-facing operational reporting around those flows. |
| Why deferred | The roadmap and executable plan require saved-review delivery first, even though several supporting plans apply launch pressure to bring import/export forward. |

### DSR-03 — User-facing review inbox is deferred to the tooling/extension phase

| Field | Constraint |
|---|---|
| Earliest wave for user-facing behavior | Wave 6 (`T020`) |
| What may happen earlier | Contract-level reservation of `review_inbox` as a future evidence target; no surface-level UI. |
| What is explicitly deferred | Inbox routes, triage lists, inbox filtering, inbox-to-criterion reassignment UX, and any dashboard/widget that treats inbox items as active product scope before the extension pilot. |
| Why deferred | The roadmap and scope extraction place the review inbox with later browser-assisted capture, not in the core evidence/storage wave. |

### DSR-04 — Shared Help/Reference/About relocation is deferred until Wave 4

| Field | Constraint |
|---|---|
| Earliest wave for user-facing behavior | Wave 4 (`T015`) |
| Required predecessor | Wave 4 stabilization work (`T014`) must be complete first. |
| What may happen earlier | Inventory work, topic-id planning, and app-shell scaffolding that does not fork the current content source. |
| What is explicitly deferred | Structured content registry as the live source, app-level help/reference/about routes populated from that registry, and removal of the questionnaire HTML as the primary shared-content store. |
| Why deferred | The content plans require stabilization of rerender/focus/shell ownership before content migration. |

### DSR-05 — User-facing Wave 4 improvements may not start before Wave 3 user-facing workflow scope completes

| Field | Constraint |
|---|---|
| Overlap rule | Only **non-user-visible enabling work** may overlap after Wave 2 becomes stable. |
| Allowed early overlap | Shortcut registry groundwork, surface manager design, rerender-decoupling preparation, focus architecture cleanup, content inventory. |
| What is explicitly deferred until after Wave 3 user-facing completion | App-level help/reference/about rollout, broad workspace-density changes, user-facing content migration, and visual hardening that depends on stabilized shell/view ownership. |
| Why deferred | Product-phase sequencing must remain Phase 1 saved app -> Phase 2 collaborative workflow -> Phase 3 work-surface/content improvements. |

### DSR-06 — Tooling workspace and reusable test sets are deferred to Wave 5

| Field | Constraint |
|---|---|
| Earliest wave for user-facing behavior | Wave 5 (`T017`, `T018`) |
| What may happen earlier | Evidence and export contracts must preserve compatibility for later test-set linkage and reporting. |
| What is explicitly deferred | Tooling routes, test-set CRUD, published revision pinning UI, review-linked test plans, review-linked test runs, and related reporting surfaces. |
| Why deferred | Tooling depends on stable saved-review identity, durable evidence APIs, and export/report contracts that do not exist earlier. |

### DSR-07 — Browser extension delivery is deferred to Wave 6

| Field | Constraint |
|---|---|
| Earliest wave for user-facing behavior | Wave 6 (`T019`, `T020`) |
| What may happen earlier | Policy and contract freezing only. |
| What is explicitly deferred | Extension popup flows, paired-session management UI, capture queue logic, screenshot/selection upload flows, and review-inbox user-facing integration. |
| Why deferred | The extension is a thin convenience layer on top of the web application, not part of the product foundation. |

### DSR-08 — React/Vite/frontend replacement remains an explicitly deferred technical option

| Field | Constraint |
|---|---|
| Status | Deferred technical option; not selected for the execution path through Wave 4. |
| What is explicitly not allowed | Making a React/Vite shell, a second package root, or a framework migration a prerequisite for backend identity, persistence, evidence, workflow, or Wave 4 stabilization work. |
| What remains allowed later | A separately approved compatibility-preserving migration after the core saved-review and collaboration product is stable. |
| Why deferred | The master roadmap explicitly rejects making frontend replacement the center of delivery. |

### DSR-09 — Live simultaneous co-editing remains deferred / not selected

| Field | Constraint |
|---|---|
| Status | Deferred technical option; not part of the baseline collaborative model. |
| What is explicitly not allowed | CRDT-style free-for-all editing, field-level simultaneous merge behavior, or a second collaboration protocol that bypasses lifecycle/assignment ownership. |
| Selected alternative | Advisory presence, optimistic concurrency, explicit reopen/rework flows, and auditable stage ownership. |
| Why deferred | The current product is a structured review instrument with explicit ownership and governance stages, not a general-purpose collaborative editor. |

### DSR-10 — Multi-browser extension rollout is deferred beyond the pilot

| Field | Constraint |
|---|---|
| Status | Deferred beyond Wave 6 pilot scope. |
| Selected pilot scope | Chromium-first only. |
| What is explicitly deferred | Firefox/Safari/Edge-specific packaging and support commitments beyond Chromium compatibility where it is naturally inherited. |
| Why deferred | The extension pilot must validate the capture/session model before broadening browser support. |

### DSR-11 — Local crash-recovery shadow store is not selected in Wave 2

| Field | Constraint |
|---|---|
| Status | Explicitly not selected for Wave 2. |
| What is explicitly not allowed | Introducing a second authoritative browser persistence layer during create/open/save/continue/resume work. |
| Selected alternative | Server-authoritative save/resume with revision and ETag/conflict behavior. |
| Why deferred | The repaired executable plan explicitly removed the unsupported shadow-cache assumption from the Wave 2 baseline. |

## Cross-wave guardrails

1. **Deferred does not mean optional.** Items marked deferred but committed remain in scope for their stated later waves unless the roadmap or executable plan is revised.
2. **Reserved contract support does not authorize user-facing rollout.** Examples: `review_inbox` may exist in contracts before any inbox UI exists; assignment substrate may exist before assignment behavior is exposed.
3. **No earlier wave may satisfy its acceptance criteria by partially implementing a later-wave feature.** If an earlier wave appears blocked, the correct response is a plan revision, not hidden scope pull-forward.
4. **File creation is part of scope control.** If a later-wave file or route appears early, it requires explicit justification against this register.

## Change-control rule

This register must be updated before any of the following changes are made:

- pulling a later-wave feature into an earlier wave;
- turning a deferred technical option into a prerequisite;
- adding user-facing surfaces for a contract-reserved capability;
- relaxing the post-Wave-2 overlap rule for user-facing Phase 3 work.

Until such an update exists, this register is the execution boundary for deferred scope.
