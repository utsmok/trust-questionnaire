import { expect, test } from '@playwright/test';

import {
  createReviewViaApi,
  gotoDashboard,
  loginAsDevUser,
  updateReviewStateViaApi,
} from './helpers.js';

test('review overview summarizes saved-review metadata and provides explicit workspace jump points', async ({ page, browserName }) => {
  const title = `Overview summary review ${browserName}`;

  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');

  const created = await createReviewViaApi(page, {
    titleSnapshot: title,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's0.submissionType': 'nomination',
        's0.toolName': 'Overview tool',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  await updateReviewStateViaApi(page, created.review.id, created.review.etag, {
    workflow: { mode: 'primary_evaluation' },
    fields: {
      's0.submissionType': 'primary_evaluation',
      's0.toolName': 'Overview tool',
      's2.evidenceFolderLink': 'https://example.org/evidence-bundle',
      'tr.principleSummary': 'Transparency summary recorded.',
    },
    sections: {},
    criteria: {},
    evidence: {
      evaluation: [
        {
          id: 'ev-1',
          assetId: 'asset-1',
          scope: 'evaluation',
          sectionId: 'S2',
          criterionCode: null,
          evidenceType: 'screenshot',
          note: 'Captured setup state',
          name: 'setup.png',
          mimeType: 'image/png',
          size: 1024,
          isImage: true,
          dataUrl: null,
          previewDataUrl: null,
          addedAt: new Date().toISOString(),
        },
      ],
      criteria: {
        TR1: [
          {
            id: 'ev-2',
            assetId: 'asset-2',
            scope: 'criterion',
            sectionId: 'TR',
            criterionCode: 'TR1',
            evidenceType: 'link',
            note: 'Vendor transparency documentation',
            name: 'docs',
            mimeType: 'text/html',
            size: 256,
            isImage: false,
            dataUrl: null,
            previewDataUrl: null,
            addedAt: new Date().toISOString(),
          },
        ],
      },
    },
    overrides: { principleJudgments: {} },
  });

  await page.goto(`/reviews/${created.review.id}/overview`);

  await expect(page.locator('#appViewMount [data-app-surface="review-overview"]')).toBeVisible();
  await expect(page.locator('#reviewShellMount')).toContainText(created.review.publicId);
  await expect(page.locator('text=Saved review state')).toBeVisible();
  await expect(page.locator('text=Progress and evidence')).toBeVisible();
  await expect(page.locator('text=Workspace jump table')).toBeVisible();
  await expect(page.locator('[data-review-overview-resume]')).toBeVisible();
  await expect(page.locator('[data-review-overview-jump-row="S0"]')).toBeVisible();
  await expect(page.locator('text=Evidence items')).toBeVisible();
  await expect(page.locator('text=Criteria with evidence')).toBeVisible();

  await page.locator('[data-review-overview-jump="S0"]').click();
  await expect(page).toHaveURL(new RegExp(`/reviews/${created.review.id}/workspace/workflow-control$`));
  await expect(page.locator('#questionnaireRenderRoot')).toHaveAttribute(
    'data-rendered-source',
    'schema',
  );
});
