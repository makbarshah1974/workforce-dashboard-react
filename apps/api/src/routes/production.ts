import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { productionRecords, machines, workers, shifts } from '../db/schema';
import { eq, desc, and, or, ilike, count, sql, gte, lte } from 'drizzle-orm';

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

export const productionRoutes = new Hono()
  .get('/', zValidator('query', querySchema), async (c) => {
    const { page, page_size, search, machine_id, worker_id, shift_id, date_from, date_to, sort, order } = c.req.valid('query');
    const db = createDb(c.env);

    let query = db.select({
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
      downtime_minutes: productionRecords.downtime_minutes,
      notes: productionRecords.notes,
      created_at: productionRecords.created_at,
      updated_at: productionRecords.updated_at,
      machine_code: machines.machine_code,
      machine_name: machines.name,
      worker_name: workers.full_name,
      worker_employee_id: workers.employee_id,
      shift_name: shifts.name,
    })
      .from(productionRecords)
      .leftJoin(machines, eq(productionRecords.machine_id, machines.id))
      .leftJoin(workers, eq(productionRecords.worker_id, workers.id))
      .leftJoin(shifts, eq(productionRecords.shift_id, shifts.id));

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(productionRecords.product_name, `%${search}%`),
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
      query = query.where(and(...conditions));
    }

    const sortField = sort || 'start_time';
    const sortOrder = order === 'asc' ? sql`${productionRecords[sortField]} ASC` : sql`${productionRecords[sortField]} DESC`;
    query = query.orderBy(sortOrder);

    const total = await db.select({ count: count() })
      .from(productionRecords)
      .leftJoin(machines, eq(productionRecords.machine_id, machines.id))
      .leftJoin(workers, eq(productionRecords.worker_id, workers.id))
      .where(conditions.length ? and(...conditions) : undefined);

    const data = await query.limit(page_size).offset((page - 1) * page_size);

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
  })), async (c) => {
    const { date_from, date_to, machine_id, shift_id } = c.req.valid('query');
    const db = createDb(c.env);

    const conditions = [];
    if (date_from) conditions.push(gte(productionRecords.start_time, new Date(date_from)));
    if (date_to) conditions.push(lte(productionRecords.start_time, new Date(date_to)));
    if (machine_id) conditions.push(eq(productionRecords.machine_id, machine_id));
    if (shift_id) conditions.push(eq(productionRecords.shift_id, shift_id));

    const summary = await db.select({
      total_quantity: sql<number>`COALESCE(SUM(${productionRecords.quantity}), 0)`,
      total_target: sql<number>`COALESCE(SUM(${productionRecords.target_quantity}), 0)`,
      total_pass: sql<number>`COALESCE(SUM(${productionRecords.quality_pass}), 0)`,
      total_fail: sql<number>`COALESCE(SUM(${productionRecords.quality_fail}), 0)`,
      total_downtime: sql<number>`COALESCE(SUM(${productionRecords.downtime_minutes}), 0)`,
      record_count: count(),
    })
      .from(productionRecords)
      .where(conditions.length ? and(...conditions) : undefined);

    const s = summary[0];
    const efficiency = s.total_target > 0 ? (s.total_quantity / s.total_target) * 100 : 0;
    const qualityRate = (s.total_pass + s.total_fail) > 0 ? (s.total_pass / (s.total_pass + s.total_fail)) * 100 : 0;

    return c.json({
      data: {
        total_quantity: s.total_quantity,
        total_target: s.total_target,
        efficiency: Math.round(efficiency * 100) / 100,
        total_pass: s.total_pass,
        total_fail: s.total_fail,
        quality_rate: Math.round(qualityRate * 100) / 100,
        total_downtime: s.total_downtime,
        record_count: s.record_count,
      },
    });
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
      downtime_minutes: productionRecords.downtime_minutes,
      notes: productionRecords.notes,
      created_at: productionRecords.created_at,
      updated_at: productionRecords.updated_at,
      machine_code: machines.machine_code,
      machine_name: machines.name,
      worker_name: workers.full_name,
      worker_employee_id: workers.employee_id,
      shift_name: shifts.name,
    })
      .from(productionRecords)
      .leftJoin(machines, eq(productionRecords.machine_id, machines.id))
      .leftJoin(workers, eq(productionRecords.worker_id, workers.id))
      .leftJoin(shifts, eq(productionRecords.shift_id, shifts.id))
      .where(eq(productionRecords.id, c.req.param('id')))
      .limit(1);

    if (!record.length) return c.json({ error: 'Production record not found' }, 404);
    return c.json({ data: record[0] });
  })
  .post('/', zValidator('json', productionSchema), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    const [record] = await db.insert(productionRecords).values(data).returning();
    return c.json({ data: record }, 201);
  })
  .patch('/:id', zValidator('json', productionSchema.partial()), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    const [record] = await db.update(productionRecords).set({ ...data, updated_at: new Date() }).where(eq(productionRecords.id, c.req.param('id'))).returning();
    if (!record) return c.json({ error: 'Production record not found' }, 404);
    return c.json({ data: record });
  })
  .delete('/:id', async (c) => {
    const db = createDb(c.env);
    const [record] = await db.delete(productionRecords).where(eq(productionRecords.id, c.req.param('id'))).returning();
    if (!record) return c.json({ error: 'Production record not found' }, 404);
    return c.json({ message: 'Production record deleted' });
  });