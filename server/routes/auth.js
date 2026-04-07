import { serializeSessionState } from './me.js';

const isOidcProvider = (authProvider) => authProvider.mode === 'oidc';

export const registerAuthRoutes = async (app, { authProvider }) => {
  app.get('/auth/login', async (_request, reply) => {
    if (isOidcProvider(authProvider)) {
      try {
        return await authProvider.startLogin();
      } catch (error) {
        return reply
          .code(error.statusCode ?? 501)
          .send({ message: error.message, authMode: authProvider.mode });
      }
    }

    return reply.send(authProvider.getLoginDescriptor());
  });

  app.get('/auth/callback', async (_request, reply) => {
    try {
      return await authProvider.handleCallback();
    } catch (error) {
      return reply
        .code(error.statusCode ?? 501)
        .send({ message: error.message, authMode: authProvider.mode });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    try {
      const identity = await authProvider.authenticate(request.body ?? {});
      const user = await app.userRepository.upsertFromIdentity(identity);
      const preferences = await app.userPreferencesRepository.ensureForUser(user.id, {
        defaultAffiliationText: user.affiliation,
      });
      const session = await app.sessionManager.issueSession(reply, {
        userId: user.id,
        role: user.role,
      });

      return reply.send(
        serializeSessionState({
          authProvider,
          session,
          user,
          preferences,
        }),
      );
    } catch (error) {
      return reply.code(error.statusCode ?? 400).send({
        message: error.message,
        code: error.code ?? 'AUTHENTICATION_FAILED',
      });
    }
  });

  app.post('/auth/logout', async (request, reply) => {
    if (request.authSession && !app.sessionManager.validateCsrf(request)) {
      return reply.code(403).send({ message: 'A valid CSRF token is required.' });
    }

    await app.sessionManager.clearSession(reply, request);
    return reply.code(204).send();
  });
};
