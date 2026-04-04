import {
  CRITERIA,
  CRITERION_FIELD_IDS,
  FIELD_IDS,
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_FIELDS_BY_ID,
} from '../../config/questionnaire-schema.js';
import {
  COMPLETION_CHECK_RULES,
  SECTION_STATUS,
  SKIP_STATES,
  VALIDATION_STATES,
} from '../../config/rules.js';
import {
  CANONICAL_PAGE_SEQUENCE,
  COMPLETION_GROUPS,
  SECTION_REGISTRY_BY_ID,
  SECTION_WORKFLOW_STATES,
} from '../../config/sections.js';
import { EMPTY_ARRAY, isPlainObject } from '../../utils/shared.js';
import {
  EMPTY_OBJECT,
  getFieldValue,
  hasMeaningfulRawValue,
  isFieldValuePresent,
  normalizeState,
  normalizeUrlList,
} from './helpers.js';
import { derivePageStates, deriveWorkflowEscalations } from './workflow.js';
import { deriveCriterionStates } from './criterion.js';
import { buildDerivedFieldValues, deriveFieldStates } from './fields.js';
import { deriveRecommendationConstraints } from './recommendation.js';
import { deriveSectionStates } from './section-state.js';
import { deriveEvidenceCompleteness } from './evidence.js';

export const PROGRESS_STATES = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  INVALID_ATTENTION: 'invalid_attention',
  SKIPPED: 'skipped',
  BLOCKED_ESCALATED: 'blocked_escalated',
});

const RESOLVED_PROGRESS_STATES = new Set([
  PROGRESS_STATES.COMPLETE,
  PROGRESS_STATES.SKIPPED,
]);

const hasCriterionActivity = (criterionState = EMPTY_OBJECT) => {
  if (!isPlainObject(criterionState)) {
    return false;
  }

  if (
    criterionState.skipState
    && criterionState.skipState !== SKIP_STATES.NOT_STARTED
  ) {
    return true;
  }

  if (
    criterionState.status
    && criterionState.status !== SECTION_STATUS.NOT_STARTED
  ) {
    return true;
  }

  return Object.values(criterionState.values ?? EMPTY_OBJECT).some(hasMeaningfulRawValue);
};

const isResolvedProgressState = (progressState) =>
  RESOLVED_PROGRESS_STATES.has(progressState);

const getCanonicalProgressState = ({
  pageState,
  sectionState,
  applicableRequiredFieldCount,
  satisfiedRequiredFieldCount,
  hasAnyActivity,
  hasInvalidOrAttention,
  hasBlockedOrEscalated,
}) => {
  if (pageState?.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
    return PROGRESS_STATES.SKIPPED;
  }

  if (sectionState?.skipRequested && sectionState?.skipSatisfied) {
    return PROGRESS_STATES.SKIPPED;
  }

  if (hasBlockedOrEscalated) {
    return PROGRESS_STATES.BLOCKED_ESCALATED;
  }

  if (hasInvalidOrAttention) {
    return PROGRESS_STATES.INVALID_ATTENTION;
  }

  const requirementsSatisfied = applicableRequiredFieldCount === 0
    ? hasAnyActivity
    : satisfiedRequiredFieldCount === applicableRequiredFieldCount;

  if (requirementsSatisfied) {
    return PROGRESS_STATES.COMPLETE;
  }

  if (hasAnyActivity || satisfiedRequiredFieldCount > 0) {
    return PROGRESS_STATES.IN_PROGRESS;
  }

  return PROGRESS_STATES.NOT_STARTED;
};

