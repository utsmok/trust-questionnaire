import { isDeepStrictEqual } from 'node:util';

import {
  FIELD_IDS,
  QUESTIONNAIRE_FIELDS_BY_ID,
  CRITERIA_BY_CODE,
} from '../../static/js/config/questionnaire-schema.js';
import {
  GOVERNANCE_RULES,
  WORKFLOW_OWNER_ASSIGNMENT_ROLES,
} from '../../static/js/config/rules.js';
import { SECTION_IDS, SECTION_WORKFLOW_STATES } from '../../static/js/config/sections.js';
import {
  buildWorkflowPageStates,
  applyWorkflowAuthorityOverlay,
} from '../../static/js/state/derive/workflow.js';
import { normalizeState } from '../../static/js/state/derive/helpers.js';
import { getLifecycleOverlay, listAvailableTransitionIds } from './lifecycle.js';

const VIEW_ALL_GLOBAL_ROLES = new Set(['coordinator', 'admin', 'auditor']);
const MANAGE_ASSIGNMENT_GLOBAL_ROLES = new Set(['coordinator', 'admin']);
const RECOGNIZED_GLOBAL_ROLES = new Set([
  'member',
  'coordinator',
  'decision_member',
  'auditor',
  'admin',
]);

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }

  return value;
};

const addIfPresent = (target, value) => {
  if (value) {
    target.add(value);
  }
};

const toEditableOverlayState = (baseState, canEdit) => {
  if (baseState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
    return SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED;
  }

  if (baseState === SECTION_WORKFLOW_STATES.READ_ONLY) {
    return SECTION_WORKFLOW_STATES.READ_ONLY;
  }

  return canEdit ? SECTION_WORKFLOW_STATES.EDITABLE : SECTION_WORKFLOW_STATES.READ_ONLY;
};

const getGlobalRole = (user) => {
  const role = user?.role ?? 'member';
  return RECOGNIZED_GLOBAL_ROLES.has(role) ? role : 'member';
};

export const getActorContext = ({ review, user }) => {
  const userId = Number(user?.id);
  const assignmentRoles = [];

  if (review.createdByUserId === userId) {
    assignmentRoles.push('nominator');
  }

  if (review.primaryEvaluatorUserId === userId) {
    assignmentRoles.push('primary_evaluator');
  }

  if (review.secondReviewerUserId === userId) {
    assignmentRoles.push('second_reviewer');
  }

  if (review.decisionOwnerUserId === userId) {
    assignmentRoles.push('decision_participant');
  }

  return {
    userId,
    globalRole: getGlobalRole(user),
    assignmentRoles,
  };
};

export const canUserViewReview = ({ review, user }) => {
  const actorContext = getActorContext({ review, user });

  if (VIEW_ALL_GLOBAL_ROLES.has(actorContext.globalRole)) {
    return true;
  }

  return actorContext.assignmentRoles.length > 0;
};

export const canUserManageAssignments = ({ review, user }) => {
  void review;
  return MANAGE_ASSIGNMENT_GLOBAL_ROLES.has(getGlobalRole(user));
};

const buildSectionPermissionOverlay = ({ review, user }) => {
  const actorContext = getActorContext({ review, user });
  const lifecycleOverlay = getLifecycleOverlay({
    lifecycleState: review.lifecycleState,
    workflowMode: review.workflowMode,
  });
  const baseline = buildWorkflowPageStates(review.workflowMode);
  const ownerRole = WORKFLOW_OWNER_ASSIGNMENT_ROLES[review.workflowMode] ?? null;
  const userOwnsStage = ownerRole ? actorContext.assignmentRoles.includes(ownerRole) : false;
  const sectionPermissions = {};

  for (const sectionId of baseline.accessibleSectionIds) {
    const baseState = baseline.bySectionId[sectionId].workflowState;
    let workflowState = baseState;
    let reasonCode = baseState === SECTION_WORKFLOW_STATES.READ_ONLY ? 'workflow_reference' : 'workflow_access';
    let reason = 'Visible under the active workflow mode.';

    if (lifecycleOverlay.lockAllAccessibleSections) {
      workflowState = toEditableOverlayState(baseState, false);
      reasonCode = `lifecycle_locked_${review.lifecycleState}`;
      reason = `Lifecycle state ${review.lifecycleState} currently locks questionnaire editing.`;
    } else if (baseState === SECTION_WORKFLOW_STATES.EDITABLE && !userOwnsStage) {
      workflowState = SECTION_WORKFLOW_STATES.READ_ONLY;
      reasonCode = 'stage_owned_by_other_actor';
      reason = 'This governance stage is editable only for the assigned actor of the current workflow mode.';
    }

    sectionPermissions[sectionId] = {
      workflowState,
      reasonCode,
      reason,
    };
  }

  return {
    actorContext,
    lifecycleOverlay,
    sectionPermissions,
    ownerRole,
  };
};

