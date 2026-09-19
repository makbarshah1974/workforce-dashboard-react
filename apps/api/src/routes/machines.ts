import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { machines } from '../db/schema';
import { eq, desc, and, or, ilike, count, sql } from 'drizzle-orm';

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

export const machineRoutes = new Hono()
  .get('/', zValidator('query', querySchema), async (c) => {
    const { page, page_size, search, type, status, sort, order } = c.req.valid('query');
    const db = createDb(c.env);

    let query = db.select().from(machines);
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(machines.name, `%${search}%`),
          ilike(machines.machine_code, `%${search}%`),
          ilike(machines.type, `%${search}%`),
          ilike(machines.location, `%${search}%`)
        )
      );
    }
    if (type) conditions.push(eq(machines.type, type));
    if (status) conditions.push(eq(machines.status, status));

    if (conditions.length) {
      query = query.where(and(...conditions));
    }

    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? sql`${machines[sortField]} ASC` : sql`${machines[sortField]} DESC`;
    query = query.orderBy(sortOrder);

    const total = await db.select({ count: count() }).from(machines).where(conditions.length ? and(...conditions) : undefined);
    const data = await query.limit(page_size).offset((page - 1) * page_size);

    return c.json({
      data,
      total: total[0].count,
      page,
      page_size,
      total_pages: Math.ceil(total[0].count / page_size),
    });
  })
  .get('/:id', async (c) => {
    const db = createDb(c.env);
    const machine = await db.select().from(machines).where(eq(machines.id, c.req.param('id'))).limit(1);
    if (!machine.length) return c.json({ error: 'Machine not found' }, 404);
    return c.json({ data: machine[0] });
  })
  .post('/', zValidator('json', machineSchema), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    const existing = await db.select().from(machines).where(eq(machines.machine_code, data.machine_code)).limit(1);
    if (existing.length) return c.json({ error: 'Machine code already exists' }, 409);

    const [machine] = await db.insert(machines).values(data).returning();
    return c.json({ data: machine }, 201);
  })
  .patch('/:id', zValidator('json', machineSchema.partial()), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    if (data.machine_code) {
      const existing = await db.select().from(machines).where(and(eq(machines.machine_code, data.machine_code), sql`${machines.id} != ${c.req.param('id')}`)).limit(1);
      if (existing.length) return c.json({ error: 'Machine code already exists' }, 409);
    }

    const [machine] = await db.update(machines).set({ ...data, updated_at: new Date() }).where(eq(machines.id, c.req.param('id'))).returning();
    if (!machine) return c.json({ error: 'Machine not found' }, 404);
    return c.json({ data: machine });
  })
  .delete('/:id', async (c) => {
    const db = createDb(c.env);
    const [machine] = await db.delete(machines).where(eq(machines.id, c.req.param('id'))).returning();
    if (!machine) return c.json({ error: 'Machine not found' }, 404);
    return c.json({ message: 'Machine deleted' });
  })
  .get('/types/list', async (c) => {
    const db = createDb(c.env);
    const types = await db.selectDistinct({ type: machines.type }).from(machines);
    return c.json({ data: types.map(t => t.type) });
  })
  .get('/needing-maintenance', async (c) => {
    const db = createDb(c.env);
    const now = new Date();
    const machinesDue = await db.select().from(machines).where(and(
      eq(machines.status, 'operational'),
      sql`${machines.next_maintenance} <= ${now}`
    ));
    return c.json({ data: machinesDue });
  });