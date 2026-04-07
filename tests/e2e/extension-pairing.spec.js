import { expect, test } from '@playwright/test';

import { gotoDashboard, loginAsDevUser } from './helpers.js';

test('settings can create a pairing artifact, reflect the paired session, and revoke it', async ({
  page,
  browserName,
}) => {
  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-secondary');

  await page.goto('/settings/capture');
  await expect(page.locator('#appViewMount [data-app-surface="settings-capture"]')).toBeVisible();

  await page.locator('[data-extension-pair-start]').click();
  await expect(page.locator('[data-settings-save-state="saved"]')).toContainText(
    'Pairing code ready.',
  );

  const pairingCode = (await page.locator('[data-extension-pairing-code]').textContent())?.trim();
  expect(pairingCode).toBeTruthy();

  const exchangeResult = await page.evaluate(
    async ({ code, nextBrowserName }) => {
      const response = await fetch('/api/extension/pair/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          pairingCode: code,
          clientName: 'Playwright capture client',
          browserName: nextBrowserName,
          browserVersion: 'test-build',
          extensionVersion: '0.0.1-e2e',
        }),
      });

      return {
        status: response.status,
        payload: await response.json(),
      };
    },
    { code: pairingCode, nextBrowserName: browserName },
  );

  expect(exchangeResult.status).toBe(201);
  expect(exchangeResult.payload.session.clientName).toBe('Playwright capture client');

  await page.locator('[data-extension-sessions-refresh]').click();
  await expect(page.locator('[data-settings-save-state="saved"]')).toContainText(
    'Paired sessions refreshed.',
  );

  const sessionRow = page.locator(
    `[data-extension-session-row="${exchangeResult.payload.session.sessionId}"]`,
  );
  await expect(sessionRow).toBeVisible();
  await expect(sessionRow).toContainText('Playwright capture client');
  await expect(sessionRow).toContainText(browserName);

  await page
    .locator(
      `[data-extension-session-revoke="${exchangeResult.payload.session.sessionId}"]`,
    )
    .click();
  await expect(page.locator('[data-settings-save-state="saved"]')).toContainText(
    'Paired session revoked.',
  );
  await expect(page.locator('[data-extension-session-row]')).toHaveCount(0);
});
