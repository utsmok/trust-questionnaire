import { expect, test } from '@playwright/test';

import {
	applyWorkflowTransitionViaApi,
	clickElement,
	createReviewViaApi,
	getSessionStateViaApi,
	gotoApp,
	loginAsDevUser,
	logoutDevUser,
	openPage,
	setWorkflow,
	updateAssignmentsViaApi,
} from './helpers.js';

const PNG_BUFFER = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2HFNwAAAABJRU5ErkJggg==',
	'base64',
);

const ACTIVE_PAGE_SELECTOR = '#questionnaireRenderRoot > [data-page-id]';

async function expectActivePage(page, pageId) {
	await expect(page.locator(`${ACTIVE_PAGE_SELECTOR}[data-page-id="${pageId}"]`)).toHaveClass(/is-active/);
	await expect(page.locator(`.page-index-button[data-page-id="${pageId}"]`)).toHaveAttribute('aria-current', 'page');
}

async function createReviewAndOpenWorkspace(page, { titleSnapshot = 'Keyboard evidence review', pageId = 'S2' } = {}) {
	await loginAsDevUser(page);
	const primarySession = await getSessionStateViaApi(page);
	const created = await createReviewViaApi(page, {
		titleSnapshot,
		workflowState: 'nomination',
	});
	const reviewId = created.review.id;
	const submitted = await applyWorkflowTransitionViaApi(
		page,
		reviewId,
		created.review.etag,
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
}

test('uses registry-driven quick jumps and completion-strip keyboard navigation', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');

	await page.keyboard.press('Alt+1');
	await expectActivePage(page, 'TR');

	const transparentStripCell = page.locator('.strip-cell[data-page-id="TR"]');
	const reliableStripCell = page.locator('.strip-cell[data-page-id="RE"]');
	await transparentStripCell.focus();
	await page.keyboard.press('ArrowRight');
	await expect(reliableStripCell).toBeFocused();
	await page.keyboard.press('Enter');
	await expectActivePage(page, 'RE');
});

test('supports keyboard navigation for sidebar tabs, anchors, and the narrow-screen drawer', async ({ page }) => {
	await page.setViewportSize({ width: 1000, height: 900 });
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');

	const sidebarToggle = page.locator('#headerBarToggles [data-sidebar-toggle]').first();
	await sidebarToggle.focus();
	await page.keyboard.press('Alt+B');
	await expect(page.locator('#trustShell')).toHaveClass(/is-context-drawer-open/);
	await expect(page.locator('#frameworkPanel [data-sidebar-dismiss]')).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(page.locator('#trustShell')).not.toHaveClass(/is-context-drawer-open/);
	await page.waitForFunction(() => document.activeElement?.id === 'sidebarToggle');

	await clickElement(page.locator('.strip-cell[data-page-id="TR"]'));
	await expectActivePage(page, 'TR');
	await page.keyboard.press('Alt+B');
	await expect(page.locator('#trustShell')).toHaveClass(/is-context-drawer-open/);

	const guidanceTab = page.locator('#sidebarTabGuidance');
	const referenceTab = page.locator('#sidebarTabReference');
	await guidanceTab.focus();
	await page.keyboard.press('ArrowRight');
	await expect(referenceTab).toBeFocused();
	await expect(referenceTab).toHaveAttribute('aria-selected', 'true');

	await page.locator('#sidebarTabGuidance').click();
	const anchorButtons = page.locator('#contextSidebarMount .context-anchor-button');
	await anchorButtons.first().focus();
	await page.keyboard.press('ArrowDown');
	await expect(anchorButtons.nth(1)).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('#trustShell')).not.toHaveClass(/is-context-drawer-open/);
	await expect(page.locator('#questionnaire-criterion-tr1')).toBeFocused();
});

test('returns focus to the evidence preview trigger after closing with Escape', async ({ page }) => {
	await createReviewAndOpenWorkspace(page, { titleSnapshot: 'Keyboard preview evidence review' });

	const block = page.locator('[data-evidence-key="evaluation"]');
	await block.locator('select[data-evidence-control="type"]').selectOption('screenshot');
	await block.locator('textarea[data-evidence-control="note"]').fill('Keyboard preview evidence');
	await block.locator('input[data-evidence-control="files"]').setInputFiles({
		name: 'keyboard-preview.png',
		mimeType: 'image/png',
		buffer: PNG_BUFFER,
	});
	await block.locator('[data-evidence-action="add-files"]').click();
	await expect(block.locator('.evidence-preview-button')).toHaveCount(1);

	const previewButton = block.locator('.evidence-preview-button').first();
	await previewButton.focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#questionnaire-evidence-lightbox')).toBeVisible();
	await expect(page.locator('#questionnaire-evidence-lightbox .evidence-lightbox-close')).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(page.locator('#questionnaire-evidence-lightbox')).toBeHidden();
	await expect(previewButton).toBeFocused();
});