const summarizeProgressEntries = (entries = EMPTY_ARRAY, options = EMPTY_OBJECT) => {
  const allEntries = Array.isArray(entries) ? entries : EMPTY_ARRAY;
  const activeEntries = allEntries.filter((entry) => entry.isAccessible);
  const resolvedActiveEntries = activeEntries.filter((entry) => entry.resolved);
  const completedActiveEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.COMPLETE,
  );
  const skippedEntries = allEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.SKIPPED,
  );
  const workflowSkippedEntries = allEntries.filter((entry) => entry.skippedByWorkflow);
  const userSkippedEntries = allEntries.filter((entry) => entry.userSkipped);
  const notStartedEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.NOT_STARTED,
  );
  const inProgressEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.IN_PROGRESS,
  );
  const invalidAttentionEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.INVALID_ATTENTION,
  );
  const blockedEscalatedEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.BLOCKED_ESCALATED,
  );
  const applicableRequiredFieldCount = activeEntries.reduce(
    (count, entry) => count + entry.applicableRequiredFieldCount,
    0,
  );
  const satisfiedRequiredFieldCount = activeEntries.reduce(
    (count, entry) => count + entry.satisfiedRequiredFieldCount,
    0,
  );
  const missingRequiredFieldCount = activeEntries.reduce(
    (count, entry) => count + entry.missingRequiredFieldCount,
    0,
  );
  const completionPercent = applicableRequiredFieldCount > 0
    ? Math.round((satisfiedRequiredFieldCount / applicableRequiredFieldCount) * 100)
    : activeEntries.length === 0
      ? 100
      : resolvedActiveEntries.length === activeEntries.length
        ? 100
        : 0;
  const unresolvedEscalationCount = Number(options.unresolvedEscalationCount) || 0;

  return {
    totalSectionCount: allEntries.length,
    activeSectionCount: activeEntries.length,
    resolvedActiveSectionCount: resolvedActiveEntries.length,
    completedActiveSectionCount: completedActiveEntries.length,
    skippedSectionCount: skippedEntries.length,
    workflowSkippedSectionCount: workflowSkippedEntries.length,
    userSkippedSectionCount: userSkippedEntries.length,
    notStartedSectionCount: notStartedEntries.length,
    inProgressSectionCount: inProgressEntries.length,
    invalidAttentionSectionCount: invalidAttentionEntries.length,
    blockedEscalatedSectionCount: blockedEscalatedEntries.length,
    unresolvedEscalationCount,
    applicableRequiredFieldCount,
    satisfiedRequiredFieldCount,
    missingRequiredFieldCount,
    completionPercent,
    resolvedActiveSectionIds: resolvedActiveEntries.map((entry) => entry.sectionId),
    completedActiveSectionIds: completedActiveEntries.map((entry) => entry.sectionId),
    skippedSectionIds: skippedEntries.map((entry) => entry.sectionId),
    workflowSkippedSectionIds: workflowSkippedEntries.map((entry) => entry.sectionId),
    userSkippedSectionIds: userSkippedEntries.map((entry) => entry.sectionId),
    notStartedSectionIds: notStartedEntries.map((entry) => entry.sectionId),
    inProgressSectionIds: inProgressEntries.map((entry) => entry.sectionId),
    invalidAttentionSectionIds: invalidAttentionEntries.map((entry) => entry.sectionId),
    blockedEscalatedSectionIds: blockedEscalatedEntries.map((entry) => entry.sectionId),
  };
};

const deriveAggregateProgressState = (entries = EMPTY_ARRAY, options = EMPTY_OBJECT) => {
  const activeEntries = (Array.isArray(entries) ? entries : EMPTY_ARRAY).filter(
    (entry) => entry.isAccessible,
  );
  const unresolvedEscalationCount = Number(options.unresolvedEscalationCount) || 0;

  if (activeEntries.length === 0) {
    return PROGRESS_STATES.SKIPPED;
  }

  if (unresolvedEscalationCount > 0) {
    return PROGRESS_STATES.BLOCKED_ESCALATED;
  }

  if (
    activeEntries.some(
      (entry) => entry.canonicalState === PROGRESS_STATES.BLOCKED_ESCALATED,
    )
  ) {
    return PROGRESS_STATES.BLOCKED_ESCALATED;
  }

  if (
    activeEntries.some(
      (entry) => entry.canonicalState === PROGRESS_STATES.INVALID_ATTENTION,
    )
  ) {
    return PROGRESS_STATES.INVALID_ATTENTION;
  }

  if (
    activeEntries.every(
      (entry) => entry.canonicalState === PROGRESS_STATES.SKIPPED,
    )
  ) {
    return PROGRESS_STATES.SKIPPED;
  }

  if (activeEntries.every((entry) => entry.resolved)) {
    return PROGRESS_STATES.COMPLETE;
  }

  if (
    activeEntries.some(
      (entry) => entry.canonicalState !== PROGRESS_STATES.NOT_STARTED,
    )
  ) {
    return PROGRESS_STATES.IN_PROGRESS;
  }

  return PROGRESS_STATES.NOT_STARTED;
};

