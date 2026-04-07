# Lifecycle state map

Date: 2026-04-06
Status: Wave 0 / T001 complete
Scope: canonical lifecycle vocabulary, workflow/lifecycle separation, transition rules, and file-level implementation requirements for T001 substream B.

## Purpose

This contract freezes the lifecycle vocabulary that later saved-review, workflow, permission, and audit work must use. It does not replace the current questionnaire workflow model. It adds a backend review-record lifecycle on top of the existing frontend workflow vocabulary.

## Reconciliation with the roadmap and executable plan

- The master roadmap keeps the current questionnaire as the permanent core work screen.
- The executable plan requires `workflow_mode` and `lifecycle_state` to remain separate persisted concepts.
- `static/js/config/sections.js` is already the canonical frontend source for workflow modes and section access states.
- `docs/plan-frontend-ux.md` lists coarse lifecycle labels for dashboard and app-shell design. Those labels are useful for presentation but are not precise enough for backend authorization. They are therefore treated as **derived display groupings**, not as the canonical persisted `lifecycle_state` values.
- Assignment state remains a third axis. It is not folded into `workflow_mode` or `lifecycle_state`.

## Frontend workflow vocabulary preserved

### Workflow modes

| `workflow_mode` | Meaning | Baseline editable scope from `sections.js` |
|---|---|---|
| `nomination` | tool nomination and initial profile capture | `S0`, `S1` |
| `primary_evaluation` | primary reviewer performs the main evaluation | `S0`-`S10A` |
| `second_review` | second reviewer records structured review and comments | `S10B`; earlier sections remain visible as read-only |
| `final_team_decision` | team records the final decision | `S10C`; earlier sections remain visible as read-only |
| `re_evaluation` | a new evaluation cycle updates the prior record | `S0`-`S10A` |

### Section workflow access states

| `SECTION_WORKFLOW_STATES` value | Meaning |
|---|---|
| `editable` | section may be edited if lifecycle and permission overlays also allow it |
| `read_only` | section is visible but not mutable |
| `system_skipped` | section is out of scope for the current workflow mode |

**Rule:** lifecycle and permission checks may only **narrow** the access that `sections.js` grants. They must never widen it. A section that is `read_only` or `system_skipped` in `sections.js` cannot be made `editable` by lifecycle logic.

## Canonical lifecycle states

The canonical persisted `lifecycle_state` values are:

| `lifecycle_state` | `workflow_mode` to persist | Lifecycle overlay on top of `sections.js` | Primary actors | Purpose |
|---|---|---|---|---|
| `nomination_draft` | `nomination` | no extra lock; use nomination baseline | nominator, coordinator | initial record creation and nomination refinement |
| `nomination_submitted` | `nomination` | lock all questionnaire sections; only administrative triage actions remain | coordinator | nomination captured and awaiting triage |
| `primary_assigned` | `primary_evaluation` | lock all questionnaire sections until the assignee starts the review | coordinator, assigned primary | primary reviewer assigned but not yet actively editing |
| `primary_in_progress` | `primary_evaluation` | use primary-evaluation baseline, subject to assignment permissions | primary evaluator | main evidence gathering, scoring, and narrative work |
| `primary_handoff_ready` | `primary_evaluation` | lock primary-scored content except explicit reopen/return actions | primary evaluator, coordinator | primary review submitted and ready for second-review handoff |
| `second_review_assigned` | `second_review` | lock all questionnaire sections until the second reviewer starts the review | coordinator, assigned second reviewer | second-review assignment created |
| `second_review_in_progress` | `second_review` | use second-review baseline; prior sections remain read-only unless reopened | second reviewer | second-review comments, agreement, reservations, or disagreement capture |
| `decision_pending` | `final_team_decision` | use final-decision baseline; prior sections remain read-only | decision participants, coordinator | record is awaiting final team resolution |
| `finalized` | `final_team_decision` | lock all questionnaire sections; allow publish, reopen, or archive only | coordinator, decision participants, admin | final decision recorded but not yet published or archived |
| `published` | `final_team_decision` | lock all questionnaire sections; publication/reporting state is active | coordinator, auditor, admin | published recommendation of record |
| `re_evaluation_in_progress` | `re_evaluation` | use re-evaluation baseline for the new review cycle | assigned re-evaluator, coordinator | a scheduled or triggered re-evaluation is underway |
| `archived` | preserve prior `workflow_mode` for history; overlay forces read-only | lock all questionnaire sections regardless of prior workflow mode | admin, auditor | inactive historical record |

**Rule:** `archived` does not redefine the record’s historical workflow mode. It preserves the last non-archived `workflow_mode` for rendering/history purposes while the lifecycle overlay forces the record read-only.

## UX-label reconciliation

The coarse review-state labels in `docs/plan-frontend-ux.md` map to the canonical lifecycle contract as follows:

| UX label from `plan-frontend-ux.md` | Contract interpretation |
|---|---|
| `draft` | display bucket for `nomination_draft`, `nomination_submitted`, and `primary_assigned` |
| `primary_in_progress` | direct display label for `primary_in_progress` |
| `awaiting_second_review` | display bucket for `primary_handoff_ready`, `second_review_assigned`, and `second_review_in_progress` |
| `ready_for_decision` | display label for `decision_pending` |
| `conflict` | **derived escalation flag**, not a canonical `lifecycle_state`; computed from disagreement, critical-fail escalation, or coordinator reopen requirements |
| `published` | direct display label for `published` |
| `archived` | direct display label for `archived` |
| `re_evaluation_due` | **derived due-status flag**, not a canonical `lifecycle_state`; computed from publication/review-cycle metadata such as `next_review_due_at` |

