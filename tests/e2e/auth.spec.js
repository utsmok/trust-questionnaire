import { expect, test } from '@playwright/test';

import { gotoApp } from './helpers.js';

test('backend auth bootstrap and logout work with the same-origin app runtime', async ({ page }) => {
	await gotoApp(page);

	const loginResult = await page.evaluate(async () => {
		const response = await fetch('/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({ username: 'reviewer-primary' }),
		});

		return {
			status: response.status,
			payload: await response.json(),
		};
	});

	expect(loginResult.status).toBe(200);
	expect(loginResult.payload).toMatchObject({
		authenticated: true,
		user: {
			email: 'primary.reviewer@utwente.nl',
		},
	});

	const currentUser = await page.evaluate(async () => {
		const response = await fetch('/api/me', {
			headers: {
				Accept: 'application/json',
			},
		});

		return response.json();
	});

	expect(currentUser).toMatchObject({
		authenticated: true,
		user: {
			displayName: 'Primary Reviewer',
		},
	});

	const logoutStatus = await page.evaluate(async () => {
		const sessionResponse = await fetch('/api/me', {
			headers: {
				Accept: 'application/json',
			},
		});
		const sessionPayload = await sessionResponse.json();
		const logoutResponse = await fetch('/auth/logout', {
			method: 'POST',
			headers: {
				'X-CSRF-Token': sessionPayload.csrfToken,
			},
		});

		return logoutResponse.status;
	});

	expect(logoutStatus).toBe(204);

	const afterLogout = await page.evaluate(async () => {
		const response = await fetch('/api/me', {
			headers: {
				Accept: 'application/json',
			},
		});

		return response.json();
	});

	expect(afterLogout).toMatchObject({
		authenticated: false,
		login: {
			path: '/auth/login',
		},
	});
});