const getLockedFieldIds = () => cloneValue(GOVERNANCE_RULES.modeLockedFieldIds ?? [FIELD_IDS.S0.SUBMISSION_TYPE]);

export const buildWorkflowAuthority = ({ review, user }) => {
  const overlay = buildSectionPermissionOverlay({ review, user });
  const baseline = buildWorkflowPageStates(review.workflowMode);
  const pageStates = applyWorkflowAuthorityOverlay(baseline, {
    workflowMode: review.workflowMode,
    lifecycleState: review.lifecycleState,
    sectionPermissions: overlay.sectionPermissions,
  });
  const availableTransitionIds = listAvailableTransitionIds({
    review,
    actorContext: overlay.actorContext,
  });

  return {
    workflowMode: review.workflowMode,
    lifecycleState: review.lifecycleState,
    ownerRole: overlay.ownerRole,
    currentUser: {
      userId: overlay.actorContext.userId,
      globalRole: overlay.actorContext.globalRole,
      assignmentRoles: overlay.actorContext.assignmentRoles,
      canView: canUserViewReview({ review, user }),
      canManageAssignments: canUserManageAssignments({ review, user }),
    },
    lockedFieldIds: getLockedFieldIds(),
    sectionPermissions: Object.fromEntries(
      Object.entries(pageStates.bySectionId).map(([sectionId, pageState]) => [
        sectionId,
        {
          workflowState: pageState.workflowState,
          isAccessible: pageState.isAccessible,
          isEditable: pageState.isEditable,
          isReadOnly: pageState.isReadOnly,
          reasonCode: pageState.reasonCode ?? overlay.sectionPermissions[sectionId]?.reasonCode ?? null,
          reason: pageState.reason ?? overlay.sectionPermissions[sectionId]?.reason ?? null,
        },
      ]),
    ),
    editableSectionIds: pageStates.editableSectionIds,
    readOnlySectionIds: pageStates.readOnlySectionIds,
    systemSkippedSectionIds: pageStates.systemSkippedSectionIds,
    accessibleSectionIds: pageStates.accessibleSectionIds,
    availableTransitionIds,
  };
};

const unionKeys = (...lookups) => {
  const keys = new Set();
  lookups.forEach((lookup) => {
    Object.keys(lookup ?? {}).forEach((key) => keys.add(key));
  });
  return [...keys];
};

const addSectionIdFromFieldId = (changedSectionIds, fieldId) => {
  addIfPresent(changedSectionIds, QUESTIONNAIRE_FIELDS_BY_ID[fieldId]?.sectionId ?? null);
};

const addSectionIdFromCriterionCode = (changedSectionIds, criterionCode) => {
  addIfPresent(changedSectionIds, CRITERIA_BY_CODE[criterionCode]?.sectionId ?? null);
};

const addSectionIdFromJudgmentKey = (changedSectionIds, key) => {
  if (QUESTIONNAIRE_FIELDS_BY_ID[key]?.sectionId) {
    addSectionIdFromFieldId(changedSectionIds, key);
    return;
  }

  addIfPresent(changedSectionIds, key);
};

