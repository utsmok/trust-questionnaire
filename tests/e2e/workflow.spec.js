import { expect, test } from '@playwright/test';

import {
  applyWorkflowTransitionViaApi,
  createReviewViaApi,
  getSessionStateViaApi,
  gotoDashboard,
  loginAsDevUser,
  logoutDevUser,
  updateAssignmentsViaApi,
  updateReviewStateViaApi,
} from './helpers.js';

const cloneState = (value) => JSON.parse(JSON.stringify(value));

test('workflow lifecycle surfaces explicit authority and restricts editing to the active governance owner', async ({
  page,
  browserName,
}) => {
  const title = `Workflow lifecycle review ${browserName}`;

  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');
  const primarySession = await getSessionStateViaApi(page);

  const created = await createReviewViaApi(page, {
    titleSnapshot: title,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's0.submissionType': 'nomination',
        's0.toolName': 'Workflow lifecycle tool',
        's1.vendor': 'Nomination vendor',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });
  const reviewId = created.review.id;

  const nominationSubmitted = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    created.review.etag,
    'submit_nomination',
  );

  expect(nominationSubmitted.review).toMatchObject({
    workflowMode: 'nomination',
    lifecycleState: 'nomination_submitted',
  });

  await logoutDevUser(page);
  await loginAsDevUser(page, 'reviewer-secondary');
  const secondarySession = await getSessionStateViaApi(page);

  await logoutDevUser(page);
  await loginAsDevUser(page, 'decision-owner');
  const decisionSession = await getSessionStateViaApi(page);

  await logoutDevUser(page);
  await loginAsDevUser(page, 'coordinator');

  const assigned = await updateAssignmentsViaApi(page, reviewId, {
    primaryEvaluatorUserId: primarySession.user.id,
    secondReviewerUserId: secondarySession.user.id,
    decisionOwnerUserId: decisionSession.user.id,
  });

  expect(assigned.review.assignment).toMatchObject({
    primaryEvaluatorUserId: primarySession.user.id,
    secondReviewerUserId: secondarySession.user.id,
    decisionOwnerUserId: decisionSession.user.id,
  });

  const primaryAssigned = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    nominationSubmitted.review.etag,
    'assign_primary',
  );

  expect(primaryAssigned.review).toMatchObject({
    workflowMode: 'primary_evaluation',
    lifecycleState: 'primary_assigned',
  });

  await logoutDevUser(page);
  await loginAsDevUser(page, 'reviewer-primary');

  const primaryStarted = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    primaryAssigned.review.etag,
    'start_primary_review',
  );

  expect(primaryStarted.review.workflowAuthority.editableSectionIds).toEqual(
    expect.arrayContaining(['S0', 'S1', 'S10A']),
  );

  await page.goto(`/reviews/${reviewId}/workspace/workflow-control`);
  await expect(page.locator('#reviewShellMount')).toBeVisible();
  await expect(page.locator('#reviewShellMount')).toContainText('Editable now');
  await expect(page.locator('#reviewShellMount')).toContainText('Actor');
  await expect(page.locator('#questionnaireRenderRoot')).toHaveAttribute(
    'data-rendered-source',
    'schema',
  );
  await expect(page.locator('select[data-field-id="s0.submissionType"]')).toBeDisabled();

  await page.goto(`/reviews/${reviewId}/workspace/tool-profile`);
  await expect(page.locator('input[data-field-id="s1.vendor"]')).toBeEditable();

  const primaryHandoffState = cloneState(primaryStarted.review.currentState);
  primaryHandoffState.fields['s10a.primaryEvaluator'] = 'Primary Reviewer';
  primaryHandoffState.fields['s10a.dateSubmittedForReview'] = '2026-04-06';
  primaryHandoffState.fields['s10a.keyConcernsForSecondReviewer'] =
    'Focus on traceability, scope limits, and reliability claims.';
  primaryHandoffState.fields['s10a.areasOfUncertainty'] =
    'Cross-check documentation completeness and auditability.';

  const savedHandoff = await updateReviewStateViaApi(
    page,
    reviewId,
    primaryStarted.review.etag,
    primaryHandoffState,
  );

  expect(savedHandoff.review.currentState.fields['s10a.primaryEvaluator']).toBe('Primary Reviewer');

  const handoffReady = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    savedHandoff.review.etag,
    'submit_primary_handoff',
  );

  expect(handoffReady.review).toMatchObject({
    workflowMode: 'primary_evaluation',
    lifecycleState: 'primary_handoff_ready',
  });

  await logoutDevUser(page);
  await loginAsDevUser(page, 'coordinator');

  const secondAssigned = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    handoffReady.review.etag,
    'assign_second_review',
  );

  expect(secondAssigned.review).toMatchObject({
    workflowMode: 'second_review',
    lifecycleState: 'second_review_assigned',
  });

  await logoutDevUser(page);
  await loginAsDevUser(page, 'reviewer-secondary');

  const secondStarted = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    secondAssigned.review.etag,
    'start_second_review',
  );

  await page.goto(`/reviews/${reviewId}/workspace/second-review`);
  await expect(page.locator('#reviewShellMount')).toContainText('Assignments');
  await expect(page.locator('#reviewShellMount')).toContainText('Editable now');
  await expect(page.locator('input[data-field-id="s10b.secondReviewer"]')).toBeEditable();

  await page.goto(`/reviews/${reviewId}/workspace/tool-profile`);
  await expect(page.locator('input[data-field-id="s1.vendor"]')).not.toBeEditable();

  const secondReviewState = cloneState(secondStarted.review.currentState);
  secondReviewState.fields['s10b.secondReviewer'] = 'Second Reviewer';
  secondReviewState.fields['s10b.dateOfSecondReview'] = '2026-04-07';
  secondReviewState.fields['s10b.agreementWithPrimaryEvaluation'] = 'partial_agreement';
  secondReviewState.fields['s10b.criteriaToRevisit'] = 'TC1';
  secondReviewState.fields['s10b.secondReviewerRecommendation'] = 'recommended_with_caveats';

  const savedSecondReview = await updateReviewStateViaApi(
    page,
    reviewId,
    secondStarted.review.etag,
    secondReviewState,
  );

  expect(savedSecondReview.review.currentState.fields['s10b.secondReviewer']).toBe('Second Reviewer');

  const decisionPending = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    savedSecondReview.review.etag,
    'submit_second_review',
  );

  expect(decisionPending.review).toMatchObject({
    workflowMode: 'final_team_decision',
    lifecycleState: 'decision_pending',
  });

  await logoutDevUser(page);
  await loginAsDevUser(page, 'decision-owner');

  await page.goto(`/reviews/${reviewId}/workspace/final-team-decision`);
  await expect(page.locator('#reviewShellMount')).toContainText('decision_pending');
  await expect(page.locator('select[data-field-id="s10c.finalStatus"]')).not.toBeDisabled();

  await page.goto(`/reviews/${reviewId}/workspace/second-review`);
  await expect(
    page.locator('select[data-field-id="s10b.agreementWithPrimaryEvaluation"]'),
  ).toBeDisabled();

  const finalDecisionState = cloneState(decisionPending.review.currentState);
  finalDecisionState.fields['s10c.decisionMeetingDate'] = '2026-04-08';
  finalDecisionState.fields['s10c.meetingParticipants'] = 'Decision Owner, Coordinator';
  finalDecisionState.fields['s10c.finalStatus'] = 'approved_with_conditions';
  finalDecisionState.fields['s10c.finalStatusRationale'] =
    'Approve with explicit monitoring for traceability follow-up.';
  finalDecisionState.fields['s10c.publicationStatus'] = 'published_internally';
  finalDecisionState.fields['s10c.reviewCycleFrequency'] = '12_months';

  const savedDecision = await updateReviewStateViaApi(
    page,
    reviewId,
    decisionPending.review.etag,
    finalDecisionState,
  );

  expect(savedDecision.review.currentState.fields['s10c.finalStatus']).toBe(
    'approved_with_conditions',
  );

  const reopened = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    savedDecision.review.etag,
    'request_primary_rework_from_decision',
    'Need primary reviewer follow-up on traceability.',
  );

  expect(reopened.review).toMatchObject({
    workflowMode: 'primary_evaluation',
    lifecycleState: 'primary_in_progress',
  });

  await logoutDevUser(page);
  await loginAsDevUser(page, 'reviewer-primary');

  await page.goto(`/reviews/${reviewId}/workspace/tool-profile`);
  await expect(page.locator('#reviewShellMount')).toContainText('primary_in_progress');
  await expect(page.locator('input[data-field-id="s1.vendor"]')).toBeEditable();
});
