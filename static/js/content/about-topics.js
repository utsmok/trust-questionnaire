const indexBy = (items) =>
  Object.freeze(Object.fromEntries(items.map((item) => [item.id, Object.freeze(item)])));

export const ABOUT_TOPIC_REGISTRY = Object.freeze([
  {
    id: 'about.framework-overview',
    title: 'Framework overview',
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#version-note',
      'docs/framework/revised-framework.md#1-introduction',
    ]),
    blocks: Object.freeze([
      {
        type: 'paragraph',
        text: "TRUST is the EIS-IS team's structured evaluation framework for AI-based information search tools used in academic contexts. Version 2 keeps the static, auditable evaluation workflow while tightening reliability standards, adding cognitive guardrails, and formalizing scoring, evidence, and governance.",
      },
      {
        type: 'paragraph',
        text: 'The framework is intentionally stricter than generic AI checklists because academic recommendation requires verifiable provenance, faithful synthesis, explicit limitations, and a defensible institutional review trail.',
      },
      {
        type: 'principles',
        items: Object.freeze([
          {
            accentKey: 'tr',
            title: 'Transparent',
            description: 'Clear documentation of sources, methods, and limitations.',
          },
          {
            accentKey: 're',
            title: 'Reliable',
            description:
              'Accurate, verifiable outputs with stable core conclusions and faithful synthesis.',
          },
          {
            accentKey: 'uc',
            title: 'User-centric',
            description:
              'Fit for academic workflows, usable by the target audience, and explicit about AI assistance.',
          },
          {
            accentKey: 'se',
            title: 'Secure',
            description: 'Acceptable privacy, security, compliance, and bias-mitigation posture.',
          },
          {
            accentKey: 'tc',
            title: 'Traceable',
            description: 'Inspectable provenance from generated answers back to original sources.',
          },
        ]),
      },
      {
        type: 'notice',
        tone: 'info',
        text: 'Operational additions in version 2 include the scoring model, minimum evidence requirements, critical-fail flags, confidence levels, and a formal governance workflow.',
      },
    ]),
  },
  {
    id: 'about.scope-and-definitions',
    title: 'Scope and definitions',
    sourceRefs: Object.freeze(['docs/framework/revised-framework.md#2-scope-and-definitions']),
    blocks: Object.freeze([
      {
        type: 'paragraph',
        text: 'Within this framework, an AI-based search tool is a system that relies on non-deterministic generative models to produce outputs. Identical queries may yield non-identical results, and the system performs generative synthesis or conversational interaction beyond deterministic retrieval.',
      },
      {
        type: 'cards',
        cards: Object.freeze([
          {
            title: 'Covered cases',
            items: Object.freeze([
              'Standalone AI search tools',
              'AI features layered onto existing scholarly platforms',
              'General-purpose LLM interfaces assessed for scholarly search use',
            ]),
          },
          {
            title: 'Exclusions',
            items: Object.freeze([
              'Deterministic search tools without generative capability',
              'AI tools used only for writing, coding, or image generation',
              'Internal research prototypes not available to end users',
            ]),
          },
          {
            title: 'Examples',
            items: Object.freeze([
              'Out of scope: Google Scholar, when used only as deterministic search.',
              'In scope: Semantic Scholar features that use LLMs to summarize or synthesize results.',
            ]),
          },
        ]),
      },
    ]),
  },
  {
    id: 'about.governance-workflow',
    title: 'Governance and review workflow',
    sourceRefs: Object.freeze([
      'docs/framework/revised-framework.md#6-governance-and-review-workflow',
      'docs/trust-questionnaire.md#section-10--second-review-and-governance',
    ]),
    blocks: Object.freeze([
      {
        type: 'paragraph',
        text: 'The evaluation cycle is structured so that results remain defensible after handoff. A tool moves from nomination through primary evaluation and second review into a final team decision with recorded publication status and next review date.',
      },
      {
        type: 'ordered-list',
        items: Object.freeze([
          'Nomination — record tool identity, vendor, URL, and reason for review.',
          'Primary evaluation — run desk review, hands-on testing, repeated-query checks, and manual verification.',
          'Second review — confirm, qualify, or challenge the primary evaluation.',
          'Final team decision — assign final status, publication handling, and review cycle.',
        ]),
      },
      {
        type: 'cards',
        cards: Object.freeze([
          {
            title: 'Two-person review',
            paragraphs: Object.freeze([
              'No tool may receive a final recommendation without review by at least two EIS-IS team members.',
            ]),
          },
          {
            title: 'Disagreement handling',
            paragraphs: Object.freeze([
              'Disputed criteria are documented, both reviewers justify their position, and the team resolves the issue in the decision log.',
            ]),
          },
          {
            title: 'Re-evaluation triggers',
            paragraphs: Object.freeze([
              'Major vendor changes, reported issues, scheduled review dates, or claimed fixes for prior critical fails all trigger re-evaluation.',
            ]),
          },
          {
            title: 'Decision attributes',
            paragraphs: Object.freeze([
              'Publication status, suitable and unsuitable use cases, and review frequency are recorded alongside the recommendation itself.',
            ]),
          },
        ]),
      },
    ]),
  },
]);

export const ABOUT_TOPIC_BY_ID = indexBy(ABOUT_TOPIC_REGISTRY);

export const getAboutTopicDefinition = (topicId) => ABOUT_TOPIC_BY_ID[topicId] ?? null;
