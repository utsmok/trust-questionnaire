import { expect, test } from '@playwright/test';
import { gotoApp, setWorkflow, clickElement, openPage } from './helpers.js';

test('switches workflow-dependent fields between nomination and review paths', async ({ page }) => {
	await gotoApp(page);

	const existingEvaluationId = page.locator('.field-group[data-field-id="s0.existingEvaluationId"]');
	const nominationReason = page.locator('.field-group[data-field-id="s0.nominationReason"]');

	await expect(existingEvaluationId).toBeHidden();
	await setWorkflow(page, 'nomination');
	await expect(nominationReason).toBeVisible();
	await expect(nominationReason).toHaveAttribute('data-field-logically-required', 'true');

	await setWorkflow(page, 'second_review');

	await expect(existingEvaluationId).toBeVisible();
	await expect(existingEvaluationId).toHaveAttribute('data-field-logically-required', 'true');
	await expect(nominationReason).toBeHidden();
});

test('applies conditional visibility and requiredness in editable pages', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await openPage(page, 'S1');

	const signInMethod = page.locator('.field-group[data-field-id="s1.signInMethod"]');
	await expect(signInMethod).toBeHidden();

	await page.locator('select[data-field-id="s1.accountRequired"]').selectOption('yes');
	await expect(signInMethod).toBeVisible();
	await expect(signInMethod).toHaveAttribute('data-field-required', 'true');

	await page.locator('select[data-field-id="s1.accountRequired"]').selectOption('no');
	await expect(signInMethod).toBeHidden();

	await openPage(page, 'S2');

	const repeatedQueryText = page.locator('.field-group[data-field-id="s2.repeatedQueryText"]');
	const benchmarkSources = page.locator('.field-group[data-field-id="s2.benchmarkSources"]');

	await expect(repeatedQueryText).toBeHidden();
	await expect(benchmarkSources).toBeHidden();

	await page.locator('select[data-field-id="s2.repeatedQueryTestPerformed"]').selectOption('yes');
	await expect(repeatedQueryText).toBeVisible();
	await expect(repeatedQueryText).toHaveAttribute('data-field-required', 'true');

	await page.locator('select[data-field-id="s2.benchmarkComparisonPerformed"]').selectOption('yes');
	await expect(benchmarkSources).toBeVisible();
	await expect(benchmarkSources).toHaveAttribute('data-field-required', 'true');
});

test('flags typed validation issues and low-score blocker rules', async ({ page }) => {
	await gotoApp(page);

	await page.locator('input[data-field-id="s0.toolUrl"]').fill('not-a-url');
	await expect(page.locator('.field-group[data-field-id="s0.toolUrl"]')).toHaveAttribute('data-field-validation-state', 'invalid');
	await expect(page.locator('.page-index-button[data-page-id="S0"]')).toHaveAttribute('data-progress-state', 'invalid_attention');

	await setWorkflow(page, 'primary_evaluation');
	await clickElement(page.locator('.strip-cell[data-page-id="TR"]'));
	await expect(page.locator('#questionnaireRenderRoot > [data-page-id="TR"]')).toHaveClass(/is-active/);

	const blockerGroup = page.locator('.field-group[data-field-id="tr1.uncertaintyOrBlockers"]');
	await expect(blockerGroup).toBeHidden();

	await page.locator('.criterion-card[data-criterion="TR1"] .rating-option').nth(1).click();
	await expect(blockerGroup).toBeVisible();
	await expect(blockerGroup).toHaveAttribute('data-field-required', 'true');

	const blockerInput = blockerGroup.locator('textarea[data-field-id="tr1.uncertaintyOrBlockers"]');
	await blockerInput.fill('too short');
	await expect(blockerGroup).toHaveAttribute('data-field-validation-state', 'invalid');

	await blockerInput.fill('Detailed blocker explanation with enough substance to satisfy the low-score follow-up rule.');
	await expect(blockerGroup).toHaveAttribute('data-field-validation-state', 'clear');
});
