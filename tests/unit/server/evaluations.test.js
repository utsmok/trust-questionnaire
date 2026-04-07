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

const createNominationState = (overrides = {}) => ({
  workflow: { mode: 'nomination' },
  fields: {},
  sections: {},
  criteria: {},
  evidence: { evaluation: [], criteria: {} },
  overrides: { principleJudgments: {} },
  ...overrides,
});

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe('evaluation persistence routes', () => {
  it('creates, lists, fetches, and conditionally updates a review', async () => {
    app = await createApp();
    const { cookie, csrfToken } = await loginAs('reviewer-primary');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/evaluations',
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        titleSnapshot: 'Pilot review',
        currentState: createNominationState({
          fields: {
            's1.toolName': 'Pilot tool',
          },
        }),
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.headers.etag).toMatch(/^".+"$/);

    const createdReview = createResponse.json().review;
    expect(createdReview).toMatchObject({
      id: 1,
      titleSnapshot: 'Pilot review',
      workflowMode: 'nomination',
      lifecycleState: 'nomination_draft',
      stateSchemaVersion: '1',
      frameworkVersion: '2.0',
      currentRevisionNumber: 1,
      currentState: {
        workflow: { mode: 'nomination' },
        fields: {
          's1.toolName': 'Pilot tool',
        },
      },
      assignment: {
        primaryEvaluatorUserId: null,
        secondReviewerUserId: null,
        decisionOwnerUserId: null,
      },
    });
    expect(createdReview.etag).toBe(createResponse.headers.etag);
    expect(createdReview.publicId).toMatch(/^TR-/);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/evaluations',
      headers: { cookie },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      reviews: [
        {
          id: createdReview.id,
          publicId: createdReview.publicId,
          titleSnapshot: 'Pilot review',
          currentRevisionNumber: 1,
        },
      ],
    });

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${createdReview.id}`,
      headers: { cookie },
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.headers.etag).toBe(createdReview.etag);
    expect(getResponse.json().review.currentState.fields['s1.toolName']).toBe('Pilot tool');

    const missingIfMatchResponse = await app.inject({
      method: 'PUT',
      url: `/api/evaluations/${createdReview.id}/state`,
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        currentState: createNominationState(),
      },
    });

    expect(missingIfMatchResponse.statusCode).toBe(428);

    const updateResponse = await app.inject({
      method: 'PUT',
      url: `/api/evaluations/${createdReview.id}/state`,
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
        'if-match': createdReview.etag,
      },
      payload: {
        saveReason: 'manual_save',
        currentState: createNominationState({
          fields: {
            's1.toolName': 'Pilot tool updated',
          },
          sections: {
            S1: {
              sectionNote: 'Updated after first pass.',
            },
          },
        }),
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.headers.etag).not.toBe(createdReview.etag);
    expect(updateResponse.json().review).toMatchObject({
      id: createdReview.id,
      currentRevisionNumber: 2,
      currentState: {
        fields: {
          's1.toolName': 'Pilot tool updated',
        },
        sections: {
          S1: {
            sectionNote: 'Updated after first pass.',
          },
        },
      },
    });

    const staleWriteResponse = await app.inject({
      method: 'PUT',
      url: `/api/evaluations/${createdReview.id}/state`,
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
        'if-match': createdReview.etag,
      },
      payload: {
        currentState: createNominationState({
          fields: {
            's1.toolName': 'This should conflict',
          },
        }),
      },
    });

    expect(staleWriteResponse.statusCode).toBe(412);
    expect(staleWriteResponse.json().review.currentRevisionNumber).toBe(2);
    expect(staleWriteResponse.headers.etag).toBe(updateResponse.headers.etag);
  });

  it('limits review visibility to the creator while assignment behavior is deferred', async () => {
    app = await createApp();
    const primaryLogin = await loginAs('reviewer-primary');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/evaluations',
      headers: {
        cookie: primaryLogin.cookie,
        'x-csrf-token': primaryLogin.csrfToken,
      },
      payload: {
        titleSnapshot: 'Hidden from others',
      },
    });

    const reviewerLogin = await loginAs('decision-owner');
    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/evaluations',
      headers: {
        cookie: reviewerLogin.cookie,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({ reviews: [] });

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${createResponse.json().review.id}`,
      headers: {
        cookie: reviewerLogin.cookie,
      },
    });

    expect(getResponse.statusCode).toBe(404);
  });
});
