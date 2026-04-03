# Form schema and dependency model for converting the TRUST questionnaire demo into a real interactive form

## Scope

This report defines the form-schema and dependency requirements needed to convert the current demonstration-only questionnaire into a real, data-bearing questionnaire.

Sources reviewed:

- `trust-framework.html`
- `docs/trust-questionnaire.md`
- `docs/review/trust-ms-forms-questionnaire-spec.md`
- `docs/trust-framework-v2.md`

This report is limited to schema, field typing, option sets, validation, conditional logic, skip semantics, section notes/comments, and source-of-truth structure. It does not propose UI implementation details or modify production code.

## Current state: the HTML is presentational, not a form

The current `trust-framework.html` questionnaire panel is a synchronized demonstration surface. It is not a real form.

Observed facts:

- `0` `<form>` elements
- `0` `<select>` elements
- `0` `<textarea>` elements
- `0` text inputs
- `0` URL inputs
- `0` date inputs
- visual-only JavaScript for navigation, selection highlighting, and progress display
- no field names, no submission model, no persistence layer, no validation engine, and no dependency engine

The current questionnaire therefore documents intended structure but does not yet encode actual form behavior.

## Inventory of current placeholder/demo controls that must become real controls

### Global inventory

| Placeholder/demo pattern | Count | Current role | Required real representation |
|---|---:|---|---|
| `mock-control` | 36 | Visual stand-in for dropdowns, short text, URL fields, dates, numeric values, and judgments | Real typed fields: single-select enum, short text, URL, date, number, or computed read-only field |
| `textarea-mock` | 73 | Visual stand-in for long text and evidence fields | Real textarea, repeatable URL collection, or structured note field |
| `rating-scale` | 16 | Visual criterion scoring widget | Real radio group or single-select enum storing integer score `0..3` |
| Disabled checkbox inputs | 41 | Visual stand-in for multi-select fields, flags, and checklist items | Real checkbox group, stored boolean set, or computed checklist item |
| `condition-tag` | 26 | Inline documentation of conditional behavior | Machine-readable dependency rules; not UI text alone |
| `field-group` containers | 135 | Visual field wrappers | Backed by actual field definitions and response state |

### Inventory by questionnaire section

| Section | Title | Field groups in HTML | Mock controls | Textarea mocks | Rating scales | Disabled checkboxes | Conversion note |
|---|---|---:|---:|---:|---:|---:|---|
| 0 | Workflow Control | 6 | 5 | 1 | 0 | 0 | All six fields need real data types |
| 1 | Tool Profile | 10 | 6 | 1 | 0 | 20 | Category, use cases, and user groups need real multi-selects |
| 2 | Evaluation Setup | 10 | 7 | 3 | 0 | 0 | Dates, URL, and conditional evidence fields need real typing |
| 3 | Transparent (TR) | 14 | 0 | 10 | 3 | 0 | Criterion cluster pattern begins |
| 4 | Reliable (RE) | 16 | 1 | 11 | 3 | 0 | Includes numeric manual-check count |
| 5 | User-Centric (UC) | 20 | 0 | 15 | 4 | 0 | Criterion cluster plus persona/integration fields |
| 6 | Secure (SE) | 21 | 3 | 13 | 4 | 0 | Includes three additional compliance/escalation fields |
| 7 | Traceable (TC) | 11 | 1 | 7 | 2 | 0 | Includes traceable-claims metric |
| 8 | Critical Fails and Confidence | 4 | 1 | 1 | 0 | 14 | Flags and checklist must become real state |
| 9 | Overall Recommendation | 7 | 2 | 5 | 0 | 0 | Recommendation and next-review logic required |
| 10 | Second Review and Governance | 16 | 10 | 6 | 0 | 0 | Governance workflow requires typed dates, people, enums, and rationale fields |

### Controls that should remain display-only

The following elements are reference or navigation artifacts and should not be modeled as answer-bearing fields:

- standard answer set reference cards
- top navigation buttons (`TR`, `RE`, `UC`, `SE`, `TC`)
- progress bars and completion strip
- color/state labels used only for orientation

## Observed source inconsistencies that must be resolved before implementation

