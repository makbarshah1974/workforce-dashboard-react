import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { machines } from '../db/schema';
import { eq, desc, and, or, ilike, count, sql } from 'drizzle-orm';
import type { AuthContext } from '../types/context';

const machineSchema = z.object({
  machine_code: z.string().min(1).max(20),
  name: z.string().min(2).max(100),
  type: z.string().min(1).max(50),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  status: z.enum(['operational', 'maintenance', 'offline', 'error']).default('operational'),
  last_maintenance: z.string().optional(),
  next_maintenance: z.string().optional(),
  specifications: z.record(z.unknown()).default({}),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const machineRoutes = new Hono<AuthContext>()
  .get('/', zValidator('query', querySchema), async (c) => {
    const { page, page_size, search, type, status, sort, order } = c.req.valid('query');
    const db = createDb(c.env);

    let query = db.select().from(machines);
    // @ts-ignore - drizzle type inference
    const conditions = [];

    if (search) {
      conditions.push(
        or(
    // @ts-ignore - drizzle type inference
          ilike(machines.name, `%${search}%`),
          ilike(machines.machine_code, `%${search}%`),
          ilike(machines.type, `%${search}%`),
          ilike(machines.location, `%${search}%`)
        )
    // @ts-ignore - drizzle type inference
      );
    }
    if (type) conditions.push(eq(machines.type, type));
    // @ts-ignore - drizzle type inference
    if (status) conditions.push(eq(machines.status, status));

    if (conditions.length) {
    // @ts-ignore - drizzle type inference
      query = query.where(and(...conditions));
    }

    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? sql`${(machines as any)[sortField]} ASC` : sql`${(machines as any)[sortField]} DESC`;
    // @ts-ignore - drizzle type inference
    query = query.orderBy(sortOrder);

    const total = await db.select({ count: count() }).from(machines).where(conditions.length ? and(...conditions) : undefined) as any;
    // @ts-ignore - drizzle type inference
    const data = await query.limit(page_size).offset((page - 1) * page_size) as any;

    return c.json({
      data,
      total: total[0].count,
    // @ts-ignore - drizzle type inference
      page,
      page_size,
      total_pages: Math.ceil(total[0].count / page_size),
    });
  })
    // @ts-ignore - drizzle type inference
  .get('/:id', async (c) => {
    // @ts-ignore - drizzle type inference
    const db = createDb(c.env);
    const machine = await db.select().from(machines).where(eq(machines.id, c.req.param('id'))).limit(1);
    if (!machine.length) return c.json({ error: 'Machine not found' }, 404);
    return c.json({ data: machine[0] });
  })
  .post('/', zValidator('json', machineSchema), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    const existing = await db.select().from(machines).where(eq(machines.machine_code, data.machine_code)).limit(1) as any;
    if (existing.length) return c.json({ error: 'Machine code already exists' }, 409);

    // @ts-ignore - drizzle type inference
    const [machine] = await db.insert(machines).values(data).returning() as any;
    return c.json({ data: machine }, 201);
  })
  .patch('/:id', zValidator('json', machineSchema.partial()), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    if (data.machine_code) {
      const existing = await db.select().from(machines).where(and(eq(machines.machine_code, data.machine_code), sql`${machines.id} != ${c.req.param('id')}`)).limit(1) as any;
      if (existing.length) return c.json({ error: 'Machine code already exists' }, 409);
    // @ts-ignore - drizzle type inference
    }
    // @ts-ignore - drizzle type inference

    // @ts-ignore - drizzle type inference
    const [machine] = await db.update(machines).set({ ...data, updated_at: new Date() }).where(eq(machines.id, c.req.param('id'))).returning() as any;
    if (!machine) return c.json({ error: 'Machine not found' }, 404);
    return c.json({ data: machine });
  })
  .delete('/:id', async (c) => {
    const db = createDb(c.env);
    const [machine] = await db.delete(machines).where(eq(machines.id, c.req.param('id'))).returning() as any;
    if (!machine) return c.json({ error: 'Machine not found' }, 404);
    return c.json({ message: 'Machine deleted' });
  })
  .get('/types/list', async (c) => {
    const db = createDb(c.env);
    const types = await db.selectDistinct({ type: machines.type }).from(machines) as any;
    return c.json({ data: types.map((t: any) => t.type) });
  })
  .get('/needing-maintenance', async (c) => {
    // @ts-ignore - drizzle type inference
    const db = createDb(c.env);
    const now = new Date();
    const machinesDue = await db.select().from(machines).where(and(
      eq(machines.status, 'operational'),
      sql`${machines.next_maintenance} <= ${now}`
    )) as any;
    return c.json({ data: machinesDue });
  });