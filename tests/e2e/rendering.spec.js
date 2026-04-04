import { expect, test } from '@playwright/test';
import { gotoApp, setWorkflow, clickElement } from './helpers.js';

const CANONICAL_PAGE_IDS = ['S0', 'S1', 'S2', 'TR', 'RE', 'UC', 'SE', 'TC', 'S8', 'S9', 'S10A', 'S10B', 'S10C'];

test('renders the canonical schema-driven questionnaire inventory', async ({ page }) => {
	await gotoApp(page);

	await expect(page.locator('#questionnaireRenderRoot')).toHaveAttribute('data-rendered-page-count', '13');
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id]')).toHaveCount(13);
	await expect(page.locator('.criterion-card[data-criterion]')).toHaveCount(16);
	await expect(page.locator('.field-group[data-field-id]')).toHaveCount(135);
	await expect(page.locator('[data-evidence-block="true"]')).toHaveCount(17);

	const pageIds = await page.locator('#questionnaireRenderRoot > [data-page-id]').evaluateAll((elements) =>
		elements.map((element) => element.dataset.pageId),
	);

	expect(pageIds).toEqual(CANONICAL_PAGE_IDS);
});

test('renders explicit completion-strip labels without native tooltips', async ({ page }) => {
	await gotoApp(page);

	const strip = page.locator('.completion-strip');
	const stripCells = strip.locator('.strip-cell');

	await expect(strip).toHaveAttribute('aria-labelledby', 'completionStripLabel');
	await expect(strip).toHaveAttribute('aria-describedby', 'headerProgressSummary');
	await expect(page.locator('#headerProgressSummary')).toBeVisible();
	await expect(stripCells).toHaveCount(CANONICAL_PAGE_IDS.length);
	await expect(strip.locator('[title]')).toHaveCount(0);
	await expect(strip.locator('.strip-cell[data-page-id="S0"] .strip-cell-code')).toHaveText('S0');
	await expect(strip.locator('.strip-cell[data-page-id="TR"] .strip-cell-code')).toHaveText('TR');
	await expect(strip.locator('.strip-cell[data-page-id="S10C"] .strip-cell-code')).toHaveText('S10C');
	await expect(strip.locator('.strip-cell[data-page-id="TR"] .strip-cell-description')).toContainText('Transparent');
	await expect(strip.locator('.strip-cell[data-page-id="S9"] .strip-cell-description')).toContainText('Overall Recommendation');
	await expect(page.locator('.header-progress-title')).toContainText('Questionnaire progress');
});

test('adapts shell and rating scales across responsive breakpoints', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 980 });
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await clickElement(page.locator('#quickJumpMount .nav-button[data-page-id="TR"]'));
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id="TR"]')).toHaveClass(/is-active/);

	const shell = page.locator('#trustShell');
	const ratingScale = page.locator('.criterion-card[data-criterion="TR1"] .rating-scale');

	const countGridColumns = async (locator) => locator.evaluate((element) => {
		const columns = getComputedStyle(element).gridTemplateColumns.trim();
		return columns.split(/\s+/).length;
	});

	expect(await countGridColumns(shell)).toBe(2);
	expect(await countGridColumns(ratingScale)).toBe(4);

	await page.setViewportSize({ width: 1000, height: 980 });
	await page.waitForFunction(() => {
		const shellElement = document.querySelector('#trustShell');
		return Boolean(shellElement)
			&& getComputedStyle(shellElement).gridTemplateColumns.trim().split(/\s+/).length === 1;
	});
	expect(await countGridColumns(shell)).toBe(1);

	await page.setViewportSize({ width: 740, height: 980 });
	await page.waitForFunction(() => {
		const scale = document.querySelector('.criterion-card[data-criterion="TR1"] .rating-scale');
		return Boolean(scale)
			&& getComputedStyle(scale).gridTemplateColumns.trim().split(/\s+/).length === 2;
	});
	expect(await countGridColumns(ratingScale)).toBe(2);

	await page.setViewportSize({ width: 460, height: 980 });
	await page.waitForFunction(() => {
		const scale = document.querySelector('.criterion-card[data-criterion="TR1"] .rating-scale');
		return Boolean(scale)
			&& getComputedStyle(scale).gridTemplateColumns.trim().split(/\s+/).length === 1;
	});
	expect(await countGridColumns(ratingScale)).toBe(1);
});

test('honors reduced-motion token overrides when the media preference requests it', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await gotoApp(page);

	const durations = await page.evaluate(() => {
		const rootStyles = getComputedStyle(document.documentElement);
		return {
			instant: rootStyles.getPropertyValue('--duration-instant').trim(),
			fast: rootStyles.getPropertyValue('--duration-fast').trim(),
			normal: rootStyles.getPropertyValue('--duration-normal').trim(),
		};
	});

	expect(durations).toEqual({
		instant: '0ms',
		fast: '0ms',
		normal: '0ms',
	});
});
