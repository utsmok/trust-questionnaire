import { WORKFLOW_MODES } from '../../static/js/config/sections.js';

export const LIFECYCLE_STATES = Object.freeze({
  NOMINATION_DRAFT: 'nomination_draft',
  NOMINATION_SUBMITTED: 'nomination_submitted',
  PRIMARY_ASSIGNED: 'primary_assigned',
  PRIMARY_IN_PROGRESS: 'primary_in_progress',
  PRIMARY_HANDOFF_READY: 'primary_handoff_ready',
  SECOND_REVIEW_ASSIGNED: 'second_review_assigned',
  SECOND_REVIEW_IN_PROGRESS: 'second_review_in_progress',
  DECISION_PENDING: 'decision_pending',
  FINALIZED: 'finalized',
  PUBLISHED: 'published',
  RE_EVALUATION_IN_PROGRESS: 're_evaluation_in_progress',
  ARCHIVED: 'archived',
});

export const TRANSITION_IDS = Object.freeze({
  SUBMIT_NOMINATION: 'submit_nomination',
  RETURN_NOMINATION_TO_DRAFT: 'return_nomination_to_draft',
  ASSIGN_PRIMARY: 'assign_primary',
  START_PRIMARY_REVIEW: 'start_primary_review',
  SUBMIT_PRIMARY_HANDOFF: 'submit_primary_handoff',
  REOPEN_PRIMARY_FROM_HANDOFF: 'reopen_primary_from_handoff',
  ASSIGN_SECOND_REVIEW: 'assign_second_review',
  START_SECOND_REVIEW: 'start_second_review',
  REQUEST_PRIMARY_REWORK: 'request_primary_rework',
  SUBMIT_SECOND_REVIEW: 'submit_second_review',
  REQUEST_SECOND_REVIEW_REWORK: 'request_second_review_rework',
  REQUEST_PRIMARY_REWORK_FROM_DECISION: 'request_primary_rework_from_decision',
  FINALIZE_DECISION: 'finalize_decision',
  PUBLISH_RECORD: 'publish_record',
  REOPEN_FINALIZED_TO_PRIMARY: 'reopen_finalized_to_primary',
  START_RE_EVALUATION_FROM_FINALIZED: 'start_re_evaluation_from_finalized',
  REOPEN_PUBLISHED_TO_PRIMARY: 'reopen_published_to_primary',
  START_RE_EVALUATION: 'start_re_evaluation',
  SUBMIT_RE_EVALUATION_HANDOFF: 'submit_re_evaluation_handoff',
  ARCHIVE_RECORD: 'archive_record',
});

export const LIFECYCLE_WORKFLOW_MODE_MAP = Object.freeze({
  [LIFECYCLE_STATES.NOMINATION_DRAFT]: WORKFLOW_MODES.NOMINATION,
  [LIFECYCLE_STATES.NOMINATION_SUBMITTED]: WORKFLOW_MODES.NOMINATION,
  [LIFECYCLE_STATES.PRIMARY_ASSIGNED]: WORKFLOW_MODES.PRIMARY_EVALUATION,
  [LIFECYCLE_STATES.PRIMARY_IN_PROGRESS]: WORKFLOW_MODES.PRIMARY_EVALUATION,
  [LIFECYCLE_STATES.PRIMARY_HANDOFF_READY]: WORKFLOW_MODES.PRIMARY_EVALUATION,
  [LIFECYCLE_STATES.SECOND_REVIEW_ASSIGNED]: WORKFLOW_MODES.SECOND_REVIEW,
  [LIFECYCLE_STATES.SECOND_REVIEW_IN_PROGRESS]: WORKFLOW_MODES.SECOND_REVIEW,
  [LIFECYCLE_STATES.DECISION_PENDING]: WORKFLOW_MODES.FINAL_TEAM_DECISION,
  [LIFECYCLE_STATES.FINALIZED]: WORKFLOW_MODES.FINAL_TEAM_DECISION,
  [LIFECYCLE_STATES.PUBLISHED]: WORKFLOW_MODES.FINAL_TEAM_DECISION,
  [LIFECYCLE_STATES.RE_EVALUATION_IN_PROGRESS]: WORKFLOW_MODES.RE_EVALUATION,
});

