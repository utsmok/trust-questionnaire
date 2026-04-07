import { apiRequest } from './session.js';

const encodePathPart = (value) => encodeURIComponent(String(value));

export const listAssignments = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/assignments`);

export const updateAssignments = (reviewId, assignments) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/assignments`, {
    method: 'POST',
    body: { assignments },
  });

export const applyWorkflowTransition = (reviewId, { transitionId, reason = '', etag } = {}) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/transitions`, {
    method: 'POST',
    headers: etag ? { 'If-Match': etag } : {},
    body: {
      transitionId,
      ...(reason ? { reason } : {}),
    },
  });
