# Executable plan review

Date: 2026-04-06
Status: review only
Scope: strict review of `docs/execution/04-executable-implementation-plan.md` against the authoritative roadmap, execution synthesis documents, and supporting plans

## Inputs reviewed

Required inputs reviewed:

- `docs/00-master-implementation-roadmap.md`
- `docs/execution/04-executable-implementation-plan.md`
- `docs/execution/01-current-state-inventory.md`
- `docs/execution/02-roadmap-scope-extraction.md`
- `docs/execution/03-dependency-wave-assessment.md`
- `CLAUDE.md`

Supporting plans reviewed:

- `docs/00-simplified-implementation-roadmap.md`
- `docs/plan-backend-architecture.md`
- `docs/plan-frontend-ux.md`
- `docs/plan-a11y-content.md`
- `docs/plan-extension-tooling.md`
- `docs/simplified-backend-essentials.md`
- `docs/simplified-core-product-plan.md`
- `docs/simplified-tooling-extension-plan.md`
- `docs/simplified-ux-content-plan.md`
- `docs/trust-questionnaire.md`
- `docs/ui-fixes/MASTER_PLAN.md`

## Recommendation

**Recommendation: not ready**

The executable plan is directionally aligned with the roadmap on the main architectural guardrails: preserve the current questionnaire as the core work surface, use a same-origin backend-for-frontend, keep evidence assets and links separate, and defer tooling and extension work until after saved reviews and durable evidence exist.

It is not yet execution-safe because it contains four material planning defects:

1. it pulls at least one roadmap Phase 4 feature (`review inbox`) into Wave 3;
2. it fragments the frontend into multiple standalone HTML entrypoints instead of one routed application shell and review shell;
3. it starts implementation tasks that depend on unresolved policy decisions without freezing those decisions in Wave 0;
4. it allows Wave 4 overlap too early and orders Wave 4 tasks contrary to the supporting accessibility/UX sequencing.

The per-task design-review requirement is present throughout the plan and should be retained. The problem is not absence of review gates. The problem is that several task definitions still encode the wrong scope or sequence.

## Roadmap compliance review

## Compliant items

The following parts of the executable plan are consistent with `docs/00-master-implementation-roadmap.md` and the execution synthesis documents:

- **Questionnaire preserved as the permanent core work surface.** The plan does not treat a renderer rewrite as the critical path.
- **Compatibility-first architecture.** Same-origin backend, durable review records, and evidence storage are correctly prioritized ahead of tooling and extension work.
- **Versioned canonical state.** Freezing a review-state contract before persistence is consistent with the roadmap and with `docs/execution/02-roadmap-scope-extraction.md`.
- **Evidence asset/link separation.** This preserves current semantics and avoids regression.
- **Later tooling and extension sequencing.** Waves 5 and 6 are correctly later than saved reviews and durable evidence.
- **Per-task design-review gate.** All tasks `T001` through `T020` include a pre-implementation design-review requirement. This satisfies the explicit requirement that no task proceed directly from plan text to coding.

## Non-compliant or partially compliant items

### 1. `review inbox` is scheduled too early

The roadmap places the review inbox in the later tooling/browser-capture phase. `docs/execution/02-roadmap-scope-extraction.md` also classifies the review inbox as explicit Phase 4 scope. The executable plan pulls it forward into **T011 / Wave 3** by creating `review-inbox.html` and making a user-facing inbox part of the evidence UI acceptance criteria.

This is a direct scope expansion relative to the authoritative roadmap.

### 2. Wave 4 is allowed to overlap before roadmap Phase 2 is complete

The executable plan states that Wave 4 may overlap after Wave 2. The roadmap sequence is: Phase 1 saved app, then Phase 2 collaboration workflow, then Phase 3 work-surface improvement. The execution synthesis documents allow technical overlap only when it does not distort the product-phase order.

As written, the overlap statement is too broad. It permits Phase 3 user-facing work before Phase 2 user-facing workflow completion. That is not scope-preserving.

