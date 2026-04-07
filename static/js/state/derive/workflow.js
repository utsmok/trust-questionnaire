import {
  CANONICAL_PAGE_SEQUENCE,
  SECTION_REGISTRY_BY_ID,
  SECTION_WORKFLOW_STATES,
} from '../../config/sections.js';
import { WORKFLOW_ESCALATION_RULES } from '../../config/rules.js';
import { SECTION_IDS } from '../../config/sections.js';
import { EMPTY_OBJECT, getWorkflowMode, getWorkflowPageRule, normalizeState } from './helpers.js';
import { matchesCondition } from './rules-eval.js';

export const buildWorkflowPageStates = (workflowMode) => {
  const workflowRule = getWorkflowPageRule(workflowMode);
  const editableSet = new Set(workflowRule.editableSectionIds);
  const readOnlySet = new Set(workflowRule.readOnlySectionIds);
  const primaryPagerSet = new Set(workflowRule.primaryPagerSectionIds);
  const bySectionId = {};

  for (const sectionId of CANONICAL_PAGE_SEQUENCE) {
    const workflowState = editableSet.has(sectionId)
      ? SECTION_WORKFLOW_STATES.EDITABLE
      : readOnlySet.has(sectionId)
        ? SECTION_WORKFLOW_STATES.READ_ONLY
        : SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED;

    bySectionId[sectionId] = {
      sectionId,
      workflowState,
      isAccessible: workflowState !== SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
      isEditable: workflowState === SECTION_WORKFLOW_STATES.EDITABLE,
      isReadOnly: workflowState === SECTION_WORKFLOW_STATES.READ_ONLY,
      isPrimaryPagerSection: primaryPagerSet.has(sectionId),
      pagerOrder: SECTION_REGISTRY_BY_ID[sectionId].pagerOrder,
    };
  }

  const accessibleSectionIds = CANONICAL_PAGE_SEQUENCE.filter(
    (sectionId) => bySectionId[sectionId].isAccessible,
  );

  return {
    workflowMode,
    bySectionId,
    editableSectionIds: CANONICAL_PAGE_SEQUENCE.filter(
      (sectionId) => bySectionId[sectionId].isEditable,
    ),
    readOnlySectionIds: CANONICAL_PAGE_SEQUENCE.filter(
      (sectionId) => bySectionId[sectionId].isReadOnly,
    ),
    systemSkippedSectionIds: CANONICAL_PAGE_SEQUENCE.filter(
      (sectionId) =>
        bySectionId[sectionId].workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
    ),
    primaryPagerSectionIds: workflowRule.primaryPagerSectionIds,
    accessibleSectionIds,
  };
};

const getNarrowedWorkflowState = (baselineWorkflowState, overlayWorkflowState) => {
  if (baselineWorkflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
    return SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED;
  }

  if (!overlayWorkflowState) {
    return baselineWorkflowState;
  }

  if (baselineWorkflowState === SECTION_WORKFLOW_STATES.READ_ONLY) {
    return overlayWorkflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED
      ? SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED
      : SECTION_WORKFLOW_STATES.READ_ONLY;
  }

  return overlayWorkflowState;
};

export const applyWorkflowAuthorityOverlay = (
  baselinePageStates,
  workflowAuthority = EMPTY_OBJECT,
) => {
  const sectionPermissions = workflowAuthority?.sectionPermissions ?? EMPTY_OBJECT;
  const bySectionId = {};

  for (const sectionId of CANONICAL_PAGE_SEQUENCE) {
    const baseline = baselinePageStates.bySectionId[sectionId];
    const permission = sectionPermissions[sectionId] ?? null;
    const workflowState = getNarrowedWorkflowState(
      baseline.workflowState,
      permission?.workflowState,
    );

    bySectionId[sectionId] = {
      ...baseline,
      workflowState,
      isAccessible: workflowState !== SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
      isEditable: workflowState === SECTION_WORKFLOW_STATES.EDITABLE,
      isReadOnly: workflowState === SECTION_WORKFLOW_STATES.READ_ONLY,
      reasonCode: permission?.reasonCode ?? baseline.reasonCode ?? null,
      reason: permission?.reason ?? baseline.reason ?? null,
    };
  }

  const accessibleSectionIds = CANONICAL_PAGE_SEQUENCE.filter(
    (sectionId) => bySectionId[sectionId].isAccessible,
  );

  return {
    ...baselinePageStates,
    bySectionId,
    editableSectionIds: CANONICAL_PAGE_SEQUENCE.filter(
      (sectionId) => bySectionId[sectionId].isEditable,
    ),
    readOnlySectionIds: CANONICAL_PAGE_SEQUENCE.filter(
      (sectionId) => bySectionId[sectionId].isReadOnly,
    ),
    systemSkippedSectionIds: CANONICAL_PAGE_SEQUENCE.filter(
      (sectionId) =>
        bySectionId[sectionId].workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
    ),
    accessibleSectionIds,
  };
};

export const derivePageStates = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const workflowMode = getWorkflowMode(state, context);
  const baselinePageStates = buildWorkflowPageStates(workflowMode);

  return applyWorkflowAuthorityOverlay(baselinePageStates, context.workflowAuthority);
};

export const deriveNavigationState = derivePageStates;

export const deriveWorkflowEscalations = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const activeRules = [];
  const unresolvedReasons = [];

  for (const rule of WORKFLOW_ESCALATION_RULES) {
    if (!matchesCondition(rule.when, state, context)) {
      continue;
    }

    activeRules.push(rule);

    const resolved = rule.releaseCondition
      ? matchesCondition(rule.releaseCondition, state, context)
      : false;

    if (!resolved) {
      unresolvedReasons.push({
        ruleId: rule.id,
        requiresSectionId: rule.requiresSectionId,
        description: rule.description,
      });
    }
  }

  return {
    activeRuleIds: activeRules.map((rule) => rule.id),
    unresolvedRuleIds: unresolvedReasons.map((reason) => reason.ruleId),
    unresolvedReasons,
    requiresFinalTeamDecision: activeRules.some(
      (rule) => rule.requiresSectionId === SECTION_IDS.S10C,
    ),
    unresolvedFinalTeamDecision: unresolvedReasons.some(
      (reason) => reason.requiresSectionId === SECTION_IDS.S10C,
    ),
    resolved: unresolvedReasons.length === 0,
  };
};
