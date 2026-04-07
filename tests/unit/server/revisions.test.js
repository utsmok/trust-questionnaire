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
    csrfToken: response.json().csrfToken,
    cookie: getSessionCookie(response),
  };
};

const createState = (toolName) => ({
  workflow: { mode: 'nomination' },
  fields: {
    's1.toolName': toolName,
  },
  sections: {},
  criteria: {},
  evidence: { evaluation: [], criteria: {} },
  overrides: { principleJudgments: {} },
});

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe('revision persistence routes', () => {
  it('stores immutable revisions for create and conditional save operations', async () => {
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
        titleSnapshot: 'Revisioned review',
        currentState: createState('Initial tool'),
      },
    });

    const review = createResponse.json().review;

    const firstUpdateResponse = await app.inject({
      method: 'PUT',
      url: `/api/evaluations/${review.id}/state`,
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
        'if-match': createResponse.headers.etag,
      },
      payload: {
        saveReason: 'autosave',
        currentState: createState('Autosaved tool'),
      },
    });

    const secondUpdateResponse = await app.inject({
      method: 'PUT',
      url: `/api/evaluations/${review.id}/state`,
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
        'if-match': firstUpdateResponse.headers.etag,
      },
      payload: {
        saveReason: 'manual_save',
        currentState: createState('Manually saved tool'),
      },
    });

    expect(secondUpdateResponse.statusCode).toBe(200);

    const listResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/revisions`,
      headers: {
        cookie,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.headers.etag).toBe(secondUpdateResponse.headers.etag);
    expect(listResponse.json()).toMatchObject({
      revisions: [
        {
          revisionNumber: 3,
          saveReason: 'manual_save',
        },
        {
          revisionNumber: 2,
          saveReason: 'autosave',
        },
        {
          revisionNumber: 1,
          saveReason: 'create_review',
        },
      ],
    });

    const firstRevisionResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/revisions/1`,
      headers: {
        cookie,
      },
    });

    expect(firstRevisionResponse.statusCode).toBe(200);
    expect(firstRevisionResponse.json().revision).toMatchObject({
      revisionNumber: 1,
      state: {
        fields: {
          's1.toolName': 'Initial tool',
        },
      },
    });

    const latestRevisionResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/revisions/3`,
      headers: {
        cookie,
      },
    });

    expect(latestRevisionResponse.statusCode).toBe(200);
    expect(latestRevisionResponse.json().revision).toMatchObject({
      revisionNumber: 3,
      workflowMode: 'nomination',
      lifecycleState: 'nomination_draft',
      stateSchemaVersion: '1',
      frameworkVersion: '2.0',
      saveReason: 'manual_save',
      state: {
        fields: {
          's1.toolName': 'Manually saved tool',
        },
      },
    });
  });
});
