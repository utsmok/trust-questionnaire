import crypto from 'node:crypto';

import { CRITERIA_BY_CODE } from '../../static/js/config/questionnaire-schema.js';
import { createDbClient } from '../db/client.js';
import { requireAuthenticatedUser, requireCsrf, toNumericId } from './evaluations.js';

const TOOLING_MANAGE_ROLES = new Set(['admin', 'coordinator']);
const TEST_SET_VISIBILITIES = new Set(['private', 'team']);
const TEST_CASE_SCENARIO_TYPES = new Set([
  'known_item',
  'exploratory',
  'synthesis',
  'policy_review',
  'provenance_check',
  'workflow_integration',
  'privacy_review',
]);
const TEST_CASE_EVIDENCE_TYPES = new Set(['screenshot', 'url', 'document', 'export', 'note']);
const TOOLING_SCHEMA_VERSION = '1';

const normalizeText = (value, { fallback = '', allowNull = false } = {}) => {
  if (typeof value !== 'string') {
    return allowNull ? null : fallback;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return allowNull ? null : fallback;
  }

  return trimmed;
};

const normalizeVisibility = (value, fallback = 'team') => {
  const normalized = normalizeText(value, { fallback }).toLowerCase();

  if (!TEST_SET_VISIBILITIES.has(normalized)) {
    throw new Error(`Unsupported test-set visibility: ${value ?? '<missing>'}.`);
  }

  return normalized;
};

const normalizeScenarioType = (value) => {
  const normalized = normalizeText(value, { fallback: 'exploratory' }).toLowerCase();

  if (!TEST_CASE_SCENARIO_TYPES.has(normalized)) {
    throw new Error(`Unsupported test-case scenarioType: ${value ?? '<missing>'}.`);
  }

  return normalized;
};

const normalizeEvidenceType = (value) => {
  const normalized = normalizeText(value, { fallback: 'screenshot' }).toLowerCase();

  if (!TEST_CASE_EVIDENCE_TYPES.has(normalized)) {
    throw new Error(`Unsupported test-case evidenceType: ${value ?? '<missing>'}.`);
  }

  return normalized;
};

