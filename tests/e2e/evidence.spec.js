import { expect, test } from '@playwright/test';
import { gotoApp, setWorkflow, clickElement, openPage } from './helpers.js';

const PNG_BUFFER = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2HFNwAAAABJRU5ErkJggg==',
	'base64',
);

async function selectEvidenceOptionContainingText(locator, text) {
	await locator.evaluate((select, optionText) => {
		const nextOption = Array.from(select.options).find((option) => option.textContent?.includes(optionText));

		if (!nextOption) {
			throw new Error(`Missing evidence option containing: ${optionText}`);
		}

		select.value = nextOption.value;
		select.dispatchEvent(new Event('input', { bubbles: true }));
		select.dispatchEvent(new Event('change', { bubbles: true }));
	}, text);
}

test('adds evaluation evidence, supports preview/download, and exports the manifest', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await openPage(page, 'S2');

	const block = page.locator('[data-evidence-key="evaluation"]');
	const addButton = block.locator('[data-evidence-action="add-files"]');

	await expect(addButton).toBeDisabled();
	await block.locator('select[data-evidence-control="type"]').selectOption('screenshot');
	await block.locator('textarea[data-evidence-control="note"]').fill('Evaluation-level evidence note with enough detail to justify both uploaded files.');
	await block.locator('input[data-evidence-control="files"]').setInputFiles([
		{
			name: 'evaluation-screenshot.png',
			mimeType: 'image/png',
			buffer: PNG_BUFFER,
		},
		{
			name: 'trace.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify({ ok: true, kind: 'manifest-source' }), 'utf8'),
		},
	]);

	await expect(block.locator('[data-evidence-role="selection-summary"]')).toContainText('2 files selected');
	await expect(addButton).toBeEnabled();
	await addButton.click();

	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('2 files');
	await expect(block.locator('.evidence-preview-button')).toHaveCount(1);
	await expect(block.locator('.evidence-file-link')).toContainText('trace.json');

	await block.locator('.evidence-preview-button').click();
	await expect(page.locator('#questionnaire-evidence-lightbox')).toBeVisible();
	await page.locator('#questionnaire-evidence-lightbox .evidence-lightbox-close').click();
	await expect(page.locator('#questionnaire-evidence-lightbox')).toBeHidden();

	const downloadPromise = page.waitForEvent('download');
	await block.locator('[data-evidence-action="export-manifest"]').click();
	const download = await downloadPromise;
	await expect(download.suggestedFilename()).toBe('trust-evidence-manifest.json');
});

test('supports criterion add, reuse, replace, unlink, and remove-everywhere flows', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await openPage(page, 'S2');

	const evaluationBlock = page.locator('[data-evidence-key="evaluation"]');
	await evaluationBlock.locator('select[data-evidence-control="type"]').selectOption('screenshot');
	await evaluationBlock.locator('textarea[data-evidence-control="note"]').fill('Evaluation-level evidence note covering the shared files that will later be reused at criterion level.');
	await evaluationBlock.locator('input[data-evidence-control="files"]').setInputFiles([
		{
			name: 'evaluation-a.png',
			mimeType: 'image/png',
			buffer: PNG_BUFFER,
		},
		{
			name: 'evaluation-b.png',
			mimeType: 'image/png',
			buffer: PNG_BUFFER,
		},
	]);
	await evaluationBlock.locator('[data-evidence-action="add-files"]').click();
	await expect(evaluationBlock.locator('[data-evidence-role="count"]')).toHaveText('2 files');

	await clickElement(page.locator('.strip-cell[data-page-id="TR"]'));
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id="TR"]')).toHaveClass(/is-active/);

	const block = page.locator('[data-evidence-level="criterion"][data-evidence-criterion-code="TR1"]');
	await block.locator('select[data-evidence-control="type"]').selectOption('policy');
	await block.locator('textarea[data-evidence-control="note"]').fill('Criterion-specific uploaded evidence note with enough detail to create a local association.');
	await block.locator('input[data-evidence-control="files"]').setInputFiles([
		{
			name: 'criterion-upload.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('criterion upload', 'utf8'),
		},
	]);
	await block.locator('[data-evidence-action="add-files"]').click();
	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('1 file');
	await expect(block).toContainText('criterion-upload.txt');

	await block.locator('select[data-evidence-control="type"]').selectOption('benchmark');
	await block.locator('textarea[data-evidence-control="note"]').fill('Criterion reuse note preserved on the reused association rather than on the shared file alone.');
	await selectEvidenceOptionContainingText(block.locator('select[data-evidence-control="existing-asset"]'), 'evaluation-a.png');
	await expect(block.locator('[data-evidence-action="reuse-asset"]')).toBeEnabled();
	await block.locator('[data-evidence-action="reuse-asset"]').click();
	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('2 files');

	const reusedItem = block.locator('.evidence-item').filter({ hasText: 'evaluation-a.png' });
	await expect(reusedItem).toContainText('Criterion reuse note preserved on the reused association rather than on the shared file alone.');

	const uploadedItem = block.locator('.evidence-item').filter({ hasText: 'criterion-upload.txt' });
	await uploadedItem.locator('[data-evidence-action="start-replace"]').click();
	await block.locator('select[data-evidence-control="type"]').selectOption('document');
	await block.locator('textarea[data-evidence-control="note"]').fill('Replacement note carried by the criterion association after swapping in shared evidence B.');
	await selectEvidenceOptionContainingText(block.locator('select[data-evidence-control="existing-asset"]'), 'evaluation-b.png');
	await expect(block.locator('[data-evidence-action="reuse-asset"]')).toBeEnabled();
	await block.locator('[data-evidence-action="reuse-asset"]').click();

	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('2 files');
	await expect(block.locator('.evidence-item').filter({ hasText: 'criterion-upload.txt' })).toHaveCount(0);
	const replacedItem = block.locator('.evidence-item').filter({ hasText: 'evaluation-b.png' });
	await expect(replacedItem).toContainText('Replacement note carried by the criterion association after swapping in shared evidence B.');

	await reusedItem.locator('[data-evidence-action="unlink-item"]').click();
	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('1 file');
	await expect(block.locator('.evidence-item').filter({ hasText: 'evaluation-a.png' })).toHaveCount(0);

	await replacedItem.locator('[data-evidence-action="remove-asset"]').click();
	await page.locator('.confirm-overlay .confirm-btn[data-primary="true"]').click();
	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('0 files');
	await expect(block).toContainText('No evidence attached. Attach source documentation, screenshots, or methodology disclosures.');
	await expect(evaluationBlock.locator('[data-evidence-role="count"]')).toHaveText('1 file');
	await expect(evaluationBlock.locator('.evidence-item').filter({ hasText: 'evaluation-b.png' })).toHaveCount(0);
});
