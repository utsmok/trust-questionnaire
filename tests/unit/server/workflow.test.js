import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../server/app.js';

let app = null;

const getSessionCookie = (response) => {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header[0].split(';')[0] : header.split(';')[0];
};

const loginAs = async (username) => {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { username },
  });
  const cookie = getSessionCookie(response);

  const meResponse = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: { cookie },
  });

  return {
    response,
    cookie,
    csrfToken: response.json().csrfToken,
    session: meResponse.json(),
  };
};

const createNominationState = (overrides = {}) => ({
  workflow: { mode: 'nomination' },
  fields: {
    's0.submissionType': 'nomination',
    's0.toolName': 'Workflow test tool',
    ...overrides.fields,
  },
  sections: overrides.sections ?? {},
  criteria: overrides.criteria ?? {},
  evidence: overrides.evidence ?? { evaluation: [], criteria: {} },
  overrides: overrides.overrides ?? { principleJudgments: {} },
});

const createReview = async (session, payload = {}) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/evaluations',
    headers: {
      cookie: session.cookie,
      'x-csrf-token': session.csrfToken,
    },
    payload: {
      titleSnapshot: 'Workflow review',
      currentState: createNominationState(),
      ...payload,
    },
  });

  return response.json().review;
};

const updateAssignments = async (session, reviewId, assignments) => {
  const response = await app.inject({
    method: 'POST',
    url: `/api/evaluations/${reviewId}/assignments`,
    headers: {
      cookie: session.cookie,
      'x-csrf-token': session.csrfToken,
    },
    payload: { assignments },
  });

  return { response, body: response.json() };
};

const applyTransition = async (session, reviewId, etag, transitionId, reason = '') => {
  const response = await app.inject({
    method: 'POST',
    url: `/api/evaluations/${reviewId}/transitions`,
    headers: {
      cookie: session.cookie,
      'x-csrf-token': session.csrfToken,
      'if-match': etag,
    },
    payload: {
      transitionId,
      ...(reason ? { reason } : {}),
    },
  });

  return { response, body: response.json() };
};

