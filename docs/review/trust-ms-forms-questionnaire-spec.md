# TRUST evaluation questionnaire specification for Microsoft Forms

*Date: 2026-04-02*

## Purpose

This document defines an explicit questionnaire and workflow that can be implemented in Microsoft Forms and processed into MS Lists / SharePoint.

It is designed to do four things at once:

1. guide evaluators through a proper review,
2. force collection of enough evidence to justify conclusions,
3. support multi-reviewer governance,
4. and produce structured data that can be stored, filtered, and audited later.

This specification assumes the **revised TRUST identifiers** (`TR`, `RE`, `UC`, `SE`, `TC`) are the canonical codes.

## Recommended implementation model

Use **one internal master Microsoft Form with section branching**.

Workflow modes:

- Nomination
- Primary evaluation
- Second review
- Final team decision
- Re-evaluation / update

If Microsoft Forms becomes too unwieldy in practice, sections for second review and final decision can later be split into separate lightweight forms without changing the core data model.

## Standard answer sets

### Criterion rating scale

Use the same scale for every TRUST criterion.

- `0 - Fails`
- `1 - Partial / unclear`
- `2 - Meets baseline`
- `3 - Strong`

### Final recommendation options

- `Recommended`
- `Recommended with caveats`
- `Needs review / provisional`
- `Pilot only`
- `Not recommended`
- `Out of scope`

### Confidence options

- `High`
- `Medium`
- `Low`

### Critical-fail flags

Use checkboxes so reviewers can mark any of the following if observed:

- Fabricated or unverifiable citation found
- Materially unfaithful synthesis found
- Major claim not traceable to a primary source
- Provenance path not inspectable enough for academic use
- Privacy/data-use terms unclear or unacceptable
- Serious security/compliance concern
- Serious bias/fairness concern without credible mitigation

If any critical-fail flag is checked, require a mandatory notes field.

## Minimum evidence pack before a primary evaluation can be finalized

Every full evaluation should capture at least:

1. **Desk review**
   - vendor documentation
   - privacy / terms documentation
   - methodology or source explanation

2. **Hands-on testing using at least 3 scenarios**
   - one known-item query
   - one exploratory literature-search query
   - one answer / synthesis query with cited sources

3. **Repeated-query test for reliability**
   - run one query at least 3 times and record whether the core conclusion remains stable

4. **Manual source verification**
   - verify at least 5 cited claims or citations against the source material

5. **Evidence bundle**
   - screenshots
   - copied excerpts or PDFs of vendor statements
   - links to policies / documentation
   - notes explaining what was observed

## Questionnaire structure

## Section 0 — Workflow control

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `Submission_Type` | Choice | Yes | `Nomination`, `Primary evaluation`, `Second review`, `Final team decision`, `Re-evaluation / update` |
| `Tool_Name` | Short text | Yes | Canonical tool name |
| `Tool_Main_URL` | Short text | Yes | Main site or product page |
| `Existing_Evaluation_ID` | Short text | Conditional | Required for second review, final decision, and re-evaluation |
| `Responder_Role` | Choice | Yes | `Nominator`, `Primary evaluator`, `Second reviewer`, `Decision recorder / chair`, `Other` |
| `Nomination_Reason` | Long text | Conditional | Required for nomination path |

## Section 1 — Tool profile and scope

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `Vendor_Organisation` | Short text | Yes | Provider / publisher / lab |
| `Tool_Category` | Choice (multi-select) | Yes | `AI search engine`, `AI layer on existing database`, `Summarization assistant`, `Citation discovery`, `Query development`, `Other` |
| `Tool_Deployment_Type` | Choice | Yes | `Standalone tool`, `Feature inside existing platform`, `Unknown` |
| `In_Scope_AI_Search_Tool` | Choice | Yes | `Yes`, `No`, `Unclear` |
| `Scope_Rationale` | Long text | Yes | Explain why it is or is not in scope |
| `Primary_Use_Cases_UT` | Choice (multi-select) | Yes | `Literature search`, `Paper discovery`, `Citation tracing`, `Abstract summarisation`, `Teaching/demo`, `Query development`, `Other` |
| `Target_User_Groups` | Choice (multi-select) | Yes | `Students`, `Researchers`, `PhD candidates`, `Teachers`, `Information specialists`, `All UT users`, `Other` |
| `Access_Model` | Choice | Yes | `Free`, `Freemium`, `Paid institutional`, `Paid individual`, `Unknown` |
| `Account_Required` | Choice | Yes | `Yes`, `No`, `Unknown` |
| `Sign_In_Method` | Choice (multi-select) | Conditional | Show only if account required |

