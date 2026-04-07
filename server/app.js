import Fastify from 'fastify';
import { pathToFileURL } from 'node:url';

import { createAuthProvider } from './auth/oidc.js';
import { registerSessionHandling } from './auth/session.js';
import { loadRuntimeEnv } from './config/env.js';
import { registerStaticPlugin } from './plugins/static.js';
import { createAssignmentsRepository } from './repositories/assignments.js';
import { createAuditEventsRepository } from './repositories/audit-events.js';
import { createCaptureEventsRepository } from './repositories/capture-events.js';
import { createCommentsRepository } from './repositories/comments.js';
import { createEvidenceAssetsRepository } from './repositories/evidence-assets.js';
import { createEvidenceLinksRepository } from './repositories/evidence-links.js';
import { createEvaluationsRepository } from './repositories/evaluations.js';
import { createExportJobsRepository } from './repositories/export-jobs.js';
import { createImportRecordsRepository } from './repositories/import-records.js';
import { createReviewTestPlansRepository } from './repositories/review-test-plans.js';
import { createRevisionsRepository } from './repositories/revisions.js';
import { createTestSetRevisionsRepository } from './repositories/test-set-revisions.js';
import { createTestSetsRepository } from './repositories/test-sets.js';
import { createTestRunsRepository } from './repositories/test-runs.js';
import { createExtensionSessionsRepository } from './repositories/extension-sessions.js';
import { createUserPreferencesRepository } from './repositories/user-preferences.js';
import { createUsersRepository } from './repositories/users.js';
import { createWorkflowTransitionsRepository } from './repositories/workflow-transitions.js';
import { registerRoutes } from './routes/index.js';
import { createAuditLogService } from './services/audit-log.js';
import { createAuthorizationService } from './services/authorization.js';
import { createCaptureService } from './services/capture-service.js';
import { createEvidenceService } from './services/evidence-service.js';
import { createExtensionSessionService } from './services/extension-session.js';
import { createExporter } from './services/exporter.js';
import { createImporter } from './services/importer.js';
import { createObjectStore } from './storage/object-store.js';
import { createUploadPolicy } from './storage/upload-policy.js';