const normalizeCases = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('Test-set cases must be an array.');
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Case ${index + 1} must be an object.`);
    }

    const title = normalizeText(entry.title, { fallback: '' });
    const instructionText = normalizeText(entry.instructionText ?? entry.queryText ?? '', {
      fallback: '',
    });
    const criterionCode = normalizeText(entry.criterionCode ?? '', { allowNull: true });

    if (!title) {
      throw new Error(`Case ${index + 1} title is required.`);
    }

    if (!instructionText) {
      throw new Error(`Case ${index + 1} instructionText is required.`);
    }

    if (criterionCode && !CRITERIA_BY_CODE[criterionCode]) {
      throw new Error(`Case ${index + 1} references unknown criterion ${criterionCode}.`);
    }

    return {
      ordinal: index + 1,
      title,
      scenarioType: normalizeScenarioType(entry.scenarioType),
      instructionText,
      criterionCode,
      evidenceType: normalizeEvidenceType(entry.evidenceType),
      expectedObservationType: normalizeText(entry.expectedObservationType ?? '', { fallback: '' }),
      notes: normalizeText(entry.notes ?? '', { fallback: '' }),
    };
  });
};

const slugify = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const createSlug = (title) => {
  const base = slugify(title) || 'test-set';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
};

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const canManageTestSet = (testSet, user) =>
  testSet.ownerUserId === Number(user.id) || TOOLING_MANAGE_ROLES.has(user.role);

const formatUserLabel = (user, fallbackUserId = null) =>
  user?.displayName ?? user?.email ?? (fallbackUserId ? `User ${fallbackUserId}` : 'Unknown user');

const serializeRevision = async (app, revision, { includeCases = true } = {}) => {
  if (!revision) {
    return null;
  }

  const createdBy = await app.userRepository.getById(revision.createdByUserId);

  return {
    id: revision.id,
    testSetId: revision.testSetId,
    versionNumber: revision.versionNumber,
    status: revision.status,
    schemaVersion: revision.schemaVersion,
    titleSnapshot: revision.titleSnapshot,
    descriptionSnapshot: revision.descriptionSnapshot,
    purposeSnapshot: revision.purposeSnapshot,
    visibilitySnapshot: revision.visibilitySnapshot,
    changeSummary: revision.changeSummary,
    caseCount: Array.isArray(revision.cases) ? revision.cases.length : 0,
    ...(includeCases ? { cases: cloneValue(revision.cases ?? []) } : {}),
    createdByUserId: revision.createdByUserId,
    createdByDisplayName: formatUserLabel(createdBy, revision.createdByUserId),
    createdAt: revision.createdAt,
    publishedAt: revision.publishedAt,
    derivedFromRevisionId: revision.derivedFromRevisionId,
  };
};

const serializeReviewReference = (review) => ({
  id: review.id,
  publicId: review.publicId,
  titleSnapshot: review.titleSnapshot,
  workflowMode: review.workflowMode,
  lifecycleState: review.lifecycleState,
  currentRevisionNumber: review.currentRevisionNumber,
  updatedAt: review.updatedAt,
});

const serializeLinkedPlan = async (app, plan, user) => {
  const [review, revision, linkedByUser] = await Promise.all([
    app.evaluationRepository.getVisibleById(plan.evaluationId, user.id, {
      userRole: user.role,
    }),
    app.testSetRevisionsRepository.getById(plan.testSetRevisionId),
    app.userRepository.getById(plan.linkedByUserId),
  ]);

  if (!review) {
    return null;
  }

  return {
    id: plan.id,
    evaluationId: plan.evaluationId,
    testSetId: plan.testSetId,
    testSetRevisionId: plan.testSetRevisionId,
    role: plan.role,
    linkedByUserId: plan.linkedByUserId,
    linkedByDisplayName: formatUserLabel(linkedByUser, plan.linkedByUserId),
    linkedAt: plan.linkedAt,
    review: serializeReviewReference(review),
    revision: revision
      ? {
          id: revision.id,
          versionNumber: revision.versionNumber,
          titleSnapshot: revision.titleSnapshot,
          caseCount: Array.isArray(revision.cases) ? revision.cases.length : 0,
        }
      : null,
  };
};

const buildSerializedTestSetSummary = async (app, testSet, user) => {
  const [owner, currentDraftRevision, latestPublishedRevision, linkedPlans] = await Promise.all([
    app.userRepository.getById(testSet.ownerUserId),
    testSet.latestDraftRevisionId
      ? app.testSetRevisionsRepository.getById(testSet.latestDraftRevisionId)
      : Promise.resolve(null),
    testSet.latestPublishedRevisionId
      ? app.testSetRevisionsRepository.getById(testSet.latestPublishedRevisionId)
      : Promise.resolve(null),
    app.reviewTestPlansRepository.listByTestSetId(testSet.id),
  ]);

  return {
    id: testSet.id,
    slug: testSet.slug,
    title: testSet.title,
    description: testSet.description,
    purpose: testSet.purpose,
    visibility: testSet.visibility,
    status: testSet.status,
    ownerUserId: testSet.ownerUserId,
    ownerDisplayName: formatUserLabel(owner, testSet.ownerUserId),
    createdAt: testSet.createdAt,
    updatedAt: testSet.updatedAt,
    archivedAt: testSet.archivedAt,
    linkCount: linkedPlans.length,
    currentDraftRevision: await serializeRevision(app, currentDraftRevision, { includeCases: false }),
    latestPublishedRevision: await serializeRevision(app, latestPublishedRevision, {
      includeCases: false,
    }),
  };
};

const buildSerializedTestSetDetail = async (app, testSet, user) => {
  const [summary, revisions, linkedPlans] = await Promise.all([
    buildSerializedTestSetSummary(app, testSet, user),
    app.testSetRevisionsRepository.listByTestSetId(testSet.id),
    app.reviewTestPlansRepository.listByTestSetId(testSet.id),
  ]);

  const currentDraftRevision = revisions.find((revision) => revision.id === testSet.latestDraftRevisionId);
  const latestPublishedRevision = revisions.find(
    (revision) => revision.id === testSet.latestPublishedRevisionId,
  );
  const publishedRevisions = await Promise.all(
    revisions
      .filter((revision) => revision.status === 'published')
      .map((revision) => serializeRevision(app, revision)),
  );
  const serializedLinkedPlans = (
    await Promise.all(linkedPlans.map((plan) => serializeLinkedPlan(app, plan, user)))
  ).filter(Boolean);

  return {
    ...summary,
    currentDraftRevision: await serializeRevision(app, currentDraftRevision),
    latestPublishedRevision: await serializeRevision(app, latestPublishedRevision),
    publishedRevisions,
    linkedPlans: serializedLinkedPlans,
  };
};

const withToolingTransaction = async (app, callback) => {
  if (app.runtimeEnv.userStorageDriver !== 'pg') {
    return callback({ client: null });
  }

  const client = createDbClient(app.runtimeEnv);
  await client.connect();

  try {
    await client.query('BEGIN');
    const result = await callback({ client });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
};

const buildDraftRevisionInput = ({
  testSet,
  user,
  versionNumber,
  sourceRevision = null,
  override = {},
}) => ({
  testSetId: testSet.id,
  versionNumber,
  status: 'draft',
  schemaVersion: TOOLING_SCHEMA_VERSION,
  titleSnapshot: override.title ?? sourceRevision?.titleSnapshot ?? testSet.title,
  descriptionSnapshot: override.description ?? sourceRevision?.descriptionSnapshot ?? testSet.description,
  purposeSnapshot: override.purpose ?? sourceRevision?.purposeSnapshot ?? testSet.purpose,
  visibilitySnapshot: override.visibility ?? sourceRevision?.visibilitySnapshot ?? testSet.visibility,
  changeSummary: override.changeSummary ?? sourceRevision?.changeSummary ?? '',
  cases: override.cases ?? cloneValue(sourceRevision?.cases ?? []),
  createdByUserId: user.id,
  derivedFromRevisionId: sourceRevision?.id ?? null,
});

const ensureDraftRevision = async (app, testSet, user, { client } = {}) => {
  if (testSet.latestDraftRevisionId) {
    return app.testSetRevisionsRepository.getById(testSet.latestDraftRevisionId, { client });
  }

  const sourceRevision = testSet.latestPublishedRevisionId
    ? await app.testSetRevisionsRepository.getById(testSet.latestPublishedRevisionId, { client })
    : null;
  const nextDraft = await app.testSetRevisionsRepository.create(
    buildDraftRevisionInput({
      testSet,
      user,
      sourceRevision,
      versionNumber: (sourceRevision?.versionNumber ?? 0) + 1,
    }),
    { client },
  );

  await app.testSetsRepository.update(
    {
      ...testSet,
      title: nextDraft.titleSnapshot,
      description: nextDraft.descriptionSnapshot,
      purpose: nextDraft.purposeSnapshot,
      visibility: nextDraft.visibilitySnapshot,
      status: 'draft',
      latestDraftRevisionId: nextDraft.id,
      updatedAt: new Date().toISOString(),
    },
    { client },
  );

  return nextDraft;
};

export const registerTestSetRoutes = async (app) => {
  app.get('/api/test-sets', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const testSets = await app.testSetsRepository.listVisibleToUser(user.id, {
      userRole: user.role,
    });
    return {
      testSets: await Promise.all(
        testSets.map((testSet) => buildSerializedTestSetSummary(app, testSet, user)),
      ),
    };
  });

  app.post('/api/test-sets', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    try {
      const title = normalizeText(request.body?.title, { fallback: '' });

      if (!title) {
        throw new Error('Test-set title is required.');
      }

      const createdId = await withToolingTransaction(app, async ({ client }) => {
        const createdSet = await app.testSetsRepository.create(
          {
            slug: createSlug(title),
            title,
            description: normalizeText(request.body?.description ?? '', { fallback: '' }),
            purpose: normalizeText(request.body?.purpose ?? '', { fallback: '' }),
            visibility: normalizeVisibility(request.body?.visibility ?? 'team'),
            status: 'draft',
            ownerUserId: user.id,
            latestDraftRevisionId: null,
            latestPublishedRevisionId: null,
          },
          { client },
        );

        const draftRevision = await app.testSetRevisionsRepository.create(
          buildDraftRevisionInput({
            testSet: createdSet,
            user,
            versionNumber: 1,
            override: {
              title: createdSet.title,
              description: createdSet.description,
              purpose: createdSet.purpose,
              visibility: createdSet.visibility,
              changeSummary: 'Initial draft created.',
              cases: [],
            },
          }),
          { client },
        );

        await app.testSetsRepository.update(
          {
            ...createdSet,
            latestDraftRevisionId: draftRevision.id,
            updatedAt: new Date().toISOString(),
          },
          { client },
        );

        return createdSet.id;
      });

      const createdSet = await app.testSetsRepository.getVisibleById(createdId, user.id, {
        userRole: user.role,
      });
      return reply.code(201).send({
        testSet: await buildSerializedTestSetDetail(app, createdSet, user),
      });
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });

  app.get('/api/test-sets/:id', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const testSetId = toNumericId(request.params.id);

    if (!Number.isInteger(testSetId) || testSetId <= 0) {
      return reply.code(400).send({ message: 'A valid test-set id is required.' });
    }

    const testSet = await app.testSetsRepository.getVisibleById(testSetId, user.id, {
      userRole: user.role,
    });

    if (!testSet) {
      return reply.code(404).send({ message: 'Test set not found.' });
    }

    return {
      testSet: await buildSerializedTestSetDetail(app, testSet, user),
    };
  });

  app.patch('/api/test-sets/:id', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    const testSetId = toNumericId(request.params.id);

    if (!Number.isInteger(testSetId) || testSetId <= 0) {
      return reply.code(400).send({ message: 'A valid test-set id is required.' });
    }

    const testSet = await app.testSetsRepository.getVisibleById(testSetId, user.id, {
      userRole: user.role,
    });

    if (!testSet) {
      return reply.code(404).send({ message: 'Test set not found.' });
    }

    if (!canManageTestSet(testSet, user)) {
      return reply.code(403).send({ message: 'Only the test-set owner can edit this draft.' });
    }

    if (testSet.status === 'archived') {
      return reply.code(400).send({ message: 'Archived test sets cannot be edited.' });
    }

    try {
      const title = normalizeText(request.body?.title ?? testSet.title, { fallback: '' });

      if (!title) {
        throw new Error('Test-set title is required.');
      }

      const description = normalizeText(request.body?.description ?? testSet.description ?? '', {
        fallback: '',
      });
      const purpose = normalizeText(request.body?.purpose ?? testSet.purpose ?? '', {
        fallback: '',
      });
      const visibility = normalizeVisibility(request.body?.visibility ?? testSet.visibility);
      const changeSummary = normalizeText(request.body?.changeSummary ?? '', { fallback: '' });
      const cases = normalizeCases(request.body?.cases ?? []);

      await withToolingTransaction(app, async ({ client }) => {
        const latestTestSet = await app.testSetsRepository.getById(testSet.id, { client });
        const draftRevision = await ensureDraftRevision(app, latestTestSet, user, { client });
        const updatedDraft = await app.testSetRevisionsRepository.updateDraft(
          draftRevision.id,
          {
            titleSnapshot: title,
            descriptionSnapshot: description,
            purposeSnapshot: purpose,
            visibilitySnapshot: visibility,
            changeSummary,
            cases,
          },
          { client },
        );

        await app.testSetsRepository.update(
          {
            ...latestTestSet,
            title: updatedDraft.titleSnapshot,
            description: updatedDraft.descriptionSnapshot,
            purpose: updatedDraft.purposeSnapshot,
            visibility: updatedDraft.visibilitySnapshot,
            status: 'draft',
            latestDraftRevisionId: updatedDraft.id,
            updatedAt: new Date().toISOString(),
          },
          { client },
        );
      });

      const updatedTestSet = await app.testSetsRepository.getVisibleById(testSet.id, user.id, {
        userRole: user.role,
      });
      return {
        testSet: await buildSerializedTestSetDetail(app, updatedTestSet, user),
      };
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });

  app.post('/api/test-sets/:id/revisions', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    const testSetId = toNumericId(request.params.id);

    if (!Number.isInteger(testSetId) || testSetId <= 0) {
      return reply.code(400).send({ message: 'A valid test-set id is required.' });
    }

    const testSet = await app.testSetsRepository.getVisibleById(testSetId, user.id, {
      userRole: user.role,
    });

    if (!testSet) {
      return reply.code(404).send({ message: 'Test set not found.' });
    }

    if (!canManageTestSet(testSet, user)) {
      return reply.code(403).send({ message: 'Only the test-set owner can create drafts.' });
    }

    if (testSet.status === 'archived') {
      return reply.code(400).send({ message: 'Archived test sets cannot create new drafts.' });
    }

    await withToolingTransaction(app, async ({ client }) => {
      const latestTestSet = await app.testSetsRepository.getById(testSet.id, { client });
      const existingDraft = await app.testSetRevisionsRepository.findDraftByTestSetId(testSet.id, {
        client,
      });

      if (existingDraft) {
        return existingDraft;
      }

      await ensureDraftRevision(app, latestTestSet, user, { client });
      return null;
    });

    const updatedTestSet = await app.testSetsRepository.getVisibleById(testSet.id, user.id, {
      userRole: user.role,
    });
    return {
      testSet: await buildSerializedTestSetDetail(app, updatedTestSet, user),
    };
  });

  app.post('/api/test-set-revisions/:revisionId/publish', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    const revisionId = toNumericId(request.params.revisionId);

    if (!Number.isInteger(revisionId) || revisionId <= 0) {
      return reply.code(400).send({ message: 'A valid revision id is required.' });
    }

    const revision = await app.testSetRevisionsRepository.getById(revisionId);

    if (!revision) {
      return reply.code(404).send({ message: 'Revision not found.' });
    }

    const testSet = await app.testSetsRepository.getVisibleById(revision.testSetId, user.id, {
      userRole: user.role,
    });

    if (!testSet) {
      return reply.code(404).send({ message: 'Test set not found.' });
    }

    if (!canManageTestSet(testSet, user)) {
      return reply.code(403).send({ message: 'Only the test-set owner can publish drafts.' });
    }

    if (testSet.status === 'archived') {
      return reply.code(400).send({ message: 'Archived test sets cannot publish revisions.' });
    }

    if (testSet.latestDraftRevisionId !== revision.id) {
      return reply.code(400).send({ message: 'Only the active draft revision can be published.' });
    }

    try {
      await withToolingTransaction(app, async ({ client }) => {
        const latestTestSet = await app.testSetsRepository.getById(testSet.id, { client });
        const publishedRevision = await app.testSetRevisionsRepository.publish(revision.id, { client });

        if (!publishedRevision) {
          throw new Error('Draft revision could not be published.');
        }

        await app.testSetsRepository.update(
          {
            ...latestTestSet,
            title: publishedRevision.titleSnapshot,
            description: publishedRevision.descriptionSnapshot,
            purpose: publishedRevision.purposeSnapshot,
            visibility: publishedRevision.visibilitySnapshot,
            status: 'published',
            latestDraftRevisionId: null,
            latestPublishedRevisionId: publishedRevision.id,
            updatedAt: new Date().toISOString(),
          },
          { client },
        );
      });

      const updatedTestSet = await app.testSetsRepository.getVisibleById(testSet.id, user.id, {
        userRole: user.role,
      });
      return {
        publishedRevisionId: revision.id,
        testSet: await buildSerializedTestSetDetail(app, updatedTestSet, user),
      };
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });

  app.post('/api/test-sets/:id/fork', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    const testSetId = toNumericId(request.params.id);

    if (!Number.isInteger(testSetId) || testSetId <= 0) {
      return reply.code(400).send({ message: 'A valid test-set id is required.' });
    }

    const sourceSet = await app.testSetsRepository.getVisibleById(testSetId, user.id, {
      userRole: user.role,
    });

    if (!sourceSet) {
      return reply.code(404).send({ message: 'Test set not found.' });
    }

    const sourceRevision = sourceSet.latestDraftRevisionId
      ? await app.testSetRevisionsRepository.getById(sourceSet.latestDraftRevisionId)
      : sourceSet.latestPublishedRevisionId
        ? await app.testSetRevisionsRepository.getById(sourceSet.latestPublishedRevisionId)
        : null;

    if (!sourceRevision) {
      return reply.code(400).send({ message: 'The selected test set has no revision to fork.' });
    }

    const requestedTitle = normalizeText(request.body?.title ?? '', { allowNull: true });
    const forkTitle = requestedTitle ?? `${sourceRevision.titleSnapshot} copy`;

    const forkId = await withToolingTransaction(app, async ({ client }) => {
      const createdSet = await app.testSetsRepository.create(
        {
          slug: createSlug(forkTitle),
          title: forkTitle,
          description: sourceRevision.descriptionSnapshot,
          purpose: sourceRevision.purposeSnapshot,
          visibility: sourceRevision.visibilitySnapshot,
          status: 'draft',
          ownerUserId: user.id,
          latestDraftRevisionId: null,
          latestPublishedRevisionId: null,
        },
        { client },
      );

      const draftRevision = await app.testSetRevisionsRepository.create(
        buildDraftRevisionInput({
          testSet: createdSet,
          user,
          sourceRevision,
          versionNumber: 1,
          override: {
            title: forkTitle,
            description: sourceRevision.descriptionSnapshot,
            purpose: sourceRevision.purposeSnapshot,
            visibility: sourceRevision.visibilitySnapshot,
            changeSummary:
              normalizeText(request.body?.changeSummary ?? '', { allowNull: true }) ??
              `Forked from revision ${sourceRevision.versionNumber}.`,
            cases: cloneValue(sourceRevision.cases ?? []),
          },
        }),
        { client },
      );

      await app.testSetsRepository.update(
        {
          ...createdSet,
          latestDraftRevisionId: draftRevision.id,
          updatedAt: new Date().toISOString(),
        },
        { client },
      );

      return createdSet.id;
    });

    const forkedSet = await app.testSetsRepository.getVisibleById(forkId, user.id, {
      userRole: user.role,
    });
    return reply.code(201).send({
      testSet: await buildSerializedTestSetDetail(app, forkedSet, user),
    });
  });

  app.post('/api/test-sets/:id/archive', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    const testSetId = toNumericId(request.params.id);

    if (!Number.isInteger(testSetId) || testSetId <= 0) {
      return reply.code(400).send({ message: 'A valid test-set id is required.' });
    }

    const testSet = await app.testSetsRepository.getVisibleById(testSetId, user.id, {
      userRole: user.role,
    });

    if (!testSet) {
      return reply.code(404).send({ message: 'Test set not found.' });
    }

    if (!canManageTestSet(testSet, user)) {
      return reply.code(403).send({ message: 'Only the test-set owner can archive this set.' });
    }

    if (testSet.status === 'archived') {
      return {
        testSet: await buildSerializedTestSetDetail(app, testSet, user),
      };
    }

    const archivedAt = new Date().toISOString();
    await app.testSetsRepository.update({
      ...testSet,
      status: 'archived',
      archivedAt,
      updatedAt: archivedAt,
    });

    const archivedTestSet = await app.testSetsRepository.getVisibleById(testSet.id, user.id, {
      userRole: user.role,
    });
    return {
      testSet: await buildSerializedTestSetDetail(app, archivedTestSet, user),
    };
  });
};
