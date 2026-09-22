import { serve } from '@hono/node-server';
import app from './index';

const port = 8787;

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running on http://localhost:${port}`);
