import { Hono } from 'hono';
import type { Env } from '../index';

export const healthRoutes = new Hono<{ Bindings: Env }>()
  .get('/', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/ready', (c) => c.json({ status: 'ready' }))
  .get('/live', (c) => c.json({ status: 'alive' }));