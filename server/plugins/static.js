import fastifyStatic from '@fastify/static';
import path from 'node:path';

export const registerStaticPlugin = async (app, { env }) => {
  await app.register(fastifyStatic, {
    root: path.join(env.projectRoot, 'static'),
    prefix: '/static/',
  });
};
