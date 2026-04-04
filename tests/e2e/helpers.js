import { expect } from '@playwright/test';

export async function gotoApp(page) {
	await page.goto('/trust-framework.html');
	await expect(page.locator('#questionnaireRenderRoot')).toHaveAttribute('data-rendered-source', 'schema');
}

export async function setWorkflow(page, workflowValue) {
	await page.locator('select[data-field-id="s0.submissionType"]').selectOption(workflowValue);
}

export async function clickElement(locator) {
	await locator.click();
}

export async function openPage(page, pageId) {
	const button = page.locator(`.page-index-button[data-page-id="${pageId}"]`);
	await expect(button).toBeEnabled();
	await clickElement(button);
	await expect(page.locator(`#questionnaireRenderRoot > [data-page-id="${pageId}"]`)).toHaveClass(/is-active/);
}
