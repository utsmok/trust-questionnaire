const JSON_HEADERS = {
  Accept: 'application/json',
};

let csrfToken = null;

const withJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  const isSessionPayload =
    payload &&
    typeof payload === 'object' &&
    ('authenticated' in payload || 'csrfToken' in payload);

  if (payload?.csrfToken) {
    csrfToken = payload.csrfToken;
  }

  if (isSessionPayload && payload?.authenticated === false) {
    csrfToken = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message ?? `Request failed with status ${response.status}.`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const apiRequest = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const requestHeaders = {
    ...JSON_HEADERS,
    ...headers,
  };

  if (body !== undefined && !('Content-Type' in requestHeaders)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (method !== 'GET' && method !== 'HEAD' && csrfToken) {
    requestHeaders['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return withJsonResponse(response);
};

export { apiRequest };

export const getSession = () => apiRequest('/api/me');

export const login = (username) =>
  apiRequest('/auth/login', {
    method: 'POST',
    body: { username },
  });

export const logout = async () => {
  const response = await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
  });

  if (!response.ok && response.status !== 204) {
    const payload = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null;
    const error = new Error(payload?.message ?? `Logout failed with status ${response.status}.`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  csrfToken = null;
};

export const updatePreferences = (patch) =>
  apiRequest('/api/me/preferences', {
    method: 'PATCH',
    body: patch,
  });
