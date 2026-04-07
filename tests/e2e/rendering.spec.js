import { expect, test } from '@playwright/test';
import { gotoApp, setWorkflow, clickElement } from './helpers.js';

const CANONICAL_PAGE_IDS = ['S0', 'S1', 'S2', 'TR', 'RE', 'UC', 'SE', 'TC', 'S8', 'S9', 'S10A', 'S10B', 'S10C'];

test('renders the canonical schema-driven questionnaire inventory', async ({ page }) => {
	await gotoApp(page);

	await expect(page.locator('#questionnaireRenderRoot')).toHaveAttribute('data-rendered-page-count', '13');
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id]')).toHaveCount(13);
	await expect(page.locator('.criterion-card[data-criterion]')).toHaveCount(16);
	await expect(page.locator('.field-group[data-field-id]')).toHaveCount(123);
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
	await expect(stripCells).toHaveCount(CANONICAL_PAGE_IDS.length);
	await expect(strip.locator('[title]')).toHaveCount(0);
	await expect(strip.locator('.strip-cell[data-page-id="S0"] .strip-cell-code')).toHaveText('S0');
	await expect(strip.locator('.strip-cell[data-page-id="TR"] .strip-cell-code')).toHaveText('TR');
	await expect(strip.locator('.strip-cell[data-page-id="S10C"] .strip-cell-code')).toHaveText('S10C');
	await expect(strip.locator('.strip-cell[data-page-id="TR"]')).toHaveAttribute('aria-label', /Transparent/);
	await expect(strip.locator('.strip-cell[data-page-id="S9"]')).toHaveAttribute('aria-label', /Overall Recommendation/);
});

test('adapts shell and rating scales across responsive breakpoints', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 980 });
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await clickElement(page.locator('.strip-cell[data-page-id="TR"]'));
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id="TR"]')).toHaveClass(/is-active/);

	const shell = page.locator('#trustShell');
	const scoreDropdown = page.locator('.criterion-card[data-criterion="TR1"] .score-dropdown[data-field-id="tr1.score"]');

	const countGridColumns = async (locator) => locator.evaluate((element) => {
		const columns = getComputedStyle(element).gridTemplateColumns.trim();
		return columns.split(/\s+/).length;
	});

	expect(await countGridColumns(shell)).toBe(2);
	await expect(scoreDropdown).toBeVisible();

	await page.setViewportSize({ width: 1000, height: 980 });
	await page.waitForFunction(() => {
		const shellElement = document.querySelector('#trustShell');
		return Boolean(shellElement)
			&& getComputedStyle(shellElement).gridTemplateColumns.trim().split(/\s+/).length === 1;
	});
	expect(await countGridColumns(shell)).toBe(1);
	await expect(scoreDropdown).toBeVisible();
});

test('keeps criterion statements and evidence controls visibly explicit in dense workspace mode', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await clickElement(page.locator('.strip-cell[data-page-id="TR"]'));

	const criterionCard = page.locator('.criterion-card[data-criterion="TR1"]');
	await expect(criterionCard.locator('.criterion-card-code')).toHaveText('TR1');
	await expect(criterionCard.locator('.criterion-card-statement')).toBeVisible();
	await expect(criterionCard.locator('.criterion-card-statement')).not.toHaveText('');

	const evidenceBlock = criterionCard.locator('[data-evidence-block="true"]');
	await expect(evidenceBlock.locator('.evidence-block-title')).toHaveText(/TR1 evidence association/);
	await expect(evidenceBlock.locator('.evidence-block-description')).toContainText('Attach only evidence that directly supports TR1');
	await expect(evidenceBlock.locator('[data-evidence-action="choose-files"]')).toBeVisible();
	await expect(evidenceBlock.locator('.evidence-input-label')).toContainText(['Evidence type', 'Reuse stored evidence', 'Note']);
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

test('keeps key workspace controls legible in forced colors mode', async ({ page }) => {
	await page.emulateMedia({ forcedColors: 'active' });
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await clickElement(page.locator('.strip-cell[data-page-id="TR"]'));

	const forcedColorStyles = await page.locator('.criterion-card[data-criterion="TR1"] .criterion-card-code').evaluate((element) => {
		const styles = getComputedStyle(element);
		return {
			forcedColorAdjust: styles.forcedColorAdjust,
			borderTopStyle: styles.borderTopStyle,
		};
	});

	expect(forcedColorStyles.forcedColorAdjust).toBe('none');
	expect(forcedColorStyles.borderTopStyle).toBe('solid');
});
