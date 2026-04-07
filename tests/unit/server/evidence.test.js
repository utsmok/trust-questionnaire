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

  return {
    cookie: getSessionCookie(response),
    csrfToken: response.json().csrfToken,
  };
};

const createReview = async ({ cookie, csrfToken, titleSnapshot = 'Evidence review' } = {}) => {
  const response = await app.inject({
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
        fields: {
          's1.toolName': titleSnapshot,
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

const initializeUpload = async ({ cookie, csrfToken, reviewId, originalName, mimeType, sizeBytes }) => {
  const response = await app.inject({
    method: 'POST',
    url: `/api/evaluations/${reviewId}/evidence/uploads`,
    headers: {
      cookie,
      'x-csrf-token': csrfToken,
    },
    payload: {
      originalName,
      mimeType,
      sizeBytes,
      assetKind: 'image',
      sourceType: 'manual_upload',
      originUrl: 'https://example.test/evidence',
      originTitle: 'Evidence source page',
      capturedAtClient: '2026-04-06T12:34:56.000Z',
    },
  });

  expect(response.statusCode).toBe(201);
  return response.json().upload;
};

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe('evidence APIs', () => {
  it('creates upload sessions, finalizes assets, links them durably, and emits the manifest from persisted records', async () => {
    app = await createApp({
      envOverrides: {
        EVIDENCE_STORAGE_DRIVER: 'memory',
      },
    });

    const session = await loginAs('reviewer-primary');
    const review = await createReview({
      cookie: session.cookie,
      csrfToken: session.csrfToken,
      titleSnapshot: 'Durable evidence review',
    });

    const upload = await initializeUpload({
      cookie: session.cookie,
      csrfToken: session.csrfToken,
      reviewId: review.id,
      originalName: 'evaluation-screenshot.png',
      mimeType: 'image/png',
      sizeBytes: PNG_BUFFER.byteLength,
    });

    const finalizeResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/evidence/assets`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
      payload: {
        uploadToken: upload.uploadToken,
        contentBase64: PNG_BUFFER.toString('base64'),
      },
    });

    expect(finalizeResponse.statusCode).toBe(201);
    const createdAsset = finalizeResponse.json().asset;
    expect(createdAsset).toMatchObject({
      assetKind: 'image',
      sourceType: 'manual_upload',
      originalName: 'evaluation-screenshot.png',
      mimeType: 'image/png',
      sizeBytes: PNG_BUFFER.byteLength,
      storageProvider: 'memory',
      originUrl: 'https://example.test/evidence',
    });

    const evaluationLinkResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/evidence/links`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
      payload: {
        assetId: createdAsset.assetId,
        scopeType: 'evaluation',
        evidenceType: 'screenshot',
        note: 'Evaluation-level screenshot',
      },
    });

    expect(evaluationLinkResponse.statusCode).toBe(201);

    const criterionLinkResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/evidence/links`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
      payload: {
        assetId: createdAsset.assetId,
        scopeType: 'criterion',
        criterionCode: 'TR1',
        evidenceType: 'benchmark',
        note: 'Criterion-specific benchmark note',
      },
    });

    expect(criterionLinkResponse.statusCode).toBe(201);

    const updatedCriterionLinkResponse = await app.inject({
      method: 'PATCH',
      url: `/api/evaluations/${review.id}/evidence/links/${criterionLinkResponse.json().link.linkId}`,
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrfToken,
      },
      payload: {
        note: 'Criterion-specific benchmark note (updated)',
      },
    });

    expect(updatedCriterionLinkResponse.statusCode).toBe(200);
    expect(updatedCriterionLinkResponse.json().link.note).toBe(
      'Criterion-specific benchmark note (updated)',
    );

    const listResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/evidence`,
      headers: {
        cookie: session.cookie,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      evidence: {
        summary: {
          assetCount: 1,
          linkCount: 2,
          evaluationLinkCount: 1,
          criterionLinkCount: 1,
          reviewInboxLinkCount: 0,
        },
      },
    });
    expect(listResponse.json().evidence.assets[0].assetId).toBe(createdAsset.assetId);

    const manifestResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/evidence/manifest`,
      headers: {
        cookie: session.cookie,
      },
    });

    expect(manifestResponse.statusCode).toBe(200);
    const manifest = manifestResponse.json();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.evaluation.itemCount).toBe(1);
    expect(manifest.evaluation.items[0]).toMatchObject({
      assetId: createdAsset.assetId,
      scope: 'evaluation',
      sectionId: 'S2',
      criterionCode: null,
      evidenceType: 'screenshot',
      note: 'Evaluation-level screenshot',
      dataUrl: null,
    });
    expect(manifest.criteria.TR1.itemCount).toBe(1);
    expect(manifest.criteria.TR1.items[0]).toMatchObject({
      assetId: createdAsset.assetId,
      scope: 'criterion',
      sectionId: 'TR',
      criterionCode: 'TR1',
      note: 'Criterion-specific benchmark note (updated)',
      dataUrl: null,
      previewDataUrl: null,
    });
  });

  it('authorizes downloads through review visibility, audits successful downloads, and supports unlinking', async () => {
    app = await createApp({
      envOverrides: {
        EVIDENCE_STORAGE_DRIVER: 'memory',
      },
    });

    const primarySession = await loginAs('reviewer-primary');
    const review = await createReview({
      cookie: primarySession.cookie,
      csrfToken: primarySession.csrfToken,
      titleSnapshot: 'Download authorization review',
    });

    const upload = await initializeUpload({
      cookie: primarySession.cookie,
      csrfToken: primarySession.csrfToken,
      reviewId: review.id,
      originalName: 'downloadable-proof.png',
      mimeType: 'image/png',
      sizeBytes: PNG_BUFFER.byteLength,
    });

    const finalizeResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/evidence/assets`,
      headers: {
        cookie: primarySession.cookie,
        'x-csrf-token': primarySession.csrfToken,
      },
      payload: {
        uploadToken: upload.uploadToken,
        contentBase64: PNG_BUFFER.toString('base64'),
      },
    });

    const assetId = finalizeResponse.json().asset.assetId;

    const linkResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/evidence/links`,
      headers: {
        cookie: primarySession.cookie,
        'x-csrf-token': primarySession.csrfToken,
      },
      payload: {
        assetId,
        scopeType: 'evaluation',
        evidenceType: 'screenshot',
        note: 'Download me',
      },
    });

    const linkId = linkResponse.json().link.linkId;

    const downloadResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/evidence/assets/${assetId}/download?linkId=${linkId}`,
      headers: {
        cookie: primarySession.cookie,
      },
    });

    expect(downloadResponse.statusCode).toBe(200);
    expect(downloadResponse.headers['content-type']).toBe('image/png');
    expect(downloadResponse.rawPayload.equals(PNG_BUFFER)).toBe(true);

    const downloadEvents = await app.evidenceAssetRepository.listDownloadEventsByAssetId(assetId);
    expect(downloadEvents).toHaveLength(1);
    expect(downloadEvents[0]).toMatchObject({
      evaluationId: review.id,
      assetId,
      linkId,
      actorUserId: 1,
      eventType: 'download_authorized',
    });

    const otherUserSession = await loginAs('decision-owner');
    const deniedDownloadResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/evidence/assets/${assetId}/download`,
      headers: {
        cookie: otherUserSession.cookie,
      },
    });

    expect(deniedDownloadResponse.statusCode).toBe(404);

    const unlinkResponse = await app.inject({
      method: 'DELETE',
      url: `/api/evaluations/${review.id}/evidence/links/${linkId}`,
      headers: {
        cookie: primarySession.cookie,
        'x-csrf-token': primarySession.csrfToken,
      },
    });

    expect(unlinkResponse.statusCode).toBe(204);

    const missingDownloadAfterUnlink = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/evidence/assets/${assetId}/download`,
      headers: {
        cookie: primarySession.cookie,
      },
    });

    expect(missingDownloadAfterUnlink.statusCode).toBe(404);
  });
});
