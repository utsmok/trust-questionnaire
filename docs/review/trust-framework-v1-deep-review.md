# Deep review of TRUST framework version 1

*Date: 2026-04-02*

## Review basis

This review is based on the following project materials:

- `docs/framework/original-framework.md`
- `docs/framework/revised-framework.md`
- `docs/background/addendums-from-literature.md`
- `docs/background/eis_is_search_tools_policy_document_v3.md`
- `docs/background/liber-abstract.md`
- `docs/background/project_progress_overview_sept_2025.md`

I also cross-checked the framework against a small set of external anchor materials already identified in the project documents and directly consulted during this review:

- FAIR Principles (for provenance, reuse, and metadata logic)
- The ROBOT Test (for AI-literacy-style questioning and source scrutiny)
- High-level EU AI Act summary (for transparency, GPAI, risk, and governance framing)

This document focuses on **TRUST v1 as an evaluation instrument**, not only as a statement of values. That distinction matters. A framework can be excellent rhetorically and still be weak operationally.

## Overall judgment

Version 1 is a **strong conceptual starting point** and a **weak final evaluation instrument**.

It succeeds at the level of principle:

- the five-pillar structure is memorable and sensible;
- it centers academic integrity instead of generic “AI innovation” enthusiasm;
- it correctly prioritizes reliability and traceability as non-negotiable in scholarly search.

But as written, v1 is not yet robust enough to support:

- consistent multi-reviewer scoring,
- defensible publication of recommendations,
- reliable storage in MS Forms / MS Lists,
- or strong resistance against vendor marketing, evaluator drift, and pseudo-compliance.

### Bottom-line recommendation

Do **not** use v1 unchanged as the final questionnaire or final operational standard.

Keep:

- the five TRUST principles;
- the academic-library framing;
- the emphasis on hallucinations, source traceability, privacy, and workflow fit.

Revise before operational deployment:

- identifiers,
- wording precision,
- evidence requirements,
- scoring and thresholds,
- governance workflow,
- and reviewer guidance.

## What version 1 gets right

### 1. The core structure is intuitive and memorable

Transparent, Reliable, User-centric, Secure, and Traceable is a solid backbone. It is easy to explain to colleagues, easy to remember in meetings, and already close to a usable library governance model.

### 2. The framework identifies the right academic risks

The strongest instinct in v1 is that AI search tools should not be judged mainly on convenience or novelty. They must be judged on:

- whether their answers are accurate,
- whether their citations are real,
- whether their output can be traced,
- and whether they are safe to recommend in an academic context.

That is exactly the right center of gravity.

### 3. It is appropriately stricter than generic AI evaluation frameworks

Many general AI checklists are too broad or too product-centric. TRUST is stronger because it is built around scholarly use and library mediation. That makes it more useful than generic “trustworthy AI” language alone.

### 4. It is compatible with the surrounding project vision

The background documents consistently argue that these tools should **augment, not replace** critical thinking. TRUST v1 already points in that direction, even when it does not yet operationalize it well enough.

## Major structural problems

The main problems are not that v1 is “wrong”; they are that it is **underspecified**.

### 1. It mixes principles, metrics, and decision rules

The framework text sometimes behaves like:

- a values statement,
- a checklist,
- a policy,
- and a scoring rubric

all at once.

Those layers should be separated.

### 2. It has no explicit operational layer

There is no clear answer to:

- what evidence must be collected,
- how many tests are required,
- which failures are disqualifying,
- how reviewers should score borderline cases,
- or how final recommendation status is assigned.

Without that layer, two smart reviewers can both act reasonably and still reach different conclusions.

### 3. It invites overconfident claims in legal/compliance areas

On privacy, GDPR, and institutional compliance, v1 is directionally right but operationally dangerous. Librarians can identify red flags, but the current wording makes it too easy to write conclusions that sound more legally certain than the evidence supports.

### 4. It is vulnerable to vendor gaming

A polished vendor can pass parts of v1 with:

- marketing language instead of technical evidence,
- generic disclaimers instead of concrete limitations,
- and superficial integrations or warnings that appear substantive but are not.

### 5. It lacks governance hooks