const COORDINATION_GLOBAL_ROLES = new Set(['coordinator', 'admin']);
const DECISION_GLOBAL_ROLES = new Set(['decision_member', 'coordinator', 'admin']);
const LOCK_ALL_ACCESSIBLE_STATES = new Set([
  LIFECYCLE_STATES.NOMINATION_SUBMITTED,
  LIFECYCLE_STATES.PRIMARY_ASSIGNED,
  LIFECYCLE_STATES.PRIMARY_HANDOFF_READY,
  LIFECYCLE_STATES.SECOND_REVIEW_ASSIGNED,
  LIFECYCLE_STATES.FINALIZED,
  LIFECYCLE_STATES.PUBLISHED,
  LIFECYCLE_STATES.ARCHIVED,
]);

const TRANSITION_DEFINITIONS = Object.freeze({
  [TRANSITION_IDS.SUBMIT_NOMINATION]: Object.freeze({
    from: [LIFECYCLE_STATES.NOMINATION_DRAFT],
    to: LIFECYCLE_STATES.NOMINATION_SUBMITTED,
    workflowMode: WORKFLOW_MODES.NOMINATION,
    actorRule: 'nominator_or_coordinator',
  }),
  [TRANSITION_IDS.RETURN_NOMINATION_TO_DRAFT]: Object.freeze({
    from: [LIFECYCLE_STATES.NOMINATION_SUBMITTED],
    to: LIFECYCLE_STATES.NOMINATION_DRAFT,
    workflowMode: WORKFLOW_MODES.NOMINATION,
    actorRule: 'coordinator',
  }),
  [TRANSITION_IDS.ASSIGN_PRIMARY]: Object.freeze({
    from: [LIFECYCLE_STATES.NOMINATION_SUBMITTED],
    to: LIFECYCLE_STATES.PRIMARY_ASSIGNED,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'coordinator',
    requiredAssignmentRole: 'primary_evaluator',
  }),
  [TRANSITION_IDS.START_PRIMARY_REVIEW]: Object.freeze({
    from: [LIFECYCLE_STATES.PRIMARY_ASSIGNED],
    to: LIFECYCLE_STATES.PRIMARY_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'primary_assignee_only',
  }),
  [TRANSITION_IDS.SUBMIT_PRIMARY_HANDOFF]: Object.freeze({
    from: [LIFECYCLE_STATES.PRIMARY_IN_PROGRESS, LIFECYCLE_STATES.RE_EVALUATION_IN_PROGRESS],
    to: LIFECYCLE_STATES.PRIMARY_HANDOFF_READY,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'primary_assignee_only',
  }),
  [TRANSITION_IDS.REOPEN_PRIMARY_FROM_HANDOFF]: Object.freeze({
    from: [LIFECYCLE_STATES.PRIMARY_HANDOFF_READY],
    to: LIFECYCLE_STATES.PRIMARY_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'coordinator',
  }),
  [TRANSITION_IDS.ASSIGN_SECOND_REVIEW]: Object.freeze({
    from: [LIFECYCLE_STATES.PRIMARY_HANDOFF_READY],
    to: LIFECYCLE_STATES.SECOND_REVIEW_ASSIGNED,
    workflowMode: WORKFLOW_MODES.SECOND_REVIEW,
    actorRule: 'coordinator',
    requiredAssignmentRole: 'second_reviewer',
  }),
  [TRANSITION_IDS.START_SECOND_REVIEW]: Object.freeze({
    from: [LIFECYCLE_STATES.SECOND_REVIEW_ASSIGNED],
    to: LIFECYCLE_STATES.SECOND_REVIEW_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.SECOND_REVIEW,
    actorRule: 'second_assignee_only',
  }),
  [TRANSITION_IDS.REQUEST_PRIMARY_REWORK]: Object.freeze({
    from: [LIFECYCLE_STATES.SECOND_REVIEW_IN_PROGRESS],
    to: LIFECYCLE_STATES.PRIMARY_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'second_or_coordinator',
  }),
  [TRANSITION_IDS.SUBMIT_SECOND_REVIEW]: Object.freeze({
    from: [LIFECYCLE_STATES.SECOND_REVIEW_IN_PROGRESS],
    to: LIFECYCLE_STATES.DECISION_PENDING,
    workflowMode: WORKFLOW_MODES.FINAL_TEAM_DECISION,
    actorRule: 'second_assignee_only',
    requiredAssignmentRole: 'decision_participant',
  }),
  [TRANSITION_IDS.REQUEST_SECOND_REVIEW_REWORK]: Object.freeze({
    from: [LIFECYCLE_STATES.DECISION_PENDING],
    to: LIFECYCLE_STATES.SECOND_REVIEW_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.SECOND_REVIEW,
    actorRule: 'decision_or_coordinator',
  }),
  [TRANSITION_IDS.REQUEST_PRIMARY_REWORK_FROM_DECISION]: Object.freeze({
    from: [LIFECYCLE_STATES.DECISION_PENDING],
    to: LIFECYCLE_STATES.PRIMARY_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'decision_or_coordinator',
  }),
  [TRANSITION_IDS.FINALIZE_DECISION]: Object.freeze({
    from: [LIFECYCLE_STATES.DECISION_PENDING],
    to: LIFECYCLE_STATES.FINALIZED,
    workflowMode: WORKFLOW_MODES.FINAL_TEAM_DECISION,
    actorRule: 'decision_or_coordinator',
  }),
  [TRANSITION_IDS.PUBLISH_RECORD]: Object.freeze({
    from: [LIFECYCLE_STATES.FINALIZED],
    to: LIFECYCLE_STATES.PUBLISHED,
    workflowMode: WORKFLOW_MODES.FINAL_TEAM_DECISION,
    actorRule: 'coordinator',
  }),
  [TRANSITION_IDS.REOPEN_FINALIZED_TO_PRIMARY]: Object.freeze({
    from: [LIFECYCLE_STATES.FINALIZED],
    to: LIFECYCLE_STATES.PRIMARY_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'coordinator',
  }),
  [TRANSITION_IDS.START_RE_EVALUATION_FROM_FINALIZED]: Object.freeze({
    from: [LIFECYCLE_STATES.FINALIZED],
    to: LIFECYCLE_STATES.RE_EVALUATION_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.RE_EVALUATION,
    actorRule: 'coordinator',
    requiredAssignmentRole: 'primary_evaluator',
  }),
  [TRANSITION_IDS.REOPEN_PUBLISHED_TO_PRIMARY]: Object.freeze({
    from: [LIFECYCLE_STATES.PUBLISHED],
    to: LIFECYCLE_STATES.PRIMARY_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'coordinator',
  }),
  [TRANSITION_IDS.START_RE_EVALUATION]: Object.freeze({
    from: [LIFECYCLE_STATES.PUBLISHED],
    to: LIFECYCLE_STATES.RE_EVALUATION_IN_PROGRESS,
    workflowMode: WORKFLOW_MODES.RE_EVALUATION,
    actorRule: 'coordinator',
    requiredAssignmentRole: 'primary_evaluator',
  }),
  [TRANSITION_IDS.SUBMIT_RE_EVALUATION_HANDOFF]: Object.freeze({
    from: [LIFECYCLE_STATES.RE_EVALUATION_IN_PROGRESS],
    to: LIFECYCLE_STATES.PRIMARY_HANDOFF_READY,
    workflowMode: WORKFLOW_MODES.PRIMARY_EVALUATION,
    actorRule: 'primary_assignee_only',
  }),
  [TRANSITION_IDS.ARCHIVE_RECORD]: Object.freeze({
    from: [
      LIFECYCLE_STATES.NOMINATION_DRAFT,
      LIFECYCLE_STATES.NOMINATION_SUBMITTED,
      LIFECYCLE_STATES.FINALIZED,
      LIFECYCLE_STATES.PUBLISHED,
    ],
    to: LIFECYCLE_STATES.ARCHIVED,
    workflowMode: null,
    actorRule: 'coordinator',
  }),
});