### 3. Wave 1 includes assignment APIs earlier than the normalized scope requires

`T006` includes `server/routes/assignments.js`, `server/repositories/assignments.js`, and assignment acceptance criteria in Wave 1. The roadmap and `docs/execution/02-roadmap-scope-extraction.md` place ownership/assignments in the later shared-review workflow phase. The supporting backend plan does require assignment-ready data modeling early, but the current task text goes further than schema reservation and enters public API surface and behavior prematurely.

This is not necessarily fatal, but it is currently under-justified and too broad.

### 4. The task-level frontend shape drifts away from “one web app”

The roadmap requires one web app. The executable plan defines a series of standalone HTML entrypoints (`index.html`, `settings.html`, `review-inbox.html`, `review-activity.html`, `import-export.html`, `help.html`, `tooling.html`). That is not automatically invalid, but it is a poor fit for the roadmap guardrail and directly conflicts with the supporting frontend shell plan.

The result is partial compliance at best. The plan needs an explicit one-app route model rather than a pile of top-level documents.

## Supporting-doc compliance review

## Strong alignment with supporting plans

The executable plan aligns well with the following supporting-plan requirements:

- `docs/plan-backend-architecture.md`
  - same-origin Fastify BFF;
  - server-side OIDC/session model;
  - versioned JSON state close to current `EvaluationState`;
  - evidence assets plus scoped associations;
  - separation of frontend workflow mode from backend lifecycle state.

- `docs/execution/03-dependency-wave-assessment.md`
  - Wave 0 contract freeze before implementation;
  - preserve current questionnaire test baseline;
  - do not put a broad frontend rewrite on the persistence critical path;
  - use file-level designs and design-review gates before implementation.

- `docs/plan-extension-tooling.md` and `docs/simplified-tooling-extension-plan.md`
  - tooling before extension;
  - published test-set revisions immutable;
  - extension as thin client of the backend evidence system;
  - revocable, scoped extension sessions.

## Supporting-plan conflicts and omissions

### 1. Frontend shell and route ownership are not carried through

`docs/plan-frontend-ux.md` requires:

- one authenticated app shell;
- one review shell for `reviews/:reviewId/*`;
- route-owned identity for active review, view, section, anchor, and utility tab;
- a review overview view;
- settings/help surfaces as routes rather than review-local overlays.

The executable plan does not carry this forward clearly. Instead it creates separate HTML pages for dashboard, settings, help, activity, import/export, inbox, and tooling. It also omits a concrete review-shell task and omits a dedicated review-overview task.

This is the largest supporting-doc compliance gap.

### 2. Wave 4 task order conflicts with the accessibility/content sequencing

`docs/plan-a11y-content.md` and `docs/simplified-ux-content-plan.md` place render-path stabilization and focus/surface architecture before content migration and content rewrite.

The executable plan orders Wave 4 as:

- `T014` content registry extraction first;
- `T015` shortcut registry, surface manager, and rerender stabilization second;
- `T016` density/readability/accessibility hardening third.

That is the reverse of the recommended sequence. It risks migrating content onto unstable surface and rerender mechanics.

### 3. Open policy decisions are not frozen before dependent tasks

`docs/plan-backend-architecture.md` leaves open at least these decisions:

- guest reviewer scope;
- second reviewer rights;
- comment granularity;
- retention/publication boundary.

The executable plan does not add a Wave 0 decision task to resolve or explicitly defer these items before `T012` and `T013` implement assignments, comments, disagreement capture, and audit behavior. This creates hidden implementation branching inside later tasks.

### 4. Review overview is omitted despite repeated supporting-plan emphasis

`docs/plan-frontend-ux.md` and `docs/simplified-core-product-plan.md` both call for a review overview surface. The executable plan jumps from dashboard to workspace persistence and settings/save-state chrome. A user-facing review overview is not explicitly planned.