The HTML demo, the canonical questionnaire document, and the Microsoft Forms implementation note are not identical.

Notable differences:

1. `docs/trust-questionnaire.md` describes the questionnaire as the canonical specification, while `docs/review/trust-ms-forms-questionnaire-spec.md` contains implementation-oriented simplifications.
2. Section 1 option labels vary slightly across artifacts, especially for access model and deployment phrasing.
3. Section 6 appears undercounted in the field-summary appendix of `docs/trust-questionnaire.md`. The explicit field listing yields 21 modeled fields, not 18.
4. Section 8 completion checklist wording differs between the canonical questionnaire and the HTML demo.
5. Section 9 conditional text in the HTML (`Required unless "Recommended"`) is broader than the canonical questionnaire, which requires caveats only for selected recommendation statuses.
6. Section 10 is simplified in the Microsoft Forms note but more explicit in the canonical questionnaire.

Implementation should therefore use a schema-first approach and select one authoritative field inventory. The recommended canonical inventory is the one in `docs/trust-questionnaire.md`, with MS Forms-specific deviations treated as renderer constraints, not schema truth.

## Canonical modeling principles

1. **Schema first.** The canonical questionnaire definition must exist independently of the HTML demo and independently of any specific form platform.
2. **Definition separated from response state.** Field definitions, options, validation rules, and dependency rules should not be mixed with evaluator answers.
3. **Typed values only.** Dates, URLs, counts, percentages, enums, and person references should be stored as typed values, not as display strings.
4. **Criterion clusters are atomic.** In Sections 3–7, the answerable unit is the criterion record (`TR1`, `RE2`, etc.), not disconnected subfields.
5. **Skip state is first-class.** A skipped question or section is not equivalent to a negative answer and must be recorded explicitly with reason and rationale.
6. **Derived fields are computed.** Principle judgments, some checklist items, and some workflow statuses should be computed from answer state and only overridden under controlled conditions.
7. **Section notes are separate from scoring fields.** Notes must not be overloaded into summary, blocker, or caveat fields.

## Recommended canonical source model

The recommended source model has two layers.

### 1. Definition layer

This is the schema and should be versioned.

| Entity | Purpose |
|---|---|
| `QuestionnaireDefinition` | Questionnaire version, framework version, and top-level metadata |
| `SectionDefinition` | Section IDs, titles, workflow applicability, and ordering |
| `FieldDefinition` | Field IDs, data types, option-set references, requiredness, and validation references |
| `CriterionDefinition` | Canonical criterion codes (`TR1`..`TC2`) and criterion text |
| `OptionSet` | Controlled value sets for dropdowns, radio groups, and checkbox groups |
| `ValidationRule` | Field-level and cross-field validation logic |
| `DependencyRule` | Visibility, requiredness, branching, and lock/unlock rules |
| `ComputedFieldDefinition` | Derived fields such as principle judgment and checklist status |

### 2. Submission layer

This is the actual evaluation data.

| Entity | Purpose |
|---|---|
| `EvaluationRecord` | Parent record for one evaluation cycle |
| `SectionState` | Completion/skip/note state for each section |
| `FieldResponse` | Typed response for ordinary fields |
| `CriterionResponse` | Structured response for each criterion |
| `EvidenceReference` | Structured evidence link or evidence-file reference |
| `WorkflowEvent` | Handoff, second review, and final decision records |
| `CommentEntry` | Optional append-only comments by reviewer or decision participant |

## Proposed canonical data model by section

### Shared section metadata

Every section should carry the same section-state envelope.

| Property | Type | Required | Notes |
|---|---|---:|---|
| `section_id` | enum | Yes | Stable code, e.g. `S0`, `S3_TR`, `S10B` |
| `status` | enum | Yes | `not_started`, `in_progress`, `complete`, `system_skipped`, `user_skipped` |
| `section_note` | long text | No | Free note for section-level observations not captured elsewhere |
| `section_skip_reason_code` | enum | Conditional | Required when `status = user_skipped` |
| `section_skip_rationale` | long text | Conditional | Required when `status = user_skipped` |
| `updated_by` | person ref | Yes | Last editor |
| `updated_at` | datetime | Yes | Last update timestamp |

