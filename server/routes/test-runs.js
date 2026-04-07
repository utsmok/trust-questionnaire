import { requireAuthenticatedUser, requireCsrf, toNumericId } from './evaluations.js';

const TEST_RUN_STATUSES = new Set([
  'not_started',
  'in_progress',
  'completed',
  'skipped',
  'blocked',
]);

const normalizeText = (value, { fallback = '', allowEmpty = true } = {}) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed && !allowEmpty) {
    return fallback;
  }

  return trimmed || fallback;
};

const normalizeOptionalText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeStatus = (value) => {
  const normalized = normalizeText(value, { fallback: 'not_started' }).toLowerCase();

  if (!TEST_RUN_STATUSES.has(normalized)) {
    throw new Error(`Unsupported test-run status: ${value ?? '<missing>'}.`);
  }

  return normalized;
};

const normalizeLinkIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => normalizeText(entry, { fallback: '' })).filter(Boolean))];
};

const isTerminalStatus = (status) => status === 'completed' || status === 'skipped' || status === 'blocked';

const formatUserLabel = (user, fallbackUserId = null) =>
  user?.displayName ?? user?.email ?? (fallbackUserId ? `User ${fallbackUserId}` : 'Unknown user');

const buildEvidenceLookup = async (app, evaluationId) => {
  const links = await app.evidenceLinkRepository.listByEvaluationId(evaluationId);
  const assetIds = [...new Set(links.map((link) => link.assetId).filter(Boolean))];
  const assets = assetIds.length > 0 ? await app.evidenceAssetRepository.getByIds(assetIds) : [];
  const assetById = new Map(assets.map((asset) => [asset.assetId, asset]));

  return new Map(
    links.map((link) => [
      link.linkId,
      {
        linkId: link.linkId,
        assetId: link.assetId,
        scopeType: link.scopeType,
        criterionCode: link.criterionCode,
        evidenceType: link.evidenceType,
        note: link.note,
        assetName:
          assetById.get(link.assetId)?.originalName ??
          assetById.get(link.assetId)?.sanitizedName ??
          link.assetId,
      },
    ]),
  );
};