This is a material omission from the supporting frontend product shape.

### 5. Extension privacy-envelope decisions are not frozen before extension work

`docs/plan-extension-tooling.md` and `docs/simplified-tooling-extension-plan.md` both state that capture policy and privacy boundaries should be decided before extension implementation begins.

The executable plan includes security constraints in `T019` and `T020`, but it does not include a prior contract/policy task for:

- allowed capture types;
- host restrictions or blocklist/allowlist policy;
- preview/redaction requirement;
- retention/deletion rules for extension-originated captures;
- minimum provenance envelope.

That omission makes Wave 6 under-specified.

### 6. `crash-recovery shadow-cache` is an unsupported assumption

`T008` introduces “crash-recovery shadow-cache boundaries” into the design-review scope. None of the reviewed source documents establish a local shadow-cache as a required or selected architectural element.

The issue is not that local recovery is impossible. The issue is that this behavior is currently introduced as if it were already in scope. It is an unjustified assumption unless Wave 0 explicitly selects it.

## List of gaps, conflicts, and overreach

| ID | Type | Location in executable plan | Finding | Source basis |
|---|---|---|---|---|
| G01 | Overreach | `T011` | Adds a user-facing review inbox in Wave 3 | MR Phase 4; `02-roadmap-scope-extraction.md` P4-04 / 6.3 |
| G02 | Conflict | Executive summary / Wave map | Allows Wave 4 overlap after Wave 2, which can put Phase 3 work ahead of unfinished Phase 2 scope | MR phase order; `03-dependency-wave-assessment.md` |
| G03 | Overreach / under-justified assumption | `T006` | Exposes assignment persistence/API surface in Wave 1 instead of limiting early work to schema reservation/substrate | MR Phase 2; `02-roadmap-scope-extraction.md` 6.3; `plan-backend-architecture.md` sequencing tension |
| G04 | Conflict | `T007`, `T009`, `T011`, `T013`, `T014`, `T017` | Uses multiple standalone HTML entrypoints instead of one routed web app with app shell and review shell | MR “one web app”; `plan-frontend-ux.md` route tree and shell model |
| G05 | Omission | Waves 2–3 | No explicit review overview task or review-shell task | `plan-frontend-ux.md`; `simplified-core-product-plan.md` |
| G06 | Omission | Wave 0 | No contract task resolving guest-reviewer scope, second-reviewer rights, comment granularity, or publication/retention boundary before dependent workflow/comment tasks | `plan-backend-architecture.md` open decisions |
| G07 | Conflict | `T014` before `T015` | Content migration precedes rerender/focus stabilization | `plan-a11y-content.md` Phase 1/2/3 sequencing; `simplified-ux-content-plan.md` implementation order |
| G08 | Omission | Wave 6 prerequisites | No explicit capture-policy envelope task before extension implementation | `plan-extension-tooling.md`; `simplified-tooling-extension-plan.md` |
| G09 | Unjustified assumption | `T008` design-review scope | Introduces crash-recovery shadow cache without source-plan selection | No supporting-plan source found |
| G10 | Omission | Wave 2 routing work | Route-owned review identity outside the current hash-only model is not specified strongly enough as an implementation deliverable | `02-roadmap-scope-extraction.md` 6.2 / 7.2; `plan-frontend-ux.md` routing semantics |

## Required corrections before implementation

The following corrections are required before implementation starts.

### 1. Remove the review inbox from Wave 3 user-facing scope

Do not implement a user-facing inbox in `T011`.

Allowed in Wave 3:

- reserve an inbox target in the evidence contract;
- allow backend models to support a future inbox target;
- keep manual evidence linking at evaluation and criterion scope.

User-facing inbox screens and flows must move to the later tooling/extension wave.

### 2. Replace the multi-document frontend plan with one routed app-shell plan

Revise the task definitions so they no longer imply a collection of standalone documents.

Required outcome:

