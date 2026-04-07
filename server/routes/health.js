import { getDatabaseStatus } from '../db/client.js';

export const registerHealthRoutes = async (app, { env }) => {
  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'trust-questionnaire',
    sameOrigin: true,
    database: getDatabaseStatus(env),
  }));
};
