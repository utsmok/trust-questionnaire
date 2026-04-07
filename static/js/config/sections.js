export const WORKFLOW_MODES = Object.freeze({
  NOMINATION: 'nomination',
  PRIMARY_EVALUATION: 'primary_evaluation',
  SECOND_REVIEW: 'second_review',
  FINAL_TEAM_DECISION: 'final_team_decision',
  RE_EVALUATION: 're_evaluation',
});

export const SECTION_WORKFLOW_STATES = Object.freeze({
  EDITABLE: 'editable',
  READ_ONLY: 'read_only',
  SYSTEM_SKIPPED: 'system_skipped',
});

export const SECTION_IDS = Object.freeze({
  S0: 'S0',
  S1: 'S1',
  S2: 'S2',
  TR: 'TR',
  RE: 'RE',
  UC: 'UC',
  SE: 'SE',
  TC: 'TC',
  S8: 'S8',
  S9: 'S9',
  S10A: 'S10A',
  S10B: 'S10B',
  S10C: 'S10C',
});

export const GOVERNANCE_STAGE_KEYS = Object.freeze({
  PRIMARY_HANDOFF: 'primary_handoff',
  SECOND_REVIEW: 'second_review',
  FINAL_DECISION: 'final_team_decision',
});

export const CONTENT_TOPIC_AREAS = Object.freeze({
  CONTEXT: 'context',
  REFERENCE: 'reference',
  ABOUT: 'about',
});

import { freezeArray } from '../utils/shared.js';
import { GUIDANCE_TOPIC_REGISTRY } from '../content/guidance-topics.js';
import { REFERENCE_TOPIC_REGISTRY } from '../content/reference-topics.js';
import { ABOUT_TOPIC_REGISTRY } from '../content/about-topics.js';

const indexBy = (items, key = 'id') =>
  Object.freeze(Object.fromEntries(items.map((item) => [item[key], item])));

const createWorkflowStates = ({
  nomination = SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
  primaryEvaluation = SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
  secondReview = SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
  finalTeamDecision = SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
  reEvaluation = SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
}) =>
  Object.freeze({
    [WORKFLOW_MODES.NOMINATION]: nomination,
    [WORKFLOW_MODES.PRIMARY_EVALUATION]: primaryEvaluation,
    [WORKFLOW_MODES.SECOND_REVIEW]: secondReview,
    [WORKFLOW_MODES.FINAL_TEAM_DECISION]: finalTeamDecision,
    [WORKFLOW_MODES.RE_EVALUATION]: reEvaluation,
  });

export const COMPLETION_GROUPS = freezeArray([
  Object.freeze({
    id: 'intake',
    label: 'Workflow, profile, and setup',
    sectionIds: freezeArray([SECTION_IDS.S0, SECTION_IDS.S1, SECTION_IDS.S2]),
  }),
  Object.freeze({ id: 'tr', label: 'Transparent', sectionIds: freezeArray([SECTION_IDS.TR]) }),
  Object.freeze({ id: 're', label: 'Reliable', sectionIds: freezeArray([SECTION_IDS.RE]) }),
  Object.freeze({ id: 'uc', label: 'User-centric', sectionIds: freezeArray([SECTION_IDS.UC]) }),
  Object.freeze({ id: 'se', label: 'Secure', sectionIds: freezeArray([SECTION_IDS.SE]) }),
  Object.freeze({ id: 'tc', label: 'Traceable', sectionIds: freezeArray([SECTION_IDS.TC]) }),
  Object.freeze({
    id: 'critical_fails',
    label: 'Critical fails and confidence',
    sectionIds: freezeArray([SECTION_IDS.S8]),
  }),
  Object.freeze({
    id: 'recommendation',
    label: 'Overall recommendation',
    sectionIds: freezeArray([SECTION_IDS.S9]),
  }),
  Object.freeze({
    id: 'governance',
    label: 'Governance workflow',
    sectionIds: freezeArray([SECTION_IDS.S10A, SECTION_IDS.S10B, SECTION_IDS.S10C]),
  }),
]);

