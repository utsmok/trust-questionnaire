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

  return {
    response,
    csrfToken: response.json().csrfToken,
    cookie: getSessionCookie(response),
  };
};

const createReview = async ({ cookie, csrfToken }, titleSnapshot = 'Tooling-linked review') =>
  app.inject({
    method: 'POST',
    url: '/api/evaluations',
    headers: {
      cookie,
      'x-csrf-token': csrfToken,
    },
    payload: {
      titleSnapshot,
      currentState: {
        workflow: { mode: 'nomination' },
        fields: {},
        sections: {},
        criteria: {},
        evidence: { evaluation: [], criteria: {} },
        overrides: { principleJudgments: {} },
      },
    },
  });

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe('tooling routes', () => {
  it('creates, edits, publishes, forks, archives, and links published revisions to reviews', async () => {
    app = await createApp();
    const session = await loginAs('coordinator');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/test-sets',
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
      payload: {
        title: 'Library benchmark set',
        description: 'Reusable checks for academic search tools.',
        purpose: 'Baseline repeatable scenarios',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().testSet).toMatchObject({
      title: 'Library benchmark set',
      status: 'draft',
      currentDraftRevision: {
        versionNumber: 1,
      },
    });

    const createdTestSet = createResponse.json().testSet;

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/test-sets/${createdTestSet.id}`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
      payload: {
        title: 'Library benchmark set',
        description: 'Reusable checks for academic search tools.',
        purpose: 'Baseline repeatable scenarios',
        visibility: 'team',
        changeSummary: 'Added one reproducible benchmark case.',
        cases: [
          {
            title: 'Known-item discovery',
            scenarioType: 'known_item',
            instructionText: 'Search for a known institutional repository article.',
            criterionCode: 'TR1',
            evidenceType: 'screenshot',
            expectedObservationType: 'Result ranking and provenance.',
            notes: 'Use an openly accessible record.',
          },
        ],
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().testSet.currentDraftRevision).toMatchObject({
      caseCount: 1,
      changeSummary: 'Added one reproducible benchmark case.',
      cases: [
        {
          title: 'Known-item discovery',
          criterionCode: 'TR1',
        },
      ],
    });

    const draftRevisionId = updateResponse.json().testSet.currentDraftRevision.id;
    const publishResponse = await app.inject({
      method: 'POST',
      url: `/api/test-set-revisions/${draftRevisionId}/publish`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
    });

    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.json().testSet).toMatchObject({
      status: 'published',
      latestPublishedRevision: {
        id: draftRevisionId,
        versionNumber: 1,
      },
      currentDraftRevision: null,
    });

    const reviewResponse = await createReview(session, 'Review linked to tooling');
    expect(reviewResponse.statusCode).toBe(201);
    const createdReview = reviewResponse.json().review;

    const linkResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${createdReview.id}/test-plans`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
      payload: {
        testSetRevisionId: draftRevisionId,
        role: 'baseline',
      },
    });

    expect(linkResponse.statusCode).toBe(201);
    expect(linkResponse.json().plan).toMatchObject({
      evaluationId: createdReview.id,
      testSetId: createdTestSet.id,
      testSetRevisionId: draftRevisionId,
      role: 'baseline',
      revision: {
        versionNumber: 1,
        status: 'published',
      },
    });

    const listPlansResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${createdReview.id}/test-plans`,
      headers: {
        cookie: session.cookie,
      },
    });

    expect(listPlansResponse.statusCode).toBe(200);
    expect(listPlansResponse.json().plans).toHaveLength(1);

    const forkResponse = await app.inject({
      method: 'POST',
      url: `/api/test-sets/${createdTestSet.id}/fork`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
      payload: {
        title: 'Library benchmark set fork',
      },
    });

    expect(forkResponse.statusCode).toBe(201);
    expect(forkResponse.json().testSet).toMatchObject({
      title: 'Library benchmark set fork',
      status: 'draft',
      currentDraftRevision: {
        versionNumber: 1,
        caseCount: 1,
      },
    });

    const forkedTestSet = forkResponse.json().testSet;

    const archiveResponse = await app.inject({
      method: 'POST',
      url: `/api/test-sets/${forkedTestSet.id}/archive`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
    });

    expect(archiveResponse.statusCode).toBe(200);
    expect(archiveResponse.json().testSet).toMatchObject({
      id: forkedTestSet.id,
      status: 'archived',
    });
  });
});