## Section 2 — Evaluation setup and test context

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `Testing_Start_Date` | Date | Conditional | Required for evaluation paths |
| `Testing_End_Date` | Date | Conditional | Required for evaluation paths |
| `Pricing_Tier_Tested` | Choice | Conditional | `Free`, `Freemium`, `Paid`, `Trial`, `Unknown` |
| `Hands_On_Access_Confirmed` | Choice | Conditional | `Yes`, `No` |
| `Sample_Queries_or_Scenarios` | Long text | Conditional | List the tested scenarios |
| `Repeated_Query_Test_Performed` | Choice | Conditional | `Yes`, `No` |
| `Repeated_Query_Text` | Long text | Conditional | Required if repeated-query test performed |
| `Benchmark_Comparison_Performed` | Choice | Conditional | `Yes`, `No` |
| `Benchmark_Sources` | Long text | Conditional | e.g. Google Scholar, Scopus, Semantic Scholar, manual lookup |
| `Sensitive_or_Personal_Data_Entered` | Choice | Conditional | `Yes`, `No` |
| `Evidence_Folder_Link` | Short text | No | SharePoint or evidence bundle link |

## Section 3 — Transparent (`TR`)

For each criterion below, collect the same four fields:

1. `*_Score` — Choice (`0–3` scale)
2. `*_Evidence_Summary` — Long text
3. `*_Evidence_Links` — Long text
4. `*_Uncertainty_or_Blockers` — Long text (required if score is `0` or `1`)

### TR prompts

| Code | Exact prompt |
|---|---|
| `TR1` | The tool provides clear documentation on its primary data sources and the scope of its indexed content. |
| `TR2` | The tool’s methodology is explicitly explained, including the specific model(s) used, retrieval/generation architecture, source corpus, and whether provenance/reasoning information is visible to the user. |
| `TR3` | The tool openly acknowledges its known limitations, indexing gaps, and update frequency. |

### Additional TR section fields

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `TR_Principle_Summary` | Long text | Conditional | One paragraph summary of the Transparent principle |
| `TR_Principle_Judgment` | Choice | Conditional | `Pass`, `Conditional pass`, `Fail` |

## Section 4 — Reliable (`RE`)

Use the same four per-criterion fields as above.

### RE prompts

| Code | Exact prompt |
|---|---|
| `RE1` | The tool generates factually accurate and verifiable outputs, with robust mechanisms to minimize or eliminate hallucinated citations. |
| `RE2` | When identical queries are repeated, the tool shows consistency of consensus: core conclusions remain substantively aligned even if wording or source order varies. |
| `RE3` | When the tool synthesizes information, the synthesis remains faithful to retrieved source material and does not introduce unsupported or materially misleading claims. |

### Additional RE section fields

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `RE_Test_Method` | Long text | Conditional | Describe query repetition and source-verification approach |
| `RE_Claims_Manually_Checked_Count` | Number | Conditional | Minimum target: 5 |
| `RE_Principle_Summary` | Long text | Conditional | Required for evaluation paths |
| `RE_Principle_Judgment` | Choice | Conditional | `Pass`, `Conditional pass`, `Fail` |

## Section 5 — User-centric (`UC`)

Use the same four per-criterion fields.

### UC prompts

| Code | Exact prompt |
|---|---|
| `UC1` | The tool is fit for its intended purpose and aligns with the research and educational needs of the University of Twente community. |
| `UC2` | The tool integrates with standard academic workflows through useful export options, citation workflows, or reference-manager compatibility. |
| `UC3` | The tool is usable and accessible for its intended audience without prohibitive technical expertise. |
| `UC4` | The interface clearly communicates that it is AI-assisted, warns users about hallucination/limitation risks, and actively prompts source verification to reduce automation bias. |

### Additional UC section fields

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `UC_Target_User_Personas` | Long text | Conditional | Briefly state which user groups were considered |
| `UC_Workflow_Integrations_Observed` | Long text | Conditional | Export types, persistent links, reference support, etc. |
| `UC_Principle_Summary` | Long text | Conditional | Required for evaluation paths |
| `UC_Principle_Judgment` | Choice | Conditional | `Pass`, `Conditional pass`, `Fail` |

## Section 6 — Secure (`SE`)

Use the same four per-criterion fields.

### SE prompts

| Code | Exact prompt |
|---|---|
| `SE1` | The tool follows data-protection-by-design and by-default principles in a way that is acceptable under GDPR-oriented review. |
| `SE2` | Users are clearly informed how their data, including prompts/queries, is used, stored, retained, and whether it may be used for model improvement or analytics; users have meaningful control where applicable. |
| `SE3` | The tool’s security posture is transparent and does not conflict with relevant institutional, national, or sector guidance. |
| `SE4` | The tool documents major disciplinary, geographic, language, or algorithmic bias risks and provides evidence of any mitigation measures or safeguards in place. |