### Shared criterion model for Sections 3–7

| Property | Type | Required | Notes |
|---|---|---:|---|
| `criterion_code` | enum | Yes | `TR1`, `TR2`, ..., `TC2` |
| `score` | integer enum | Conditional | `0`, `1`, `2`, `3`; required unless criterion skipped |
| `evidence_summary` | long text | Conditional | Required unless criterion skipped |
| `evidence_links` | URL list | Conditional | Structured list; required unless criterion skipped |
| `uncertainty_or_blockers` | long text | Conditional | Required when `score in {0,1}` |
| `criterion_note` | long text | No | Optional local note |
| `criterion_status` | enum | Yes | `answered`, `user_skipped`, `inherited_section_skip` |
| `criterion_skip_reason_code` | enum | Conditional | Required when criterion skipped |
| `criterion_skip_rationale` | long text | Conditional | Required when criterion skipped |

### Section 0 — Workflow control

Canonical object: `workflow_control`

| Field | Recommended type | Notes |
|---|---|---|
| `submission_type` | single-select enum | `Nomination`, `Primary evaluation`, `Second review`, `Final team decision`, `Re-evaluation` |
| `tool_name` | short text | Canonical product name |
| `tool_url` | URL | Primary product URL |
| `prior_evaluation_id` | record reference | Not free text if a record store exists |
| `responder_role` | single-select enum | Role of the current submitter |
| `nomination_reason` | long text | Conditional |
| `section_note` | long text | Optional |

### Section 1 — Tool profile

Canonical object: `tool_profile`

| Field | Recommended type | Notes |
|---|---|---|
| `vendor` | short text | Organization or maintaining body |
| `category` | multi-select enum | With optional `category_other_text` |
| `deployment_type` | single-select enum | Renderer wording can vary; canonical values should be fixed |
| `scope_status` | single-select enum | `In scope`, `Out of scope`, `Partially in scope` |
| `scope_rationale` | long text | Conditional |
| `primary_use_cases` | multi-select enum | With optional `primary_use_cases_other_text` |
| `target_user_groups` | multi-select enum | With optional `target_user_groups_other_text` |
| `access_model` | single-select enum | Controlled vocabulary required |
| `account_required` | single-select enum | `Yes`, `No`, `Optional` preferred over free text |
| `sign_in_methods` | multi-select enum | Conditional; use controlled values plus `other_text` |
| `section_note` | long text | Optional |

### Section 2 — Evaluation setup

Canonical object: `evaluation_setup`

| Field | Recommended type | Notes |
|---|---|---|
| `testing_start_date` | date | Use real date field |
| `testing_end_date` | date | Use real date field |
| `pricing_tier_tested` | single-select enum or short text | Prefer enum if vocabulary is stable |
| `hands_on_access_confirmed` | single-select enum | `Yes`, `No` |
| `sample_queries_or_scenarios` | long text | Required on evaluation paths |
| `repeated_query_test_performed` | single-select enum | `Yes`, `No` |
| `repeated_query_text` | long text | Conditional |
| `benchmark_comparison_performed` | single-select enum | `Yes`, `No` |
| `benchmark_sources` | long text or multi-value text | Conditional |
| `sensitive_data_entered` | single-select enum | `Yes`, `No` |
| `evidence_folder_link` | URL | Prefer single absolute URL |
| `section_note` | long text | Optional |

### Sections 3–7 — Principle sections

The five TRUST principle sections should share one reusable criterion pattern and differ only in criterion codes and additional section-level fields.

| Section | Criteria | Additional section-level fields |
|---|---|---|
| Section 3 — `transparent` | `TR1`, `TR2`, `TR3` | `principle_summary`, `principle_judgment`, `section_note` |
| Section 4 — `reliable` | `RE1`, `RE2`, `RE3` | `test_method_description`, `claims_manually_checked_count`, `principle_summary`, `principle_judgment`, `section_note` |
| Section 5 — `user_centric` | `UC1`, `UC2`, `UC3`, `UC4` | `target_user_personas`, `workflow_integrations_observed`, `principle_summary`, `principle_judgment`, `section_note` |
| Section 6 — `secure` | `SE1`, `SE2`, `SE3`, `SE4` | `dpia_privacy_escalation_needed`, `copyright_licensing_concern`, `compliance_assessment`, `principle_summary`, `principle_judgment`, `section_note` |
| Section 7 — `traceable` | `TC1`, `TC2` | `claims_traceable_percentage`, `principle_summary`, `principle_judgment`, `section_note` |