export const deriveCompletionChecklist = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const evidenceCompleteness = context.evidenceCompleteness ?? deriveEvidenceCompleteness(state, {
    pageStates,
    criterionStates: criterionStatesBundle,
  });

  const activeCriterionCodes = CRITERIA.filter(
    (criterion) => pageStates.bySectionId[criterion.sectionId].isAccessible,
  ).map((criterion) => criterion.code);

  const repeatedQueryPerformed = getFieldValue(state, FIELD_IDS.S2.REPEATED_QUERY_TEST_PERFORMED);
  const benchmarkPerformed = getFieldValue(state, FIELD_IDS.S2.BENCHMARK_COMPARISON_PERFORMED);

  const items = {
    all_criteria_scored_with_evidence:
      activeCriterionCodes.length > 0 &&
      activeCriterionCodes.every((criterionCode) => criterionStatesBundle.byCode[criterionCode].status === SECTION_STATUS.COMPLETE),
    evidence_bundle_populated:
      evidenceCompleteness.evaluation.complete || evidenceCompleteness.evaluation.itemCount > 0,
    repeated_query_test_complete_or_omission_documented:
      repeatedQueryPerformed === 'yes'
        ? isFieldValuePresent(
            QUESTIONNAIRE_FIELDS_BY_ID[FIELD_IDS.S2.REPEATED_QUERY_TEXT],
            getFieldValue(state, FIELD_IDS.S2.REPEATED_QUERY_TEXT),
          )
        : repeatedQueryPerformed === 'no',
    benchmark_complete_or_omission_documented:
      benchmarkPerformed === 'yes'
        ? isFieldValuePresent(
            QUESTIONNAIRE_FIELDS_BY_ID[FIELD_IDS.S2.BENCHMARK_SOURCES],
            getFieldValue(state, FIELD_IDS.S2.BENCHMARK_SOURCES),
          )
        : benchmarkPerformed === 'no',
    privacy_terms_reviewed: ['SE1', 'SE2'].every(
      (criterionCode) => criterionStatesBundle.byCode[criterionCode]?.status === SECTION_STATUS.COMPLETE,
    ),
    sample_queries_documented: isFieldValuePresent(
      QUESTIONNAIRE_FIELDS_BY_ID[FIELD_IDS.S2.SAMPLE_QUERIES_OR_SCENARIOS],
      getFieldValue(state, FIELD_IDS.S2.SAMPLE_QUERIES_OR_SCENARIOS),
    ),
    all_low_score_blockers_completed: activeCriterionCodes.every((criterionCode) => {
      const criterionState = criterionStatesBundle.byCode[criterionCode];

      if (!criterionState.lowScoreFollowUpRequired) {
        return true;
      }

      return criterionState.logicalMissingFieldIds.includes(
          CRITERION_FIELD_IDS[criterionCode].uncertaintyOrBlockers,
        ) === false
        && criterionState.invalidFieldIds.includes(
          CRITERION_FIELD_IDS[criterionCode].uncertaintyOrBlockers,
        ) === false;
    }),
  };

  const selectedValues = COMPLETION_CHECK_RULES.filter((rule) => items[rule.value]).map((rule) => rule.value);

  return {
    items,
    selectedValues,
    completeCount: selectedValues.length,
    totalCount: COMPLETION_CHECK_RULES.length,
  };
};