This reconciliation keeps the UX plan usable for dashboard summaries without collapsing the backend lifecycle vocabulary required by the executable plan.

## Allowed transitions

Only the following lifecycle transitions are canonical for the initial saved-review product:

| Transition id | From | To | Resulting `workflow_mode` | Notes |
|---|---|---|---|---|
| `submit_nomination` | `nomination_draft` | `nomination_submitted` | `nomination` | nominator completes initial submission |
| `return_nomination_to_draft` | `nomination_submitted` | `nomination_draft` | `nomination` | coordinator requests nomination edits |
| `assign_primary` | `nomination_submitted` | `primary_assigned` | `primary_evaluation` | coordinator assigns the primary reviewer |
| `start_primary_review` | `primary_assigned` | `primary_in_progress` | `primary_evaluation` | assigned primary starts work |
| `submit_primary_handoff` | `primary_in_progress` | `primary_handoff_ready` | `primary_evaluation` | primary reviewer submits the record for second review |
| `reopen_primary_from_handoff` | `primary_handoff_ready` | `primary_in_progress` | `primary_evaluation` | coordinator or policy-approved actor reopens primary work before second review starts |
| `assign_second_review` | `primary_handoff_ready` | `second_review_assigned` | `second_review` | coordinator assigns the second reviewer |
| `start_second_review` | `second_review_assigned` | `second_review_in_progress` | `second_review` | assigned second reviewer starts work |
| `request_primary_rework` | `second_review_in_progress` | `primary_in_progress` | `primary_evaluation` | second reviewer or coordinator sends the record back to primary review |
| `submit_second_review` | `second_review_in_progress` | `decision_pending` | `final_team_decision` | second reviewer completes structured review |
| `request_second_review_rework` | `decision_pending` | `second_review_in_progress` | `second_review` | decision participants request additional second-review work |
| `request_primary_rework_from_decision` | `decision_pending` | `primary_in_progress` | `primary_evaluation` | decision participants reopen primary work |
| `finalize_decision` | `decision_pending` | `finalized` | `final_team_decision` | team records the final decision of record |
| `publish_record` | `finalized` | `published` | `final_team_decision` | coordinator publishes the finalized record |
| `reopen_finalized_to_primary` | `finalized` | `primary_in_progress` | `primary_evaluation` | finalized record is reopened for substantive primary changes |
| `start_re_evaluation_from_finalized` | `finalized` | `re_evaluation_in_progress` | `re_evaluation` | finalized record enters a formal re-evaluation cycle |
| `reopen_published_to_primary` | `published` | `primary_in_progress` | `primary_evaluation` | published record is reopened for substantive corrections |
| `start_re_evaluation` | `published` | `re_evaluation_in_progress` | `re_evaluation` | scheduled or ad hoc re-evaluation begins |
| `submit_re_evaluation_handoff` | `re_evaluation_in_progress` | `primary_handoff_ready` | `primary_evaluation` | re-evaluation completes its primary stage and re-enters the normal handoff path |
| `archive_record` | `nomination_draft`, `nomination_submitted`, `finalized`, `published` | `archived` | preserve prior `workflow_mode` | archive is limited to inactive records in the initial contract |

### Transition constraints

- No direct transition may skip required governance stages. Examples:
  - no `primary_in_progress -> decision_pending`;
  - no `second_review_in_progress -> finalized`;
  - no `published -> decision_pending`.
- Reassignment by itself does not require a lifecycle change unless the transition set above explicitly moves the record into or out of an `*_assigned` state.
- Every accepted lifecycle transition must be written to the workflow transition log and must create an immutable revision snapshot.
- Disagreement and critical-fail escalation are recorded as structured review content and audit data. They may drive reopen transitions or dashboard conflict indicators, but they are not separate canonical lifecycle states in this contract.

## Concrete file-level requirements

| File | Requirement created by this contract |
|---|---|
| `static/js/config/sections.js` | Remains the authoritative source for `WORKFLOW_MODES` and section-level workflow access states only. Do not add backend lifecycle values here. |
| `static/js/state/store.js` | Keep `evaluation.workflow.mode` as the current frontend-compatible workflow field. Do **not** add `lifecycle_state` inside `evaluation.workflow`. Lifecycle metadata belongs in the persisted review-record envelope or a separate future review-meta slice. |
| `static/js/state/derive/workflow.js` | Future lifecycle integration must intersect backend lifecycle/permission overlays with the `sections.js` baseline. Lifecycle may lock more; it may never unlock more. |
| `server/services/lifecycle.js` | Must implement exactly the canonical lifecycle vocabulary and transition set defined above. Unspecified transitions must reject. |
| `server/routes/workflow.js` | Must expose explicit transition operations rather than implicit lifecycle mutation. |
| `server/repositories/evaluations.js` | Must persist indexed `workflow_mode` and `lifecycle_state`, and must keep the indexed `workflow_mode` synchronized with `current_state_json.workflow.mode`. |
| `server/repositories/workflow-transitions.js` | Must persist `transition_id`, `from_lifecycle_state`, `to_lifecycle_state`, resulting `workflow_mode`, actor, reason, and timestamp. |
| `tests/unit/server/workflow.test.js` | Must cover allowed and rejected transitions plus lifecycle overlay rules. |
| `tests/e2e/workflow.spec.js` | Must cover handoff, second review, final decision, reopen, and re-evaluation entry flows using this lifecycle map. |

## Contract summary

This document freezes the initial lifecycle state machine for persisted review records. The canonical review workflow visible in the current questionnaire remains intact through `workflow_mode`, while backend lifecycle state adds the missing authority for assignment, handoff, finalization, publication, archival, and re-evaluation without collapsing those concepts into a single field.
