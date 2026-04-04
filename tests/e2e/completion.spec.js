import { expect, test } from '@playwright/test';
import { gotoApp, setWorkflow, clickElement, openPage } from './helpers.js';

async function expectPageProgress(page, pageId, progressState) {
	await expect(page.locator(`.page-index-button[data-page-id="${pageId}"]`)).toHaveAttribute('data-progress-state', progressState);
}

test('tracks page progress through not-started, in-progress, invalid, complete, and skipped states', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');

	await clickElement(page.locator('#quickJumpMount .nav-button[data-page-id="TR"]'));
	await expectPageProgress(page, 'TR', 'not_started');

	await page.locator('select[data-section-record-key="sectionSkipReasonCode"][data-section-id="TR"]').selectOption('test_not_performed');
	await page.locator('textarea[data-section-record-key="sectionSkipRationale"][data-section-id="TR"]').fill('Detailed skip rationale explaining why this page is intentionally skipped in the active evaluation.');
	await expectPageProgress(page, 'TR', 'skipped');

	await openPage(page, 'S1');
	await page.locator('input[data-field-id="s1.vendor"]').fill('University of Twente test vendor');
	await expectPageProgress(page, 'S1', 'in_progress');

	await openPage(page, 'S0');
	await page.locator('input[data-field-id="s0.toolUrl"]').fill('invalid-url');
	await expectPageProgress(page, 'S0', 'invalid_attention');

	await page.locator('input[data-field-id="s0.toolName"]').fill('TRUST evaluation harness');
	await page.locator('input[data-field-id="s0.toolUrl"]').fill('https://example.org/tool');
	await page.locator('select[data-field-id="s0.responderRole"]').selectOption('information_specialist');
	await expectPageProgress(page, 'S0', 'complete');
});

test('criterion skip uses explicit skip controls and suppresses child criterion requirements until resumed', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await clickElement(page.locator('#quickJumpMount .nav-button[data-page-id="TR"]'));

	const card = page.locator('.criterion-card[data-criterion="TR1"]');
	const scoreGroup = card.locator('.field-group[data-field-id="tr1.score"]');
	const skipButton = card.locator('[data-criterion-action="toggle-skip"][data-criterion-code="TR1"]');
	const skipReason = card.locator('select[data-criterion-record-key="skipReasonCode"][data-criterion-code="TR1"]');
	const skipRationale = card.locator('textarea[data-criterion-record-key="skipRationale"][data-criterion-code="TR1"]');

	await expect(scoreGroup).toBeVisible();
	await expect(skipReason).toBeDisabled();

	await skipButton.click();
	await expect(card).toHaveAttribute('data-criterion-skip-state', 'user_skipped');
	await expect(card).toHaveAttribute('data-criterion-validation-state', 'attention');
	await expect(scoreGroup).toBeHidden();
	await expect(scoreGroup).toHaveAttribute('data-field-suppressed-by-skip', 'true');
	await expect(skipReason).toBeEnabled();

	await skipReason.selectOption('access_blocked');
	await skipRationale.fill('Detailed criterion-level skip rationale explaining why this criterion cannot be assessed in the current evaluation cycle.');
	await expect(card).toHaveAttribute('data-criterion-validation-state', 'clear');

	await skipButton.click();
	await expect(card).toHaveAttribute('data-criterion-skip-state', 'not_started');
	await expect(scoreGroup).toBeVisible();
	await expect(scoreGroup).not.toHaveAttribute('data-field-suppressed-by-skip', 'true');
	await expect(skipReason).toBeDisabled();
	await expect(skipRationale).toHaveAttribute('aria-readonly', 'true');
});

test('surfaces blocked or escalated overall progress when critical fails require governance follow-up', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');
	await openPage(page, 'S8');

	await page.locator('input[type="checkbox"][data-field-id="s8.criticalFailFlags"]').first().check();
	await page.locator('textarea[data-field-id="s8.criticalFailNotes"]').fill('Critical fail note with enough detail to keep the flag active while governance follow-up remains unresolved.');

	await expect(page.locator('#trustShell')).toHaveAttribute('data-progress-state', 'blocked_escalated');
	await expect(page.locator('.header-progress-summary')).toHaveAttribute('data-progress-state', 'blocked_escalated');
	await expect(page.locator('.header-progress-summary')).toContainText('1 escalated');
});