Section-level field recommendations:

| Field | Recommended type | Notes |
|---|---|---|
| `principle_summary` | long text | Required when section is active and not skipped |
| `principle_judgment` | computed enum with controlled override | `Pass`, `Conditional pass`, `Fail` |
| `claims_manually_checked_count` | integer | Real number field; do not keep as display text |
| `claims_traceable_percentage` | integer percentage | Store `0..100`, not textual range; renderer may display buckets if needed |
| `dpia_privacy_escalation_needed` | single-select enum | `Yes`, `No`, `Unclear` |
| `copyright_licensing_concern` | single-select enum | `Yes`, `No`, `Unclear` |
| `compliance_assessment` | single-select enum | `Compliant`, `Likely compliant`, `Unclear`, `Non-compliant` or agreed canonical equivalent |

### Section 8 — Critical fails and confidence

Canonical object: `critical_fails_and_confidence`

| Field | Recommended type | Notes |
|---|---|---|
| `critical_fail_flags` | multi-select enum | Controlled list of canonical flags |
| `critical_fail_notes` | long text | Conditional |
| `completion_checks` | boolean set, partly computed | Do not keep as visual-only checklist |
| `overall_review_confidence` | single-select enum | `High`, `Medium`, `Low` |
| `section_note` | long text | Optional |

Recommendation for `completion_checks`: store explicit boolean keys, not a single text blob.

Suggested canonical keys:

- `all_criteria_scored_with_evidence`
- `evidence_bundle_populated`
- `repeated_query_test_completed_or_omission_documented`
- `benchmark_completed_or_omission_documented`
- `privacy_terms_reviewed`
- `sample_queries_documented`
- `all_low_score_blockers_completed`

The current HTML checklist is narrower than the canonical questionnaire and should not be used as the final source-of-truth list.

### Section 9 — Overall recommendation

Canonical object: `overall_recommendation`

| Field | Recommended type | Notes |
|---|---|---|
| `recommendation_status` | single-select enum | Controlled list of canonical recommendation statuses |
| `conclusion_summary` | long text | Required on evaluation paths |
| `conditions_or_caveats` | long text | Conditional |
| `suitable_use_cases` | multi-select enum plus optional text | Should reuse or align with Section 1 use-case vocabulary |
| `unsuitable_or_high_risk_use_cases` | long text | Required on evaluation paths |
| `public_facing_summary` | long text | One-paragraph external/internal summary |
| `next_review_due` | date | Real date field |
| `section_note` | long text | Optional |

### Section 10 — Governance and review workflow

Recommendation: treat Section 10 as structured workflow events rather than a flat miscellaneous section.

#### 10A — Primary evaluation handoff

| Field | Recommended type | Notes |
|---|---|---|
| `primary_evaluator` | person ref | Prefer identity reference over free text |
| `date_submitted_for_review` | date | Real date field |
| `key_concerns_for_second_reviewer` | long text | Required |
| `areas_of_uncertainty` | long text | Required |
| `section_note` | long text | Optional |

#### 10B — Second review

| Field | Recommended type | Notes |
|---|---|---|
| `second_reviewer` | person ref | Prefer identity reference over free text |
| `date_of_second_review` | date | Real date field |
| `agreement_with_primary_evaluation` | single-select enum | `Full agreement`, `Partial agreement`, `Disagreement` |
| `criteria_to_revisit` | multi-select enum of criterion codes | Do not keep as textarea if the list of criterion IDs is known |
| `second_reviewer_recommendation` | single-select enum | Same option set as overall recommendation |
| `conflict_summary` | long text | Conditional |
| `section_note` | long text | Optional |

#### 10C — Final team decision