The background policy already anticipates multi-reviewer evaluation and periodic re-review, but v1 itself does not embed:

- confidence levels,
- disagreement handling,
- re-evaluation triggers,
- decision categories,
- or evidence retention rules.

## Criterion-by-criterion critique

## Transparent

| Criterion | What works | What is unclear or weak | Recommendation |
|---|---|---|---|
| **T1. Data sources** | Correctly starts with corpus/source disclosure. | “Primary data sources” is ambiguous. Does it mean indexed corpus, training data, retrieval sources, or all three? “Scope of indexed content” is also too vague. | Distinguish **indexed corpus**, **training data provenance** where applicable, and **coverage scope**. Require disciplines, languages, date range, and update cadence. |
| **T2. Methodology** | Correctly requires more than a black-box answer interface. | “Type of AI model” and “general process” are too vague for modern RAG systems. A vendor can satisfy this with one paragraph of marketing prose. | Require disclosure of model family/version, retrieval architecture, corpus used for answering, and whether source selection or reasoning is visible. |
| **T3. Limitations, bias, updates** | Good instinct to require disclosure of limits. | This criterion bundles too many things together: limitations, bias, and update frequency. “Potential for bias” is passive and undefined. | Split or sharpen it. Require concrete indexing gaps, language/discipline exclusions, known failure modes, and update lag. Move bias out of vague disclosure-only framing. |

### Main critique of Transparent

Transparency in v1 is **not yet measurable enough**. It assumes that if documentation exists, the system is transparent enough. The literature note in this project already warns against that. Documentation is necessary, but black-box systems can still remain functionally opaque.

### What is missing

- explicit handling of RAG-specific architecture;
- distinction between corpus coverage and model provenance;
- a requirement that limitations be specific rather than generic;
- and a clearer link between transparency and what a reviewer can actually inspect.

## Reliable

| Criterion | What works | What is unclear or weak | Recommendation |
|---|---|---|---|
| **R1. Factually accurate and verifiable output** | This is exactly the right core requirement. Hallucinated citations are a decisive academic failure mode. | It lacks a test method and threshold. “Mechanisms to minimize hallucinations” is not the same as “hallucinations are rare enough to tolerate.” | Define a minimum verification protocol and a failure threshold. Missing or unverifiable citations should be a critical finding, not just a note. |
| **R2. Consistent and reproducible results** | The desire for stable, dependable output is right. | “Reproducible” is too strong for non-deterministic systems and too vague to be useful. Does it mean identical wording, identical sources, or identical conclusions? | Replace exact reproducibility with a standard closer to **consistency of core conclusions**. Require repeated-query testing. |
| **R3. Faithful to source material, with clear provenance** | Very important and academically well targeted. | “Faithful” is not operationalized, and “clear provenance” overlaps with the Traceable principle. | Keep faithfulness here, but define it more explicitly. Move most provenance mechanics into Traceable. |

### Main critique of Reliable

Reliable is the strongest principle in spirit and the weakest in operational detail.

The project’s own background literature already shows that:

- identical queries can yield variable outputs,
- false positives can be high,
- and synthesis can drift beyond what sources actually support.

So the framework is right to focus here, but v1 treats these issues more as desired outcomes than as measurable tests.

### What is missing

- a standard test bank or minimum query set;
- a repeated-run procedure for R2;
- a citation verification sample size for R1;
- a rule for how much inconsistency is acceptable;
- and a clearer boundary between legitimate synthesis and unsupported invention.

## User-centric

| Criterion | What works | What is unclear or weak | Recommendation |
|---|---|---|---|
| **U1. Aligns with UT needs** | Good to anchor recommendations in institutional relevance rather than abstract quality. | It mixes **institutional fit** with general tool quality. UT needs differ by discipline and user group. | Separate “institutional fit” from general usability/workflow quality, or at least require reviewers to specify target user groups and use cases. |
| **U2. Integrates with our tools/workflows** | Correctly recognizes that academic value depends on workflow fit. | “Standard academic workflows” is undefined. A copy button is not the same as robust integration. | Specify expected export formats, citation portability, persistent links, and reference-manager compatibility. |
| **U3. Usable and accessible** | Right to include usability, not just technical correctness. | “Usable,” “accessible,” and “prohibitive technical expertise” are all subjective here. No accessibility standard or user persona is defined. | Separate usability from accessibility if needed. Add task-based expectations and basic accessibility criteria. |

