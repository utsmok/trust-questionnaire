import { expect, test } from '@playwright/test';

import {
  createReviewViaApi,
  gotoDashboard,
  loginAsDevUser,
  updateReviewStateViaApi,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TRUST_SAVE_QUEUE_TEST_CONFIG__ = {
      idleMs: 75,
      maxDirtyMs: 250,
      savedStateMs: 750,
    };
  });
});

test('workspace autosaves edits and reload resumes from the backend copy', async ({ page, browserName }) => {
  const title = `Autosave persistence review ${browserName}`;

  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');

  const created = await createReviewViaApi(page, {
    titleSnapshot: title,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's0.submissionType': 'nomination',
        's0.toolName': 'Original title',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  await page.goto(`/reviews/${created.review.id}/workspace/workflow-control`);
  await expect(page.locator('[data-review-save-state="clean"]')).toBeVisible();

  await page.locator('input[data-field-id="s0.toolName"]').fill('Persisted from autosave');

  await expect(page.locator('[data-review-save-state="dirty"]')).toBeVisible();
  await expect(page.locator('[data-review-save-state="saved"]')).toBeVisible();

  await page.reload();

  await expect(page.locator('input[data-field-id="s0.toolName"]')).toHaveValue(
    'Persisted from autosave',
  );
  await expect(page.locator('[data-review-save-state="clean"]')).toBeVisible();
});

test('workspace surfaces explicit optimistic-concurrency conflicts without destructive overwrite', async ({
  page,
  browserName,
}) => {
  const title = `Conflict persistence review ${browserName}`;

  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');

  const created = await createReviewViaApi(page, {
    titleSnapshot: title,
    currentState: {
      workflow: { mode: 'nomination' },
      fields: {
        's0.submissionType': 'nomination',
        's0.toolName': 'Conflict baseline',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    },
  });

  await page.goto(`/reviews/${created.review.id}/workspace/workflow-control`);
  await expect(page.locator('input[data-field-id="s0.toolName"]')).toHaveValue(
    'Conflict baseline',
  );

  await updateReviewStateViaApi(page, created.review.id, created.review.etag, {
    workflow: { mode: 'nomination' },
    fields: {
      's0.submissionType': 'nomination',
      's0.toolName': 'Server-side update',
    },
    sections: {},
    criteria: {},
    evidence: { evaluation: [], criteria: {} },
    overrides: { principleJudgments: {} },
  });

  await page.locator('input[data-field-id="s0.toolName"]').fill('Local unsaved conflict edit');

  await expect(page.locator('[data-review-save-state="dirty"]')).toBeVisible();
  await expect(page.locator('[data-review-save-state="conflict"]')).toBeVisible();
  await expect(page.locator('[data-review-save-banner="conflict"]')).toContainText(
    'authoritative server version',
  );

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-review-reload-server]').click();

  await expect(page.locator('input[data-field-id="s0.toolName"]')).toHaveValue(
    'Server-side update',
  );
  await expect(page.locator('[data-review-save-state="clean"]')).toBeVisible();
});
