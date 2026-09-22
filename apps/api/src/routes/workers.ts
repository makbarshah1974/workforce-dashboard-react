import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { workers } from '../db/schema';
import { eq, desc, and, or, ilike, count, sql } from 'drizzle-orm';
import type { AuthContext } from '../types/context';

const workerSchema = z.object({
  employee_id: z.string().min(1).max(20),
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  department: z.string().min(1).max(50),
  role: z.string().min(1).max(50),
  shift_type: z.enum(['day', 'night', 'rotating']),
  hire_date: z.string(),
  status: z.enum(['active', 'inactive', 'on_leave']).default('active'),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string(),
    issued_date: z.string(),
    expiry_date: z.string().optional(),
    issuer: z.string(),
  })).default([]),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  shift_type: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
    // @ts-ignore - drizzle type inference

export const workerRoutes = new Hono<AuthContext>()
  .get('/', zValidator('query', querySchema), async (c) => {
    const { page, page_size, search, department, status, shift_type, sort, order } = c.req.valid('query');
    const db = createDb(c.env);
    // @ts-ignore - drizzle type inference

    let query = db.select().from(workers);
    const conditions = [];

    if (search) {
    // @ts-ignore - drizzle type inference
      conditions.push(
        or(
          ilike(workers.full_name, `%${search}%`),
    // @ts-ignore - drizzle type inference
          ilike(workers.employee_id, `%${search}%`),
          ilike(workers.email, `%${search}%`),
          ilike(workers.department, `%${search}%`)
    // @ts-ignore - drizzle type inference
        )
      );
    }
    if (department) conditions.push(eq(workers.department, department));
    if (status) conditions.push(eq(workers.status, status as any));
    // @ts-ignore - drizzle type inference
    if (shift_type) conditions.push(eq(workers.shift_type, shift_type as any));

    if (conditions.length) {
    // @ts-ignore - drizzle type inference
      query = query.where(and(...conditions));
    }

    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? sql`${(workers as any)[sortField]} ASC` : sql`${(workers as any)[sortField]} DESC`;
    // @ts-ignore - drizzle type inference
    query = query.orderBy(sortOrder);

    const total = await db.select({ count: count() }).from(workers).where(conditions.length ? and(...conditions) : undefined) as any;
    const data = await query.limit(page_size).offset((page - 1) * page_size) as any;

    // @ts-ignore - drizzle type inference
    return c.json({
    // @ts-ignore - drizzle type inference
      data,
      total: total[0].count,
      page,
      page_size,
      total_pages: Math.ceil(total[0].count / page_size),
    });
  })
  .get('/:id', async (c) => {
    const db = createDb(c.env);
    const worker = await db.select().from(workers).where(eq(workers.id, c.req.param('id'))).limit(1) as any;
    if (!worker.length) return c.json({ error: 'Worker not found' }, 404);
    return c.json({ data: worker[0] });
    // @ts-ignore - drizzle type inference
  })
  .post('/', zValidator('json', workerSchema), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    const existing = await db.select().from(workers).where(eq(workers.employee_id, data.employee_id)).limit(1) as any;
    if (existing.length) return c.json({ error: 'Employee ID already exists' }, 409);

    const existingEmail = await db.select().from(workers).where(eq(workers.email, data.email)).limit(1) as any;
    if (existingEmail.length) return c.json({ error: 'Email already exists' }, 409);
    // @ts-ignore - drizzle type inference

    // @ts-ignore - drizzle type inference
    const [worker] = await db.insert(workers).values(data).returning() as any;
    // @ts-ignore - drizzle type inference
    return c.json({ data: worker }, 201);
  })
  .patch('/:id', zValidator('json', workerSchema.partial()), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    if (data.employee_id) {
      const existing = await db.select().from(workers).where(and(eq(workers.employee_id, data.employee_id), sql`${workers.id} != ${c.req.param('id')}`)).limit(1) as any;
      if (existing.length) return c.json({ error: 'Employee ID already exists' }, 409);
    }

    if (data.email) {
      const existing = await db.select().from(workers).where(and(eq(workers.email, data.email), sql`${workers.id} != ${c.req.param('id')}`)).limit(1) as any;
      if (existing.length) return c.json({ error: 'Email already exists' }, 409);
    }

    // @ts-ignore - drizzle type inference
    const [worker] = await db.update(workers).set({ ...data, updated_at: new Date() }).where(eq(workers.id, c.req.param('id'))).returning() as any;
    if (!worker) return c.json({ error: 'Worker not found' }, 404);
    return c.json({ data: worker });
  })
  .delete('/:id', async (c) => {
    const db = createDb(c.env);
    const [worker] = await db.delete(workers).where(eq(workers.id, c.req.param('id'))).returning() as any;
    if (!worker) return c.json({ error: 'Worker not found' }, 404);
    return c.json({ message: 'Worker deleted' });
  })
    // @ts-ignore - drizzle type inference
  .get('/departments/list', async (c) => {
    const db = createDb(c.env);
    const depts = await db.selectDistinct({ department: workers.department }).from(workers).where(eq(workers.status, 'active')) as any;
    return c.json({ data: depts.map((d: any) => d.department) });
  });