const saveReviewState = async (session, reviewId, etag, currentState) => {
  const response = await app.inject({
    method: 'PUT',
    url: `/api/evaluations/${reviewId}/state`,
    headers: {
      cookie: session.cookie,
      'x-csrf-token': session.csrfToken,
      'if-match': etag,
    },
    payload: {
      currentState,
      saveReason: 'manual_save',
    },
  });

  return { response, body: response.json() };
};

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe('workflow routes and permissions', () => {
  it('assigns actors, transitions into primary review, and blocks locked workflow-field edits', async () => {
    app = await createApp();

    const primary = await loginAs('reviewer-primary');
    const secondary = await loginAs('reviewer-secondary');
    const decisionOwner = await loginAs('decision-owner');
    const coordinator = await loginAs('coordinator');

    const createdReview = await createReview(primary);
    const reviewId = createdReview.id;

    const nominationSubmitted = await applyTransition(
      primary,
      reviewId,
      createdReview.etag,
      'submit_nomination',
    );

    expect(nominationSubmitted.response.statusCode).toBe(200);
    expect(nominationSubmitted.body.review).toMatchObject({
      workflowMode: 'nomination',
      lifecycleState: 'nomination_submitted',
    });

    const assigned = await updateAssignments(coordinator, reviewId, {
      primaryEvaluatorUserId: primary.session.user.id,
      secondReviewerUserId: secondary.session.user.id,
      decisionOwnerUserId: decisionOwner.session.user.id,
    });

    expect(assigned.response.statusCode).toBe(200);
    expect(assigned.body.review.assignment).toMatchObject({
      primaryEvaluatorUserId: primary.session.user.id,
      secondReviewerUserId: secondary.session.user.id,
      decisionOwnerUserId: decisionOwner.session.user.id,
    });

    const primaryAssigned = await applyTransition(
      coordinator,
      reviewId,
      nominationSubmitted.body.review.etag,
      'assign_primary',
    );

    expect(primaryAssigned.response.statusCode).toBe(200);
    expect(primaryAssigned.body.review).toMatchObject({
      workflowMode: 'primary_evaluation',
      lifecycleState: 'primary_assigned',
    });

    const primaryStarted = await applyTransition(
      primary,
      reviewId,
      primaryAssigned.body.review.etag,
      'start_primary_review',
    );

    expect(primaryStarted.response.statusCode).toBe(200);
    expect(primaryStarted.body.review.workflowAuthority).toMatchObject({
      editableSectionIds: expect.arrayContaining(['S0', 'S1', 'S10A']),
      lockedFieldIds: expect.arrayContaining(['s0.submissionType']),
      currentUser: {
        assignmentRoles: expect.arrayContaining(['nominator', 'primary_evaluator']),
      },
    });

    const lockedFieldState = {
      ...primaryStarted.body.review.currentState,
      fields: {
        ...primaryStarted.body.review.currentState.fields,
        's0.submissionType': 'second_review',
      },
    };
    const lockedFieldSave = await saveReviewState(
      primary,
      reviewId,
      primaryStarted.body.review.etag,
      lockedFieldState,
    );

    expect(lockedFieldSave.response.statusCode).toBe(403);
    expect(lockedFieldSave.body.lockedFieldIds).toContain('s0.submissionType');

    const handoffState = {
      ...primaryStarted.body.review.currentState,
      fields: {
        ...primaryStarted.body.review.currentState.fields,
        's10a.primaryEvaluator': 'Primary Reviewer',
        's10a.dateSubmittedForReview': '2026-04-06',
        's10a.keyConcernsForSecondReviewer': 'Focus on traceability and documentation gaps.',
        's10a.areasOfUncertainty': 'Re-check transparency and scope boundaries.',
      },
    };
    const savedHandoff = await saveReviewState(
      primary,
      reviewId,
      primaryStarted.body.review.etag,
      handoffState,
    );

    expect(savedHandoff.response.statusCode).toBe(200);

    const handoffSubmitted = await applyTransition(
      primary,
      reviewId,
      savedHandoff.body.review.etag,
      'submit_primary_handoff',
    );

    expect(handoffSubmitted.response.statusCode).toBe(200);
    expect(handoffSubmitted.body.review).toMatchObject({
      workflowMode: 'primary_evaluation',
      lifecycleState: 'primary_handoff_ready',
    });

    const blockedPrimaryEditState = {
      ...handoffSubmitted.body.review.currentState,
      fields: {
        ...handoffSubmitted.body.review.currentState.fields,
        's1.vendor': 'Blocked vendor edit',
      },
    };
    const blockedPrimaryEdit = await saveReviewState(
      primary,
      reviewId,
      handoffSubmitted.body.review.etag,
      blockedPrimaryEditState,
    );

    expect(blockedPrimaryEdit.response.statusCode).toBe(403);
    expect(blockedPrimaryEdit.body.blockedSectionIds).toContain('S1');
  });

  it('enforces second-review ownership and allows decision-stage reopen back to primary', async () => {
    app = await createApp();

    const primary = await loginAs('reviewer-primary');
    const secondary = await loginAs('reviewer-secondary');
    const decisionOwner = await loginAs('decision-owner');
    const coordinator = await loginAs('coordinator');

    const createdReview = await createReview(primary);
    const reviewId = createdReview.id;

    const nominationSubmitted = await applyTransition(
      primary,
      reviewId,
      createdReview.etag,
      'submit_nomination',
    );

    expect(nominationSubmitted.response.statusCode).toBe(200);

    const assigned = await updateAssignments(coordinator, reviewId, {
      primaryEvaluatorUserId: primary.session.user.id,
      secondReviewerUserId: secondary.session.user.id,
      decisionOwnerUserId: decisionOwner.session.user.id,
    });
    const primaryAssigned = await applyTransition(
      coordinator,
      reviewId,
      nominationSubmitted.body.review.etag,
      'assign_primary',
    );
    const primaryStarted = await applyTransition(
      primary,
      reviewId,
      primaryAssigned.body.review.etag,
      'start_primary_review',
    );
    const handoffState = {
      ...primaryStarted.body.review.currentState,
      fields: {
        ...primaryStarted.body.review.currentState.fields,
        's10a.primaryEvaluator': 'Primary Reviewer',
        's10a.dateSubmittedForReview': '2026-04-06',
        's10a.keyConcernsForSecondReviewer': 'Focus on reliability.',
        's10a.areasOfUncertainty': 'Check consistency.',
      },
    };
    const savedHandoff = await saveReviewState(
      primary,
      reviewId,
      primaryStarted.body.review.etag,
      handoffState,
    );
    const handoffSubmitted = await applyTransition(
      primary,
      reviewId,
      savedHandoff.body.review.etag,
      'submit_primary_handoff',
    );
    const secondAssigned = await applyTransition(
      coordinator,
      reviewId,
      handoffSubmitted.body.review.etag,
      'assign_second_review',
    );
    const secondStarted = await applyTransition(
      secondary,
      reviewId,
      secondAssigned.body.review.etag,
      'start_second_review',
    );

    const blockedPrimaryWriteState = {
      ...secondStarted.body.review.currentState,
      fields: {
        ...secondStarted.body.review.currentState.fields,
        's1.vendor': 'Unauthorized second-review overwrite',
      },
    };
    const blockedPrimaryWrite = await saveReviewState(
      secondary,
      reviewId,
      secondStarted.body.review.etag,
      blockedPrimaryWriteState,
    );

    expect(blockedPrimaryWrite.response.statusCode).toBe(403);
    expect(blockedPrimaryWrite.body.blockedSectionIds).toContain('S1');

    const secondReviewState = {
      ...secondStarted.body.review.currentState,
      fields: {
        ...secondStarted.body.review.currentState.fields,
        's10b.secondReviewer': 'Second Reviewer',
        's10b.dateOfSecondReview': '2026-04-07',
        's10b.agreementWithPrimaryEvaluation': 'partial_agreement',
        's10b.criteriaToRevisit': 'TC1',
        's10b.secondReviewerRecommendation': 'recommended_with_caveats',
      },
    };
    const savedSecondReview = await saveReviewState(
      secondary,
      reviewId,
      secondStarted.body.review.etag,
      secondReviewState,
    );

    expect(savedSecondReview.response.statusCode).toBe(200);

    const decisionPending = await applyTransition(
      secondary,
      reviewId,
      savedSecondReview.body.review.etag,
      'submit_second_review',
    );

    expect(decisionPending.response.statusCode).toBe(200);
    expect(decisionPending.body.review).toMatchObject({
      workflowMode: 'final_team_decision',
      lifecycleState: 'decision_pending',
    });

    const finalDecisionState = {
      ...decisionPending.body.review.currentState,
      fields: {
        ...decisionPending.body.review.currentState.fields,
        's10c.decisionMeetingDate': '2026-04-08',
        's10c.meetingParticipants': 'Decision Owner, Coordinator',
        's10c.finalStatus': 'approved_with_conditions',
        's10c.finalStatusRationale': 'Proceed with monitored follow-up on traceability.',
        's10c.publicationStatus': 'published_internally',
        's10c.reviewCycleFrequency': '12_months',
      },
    };
    const savedDecision = await saveReviewState(
      decisionOwner,
      reviewId,
      decisionPending.body.review.etag,
      finalDecisionState,
    );

    expect(savedDecision.response.statusCode).toBe(200);

    const reopened = await applyTransition(
      decisionOwner,
      reviewId,
      savedDecision.body.review.etag,
      'request_primary_rework_from_decision',
    );

    expect(reopened.response.statusCode).toBe(200);
    expect(reopened.body.review).toMatchObject({
      workflowMode: 'primary_evaluation',
      lifecycleState: 'primary_in_progress',
    });
  });
});