| Field | Recommended type | Notes |
|---|---|---|
| `decision_meeting_date` | date | Real date field |
| `meeting_participants` | people multi-select | Prefer person references over free text |
| `final_status` | single-select enum | Controlled governance status list |
| `final_status_rationale` | long text | Required |
| `publication_status` | single-select enum | Controlled list |
| `review_cycle_frequency` | single-select enum | Controlled list |
| `section_note` | long text | Optional |

## Field-type recommendations by field cluster

| Field cluster | Recommended canonical type | Applies to | Reason |
|---|---|---|---|
| Workflow mode, responder role, scope status, judgments, confidence, recommendation, agreement, publication status | single-select enum | Multiple sections | Controlled vocabularies are stable and comparable |
| Categories, use cases, user groups, sign-in methods, critical-fail flags, criteria to revisit | multi-select enum | Sections 1, 8, 9, 10B | Checkbox groups must store canonical value codes |
| Product/vendor names and short identifiers | short text | Sections 0, 1 | Free text, low structural complexity |
| Product URL, evidence folder URL | URL | Sections 0, 2 | Must validate as absolute URLs |
| Evidence links | repeatable URL list | Criterion sections | Canonical source should not use line-separated plain text |
| Narrative rationale, summaries, blockers, notes | long text | Multiple sections | Free-form explanatory content |
| Testing dates and review dates | date | Sections 2, 9, 10 | Dates must remain typed for sequencing checks |
| Counts | integer | RE manual-check count | Numeric validation required |
| Percentages | integer 0..100 | TC traceable-claims metric | Avoid ambiguous textual buckets in the canonical model |
| People fields | person ref / people multi-select | Section 10 | Better identity quality and later auditability |
| Completion checklist items | stored boolean keys, partly computed | Section 8 | Supports validation and dashboarding |
| Principle judgments | computed enum with limited override | Sections 3–7 | Reduces inconsistency between criterion scores and principle outcome |

## Canonical option sets

Recommended canonical option sets are listed below. The renderer can display different labels if needed, but stored values should remain stable.

| Option set ID | Canonical values |
|---|---|
| `submission_type` | `nomination`, `primary_evaluation`, `second_review`, `final_team_decision`, `re_evaluation` |
| `responder_role` | `nominator`, `primary_evaluator`, `second_reviewer`, `decision_recorder`, `other` |
| `criterion_score` | `0`, `1`, `2`, `3` |
| `principle_judgment` | `pass`, `conditional_pass`, `fail` |
| `scope_status` | `in_scope`, `out_of_scope`, `partially_in_scope` |
| `account_required` | `yes`, `no`, `optional` |
| `binary_yes_no` | `yes`, `no` |
| `tri_state_unclear` | `yes`, `no`, `unclear` |
| `confidence_level` | `high`, `medium`, `low` |
| `recommendation_status` | `recommended`, `recommended_with_caveats`, `needs_review_provisional`, `pilot_only`, `not_recommended`, `out_of_scope` |
| `agreement_status` | `full_agreement`, `partial_agreement`, `disagreement` |
| `final_status` | `approved`, `approved_with_conditions`, `deferred`, `rejected`, `escalated` |
| `publication_status` | `published_internally`, `published_externally`, `restricted`, `draft` |
| `review_cycle_frequency` | `3_months`, `6_months`, `12_months`, `24_months`, `ad_hoc` |
| `critical_fail_flags` | canonical list of seven TRUST critical-fail codes |
| `tool_category` | canonical list from Section 1, plus `other` |
| `primary_use_cases` | canonical list from Section 1, plus `other` |
| `target_user_groups` | canonical list from Section 1, plus `other` |
| `sign_in_methods` | implementation-defined controlled set, plus `other` |
| `skip_reason_codes` | see skip semantics section |

## Conditional logic and dependency rules

### Workflow/path rules

| Rule ID | Condition | Required behavior |
|---|---|---|
| `W01` | `submission_type = nomination` | Only Sections 0–1 are active. Sections 2–10 are system-skipped. `nomination_reason` is required. |
| `W02` | `submission_type = primary_evaluation` | Sections 0–9 and 10A are active. 10B and 10C are system-skipped. |
| `W03` | `submission_type = second_review` | `prior_evaluation_id` is required. Section 10B is active. Other evaluation sections are read-only summary or system-skipped. |
| `W04` | `submission_type = final_team_decision` | `prior_evaluation_id` is required. Section 10C is active. |
| `W05` | `submission_type = re_evaluation` | Same active scope as primary evaluation. `prior_evaluation_id` is required. Previous evaluation data may be preloaded but must remain editable. |