export const deriveCompletionProgress = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const derivedFieldValues = context.derivedFieldValues ?? buildDerivedFieldValues(state, {
    ...context,
    pageStates,
    criterionStates: criterionStatesBundle,
  });
  const recommendationConstraints = context.recommendationConstraints ?? deriveRecommendationConstraints(state, {
    ...context,
    pageStates,
    derivedFieldValues,
  });
  const fieldStatesBundle = context.fieldStates ?? deriveFieldStates(state, {
    ...context,
    pageStates,
    criterionStates: criterionStatesBundle,
    derivedFieldValues,
    recommendationConstraints,
  });
  const sectionStates = context.sectionStates ?? deriveSectionStates(state, {
    ...context,
    pageStates,
    fieldStates: fieldStatesBundle,
    criterionStates: criterionStatesBundle,
    recommendationConstraints,
  });
  const workflowEscalations = context.workflowEscalations ?? deriveWorkflowEscalations(state, {
    ...context,
    pageStates,
    derivedFieldValues,
  });
  const escalationReasonsBySectionId = workflowEscalations.unresolvedReasons.reduce((lookup, reason) => {
    const sectionReasons = lookup[reason.requiresSectionId] ?? [];
    sectionReasons.push(reason);
    lookup[reason.requiresSectionId] = sectionReasons;
    return lookup;
  }, {});
  const bySectionId = {};

  for (const sectionId of CANONICAL_PAGE_SEQUENCE) {
    const pageState = pageStates.bySectionId[sectionId] ?? EMPTY_OBJECT;
    const sectionState = sectionStates.bySectionId[sectionId] ?? EMPTY_OBJECT;
    const sectionDefinition = SECTION_REGISTRY_BY_ID[sectionId] ?? EMPTY_OBJECT;
    const fieldStates = fieldStatesBundle.bySectionId[sectionId] ?? EMPTY_ARRAY;
    const criterionStates = criterionStatesBundle.bySectionId[sectionId] ?? EMPTY_ARRAY;
    const applicableRequiredFieldStates = fieldStates.filter((fieldState) => fieldState.logicallyRequired);
    const satisfiedRequiredFieldStates = applicableRequiredFieldStates.filter(
      (fieldState) => fieldState.answered && !fieldState.invalid && !fieldState.blocked,
    );
    const missingRequiredFieldStates = applicableRequiredFieldStates.filter(
      (fieldState) => !fieldState.answered || fieldState.invalid || fieldState.blocked,
    );
    const attentionFieldStates = fieldStates.filter((fieldState) => fieldState.attention);
    const invalidFieldStates = fieldStates.filter((fieldState) => fieldState.invalid);
    const blockedFieldStates = fieldStates.filter((fieldState) => fieldState.blocked);
    const answeredVisibleFieldStates = fieldStates.filter(
      (fieldState) => fieldState.visible && fieldState.answered,
    );
    const criterionActivityCount = criterionStates.filter(hasCriterionActivity).length;
    const resolvedCriterionCount = criterionStates.filter((criterionState) =>
      criterionState.status === SECTION_STATUS.COMPLETE
      || criterionState.status === SECTION_STATUS.SKIPPED).length;
    const escalationReasons = escalationReasonsBySectionId[sectionId] ?? EMPTY_ARRAY;
    const skippedByWorkflow = pageState.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED;
    const userSkipped = Boolean(sectionState.skipRequested && sectionState.skipSatisfied);
    const hasInvalidOrAttention = Boolean(
      sectionState.attention
      || sectionState.invalid
      || attentionFieldStates.length > 0
      || invalidFieldStates.length > 0
      || criterionStates.some((criterionState) => criterionState.attention || criterionState.invalid),
    );
    const hasBlockedOrEscalated = Boolean(
      sectionState.blocked
      || blockedFieldStates.length > 0
      || criterionStates.some((criterionState) => criterionState.blocked)
      || escalationReasons.length > 0,
    );
    const hasAnyActivity = Boolean(
      sectionState.skipRequested
      || answeredVisibleFieldStates.length > 0
      || criterionActivityCount > 0,
    );
    const canonicalState = getCanonicalProgressState({
      pageState,
      sectionState,
      applicableRequiredFieldCount: applicableRequiredFieldStates.length,
      satisfiedRequiredFieldCount: satisfiedRequiredFieldStates.length,
      hasAnyActivity,
      hasInvalidOrAttention,
      hasBlockedOrEscalated,
    });
    const completionPercent = canonicalState === PROGRESS_STATES.SKIPPED
      ? 100
      : applicableRequiredFieldStates.length > 0
        ? Math.round(
            (satisfiedRequiredFieldStates.length / applicableRequiredFieldStates.length) * 100,
          )
        : canonicalState === PROGRESS_STATES.COMPLETE
          ? 100
          : 0;

    bySectionId[sectionId] = {
      sectionId,
      pageCode: sectionDefinition.pageCode ?? sectionId,
      completionGroupId: sectionDefinition.completionGroupId ?? null,
      workflowState: pageState.workflowState ?? null,
      isAccessible: pageState.isAccessible !== false,
      isEditable: pageState.isEditable === true,
      canonicalState,
      resolved: isResolvedProgressState(canonicalState),
      sectionStatus: sectionState.status ?? SECTION_STATUS.NOT_STARTED,
      validationState: sectionState.validationState ?? VALIDATION_STATES.CLEAR,
      applicableRequiredFieldCount: applicableRequiredFieldStates.length,
      satisfiedRequiredFieldCount: satisfiedRequiredFieldStates.length,
      missingRequiredFieldCount: missingRequiredFieldStates.length,
      answeredVisibleFieldCount: answeredVisibleFieldStates.length,
      visibleFieldCount: fieldStates.filter((fieldState) => fieldState.visible).length,
      criterionCount: criterionStates.length,
      criterionActivityCount,
      resolvedCriterionCount,
      attentionFieldCount: attentionFieldStates.length,
      invalidFieldCount: invalidFieldStates.length,
      blockedFieldCount: blockedFieldStates.length,
      completionPercent,
      skippedByWorkflow,
      userSkipped,
      skipSatisfied: sectionState.skipSatisfied === true,
      hasAnyActivity,
      escalationReasons,
      attentionFieldIds: attentionFieldStates.map((fieldState) => fieldState.fieldId),
      invalidFieldIds: invalidFieldStates.map((fieldState) => fieldState.fieldId),
      blockedFieldIds: blockedFieldStates.map((fieldState) => fieldState.fieldId),
    };
  }

  const byCompletionGroupId = Object.fromEntries(
    COMPLETION_GROUPS.map((group) => {
      const entries = group.sectionIds.map((sectionId) => bySectionId[sectionId]).filter(Boolean);
      const unresolvedEscalationReasons = workflowEscalations.unresolvedReasons.filter((reason) =>
        group.sectionIds.includes(reason.requiresSectionId));
      const counts = summarizeProgressEntries(entries, {
        unresolvedEscalationCount: unresolvedEscalationReasons.length,
      });

      return [
        group.id,
        {
          groupId: group.id,
          label: group.label,
          sectionIds: group.sectionIds,
          canonicalState: deriveAggregateProgressState(entries, {
            unresolvedEscalationCount: unresolvedEscalationReasons.length,
          }),
          unresolvedEscalationCount: unresolvedEscalationReasons.length,
          unresolvedEscalationReasons,
          ...counts,
        },
      ];
    }),
  );

  const overallEscalationCount = workflowEscalations.unresolvedReasons.length;
  const overallEntries = CANONICAL_PAGE_SEQUENCE.map((sectionId) => bySectionId[sectionId]);
  const overallCounts = summarizeProgressEntries(overallEntries, {
    unresolvedEscalationCount: overallEscalationCount,
  });
  const overallCanonicalState = deriveAggregateProgressState(
    overallEntries,
    {
      unresolvedEscalationCount: overallEscalationCount,
    },
  );

  return {
    bySectionId,
    byCompletionGroupId,
    overall: {
      canonicalState: overallCanonicalState,
      orderedSectionIds: CANONICAL_PAGE_SEQUENCE,
      unresolvedEscalationCount: overallEscalationCount,
      unresolvedEscalationReasons: workflowEscalations.unresolvedReasons,
      ...overallCounts,
    },
  };
};

export const deriveOverallCompletion = (evaluation, context = EMPTY_OBJECT) => {
  const completionProgress = context.completionProgress ?? deriveCompletionProgress(evaluation, context);
  const overall = completionProgress.overall;

  return {
    status: overall.canonicalState,
    completedSectionCount: overall.resolvedActiveSectionCount,
    totalSectionCount: overall.activeSectionCount,
    completedSectionIds: overall.resolvedActiveSectionIds,
    blockedSectionIds: overall.blockedEscalatedSectionIds,
    applicableRequiredFieldCount: overall.applicableRequiredFieldCount,
    satisfiedRequiredFieldCount: overall.satisfiedRequiredFieldCount,
    missingRequiredFieldCount: overall.missingRequiredFieldCount,
    completionPercent: overall.completionPercent,
  };
};