const serializeRun = async (app, run, { evidenceLookup } = {}) => {
  const actor = await app.userRepository.getById(run.executedByUserId);
  const linkedEvidence = run.linkedEvidenceLinkIds
    .map((linkId) => evidenceLookup.get(linkId) ?? null)
    .filter(Boolean);

  return {
    id: run.id,
    evaluationId: run.evaluationId,
    reviewTestPlanId: run.reviewTestPlanId,
    testSetId: run.testSetId,
    testSetRevisionId: run.testSetRevisionId,
    caseOrdinal: run.caseOrdinal,
    caseTitleSnapshot: run.caseTitleSnapshot,
    criterionCode: run.criterionCode,
    status: run.status,
    resultSummary: run.resultSummary,
    resultNotes: run.resultNotes,
    linkedEvidenceLinkIds: run.linkedEvidenceLinkIds,
    linkedEvidenceCount: linkedEvidence.length,
    linkedEvidence,
    executedByUserId: run.executedByUserId,
    executedByDisplayName: formatUserLabel(actor, run.executedByUserId),
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
};

const serializePlan = async (app, plan, runByOrdinal, evidenceLookup) => {
  const [testSet, revision, linkedByUser] = await Promise.all([
    app.testSetsRepository.getById(plan.testSetId),
    app.testSetRevisionsRepository.getById(plan.testSetRevisionId),
    app.userRepository.getById(plan.linkedByUserId),
  ]);
  const cases = Array.isArray(revision?.cases) ? revision.cases : [];

  return {
    id: plan.id,
    evaluationId: plan.evaluationId,
    testSetId: plan.testSetId,
    testSetRevisionId: plan.testSetRevisionId,
    role: plan.role,
    linkedByUserId: plan.linkedByUserId,
    linkedByDisplayName: formatUserLabel(linkedByUser, plan.linkedByUserId),
    linkedAt: plan.linkedAt,
    testSet: testSet
      ? {
          id: testSet.id,
          slug: testSet.slug,
          title: testSet.title,
          status: testSet.status,
          visibility: testSet.visibility,
        }
      : null,
    revision: revision
      ? {
          id: revision.id,
          versionNumber: revision.versionNumber,
          status: revision.status,
          titleSnapshot: revision.titleSnapshot,
          caseCount: Array.isArray(revision.cases) ? revision.cases.length : 0,
          publishedAt: revision.publishedAt,
        }
      : null,
    cases: await Promise.all(
      cases.map(async (caseEntry, index) => {
        const ordinal = Number(caseEntry.ordinal ?? index + 1);
        const run = runByOrdinal.get(ordinal) ?? null;

        return {
          ordinal,
          title: normalizeText(caseEntry.title, { fallback: '' }),
          scenarioType: normalizeText(caseEntry.scenarioType, { fallback: 'exploratory' }),
          instructionText: normalizeText(
            caseEntry.instructionText ?? caseEntry.queryText ?? '',
            { fallback: '' },
          ),
          criterionCode: normalizeOptionalText(caseEntry.criterionCode),
          evidenceType: normalizeText(caseEntry.evidenceType, { fallback: 'screenshot' }),
          expectedObservationType: normalizeText(caseEntry.expectedObservationType ?? '', {
            fallback: '',
          }),
          notes: normalizeText(caseEntry.notes ?? '', { fallback: '' }),
          run: run ? await serializeRun(app, run, { evidenceLookup }) : null,
        };
      }),
    ),
  };
};

export const registerTestRunRoutes = async (app) => {
  app.get('/api/evaluations/:id/test-runs', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const evaluationId = toNumericId(request.params.id);

    if (!Number.isInteger(evaluationId) || evaluationId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    const review = await app.evaluationRepository.getVisibleById(evaluationId, user.id, {
      userRole: user.role,
    });

    if (!review) {
      return reply.code(404).send({ message: 'Review not found.' });
    }

    const [plans, runs, evidenceLookup] = await Promise.all([
      app.reviewTestPlansRepository.listByEvaluationId(evaluationId),
      app.testRunsRepository.listByEvaluationId(evaluationId),
      buildEvidenceLookup(app, evaluationId),
    ]);
    const runsByPlanId = new Map();

    runs.forEach((run) => {
      if (!runsByPlanId.has(run.reviewTestPlanId)) {
        runsByPlanId.set(run.reviewTestPlanId, new Map());
      }

      runsByPlanId.get(run.reviewTestPlanId).set(run.caseOrdinal, run);
    });

    const serializedPlans = await Promise.all(
      plans.map((plan) =>
        serializePlan(app, plan, runsByPlanId.get(plan.id) ?? new Map(), evidenceLookup),
      ),
    );

    return {
      plans: serializedPlans,
      summary: {
        planCount: serializedPlans.length,
        caseCount: serializedPlans.reduce((sum, plan) => sum + plan.cases.length, 0),
        runCount: runs.length,
        completedRunCount: runs.filter((run) => run.status === 'completed').length,
      },
    };
  });

  app.post('/api/evaluations/:id/test-runs', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    const evaluationId = toNumericId(request.params.id);

    if (!Number.isInteger(evaluationId) || evaluationId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    const review = await app.evaluationRepository.getVisibleById(evaluationId, user.id, {
      userRole: user.role,
    });

    if (!review) {
      return reply.code(404).send({ message: 'Review not found.' });
    }

    try {
      const reviewTestPlanId = toNumericId(request.body?.reviewTestPlanId);
      const caseOrdinal = toNumericId(request.body?.caseOrdinal);

      if (!Number.isInteger(reviewTestPlanId) || reviewTestPlanId <= 0) {
        throw new Error('A valid review test-plan id is required.');
      }

      if (!Number.isInteger(caseOrdinal) || caseOrdinal <= 0) {
        throw new Error('A valid test-case ordinal is required.');
      }

      const plan = (await app.reviewTestPlansRepository.listByEvaluationId(evaluationId)).find(
        (entry) => entry.id === reviewTestPlanId,
      );

      if (!plan) {
        return reply.code(404).send({ message: 'Review test plan not found.' });
      }

      const revision = await app.testSetRevisionsRepository.getById(plan.testSetRevisionId);
      const revisionCases = Array.isArray(revision?.cases) ? revision.cases : [];
      const caseEntry = revisionCases.find(
        (entry, index) => Number(entry.ordinal ?? index + 1) === caseOrdinal,
      );

      if (!caseEntry) {
        throw new Error('The linked published revision does not contain that test case ordinal.');
      }

      const linkedEvidenceLinkIds =
        request.body?.linkedEvidenceLinkIds === undefined
          ? null
          : normalizeLinkIds(request.body?.linkedEvidenceLinkIds);

      if (Array.isArray(linkedEvidenceLinkIds)) {
        const validations = await Promise.all(
          linkedEvidenceLinkIds.map((linkId) =>
            app.evidenceLinkRepository.getByIdForEvaluation({ evaluationId, linkId }),
          ),
        );

        if (validations.some((link) => !link)) {
          throw new Error('Only active evidence links from this review can be attached to a test run.');
        }
      }

      const status = normalizeStatus(request.body?.status);
      const existing = await app.testRunsRepository.findByPlanAndOrdinal({
        reviewTestPlanId,
        caseOrdinal,
      });
      const now = new Date().toISOString();
      const nextStartedAt =
        status === 'not_started'
          ? null
          : existing?.startedAt ?? now;
      const nextCompletedAt = isTerminalStatus(status)
        ? existing?.completedAt ?? now
        : null;

      const persisted = await app.testRunsRepository.upsert({
        id: existing?.id ?? null,
        evaluationId,
        reviewTestPlanId,
        testSetId: plan.testSetId,
        testSetRevisionId: plan.testSetRevisionId,
        caseOrdinal,
        caseTitleSnapshot: normalizeText(caseEntry.title, { fallback: '' }),
        criterionCode: normalizeOptionalText(caseEntry.criterionCode),
        status,
        resultSummary: normalizeText(request.body?.resultSummary ?? existing?.resultSummary ?? '', {
          fallback: '',
        }),
        resultNotes: normalizeText(request.body?.resultNotes ?? existing?.resultNotes ?? '', {
          fallback: '',
        }),
        linkedEvidenceLinkIds: linkedEvidenceLinkIds ?? existing?.linkedEvidenceLinkIds ?? [],
        executedByUserId: user.id,
        startedAt: nextStartedAt,
        completedAt: nextCompletedAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      const evidenceLookup = await buildEvidenceLookup(app, evaluationId);

      return reply.code(existing ? 200 : 201).send({
        run: await serializeRun(app, persisted, { evidenceLookup }),
      });
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });
};
