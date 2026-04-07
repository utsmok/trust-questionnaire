import { requireAuthenticatedUser, requireCsrf, toNumericId } from './evaluations.js';

const REVIEW_TEST_PLAN_ROLES = new Set(['baseline', 'comparison', 'ad_hoc', 'regression']);

const normalizeRole = (value) => {
  const normalized = String(value ?? 'baseline').trim().toLowerCase();

  if (!REVIEW_TEST_PLAN_ROLES.has(normalized)) {
    throw new Error(`Unsupported review test-plan role: ${value ?? '<missing>'}.`);
  }

  return normalized;
};

const formatUserLabel = (user, fallbackUserId = null) =>
  user?.displayName ?? user?.email ?? (fallbackUserId ? `User ${fallbackUserId}` : 'Unknown user');

const serializePlan = async (app, plan) => {
  const [testSet, revision, linkedByUser] = await Promise.all([
    app.testSetsRepository.getById(plan.testSetId),
    app.testSetRevisionsRepository.getById(plan.testSetRevisionId),
    app.userRepository.getById(plan.linkedByUserId),
  ]);

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
  };
};

export const registerReviewTestPlanRoutes = async (app) => {
  app.get('/api/evaluations/:id/test-plans', async (request, reply) => {
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

    const plans = await app.reviewTestPlansRepository.listByEvaluationId(evaluationId);
    return {
      plans: await Promise.all(plans.map((plan) => serializePlan(app, plan))),
    };
  });

  app.post('/api/evaluations/:id/test-plans', async (request, reply) => {
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
      const role = normalizeRole(request.body?.role);
      const revisionId = toNumericId(
        request.body?.testSetRevisionId ?? request.body?.revisionId,
      );

      if (!Number.isInteger(revisionId) || revisionId <= 0) {
        throw new Error('A valid published test-set revision id is required.');
      }

      const revision = await app.testSetRevisionsRepository.getById(revisionId);

      if (!revision || revision.status !== 'published') {
        return reply.code(400).send({ message: 'Only published test-set revisions can be linked.' });
      }

      const testSet = await app.testSetsRepository.getVisibleById(revision.testSetId, user.id, {
        userRole: user.role,
      });

      if (!testSet) {
        return reply.code(404).send({ message: 'Test set not found.' });
      }

      const existingPlan = await app.reviewTestPlansRepository.findByEvaluationAndRevision(
        {
          evaluationId,
          testSetRevisionId: revision.id,
          role,
        },
      );

      if (existingPlan) {
        return {
          plan: await serializePlan(app, existingPlan),
          reusedExisting: true,
        };
      }

      const plan = await app.reviewTestPlansRepository.create({
        evaluationId,
        testSetId: testSet.id,
        testSetRevisionId: revision.id,
        role,
        linkedByUserId: user.id,
      });

      return reply.code(201).send({
        plan: await serializePlan(app, plan),
      });
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });
};