### Main critique of User-centric

v1 treats users as if they are a single category. They are not.

The framework needs to distinguish at least between:

- undergraduate students,
- advanced students / PhD candidates,
- researchers,
- and information specialists.

It also misses one of the most important risks in current academic AI use: **automation bias**. The background documents clearly move in that direction, but v1 does not yet turn that into a criterion.

### What is missing

- explicit AI-literacy or cognitive-guardrail expectations;
- stronger usability heuristics or task-based checks;
- support for uncertainty communication and source verification behavior;
- clearer distinction between “good tool in general” and “good tool for UT contexts.”

## Secure

| Criterion | What works | What is unclear or weak | Recommendation |
|---|---|---|---|
| **S1. GDPR / data protection by design** | Necessary and correct to include. | The criterion offers no evidence standard. Reviewers may overstate compliance. | Require specific evidence types: privacy policy review, data-retention statement, processor information, and escalation when evidence is inadequate. |
| **S2. Clear data policy and user control** | Good focus on user knowledge and control. | “Clear” and “control” are undefined. It does not explicitly foreground prompts/queries as user data. | Ask directly how prompts are stored, used, retained, and whether they are used for model training or analytics. |
| **S3. Security practices and institutional/national guidance** | Correctly situates recommendation in institutional and regulatory context. | Too open-ended. Which guidance? Which evidence? Which standard of proof? | Use this as a structured policy-compliance check, not a generic confidence statement. Add a confidence level and escalation path. |

### Main critique of Secure

Secure in v1 is valuable, but it is where the framework is most likely to create false certainty.

Three problems stand out:

1. **Evidence burden is undefined.**
2. **Reviewer expertise is not calibrated.**
3. **Bias is misplaced.** Bias appears as a limitation under T3 instead of being treated as an ethical / governance risk in its own right.

### What is missing

- explicit prompt/query handling;
- clearer copyright/licensing logic;
- a distinction between “verified,” “likely,” and “unverified” compliance judgments;
- and a better home for fairness/bias concerns.

## Traceable

| Criterion | What works | What is unclear or weak | Recommendation |
|---|---|---|---|
| **T4. Accurate source attribution** | This is one of the framework’s most valuable academic requirements. | “All sources” and “persistent attribution” are not operationalized. A linked citation can still be inaccurate or misleading. | Require claim-to-source traceability, not just a bibliography. Check whether citations are stable, accurate, and inspectable. |
| **T5. Auditable or explainable provenance** | Excellent instinct. Academic users need more than just answer text. | “Auditable” and “explainable” are not the same thing, but v1 treats them as interchangeable. | Clarify what users must be able to see: retrieved sources, why they were chosen, and how the answer was synthesized from them. |

### Main critique of Traceable

Traceable is arguably the most academically distinctive principle in TRUST, and one of its best features. But v1 needs to distinguish:

- **source attribution**,
- **source credibility support**,
- **retrieval provenance**,
- and **generation provenance**.

Right now they are still partially blended together.

### What is missing

- distinction between retrieved evidence and generated synthesis;
- clearer expectation for how much of the provenance chain must be visible;
- and explicit evidence capture for claim verification.

## Cross-cutting issues that matter more than any single criterion

### 1. Duplicate identifiers are a practical problem, not just a cosmetic one

Using `T1–T3` for Transparent and `T4–T5` for Traceable makes sense on paper but becomes awkward immediately in databases, dashboards, and workflows. The revised draft is right to fix this.

### 2. The framework has no explicit scoring model

As soon as the team tries to operationalize TRUST, the missing questions appear:

- Is every criterion equal?
- Are some criteria disqualifying?
- Can strong usability compensate for weak traceability? (It should not.)
- What is the difference between “recommended,” “provisional,” and “not recommended” in scoring terms?

Without an explicit model, recommendations will drift.

### 3. It has no standard evidence protocol

