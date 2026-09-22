import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { shifts, shiftAssignments, workers } from '../db/schema';
import { eq, desc, and, or, ilike, count, sql, gte, lte } from 'drizzle-orm';
import type { AuthContext } from '../types/context';

const shiftSchema = z.object({
  name: z.string().min(1).max(50),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).default([1,2,3,4,5]),
  is_active: z.boolean().default(true),
});

const assignmentSchema = z.object({
  worker_id: z.string().uuid(),
  shift_id: z.string().uuid(),
  date: z.string(),
  status: z.enum(['scheduled', 'completed', 'absent', 'late']).default('scheduled'),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  worker_id: z.string().uuid().optional(),
  shift_id: z.string().uuid().optional(),
  status: z.string().optional(),
});

export const shiftRoutes = new Hono<AuthContext>()
  .get('/', zValidator('query', z.object({
    page: z.coerce.number().min(1).default(1),
    page_size: z.coerce.number().min(1).max(100).default(20),
    is_active: z.string().optional(),
    // @ts-ignore - drizzle type inference
  })), async (c) => {
    const { page, page_size, is_active } = c.req.valid('query');
    const db = createDb(c.env);

    let query = db.select().from(shifts) as any;
    // @ts-ignore - drizzle type inference
    if (is_active !== undefined) {
      query = query.where(eq(shifts.is_active, is_active === 'true'));
    }
    query = query.orderBy(shifts.name);

    // @ts-ignore - drizzle type inference
    const total = await db.select({ count: count() }).from(shifts).where(is_active !== undefined ? eq(shifts.is_active, is_active === 'true') : undefined) as any;
    const data = await query.limit(page_size).offset((page - 1) * page_size);

    // @ts-ignore - drizzle type inference
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
  .get('/assignments', zValidator('query', querySchema), async (c) => {
    const { page, page_size, date_from, date_to, worker_id, shift_id, status } = c.req.valid('query');
    const db = createDb(c.env);
    // @ts-ignore - drizzle type inference

    let query = (db.select({
      id: shiftAssignments.id,
      worker_id: shiftAssignments.worker_id,
      shift_id: shiftAssignments.shift_id,
    // @ts-ignore - drizzle type inference
      date: shiftAssignments.date,
      status: shiftAssignments.status,
      created_at: shiftAssignments.created_at,
      worker_name: workers.full_name,
      worker_employee_id: workers.employee_id,
    // @ts-ignore - drizzle type inference
      shift_name: shifts.name,
    // @ts-ignore - drizzle type inference
      shift_start: shifts.start_time,
      shift_end: shifts.end_time,
    }) as any).from(shiftAssignments)
      .leftJoin(workers, eq(shiftAssignments.worker_id, workers.id))
      .leftJoin(shifts, eq(shiftAssignments.shift_id, shifts.id));

    const conditions = [];
    if (date_from) conditions.push(gte(shiftAssignments.date, date_from));
    if (date_to) conditions.push(lte(shiftAssignments.date, date_to));
    if (worker_id) conditions.push(eq(shiftAssignments.worker_id, worker_id));
    if (shift_id) conditions.push(eq(shiftAssignments.shift_id, shift_id));
    if (status) conditions.push(eq(shiftAssignments.status, status as any));
    // @ts-ignore - drizzle type inference

    if (conditions.length) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(shiftAssignments.date), shifts.name);

    const total = await db.select({ count: count() })
      .from(shiftAssignments)
      .where(conditions.length ? and(...conditions) : undefined) as any;
    // @ts-ignore - drizzle type inference

    // @ts-ignore - drizzle type inference
    const data = await query.limit(page_size).offset((page - 1) * page_size) as any;
    // @ts-ignore - drizzle type inference

    return c.json({
      data,
      total: total[0].count,
      page,
      page_size,
      total_pages: Math.ceil(total[0].count / page_size),
    });
  })
  .get('/assignments/calendar', zValidator('query', z.object({
    date_from: z.string(),
    date_to: z.string(),
    worker_id: z.string().uuid().optional(),
  })), async (c) => {
    const { date_from, date_to, worker_id } = c.req.valid('query');
    const db = createDb(c.env);
    // @ts-ignore - drizzle type inference

    const conditions = [
      gte(shiftAssignments.date, date_from),
      lte(shiftAssignments.date, date_to),
    ];
    if (worker_id) conditions.push(eq(shiftAssignments.worker_id, worker_id));

    const assignments = await db.select({
      id: shiftAssignments.id,
      worker_id: shiftAssignments.worker_id,
    // @ts-ignore - drizzle type inference
      shift_id: shiftAssignments.shift_id,
      date: shiftAssignments.date,
      status: shiftAssignments.status,
      worker_name: workers.full_name,
      worker_employee_id: workers.employee_id,
    // @ts-ignore - drizzle type inference
      shift_name: shifts.name,
    // @ts-ignore - drizzle type inference
      shift_start: shifts.start_time,
      shift_end: shifts.end_time,
    })
      .from(shiftAssignments)
      .leftJoin(workers, eq(shiftAssignments.worker_id, workers.id))
      .leftJoin(shifts, eq(shiftAssignments.shift_id, shifts.id))
      .where(and(...conditions as any))
      .orderBy(shiftAssignments.date, shifts.name) as any;
    // @ts-ignore - drizzle type inference

    return c.json({ data: assignments });
  })
  .post('/', zValidator('json', shiftSchema), async (c) => {
    // @ts-ignore - drizzle type inference
    const data = c.req.valid('json');
    const db = createDb(c.env);
    // @ts-ignore - drizzle type inference
    const [shift] = await db.insert(shifts).values(data).returning() as any;
    return c.json({ data: shift }, 201);
  })
    // @ts-ignore - drizzle type inference
  .get('/:id', async (c) => {
    // @ts-ignore - drizzle type inference
    const db = createDb(c.env);
    const shift = await db.select().from(shifts).where(eq(shifts.id, c.req.param('id'))).limit(1) as any;
    if (!shift.length) return c.json({ error: 'Shift not found' }, 404);
    // @ts-ignore - drizzle type inference
    return c.json({ data: shift[0] });
  })
  .patch('/:id', zValidator('json', shiftSchema.partial()), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);
    const [shift] = await db.update(shifts).set({ ...data, updated_at: new Date() }).where(eq(shifts.id, c.req.param('id'))).returning() as any;
    if (!shift) return c.json({ error: 'Shift not found' }, 404);
    return c.json({ data: shift });
  })
  .delete('/:id', async (c) => {
    const db = createDb(c.env);
    const [shift] = await db.delete(shifts).where(eq(shifts.id, c.req.param('id'))).returning() as any;
    if (!shift) return c.json({ error: 'Shift not found' }, 404);
    return c.json({ message: 'Shift deleted' });
  })
    // @ts-ignore - drizzle type inference
  .post('/assignments', zValidator('json', assignmentSchema), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    const existing = await db.select().from(shiftAssignments).where(and(eq(shiftAssignments.worker_id, data.worker_id), eq(shiftAssignments.date, data.date))).limit(1) as any;
    if (existing.length) return c.json({ error: 'Worker already assigned for this date' }, 409);

    // @ts-ignore - drizzle type inference
    const [assignment] = await db.insert(shiftAssignments).values(data).returning() as any;
    return c.json({ data: assignment }, 201);
    // @ts-ignore - drizzle type inference
  })
  .post('/assignments/bulk', zValidator('json', z.object({
    assignments: z.array(assignmentSchema),
  })), async (c) => {
    const { assignments } = c.req.valid('json');
    // @ts-ignore - drizzle type inference
    const db = createDb(c.env);

    const results = [];
    for (const a of assignments) {
      const existing = await db.select().from(shiftAssignments).where(and(eq(shiftAssignments.worker_id, a.worker_id), eq(shiftAssignments.date, a.date))).limit(1) as any;
      if (!existing.length) {
    // @ts-ignore - drizzle type inference
        const [created] = await db.insert(shiftAssignments).values(a).returning() as any;
        results.push(created);
      }
    }
    // @ts-ignore - drizzle type inference
    return c.json({ data: results }, 201);
  })
    // @ts-ignore - drizzle type inference
  .patch('/assignments/:id', zValidator('json', assignmentSchema.partial()), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);
    const [assignment] = await db.update(shiftAssignments).set({ ...data, updated_at: new Date() }).where(eq(shiftAssignments.id, c.req.param('id'))).returning() as any;
    if (!assignment) return c.json({ error: 'Assignment not found' }, 404);
    // @ts-ignore - drizzle type inference
    return c.json({ data: assignment });
  })
  .delete('/assignments/:id', async (c) => {
    // @ts-ignore - drizzle type inference
    const db = createDb(c.env);
    const [assignment] = await db.delete(shiftAssignments).where(eq(shiftAssignments.id, c.req.param('id'))).returning() as any;
    if (!assignment) return c.json({ error: 'Assignment not found' }, 404);
    return c.json({ message: 'Assignment deleted' });
  });