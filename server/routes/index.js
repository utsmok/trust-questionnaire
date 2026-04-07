import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { registerAssignmentRoutes } from './assignments.js';
import { registerAuthRoutes } from './auth.js';
import { registerCaptureRoutes } from './captures.js';
import { registerCommentRoutes } from './comments.js';
import { registerEvidenceRoutes } from './evidence.js';
import { registerEvaluationRoutes } from './evaluations.js';
import { registerExtensionRoutes } from './extension.js';
import { registerExportRoutes } from './exports.js';
import { registerHealthRoutes } from './health.js';
import { registerImportRoutes } from './imports.js';
import { registerMeRoutes } from './me.js';
import { registerReviewTestPlanRoutes } from './review-test-plans.js';
import { registerRevisionRoutes } from './revisions.js';
import { registerTestSetRoutes } from './test-sets.js';
import { registerTestRunRoutes } from './test-runs.js';
import { registerWorkflowRoutes } from './workflow.js';

const sendCompatibilityDocument = async (reply, env) => {
  const documentPath = path.join(env.projectRoot, env.staticCompatibilityDocument);
  const html = await readFile(documentPath, 'utf8');

  return reply.type('text/html; charset=utf-8').send(html);
};

const APP_DOCUMENT_ROUTES = Object.freeze([
  '/',
  '/dashboard',
  '/reviews',
  '/tooling',
  '/tooling/test-sets/:testSetId',
  '/settings',
  '/settings/profile',
  '/settings/application',
  '/settings/capture',
  '/reviews/:reviewId',
  '/reviews/:reviewId/overview',
  '/reviews/:reviewId/review-inbox',
  '/reviews/:reviewId/activity',
  '/reviews/:reviewId/import-export',
  '/reviews/:reviewId/workspace',
  '/reviews/:reviewId/workspace/:sectionSlug',
]);

export const registerRoutes = async (app, { env, authProvider }) => {
  await registerHealthRoutes(app, { env });
  await registerAuthRoutes(app, { env, authProvider });
  await registerMeRoutes(app, { env, authProvider });
  await registerExtensionRoutes(app);
  await registerEvaluationRoutes(app);
  await registerRevisionRoutes(app);
  await registerAssignmentRoutes(app);
  await registerWorkflowRoutes(app);
  await registerEvidenceRoutes(app);
  await registerCaptureRoutes(app);
  await registerCommentRoutes(app);
  await registerExportRoutes(app);
  await registerImportRoutes(app);
  await registerTestSetRoutes(app);
  await registerReviewTestPlanRoutes(app);
  await registerTestRunRoutes(app);

  APP_DOCUMENT_ROUTES.forEach((routePath) => {
    app.get(routePath, async (_request, reply) => sendCompatibilityDocument(reply, env));
  });

  app.get(`/${env.staticCompatibilityDocument}`, async (_request, reply) =>
    sendCompatibilityDocument(reply, env),
  );
};