export const createApp = async ({
  envOverrides = {},
  logger = false,
  repositories = {},
  authProvider: authProviderOverride,
  sessionStore,
  objectStore: objectStoreOverride,
} = {}) => {
  const env = loadRuntimeEnv(envOverrides);
  const app = Fastify({ logger });
  const authProvider = authProviderOverride ?? createAuthProvider({ env });
  const userRepository = repositories.users ?? createUsersRepository({ env });
  const userPreferencesRepository =
    repositories.userPreferences ?? createUserPreferencesRepository({ env });
  const revisionRepository =
    repositories.revisions ?? createRevisionsRepository({ env });
  const assignmentsRepository =
    repositories.assignments ?? createAssignmentsRepository({ env });
  const commentsRepository = repositories.comments ?? createCommentsRepository({ env });
  const auditEventsRepository =
    repositories.auditEvents ?? createAuditEventsRepository({ env });
  const captureEventsRepository =
    repositories.captureEvents ?? createCaptureEventsRepository({ env });
  const exportJobsRepository =
    repositories.exportJobs ?? createExportJobsRepository({ env });
  const importRecordsRepository =
    repositories.importRecords ?? createImportRecordsRepository({ env });
  const testSetsRepository = repositories.testSets ?? createTestSetsRepository({ env });
  const testSetRevisionsRepository =
    repositories.testSetRevisions ?? createTestSetRevisionsRepository({ env });
  const reviewTestPlansRepository =
    repositories.reviewTestPlans ?? createReviewTestPlansRepository({ env });
  const testRunsRepository = repositories.testRuns ?? createTestRunsRepository({ env });
  const extensionSessionsRepository =
    repositories.extensionSessions ?? createExtensionSessionsRepository({ env });
  const workflowTransitionsRepository =
    repositories.workflowTransitions ?? createWorkflowTransitionsRepository({ env });
  const evaluationRepository =
    repositories.evaluations ??
    createEvaluationsRepository({ env, revisionsRepository: revisionRepository });
  const evidenceAssetRepository =
    repositories.evidenceAssets ?? createEvidenceAssetsRepository({ env });
  const evidenceLinkRepository =
    repositories.evidenceLinks ?? createEvidenceLinksRepository({ env });
  const objectStore = objectStoreOverride ?? createObjectStore({ env });
  const uploadPolicy = createUploadPolicy({ env });
  const authorizationService = createAuthorizationService();
  const auditLogService = createAuditLogService({ auditEventsRepository });
  const extensionSessionService = createExtensionSessionService({
    extensionSessionsRepository,
    secret: env.sessionSecret,
  });
  const evidenceService = createEvidenceService({
    evaluationRepository,
    evidenceAssetRepository,
    evidenceLinkRepository,
    objectStore,
    uploadPolicy,
  });
  const captureService = createCaptureService({
    evaluationRepository,
    authorizationService,
    evidenceService,
    captureEventsRepository,
    auditLogService,
  });
  const exporter = createExporter({
    evaluationRepository,
    revisionsRepository: revisionRepository,
    evidenceService,
    evidenceAssetRepository,
    evidenceLinkRepository,
    reviewTestPlansRepository,
    testSetRevisionsRepository,
    testRunsRepository,
    userRepository,
    testSetsRepository,
    assignmentsRepository,
    workflowTransitionsRepository,
    commentsRepository,
    auditEventsRepository,
    exportJobsRepository,
    objectStore,
  });
  const importer = createImporter({
    evaluationRepository,
    revisionsRepository: revisionRepository,
    evidenceService,
    commentsRepository,
    workflowTransitionsRepository,
    importRecordsRepository,
    auditLogService,
    exportJobsRepository,
  });

  app.decorate('runtimeEnv', env);
  app.decorate('authProvider', authProvider);
  app.decorate('userRepository', userRepository);
  app.decorate('userPreferencesRepository', userPreferencesRepository);
  app.decorate('revisionRepository', revisionRepository);
  app.decorate('assignmentsRepository', assignmentsRepository);
  app.decorate('commentsRepository', commentsRepository);
  app.decorate('auditEventsRepository', auditEventsRepository);
  app.decorate('captureEventsRepository', captureEventsRepository);
  app.decorate('exportJobsRepository', exportJobsRepository);
  app.decorate('importRecordsRepository', importRecordsRepository);
  app.decorate('testSetsRepository', testSetsRepository);
  app.decorate('testSetRevisionsRepository', testSetRevisionsRepository);
  app.decorate('reviewTestPlansRepository', reviewTestPlansRepository);
  app.decorate('testRunsRepository', testRunsRepository);
  app.decorate('extensionSessionsRepository', extensionSessionsRepository);
  app.decorate('workflowTransitionsRepository', workflowTransitionsRepository);
  app.decorate('evaluationRepository', evaluationRepository);
  app.decorate('authorizationService', authorizationService);
  app.decorate('auditLogService', auditLogService);
  app.decorate('extensionSessionService', extensionSessionService);
  app.decorate('evidenceAssetRepository', evidenceAssetRepository);
  app.decorate('evidenceLinkRepository', evidenceLinkRepository);
  app.decorate('objectStore', objectStore);
  app.decorate('uploadPolicy', uploadPolicy);
  app.decorate('evidenceService', evidenceService);
  app.decorate('captureService', captureService);
  app.decorate('exporter', exporter);
  app.decorate('importer', importer);

  await registerSessionHandling(app, { env, sessionStore });
  await registerStaticPlugin(app, { env });
  await registerRoutes(app, { env, authProvider });

  app.addHook('onClose', async () => {
    await Promise.all([
      userRepository.close?.(),
      userPreferencesRepository.close?.(),
      evaluationRepository.close?.(),
      revisionRepository.close?.(),
      assignmentsRepository.close?.(),
      commentsRepository.close?.(),
      auditEventsRepository.close?.(),
      captureEventsRepository.close?.(),
      exportJobsRepository.close?.(),
      importRecordsRepository.close?.(),
      testSetsRepository.close?.(),
      testSetRevisionsRepository.close?.(),
      reviewTestPlansRepository.close?.(),
      testRunsRepository.close?.(),
      extensionSessionsRepository.close?.(),
      workflowTransitionsRepository.close?.(),
      evidenceAssetRepository.close?.(),
      evidenceLinkRepository.close?.(),
      objectStore.close?.(),
    ]);
  });

  return app;
};

export const startServer = async (options = {}) => {
  const app = await createApp(options);
  const { host, port } = app.runtimeEnv;

  try {
    await app.listen({ host, port });
    return app;
  } catch (error) {
    await app.close().catch(() => {});
    throw error;
  }
};

const isEntrypoint =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntrypoint) {
  startServer({ logger: true }).catch((error) => {
    console.error('[server] failed to start:', error);
    process.exitCode = 1;
  });
}
