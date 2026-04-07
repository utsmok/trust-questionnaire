import { apiRequest } from './session.js';

const encodePathPart = (value) => encodeURIComponent(String(value));

export const getReviewActivity = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/activity`);

export const listReviewComments = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/comments`);

export const createReviewComment = (reviewId, comment) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/comments`, {
    method: 'POST',
    body: comment,
  });
