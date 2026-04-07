import { apiRequest } from './session.js';

const encodePathPart = (value) => encodeURIComponent(String(value));

export const listExtensionSessions = () => apiRequest('/api/extension/sessions');

export const startExtensionPairing = (payload = {}) =>
  apiRequest('/api/extension/pair/start', {
    method: 'POST',
    body: payload,
  });

export const revokeExtensionSession = (sessionId) =>
  apiRequest(`/api/extension/sessions/${encodePathPart(sessionId)}`, {
    method: 'DELETE',
  });
