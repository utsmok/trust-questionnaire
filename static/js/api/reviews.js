import { apiRequest } from './session.js';

const encodePathPart = (value) => encodeURIComponent(String(value));

export const listReviews = () => apiRequest('/api/evaluations');

export const createReview = ({ titleSnapshot = '', currentState } = {}) =>
  apiRequest('/api/evaluations', {
    method: 'POST',
    body: {
      titleSnapshot,
      ...(currentState ? { currentState } : {}),
    },
  });

export const getReview = (reviewId) => apiRequest(`/api/evaluations/${encodePathPart(reviewId)}`);

export const saveReviewState = (reviewId, currentState, { etag, saveReason } = {}) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/state`, {
    method: 'PUT',
    headers: etag ? { 'If-Match': etag } : {},
    body: {
      currentState,
      ...(saveReason ? { saveReason } : {}),
    },
  });

export const listReviewRevisions = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/revisions`);

export const getReviewRevision = (reviewId, revisionNumber) =>
  apiRequest(
    `/api/evaluations/${encodePathPart(reviewId)}/revisions/${encodePathPart(revisionNumber)}`,
  );
