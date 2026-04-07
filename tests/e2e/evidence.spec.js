import { expect, test } from '@playwright/test';
import {
	applyWorkflowTransitionViaApi,
	clickElement,
	createReviewViaApi,
	getSessionStateViaApi,
	loginAsDevUser,
	logoutDevUser,
	openPage,
	updateAssignmentsViaApi,
} from './helpers.js';

const PNG_BUFFER = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2HFNwAAAABJRU5ErkJggg==',
	'base64',
);

const createEmptyEvidenceState = (titleSnapshot) => ({
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

const createReviewAndOpenWorkspace = async (page, { titleSnapshot = 'Evidence review', pageId = 'S2' } = {}) => {
	await loginAsDevUser(page);
	const primarySession = await getSessionStateViaApi(page);
	const response = await createReviewViaApi(page, createEmptyEvidenceState(titleSnapshot));
	const reviewId = response.review.id;
	const submitted = await applyWorkflowTransitionViaApi(
		page,
		reviewId,
		response.review.etag,
		'submit_nomination',
	);

	await logoutDevUser(page);
	await loginAsDevUser(page, 'coordinator');
	await updateAssignmentsViaApi(page, reviewId, {
		primaryEvaluatorUserId: primarySession.user.id,
	});
	const primaryAssigned = await applyWorkflowTransitionViaApi(
		page,
		reviewId,
		submitted.review.etag,
		'assign_primary',
	);

	await logoutDevUser(page);
	await loginAsDevUser(page);
	const started = await applyWorkflowTransitionViaApi(
		page,
		reviewId,
		primaryAssigned.review.etag,
		'start_primary_review',
	);

	await page.goto(`/reviews/${reviewId}/workspace/workflow-control`);
	await expect(page.locator('#reviewShellMount')).toBeVisible();
	await expect(page.locator('#reviewShellMount')).toContainText('Editable now');
	await openPage(page, pageId);
	return started.review;
};

test('uploads backend-backed evidence, supports preview and download, removes single links, and exports the manifest', async ({ page }) => {
	await createReviewAndOpenWorkspace(page, { titleSnapshot: 'Backend evidence upload review' });

	const block = page.locator('[data-evidence-key="evaluation"]');
	await expect(block.locator('.evidence-block-description')).toContainText('Attach review-level evidence');
	await expect(block.locator('[data-evidence-action="choose-files"]')).toBeVisible();

	await block.locator('select[data-evidence-control="type"]').selectOption('screenshot');
	await block.locator('textarea[data-evidence-control="note"]').fill('Evaluation-level screenshot');
	await block.locator('input[data-evidence-control="files"]').setInputFiles({
		name: 'evaluation-screenshot.png',
		mimeType: 'image/png',
		buffer: PNG_BUFFER,
	});
	await block.locator('[data-evidence-action="add-files"]').click();
	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('1 file');
	await expect(block.locator('[data-evidence-role="status"]')).toHaveAttribute('data-evidence-status-kind', 'ready');
	await expect(block.locator('.evidence-preview-button')).toHaveCount(1);

	await block.locator('.evidence-preview-button').click();
	await expect(page.locator('#questionnaire-evidence-lightbox')).toBeVisible();
	await page.locator('#questionnaire-evidence-lightbox .evidence-lightbox-close').click();
	await expect(page.locator('#questionnaire-evidence-lightbox')).toBeHidden();

	await block.locator('select[data-evidence-control="type"]').selectOption('export');
	await block.locator('textarea[data-evidence-control="note"]').fill('JSON export evidence');
	await block.locator('input[data-evidence-control="files"]').setInputFiles({
		name: 'trace.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify({ ok: true, kind: 'manifest-source' }), 'utf8'),
	});
	await block.locator('[data-evidence-action="add-files"]').click();
	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('2 files');
	await expect(block.locator('.evidence-file-link')).toContainText('trace.json');

	await expect(block.locator('.evidence-file-link', { hasText: 'trace.json' })).toHaveAttribute(
		'href',
		/\/api\/evaluations\/\d+\/evidence\/assets\/.+\/download/,
	);

	const manifestDownloadPromise = page.waitForEvent('download');
	await block.locator('[data-evidence-action="export-manifest"]').click();
	const manifestDownload = await manifestDownloadPromise;
	await expect(manifestDownload.suggestedFilename()).toBe('trust-evidence-manifest.json');
});

test('reuses backend-backed evidence on a criterion, supports note editing and unlink, and can remove the asset everywhere', async ({ page }) => {
	await createReviewAndOpenWorkspace(page, { titleSnapshot: 'Backend evidence reuse review' });

	const evaluationBlock = page.locator('[data-evidence-key="evaluation"]');
	await evaluationBlock.locator('select[data-evidence-control="type"]').selectOption('screenshot');
	await evaluationBlock.locator('textarea[data-evidence-control="note"]').fill('Reusable evaluation screenshot');
	await evaluationBlock.locator('input[data-evidence-control="files"]').setInputFiles({
		name: 'shared-proof.png',
		mimeType: 'image/png',
		buffer: PNG_BUFFER,
	});
	await evaluationBlock.locator('[data-evidence-action="add-files"]').click();
	await expect(evaluationBlock.locator('[data-evidence-role="count"]')).toHaveText('1 file');

	await clickElement(page.locator('.strip-cell[data-page-id="TR"]'));
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id="TR"]')).toHaveClass(/is-active/);
	await openPage(page, 'TR');

	const criterionBlock = page.locator('[data-evidence-level="criterion"][data-evidence-criterion-code="TR1"]');
	await expect(criterionBlock.locator('[data-evidence-action="choose-files"]')).toBeVisible();
	await criterionBlock.locator('select[data-evidence-control="type"]').selectOption('benchmark');
	await criterionBlock.locator('textarea[data-evidence-control="note"]').fill('Criterion reuse note');
	await criterionBlock.locator('select[data-evidence-control="existing-asset"]').selectOption({ index: 1 });
	await criterionBlock.locator('[data-evidence-action="reuse-asset"]').click();
	await expect(criterionBlock.locator('[data-evidence-role="count"]')).toHaveText('1 file');
	await expect(criterionBlock).toContainText('shared-proof.png');

	const noteField = criterionBlock.locator('.evidence-note').first();
	await noteField.click();
	const editor = criterionBlock.locator('.evidence-note-editor');
	await editor.fill('Criterion reuse note (updated)');
	await editor.blur();
	await expect(criterionBlock.locator('.evidence-note')).toContainText('Criterion reuse note (updated)');

	await criterionBlock.locator('[data-evidence-action="unlink-item"]').click();
	await expect(criterionBlock.locator('[data-evidence-role="count"]')).toHaveText('0 files');

	await criterionBlock.locator('select[data-evidence-control="type"]').selectOption('benchmark');
	await criterionBlock.locator('textarea[data-evidence-control="note"]').fill('Criterion reuse note again');
	await criterionBlock.locator('select[data-evidence-control="existing-asset"]').selectOption({ index: 1 });
	await criterionBlock.locator('[data-evidence-action="reuse-asset"]').click();
	await expect(criterionBlock.locator('[data-evidence-role="count"]')).toHaveText('1 file');

	await criterionBlock.locator('[data-evidence-action="start-replace"]').click();
	await expect(criterionBlock.locator('[data-evidence-role="status"]')).toHaveAttribute('data-evidence-status-kind', 'attention');
	await expect(criterionBlock.locator('[data-evidence-action="cancel-replace"]')).toBeEnabled();
	await criterionBlock.locator('[data-evidence-action="cancel-replace"]').click();

	await criterionBlock.locator('[data-evidence-action="remove-asset"]').click();
	await page.locator('.confirm-overlay .confirm-btn[data-primary="true"]').click();
	await expect(criterionBlock.locator('[data-evidence-role="count"]')).toHaveText('0 files');

	await clickElement(page.locator('.strip-cell[data-page-id="S2"]'));
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id="S2"]')).toHaveClass(/is-active/);
	await expect(evaluationBlock.locator('[data-evidence-role="count"]')).toHaveText('0 files');
});
