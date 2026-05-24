import 'dotenv/config';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';
import { runMigrations } from './migrations.js';
import { appsRoutes } from './routes/apps.js';
import { eventsRoutes } from './routes/events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({ logger: true });

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

fastify.register(staticPlugin, {
  root: join(__dirname, 'public'),
  prefix: '/',
});

fastify.register(appsRoutes);
fastify.register(eventsRoutes);

fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    service: 'gbeye',
    timestamp: new Date().toISOString(),
  };
});

const start = async () => {
  try {
    await runMigrations();
    await fastify.listen({ port: Number(PORT), host: HOST });
    fastify.log.info(`Gbeye running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
