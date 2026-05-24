import { randomUUID } from 'crypto';
import { query } from '../db.js';

export async function appsRoutes(fastify) {
  fastify.post('/apps/register', {
    schema: {
      body: {
        type: 'object',
        required: ['app_name', 'owner_email'],
        properties: {
          app_name: { type: 'string', minLength: 1 },
          owner_email: { type: 'string', format: 'email' },
          event_prefix: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { app_name, owner_email, event_prefix = '' } = request.body;

    const api_key = randomUUID();

    const result = await query(
      `INSERT INTO apps (id, app_name, api_key, event_prefix, owner_email)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING app_name, event_prefix, created_at`,
      [app_name, api_key, event_prefix, owner_email]
    );

    const app = result.rows[0];

    return reply.code(201).send({
      message: `Welcome to Gbeye, ${app.app_name}! Save your API key — it will never be shown again.`,
      app_name: app.app_name,
      api_key,
      event_prefix: app.event_prefix,
    });
  });

  fastify.get('/apps/verify', async (request, reply) => {
    const api_key = request.headers['api-key'];

    if (!api_key) {
      return reply.code(400).send({
        verified: false,
        message: 'Missing api-key header.',
      });
    }

    const result = await query(
      `SELECT app_name, event_prefix, owner_email, created_at
       FROM apps
       WHERE api_key = $1`,
      [api_key]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({
        verified: false,
        message: 'No app found for the provided API key.',
      });
    }

    const app = result.rows[0];

    return reply.code(200).send({
      verified: true,
      message: 'App is registered and active.',
      app_name: app.app_name,
      event_prefix: app.event_prefix,
      owner_email: app.owner_email,
      registered_at: app.created_at,
    });
  });
}
