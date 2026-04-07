import { getSectionDefinition } from '../config/sections.js';
import { PROGRESS_STATES, deriveQuestionnaireState } from '../state/derive.js';
import { buildReviewWorkspacePath, resolveDefaultWorkspacePageId } from '../shell/routes.js';

const PROGRESS_STATE_LABELS = Object.freeze({
  [PROGRESS_STATES.NOT_STARTED]: 'Not started',
  [PROGRESS_STATES.IN_PROGRESS]: 'In progress',
  [PROGRESS_STATES.COMPLETE]: 'Complete',
  [PROGRESS_STATES.INVALID_ATTENTION]: 'Needs attention',
  [PROGRESS_STATES.SKIPPED]: 'Skipped',
  [PROGRESS_STATES.BLOCKED_ESCALATED]: 'Blocked / escalated',
});

const formatDateTime = (value, timeZone = 'UTC') => {
  const timestamp = Date.parse(value ?? '');

  if (!Number.isFinite(timestamp)) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(timestamp);
};

const formatProgressState = (value) => PROGRESS_STATE_LABELS[value] ?? 'Unknown';

const buildSectionJump = ({ reviewId, pageId, sectionProgress, pageState }) => {
  const sectionDefinition = getSectionDefinition(pageId);

  return {
    pageId,
    pageCode: sectionDefinition?.pageCode ?? pageId,
    title: sectionDefinition?.title ?? pageId,
    path: buildReviewWorkspacePath(reviewId, pageId),
    progressState: sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED,
    progressLabel: formatProgressState(sectionProgress?.canonicalState),
    requirementsLabel:
      (sectionProgress?.applicableRequiredFieldCount ?? 0) > 0
        ? `${sectionProgress?.satisfiedRequiredFieldCount ?? 0}/${sectionProgress?.applicableRequiredFieldCount ?? 0}`
        : sectionProgress?.resolved
          ? 'Resolved'
          : sectionProgress?.hasAnyActivity
            ? 'Activity'
            : '—',
    resolved: Boolean(sectionProgress?.resolved),
    attention:
      sectionProgress?.canonicalState === PROGRESS_STATES.INVALID_ATTENTION ||
      sectionProgress?.canonicalState === PROGRESS_STATES.BLOCKED_ESCALATED,
    accessible: Boolean(pageState?.isAccessible),
  };
};

export const createReviewOverviewViewModel = ({ review, preferredTimeZone = 'UTC' } = {}) => {
  const derived = deriveQuestionnaireState(review?.currentState ?? {}, {
    workflowAuthority: review?.workflowAuthority ?? {},
  });
  const accessibleSectionIds = derived.pageStates?.accessibleSectionIds ?? [];
  const sectionJumps = accessibleSectionIds.map((pageId) =>
    buildSectionJump({
      reviewId: review.id,
      pageId,
      sectionProgress: derived.completionProgress?.bySectionId?.[pageId] ?? null,
      pageState: derived.pageStates?.bySectionId?.[pageId] ?? null,
    }),
  );

  const firstAttentionJump = sectionJumps.find((entry) => entry.attention) ?? null;
  const firstIncompleteJump = sectionJumps.find((entry) => !entry.resolved) ?? null;
  const defaultPageId = resolveDefaultWorkspacePageId(review.workflowMode);
  const resumeJump = firstAttentionJump ??
    firstIncompleteJump ??
    sectionJumps.find((entry) => entry.pageId === defaultPageId) ??
    sectionJumps[0] ?? {
      pageId: defaultPageId,
      pageCode: getSectionDefinition(defaultPageId)?.pageCode ?? defaultPageId,
      title: getSectionDefinition(defaultPageId)?.title ?? defaultPageId,
      path: buildReviewWorkspacePath(review.id, defaultPageId),
      progressState: PROGRESS_STATES.NOT_STARTED,
      progressLabel: formatProgressState(PROGRESS_STATES.NOT_STARTED),
      requirementsLabel: '—',
      resolved: false,
      attention: false,
      accessible: true,
    };

  const evaluationEvidence = derived.evidenceCompleteness?.evaluation ?? {
    itemCount: 0,
    complete: false,
    hasFolderLink: false,
  };
  const criterionEvidenceEntries = Object.values(derived.evidenceCompleteness?.criteria ?? {});
  const totalEvidenceItemCount =
    evaluationEvidence.itemCount +
    criterionEvidenceEntries.reduce((count, entry) => count + (entry.itemCount ?? 0), 0);
  const criteriaWithEvidenceCount = criterionEvidenceEntries.filter(
    (entry) => (entry.itemCount ?? 0) > 0,
  ).length;
  const criteriaEvidenceCompleteCount = criterionEvidenceEntries.filter(
    (entry) => entry.complete,
  ).length;
  const overallProgress = derived.completionProgress?.overall ?? null;
  const recommendation = derived.recommendationConstraints ?? null;
  const workflowEscalations = derived.workflowEscalations ?? null;

  return {
    review,
    resumeJump,
    firstAttentionJump,
    firstIncompleteJump,
    saveSummary: {
      updatedAt: formatDateTime(review.updatedAt || review.createdAt, preferredTimeZone),
      createdAt: formatDateTime(review.createdAt, preferredTimeZone),
      revisionNumber: review.currentRevisionNumber,
      stateSchemaVersion: review.stateSchemaVersion,
      frameworkVersion: review.frameworkVersion,
      timeZone: preferredTimeZone,
    },
    progressSummary: {
      canonicalState: overallProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED,
      stateLabel: formatProgressState(overallProgress?.canonicalState),
      completionPercent: overallProgress?.completionPercent ?? 0,
      activeSectionCount: overallProgress?.activeSectionCount ?? 0,
      resolvedActiveSectionCount: overallProgress?.resolvedActiveSectionCount ?? 0,
      invalidAttentionSectionCount: overallProgress?.invalidAttentionSectionCount ?? 0,
      blockedEscalatedSectionCount: overallProgress?.blockedEscalatedSectionCount ?? 0,
      unresolvedEscalationCount: overallProgress?.unresolvedEscalationCount ?? 0,
      applicableRequiredFieldCount: overallProgress?.applicableRequiredFieldCount ?? 0,
      satisfiedRequiredFieldCount: overallProgress?.satisfiedRequiredFieldCount ?? 0,
    },
    evidenceSummary: {
      totalEvidenceItemCount,
      evaluationItemCount: evaluationEvidence.itemCount ?? 0,
      evaluationFolderLinked: Boolean(evaluationEvidence.hasFolderLink),
      evaluationEvidenceReady: Boolean(evaluationEvidence.complete),
      criteriaWithEvidenceCount,
      criteriaEvidenceCompleteCount,
      criteriaCount: criterionEvidenceEntries.length,
    },
    recommendationSummary: {
      selectedValue: recommendation?.selectedValue ?? 'Not recorded',
      positiveRecommendationLocked: Boolean(recommendation?.positiveRecommendationLocked),
      unresolvedEscalationCount: workflowEscalations?.unresolvedRuleIds?.length ?? 0,
    },
    sectionJumps,
  };
};
