const DEV_AUTH_USERS = Object.freeze([
  {
    username: 'reviewer-primary',
    externalSubjectId: 'dev-reviewer-primary',
    email: 'primary.reviewer@utwente.nl',
    displayName: 'Primary Reviewer',
    givenName: 'Primary',
    familyName: 'Reviewer',
    affiliation: 'University of Twente',
    department: 'EIS-IS',
    jobTitle: 'Information Specialist',
    role: 'member',
  },
  {
    username: 'reviewer-secondary',
    externalSubjectId: 'dev-reviewer-secondary',
    email: 'second.reviewer@utwente.nl',
    displayName: 'Second Reviewer',
    givenName: 'Second',
    familyName: 'Reviewer',
    affiliation: 'University of Twente',
    department: 'EIS-IS',
    jobTitle: 'Collection Specialist',
    role: 'member',
  },
  {
    username: 'decision-owner',
    externalSubjectId: 'dev-decision-owner',
    email: 'decision.owner@utwente.nl',
    displayName: 'Decision Owner',
    givenName: 'Decision',
    familyName: 'Owner',
    affiliation: 'University of Twente',
    department: 'EIS-IS',
    jobTitle: 'Team Coordinator',
    role: 'decision_member',
  },
  {
    username: 'coordinator',
    externalSubjectId: 'dev-coordinator',
    email: 'coordinator@utwente.nl',
    displayName: 'Coordinator',
    givenName: 'Review',
    familyName: 'Coordinator',
    affiliation: 'University of Twente',
    department: 'EIS-IS',
    jobTitle: 'Programme Coordinator',
    role: 'coordinator',
  },
]);

const DEV_AUTH_USER_MAP = new Map(
  DEV_AUTH_USERS.map((user) => [user.username, Object.freeze({ ...user })]),
);

const serializeDevUserSummary = ({ username, displayName, email, role }) => ({
  username,
  displayName,
  email,
  role,
});

const createNotImplementedError = (detail) => {
  const error = new Error(detail);
  error.statusCode = 501;
  return error;
};

const createDevAuthProvider = () => ({
  mode: 'dev',
  getLoginDescriptor() {
    return {
      mode: 'dev',
      method: 'POST',
      path: '/auth/login',
      allowedUsers: DEV_AUTH_USERS.map(serializeDevUserSummary),
    };
  },
  async authenticate(credentials = {}) {
    const username =
      typeof credentials.username === 'string' ? credentials.username.trim() : '';

    if (!username || !DEV_AUTH_USER_MAP.has(username)) {
      const error = new Error('Unknown development user.');
      error.statusCode = 401;
      error.code = 'UNKNOWN_DEV_USER';
      throw error;
    }

    return DEV_AUTH_USER_MAP.get(username);
  },
});

const createOidcAuthProvider = (env) => ({
  mode: 'oidc',
  getLoginDescriptor() {
    return {
      mode: 'oidc',
      method: 'GET',
      path: '/auth/login',
      issuerConfigured: Boolean(env.oidcIssuerUrl && env.oidcClientId),
      callbackPath: '/auth/callback',
    };
  },
  async authenticate() {
    throw createNotImplementedError(
      'OIDC sign-in is reserved for a later integration pass. Use AUTH_MODE=dev for local validation.',
    );
  },
  async startLogin() {
    throw createNotImplementedError(
      'OIDC login initiation is scaffolded but not implemented in this wave.',
    );
  },
  async handleCallback() {
    throw createNotImplementedError(
      'OIDC callback handling is scaffolded but not implemented in this wave.',
    );
  },
});

export const createAuthProvider = ({ env }) =>
  env.authMode === 'oidc' ? createOidcAuthProvider(env) : createDevAuthProvider();

export const getDevAuthUsers = () => DEV_AUTH_USERS.map(serializeDevUserSummary);
