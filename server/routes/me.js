import {
  DEFAULT_USER_PREFERENCES,
  sanitizePreferencesPatch,
} from '../repositories/user-preferences.js';

const serializeCurrentUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  givenName: user.givenName,
  familyName: user.familyName,
  affiliation: user.affiliation,
  department: user.department,
  jobTitle: user.jobTitle,
  roles: user.role ? [user.role] : [],
});

export const serializeSessionState = ({ authProvider, session, user, preferences }) => {
  if (!session || !user) {
    return {
      authenticated: false,
      authMode: authProvider.mode,
      login: authProvider.getLoginDescriptor(),
      preferences: null,
    };
  }

  return {
    authenticated: true,
    authMode: authProvider.mode,
    csrfToken: session.csrfToken,
    user: serializeCurrentUser(user),
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      ...preferences,
    },
  };
};

export const registerMeRoutes = async (app, { authProvider }) => {
  app.get('/api/me', async (request) => {
    if (!request.authSession) {
      return serializeSessionState({ authProvider, session: null, user: null, preferences: null });
    }

    const user = await app.userRepository.getById(request.authSession.userId);

    if (!user || !user.isActive) {
      return serializeSessionState({ authProvider, session: null, user: null, preferences: null });
    }

    const preferences = await app.userPreferencesRepository.ensureForUser(user.id, {
      defaultAffiliationText: user.affiliation,
    });

    return serializeSessionState({
      authProvider,
      session: request.authSession,
      user,
      preferences,
    });
  });

  app.patch('/api/me/preferences', async (request, reply) => {
    if (!request.authSession) {
      return reply.code(401).send({ message: 'Authentication required.' });
    }

    if (!app.sessionManager.validateCsrf(request)) {
      return reply.code(403).send({ message: 'A valid CSRF token is required.' });
    }

    const patch = sanitizePreferencesPatch(request.body ?? {});

    if (!Object.keys(patch).length) {
      return reply.code(400).send({ message: 'No valid preference keys were provided.' });
    }

    const user = await app.userRepository.getById(request.authSession.userId);

    if (!user || !user.isActive) {
      return reply.code(401).send({ message: 'Authentication required.' });
    }

    const preferences = await app.userPreferencesRepository.update(user.id, patch);

    return serializeSessionState({
      authProvider,
      session: request.authSession,
      user,
      preferences,
    });
  });
};
