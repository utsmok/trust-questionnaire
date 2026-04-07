import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../server/app.js';

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2HFNwAAAABJRU5ErkJggg==',
  'base64',
);

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
    cookie,
    csrfToken: response.json().csrfToken,
    session: meResponse.json(),
  };
};

const createReview = async (session, titleSnapshot = 'Extension capture review') => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/evaluations',
    headers: {
      cookie: session.cookie,
      'x-csrf-token': session.csrfToken,
    },
    payload: {
      titleSnapshot,
      currentState: {
        workflow: { mode: 'nomination' },
        fields: {
          's0.submissionType': 'nomination',
          's0.toolName': titleSnapshot,
        },
        sections: {},
        criteria: {},
        evidence: {
          evaluation: [],
          criteria: {},
        },
        overrides: {
          principleJudgments: {},
        },
      },
    },
  });

  expect(response.statusCode).toBe(201);
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

  expect(response.statusCode).toBe(200);
  return response.json().review;
};

const applyTransition = async (session, reviewId, etag, transitionId) => {
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
    },
  });

  expect(response.statusCode).toBe(200);
  return response.json().review;
};

const startPrimaryReview = async ({ primary, coordinator, review }) => {
  const submitted = await applyTransition(primary, review.id, review.etag, 'submit_nomination');
  await updateAssignments(coordinator, review.id, {
    primaryEvaluatorUserId: primary.session.user.id,
  });
  const assigned = await applyTransition(
    coordinator,
    review.id,
    submitted.etag,
    'assign_primary',
  );

  return applyTransition(primary, review.id, assigned.etag, 'start_primary_review');
};

const startPairing = async (session) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/extension/pair/start',
    headers: {
      cookie: session.cookie,
      'x-csrf-token': session.csrfToken,
    },
    payload: {},
  });

  expect(response.statusCode).toBe(201);
  return response.json().pairing;
};

