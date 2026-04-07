const indexBy = (items, key = 'id') =>
  Object.freeze(Object.fromEntries(items.map((item) => [item[key], Object.freeze(item)])));

export const REFERENCE_TOPIC_REGISTRY = Object.freeze([
  {
    id: 'reference.answer-sets',
    drawerId: 'answer-sets',
    code: 'REF-A',
    title: 'Standard answer sets',
    summary:
      'Reusable answer vocabularies, confidence levels, recommendation labels, and critical-fail flag references.',
    sourceRefs: Object.freeze(['docs/trust-questionnaire.md#standard-answer-sets']),
    blocks: Object.freeze([
      {
        type: 'table',
        title: 'Criterion rating scale',
        columns: Object.freeze(['Score', 'Label', 'Meaning']),
        rows: Object.freeze([
          Object.freeze([
            '0',
            'Fails',
            'The criterion is not met, or evidence directly contradicts it.',
          ]),
          Object.freeze([
            '1',
            'Partial / unclear',
            'Some evidence exists, but it is incomplete or inconsistent.',
          ]),
          Object.freeze([
            '2',
            'Meets baseline',
            'The criterion is satisfactorily met with adequate evidence.',
          ]),
          Object.freeze([
            '3',
            'Strong',
            'The criterion is exceeded with clear and well-documented evidence.',
          ]),
        ]),
      },
      {
        type: 'chips',
        title: 'Recommendation vocabulary',
        description:
          'Use the canonical recommendation labels exactly; do not invent softer variants for publication or governance notes.',
        chips: Object.freeze([
          { label: 'Recommended', dataset: { recommendationState: 'recommended' } },
          {
            label: 'Recommended with caveats',
            dataset: { recommendationState: 'recommended_with_caveats' },
          },
          {
            label: 'Needs review / provisional',
            dataset: { recommendationState: 'needs_review_provisional' },
          },
          { label: 'Pilot only', dataset: { recommendationState: 'pilot_only' } },
          { label: 'Not recommended', dataset: { recommendationState: 'not_recommended' } },
          { label: 'Out of scope', dataset: { recommendationState: 'out_of_scope' } },
        ]),
      },
      {
        type: 'chips',
        title: 'Confidence levels',
        description:
          'Confidence expresses how well-supported the evaluation is. It does not mean the tool performed well.',
        chips: Object.freeze([
          { label: 'High', dataset: { confidenceLevel: 'high' } },
          { label: 'Medium', dataset: { confidenceLevel: 'medium' } },
          { label: 'Low', dataset: { confidenceLevel: 'low' } },
        ]),
      },
      {
        type: 'list',
        title: 'Critical-fail flags',
        items: Object.freeze([
          'Fabricated or unverifiable citation found',
          'Materially unfaithful synthesis found',
          'Major claim not traceable to a primary source',
          'Provenance path not inspectable enough for academic use',
          'Privacy/data-use terms unclear or unacceptable',
          'Serious security/compliance concern',
          'Serious bias/fairness concern without credible mitigation',
        ]),
      },
    ]),
  },
  {
    id: 'reference.scoring-model',
    drawerId: 'scoring-model',
    code: 'REF-S',
    title: 'Evaluation scoring model',
    summary:
      'Criterion scoring, per-principle judgment rules, and final recommendation thresholds.',
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#4-evaluation-scoring-model',
      'docs/trust-questionnaire.md#standard-answer-sets',
    ]),
    blocks: Object.freeze([
      {
        type: 'table',
        title: 'Per-principle judgment',
        columns: Object.freeze(['Judgment', 'When to assign']),
        rows: Object.freeze([
          Object.freeze([
            'Pass',
            'All criteria score 2 or above, with no significant unresolved concerns.',
          ]),
          Object.freeze([
            'Conditional pass',
            'One or more criteria score 1, but the principle is substantially met overall.',
          ]),
          Object.freeze([
            'Fail',
            'One or more criteria score 0, or the principle as a whole is not met.',
          ]),
        ]),
      },
      {
        type: 'table',
        title: 'Final recommendation categories',
        columns: Object.freeze(['Category', 'Meaning']),
        rows: Object.freeze([
          Object.freeze(['Recommended', 'Suitable for recommendation to the UT community.']),
          Object.freeze([
            'Recommended with caveats',
            'Suitable, but specific limits or conditions must be communicated.',
          ]),
          Object.freeze([
            'Needs review / provisional',
            'Promising, but unresolved issues block full recommendation.',
          ]),
          Object.freeze(['Pilot only', 'Allowed only in a controlled pilot setting.']),
          Object.freeze(['Not recommended', 'Fails one or more core TRUST standards.']),
          Object.freeze([
            'Out of scope',
            'Does not meet the framework definition of an AI-based search tool.',
          ]),
        ]),
      },
      {
        type: 'paragraph',
        text: 'A tool may receive a negative recommendation with high confidence, or a positive recommendation with low confidence. Keep recommendation state, confidence, and workflow escalation distinct.',
      },
      {
        type: 'notice',
        tone: 'info',
        text: 'Any critical-fail flag triggers a mandatory team review. An evaluation with an unresolved critical fail cannot be finalized as Recommended or Recommended with caveats.',
      },
    ]),
  },
  {
    id: 'reference.evidence-requirements',
    drawerId: 'evidence-requirements',
    code: 'REF-E',
    title: 'Minimum evidence requirements',
    summary:
      'Evaluation evidence expectations, repeated-query rules, and verification requirements.',
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#5-minimum-evidence-requirements',
    ]),
    blocks: Object.freeze([
      {
        type: 'cards',
        cards: Object.freeze([
          {
            title: 'Desk review',
            items: Object.freeze([
              'Vendor methodology or architecture documentation',
              'Privacy policy and terms of service',
              'White papers, model cards, or equivalent technical statements',
            ]),
          },
          {
            title: 'Hands-on testing',
            items: Object.freeze([
              'Known-item query',
              'Exploratory literature search',
              'Answer or synthesis query with source verification',
            ]),
          },
          {
            title: 'Repeated-query test',
            items: Object.freeze([
              'Run at least one query three times',
              'Record whether the core conclusion stays substantively aligned',
              'Note meaningful variation in sources or claims',
            ]),
          },
          {
            title: 'Manual source verification',
            items: Object.freeze([
              'Check at least five claims or citations',
              'Verify that sources exist',
              "Confirm that sources actually support the tool's claim",
            ]),
          },
          {
            title: 'Evidence bundle',
            items: Object.freeze([
              'Screenshots of outputs, disclosures, and interface states',
              'Saved policy excerpts and supporting documents',
              'Reviewer notes, metadata, and SharePoint linkage',
            ]),
          },
        ]),
      },
    ]),
  },
  {
    id: 'reference.critical-fail-flags',
    drawerId: null,
    code: 'REF-CF',
    title: 'Critical fail flags',
    summary: 'Canonical critical-fail vocabulary used by governance and recommendation review.',
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#45-critical-fail-flags',
      'docs/trust-questionnaire.md#critical-fail-flags-checkboxes',
    ]),
    blocks: Object.freeze([
      {
        type: 'list',
        title: 'Escalation conditions',
        items: Object.freeze([
          'Fabricated or unverifiable citation found',
          'Materially unfaithful synthesis found',
          'Major claim not traceable to a primary source',
          'Provenance path not inspectable enough for academic use',
          'Privacy/data-use terms unclear or unacceptable',
          'Serious security/compliance concern',
          'Serious bias/fairness concern without credible mitigation',
        ]),
      },
    ]),
  },
]);

export const REFERENCE_TOPIC_BY_ID = indexBy(REFERENCE_TOPIC_REGISTRY);
export const REFERENCE_DRAWER_TOPIC_REGISTRY = Object.freeze(
  REFERENCE_TOPIC_REGISTRY.filter((topic) => topic.drawerId),
);
export const REFERENCE_TOPIC_BY_DRAWER_ID = indexBy(REFERENCE_DRAWER_TOPIC_REGISTRY, 'drawerId');

export const getReferenceTopicDefinition = (topicId) => REFERENCE_TOPIC_BY_ID[topicId] ?? null;
export const getReferenceDrawerDefinition = (drawerId) =>
  REFERENCE_TOPIC_BY_DRAWER_ID[drawerId] ?? null;