export const collectChangedSectionIds = ({ currentState, nextState }) => {
  const current = normalizeState(currentState);
  const next = normalizeState(nextState);
  const changedSectionIds = new Set();

  if (!isDeepStrictEqual(current.workflow, next.workflow)) {
    changedSectionIds.add(SECTION_IDS.S0);
  }

  unionKeys(current.fields, next.fields).forEach((fieldId) => {
    if (!isDeepStrictEqual(current.fields[fieldId], next.fields[fieldId])) {
      addSectionIdFromFieldId(changedSectionIds, fieldId);
    }
  });

  unionKeys(current.sections, next.sections).forEach((sectionId) => {
    if (!isDeepStrictEqual(current.sections[sectionId], next.sections[sectionId])) {
      changedSectionIds.add(sectionId);
    }
  });

  unionKeys(current.criteria, next.criteria).forEach((criterionCode) => {
    if (!isDeepStrictEqual(current.criteria[criterionCode], next.criteria[criterionCode])) {
      addSectionIdFromCriterionCode(changedSectionIds, criterionCode);
    }
  });

  if (!isDeepStrictEqual(current.evidence?.evaluation ?? [], next.evidence?.evaluation ?? [])) {
    changedSectionIds.add(SECTION_IDS.S2);
  }

  unionKeys(current.evidence?.criteria ?? {}, next.evidence?.criteria ?? {}).forEach((criterionCode) => {
    if (!isDeepStrictEqual(current.evidence?.criteria?.[criterionCode] ?? [], next.evidence?.criteria?.[criterionCode] ?? [])) {
      addSectionIdFromCriterionCode(changedSectionIds, criterionCode);
    }
  });

  unionKeys(
    current.overrides?.principleJudgments ?? {},
    next.overrides?.principleJudgments ?? {},
  ).forEach((judgmentKey) => {
    if (
      !isDeepStrictEqual(
        current.overrides?.principleJudgments?.[judgmentKey],
        next.overrides?.principleJudgments?.[judgmentKey],
      )
    ) {
      addSectionIdFromJudgmentKey(changedSectionIds, judgmentKey);
    }
  });

  return [...changedSectionIds];
};

export const collectChangedFieldIds = ({ currentState, nextState }) => {
  const current = normalizeState(currentState);
  const next = normalizeState(nextState);
  const changedFieldIds = new Set();

  if (!isDeepStrictEqual(current.workflow, next.workflow)) {
    changedFieldIds.add(FIELD_IDS.S0.SUBMISSION_TYPE);
  }

  unionKeys(current.fields, next.fields).forEach((fieldId) => {
    if (!isDeepStrictEqual(current.fields[fieldId], next.fields[fieldId])) {
      changedFieldIds.add(fieldId);
    }
  });

  return [...changedFieldIds];
};

export const authorizeStateWrite = ({ review, nextState, user }) => {
  const authority = buildWorkflowAuthority({ review, user });
  const changedSectionIds = collectChangedSectionIds({
    currentState: review.currentStateJson,
    nextState,
  });
  const changedFieldIds = collectChangedFieldIds({
    currentState: review.currentStateJson,
    nextState,
  });
  const editableSectionSet = new Set(authority.editableSectionIds);
  const blockedSectionIds = changedSectionIds.filter((sectionId) => !editableSectionSet.has(sectionId));
  const lockedFieldIds = changedFieldIds.filter((fieldId) => authority.lockedFieldIds.includes(fieldId));

  return {
    allowed: blockedSectionIds.length === 0 && lockedFieldIds.length === 0,
    changedSectionIds,
    changedFieldIds,
    blockedSectionIds,
    lockedFieldIds,
    authority,
  };
};

export const canAssignRoleToUser = ({ role, user }) => {
  if (!user || !user.isActive) {
    return false;
  }

  switch (role) {
    case 'decision_participant':
      return ['decision_member', 'coordinator', 'admin'].includes(getGlobalRole(user));
    case 'primary_evaluator':
    case 'second_reviewer':
    case 'observer':
      return true;
    default:
      return false;
  }
};

export const createAuthorizationService = () => ({
  getActorContext,
  canUserViewReview,
  canUserManageAssignments,
  buildWorkflowAuthority,
  collectChangedSectionIds,
  collectChangedFieldIds,
  authorizeStateWrite,
  canAssignRoleToUser,
});