const exchangePairing = async (pairingCode) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/extension/pair/exchange',
    payload: {
      pairingCode,
      clientName: 'Vitest capture client',
      browserName: 'Chromium',
      browserVersion: '123.0.0.0',
      extensionVersion: '0.0.1-test',
    },
  });

  expect(response.statusCode).toBe(201);
  return response.json();
};

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe('extension pairing and capture APIs', () => {
  it('pairs, refreshes, lists, and revokes extension sessions', async () => {
    app = await createApp({
      envOverrides: {
        EVIDENCE_STORAGE_DRIVER: 'memory',
      },
    });

    const primary = await loginAs('reviewer-primary');
    const pairing = await startPairing(primary);
    expect(typeof pairing.pairingCode).toBe('string');
    expect(pairing.scopes).toContain('review:evidence:write');

    const exchanged = await exchangePairing(pairing.pairingCode);
    expect(exchanged.session).toMatchObject({
      clientName: 'Vitest capture client',
      browserName: 'Chromium',
      extensionVersion: '0.0.1-test',
    });
    expect(typeof exchanged.accessToken).toBe('string');
    expect(typeof exchanged.refreshToken).toBe('string');

    const listed = await app.inject({
      method: 'GET',
      url: '/api/extension/sessions',
      headers: {
        cookie: primary.cookie,
      },
    });

    expect(listed.statusCode).toBe(200);
    expect(listed.json().sessions).toHaveLength(1);
    expect(listed.json().sessions[0]).toMatchObject({
      sessionId: exchanged.session.sessionId,
      browserName: 'Chromium',
    });

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/extension/session/refresh',
      payload: {
        refreshToken: exchanged.refreshToken,
      },
    });

    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().refreshToken).not.toBe(exchanged.refreshToken);
    expect(refreshed.json().accessToken).not.toBe(exchanged.accessToken);

    const revokeCurrent = await app.inject({
      method: 'DELETE',
      url: '/api/extension/session/current',
      headers: {
        authorization: `Bearer ${refreshed.json().accessToken}`,
      },
    });

    expect(revokeCurrent.statusCode).toBe(204);

    const listedAfterRevoke = await app.inject({
      method: 'GET',
      url: '/api/extension/sessions',
      headers: {
        cookie: primary.cookie,
      },
    });

    expect(listedAfterRevoke.statusCode).toBe(200);
    expect(listedAfterRevoke.json().sessions).toHaveLength(0);
  });

  it('validates capture targets and finalizes uploaded captures into the shared evidence system', async () => {
    app = await createApp({
      envOverrides: {
        EVIDENCE_STORAGE_DRIVER: 'memory',
      },
    });

    const primary = await loginAs('reviewer-primary');
    const coordinator = await loginAs('coordinator');
    const pairing = await startPairing(primary);
    const exchanged = await exchangePairing(pairing.pairingCode);

    const nominationReview = await createReview(primary, 'Nomination capture boundary review');
    const nominationInit = await app.inject({
      method: 'POST',
      url: '/api/captures/init',
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
      payload: {
        evaluationId: nominationReview.id,
        scopeType: 'evaluation',
        evidenceType: 'screenshot',
        note: 'Explicit capture against nomination-stage review-level target.',
        assetKind: 'image',
        originalName: 'nomination-evidence.png',
        mimeType: 'image/png',
        sizeBytes: PNG_BUFFER.byteLength,
        originUrl: 'https://example.test/nomination',
        originTitle: 'Nomination target',
        capturedAtClient: '2026-04-07T10:00:00.000Z',
        browserName: 'Chromium',
        browserVersion: '123.0.0.0',
        extensionVersion: '0.0.1-test',
      },
    });

    expect(nominationInit.statusCode).toBe(409);

    const primaryReview = await startPrimaryReview({
      primary,
      coordinator,
      review: await createReview(primary, 'Primary review capture target'),
    });
    const captureInit = await app.inject({
      method: 'POST',
      url: '/api/captures/init',
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
      payload: {
        evaluationId: primaryReview.id,
        scopeType: 'criterion',
        criterionCode: 'TR1',
        evidenceType: 'screenshot',
        note: 'Explicit TR1 browser capture from the paired extension session.',
        assetKind: 'image',
        originalName: 'tr1-capture.png',
        mimeType: 'image/png',
        sizeBytes: PNG_BUFFER.byteLength,
        originUrl: 'https://example.test/tr1',
        originTitle: 'TR1 evidence source',
        capturedAtClient: '2026-04-07T10:05:00.000Z',
        browserName: 'Chromium',
        browserVersion: '123.0.0.0',
        extensionVersion: '0.0.1-test',
        pageLanguage: 'en',
      },
    });

    expect(captureInit.statusCode).toBe(201);
    expect(captureInit.json().capture).toMatchObject({
      scopeType: 'criterion',
      criterionCode: 'TR1',
      status: 'initialized',
      evidenceType: 'screenshot',
    });

    const captureUpload = await app.inject({
      method: 'POST',
      url: `/api/captures/${captureInit.json().capture.captureId}/upload`,
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
      payload: {
        contentBase64: PNG_BUFFER.toString('base64'),
      },
    });

    expect(captureUpload.statusCode).toBe(200);
    expect(captureUpload.json().asset).toMatchObject({
      sourceType: 'extension_capture',
      browserName: 'Chromium',
      captureToolVersion: '0.0.1-test',
      pageLanguage: 'en',
    });
    expect(captureUpload.json().capture.status).toBe('uploaded');

    const captureFinalize = await app.inject({
      method: 'POST',
      url: `/api/captures/${captureInit.json().capture.captureId}/finalize`,
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
    });

    expect(captureFinalize.statusCode).toBe(201);
    expect(captureFinalize.json()).toMatchObject({
      capture: {
        status: 'finalized',
      },
      link: {
        scopeType: 'criterion',
        criterionCode: 'TR1',
        evidenceType: 'screenshot',
        note: 'Explicit TR1 browser capture from the paired extension session.',
      },
    });

    const evidenceList = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${primaryReview.id}/evidence`,
      headers: {
        cookie: primary.cookie,
      },
    });

    expect(evidenceList.statusCode).toBe(200);
    expect(evidenceList.json()).toMatchObject({
      evidence: {
        summary: {
          assetCount: 1,
          linkCount: 1,
          criterionLinkCount: 1,
        },
      },
    });
    expect(evidenceList.json().evidence.assets[0]).toMatchObject({
      sourceType: 'extension_capture',
      browserName: 'Chromium',
      captureToolVersion: '0.0.1-test',
    });
  });

  it('lists server-approved review targets and supports review inbox routing plus triage', async () => {
    app = await createApp({
      envOverrides: {
        EVIDENCE_STORAGE_DRIVER: 'memory',
      },
    });

    const primary = await loginAs('reviewer-primary');
    const coordinator = await loginAs('coordinator');
    const pairing = await startPairing(primary);
    const exchanged = await exchangePairing(pairing.pairingCode);
    const primaryReview = await startPrimaryReview({
      primary,
      coordinator,
      review: await createReview(primary, 'Review inbox capture target'),
    });

    const reviewsResponse = await app.inject({
      method: 'GET',
      url: '/api/captures/reviews',
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
    });

    expect(reviewsResponse.statusCode).toBe(200);
    expect(reviewsResponse.json().reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: primaryReview.id,
          captureEnabled: true,
        }),
      ]),
    );

    const targetsResponse = await app.inject({
      method: 'GET',
      url: `/api/captures/reviews/${primaryReview.id}/targets`,
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
    });

    expect(targetsResponse.statusCode).toBe(200);
    expect(targetsResponse.json().targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scopeType: 'evaluation' }),
        expect.objectContaining({ scopeType: 'review_inbox' }),
        expect.objectContaining({ scopeType: 'criterion', criterionCode: 'TR1' }),
      ]),
    );

    const inboxInit = await app.inject({
      method: 'POST',
      url: '/api/captures/init',
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
      payload: {
        evaluationId: primaryReview.id,
        scopeType: 'review_inbox',
        evidenceType: 'other',
        note: 'Inbox this explicit selection for later routing.',
        assetKind: 'selection',
        originalName: 'selected-text.txt',
        mimeType: 'text/plain',
        originUrl: 'https://example.test/inbox',
        originTitle: 'Inbox source page',
        selectionText: 'Quoted text captured for later triage.',
        capturedAtClient: '2026-04-07T11:00:00.000Z',
        browserName: 'Chromium',
        browserVersion: '123.0.0.0',
        extensionVersion: '0.0.1-test',
      },
    });

    expect(inboxInit.statusCode).toBe(201);
    expect(inboxInit.json().capture).toMatchObject({
      scopeType: 'review_inbox',
      selectionText: 'Quoted text captured for later triage.',
    });

    const inboxUpload = await app.inject({
      method: 'POST',
      url: `/api/captures/${inboxInit.json().capture.captureId}/upload`,
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
      payload: {},
    });

    expect(inboxUpload.statusCode).toBe(200);
    expect(inboxUpload.json().capture.status).toBe('uploaded');

    const inboxFinalize = await app.inject({
      method: 'POST',
      url: `/api/captures/${inboxInit.json().capture.captureId}/finalize`,
      headers: {
        authorization: `Bearer ${exchanged.accessToken}`,
      },
    });

    expect(inboxFinalize.statusCode).toBe(201);
    expect(inboxFinalize.json().link.scopeType).toBe('review_inbox');

    const inboxList = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${primaryReview.id}/evidence/review-inbox`,
      headers: {
        cookie: primary.cookie,
      },
    });

    expect(inboxList.statusCode).toBe(200);
    expect(inboxList.json().inbox).toMatchObject({
      summary: {
        itemCount: 1,
      },
      items: [
        {
          link: {
            scopeType: 'review_inbox',
          },
          capture: {
            selectionText: 'Quoted text captured for later triage.',
          },
        },
      ],
    });

    const movedLink = await app.inject({
      method: 'PATCH',
      url: `/api/evaluations/${primaryReview.id}/evidence/links/${inboxFinalize.json().link.linkId}`,
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        scopeType: 'criterion',
        criterionCode: 'TR1',
        evidenceType: 'benchmark',
        note: 'Moved out of inbox into TR1.',
      },
    });

    expect(movedLink.statusCode).toBe(200);
    expect(movedLink.json().link).toMatchObject({
      scopeType: 'criterion',
      criterionCode: 'TR1',
      evidenceType: 'benchmark',
    });

    const inboxListAfterMove = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${primaryReview.id}/evidence/review-inbox`,
      headers: {
        cookie: primary.cookie,
      },
    });

    expect(inboxListAfterMove.statusCode).toBe(200);
    expect(inboxListAfterMove.json().inbox.summary.itemCount).toBe(0);
  });
});
