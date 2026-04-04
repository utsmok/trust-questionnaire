import { expect, test } from '@playwright/test';
import { gotoApp, setWorkflow, clickElement } from './helpers.js';

const ACTIVE_PAGE_SELECTOR = '#questionnaireRenderRoot > [data-page-id]';

async function expectActivePage(page, pageId) {
	await expect(page.locator(`${ACTIVE_PAGE_SELECTOR}[data-page-id="${pageId}"]`)).toHaveClass(/is-active/);
	await expect(page.locator(`.page-index-button[data-page-id="${pageId}"]`)).toHaveAttribute('aria-current', 'page');
}

test('starts in nomination flow with pager constraints and disabled principle quick jumps', async ({ page }) => {
	await gotoApp(page);

	await expectActivePage(page, 'S0');
	await expect(page.locator(`${ACTIVE_PAGE_SELECTOR}[data-page-id="S1"]`)).toHaveClass(/is-page-hidden/);
	await expect(page.locator('#quickJumpMount .nav-button[data-page-id="TR"]')).toBeDisabled();
	await expect(page.locator('.page-index-button[data-page-id="TR"]')).toBeDisabled();
	await expect(page.locator('#pagerMount .pager-status')).toContainText('Page 1 of 2');
	await expect(page.locator('#pagerMount .pager-status')).toContainText('S0 Workflow Control');
	await expect(page.locator('#pagerMount [data-page-direction="previous"]')).toBeDisabled();
	await expect(page.locator('#pagerMount [data-page-direction="next"]')).toBeEnabled();

	await clickElement(page.locator('#pagerMount [data-page-direction="next"]'));

	await expectActivePage(page, 'S1');
	await expect(page.locator('#pagerMount .pager-status')).toContainText('Page 2 of 2');
	await expect(page.locator('#pagerMount .pager-status')).toContainText('S1 Tool Profile');
	await expect(page.locator('#contextSidebarMount .context-route-card')).toContainText('Tool Profile');
	await expect(page.locator('#contextSidebarMount .context-route-card')).toContainText('Tool profile and scope guidance');
});

test('enables quick jumps and context anchor routing in primary evaluation mode', async ({ page }) => {
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');

	const transparentQuickJump = page.locator('#quickJumpMount .nav-button[data-page-id="TR"]');
	await expect(transparentQuickJump).toBeEnabled();

	await clickElement(transparentQuickJump);

	await expectActivePage(page, 'TR');
	await expect(page.locator('#contextSidebarMount .context-route-card')).toContainText('Transparent');

	const anchorButton = page.locator('#contextSidebarMount .context-anchor-button', { hasText: 'TR2' });
	await clickElement(anchorButton);

	await expect(page.locator('#questionnaire-criterion-tr2')).toBeFocused();
	await expect(page.locator('#contextSidebarMount .context-anchor-button.is-active')).toContainText('TR2');

	const contextToggle = page.locator('[data-surface-toggle="contextSidebar"]').first();
	await clickElement(contextToggle);
	await expect(page.locator('#trustShell')).toHaveClass(/is-context-collapsed/);
	await clickElement(contextToggle);
	await expect(page.locator('#trustShell')).not.toHaveClass(/is-context-collapsed/);
});

test('opens info/help surfaces and returns focus after dismiss', async ({ page }) => {
	await gotoApp(page);

	const infoButton = page.locator('#quickJumpMount [data-surface-toggle="aboutSurface"]');
	await infoButton.click();
	await expect(page.locator('#aboutSurfaceMount')).toBeVisible();
	await expect(page.locator('#aboutSurfaceMount [data-surface-dismiss="aboutSurface"]')).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(page.locator('#aboutSurfaceMount')).toBeHidden();
	await expect(infoButton).toHaveAttribute('aria-expanded', 'false');

	const helpButton = page.locator('#quickJumpMount [data-surface-toggle="helpSurface"]');
	await helpButton.click();
	await expect(page.locator('#helpSurfaceMount')).toBeVisible();
	await expect(page.locator('#helpSurfaceMount [data-surface-dismiss="helpSurface"]')).toBeFocused();
	await page.locator('#helpSurfaceMount [data-surface-dismiss="helpSurface"]').click();
	await expect(page.locator('#helpSurfaceMount')).toBeHidden();
	await expect(helpButton).toHaveAttribute('aria-expanded', 'false');
});

test('uses a dismissible context drawer on narrow screens and restores focus', async ({ page }) => {
	await page.setViewportSize({ width: 1000, height: 900 });
	await gotoApp(page);
	await setWorkflow(page, 'primary_evaluation');

	const trustShell = page.locator('#trustShell');
	const contextToggle = page.locator('#quickJumpMount [data-surface-toggle="contextSidebar"]').first();
	const contextPanel = page.locator('#frameworkPanel');
	const contextClose = page.locator('#frameworkPanel [data-surface-dismiss="contextSidebar"]');
	const contextBackdrop = page.locator('#contextDrawerBackdrop');

	await expect(trustShell).toHaveClass(/is-context-drawer-mode/);
	await expect(trustShell).not.toHaveClass(/is-context-drawer-open/);
	await expect(contextPanel).toHaveAttribute('data-drawer-state', 'closed');
	await expect(contextBackdrop).toBeHidden();

	await clickElement(contextToggle);

	await expect(trustShell).toHaveClass(/is-context-drawer-open/);
	await expect(contextPanel).toHaveAttribute('data-drawer-state', 'open');
	await expect(contextBackdrop).toBeVisible();
	await expect(contextClose).toBeFocused();

	await page.keyboard.press('Escape');

	await expect(trustShell).not.toHaveClass(/is-context-drawer-open/);
	await expect(contextPanel).toHaveAttribute('data-drawer-state', 'closed');
	await expect(contextBackdrop).toBeHidden();
	await page.waitForFunction(() => {
		const activeId = document.activeElement?.id ?? '';
		return activeId === 'quickJumpContextToggle' || activeId === 'toolbarContextToggle';
	});

	const activeElementId = await page.evaluate(() => document.activeElement?.id ?? null);
	expect(['quickJumpContextToggle', 'toolbarContextToggle']).toContain(activeElementId);

	await clickElement(page.locator('#quickJumpMount .nav-button[data-page-id="TR"]'));
	await expectActivePage(page, 'TR');

	await clickElement(contextToggle);
	await expect(trustShell).toHaveClass(/is-context-drawer-open/);

	const anchorButton = page.locator('#contextSidebarMount .context-anchor-button', { hasText: 'TR2' });
	await clickElement(anchorButton);

	await expect(trustShell).not.toHaveClass(/is-context-drawer-open/);
	await expect(page.locator('#questionnaire-criterion-tr2')).toBeFocused();
});
