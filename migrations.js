import { query } from './db.js';

export async function runMigrations() {
  console.log('Running Gbeye migrations...');

  await query(`
    CREATE TABLE IF NOT EXISTS apps (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_name    VARCHAR(255) NOT NULL,
      api_key     VARCHAR(255) UNIQUE NOT NULL,
      event_prefix VARCHAR(100),
      owner_email VARCHAR(255),
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id      UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      event_type  VARCHAR(255) NOT NULL,
      payload     JSONB,
      signature   VARCHAR(512),
      status      VARCHAR(50) DEFAULT 'received',
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS event_types (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id      UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      type_name   VARCHAR(255) NOT NULL,
      description TEXT,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  console.log('Migrations complete.');
}
