import { expect, test } from '@playwright/test';

import { createReviewViaApi, gotoDashboard, loginAsDevUser } from './helpers.js';

const createPublishedToolingReview = async (page) => {
  const reviewPayload = await createReviewViaApi(page, {
    titleSnapshot: 'Tooling-linked review',
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {},
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  return reviewPayload.review;
};

test('tooling workspace supports draft editing, publish, fork, archive, and review linking without test runs', async ({ page }) => {
  await gotoDashboard(page);
  await loginAsDevUser(page, 'coordinator');
  const review = await createPublishedToolingReview(page);

  await page.goto('/tooling');
  await expect(page.locator('#appViewMount [data-app-surface="tooling"]')).toBeVisible();

  await page.locator('[data-tooling-create-title]').fill('Academic baseline set');
  await page.locator('[data-tooling-create-form]').getByRole('button', { name: 'Create test set' }).click();

  await expect(page).toHaveURL(/\/tooling\/test-sets\/\d+$/);
  await expect(page.locator('[data-tooling-editor-root]')).toContainText('Academic baseline set');

  await page.locator('[data-tooling-add-case]').click();
  await page.locator('[data-tooling-case-index="0"] [data-tooling-case-field="title"]').fill('Known-item check');
  await page.locator('[data-tooling-case-index="0"] [data-tooling-case-field="instructionText"]').fill('Search for a known scholarly article with clear provenance.');
  await page.locator('[data-tooling-case-index="0"] [data-tooling-case-field="criterionCode"]').selectOption('TR1');
  await page.locator('[data-tooling-field="changeSummary"]').fill('Prepared initial benchmark case.');
  await page.locator('[data-tooling-editor-form]').getByRole('button', { name: 'Save draft' }).click();

  await expect(page.locator('[data-tooling-editor-root]')).toContainText('Prepared initial benchmark case.');

  await page.locator('[data-tooling-publish]').click();
  await expect(page.locator('[data-tooling-editor-root]')).toContainText('Latest published: v1');

  await page.locator('[data-tooling-link-field="evaluationId"]').selectOption(String(review.id));
  await page.locator('[data-tooling-link-form]').getByRole('button', { name: 'Link revision' }).click();
  await expect(page.locator('[data-tooling-editor-root]')).toContainText(review.publicId);

  await page.locator('[data-tooling-fork]').click();
  await expect(page).toHaveURL(/\/tooling\/test-sets\/\d+$/);
  await expect(page.locator('[data-tooling-editor-root]')).toContainText('Academic baseline set copy');

  await page.locator('[data-tooling-archive]').click();
  await expect(page.locator('[data-tooling-editor-root]')).toContainText('Archived');
});