- one authenticated app shell;
- one review shell for review-scoped views;
- one explicit route/URL ownership model for review id, major subview, active questionnaire section, and focus anchor.

If the implementation remains vanilla JS, that is acceptable. What is not acceptable is leaving route ownership undefined and scattering major views across independent HTML entrypoints without an explicit shell model.

### 3. Add a review overview task in Wave 2

The plan needs a distinct review overview deliverable or an explicit fold-in to an existing Wave 2 task.

Minimum responsibilities:

- review identity summary;
- lifecycle/sync/save-state summary;
- assignee summary;
- progress/evidence summary;
- jump points into workspace and later subviews.

### 4. Narrow `T006` so Wave 1 does not implement premature assignment behavior

Revise `T006` in one of two ways:

- **preferred:** keep Wave 1 to review/revision persistence plus assignment-ready schema reservation only; move assignment APIs and acceptance criteria to `T012`;
- **acceptable alternative:** explicitly label Wave 1 assignment work as non-user-visible substrate only, with no public behavior or role workflow exposed until Wave 3.

The current task text is too broad.

### 5. Add Wave 0 decision outputs for unresolved policy questions

Before workflow/comment/export tasks are implemented, Wave 0 must record decisions or explicit constraints for:

- guest reviewer scope;
- second reviewer edit rights versus comment-only default;
- comment granularity;
- publication/retention boundary for persisted records and evidence;
- import/export timing interpretation where supporting plans exceed the roadmap.

These do not all need final product-policy answers, but they do need explicit implementation constraints.

### 6. Reorder Wave 4 so stabilization precedes content migration

Revise Wave 4 so rerender/focus/surface stabilization happens before the content-registry migration and content rewrite.

Preferred order:

1. rerender stabilization + surface manager + shortcut registry;
2. content registry extraction and structured topic migration;
3. density/readability/accessibility hardening.

### 7. Add an extension policy/contract task before `T019` and `T020`

Before extension implementation, freeze:

- allowed capture types;
- prohibited capture modes;
- preview/redaction requirement;
- provenance minimum fields;
- retention/deletion rules;
- host restrictions and any allowlist/blocklist policy.

This can be a short contract task, but it must exist.

### 8. Remove or justify the shadow-cache assumption in `T008`

Either:

- remove “crash-recovery shadow-cache boundaries” from the task and keep server-authoritative save behavior only; or
- add a Wave 0 contract that explicitly selects a local crash-recovery mechanism and defines its scope.

Do not leave it implicit.

### 9. Tighten the Wave 4 overlap rule

Revise the overlap statement so that Wave 4 work before Wave 3 completion is limited to non-user-visible enabling work only.

User-facing Phase 3 features should not be treated as mergeable before Phase 2 user-facing workflow scope is complete.

## Exact sections and tasks to revise

The following parts of `docs/execution/04-executable-implementation-plan.md` require revision.

### Executive sections

Revise these sections:

- **Executive summary** — tighten the Wave 4 overlap statement.
- **Scope disposition** — remove ambiguity around early review-inbox work.
- **Wave map** — state that Wave 4 implementation is not generally mergeable before Wave 3 completion, except for explicitly non-user-visible enabling tasks.

### Wave 0

Revise these tasks/sections:

- **`T001` / `T003`** — add explicit policy-decision outputs or add a new Wave 0 task covering:
  - second-reviewer rights,
  - guest/external reviewer scope,
  - comment granularity,
  - publication/retention constraints,
  - extension capture policy envelope.

### Wave 1

Revise:

- **`T006`** — remove or narrow assignment API work; defer assignment behavior to Wave 3 or explicitly mark Wave 1 assignment work as internal substrate only.

### Wave 2

Revise:

- **`T007`** — replace `index.html` framing with explicit app-shell/dashboard route work; add or fold in the review-overview deliverable.
- **`T008`** — remove the unsupported shadow-cache assumption unless selected in Wave 0; strengthen route-owned review identity requirements.
- **`T009`** — avoid `settings.html` as a standalone document unless the plan explicitly defines how it remains part of one routed web app.

