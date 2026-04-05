import { expect, test } from '@playwright/test';
import { gotoApp, setWorkflow, clickElement, openPage } from './helpers.js';

const PNG_BUFFER = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2HFNwAAAABJRU5ErkJggg==',
	'base64',
);

test('adds evaluation evidence via auto-add, supports preview/download, and exports the manifest', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await openPage(page, 'S2');

	const block = page.locator('[data-evidence-key="evaluation"]');

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

test('supports criterion auto-add, unlink, remove-item, and remove-everywhere flows', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await openPage(page, 'S2');

	const evaluationBlock = page.locator('[data-evidence-key="evaluation"]');
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
	await expect(evaluationBlock.locator('[data-evidence-role="count"]')).toHaveText('2 files');

	await clickElement(page.locator('.strip-cell[data-page-id="TR"]'));
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id="TR"]')).toHaveClass(/is-active/);

	const block = page.locator('[data-evidence-level="criterion"][data-evidence-criterion-code="TR1"]');
	await block.locator('input[data-evidence-control="files"]').setInputFiles([
		{
			name: 'criterion-upload.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('criterion upload', 'utf8'),
		},
	]);
	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('1 file');
	await expect(block).toContainText('criterion-upload.txt');

	const uploadedItem = block.locator('.evidence-item').filter({ hasText: 'criterion-upload.txt' });

	await uploadedItem.locator('[data-evidence-action="unlink-item"]').click();
	await expect(block.locator('[data-evidence-role="count"]')).toHaveText('0 files');
	await expect(block.locator('.evidence-item').filter({ hasText: 'criterion-upload.txt' })).toHaveCount(0);

	await clickElement(page.locator('.strip-cell[data-page-id="S2"]'));
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id="S2"]')).toHaveClass(/is-active/);

	const evalItem = evaluationBlock.locator('.evidence-item').first();
	await evalItem.locator('[data-evidence-action="remove-item"]').click();
	await expect(evaluationBlock.locator('[data-evidence-role="count"]')).toHaveText('1 file');
});
