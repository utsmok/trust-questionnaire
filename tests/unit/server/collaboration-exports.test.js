import { afterEach, describe, expect, it } from 'vitest';

import JSZip from 'jszip';

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

const createReview = async (session, currentStateOverrides = {}) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/evaluations',
    headers: {
      cookie: session.cookie,
      'x-csrf-token': session.csrfToken,
    },
    payload: {
      titleSnapshot: 'Collaboration export review',
      currentState: {
        workflow: { mode: 'nomination' },
        fields: {
          's0.submissionType': 'nomination',
          's0.toolName': 'Collaboration export review',
          's1.vendor': 'Vendor A',
          ...(currentStateOverrides.fields ?? {}),
        },
        sections: currentStateOverrides.sections ?? {},
        criteria: currentStateOverrides.criteria ?? {},
        evidence: currentStateOverrides.evidence ?? { evaluation: [], criteria: {} },
        overrides: currentStateOverrides.overrides ?? { principleJudgments: {} },
      },
    },
  });

  expect(response.statusCode).toBe(201);
  return response.json().review;
};

const initializeUpload = async ({ session, reviewId }) => {
  const response = await app.inject({
    method: 'POST',
    url: `/api/evaluations/${reviewId}/evidence/uploads`,
    headers: {
      cookie: session.cookie,
      'x-csrf-token': session.csrfToken,
    },
    payload: {
      originalName: 'proof.png',
      mimeType: 'image/png',
      sizeBytes: PNG_BUFFER.byteLength,
      assetKind: 'image',
      sourceType: 'manual_upload',
      originUrl: 'https://example.test/proof',
      originTitle: 'Proof page',
      capturedAtClient: '2026-04-06T10:00:00.000Z',
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

describe('comments, audit, export, and import', () => {
  it('persists scoped comments, records activity, exports ZIP packages, and imports them back with evidence', async () => {
    app = await createApp({
      envOverrides: {
        EVIDENCE_STORAGE_DRIVER: 'memory',
      },
    });

    const primary = await loginAs('reviewer-primary');
    const review = await createReview(primary);

    const reviewCommentResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/comments`,
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        scopeType: 'review',
        body: 'Top-level review comment',
      },
    });
    expect(reviewCommentResponse.statusCode).toBe(201);

    const sectionCommentResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/comments`,
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        scopeType: 'section',
        sectionId: 'S1',
        body: 'Section-level comment',
      },
    });
    expect(sectionCommentResponse.statusCode).toBe(201);

    const criterionCommentResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/comments`,
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        scopeType: 'criterion',
        criterionCode: 'TR1',
        body: 'Criterion-level comment',
      },
    });
    expect(criterionCommentResponse.statusCode).toBe(201);

    const upload = await initializeUpload({ session: primary, reviewId: review.id });
    const finalizeResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/evidence/assets`,
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        uploadToken: upload.uploadToken,
        contentBase64: PNG_BUFFER.toString('base64'),
      },
    });
    expect(finalizeResponse.statusCode).toBe(201);
    const assetId = finalizeResponse.json().asset.assetId;

    const linkResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/evidence/links`,
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        assetId,
        scopeType: 'criterion',
        criterionCode: 'TR1',
        evidenceType: 'screenshot',
        note: 'Export me',
      },
    });
    expect(linkResponse.statusCode).toBe(201);

    const exportResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/exports`,
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        format: 'zip',
        includeEvidenceFiles: true,
        includeReportingCsv: true,
      },
    });
    expect(exportResponse.statusCode).toBe(201);
    const exportJob = exportResponse.json().export;

    const downloadResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/exports/${exportJob.jobId}/download`,
      headers: {
        cookie: primary.cookie,
      },
    });
    expect(downloadResponse.statusCode).toBe(200);
    expect(downloadResponse.headers['content-type']).toContain('application/zip');

    const zip = await JSZip.loadAsync(downloadResponse.rawPayload);
    const canonicalJson = JSON.parse(await zip.file('trust-review-export.json').async('string'));
    expect(canonicalJson.review.record.current_state_json.fields['s1.vendor']).toBe('Vendor A');
    expect(canonicalJson.evidence.links).toHaveLength(1);
    expect(canonicalJson.collaboration.comments).toHaveLength(3);
    expect(await zip.file('evidence/trust-evidence-manifest.json').async('string')).toContain('TR1');

    const importResponse = await app.inject({
      method: 'POST',
      url: '/api/import/evaluations',
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        sourceFormat: 'zip',
        archiveBase64: downloadResponse.rawPayload.toString('base64'),
      },
    });
    expect(importResponse.statusCode).toBe(201);
    const importedReview = importResponse.json().review;
    expect(importedReview.currentState.fields['s1.vendor']).toBe('Vendor A');

    const importedCommentsResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${importedReview.id}/comments`,
      headers: {
        cookie: primary.cookie,
      },
    });
    expect(importedCommentsResponse.statusCode).toBe(200);
    expect(importedCommentsResponse.json().comments).toHaveLength(3);

    const importedEvidenceResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${importedReview.id}/evidence`,
      headers: {
        cookie: primary.cookie,
      },
    });
    expect(importedEvidenceResponse.statusCode).toBe(200);
    expect(importedEvidenceResponse.json().evidence.summary.assetCount).toBe(1);
    expect(importedEvidenceResponse.json().evidence.summary.linkCount).toBe(1);

    const activityResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/activity`,
      headers: {
        cookie: primary.cookie,
      },
    });
    expect(activityResponse.statusCode).toBe(200);
    expect(activityResponse.json().auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        'review_created',
        'comment_created',
        'evidence_asset_uploaded',
        'evidence_link_created',
        'export_created',
      ]),
    );
  });

  it('imports documented legacy evidence manifests into an existing review and records the import', async () => {
    app = await createApp({
      envOverrides: {
        EVIDENCE_STORAGE_DRIVER: 'memory',
      },
    });

    const primary = await loginAs('reviewer-primary');
    const review = await createReview(primary);

    const legacyManifest = {
      schemaVersion: 1,
      generatedAt: '2026-04-06T12:00:00.000Z',
      evaluation: {
        itemCount: 1,
        items: [
          {
            id: 'legacy-link-1',
            assetId: 'legacy-asset-1',
            scope: 'evaluation',
            sectionId: 'S2',
            criterionCode: null,
            evidenceType: 'screenshot',
            name: 'legacy.png',
            note: 'Legacy manifest proof',
            mimeType: 'image/png',
            size: PNG_BUFFER.byteLength,
            isImage: true,
            dataUrl: `data:image/png;base64,${PNG_BUFFER.toString('base64')}`,
            previewDataUrl: `data:image/png;base64,${PNG_BUFFER.toString('base64')}`,
            addedAt: '2026-04-06T12:00:00.000Z',
          },
        ],
      },
      sections: {},
      criteria: {},
      summary: {
        evaluationItemCount: 1,
        criterionItemCount: 0,
        totalItemCount: 1,
      },
    };

    const importResponse = await app.inject({
      method: 'POST',
      url: `/api/evaluations/${review.id}/imports`,
      headers: {
        cookie: primary.cookie,
        'x-csrf-token': primary.csrfToken,
      },
      payload: {
        sourceFormat: 'json',
        manifest: JSON.stringify(legacyManifest),
      },
    });

    expect(importResponse.statusCode).toBe(201);
    expect(importResponse.json().importedLinkCount).toBe(1);

    const evidenceResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/evidence`,
      headers: {
        cookie: primary.cookie,
      },
    });
    expect(evidenceResponse.statusCode).toBe(200);
    expect(evidenceResponse.json().evidence.summary.evaluationLinkCount).toBe(1);

    const importsResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/imports`,
      headers: {
        cookie: primary.cookie,
      },
    });
    expect(importsResponse.statusCode).toBe(200);
    expect(importsResponse.json().imports[0].importClass).toBe('legacy_evidence_manifest_v1');

    const activityResponse = await app.inject({
      method: 'GET',
      url: `/api/evaluations/${review.id}/activity`,
      headers: {
        cookie: primary.cookie,
      },
    });
    expect(activityResponse.json().auditEvents.map((event) => event.eventType)).toContain(
      'import_completed',
    );
  });
});