### Wave 3

Revise:

- **`T011`** — remove `review-inbox.html`, `review-inbox.js`, and the inbox acceptance criterion from Wave 3.
- **`T012`** — keep assignment/user-facing workflow enforcement here as the first real assignment behavior task.
- **`T013`** — avoid introducing `review-activity.html` and `import-export.html` as standalone document planning without the broader route-shell model.

### Wave 4

Revise:

- **`T014`** and **`T015`** — reorder or split so rerender/focus stabilization precedes content migration.
- **`T014`** — add content-governance/validation expectations if it remains the content-registry task.

### Waves 5–6

Revise:

- **`T017`** — avoid `tooling.html` as an isolated document; keep tooling as a routed application area.
- **`T019`** / **`T020`** — add an explicit prerequisite contract/policy task for capture privacy, provenance, and retention.

## Final assessment

The executable plan is close enough to salvage without restarting from zero. The main architecture and most sequencing decisions are sound. The major corrections are concentrated in scope discipline and frontend-shell definition, not in the core backend/evidence direction.

The plan should not be approved as-is.

It should be revised first in the exact places listed above, then re-reviewed before any implementation begins.

## Re-review after repair

Date: 2026-04-06
Status: superseding addendum to the original review above
Scope: concise re-review of the repaired execution pack state after updates to `docs/execution/04-executable-implementation-plan.md` and `docs/execution/03-dependency-wave-assessment.md`

### Superseding verdict

**Recommendation: ready**

The repaired plan resolves the previously blocking planning defects without changing the accepted core architecture. The questionnaire remains the permanent core work surface. The saved-review phase now has one explicit routed app-shell/review-shell model, an explicit review overview deliverable, and no drift into multiple standalone product entrypoints.

### Blocking defects now resolved

1. **User-facing review inbox work no longer appears in Wave 3.** `T011` now keeps inbox support at the contract-reservation level only. User-facing review-inbox work remains deferred to the later tooling/extension phase.
2. **The shell model is now explicit.** The repaired plan freezes one routed compatibility document, one app shell, and one nested review shell, with route ownership for `reviewId`, `overview`, and `workspace/:sectionSlug`.
3. **Saved-review phase now includes a review overview deliverable.** `T009` explicitly adds a review-overview route with review identity, save-state, progress, evidence status, and jump points into the workspace.
4. **Wave 1 assignment work is narrowed correctly.** `T006` now reserves only assignment-ready substrate. Public assignment behavior moves to `T012` in the collaborative workflow wave.
5. **Wave 0 now freezes policy-sensitive constraints.** `T003` adds a policy constraints register covering guest reviewer scope, second-reviewer rights, comment granularity, publication/retention boundaries, import/export timing interpretation, and extension capture boundaries.
6. **Wave 4 order is corrected.** Shell/rerender/focus stabilization now precedes content migration. `T014` performs stabilization first; `T015` performs structured content migration second.
7. **Overlap policy is now tight enough.** The plan now allows only non-user-visible Wave 4 enabling work after Wave 2. User-facing Phase 3 work is explicitly gated until Wave 3 user-facing workflow scope is complete.
8. **The shadow-cache assumption is removed as a selected design element.** `T008` now states that the server copy remains authoritative in Wave 2 and prohibits introducing a second local crash-recovery store at that stage.

### Matching adjustments outside the main plan

`docs/execution/03-dependency-wave-assessment.md` now matches the repaired plan by:

- adding the shell-model and policy-constraints outputs to Wave 0;
- reordering Wave 4 around stabilization before content migration;
- tightening the post-Wave-2 overlap rule to non-user-visible enabling work only;
- freezing the app-shell/review-shell route model as an enabling prerequisite.

### Residual observations

No blocking planning defects remain in the execution pack. Normal task-level design review is still required before implementation of each task, as already mandated by the plan.
