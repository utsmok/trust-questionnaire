import { apiRequest } from './session.js';

const encodePathPart = (value) => encodeURIComponent(String(value));

export const listReviewTestRuns = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/test-runs`);

export const saveReviewTestRun = (
  reviewId,
  {
    reviewTestPlanId,
    caseOrdinal,
    status = 'not_started',
    resultSummary = '',
    resultNotes = '',
    linkedEvidenceLinkIds = [],
  } = {},
) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/test-runs`, {
    method: 'POST',
    body: {
      reviewTestPlanId,
      caseOrdinal,
      status,
      resultSummary,
      resultNotes,
      linkedEvidenceLinkIds,
    },
  });
