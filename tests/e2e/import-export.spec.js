import { expect, test } from '@playwright/test';

import {
  createReviewViaApi,
  gotoDashboard,
  loginAsDevUser,
} from './helpers.js';

test('review import/export route creates exports and supports canonical and legacy imports', async ({
  page,
  browserName,
}) => {
  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');

  const created = await createReviewViaApi(page, {
    titleSnapshot: `Import export review ${browserName}`,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's0.submissionType': 'nomination',
        's0.toolName': 'Import export UI tool',
        's1.vendor': 'Export Vendor',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  const reviewId = created.review.id;

  await page.goto(`/reviews/${reviewId}/import-export`);
  await expect(page.locator('#reviewShellMount')).toContainText('Import / export');
  await expect(
    page.locator('#appViewMount [data-app-surface="review-import-export"]'),
  ).toBeVisible();

  await page.locator('[data-export-submit]').click();
  await expect(page.locator('[data-export-feedback]')).toContainText('Export created');
  await expect(page.locator('[data-export-list]')).toContainText('JSON');

  const canonicalPayload = await page.evaluate(async (nextReviewId) => {
    const exportsResponse = await fetch(`/api/evaluations/${nextReviewId}/exports`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const exportsPayload = await exportsResponse.json();
    const latest = exportsPayload.exports[0];
    const downloadResponse = await fetch(
      `/api/evaluations/${nextReviewId}/exports/${latest.jobId}/download`,
      {
        credentials: 'same-origin',
      },
    );
    return downloadResponse.text();
  }, reviewId);

  await page.locator('[data-canonical-import-json]').fill(canonicalPayload);
  await page.locator('[data-canonical-import-submit]').click();
  await expect(page.locator('[data-canonical-import-feedback]')).toContainText('Imported review');
  await expect(page.getByRole('link', { name: 'Open imported review' })).toBeVisible();

  const legacyManifest = JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-04-06T12:00:00.000Z',
    evaluation: {
      itemCount: 0,
      items: [],
    },
    sections: {},
    criteria: {},
    summary: {
      evaluationItemCount: 0,
      criterionItemCount: 0,
      totalItemCount: 0,
    },
  });

  await page.locator('[data-legacy-import-manifest]').fill(legacyManifest);
  await page.locator('[data-legacy-import-submit]').click();
  await expect(page.locator('[data-import-feedback]')).toContainText('Imported 0 legacy item');
  await expect(page.locator('[data-import-list]')).toContainText('legacy_evidence_manifest_v1');
});
