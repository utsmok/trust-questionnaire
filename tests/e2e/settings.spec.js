import { expect, test } from '@playwright/test';

import { gotoDashboard, loginAsDevUser } from './helpers.js';

test('profile defaults and application settings persist and apply on later review load', async ({ page, browserName }) => {
  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');

  await page.goto('/settings/profile');
  await expect(page.locator('#appViewMount [data-app-surface="settings-profile"]')).toBeVisible();

  const affiliation = `UT Library Systems ${browserName}`;
  await page.locator('input[name="defaultAffiliationText"]').fill(affiliation);
  await page.locator('textarea[name="defaultReviewerSignature"]').fill('Signed for TRUST review defaults.');
  await page.locator('[data-settings-submit="profile"]').click();
  await expect(page.locator('[data-settings-save-state="saved"]')).toContainText(
    'Profile defaults saved.',
  );

  await page.goto('/settings/application');
  await expect(page.locator('#appViewMount [data-app-surface="settings-application"]')).toBeVisible();
  await page.locator('select[name="preferredDensity"]').selectOption('comfortable');
  await page.locator('select[name="defaultSidebarTab"]').selectOption('reference');
  await page.locator('[data-settings-submit="application"]').click();
  await expect(page.locator('[data-settings-save-state="saved"]')).toContainText(
    'Application settings saved.',
  );

  await page.goto('/dashboard');
  await page.locator('[data-dashboard-create-title]').fill(`Settings applied review ${browserName}`);
  await page.locator('[data-dashboard-create-review]').click();

  await expect(page.locator('#appViewMount [data-app-surface="review-overview"]')).toBeVisible();
  await page.locator('[data-review-overview-resume]').click();

  await expect(page.locator('body')).toHaveAttribute('data-preferred-density', 'comfortable');
  await expect(page.locator('input[data-field-id="s0.reviewerAffiliation"]')).toHaveValue(affiliation);
  await expect(page.locator('[data-sidebar-tab="reference"]')).toHaveAttribute('aria-selected', 'true');
});
