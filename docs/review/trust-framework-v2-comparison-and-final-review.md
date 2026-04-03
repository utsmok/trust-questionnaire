# Comparison of revised TRUST framework (v2) against the original and final review opinion

*Date: 2026-04-02*

## Purpose of this document

This document compares the revised TRUST framework in `docs/framework/revised-framework.md` against:

1. the original TRUST framework in `docs/framework/original-framework.md`, and
2. the critique and recommendations captured in `docs/trust-framework-v1-deep-review.md`.

The aim is not just to ask whether v2 is “better.” It is to ask whether v2 is now strong enough to serve as:

- the conceptual framework,
- the operational questionnaire basis,
- and the published standard for recommending tools.

## Overall verdict

Version 2 is **materially stronger than version 1**.

It fixes several of the most important weaknesses in v1:

- the identifier scheme,
- the unrealistic reproducibility language,
- the lack of explicit faithfulness language,
- the absence of cognitive-guardrail expectations,
- and the underpowered treatment of bias and prompt/query privacy.

However, v2 is **not yet complete as a final operational standard on its own**.

It should be adopted as the **conceptual baseline**, but not frozen as the final implementation layer until it is paired with:

- a scoring rubric,
- reviewer guidance,
- an evidence protocol,
- and governance rules for recommendation, disagreement, and re-review.

## The most important improvements in v2

| Issue in v1 | What v2 changes | Assessment |
|---|---|---|
| Duplicate `T1–T5` labeling created ambiguity between Transparent and Traceable. | Introduces `TR`, `RE`, `UC`, `SE`, `TC`. | **Fully fixed.** This is an immediate operational improvement for MS Forms/MS Lists. |
| `R2` demanded “consistent and reproducible results,” which is unrealistic for non-deterministic systems. | Replaces this with **consistency of consensus**. | **Major improvement.** This is the single most important conceptual fix. |
| `R3` used faithfulness language only loosely. | Defines **faithfulness** explicitly: no information generated that cannot be directly inferred from retrieved source material. | **Strong improvement**, though still needs reviewer guidance. |
| The original framework lacked explicit cognitive/AI-literacy safeguards. | Adds `UC4` on cognitive guardrails and automation bias. | **Strong improvement** and highly aligned with the project vision. |
| Bias was buried inside transparency/limitations. | Adds `SE4` making bias/fairness an explicit ethical and compliance concern. | **Important improvement**, but still operationally difficult. |
| Prompt/query data were not clearly foregrounded in security/privacy. | `SE2` now explicitly includes prompts/queries. | **Very useful improvement** for actual privacy review. |
| Traceability focused mainly on attribution and provenance. | `TC1` adds bibliometric credibility signals. | **Mixed improvement**: useful idea, but partially overreaches. |
| Transparency lacked RAG/XAI specificity. | `TR2` now asks for model, RAG architecture, corpus, doc count, and XAI exposure. | **Partly fixed.** Much better, though slightly over-specific in places. |

## Dimension-by-dimension analysis

## Transparent (`TR`)

### What v2 improves well

- `TR2` is far stronger than v1’s `T2`.
- It correctly recognizes that modern academic AI search tools are often retrieval-plus-generation systems, not just “an AI model with a general process.”
- It closes the explainability gap identified in the project’s literature addendum.

### Remaining issues

`TR2` now contains a mixture of:

- principle-level expectations,
- architecture-level detail,
- and implementation-level examples.

That is better than vagueness, but it risks becoming too rigid.

#### Specific concerns

1. **“maximum number of documents fed into the summarizer”** may be useful, but it is not equally inspectable across all tools.
2. **Expose Chain-of-Thought reasoning** is too narrow to serve as a universal transparency proxy.
3. The criterion could still be interpreted differently by reviewers depending on whether the tool is open, partially open, or entirely vendor-controlled.

### Recommendation

Keep the intent of `TR2`, but soften and generalize the wording slightly.

### Suggested wording

