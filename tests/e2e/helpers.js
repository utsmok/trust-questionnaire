import { expect } from '@playwright/test';

export async function gotoApp(page) {
	await page.goto('/trust-framework.html');
	await expect(page.locator('#questionnaireRenderRoot')).toHaveAttribute('data-rendered-source', 'schema');
}

export async function gotoDashboard(page) {
	await page.goto('/dashboard');
	await expect(page.locator('#appViewMount')).toBeVisible();
}

export async function loginAsDevUser(page, username = 'reviewer-primary') {
	await gotoDashboard(page);
	await page.locator(`[data-auth-login-username="${username}"]`).click();
	await expect.poll(async () => {
		const session = await getSessionStateViaApi(page);
		return Boolean(session?.authenticated);
	}).toBe(true);
	await expect(page.locator('#appViewMount [data-app-surface="dashboard"]')).toBeVisible();
}

export async function createReviewViaApi(page, payload = {}) {
	return page.evaluate(async (requestPayload) => {
		const sessionResponse = await fetch('/api/me', {
			headers: {
				Accept: 'application/json',
			},
		});
		const session = await sessionResponse.json();
		const response = await fetch('/api/evaluations', {
			method: 'POST',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'X-CSRF-Token': session.csrfToken,
			},
			body: JSON.stringify(requestPayload),
		});

		return response.json();
	}, payload);
}

export async function getSessionStateViaApi(page) {
	return page.evaluate(async () => {
		const response = await fetch('/api/me', {
			headers: {
				Accept: 'application/json',
			},
		});

		return response.json();
	});
}

export async function updateReviewStateViaApi(page, reviewId, etag, currentState) {
	return page.evaluate(
		async ({ nextReviewId, nextEtag, nextState }) => {
			const sessionResponse = await fetch('/api/me', {
				headers: {
					Accept: 'application/json',
				},
			});
			const session = await sessionResponse.json();
			const response = await fetch(`/api/evaluations/${nextReviewId}/state`, {
				method: 'PUT',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'X-CSRF-Token': session.csrfToken,
					'If-Match': nextEtag,
				},
				body: JSON.stringify({
					currentState: nextState,
					saveReason: 'manual_save',
				}),
			});

			return response.json();
		},
		{ nextReviewId: reviewId, nextEtag: etag, nextState: currentState },
	);
}

export async function updateAssignmentsViaApi(page, reviewId, assignments) {
	return page.evaluate(
		async ({ nextReviewId, nextAssignments }) => {
			const sessionResponse = await fetch('/api/me', {
				headers: {
					Accept: 'application/json',
				},
			});
			const session = await sessionResponse.json();
			const response = await fetch(`/api/evaluations/${nextReviewId}/assignments`, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'X-CSRF-Token': session.csrfToken,
				},
				body: JSON.stringify({ assignments: nextAssignments }),
			});

			return response.json();
		},
		{ nextReviewId: reviewId, nextAssignments: assignments },
	);
}

export async function applyWorkflowTransitionViaApi(page, reviewId, etag, transitionId, reason = '') {
	return page.evaluate(
		async ({ nextReviewId, nextEtag, nextTransitionId, nextReason }) => {
			const sessionResponse = await fetch('/api/me', {
				headers: {
					Accept: 'application/json',
				},
			});
			const session = await sessionResponse.json();
			const response = await fetch(`/api/evaluations/${nextReviewId}/transitions`, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'X-CSRF-Token': session.csrfToken,
					'If-Match': nextEtag,
				},
				body: JSON.stringify({
					transitionId: nextTransitionId,
					...(nextReason ? { reason: nextReason } : {}),
				}),
			});

			return response.json();
		},
		{ nextReviewId: reviewId, nextEtag: etag, nextTransitionId: transitionId, nextReason: reason },
	);
}

export async function logoutDevUser(page) {
	const logoutButton = page.locator('[data-auth-logout]');

	if ((await logoutButton.count()) === 0) {
		return;
	}

	await logoutButton.click();
	await expect.poll(async () => {
		const session = await getSessionStateViaApi(page);
		return Boolean(session?.authenticated);
	}).toBe(false);
	await expect(page.locator('#appViewMount [data-app-surface="auth"]')).toBeVisible();
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
