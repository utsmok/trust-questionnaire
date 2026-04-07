import { expect, test } from '@playwright/test';

import { gotoDashboard, loginAsDevUser } from './helpers.js';

test('structured help content renders in workspace surfaces and app-level help route', async ({ page }) => {
  await gotoDashboard(page);
  await loginAsDevUser(page, 'reviewer-primary');

  await page.locator('[data-dashboard-create-title]').fill('T015 help registry review');
  await page.locator('[data-dashboard-create-review]').click();
  await expect(page.locator('#appViewMount [data-app-surface="review-overview"]')).toBeVisible();

  await page.locator('[data-review-overview-resume]').click();
  await expect(page).toHaveURL(/\/reviews\/\d+\/workspace\/workflow-control$/);

  await expect(page.locator('#sidebarPanelGuidance')).toContainText('Workflow control guidance');
  await expect(page.locator('#sidebarPanelGuidance')).toContainText(
    'Treat it as the control plane for the rest of the questionnaire.',
  );

  await page.locator('[data-sidebar-tab="reference"]').click();
  await expect(page.locator('#referenceDrawerMount')).toContainText('Standard answer sets');
  await page.locator('.reference-drawer[data-drawer-id="answer-sets"] summary').click();
  await expect(page.locator('.reference-drawer[data-drawer-id="answer-sets"]')).toContainText(
    'Criterion rating scale',
  );

  await page.locator('[data-sidebar-tab="about"]').click();
  await expect(page.locator('#aboutPanelMount')).toContainText('Framework overview');
  await expect(page.locator('#aboutPanelMount')).toContainText(
    'structured evaluation framework for AI-based information search tools',
  );

  await page.locator('a[data-route-link][href="/help"]').first().click();
  await expect(page).toHaveURL('/help');
  await expect(page.locator('#appViewMount [data-app-surface="help"]')).toBeVisible();
  await expect(page.locator('#appViewMount')).toContainText('Help, reference, and framework topics');
  await expect(page.locator('#appViewMount')).toContainText('Workflow control guidance');
  await expect(page.locator('#appViewMount')).toContainText('Evaluation scoring model');
  await expect(page.locator('#appViewMount')).toContainText('Framework overview');
  await expect(page.locator('#appViewMount')).toContainText('Global keyboard shortcuts');

  const unresolved = await page.evaluate(async () => {
    const sections = await import('/static/js/config/sections.js');
    const guidance = await import('/static/js/content/guidance-topics.js');
    const reference = await import('/static/js/content/reference-topics.js');
    const about = await import('/static/js/content/about-topics.js');

    return {
      guidance: sections.SECTION_REGISTRY.filter(
        (section) => section.contextTopicId && !guidance.GUIDANCE_TOPIC_BY_ID[section.contextTopicId],
      ).map((section) => section.id),
      reference: sections.SECTION_REGISTRY.flatMap((section) =>
        (section.referenceTopicIds ?? []).filter(
          (topicId) => !reference.REFERENCE_TOPIC_BY_ID[topicId],
        ),
      ),
      about: sections.SECTION_REGISTRY.flatMap((section) =>
        (section.aboutTopicIds ?? []).filter((topicId) => !about.ABOUT_TOPIC_BY_ID[topicId]),
      ),
    };
  });

  expect(unresolved.guidance).toEqual([]);
  expect(unresolved.reference).toEqual([]);
  expect(unresolved.about).toEqual([]);
});
