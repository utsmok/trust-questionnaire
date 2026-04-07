import { expect, test } from '@playwright/test';

import {
  applyWorkflowTransitionViaApi,
  createReviewViaApi,
  getSessionStateViaApi,
  gotoDashboard,
  loginAsDevUser,
  logoutDevUser,
  updateAssignmentsViaApi,
} from './helpers.js';

test('review inbox surfaces extension captures and allows explicit triage into a criterion target', async ({
  page,
  browserName,
}) => {
  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');

  const primarySession = await getSessionStateViaApi(page);
  const primaryUserId = primarySession.user.id;
  const created = await createReviewViaApi(page, {
    titleSnapshot: `Extension inbox review ${browserName}`,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's0.submissionType': 'nomination',
        's0.toolName': 'Extension inbox review',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  const submitted = await applyWorkflowTransitionViaApi(
    page,
    created.review.id,
    created.review.etag,
    'submit_nomination',
  );

  await logoutDevUser(page);
  await loginAsDevUser(page, 'coordinator');

  await updateAssignmentsViaApi(page, created.review.id, {
    primaryEvaluatorUserId: primaryUserId,
  });
  const assigned = await applyWorkflowTransitionViaApi(
    page,
    created.review.id,
    submitted.review.etag,
    'assign_primary',
  );

  await logoutDevUser(page);
  await loginAsDevUser(page, 'reviewer-primary');

  await applyWorkflowTransitionViaApi(
    page,
    created.review.id,
    assigned.review.etag,
    'start_primary_review',
  );

  await page.goto('/settings/capture');
  await page.locator('[data-extension-pair-start]').click();
  const pairingCode = (await page.locator('[data-extension-pairing-code]').textContent())?.trim();
  expect(pairingCode).toBeTruthy();

  const exchanged = await page.evaluate(
    async ({ code, nextBrowserName }) => {
      const response = await fetch('/api/extension/pair/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          pairingCode: code,
          clientName: 'Playwright inbox client',
          browserName: nextBrowserName,
          browserVersion: 'playwright-build',
          extensionVersion: '0.1.0-e2e',
        }),
      });

      return {
        status: response.status,
        payload: await response.json(),
      };
    },
    { code: pairingCode, nextBrowserName: browserName },
  );

  expect(exchanged.status).toBe(201);

  const captureResult = await page.evaluate(
    async ({ accessToken, reviewId }) => {
      const initResponse = await fetch('/api/captures/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          evaluationId: reviewId,
          scopeType: 'review_inbox',
          evidenceType: 'other',
          note: 'Inbox this capture explicitly before routing it.',
          assetKind: 'selection',
          originalName: 'selected-text.txt',
          mimeType: 'text/plain',
          originUrl: 'https://example.test/extension-inbox',
          originTitle: 'Extension inbox page',
          selectionText: 'Selected text from the browser capture pilot.',
          capturedAtClient: '2026-04-07T12:00:00.000Z',
          browserName: 'Chromium',
          browserVersion: 'playwright-build',
          extensionVersion: '0.1.0-e2e',
        }),
      });
      const initialized = await initResponse.json();

      const uploadResponse = await fetch(`/api/captures/${initialized.capture.captureId}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const uploaded = await uploadResponse.json();

      const finalizeResponse = await fetch(`/api/captures/${initialized.capture.captureId}/finalize`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const finalized = await finalizeResponse.json();

      return {
        initStatus: initResponse.status,
        uploadStatus: uploadResponse.status,
        finalizeStatus: finalizeResponse.status,
        initialized,
        uploaded,
        finalized,
      };
    },
    {
      accessToken: exchanged.payload.accessToken,
      reviewId: created.review.id,
    },
  );

  expect(captureResult.initStatus).toBe(201);
  expect(captureResult.uploadStatus).toBe(200);
  expect(captureResult.finalizeStatus).toBe(201);
  expect(captureResult.finalized.link.scopeType).toBe('review_inbox');

  await page.goto(`/reviews/${created.review.id}/review-inbox`);
  await expect(page.locator('#appViewMount [data-app-surface="review-inbox"]')).toBeVisible();
  await expect(page.locator('[data-review-inbox-item]')).toHaveCount(1);
  await expect(page.locator('text=Selected text from the browser capture pilot.')).toBeVisible();

  await page.locator('[data-review-inbox-form] select[name="target"]').selectOption('criterion:TR1');
  await page.locator('[data-review-inbox-form] select[name="evidenceType"]').selectOption('benchmark');
  await page.locator('[data-review-inbox-form] textarea[name="note"]').fill('Moved into TR1 from the review inbox.');
  await page.locator('[data-review-inbox-form] button[type="submit"]').click();

  await expect(page.locator('text=Inbox item moved into the review evidence flow.')).toBeVisible();
  await expect(page.locator('[data-review-inbox-empty]')).toBeVisible();

  const evidenceState = await page.evaluate(async (reviewId) => {
    const response = await fetch(`/api/evaluations/${reviewId}/evidence`, {
      headers: {
        Accept: 'application/json',
      },
    });

    return response.json();
  }, created.review.id);

  expect(evidenceState.evidence.summary.reviewInboxLinkCount).toBe(0);
  expect(evidenceState.evidence.summary.criterionLinkCount).toBe(1);
});
