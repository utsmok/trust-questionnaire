import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../server/app.js';

let app = null;

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});

describe('createApp', () => {
  it('serves the health endpoint', async () => {
    app = await createApp({
      envOverrides: {
        DATABASE_URL: 'postgres://test-user:test-pass@127.0.0.1:5432/trust_questionnaire_test',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'trust-questionnaire',
      sameOrigin: true,
      database: {
        configured: true,
        driver: 'pg',
      },
    });
  });

  it('serves the compatibility document at the app root', async () => {
    app = await createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.body).toContain('<title>TRUST Framework</title>');
    expect(response.body).toContain('id="questionnaireRenderRoot"');
  });

  it('serves existing static assets from the same origin', async () => {
    app = await createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/static/js/app.js',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript|ecmascript|text\/plain/);
    expect(response.body).toContain('bootstrapApp');
  });
});
