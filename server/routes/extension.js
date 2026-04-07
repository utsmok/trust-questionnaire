import { requireAuthenticatedUser, requireCsrf } from './evaluations.js';
import { isExtensionSessionError } from '../services/extension-session.js';

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const serializeExtensionSession = (session) => ({
  sessionId: session.sessionId,
  clientName: session.clientName,
  browserName: session.browserName,
  browserVersion: session.browserVersion,
  extensionVersion: session.extensionVersion,
  scopes: session.scopes,
  pairedAt: session.pairedAt,
  lastSeenAt: session.lastSeenAt,
  lastRefreshedAt: session.lastRefreshedAt,
  accessExpiresAt: session.accessExpiresAt,
  refreshExpiresAt: session.refreshExpiresAt,
  revokedAt: session.revokedAt,
});

const serializePairingArtifact = (pairing) => ({
  pairingId: pairing.pairingId,
  pairingCode: pairing.pairingCode,
  label: pairing.label,
  scopes: pairing.scopes,
  createdAt: pairing.createdAt,
  expiresAt: pairing.expiresAt,
});

const serializeIssuedSession = (issued) => ({
  session: serializeExtensionSession(issued.session),
  accessToken: issued.accessToken,
  accessExpiresAt: issued.accessExpiresAt,
  refreshToken: issued.refreshToken,
  refreshExpiresAt: issued.refreshExpiresAt,
});

const sendExtensionError = (reply, error) => {
  if (isExtensionSessionError(error)) {
    return reply.code(error.statusCode).send({ message: error.message });
  }

  return reply.code(500).send({ message: 'Extension session request failed.' });
};

const extractBearerToken = (request) => {
  const authorization = normalizeText(request.headers.authorization);

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return normalizeText(authorization.slice('Bearer '.length));
};

export const registerExtensionRoutes = async (app) => {
  app.get('/api/extension/sessions', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    try {
      const sessions = await app.extensionSessionService.listUserSessions(user.id);
      return {
        sessions: sessions.map((session) => serializeExtensionSession(session)),
      };
    } catch (error) {
      return sendExtensionError(reply, error);
    }
  });

  app.post('/api/extension/pair/start', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    try {
      const pairing = await app.extensionSessionService.startPairing({
        userId: user.id,
        label: request.body?.label,
      });

      return reply.code(201).send({ pairing: serializePairingArtifact(pairing) });
    } catch (error) {
      return sendExtensionError(reply, error);
    }
  });

  app.post('/api/extension/pair/exchange', async (request, reply) => {
    try {
      const issued = await app.extensionSessionService.exchangePairing({
        pairingCode: request.body?.pairingCode,
        clientName: request.body?.clientName,
        browserName: request.body?.browserName,
        browserVersion: request.body?.browserVersion,
        extensionVersion: request.body?.extensionVersion,
      });

      return reply.code(201).send(serializeIssuedSession(issued));
    } catch (error) {
      return sendExtensionError(reply, error);
    }
  });

  app.post('/api/extension/session/refresh', async (request, reply) => {
    try {
      const issued = await app.extensionSessionService.refreshSession({
        refreshToken: request.body?.refreshToken,
      });

      return reply.send(serializeIssuedSession(issued));
    } catch (error) {
      return sendExtensionError(reply, error);
    }
  });

  app.delete('/api/extension/session/current', async (request, reply) => {
    const accessToken = extractBearerToken(request);

    if (!accessToken) {
      return reply.code(401).send({ message: 'A valid extension access token is required.' });
    }

    try {
      await app.extensionSessionService.revokeCurrentSession({
        accessToken,
        revokeReason: 'extension_session_closed',
      });

      return reply.code(204).send();
    } catch (error) {
      return sendExtensionError(reply, error);
    }
  });

  app.delete('/api/extension/sessions/:sessionId', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    try {
      await app.extensionSessionService.revokeSession({
        sessionId: request.params.sessionId,
        actorUserId: user.id,
        revokeReason: 'revoked_from_settings',
      });

      return reply.code(204).send();
    } catch (error) {
      return sendExtensionError(reply, error);
    }
  });
};