### Additional SE section fields

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `DPIA_or_Privacy_Escalation_Required` | Choice | Conditional | `Yes`, `No`, `Maybe` |
| `Copyright_or_Licensing_Concern` | Choice | Conditional | `Yes`, `No`, `Unknown` |
| `SE_Compliance_Confidence` | Choice | Conditional | `Verified`, `Likely`, `Unclear`, `Escalated` |
| `SE_Principle_Summary` | Long text | Conditional | Required for evaluation paths |
| `SE_Principle_Judgment` | Choice | Conditional | `Pass`, `Conditional pass`, `Fail` |

## Section 7 — Traceable (`TC`)

Use the same four per-criterion fields.

### TC prompts

| Code | Exact prompt |
|---|---|
| `TC1` | The tool provides clear, accurate, and persistent attribution for the sources used to generate an answer; where available, it also surfaces helpful source-quality cues such as publication type, peer-review status, or retraction notices. |
| `TC2` | The tool allows users and reviewers to inspect the provenance of an answer by showing which sources were selected and how retrieved evidence is distinguished from generated synthesis. |

### Additional TC section fields

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `TC_Claims_Traceable_Percentage_Estimate` | Choice | Conditional | `0–25%`, `26–50%`, `51–75%`, `76–90%`, `91–100%` |
| `TC_Principle_Summary` | Long text | Conditional | Required for evaluation paths |
| `TC_Principle_Judgment` | Choice | Conditional | `Pass`, `Conditional pass`, `Fail` |

## Section 8 — Critical fails and confidence

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `Critical_Fail_Flags` | Choice (multi-select) | Conditional | Use the list defined earlier |
| `Critical_Fail_Notes` | Long text | Conditional | Required if any flag is selected |
| `Two_Person_Review_Completed` | Choice | Conditional | `Yes`, `No` |
| `Documentation_Reviewed` | Choice | Conditional | `Yes`, `No` |
| `Privacy_Policy_Reviewed` | Choice | Conditional | `Yes`, `No` |
| `Three_Test_Scenarios_Completed` | Choice | Conditional | `Yes`, `No` |
| `Repeated_Query_Test_Completed` | Choice | Conditional | `Yes`, `No` |
| `Five_Claims_or_Citations_Manually_Checked` | Choice | Conditional | `Yes`, `No` |
| `Overall_Review_Confidence` | Choice | Conditional | `High`, `Medium`, `Low` |

## Section 9 — Overall recommendation

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `Overall_Recommendation_Status` | Choice | Conditional | Use the standard recommendation options |
| `Conclusion_Summary` | Long text | Conditional | Required for evaluation paths |
| `Conditions_or_Caveats` | Long text | Conditional | Required unless status is fully recommended or out of scope |
| `Suitable_Use_Cases` | Choice (multi-select) | Conditional | e.g. brainstorming, discovery, structured searching, source triangulation |
| `Unsuitable_or_High_Risk_Use_Cases` | Long text | Conditional | Must be explicit for anything provisional or risky |
| `Public_Facing_Summary_Draft` | Long text | Conditional | Short summary for website / tool register |
| `Next_Review_Due` | Date | Conditional | Use later workflow if needed |

## Section 10 — Second review and governance fields

### 10A. Primary evaluation handoff

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `Second_Reviewer_Required` | Choice | Conditional | `Yes`, `No` |
| `Proposed_Second_Reviewer_Name` | Short text | Conditional | Required if second reviewer needed |
| `Primary_Review_Ready_For_Second_Review` | Choice | Conditional | `Yes`, `No` |

### 10B. Second review

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `Second_Review_Agreement` | Choice | Conditional | `Agree`, `Agree with reservations`, `Disagree` |
| `Criteria_To_Revisit` | Choice (multi-select) | Conditional | Show if there is disagreement or reservation |
| `Second_Review_Recommendation` | Choice | Conditional | Same options as overall recommendation |
| `Second_Review_Conflict_Summary` | Long text | Conditional | Required if not full agreement |
| `Ready_For_Team_Meeting` | Choice | Conditional | `Yes`, `No` |

### 10C. Final team decision