### Scope/profile rules

| Rule ID | Condition | Required behavior |
|---|---|---|
| `S01` | `scope_status in {out_of_scope, partially_in_scope}` | `scope_rationale` is required. |
| `S02` | `scope_status = out_of_scope` | Recommendation is constrained to `out_of_scope`. Principle sections may be system-skipped after close-out. |
| `S03` | `account_required = yes` | `sign_in_methods` is required. |
| `S04` | Any multi-select field includes `other` | Corresponding `_other_text` field is required. |

### Evaluation-setup rules

| Rule ID | Condition | Required behavior |
|---|---|---|
| `E01` | `repeated_query_test_performed = yes` | `repeated_query_text` is required. |
| `E02` | `benchmark_comparison_performed = yes` | `benchmark_sources` is required. |
| `E03` | Evaluation path active | `testing_start_date`, `testing_end_date`, `sample_queries_or_scenarios`, and `evidence_folder_link` are required unless Section 2 is explicitly skipped. |

### Criterion and principle rules

| Rule ID | Condition | Required behavior |
|---|---|---|
| `C01` | Criterion active and not skipped | `score`, `evidence_summary`, and `evidence_links` are required. |
| `C02` | `score in {0,1}` | `uncertainty_or_blockers` is required. |
| `C03` | Criterion skipped by user | `criterion_skip_reason_code` and `criterion_skip_rationale` are required; score/evidence/blocker subfields inherit skip state. |
| `P01` | Section 3–7 active and not skipped | `principle_summary` is required. |
| `P02` | Principle judgment computation | Default rule: any `0` => `fail`; no `0` but at least one `1` => `conditional_pass`; all scores `>= 2` => `pass`. |
| `P03` | Manual principle-judgment override | Only downward override should be allowed at evaluator level. Upward override above the score-derived ceiling should not be allowed without governance-level rationale. |

### Critical-fail and recommendation rules

| Rule ID | Condition | Required behavior |
|---|---|---|
| `F01` | Any `critical_fail_flag` selected | `critical_fail_notes` is required. |
| `F02` | Any `critical_fail_flag` selected | A final positive recommendation must not be finalized until team review is recorded in Section 10C. |
| `F03` | Any `critical_fail_flag` selected | Section 10C becomes mandatory before final closure of the evaluation cycle. |
| `R01` | `recommendation_status in {recommended_with_caveats, needs_review_provisional, pilot_only}` | `conditions_or_caveats` is required. |
| `R02` | `recommendation_status = out_of_scope` | `scope_status` must be `out_of_scope`; contradictory combinations are invalid. |

### Governance rules

| Rule ID | Condition | Required behavior |
|---|---|---|
| `G01` | Second review path active | `second_reviewer`, `date_of_second_review`, `agreement_with_primary_evaluation`, and `second_reviewer_recommendation` are required. |
| `G02` | `agreement_with_primary_evaluation in {partial_agreement, disagreement}` | `criteria_to_revisit` is required. |
| `G03` | `agreement_with_primary_evaluation = disagreement` | `conflict_summary` is required. |
| `G04` | Final team decision path active | `decision_meeting_date`, `meeting_participants`, `final_status`, `final_status_rationale`, `publication_status`, and `review_cycle_frequency` are required. |

## Skip semantics

Skip behavior must be explicit. The current HTML has no skip model; it only displays textual condition tags.

### Required distinction

The form model must distinguish the following states:

| State | Meaning |
|---|---|
| `answered` | The field or criterion has a real answer |
| `user_skipped` | The evaluator intentionally skipped a visible item and gave a reason |
| `system_skipped` | The item was hidden or bypassed because of workflow logic |
| `inherited_section_skip` | Child item skipped because its parent section was skipped |
| `not_started` | No answer yet, no skip recorded |

A skipped item is not the same as `No`, `Unknown`, `Unclear`, or `Out of scope`. Those are answer values, not skip states.