export const SECTION_REGISTRY = freezeArray([
  Object.freeze({
    id: SECTION_IDS.S0,
    sectionCode: '0',
    pageCode: 'S0',
    slug: 'workflow-control',
    title: 'Workflow Control',
    shortLabel: 'Workflow',
    navLabel: 'Workflow',
    quickJump: false,
    principleKey: null,
    accentKey: 'control',
    completionGroupId: 'intake',
    pagerOrder: 0,
    workflowStates: createWorkflowStates({
      nomination: SECTION_WORKFLOW_STATES.EDITABLE,
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.workflow-control',
    referenceTopicIds: freezeArray(['reference.answer-sets', 'reference.scoring-model']),
    aboutTopicIds: freezeArray(['about.framework-overview', 'about.governance-workflow']),
  }),
  Object.freeze({
    id: SECTION_IDS.S1,
    sectionCode: '1',
    pageCode: 'S1',
    slug: 'tool-profile',
    title: 'Tool Profile',
    shortLabel: 'Profile',
    navLabel: 'Profile',
    quickJump: false,
    principleKey: null,
    accentKey: 'profile',
    completionGroupId: 'intake',
    pagerOrder: 1,
    workflowStates: createWorkflowStates({
      nomination: SECTION_WORKFLOW_STATES.EDITABLE,
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.tool-profile',
    referenceTopicIds: freezeArray(['reference.answer-sets']),
    aboutTopicIds: freezeArray(['about.scope-and-definitions']),
  }),
  Object.freeze({
    id: SECTION_IDS.S2,
    sectionCode: '2',
    pageCode: 'S2',
    slug: 'evaluation-setup',
    title: 'Evaluation Setup',
    shortLabel: 'Setup',
    navLabel: 'Setup',
    quickJump: false,
    principleKey: null,
    accentKey: 'setup',
    completionGroupId: 'intake',
    pagerOrder: 2,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.evaluation-setup',
    referenceTopicIds: freezeArray(['reference.evidence-requirements', 'reference.scoring-model']),
    aboutTopicIds: freezeArray(['about.framework-overview']),
  }),
  Object.freeze({
    id: SECTION_IDS.TR,
    sectionCode: '3',
    pageCode: 'TR',
    slug: 'transparent',
    title: 'Transparent',
    shortLabel: 'TR',
    navLabel: 'TR',
    quickJump: true,
    principleKey: 'TR',
    accentKey: 'tr',
    completionGroupId: 'tr',
    pagerOrder: 3,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.transparent',
    referenceTopicIds: freezeArray(['reference.scoring-model', 'reference.evidence-requirements']),
    aboutTopicIds: freezeArray(['about.framework-overview']),
  }),
  Object.freeze({
    id: SECTION_IDS.RE,
    sectionCode: '4',
    pageCode: 'RE',
    slug: 'reliable',
    title: 'Reliable',
    shortLabel: 'RE',
    navLabel: 'RE',
    quickJump: true,
    principleKey: 'RE',
    accentKey: 're',
    completionGroupId: 're',
    pagerOrder: 4,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.reliable',
    referenceTopicIds: freezeArray(['reference.scoring-model', 'reference.evidence-requirements']),
    aboutTopicIds: freezeArray(['about.framework-overview']),
  }),
  Object.freeze({
    id: SECTION_IDS.UC,
    sectionCode: '5',
    pageCode: 'UC',
    slug: 'user-centric',
    title: 'User-centric',
    shortLabel: 'UC',
    navLabel: 'UC',
    quickJump: true,
    principleKey: 'UC',
    accentKey: 'uc',
    completionGroupId: 'uc',
    pagerOrder: 5,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.user-centric',
    referenceTopicIds: freezeArray(['reference.scoring-model', 'reference.evidence-requirements']),
    aboutTopicIds: freezeArray(['about.framework-overview']),
  }),
  Object.freeze({
    id: SECTION_IDS.SE,
    sectionCode: '6',
    pageCode: 'SE',
    slug: 'secure',
    title: 'Secure',
    shortLabel: 'SE',
    navLabel: 'SE',
    quickJump: true,
    principleKey: 'SE',
    accentKey: 'se',
    completionGroupId: 'se',
    pagerOrder: 6,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.secure',
    referenceTopicIds: freezeArray([
      'reference.scoring-model',
      'reference.evidence-requirements',
      'reference.answer-sets',
    ]),
    aboutTopicIds: freezeArray(['about.framework-overview', 'about.governance-workflow']),
  }),
  Object.freeze({
    id: SECTION_IDS.TC,
    sectionCode: '7',
    pageCode: 'TC',
    slug: 'traceable',
    title: 'Traceable',
    shortLabel: 'TC',
    navLabel: 'TC',
    quickJump: true,
    principleKey: 'TC',
    accentKey: 'tc',
    completionGroupId: 'tc',
    pagerOrder: 7,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.traceable',
    referenceTopicIds: freezeArray(['reference.scoring-model', 'reference.evidence-requirements']),
    aboutTopicIds: freezeArray(['about.framework-overview']),
  }),
  Object.freeze({
    id: SECTION_IDS.S8,
    sectionCode: '8',
    pageCode: 'S8',
    slug: 'critical-fails-and-confidence',
    title: 'Critical Fails and Confidence',
    shortLabel: 'Critical fails',
    navLabel: 'Critical Fails',
    quickJump: false,
    principleKey: null,
    accentKey: 'reference',
    completionGroupId: 'critical_fails',
    pagerOrder: 8,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.critical-fails-and-confidence',
    referenceTopicIds: freezeArray([
      'reference.answer-sets',
      'reference.scoring-model',
      'reference.evidence-requirements',
    ]),
    aboutTopicIds: freezeArray(['about.governance-workflow']),
  }),
  Object.freeze({
    id: SECTION_IDS.S9,
    sectionCode: '9',
    pageCode: 'S9',
    slug: 'overall-recommendation',
    title: 'Overall Recommendation',
    shortLabel: 'Recommendation',
    navLabel: 'Recommendation',
    quickJump: false,
    principleKey: null,
    accentKey: 'recommendation',
    completionGroupId: 'recommendation',
    pagerOrder: 9,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.overall-recommendation',
    referenceTopicIds: freezeArray(['reference.scoring-model', 'reference.answer-sets']),
    aboutTopicIds: freezeArray(['about.governance-workflow']),
  }),
  Object.freeze({
    id: SECTION_IDS.S10A,
    sectionCode: '10A',
    pageCode: 'S10A',
    slug: 'primary-evaluation-handoff',
    title: 'Primary Evaluation Handoff',
    shortLabel: 'Handoff',
    navLabel: 'Handoff',
    quickJump: false,
    principleKey: null,
    accentKey: 'governance',
    governanceStage: GOVERNANCE_STAGE_KEYS.PRIMARY_HANDOFF,
    completionGroupId: 'governance',
    pagerOrder: 10,
    workflowStates: createWorkflowStates({
      primaryEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
      secondReview: SECTION_WORKFLOW_STATES.READ_ONLY,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
      reEvaluation: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.primary-evaluation-handoff',
    referenceTopicIds: freezeArray(['reference.answer-sets']),
    aboutTopicIds: freezeArray(['about.governance-workflow']),
  }),
  Object.freeze({
    id: SECTION_IDS.S10B,
    sectionCode: '10B',
    pageCode: 'S10B',
    slug: 'second-review',
    title: 'Second Review',
    shortLabel: 'Second review',
    navLabel: 'Second Review',
    quickJump: false,
    principleKey: null,
    accentKey: 'governance',
    governanceStage: GOVERNANCE_STAGE_KEYS.SECOND_REVIEW,
    completionGroupId: 'governance',
    pagerOrder: 11,
    workflowStates: createWorkflowStates({
      secondReview: SECTION_WORKFLOW_STATES.EDITABLE,
      finalTeamDecision: SECTION_WORKFLOW_STATES.READ_ONLY,
    }),
    contextTopicId: 'context.second-review',
    referenceTopicIds: freezeArray(['reference.answer-sets']),
    aboutTopicIds: freezeArray(['about.governance-workflow']),
  }),
  Object.freeze({
    id: SECTION_IDS.S10C,
    sectionCode: '10C',
    pageCode: 'S10C',
    slug: 'final-team-decision',
    title: 'Final Team Decision',
    shortLabel: 'Final decision',
    navLabel: 'Final Decision',
    quickJump: false,
    principleKey: null,
    accentKey: 'governance',
    governanceStage: GOVERNANCE_STAGE_KEYS.FINAL_DECISION,
    completionGroupId: 'governance',
    pagerOrder: 12,
    workflowStates: createWorkflowStates({
      finalTeamDecision: SECTION_WORKFLOW_STATES.EDITABLE,
    }),
    contextTopicId: 'context.final-team-decision',
    referenceTopicIds: freezeArray(['reference.answer-sets']),
    aboutTopicIds: freezeArray(['about.governance-workflow']),
  }),
]);

const toContentTopic = (topic, area) =>
  Object.freeze({
    id: topic.id,
    area,
    title: topic.title,
    pageIds: freezeArray(topic.pageIds ?? []),
    sourceRefs: freezeArray(topic.sourceRefs ?? []),
  });

export const CONTENT_TOPIC_REGISTRY = freezeArray([
  ...GUIDANCE_TOPIC_REGISTRY.map((topic) => toContentTopic(topic, CONTENT_TOPIC_AREAS.CONTEXT)),
  ...REFERENCE_TOPIC_REGISTRY.map((topic) => toContentTopic(topic, CONTENT_TOPIC_AREAS.REFERENCE)),
  ...ABOUT_TOPIC_REGISTRY.map((topic) => toContentTopic(topic, CONTENT_TOPIC_AREAS.ABOUT)),
]);

export const SECTION_REGISTRY_BY_ID = indexBy(SECTION_REGISTRY);
export const CONTENT_TOPIC_REGISTRY_BY_ID = indexBy(CONTENT_TOPIC_REGISTRY);

export const CANONICAL_PAGE_SEQUENCE = freezeArray(
  SECTION_REGISTRY.slice()
    .sort((left, right) => left.pagerOrder - right.pagerOrder)
    .map((section) => section.id),
);

export const QUICK_JUMP_SECTION_IDS = freezeArray(
  SECTION_REGISTRY.filter((section) => section.quickJump).map((section) => section.id),
);

export const SECTIONS_BY_COMPLETION_GROUP = Object.freeze(
  Object.fromEntries(COMPLETION_GROUPS.map((group) => [group.id, group.sectionIds])),
);

export const getSectionDefinition = (sectionId) => SECTION_REGISTRY_BY_ID[sectionId] ?? null;

export const getContentTopicDefinition = (topicId) => CONTENT_TOPIC_REGISTRY_BY_ID[topicId] ?? null;

export const PRINCIPLE_SECTION_IDS = freezeArray([
  SECTION_IDS.TR,
  SECTION_IDS.RE,
  SECTION_IDS.UC,
  SECTION_IDS.SE,
  SECTION_IDS.TC,
]);

export const GOVERNANCE_SECTION_IDS = freezeArray([
  SECTION_IDS.S10A,
  SECTION_IDS.S10B,
  SECTION_IDS.S10C,
]);