| Field name | Question type | Required | Notes |
|---|---|---:|---|
| `Team_Meeting_Date` | Date | Conditional | Required on final-decision path |
| `Meeting_Participants` | Long text | Conditional | Required on final-decision path |
| `Two_Member_Review_Confirmed` | Choice | Conditional | `Yes`, `No` |
| `Final_Recommendation_Status` | Choice | Conditional | Same status options |
| `Final_Decision_Rationale` | Long text | Conditional | Required on final-decision path |
| `Publication_Status` | Choice | Conditional | `Do not publish`, `Internal only`, `Publish in public list`, `Publish after user guide` |
| `Publication_Owner` | Short text | Conditional | Required if publication is planned |
| `Review_Cycle_Frequency` | Choice | Conditional | `3 months`, `6 months`, `12 months`, `After major vendor change`, `Ad hoc` |

## Branching rules

Keep the branching simple.

### Core rules

1. `Submission_Type = Nomination`
   - show Sections 0–1 only, then submit.

2. `Submission_Type = Primary evaluation`
   - show Sections 0–10A.

3. `Submission_Type = Second review`
   - show Sections 0 and 10B, plus any optional summary readback fields if helpful.

4. `Submission_Type = Final team decision`
   - show Sections 0 and 10C.

5. `Submission_Type = Re-evaluation / update`
   - show the same path as primary evaluation, but require `Existing_Evaluation_ID`.

6. `In_Scope_AI_Search_Tool = No`
   - route to a short close-out that records `Out of scope` and requires a rationale.

7. Any criterion scored `0` or `1`
   - require the corresponding `*_Uncertainty_or_Blockers` field.

8. Any critical-fail flag checked
   - require `Critical_Fail_Notes` and force later team review.

## Recommended downstream storage model

For MS Lists / SharePoint, do **not** flatten everything into one giant list item if you can avoid it.

### Recommended structure

1. **Evaluations** (parent record)
   - one record per tool review cycle

2. **Evidence** (child records or evidence library)
   - one record or file bundle per evidence item

3. **Decision log**
   - one record per second review or committee decision event

### Key structured fields to store, not hide in free text

- tool name
- URL
- tool category
- workflow mode
- evaluator role
- framework version
- questionnaire version
- all criterion scores
- principle judgments
- critical-fail flags
- confidence level
- final recommendation status
- next review due
- publication status

## Suggested MS Lists columns

### Parent list: `TRUST_Evaluations`

- `EvaluationID`
- `ToolName`
- `ToolMainURL`
- `VendorOrganisation`
- `SubmissionType`
- `FrameworkVersion`
- `QuestionnaireVersion`
- `EvalDate`
- `Reviewer1`
- `Reviewer2`
- `TR1` ... `TC2`
- `TR_Judgment`, `RE_Judgment`, `UC_Judgment`, `SE_Judgment`, `TC_Judgment`
- `CriticalFail`
- `CriticalFailReason`
- `OverallConfidence`
- `RecommendationStatus`
- `PublicFacingSummaryDraft`
- `NextReviewDate`
- `PublicationStatus`
- `EvidenceFolderLink`

### Evidence storage

Prefer a SharePoint document library with metadata over unmanaged list attachments.

Recommended metadata:

- `EvaluationID`
- `CriterionCode`
- `EvidenceType`
- `CapturedDate`
- `CapturedBy`
- `ShortDescription`
- `PublicSafe`

## Reviewer guidance that should appear inside the form

Add short instructional text at the start of the primary-evaluation path.

Recommended text:

> Evaluate the tool using documented evidence and hands-on testing. Do not rely on vendor claims alone. For reliability and traceability, verify actual outputs against actual sources. For privacy and compliance, record what is documented and indicate when confidence is limited or escalation is needed.

Add short text at the start of the User-centric section:

> Evaluate the tool for the specific academic users and use cases you tested. Do not assume one good experience generalizes to all UT users.

Add short text at the start of the Secure section:

> Record evidence and level of confidence. If privacy, licensing, or compliance are unclear, say so explicitly rather than inferring compliance.

## Final recommendation

This questionnaire is intentionally stricter than a simple yes/no checklist. That is a feature, not a bug.

If the team wants a form that:

- captures enough evidence,
- guides reviewers through actual testing,
- supports two-person review,
- and produces structured records for MS Lists,

then the form needs to collect both **scores** and **evidence**.

The structure above is the best balance between rigor and implementability in Microsoft Forms.

## Sources used for this specification

- `docs/framework/revised-framework.md`
- `docs/framework/original-framework.md`
- `docs/background/eis_is_search_tools_policy_document_v3.md`
- `docs/background/project_progress_overview_sept_2025.md`
- `docs/background/addendums-from-literature.md`
- `docs/trust-framework-v1-deep-review.md`
- `docs/trust-framework-v2-comparison-and-final-review.md`
