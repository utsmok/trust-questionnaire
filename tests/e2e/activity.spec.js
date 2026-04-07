import { expect, test } from '@playwright/test';

import { createReviewViaApi, gotoDashboard, loginAsDevUser } from './helpers.js';

test('review activity route records comments and shows auditable activity', async ({ page, browserName }) => {
  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');

  const created = await createReviewViaApi(page, {
    titleSnapshot: `Activity review ${browserName}`,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's0.submissionType': 'nomination',
        's0.toolName': 'Activity UI tool',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  const reviewId = created.review.id;

  await page.goto(`/reviews/${reviewId}/activity`);
  await expect(page.locator('#reviewShellMount')).toContainText('Activity');
  await expect(page.locator('#appViewMount [data-app-surface="review-activity"]')).toBeVisible();

  await page.locator('[data-comment-scope]').selectOption('criterion');
  await page.locator('[data-comment-criterion]').selectOption('TR1');
  await page.locator('[data-comment-body]').fill('Criterion comment from browser test');
  await page.locator('[data-comment-submit]').click();

  await expect(page.locator('[data-comment-feedback]')).toContainText('Comment saved.');
  await expect(page.locator('[data-activity-entry="comment"]')).toContainText(
    'Criterion comment from browser test',
  );
  await expect(page.locator('[data-activity-entry="audit_event"]').first()).toBeVisible();
});
