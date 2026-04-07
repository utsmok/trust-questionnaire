import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../server/app.js';

let app = null;

const getSessionCookie = (response) => {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header[0].split(';')[0] : header.split(';')[0];
};

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe('auth and current-user session routes', () => {
  it('returns an unauthenticated bootstrap payload before login', async () => {
    app = await createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      authenticated: false,
      authMode: 'dev',
      login: {
        method: 'POST',
        path: '/auth/login',
      },
    });
  });

  it('creates a session, returns current-user data, and persists preferences across reads', async () => {
    app = await createApp();

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'reviewer-primary',
      },
    });

    expect(loginResponse.statusCode).toBe(200);

    const sessionCookie = getSessionCookie(loginResponse);
    const loginPayload = loginResponse.json();

    expect(loginPayload).toMatchObject({
      authenticated: true,
      authMode: 'dev',
      user: {
        email: 'primary.reviewer@utwente.nl',
        displayName: 'Primary Reviewer',
        roles: ['member'],
      },
      preferences: {
        defaultAffiliationText: 'University of Twente',
        preferredDensity: 'compact',
      },
    });
    expect(typeof loginPayload.csrfToken).toBe('string');

    const missingCsrfUpdate = await app.inject({
      method: 'PATCH',
      url: '/api/me/preferences',
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        preferredDensity: 'comfortable',
      },
    });

    expect(missingCsrfUpdate.statusCode).toBe(403);

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/api/me/preferences',
      headers: {
        cookie: sessionCookie,
        'x-csrf-token': loginPayload.csrfToken,
      },
      payload: {
        preferredDensity: 'comfortable',
        defaultReviewerSignature: 'Primary Reviewer — TRUST',
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      authenticated: true,
      preferences: {
        preferredDensity: 'comfortable',
        defaultReviewerSignature: 'Primary Reviewer — TRUST',
      },
    });

    const currentUserResponse = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        cookie: sessionCookie,
      },
    });

    expect(currentUserResponse.statusCode).toBe(200);
    expect(currentUserResponse.json()).toMatchObject({
      authenticated: true,
      user: {
        email: 'primary.reviewer@utwente.nl',
      },
      preferences: {
        preferredDensity: 'comfortable',
        defaultReviewerSignature: 'Primary Reviewer — TRUST',
      },
    });
  });

  it('clears the session on logout and returns to an unauthenticated bootstrap payload', async () => {
    app = await createApp();

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'decision-owner',
      },
    });

    const sessionCookie = getSessionCookie(loginResponse);
    const { csrfToken } = loginResponse.json();

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: {
        cookie: sessionCookie,
        'x-csrf-token': csrfToken,
      },
    });

    expect(logoutResponse.statusCode).toBe(204);
    expect(logoutResponse.headers['set-cookie']).toMatch(/Max-Age=0/);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: {
        cookie: sessionCookie,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toMatchObject({
      authenticated: false,
    });
  });
});