const hasGlobalRole = (actorContext, roleSet) => roleSet.has(actorContext.globalRole);
const hasAssignmentRole = (actorContext, role) => actorContext.assignmentRoles.includes(role);

export const getLifecycleDefinition = (transitionId) => TRANSITION_DEFINITIONS[transitionId] ?? null;

export const getWorkflowModeForLifecycleState = ({ lifecycleState, currentWorkflowMode = null }) =>
  lifecycleState === LIFECYCLE_STATES.ARCHIVED
    ? currentWorkflowMode
    : (LIFECYCLE_WORKFLOW_MODE_MAP[lifecycleState] ?? currentWorkflowMode ?? WORKFLOW_MODES.NOMINATION);

export const getLifecycleOverlay = ({ lifecycleState, workflowMode }) => ({
  lifecycleState,
  workflowMode: getWorkflowModeForLifecycleState({ lifecycleState, currentWorkflowMode: workflowMode }),
  lockAllAccessibleSections: LOCK_ALL_ACCESSIBLE_STATES.has(lifecycleState),
  archived: lifecycleState === LIFECYCLE_STATES.ARCHIVED,
});

const satisfiesActorRule = (definition, actorContext) => {
  switch (definition.actorRule) {
    case 'coordinator':
      return hasGlobalRole(actorContext, COORDINATION_GLOBAL_ROLES);
    case 'nominator_or_coordinator':
      return hasAssignmentRole(actorContext, 'nominator') || hasGlobalRole(actorContext, COORDINATION_GLOBAL_ROLES);
    case 'primary_assignee_only':
      return hasAssignmentRole(actorContext, 'primary_evaluator');
    case 'second_assignee_only':
      return hasAssignmentRole(actorContext, 'second_reviewer');
    case 'second_or_coordinator':
      return hasAssignmentRole(actorContext, 'second_reviewer') || hasGlobalRole(actorContext, COORDINATION_GLOBAL_ROLES);
    case 'decision_or_coordinator':
      return hasAssignmentRole(actorContext, 'decision_participant') || hasGlobalRole(actorContext, DECISION_GLOBAL_ROLES);
    default:
      return false;
  }
};