### Recommended skip reason codes

User-selectable skip reasons should be controlled.

| Skip reason code | Intended use |
|---|---|
| `not_applicable_to_tool` | The field or criterion does not apply to this tool |
| `not_available_in_tested_tier` | The feature or evidence is unavailable in the evaluated plan/tier |
| `access_blocked` | Reviewer could not access the relevant feature or document |
| `insufficient_documentation` | Vendor documentation required for assessment does not exist or is inaccessible |
| `test_not_performed` | The required test was not run |
| `covered_elsewhere` | Information is intentionally captured in another field or workflow event |
| `other` | Any reason not covered above; requires free-text rationale |

System-only skip reasons should not be user-editable:

- `workflow_hidden`
- `out_of_scope_closeout`
- `inherited_from_section_skip`

### Question-level skip rules

1. A visible ordinary field may be skipped by the user only with both:
   - `skip_reason_code`
   - `skip_rationale`
2. In Sections 3–7, skipping should operate at the **criterion** level, not independently on `score`, `evidence_summary`, and `evidence_links` subfields.
3. A skipped criterion must not be treated as score `0`.
4. A section cannot be marked complete while active required fields remain neither answered nor skipped.

### Section-level skip rules

1. Any section may be system-skipped by workflow logic.
2. User-driven section skip should be allowed only when the section is visible and there is a defensible assessment reason.
3. User-driven section skip requires:
   - `section_skip_reason_code`
   - `section_skip_rationale`
4. When a section is skipped, all child fields and criteria inherit skip state and become non-editable until the section is unskipped.
5. Section-level skip overrides question-level answers for completeness logic, but existing draft values may be retained in memory until the user confirms the skip.

### Override rules

| Override area | Recommended rule |
|---|---|
| Criterion skip vs section skip | Section skip overrides all child criterion states |
| System-skipped items | Cannot be manually answered unless the triggering condition changes |
| Principle judgment | Computed by default; evaluator may override downward with rationale; upward override requires governance-level rationale |
| Recommendation status under critical fail | Positive final recommendation must remain locked until team decision records explicit resolution |
| Completion checklist | Computed items should not be manually overridden unless the schema explicitly marks them as confirmatory rather than computed |

## Section notes/comments model

Section notes should be modeled explicitly and should not be conflated with required summary or rationale fields.

### Minimum section-note model

| Field | Type | Applies to | Purpose |
|---|---|---|---|
| `section_note` | long text | Every section | Free contextual note not captured elsewhere |
| `section_note_author` | person ref | Every section | Audit trail |
| `section_note_updated_at` | datetime | Every section | Audit trail |

### Recommended comment model for multi-review workflows

For Sections 10B and 10C, append-only comments are preferable to silent overwriting.

| Field | Type | Purpose |
|---|---|---|
| `comment_scope` | enum | Section or criterion targeted |
| `comment_author` | person ref | Reviewer or chair |
| `comment_role` | enum | `primary_evaluator`, `second_reviewer`, `team_member`, `chair` |
| `comment_text` | long text | Comment content |
| `created_at` | datetime | Audit trail |

Rules:

- `section_note` is optional and editable.
- `comment_entry` should be append-only once submitted.
- `section_note` must not satisfy required `scope_rationale`, `critical_fail_notes`, `uncertainty_or_blockers`, `conditions_or_caveats`, or `final_status_rationale` fields.

## Validation rules

### Field-level validation

| Validation area | Rule |
|---|---|
| Short text | Trim whitespace; reject empty-string submissions for required fields |
| Long text | Trim whitespace; when used for rationale/notes/blockers, require a minimum substantive length (recommended: 20 non-space characters) |
| Enum fields | Stored value must exist in the option set version referenced by the submission |
| Multi-select fields | No duplicate values; `other` requires companion free-text field |
| URL fields | Must be absolute URLs; reject whitespace-only strings and malformed URLs |
| URL lists | Validate each list item independently; reject duplicates |
| Dates | Must be valid dates in ISO-compatible format |
| Integer counts | Must be non-negative integers |
| Percentages | Must be integer values `0..100` |
| Person references | Must resolve to a known identity or stored external-person record |

