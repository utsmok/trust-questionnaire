const indexBy = (items) =>
  Object.freeze(Object.fromEntries(items.map((item) => [item.id, Object.freeze(item)])));

export const GUIDANCE_TOPIC_REGISTRY = Object.freeze([
  {
    id: 'context.workflow-control',
    title: 'Workflow control guidance',
    kicker: 'S0 · Workflow',
    pageIds: Object.freeze(['S0']),
    sourceRefs: Object.freeze([
      'docs/trust-questionnaire.md#section-0',
      'docs/contracts/app-shell-route-model.md',
      'docs/00-master-implementation-roadmap.md#what-to-build-first',
    ]),
    summary:
      'This opening page defines which pages are accessible and whether they are editable, read-only, or system-skipped. Treat it as the control plane for the rest of the questionnaire.',
    bullets: Object.freeze([
      'Submission type determines whether the flow is nomination, primary evaluation, second review, final team decision, or re-evaluation.',
      'Tool name and tool URL provide the stable identity used by later review and governance pages.',
      'Nomination-only rationale belongs here; do not smear nomination context across later evidence fields.',
    ]),
  },
  {
    id: 'context.tool-profile',
    title: 'Tool profile and scope guidance',
    kicker: 'S1 · Profile',
    pageIds: Object.freeze(['S1']),
    sourceRefs: Object.freeze([
      'docs/trust-questionnaire.md#section-1',
      'docs/framework/revised-framework.md#2-scope-and-definitions',
    ]),
    summary:
      'This page establishes what the tool is, who provides it, how it is accessed, and whether it belongs inside the TRUST evaluation scope before deeper scoring begins.',
    bullets: Object.freeze([
      'Record vendor, category, deployment type, and access model as factual baseline data.',
      'Use the in-scope check and rationale fields to distinguish full scope, partial scope, and out-of-scope cases explicitly.',
      'Account and sign-in details matter later for privacy, security, and institutional deployment interpretation.',
    ]),
  },
  {
    id: 'context.evaluation-setup',
    title: 'Evaluation setup and evidence expectations',
    kicker: 'S2 · Setup',
    pageIds: Object.freeze(['S2']),
    sourceRefs: Object.freeze([
      'docs/trust-questionnaire.md#section-2',
      'docs/framework/revised-framework.md#5-minimum-evidence-requirements',
    ]),
    summary:
      'This page makes the evaluation reproducible. Testing dates, pricing tier, sample queries, repeated-query design, and evidence boundaries should be complete before principle scoring is trusted.',
    bullets: Object.freeze([
      'Document the exact scenarios used for known-item retrieval, exploratory search, and synthesis verification.',
      'Record repeated-query and benchmark setups in enough detail that another reviewer could rerun them.',
      'Keep the evidence folder link stable; later criterion-level evidence associations depend on this boundary.',
    ]),
  },
  {
    id: 'context.transparent',
    title: 'Transparent principle context',
    kicker: 'TR · Transparent',
    pageIds: Object.freeze(['TR']),
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#31-transparent-tr',
      'docs/trust-questionnaire.md#section-3-transparent-tr',
    ]),
    summary:
      'Transparency asks whether the tool reveals its data sources, methodology, scope, and limitations clearly enough that evaluators do not need to rely on faith.',
    bullets: Object.freeze([
      'TR1 — Document primary data sources, indexed coverage, disciplines, languages, date ranges, and update cadence.',
      'TR2 — Document model family or version, retrieval and generation approach, source base, and inspectability of provenance.',
      'TR3 — Record acknowledged limitations, indexing gaps, and update-frequency caveats explicitly.',
    ]),
  },
  {
    id: 'context.reliable',
    title: 'Reliable principle context',
    kicker: 'RE · Reliable',
    pageIds: Object.freeze(['RE']),
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#32-reliable-re',
      'docs/trust-questionnaire.md#section-4-reliable-re',
    ]),
    summary:
      'Reliability is about factual accuracy, consistency of consensus across repeated runs, and faithfulness to source material. Convenience does not excuse hallucinations or unsupported synthesis.',
    bullets: Object.freeze([
      'RE1 — Verify factual accuracy and guard against fabricated citations.',
      'RE2 — Run repeated-query tests and judge whether core conclusions remain substantively aligned.',
      'RE3 — Confirm that synthesis stays faithful to retrieved evidence and does not over-claim.',
    ]),
  },
  {
    id: 'context.user-centric',
    title: 'User-centric principle context',
    kicker: 'UC · User-centric',
    pageIds: Object.freeze(['UC']),
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#33-user-centric-uc',
      'docs/trust-questionnaire.md#section-5-user-centric-uc',
    ]),
    summary:
      'User-centric scoring covers fitness for purpose, workflow integration, usability, accessibility, and explicit communication that the interface is AI-assisted.',
    bullets: Object.freeze([
      'UC1 — Assess fit with the research and teaching needs of the University of Twente community.',
      'UC2 — Record export options, reference-manager compatibility, persistent links, and citation portability.',
      'UC3 — Evaluate practical usability and accessibility for the intended audience.',
      'UC4 — Look for uncertainty cues, AI-assistance disclosure, and prompts that encourage source verification.',
    ]),
  },
  {
    id: 'context.secure',
    title: 'Secure principle context',
    kicker: 'SE · Secure',
    pageIds: Object.freeze(['SE']),
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#34-secure-se',
      'docs/trust-questionnaire.md#section-6-secure-se',
    ]),
    summary:
      'Security covers privacy, data handling, institutional compatibility, and the visibility of bias or fairness risks. It is a compliance and ethics question, not only a technical checkbox.',
    bullets: Object.freeze([
      'SE1 — Assess data protection by design and by default under GDPR-oriented review.',
      'SE2 — Verify how prompts and queries are stored, retained, reused, and controlled by users.',
      'SE3 — Check alignment with institutional policy, national guidance, and sector frameworks.',
      'SE4 — Record disciplinary, geographic, language, or algorithmic bias risks and any credible mitigation.',
    ]),
  },
  {
    id: 'context.traceable',
    title: 'Traceable principle context',
    kicker: 'TC · Traceable',
    pageIds: Object.freeze(['TC']),
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#35-traceable-tc',
      'docs/trust-questionnaire.md#section-7-traceable-tc',
    ]),
    summary:
      'Traceability is the academic accountability core of the framework. Users and reviewers must be able to inspect which sources support an answer and how generated synthesis is separated from evidence.',
    bullets: Object.freeze([
      'TC1 — Check source attribution quality, persistence, and any source-quality cues surfaced with citations.',
      'TC2 — Check whether the provenance path is inspectable enough for scholarly use.',
      'Do not treat plausible prose as traceability; every substantive claim must connect back to verifiable source material.',
    ]),
  },
  {
    id: 'context.critical-fails-and-confidence',
    title: 'Critical fail and confidence guidance',
    kicker: 'S8 · Control',
    pageIds: Object.freeze(['S8']),
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#44-confidence-levels',
      'docs/framework/revised-framework.md#45-critical-fail-flags',
      'docs/trust-questionnaire.md#section-8-critical-fails-and-confidence',
    ]),
    summary:
      'Critical fails and confidence are evaluation-wide controls. They do not replace criterion scoring, but they can override what recommendation states are defensible.',
    bullets: Object.freeze([
      'Check every applicable critical-fail flag explicitly; a single unresolved flag forces team review.',
      'Use the completion checklist to confirm that evidence, uncertainty fields, privacy review, and query documentation are in place.',
      'Confidence should describe evidence strength and testing coverage, not optimism about the tool.',
    ]),
  },
  {
    id: 'context.overall-recommendation',
    title: 'Overall recommendation guidance',
    kicker: 'S9 · Recommendation',
    pageIds: Object.freeze(['S9']),
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#42-per-principle-judgment',
      'docs/framework/revised-framework.md#43-final-recommendation-categories',
      'docs/trust-questionnaire.md#section-9-overall-recommendation',
    ]),
    summary:
      'This page translates the principle-level evidence into an institutional recommendation, a caveat set, and a public-facing summary that another team member can defend later.',
    bullets: Object.freeze([
      'Keep recommendation status aligned with principle judgments and any unresolved critical-fail flags.',
      'State suitable and unsuitable use cases explicitly; do not rely on implication or tone.',
      'Set a realistic next review date based on tool risk, update cadence, and access conditions.',
    ]),
  },
  {
    id: 'context.primary-evaluation-handoff',
    title: 'Primary evaluation handoff guidance',
    kicker: 'S10A · Handoff',
    pageIds: Object.freeze(['S10A']),
    sourceRefs: Object.freeze([
      'docs/trust-questionnaire.md#section-10--second-review-and-governance',
      'docs/framework/revised-framework.md#6-governance-and-review-workflow',
    ]),
    summary:
      'The handoff is not a victory lap. It packages the primary evaluation for a second reviewer and should expose the weakest parts of the evidence set clearly.',
    bullets: Object.freeze([
      'Flag key concerns that deserve targeted second-review attention.',
      'List uncertainty areas in plain language, with criterion codes where possible.',
      'Assume the second reviewer was not present during the original testing session.',
    ]),
  },
  {
    id: 'context.second-review',
    title: 'Second review guidance',
    kicker: 'S10B · Review',
    pageIds: Object.freeze(['S10B']),
    sourceRefs: Object.freeze([
      'docs/trust-questionnaire.md#section-10--second-review-and-governance',
      'docs/framework/revised-framework.md#63-disagreement-handling',
    ]),
    summary:
      'The second review step exists to challenge scoring drift, identify conflicting interpretations, and record disagreement before a team decision is made.',
    bullets: Object.freeze([
      'Use the agreement field precisely: full agreement, partial agreement, or disagreement.',
      'If criteria need revisiting, list them explicitly and explain why the scores or evidence differ.',
      'Disagreement should travel forward as documented rationale, not be patched over informally.',
    ]),
  },
  {
    id: 'context.final-team-decision',
    title: 'Final team decision guidance',
    kicker: 'S10C · Decision',
    pageIds: Object.freeze(['S10C']),
    sourceRefs: Object.freeze([
      'docs/trust-questionnaire.md#section-10--second-review-and-governance',
      'docs/framework/revised-framework.md#6-governance-and-review-workflow',
    ]),
    summary:
      'The final decision records what the team approved, under which publication conditions, and when re-evaluation is due. It closes the workflow without erasing the evidence trail.',
    bullets: Object.freeze([
      'At least two EIS-IS team members must have reviewed the tool before a final recommendation is assigned.',
      'Publication status, final status rationale, and review cycle frequency belong together as one governance decision.',
      'Use the final rationale field to explain conditions, deferrals, escalations, or rejection clearly.',
    ]),
  },
]);

