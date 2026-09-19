import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

export function createDb(env: { DATABASE_URL: string }) {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  return drizzle(pool);
}

export type Db = ReturnType<typeof createDb>;