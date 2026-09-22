import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import * as schema from './schema.sqlite';

config({ path: '.dev.vars' });

export function createDb(_env?: { DATABASE_URL: string }) {
  const url = process.env.DATABASE_URL || 'file:./data.db';
  const client = createClient({ url });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;