> The tool’s methodology is explicitly documented, including the model family/version used, the retrieval/generation architecture, the corpus or source base used to answer queries, how many or what type of sources inform an answer, and whether users can inspect source-selection or provenance information.

## Reliable (`RE`)

### What v2 improves well

This is the strongest part of the revision.

#### `RE2`

The move from exact reproducibility to **consistency of consensus** is excellent.

It does three things:

1. it respects the empirical reality of current non-deterministic tools;
2. it keeps the standard demanding where it matters most;
3. it avoids forcing reviewers into an impossible binary.

#### `RE3`

The explicit faithfulness language is also a major improvement. It makes clear that:

- citations are not enough,
- and summaries cannot invent or over-extend claims beyond retrieved evidence.

### Remaining issues

`RE2` and `RE3` still need operational guidance.

#### Specific concerns

1. **“high degree”** in `RE2` is still subjective.
2. **“core scientific conclusions”** still needs examples or a test method.
3. **“directly inferred”** in `RE3` is directionally right, but reviewers may disagree on what counts as acceptable inference.

### Recommendation

Keep both criteria, but define their measurement in reviewer guidance.

### Suggested wording

> When identical queries are run multiple times, the tool’s core conclusions should remain substantively aligned even if wording or source order varies.

> When the tool synthesizes information, the synthesis must remain faithful to retrieved source material and must not introduce claims that are unsupported, exaggerated, or materially misleading.

## User-centric (`UC`)

### What v2 improves well

`UC4` is a major addition and one of the best changes in v2.

It finally turns the background philosophy — that AI should support rather than replace critical thinking — into an explicit criterion.

That is a genuine improvement, not just a stylistic change.

### Remaining issues

The User-centric principle still blends two different things:

1. **general tool quality**, and
2. **institution-specific suitability**.

`UC1` is the clearest example.

#### Specific concerns

1. “Aligns with the research and educational needs of the University of Twente community” is useful for recommendation decisions, but it is not the same as general product quality.
2. `UC4` names the right concern, but “cognitive guardrails” still needs operational examples.
3. `UC3` remains broad and does not define what counts as accessible or usable enough.

### Recommendation

Keep the principle, but separate **reviewer guidance** into:

- institutional fit,
- workflow fit,
- usability/accessibility,
- and automation-bias mitigation.

### Suggested wording for `UC4`

> The interface clearly communicates that it is AI-assisted, surfaces uncertainty or limitation cues where appropriate, and actively prompts users to verify source material rather than relying on the answer alone.

## Secure (`SE`)

### What v2 improves well

`SE2` is significantly better because it explicitly includes prompts/queries. That is operationally important.

`SE4` is also an important conceptual correction. Bias is no longer treated as a footnote under limitations.

### Remaining issues

This is still the least stable part of the revised framework.

#### Specific concerns

1. `SE4` is **too broad and too hard to measure** as written.
2. “ensuring equitable representation of global research” is normatively admirable, but operationally vague.
3. Reviewers still need a way to indicate whether a compliance judgment is verified, likely, unclear, or escalated.

### Recommendation

Keep `SE4`, but narrow the text to what reviewers can actually assess.

### Suggested wording for `SE4`

> The tool documents major disciplinary, geographic, and language coverage gaps, acknowledges relevant algorithmic or data-bias risks, and provides evidence of any mitigation measures or safeguards that are actually in place.

This keeps the ethical intent without pretending librarians can certify fairness in the abstract.

## Traceable (`TC`)

### What v2 improves well

The revised Traceable principle remains one of the strongest and most distinctive parts of the framework.

### Where v2 overreaches

`TC1` now mixes two things:

1. **traceability** — can I inspect and verify where a claim came from?
2. **credibility support** — does the tool surface cues that help me judge source quality?

Those are related, but not identical.

### Specific concerns

1. **Peer-review status** and **retraction alerts** are useful credibility signals and fit well.
2. **Journal impact** and especially **author h-index** are much more problematic as hard requirements. They are field-dependent, unevenly distributed, and can distort evaluation toward prestige metrics.
3. `TC2` still merges “auditable” and “explainable.” Those should not be treated as synonyms.

