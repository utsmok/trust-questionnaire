import { apiRequest } from './session.js';

const encodePathPart = (value) => encodeURIComponent(String(value));

export const listTestSets = () => apiRequest('/api/test-sets');

export const getTestSet = (testSetId) => apiRequest(`/api/test-sets/${encodePathPart(testSetId)}`);

export const createTestSet = ({
  title = '',
  description = '',
  purpose = '',
  visibility = 'team',
} = {}) =>
  apiRequest('/api/test-sets', {
    method: 'POST',
    body: {
      title,
      description,
      purpose,
      visibility,
    },
  });

export const updateTestSetDraft = (testSetId, draft) =>
  apiRequest(`/api/test-sets/${encodePathPart(testSetId)}`, {
    method: 'PATCH',
    body: draft,
  });

export const createTestSetDraftRevision = (testSetId) =>
  apiRequest(`/api/test-sets/${encodePathPart(testSetId)}/revisions`, {
    method: 'POST',
  });

export const publishTestSetRevision = (revisionId) =>
  apiRequest(`/api/test-set-revisions/${encodePathPart(revisionId)}/publish`, {
    method: 'POST',
  });

export const forkTestSet = (testSetId, { title = '', changeSummary = '' } = {}) =>
  apiRequest(`/api/test-sets/${encodePathPart(testSetId)}/fork`, {
    method: 'POST',
    body: {
      ...(title ? { title } : {}),
      ...(changeSummary ? { changeSummary } : {}),
    },
  });

export const archiveTestSet = (testSetId) =>
  apiRequest(`/api/test-sets/${encodePathPart(testSetId)}/archive`, {
    method: 'POST',
  });

export const listReviewTestPlans = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/test-plans`);

export const linkReviewTestPlan = (reviewId, { testSetRevisionId, role = 'baseline' } = {}) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/test-plans`, {
    method: 'POST',
    body: {
      testSetRevisionId,
      role,
    },
  });