export const GUIDANCE_TOPIC_BY_ID = indexBy(GUIDANCE_TOPIC_REGISTRY);

export const HELP_LEGEND_CARD_REGISTRY = Object.freeze([
  {
    id: 'section-context',
    title: 'Section context',
    body: 'Accent color answers “where am I?”. It follows the active page across chrome, sidebar markers, contextual docs, and the completion strip.',
    chips: Object.freeze([
      { label: 'PAGE', dataset: { helpRole: 'context' } },
      { label: 'Reference', dataset: { helpRole: 'info' } },
      { label: 'About', dataset: { helpRole: 'info' } },
    ]),
  },
  {
    id: 'score-scale',
    title: 'Score scale',
    body: 'Criterion scores stay local to score controls and legends. They do not double as page or workflow colors.',
    chips: Object.freeze([
      { label: '0 Fails', dataset: { score: '0' } },
      { label: '1 Partial', dataset: { score: '1' } },
      { label: '2 Baseline', dataset: { score: '2' } },
      { label: '3 Strong', dataset: { score: '3' } },
    ]),
  },
  {
    id: 'workflow-progress',
    title: 'Workflow and progress',
    body: 'Workflow tags show editability; progress tags show completion or attention state. They overlay section context rather than replacing it.',
    chips: Object.freeze([
      { label: 'Editable', dataset: { workflowState: 'editable' } },
      { label: 'Read-only', dataset: { workflowState: 'read_only' } },
      { label: 'Skipped', dataset: { workflowState: 'system_skipped' } },
    ]),
  },
  {
    id: 'judgment-state',
    title: 'Judgment state',
    body: 'Principle judgments are outcome states, not section colors. They stay contained inside their own controls and badges.',
    chips: Object.freeze([
      { label: 'Pass', dataset: { judgment: 'pass' } },
      { label: 'Conditional', dataset: { judgment: 'conditional_pass' } },
      { label: 'Fail', dataset: { judgment: 'fail' } },
    ]),
  },
  {
    id: 'recommendation-state',
    title: 'Recommendation state',
    body: 'Recommendation colors match the decision meaning: positive, caveated, provisional, restricted, negative, or neutral.',
    chips: Object.freeze([
      { label: 'Recommended', dataset: { recommendationState: 'recommended' } },
      {
        label: 'Caveats',
        dataset: { recommendationState: 'recommended_with_caveats' },
      },
      {
        label: 'Needs review',
        dataset: { recommendationState: 'needs_review_provisional' },
      },
      { label: 'Pilot only', dataset: { recommendationState: 'pilot_only' } },
      { label: 'Not recommended', dataset: { recommendationState: 'not_recommended' } },
      { label: 'Out of scope', dataset: { recommendationState: 'out_of_scope' } },
    ]),
  },
]);

export const HELP_SURFACE_SECTIONS = Object.freeze([
  {
    id: 'workspace-help-overview',
    title: 'How to use the workspace',
    paragraphs: Object.freeze([
      'The review workspace keeps only page-local operational guidance beside the questionnaire. Shared Help, Reference, and About material is available from the app-level help route and is reused here through structured topic registries.',
      'Use the page index for section jumps, the context rail for current-page interpretation, and the reference/about links when a page needs broader framework material.',
    ]),
    bullets: Object.freeze([
      'Keep scoring, evidence, and governance decisions explicit; do not compress them into shorthand prose.',
      'Treat recommendation state, confidence, and critical-fail controls as separate signals.',
      'Use shared help when you need framework definitions, scoring rules, or workflow background that spans more than the current page.',
    ]),
  },
]);

export const getGuidanceTopicDefinition = (topicId) => GUIDANCE_TOPIC_BY_ID[topicId] ?? null;