### Cross-field validation

| Validation area | Rule |
|---|---|
| Testing date range | `testing_start_date <= testing_end_date` |
| Review chronology | `date_of_second_review >= date_submitted_for_review`; `decision_meeting_date >= date_of_second_review` when both exist |
| Next review date | `next_review_due` should be after the last completed evaluation milestone |
| Prior evaluation reference | Required workflow paths must resolve to an existing evaluation record |
| Out-of-scope consistency | `recommendation_status = out_of_scope` requires `scope_status = out_of_scope` |
| Low scores | Any criterion score `0` or `1` requires `uncertainty_or_blockers` |
| Critical fail notes | Any selected critical fail flag requires `critical_fail_notes` |
| Caveat requirement | Recommendation statuses that imply conditionality require `conditions_or_caveats` |
| Agreement conflict | `criteria_to_revisit` required for partial agreement or disagreement; `conflict_summary` required for disagreement |

### Recommended quantitative thresholds

These thresholds are implied by the documents and should be encoded as validations or completion checks where feasible.

| Field | Recommended validation |
|---|---|
| `claims_manually_checked_count` | If a primary evaluation is active and the field is not skipped, require integer `>= 5` or an explicit skip rationale |
| `claims_traceable_percentage` | Integer `0..100` |
| `sample_queries_or_scenarios` | Must be present on evaluation paths |
| `evidence_links` per criterion | At least one valid evidence reference when the criterion is answered |

## Recommended source-of-truth structure for options and dependencies

The canonical source of truth should not be the HTML file and should not be the renderer-specific form definition alone.

Recommended structure:

| Layer | Contents | Ownership |
|---|---|---|
| `schema.sections` | Section IDs, titles, workflow applicability, order | Canonical questionnaire definition |
| `schema.criteria` | `TR1`..`TC2` texts and section mapping | Canonical questionnaire definition |
| `schema.fields` | Field IDs, types, labels, option-set references, validation references | Canonical questionnaire definition |
| `schema.option_sets` | All controlled values and display labels | Canonical questionnaire definition |
| `schema.dependencies` | Visibility, requiredness, branching, skip, and lock rules | Canonical questionnaire definition |
| `schema.validations` | Field-level and cross-field constraints | Canonical questionnaire definition |
| `schema.computed_fields` | Principle judgments, checklist items, status caps | Canonical questionnaire definition |
| `data.evaluations` | Evaluation records and typed answers | Runtime data |
| `data.evidence_refs` | Evidence links and evidence metadata | Runtime data |
| `data.workflow_events` | Handoff, second-review, and decision events | Runtime data |
| `data.comments` | Optional append-only comments | Runtime data |

Operational recommendation:

- `docs/trust-questionnaire.md` should define the canonical field inventory.
- A machine-readable schema should define field IDs, option sets, dependencies, and validation rules.
- Any renderer, including Microsoft Forms or a custom web form, should be generated from or aligned to that schema.
- The HTML demo should be treated as a presentation prototype only.

## Explicit proposed solution summary

1. Replace the current demo-only questionnaire with a **schema-driven form model** composed of versioned field definitions, option sets, validation rules, dependency rules, and computed fields.
2. Use `docs/trust-questionnaire.md` as the **canonical field inventory**, and treat `docs/review/trust-ms-forms-questionnaire-spec.md` as an implementation projection rather than the primary schema authority.
3. Model Sections 3–7 around a reusable **criterion response object** containing score, evidence summary, evidence links, blockers, skip state, and rationale.
4. Make principle judgments, selected checklist items, and recommendation restrictions **computed** from criterion scores, scope status, workflow path, and critical-fail state.
5. Introduce explicit **question-level and section-level skip state** with mandatory structured reason codes and mandatory rationale text.
6. Store **URLs, dates, counts, percentages, person references, and enums as typed values**, not as placeholder strings or line-broken text.
7. Add one explicit **section note field per section** and, where governance requires it, an append-only comment model for reviewer disagreement and team decision traceability.
8. Treat the **critical-fail and governance area** as the highest-complexity dependency domain: it must coordinate low-score logic, critical-fail flags, recommendation constraints, second-review disagreement, and final team-decision closure.
