import { expect, test } from '@playwright/test';

import {
  createReviewViaApi,
  gotoDashboard,
  loginAsDevUser,
  updateReviewStateViaApi,
} from './helpers.js';

test('dashboard supports authenticated entry, search/filter, open, and continue review routing', async ({ page, browserName }) => {
  const alphaTitle = `Alpha routed dashboard review ${browserName}`;
  const betaTitle = `Beta routed workspace review ${browserName}`;

  await gotoDashboard(page);
  await expect(page.locator('#appViewMount [data-app-surface="auth"]')).toBeVisible();

  await loginAsDevUser(page, 'reviewer-primary');
  await expect(page.locator('#appViewMount [data-app-surface="dashboard"]')).toBeVisible();

  const nominationReview = await createReviewViaApi(page, {
    titleSnapshot: alphaTitle,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's1.toolName': 'Alpha tool',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  const betaReview = await createReviewViaApi(page, {
    titleSnapshot: betaTitle,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's1.toolName': 'Beta tool',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  await updateReviewStateViaApi(page, betaReview.review.id, betaReview.review.etag, {
    workflow: { mode: 'primary_evaluation' },
    fields: {
      's1.toolName': 'Beta tool',
    },
    sections: {},
    criteria: {},
    evidence: { evaluation: [], criteria: {} },
    overrides: { principleJudgments: {} },
  });

  await page.goto('/dashboard');
  const reviewListTitles = page.locator('.review-list-table .review-list-title');
  await expect(reviewListTitles.filter({ hasText: alphaTitle }).first()).toBeVisible();
  await expect(reviewListTitles.filter({ hasText: betaTitle }).first()).toBeVisible();

  await page.locator('[data-dashboard-search]').fill('Alpha routed');
  await expect(reviewListTitles.filter({ hasText: alphaTitle }).first()).toBeVisible();
  await expect(reviewListTitles.filter({ hasText: betaTitle })).toHaveCount(0);

  await page.locator('[data-dashboard-search]').fill('');
  await page.locator('[data-dashboard-workflow-filter]').selectOption('nomination');
  await expect(page.locator('[data-dashboard-workflow-filter]')).toHaveValue('nomination');
  await expect(reviewListTitles.filter({ hasText: alphaTitle }).first()).toBeVisible();

  await page.locator('[data-dashboard-workflow-filter]').selectOption('all');
  await page
    .locator(`[data-review-open-overview="${nominationReview.review.id}"]`)
    .click();

  await expect(page).toHaveURL(new RegExp(`/reviews/${nominationReview.review.id}/overview$`));
  await expect(page.locator('#appViewMount [data-app-surface="review-overview"]')).toBeVisible();
  await expect(page.locator('#reviewShellMount')).toContainText(nominationReview.review.publicId);

  await page.goto('/dashboard');
  await page.locator(`[data-review-continue="${nominationReview.review.id}"]`).click();

  await expect(page).toHaveURL(
    new RegExp(`/reviews/${nominationReview.review.id}/workspace/workflow-control$`),
  );
  await expect(page.locator('#questionnaireRenderRoot')).toHaveAttribute(
    'data-rendered-source',
    'schema',
  );
});
