import { query } from '../db.js';
import { signPayload } from '../signature.js';

async function resolveApp(api_key) {
  const result = await query(
    `SELECT id, app_name FROM apps WHERE api_key = $1`,
    [api_key]
  );
  return result.rows[0] ?? null;
}

function requireApiKey(request, reply) {
  const api_key = request.headers['api-key'];
  if (!api_key) {
    reply.code(400).send({ error: 'Missing api-key header.' });
    return null;
  }
  return api_key;
}

export async function eventsRoutes(fastify) {
  fastify.post('/events', {
    schema: {
      body: {
        type: 'object',
        required: ['event_type', 'payload'],
        properties: {
          event_type: { type: 'string', minLength: 1 },
          payload: {},
        },
      },
    },
  }, async (request, reply) => {
    const api_key = requireApiKey(request, reply);
    if (!api_key) return;

    const app = await resolveApp(api_key);
    if (!app) return reply.code(401).send({ error: 'Invalid API key.' });

    const { event_type, payload } = request.body;
    const signature = signPayload(payload);

    const result = await query(
      `INSERT INTO events (app_id, event_type, payload, signature, status)
       VALUES ($1, $2, $3, $4, 'received')
       RETURNING id, event_type, status, created_at`,
      [app.id, event_type, JSON.stringify(payload), signature]
    );

    const event = result.rows[0];

    return reply.code(201).send({
      id: event.id,
      event_type: event.event_type,
      signature,
      status: event.status,
      timestamp: event.created_at,
    });
  });

  fastify.get('/events/app/all', async (request, reply) => {
    const api_key = requireApiKey(request, reply);
    if (!api_key) return;

    const app = await resolveApp(api_key);
    if (!app) return reply.code(401).send({ error: 'Invalid API key.' });

    const { status, event_type, from_date } = request.query;
    let limit = parseInt(request.query.limit ?? '50', 10);
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 200) limit = 200;

    const conditions = [`app_id = $1`];
    const params = [app.id];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (event_type) {
      params.push(event_type);
      conditions.push(`event_type = $${params.length}`);
    }
    if (from_date) {
      params.push(from_date);
      conditions.push(`created_at >= $${params.length}`);
    }

    params.push(limit);
    const limitPlaceholder = `$${params.length}`;

    const sql = `
      SELECT id, event_type, payload, signature, status, created_at
      FROM events
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ${limitPlaceholder}
    `;

    const result = await query(sql, params);

    return reply.code(200).send({
      app_name: app.app_name,
      total: result.rowCount,
      events: result.rows.map((e) => ({
        id: e.id,
        event_type: e.event_type,
        payload: e.payload,
        signature: e.signature,
        status: e.status,
        timestamp: e.created_at,
      })),
    });
  });

  fastify.get('/events/:id', async (request, reply) => {
    const api_key = requireApiKey(request, reply);
    if (!api_key) return;

    const app = await resolveApp(api_key);
    if (!app) return reply.code(401).send({ error: 'Invalid API key.' });

    const { id } = request.params;

    const result = await query(
      `SELECT id, app_id, event_type, payload, signature, status, created_at
       FROM events
       WHERE id = $1 AND app_id = $2`,
      [id, app.id]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Event not found.' });
    }

    const event = result.rows[0];

    return reply.code(200).send({
      id: event.id,
      app_id: event.app_id,
      event_type: event.event_type,
      payload: event.payload,
      signature: event.signature,
      status: event.status,
      timestamp: event.created_at,
    });
  });
}