const satisfiesAssignmentRequirement = (definition, review) => {
  switch (definition.requiredAssignmentRole) {
    case 'primary_evaluator':
      return Number.isInteger(Number(review.primaryEvaluatorUserId)) && Number(review.primaryEvaluatorUserId) > 0;
    case 'second_reviewer':
      return Number.isInteger(Number(review.secondReviewerUserId)) && Number(review.secondReviewerUserId) > 0;
    case 'decision_participant':
      return Number.isInteger(Number(review.decisionOwnerUserId)) && Number(review.decisionOwnerUserId) > 0;
    default:
      return true;
  }
};

const buildTimestampPatch = ({ transitionId, existingReview }) => {
  const now = new Date().toISOString();
  const next = {
    submittedAt: existingReview.submittedAt ?? null,
    finalizedAt: existingReview.finalizedAt ?? null,
    archivedAt: existingReview.archivedAt ?? null,
  };

  switch (transitionId) {
    case TRANSITION_IDS.SUBMIT_NOMINATION:
    case TRANSITION_IDS.SUBMIT_PRIMARY_HANDOFF:
    case TRANSITION_IDS.SUBMIT_RE_EVALUATION_HANDOFF:
      next.submittedAt = now;
      next.archivedAt = null;
      return next;
    case TRANSITION_IDS.FINALIZE_DECISION:
      next.finalizedAt = now;
      next.archivedAt = null;
      return next;
    case TRANSITION_IDS.ARCHIVE_RECORD:
      next.archivedAt = now;
      return next;
    case TRANSITION_IDS.REOPEN_FINALIZED_TO_PRIMARY:
    case TRANSITION_IDS.REOPEN_PUBLISHED_TO_PRIMARY:
    case TRANSITION_IDS.REQUEST_PRIMARY_REWORK:
    case TRANSITION_IDS.REQUEST_PRIMARY_REWORK_FROM_DECISION:
    case TRANSITION_IDS.RETURN_NOMINATION_TO_DRAFT:
    case TRANSITION_IDS.REOPEN_PRIMARY_FROM_HANDOFF:
    case TRANSITION_IDS.REQUEST_SECOND_REVIEW_REWORK:
      next.archivedAt = null;
      if (transitionId !== TRANSITION_IDS.REOPEN_FINALIZED_TO_PRIMARY) {
        next.finalizedAt = existingReview.finalizedAt ?? null;
      }
      return next;
    default:
      next.archivedAt = null;
      return next;
  }
};

export const planLifecycleTransition = ({ review, transitionId, actorContext }) => {
  const definition = getLifecycleDefinition(transitionId);

  if (!definition) {
    throw new Error(`Unsupported workflow transition: ${transitionId}.`);
  }

  if (!definition.from.includes(review.lifecycleState)) {
    throw new Error(
      `Transition ${transitionId} is not allowed from lifecycle state ${review.lifecycleState}.`,
    );
  }

  if (!satisfiesActorRule(definition, actorContext)) {
    throw new Error(`Actor is not allowed to perform transition ${transitionId}.`);
  }

  if (!satisfiesAssignmentRequirement(definition, review)) {
    throw new Error(`Transition ${transitionId} requires a current ${definition.requiredAssignmentRole} assignment.`);
  }

  return {
    transitionId,
    fromLifecycleState: review.lifecycleState,
    toLifecycleState: definition.to,
    resultingWorkflowMode:
      definition.workflowMode ??
      getWorkflowModeForLifecycleState({
        lifecycleState: definition.to,
        currentWorkflowMode: review.workflowMode,
      }),
    timestampPatch: buildTimestampPatch({ transitionId, existingReview: review }),
  };
};

export const listAvailableTransitionIds = ({ review, actorContext }) =>
  Object.keys(TRANSITION_DEFINITIONS).filter((transitionId) => {
    try {
      planLifecycleTransition({ review, transitionId, actorContext });
      return true;
    } catch {
      return false;
    }
  });
