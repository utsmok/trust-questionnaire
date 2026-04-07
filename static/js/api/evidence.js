import { apiRequest } from './session.js';

const encodePathPart = (value) => encodeURIComponent(String(value));

export const listEvidence = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/evidence`);

export const listReviewInbox = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/evidence/review-inbox`);

export const initializeEvidenceUpload = (reviewId, upload) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/evidence/uploads`, {
    method: 'POST',
    body: upload,
  });

export const finalizeEvidenceUpload = (reviewId, payload) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/evidence/assets`, {
    method: 'POST',
    body: payload,
  });

export const createEvidenceLink = (reviewId, payload) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/evidence/links`, {
    method: 'POST',
    body: payload,
  });

export const updateEvidenceLink = (reviewId, linkId, patch) =>
  apiRequest(
    `/api/evaluations/${encodePathPart(reviewId)}/evidence/links/${encodePathPart(linkId)}`,
    {
      method: 'PATCH',
      body: patch,
    },
  );

export const deleteEvidenceLink = (reviewId, linkId) =>
  apiRequest(
    `/api/evaluations/${encodePathPart(reviewId)}/evidence/links/${encodePathPart(linkId)}`,
    {
      method: 'DELETE',
    },
  );

export const deleteEvidenceAsset = (reviewId, assetId) =>
  apiRequest(
    `/api/evaluations/${encodePathPart(reviewId)}/evidence/assets/${encodePathPart(assetId)}`,
    {
      method: 'DELETE',
    },
  );

export const getEvidenceManifest = (reviewId) =>
  apiRequest(`/api/evaluations/${encodePathPart(reviewId)}/evidence/manifest`);

export const buildEvidenceDownloadUrl = (reviewId, assetId, { linkId = null } = {}) => {
  const query = linkId ? `?linkId=${encodePathPart(linkId)}` : '';
  return `/api/evaluations/${encodePathPart(reviewId)}/evidence/assets/${encodePathPart(assetId)}/download${query}`;
};
