import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from './schema';

config({ path: '.dev.vars' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete!');

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});