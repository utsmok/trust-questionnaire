import JSZip from 'jszip';
import { expect, test } from '@playwright/test';

import {
  applyWorkflowTransitionViaApi,
  createReviewViaApi,
  getSessionStateViaApi,
  loginAsDevUser,
  openPage,
  updateAssignmentsViaApi,
} from './helpers.js';

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2HFNwAAAABJRU5ErkJggg==',
  'base64',
);

const createEmptyReviewState = (titleSnapshot) => ({
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
});

const logoutViaApi = async (page) => {
  await page.evaluate(async () => {
    const sessionResponse = await fetch('/api/me', {
      headers: { Accept: 'application/json' },
    });
    const session = await sessionResponse.json();

    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: session.csrfToken ? { 'X-CSRF-Token': session.csrfToken } : {},
    });
  });
};

const prepareStartedPrimaryReview = async (page, titleSnapshot) => {
  await loginAsDevUser(page, 'reviewer-primary');
  const primarySession = await getSessionStateViaApi(page);
  const created = await createReviewViaApi(page, createEmptyReviewState(titleSnapshot));
  const reviewId = created.review.id;
  const submitted = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    created.review.etag,
    'submit_nomination',
  );

  await logoutViaApi(page);
  await loginAsDevUser(page, 'coordinator');
  await updateAssignmentsViaApi(page, reviewId, {
    primaryEvaluatorUserId: primarySession.user.id,
  });
  const assigned = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    submitted.review.etag,
    'assign_primary',
  );

  await logoutViaApi(page);
  await loginAsDevUser(page, 'reviewer-primary');
  const started = await applyWorkflowTransitionViaApi(
    page,
    reviewId,
    assigned.review.etag,
    'start_primary_review',
  );

  return started.review;
};

test('review-linked test runs save evidence provenance and export pinned revision traceability', async ({ page }) => {
  const review = await prepareStartedPrimaryReview(page, 'T018 linked run review');

  await page.goto('/tooling');
  await page.locator('[data-tooling-create-title]').fill('Execution benchmark');
  await page.locator('[data-tooling-create-form]').getByRole('button', { name: 'Create test set' }).click();
  await expect(page).toHaveURL(/\/tooling\/test-sets\/\d+$/);

  await page.locator('[data-tooling-add-case]').click();
  await page.locator('[data-tooling-case-index="0"] [data-tooling-case-field="title"]').fill('Transparent source disclosure check');
  await page.locator('[data-tooling-case-index="0"] [data-tooling-case-field="instructionText"]').fill('Run the prompt and inspect whether source disclosure is explicit.');
  await page.locator('[data-tooling-case-index="0"] [data-tooling-case-field="criterionCode"]').selectOption('TR1');
  await page.locator('[data-tooling-field="changeSummary"]').fill('Initial transparent-source execution case.');
  await page.locator('[data-tooling-editor-form]').getByRole('button', { name: 'Save draft' }).click();
  await page.locator('[data-tooling-publish]').click();
  await expect(page.locator('[data-tooling-editor-root]')).toContainText('Latest published: v1');

  await page.locator('[data-tooling-link-field="evaluationId"]').selectOption(String(review.id));
  await page.locator('[data-tooling-link-form]').getByRole('button', { name: 'Link revision' }).click();
  await expect(page.locator('[data-tooling-editor-root]')).toContainText(review.publicId);

  await page.goto(`/reviews/${review.id}/workspace/S2`);
  await expect(page.locator('#reviewShellMount')).toContainText('Editable now');
  await openPage(page, 'S2');

  const evaluationBlock = page.locator('[data-evidence-key="evaluation"]');
  await evaluationBlock.locator('select[data-evidence-control="type"]').selectOption('screenshot');
  await evaluationBlock.locator('textarea[data-evidence-control="note"]').fill('Evidence for linked test run');
  await evaluationBlock.locator('input[data-evidence-control="files"]').setInputFiles({
    name: 'linked-run-proof.png',
    mimeType: 'image/png',
    buffer: PNG_BUFFER,
  });
  await evaluationBlock.locator('[data-evidence-action="add-files"]').click();
  await expect(evaluationBlock.locator('[data-evidence-role="count"]')).toHaveText('1 file');

  const testRunPanel = page.locator('[data-test-run-panel="main"]');
  await expect(testRunPanel).toContainText('Review-linked test runs');
  await expect(testRunPanel).toContainText('Transparent source disclosure check');

  const caseCard = testRunPanel.locator('[data-test-run-case-key]').first();
  await caseCard.locator('[data-test-run-field="status"]').selectOption('completed');
  await caseCard.locator('[data-test-run-field="resultSummary"]').fill('Source disclosure was explicit.');
  await caseCard.locator('[data-test-run-field="resultNotes"]').fill('Observed citation and provenance details in the answer interface.');
  await expect(caseCard.locator('.tooling-run-evidence-item')).toContainText('linked-run-proof.png');
  await caseCard.locator('[data-test-run-field="linkedEvidenceLinkIds"]').check();
  await caseCard.locator('[data-test-run-save]').click();
  await expect(caseCard).toContainText('Run saved.');

  await expect(evaluationBlock).toContainText('1 test run');
  await expect(evaluationBlock).toContainText('TR1 · case 1');

  await openPage(page, 'TR');
  const criterionSummary = page.locator('[data-test-run-panel="criterion-summary"][data-criterion-code="TR1"]');
  await expect(criterionSummary).toContainText('1 linked case(s)');
  await expect(criterionSummary).toContainText('Transparent source disclosure check');

  const exportPackageBase64 = await page.evaluate(async (reviewIdValue) => {
    const sessionResponse = await fetch('/api/me', {
      headers: { Accept: 'application/json' },
    });
    const session = await sessionResponse.json();
    const exportResponse = await fetch(`/api/evaluations/${reviewIdValue}/exports`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        format: 'zip',
        includeEvidenceFiles: true,
        includeReportingCsv: true,
      }),
    });
    const exportPayload = await exportResponse.json();
    const downloadResponse = await fetch(
      `/api/evaluations/${reviewIdValue}/exports/${exportPayload.export.jobId}/download`,
      {
        credentials: 'same-origin',
      },
    );
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));
    return btoa(String.fromCharCode(...bytes));
  }, review.id);

  const zip = await JSZip.loadAsync(Buffer.from(exportPackageBase64, 'base64'));
  const canonicalJson = JSON.parse(await zip.file('trust-review-export.json').async('string'));
  const reviewSummaryCsv = await zip.file('reports/review-summary.csv').async('string');

  expect(canonicalJson.review.tooling.linked_test_plans).toHaveLength(1);
  expect(canonicalJson.review.tooling.linked_test_plans[0].test_set.title).toBe('Execution benchmark');
  expect(canonicalJson.review.tooling.linked_test_plans[0].revision.version_number).toBe(1);
  expect(canonicalJson.review.tooling.test_runs).toHaveLength(1);
  expect(canonicalJson.review.tooling.test_runs[0].status).toBe('completed');
  expect(canonicalJson.review.tooling.test_runs[0].criterion_code).toBe('TR1');
  expect(canonicalJson.review.tooling.test_runs[0].linked_evidence_link_ids).toHaveLength(1);
  expect(canonicalJson.review.tooling.test_runs[0].linked_evidence_asset_ids).toHaveLength(1);
  expect(reviewSummaryCsv).toContain('linked_test_plan_revisions');
  expect(reviewSummaryCsv).toContain('Execution benchmark v1 (baseline)');
});
