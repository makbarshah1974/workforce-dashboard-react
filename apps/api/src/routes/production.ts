import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { productionRecords, machines, workers, shifts } from '../db/schema';
import { eq, desc, and, or, ilike, count, sql, gte, lte } from 'drizzle-orm';
import type { AuthContext } from '../types/context';

const productionSchema = z.object({
  machine_id: z.string().uuid(),
  worker_id: z.string().uuid(),
  shift_id: z.string().uuid(),
  product_name: z.string().min(1).max(100),
  quantity: z.number().int().min(0).default(0),
  target_quantity: z.number().int().min(0).default(0),
  quality_pass: z.number().int().min(0).default(0),
  quality_fail: z.number().int().min(0).default(0),
  start_time: z.string(),
  end_time: z.string(),
  downtime_minutes: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  machine_id: z.string().uuid().optional(),
  worker_id: z.string().uuid().optional(),
  shift_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const productionRoutes = new Hono<AuthContext>()
  .get('/', zValidator('query', querySchema), async (c) => {
    // @ts-ignore - drizzle type inference
    const { page, page_size, search, machine_id, worker_id, shift_id, date_from, date_to, sort, order } = c.req.valid('query');
    const db = createDb(c.env);

    let query = (db.select({
      id: productionRecords.id,
    // @ts-ignore - drizzle type inference
      machine_id: productionRecords.machine_id,
      worker_id: productionRecords.worker_id,
      shift_id: productionRecords.shift_id,
      product_name: productionRecords.product_name,
      quantity: productionRecords.quantity,
    // @ts-ignore - drizzle type inference
      target_quantity: productionRecords.target_quantity,
      quality_pass: productionRecords.quality_pass,
      quality_fail: productionRecords.quality_fail,
    // @ts-ignore - drizzle type inference
      start_time: productionRecords.start_time,
      end_time: productionRecords.end_time,
      downtime_minutes: productionRecords.downtime_minutes,
    // @ts-ignore - drizzle type inference
      notes: productionRecords.notes,
      created_at: productionRecords.created_at,
      updated_at: productionRecords.updated_at,
      machine_code: machines.machine_code,
      machine_name: machines.name,
    // @ts-ignore - drizzle type inference
      worker_name: workers.full_name,
      worker_employee_id: workers.employee_id,
      shift_name: shifts.name,
    // @ts-ignore - drizzle type inference
    }) as any).from(productionRecords)
      .leftJoin(machines, eq(productionRecords.machine_id, machines.id))
      .leftJoin(workers, eq(productionRecords.worker_id, workers.id))
      .leftJoin(shifts, eq(productionRecords.shift_id, shifts.id));

    // @ts-ignore - drizzle type inference
    const conditions = [];

    if (search) {
      conditions.push(
        or(
    // @ts-ignore - drizzle type inference
          ilike(productionRecords.product_name, `%${search}%`),
    // @ts-ignore - drizzle type inference
          ilike(machines.name, `%${search}%`),
          ilike(workers.full_name, `%${search}%`)
        )
      );
    }
    if (machine_id) conditions.push(eq(productionRecords.machine_id, machine_id));
    if (worker_id) conditions.push(eq(productionRecords.worker_id, worker_id));
    if (shift_id) conditions.push(eq(productionRecords.shift_id, shift_id));
    if (date_from) conditions.push(gte(productionRecords.start_time, new Date(date_from)));
    if (date_to) conditions.push(lte(productionRecords.start_time, new Date(date_to)));

    if (conditions.length) {
    // @ts-ignore - drizzle type inference
      query = query.where(and(...conditions));
    }

    const sortField = sort || 'start_time';
    const sortOrder = order === 'asc' ? sql`${productionRecords[sortField]} ASC` : sql`${productionRecords[sortField]} DESC`;
    query = query.orderBy(sortOrder);

    const total = await db.select({ count: count() })
      .from(productionRecords)
      .leftJoin(machines, eq(productionRecords.machine_id, machines.id))
    // @ts-ignore - drizzle type inference
      .leftJoin(workers, eq(productionRecords.worker_id, workers.id))
    // @ts-ignore - drizzle type inference
      .where(conditions.length ? and(...conditions) : undefined) as any;
    // @ts-ignore - drizzle type inference

    const data = await query.limit(page_size).offset((page - 1) * page_size) as any;

    return c.json({
      data,
      total: total[0].count,
      page,
      page_size,
      total_pages: Math.ceil(total[0].count / page_size),
    });
  })
  .get('/summary', zValidator('query', z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    machine_id: z.string().uuid().optional(),
    shift_id: z.string().uuid().optional(),
    // @ts-ignore - drizzle type inference
  })), async (c) => {
    const { date_from, date_to, machine_id, shift_id } = c.req.valid('query');
    const db = createDb(c.env);

    const conditions = [];
    if (date_from) conditions.push(gte(productionRecords.start_time, new Date(date_from)));
    if (date_to) conditions.push(lte(productionRecords.start_time, new Date(date_to)));
    if (machine_id) conditions.push(eq(productionRecords.machine_id, machine_id));
    if (shift_id) conditions.push(eq(productionRecords.shift_id, shift_id));

    // @ts-ignore - drizzle type inference
    const summary = await db.select({
      total_quantity: sql<number>`COALESCE(SUM(${productionRecords.quantity}), 0)`,
      total_target: sql<number>`COALESCE(SUM(${productionRecords.target_quantity}), 0)`,
      total_pass: sql<number>`COALESCE(SUM(${productionRecords.quality_pass}), 0)`,
      total_fail: sql<number>`COALESCE(SUM(${productionRecords.quality_fail}), 0)`,
    // @ts-ignore - drizzle type inference
      total_downtime: sql<number>`COALESCE(SUM(${productionRecords.downtime_minutes}), 0)`,
    // @ts-ignore - drizzle type inference
      record_count: count(),
    })
      .from(productionRecords)
      .where(conditions.length ? and(...conditions) : undefined) as any;

    const s = summary[0];
    const efficiency = s.total_target > 0 ? (s.total_quantity / s.total_target) * 100 : 0;
    const qualityRate = (s.total_pass + s.total_fail) > 0 ? (s.total_pass / (s.total_pass + s.total_fail)) * 100 : 0;
    // @ts-ignore - drizzle type inference

    return c.json({
      data: {
        total_quantity: s.total_quantity,
    // @ts-ignore - drizzle type inference
        total_target: s.total_target,
        efficiency: Math.round(efficiency * 100) / 100,
    // @ts-ignore - drizzle type inference
        total_pass: s.total_pass,
        total_fail: s.total_fail,
        quality_rate: Math.round(qualityRate * 100) / 100,
    // @ts-ignore - drizzle type inference
        total_downtime: s.total_downtime,
    // @ts-ignore - drizzle type inference
        record_count: s.record_count,
      },
    });
    // @ts-ignore - drizzle type inference
  })
  .get('/:id', async (c) => {
    const db = createDb(c.env);
    const record = await db.select({
      id: productionRecords.id,
      machine_id: productionRecords.machine_id,
      worker_id: productionRecords.worker_id,
      shift_id: productionRecords.shift_id,
      product_name: productionRecords.product_name,
      quantity: productionRecords.quantity,
      target_quantity: productionRecords.target_quantity,
      quality_pass: productionRecords.quality_pass,
      quality_fail: productionRecords.quality_fail,
      start_time: productionRecords.start_time,
      end_time: productionRecords.end_time,
    // @ts-ignore - drizzle type inference
      downtime_minutes: productionRecords.downtime_minutes,
      notes: productionRecords.notes,
      created_at: productionRecords.created_at,
      updated_at: productionRecords.updated_at,
      machine_code: machines.machine_code,
      machine_name: machines.name,
      worker_name: workers.full_name,
    // @ts-ignore - drizzle type inference
      worker_employee_id: workers.employee_id,
      shift_name: shifts.name,
    // @ts-ignore - drizzle type inference
    })
      .from(productionRecords)
      .leftJoin(machines, eq(productionRecords.machine_id, machines.id))
      .leftJoin(workers, eq(productionRecords.worker_id, workers.id))
      .leftJoin(shifts, eq(productionRecords.shift_id, shifts.id))
    // @ts-ignore - drizzle type inference
      .where(eq(productionRecords.id, c.req.param('id')))
      .limit(1) as any;

    if (!record.length) return c.json({ error: 'Production record not found' }, 404);
    return c.json({ data: record[0] });
  })
    // @ts-ignore - drizzle type inference
  .post('/', zValidator('json', productionSchema), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    // @ts-ignore - drizzle type inference
    const [record] = await db.insert(productionRecords).values(data).returning();
    return c.json({ data: record }, 201);
    // @ts-ignore - drizzle type inference
  })
  .patch('/:id', zValidator('json', productionSchema.partial()), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    // @ts-ignore - drizzle type inference
    const [record] = await db.update(productionRecords).set({ ...data, updated_at: new Date() }).where(eq(productionRecords.id, c.req.param('id'))).returning();
    if (!record) return c.json({ error: 'Production record not found' }, 404);
    return c.json({ data: record });
    // @ts-ignore - drizzle type inference
  })
  .delete('/:id', async (c) => {
    const db = createDb(c.env);
    const [record] = await db.delete(productionRecords).where(eq(productionRecords.id, c.req.param('id'))).returning();
    if (!record) return c.json({ error: 'Production record not found' }, 404);
    return c.json({ message: 'Production record deleted' });
  });