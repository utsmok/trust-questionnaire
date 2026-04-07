import pg from 'pg';

const { Client } = pg;

export const createDbClient = (env) =>
  new Client({
    connectionString: env.databaseUrl,
  });

export const getDatabaseStatus = (env) => ({
  configured: Boolean(env?.databaseUrl),
  driver: 'pg',
});