There is no consistent answer to:

- how many screenshots are needed,
- what types of queries should be tested,
- how many citations should be verified,
- what links or exports should be archived,
- and how re-runs should be documented.

That weakens auditability.

### 4. It lacks confidence tracking

The framework should separate:

- **tool quality**, and
- **review confidence**.

A tool can be bad with high confidence, or promising with low confidence. v1 has no way to express that.

### 5. It does not yet differentiate between tool classes

There is an important distinction between:

- tightly scoped academic RAG/search tools,
- AI features layered onto existing scholarly platforms,
- and general-purpose LLM/chat tools.

The same criteria can still apply, but expectations and common failure modes differ enough that reviewer guidance should acknowledge the difference.

### 6. It is too easy to confuse source existence with source quality

Traceability asks whether a source can be found and verified. That is not the same as asking whether the source is credible, peer reviewed, retracted, or appropriate for the claim. Those are related but not identical checks.

## What is missing or needs sharper treatment

### Missing or underweighted

- explainability / provenance visibility beyond generic methodology disclosure;
- automation-bias mitigation;
- explicit handling of prompt/query data;
- fairness and coverage bias as a first-class governance issue;
- reviewer calibration and disagreement handling;
- re-evaluation triggers;
- confidence levels;
- and evidence retention rules.

### Not recommended as hard requirements in the core principle text

These ideas are useful, but should be handled carefully:

- **Exact reproducibility** for non-deterministic tools.
- **Hard mandatory bibliometrics** such as journal impact factor or h-index as core pass/fail criteria.
- **Claims of legal compliance** without explicit evidence and confidence labeling.
- **Exposed chain-of-thought** as a universal requirement. Provenance visibility is useful; mandatory chain-of-thought is a narrower and riskier demand.

## Recommended changes before version 1 can be used operationally

### Highest-priority changes

1. **Fix the identifier scheme** (`TR`, `RE`, `UC`, `SE`, `TC`).
2. **Replace exact reproducibility with a more realistic consistency standard.**
3. **Define critical fail conditions** for reliability, security, and traceability.
4. **Add a minimum evidence pack** for every review.
5. **Add recommendation categories and confidence levels.**
6. **Add reviewer workflow rules** (primary review, secondary review, disagreement resolution, committee decision, re-review).

### Recommended operational supplements

- a reviewer guide;
- a standard test-query bank;
- a scoring rubric;
- an evidence protocol;
- a controlled vocabulary for MS Lists;
- and a document describing what public-facing summaries should and should not claim.

## If only five things get fixed, fix these five

1. **R1 / citation verification must become a hard test, not a soft aspiration.**
2. **R2 must stop demanding exact reproducibility from non-deterministic systems.**
3. **T4/T5 must clearly define what claim-to-source traceability means.**
4. **S1/S2/S3 must use evidence-plus-confidence, not broad compliance assertions.**
5. **The framework must gain an operational scoring/governance layer before publication use.**

## Final conclusion

TRUST v1 is a **good framework draft** and an **insufficient final instrument**.

Its biggest strength is that it already identifies the right academic stakes.
Its biggest weakness is that it still leaves too much to reviewer interpretation.

The right next move is **not** to abandon the framework, but to:

- keep the five-principle structure,
- refine the wording,
- add explicit evidence and governance rules,
- and turn it into a non-compensatory review system where failures in reliability, security, or traceability cannot be hidden behind a polished interface.

That is exactly the path the revised draft starts to take.

## References consulted for this review

### Project documents

- `docs/framework/original-framework.md`
- `docs/framework/revised-framework.md`
- `docs/background/addendums-from-literature.md`
- `docs/background/eis_is_search_tools_policy_document_v3.md`
- `docs/background/liber-abstract.md`
- `docs/background/project_progress_overview_sept_2025.md`

### External anchor materials consulted during review

- GO FAIR. FAIR Principles. https://www.go-fair.org/fair-principles/
- Hervieux, S. & Wheatley, A. The ROBOT Test. https://thelibrairy.wordpress.com/2020/03/11/the-robot-test/
- High-level summary of the AI Act. https://artificialintelligenceact.eu/high-level-summary/
