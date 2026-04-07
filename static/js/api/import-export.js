import { apiRequest } from './session.js';

const encodePathPart = (value) => encodeURIComponent(String(value));

export const listReviewExports = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/exports`);

export const createReviewExport = (reviewId, payload) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/exports`, {
    method: 'POST',
    body: payload,
  });

export const listReviewImports = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/imports`);

export const importLegacyEvidenceManifest = (reviewId, payload) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/imports`, {
    method: 'POST',
    body: payload,
  });

export const importCanonicalReviewPackage = (payload) =>
  apiRequest('/api/import/evaluations', {
    method: 'POST',
    body: payload,
  });