### Recommendation

Keep the added source-quality support idea, but make it optional or supportive rather than a hard requirement in the core principle text.

### Suggested wording for `TC1`

> The tool provides clear, accurate, and persistent attribution for the sources used to generate an answer. Where available, it should also surface helpful source-quality cues such as publication type, peer-review status, or retraction notices.

### Suggested wording for `TC2`

> The tool allows users and reviewers to inspect the provenance of an answer by showing which sources were selected and how retrieved evidence is distinguished from generated synthesis.

## What v2 still does not solve

These were major weaknesses in v1 and remain outside the principle text in v2:

### 1. No scoring model

v2 still does not tell reviewers:

- how to score,
- when to fail,
- how to distinguish recommended vs provisional,
- or how to handle missing evidence.

### 2. No evidence protocol

There is still no built-in answer to:

- how many queries to test,
- how many citations to verify,
- which screenshots to keep,
- what evidence is required per principle,
- and what should be stored in the evidence pack.

### 3. No governance logic

The framework text still needs support from a process layer covering:

- primary review,
- second review,
- disagreement handling,
- committee decision,
- confidence rating,
- and re-evaluation triggers.

### 4. Principle text and reviewer guidance remain blended

v2 improves the concepts but still places some details in the principle text that really belong in reviewer guidance or examples.

## Keep / Revise / Move / Avoid

| Category | Recommendation |
|---|---|
| **Keep** | Identifier scheme (`TR/RE/UC/SE/TC`), `RE2` move to consistency of consensus, `RE3` faithfulness concept, `UC4`, explicit prompt/query treatment in `SE2`. |
| **Revise** | `TR2`, `UC1`, `SE4`, `TC1`, `TC2`. |
| **Move to reviewer guidance** | Acceptable variance thresholds, exact test query counts, examples of cognitive guardrails, evidence pack requirements, bias spot-check methods, recommendation thresholds. |
| **Avoid as hard requirements** | Exact reproducibility, mandatory exposed chain-of-thought, mandatory h-index/impact-factor use, blanket compliance claims without evidence quality labels. |

## Recommended final direction for the framework

The strongest path forward is:

1. **Adopt v2 as the conceptual framework.**
2. **Keep the five principles. Do not add a sixth principle unless absolutely necessary.**
3. **Pair v2 with an operational layer rather than stuffing every detail into the principle text.**

That operational layer should include:

- a scoring rubric;
- critical fail conditions;
- evidence requirements;
- confidence levels;
- workflow roles;
- and re-review rules.

## Final opinion

Version 2 is clearly the better framework.

It is:

- more realistic,
- more precise,
- more aligned with current RAG/LLM behavior,
- and more faithful to the project’s actual academic and ethical goals.

But it is still best understood as **the framework text**, not yet the full operational package.

### Final recommendation

Adopt **v2 with minor wording refinements** as the working TRUST framework, and immediately pair it with:

1. an operational scoring rubric,
2. an evidence protocol,
3. a Microsoft Forms / MS Lists data model,
4. and reviewer governance instructions.

That combination — not v2 by itself — is what will make the system rigorous, auditable, and scalable.

## Sources used for this comparison

- `docs/framework/original-framework.md`
- `docs/framework/revised-framework.md`
- `docs/trust-framework-v1-deep-review.md`
- `docs/background/addendums-from-literature.md`
- `docs/background/eis_is_search_tools_policy_document_v3.md`
- `docs/background/project_progress_overview_sept_2025.md`
- GO FAIR. FAIR Principles. https://www.go-fair.org/fair-principles/
- Hervieux, S. & Wheatley, A. The ROBOT Test. https://thelibrairy.wordpress.com/2020/03/11/the-robot-test/
- High-level summary of the AI Act. https://artificialintelligenceact.eu/high-level-summary/
