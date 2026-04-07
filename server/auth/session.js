import crypto from 'node:crypto';

const SESSION_COOKIE_NAME = 'trustq_session';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const parseCookies = (cookieHeader = '') => {
  const values = new Map();

  for (const chunk of cookieHeader.split(';')) {
    const [name, ...rest] = chunk.split('=');

    if (!name) {
      continue;
    }

    values.set(name.trim(), decodeURIComponent(rest.join('=').trim()));
  }

  return values;
};

const serializeCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (Number.isInteger(options.maxAge)) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires instanceof Date) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  return parts.join('; ');
};

export const createInMemorySessionStore = () => {
  const sessions = new Map();

  return {
    async get(sessionId) {
      return sessions.get(sessionId) ?? null;
    },
    async set(sessionId, value) {
      sessions.set(sessionId, value);
      return value;
    },
    async delete(sessionId) {
      sessions.delete(sessionId);
    },
  };
};

const buildCookieValue = (sessionId, secret) => {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('base64url');

  return `${sessionId}.${signature}`;
};

const verifyCookieValue = (cookieValue, secret) => {
  if (typeof cookieValue !== 'string') {
    return null;
  }

  const [sessionId, providedSignature] = cookieValue.split('.');

  if (!sessionId || !providedSignature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('base64url');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature),
  );

  return isValid ? sessionId : null;
};

export const createSessionManager = ({ env, store = createInMemorySessionStore() }) => {
  const secure = env.appOrigin.startsWith('https://') || env.nodeEnv === 'production';

  const issueSession = async (reply, { userId, role }) => {
    const sessionId = crypto.randomUUID();
    const session = {
      userId,
      role,
      csrfToken: crypto.randomBytes(24).toString('base64url'),
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    };

    await store.set(sessionId, session);

    reply.header(
      'set-cookie',
      serializeCookie(SESSION_COOKIE_NAME, buildCookieValue(sessionId, env.sessionSecret), {
        httpOnly: true,
        secure,
        sameSite: 'Lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      }),
    );

    return {
      id: sessionId,
      ...session,
    };
  };

  const readSession = async (request) => {
    const cookies = parseCookies(request.headers.cookie);
    const rawCookie = cookies.get(SESSION_COOKIE_NAME);
    const sessionId = verifyCookieValue(rawCookie, env.sessionSecret);

    if (!sessionId) {
      return null;
    }

    const session = await store.get(sessionId);

    if (!session) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      await store.delete(sessionId);
      return null;
    }

    return {
      id: sessionId,
      ...session,
    };
  };

  const clearSession = async (reply, request) => {
    const currentSession = request.authSession ?? (await readSession(request));

    if (currentSession?.id) {
      await store.delete(currentSession.id);
    }

    reply.header(
      'set-cookie',
      serializeCookie(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure,
        sameSite: 'Lax',
        path: '/',
        maxAge: 0,
        expires: new Date(0),
      }),
    );
  };

  const validateCsrf = (request) => {
    const csrfToken = request.headers['x-csrf-token'];
    return Boolean(
      request.authSession?.csrfToken &&
        typeof csrfToken === 'string' &&
        csrfToken === request.authSession.csrfToken,
    );
  };

  return {
    cookieName: SESSION_COOKIE_NAME,
    issueSession,
    readSession,
    clearSession,
    validateCsrf,
  };
};

export const registerSessionHandling = async (app, { env, sessionStore } = {}) => {
  const sessionManager = createSessionManager({ env, store: sessionStore });

  app.decorate('sessionManager', sessionManager);
  app.decorateRequest('authSession', null);

  app.addHook('onRequest', async (request) => {
    request.authSession = await sessionManager.readSession(request);
  });
};
