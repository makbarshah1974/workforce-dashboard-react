import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { dailyRecords } from '../db/schema';
import { eq, desc, and, count, sql, gte, lt } from 'drizzle-orm';
import { formatDateDDMMYYYY, toInt } from '@shared/utils/timeCalculations';

const recordSchema = z.object({
  record_date: z.string(),
  shift: z.enum(['day', 'night']).default('day'),
  total_workforce: z.coerce.number().int().min(0).optional(),
  metex_staff: z.coerce.number().int().min(0).optional(),
  csk_staff: z.coerce.number().int().min(0).optional(),
  topquality_staff: z.coerce.number().int().min(0).optional(),
  bestcare_staff: z.coerce.number().int().min(0).optional(),
  prestige_staff: z.coerce.number().int().min(0).optional(),
  working_machines: z.coerce.number().int().min(0).optional(),
  out_of_order_machines: z.coerce.number().int().min(0).optional(),
  working_machine_names: z.string().optional(),
  out_of_order_machine_names: z.string().optional(),
  workers_on_leave: z.coerce.number().int().min(0).optional(),
  workers_on_leave_names: z.string().optional(),
  maintenance_staff: z.string().optional(),
  loading_staff: z.coerce.number().int().min(0).optional(),
  loading_staff_names: z.string().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(30),
  date: z.string().optional(),
  month: z.string().optional(),
  shift: z.enum(['day', 'night']).optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
});

export const workforceRoutes = new Hono()
  .get('/summary', async (c) => {
    const date_str = c.req.query('date');
    const shift = (c.req.query('shift') || 'day').toLowerCase();
    const db = createDb(c.env);

    let query = db.select().from(dailyRecords);
    if (date_str) {
      query = query.where(eq(dailyRecords.record_date, date_str));
    }
    query = query.where(eq(dailyRecords.shift, shift === 'night' ? 'night' : 'day'));
    query = query.orderBy(desc(dailyRecords.record_date)).limit(1);

    const rec = await query;
    if (!rec.length) return c.json({ record: null });

    const r = rec[0];
    const split = (s: string) => (s || '').split(',').map(x => x.trim()).filter(Boolean);

    return c.json({
      record: {
        record_date: formatDateDDMMYYYY(r.record_date),
        shift: r.shift,
        total_workforce: r.total_workforce,
        metex_staff: r.metex_staff,
        csk_staff: r.csk_staff,
        topquality_staff: r.topquality_staff,
        bestcare_staff: r.bestcare_staff,
        prestige_staff: r.prestige_staff,
        working_machines: r.working_machines,
        out_of_order_machines: r.out_of_order_machines,
        working_machine_names: split(r.working_machine_names),
        out_of_order_machine_names: split(r.out_of_order_machine_names),
        workers_on_leave: toInt(r.workers_on_leave),
        workers_on_leave_names: split(r.workers_on_leave_names),
        maintenance_staff: split(r.maintenance_staff),
        loading_staff: toInt(r.loading_staff),
        loading_staff_names: split(r.loading_staff_names),
      },
    });
  })
  .post('/', zValidator('json', recordSchema), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);

    const shift = data.shift === 'night' ? 'night' : 'day';
    const existing = await db.select().from(dailyRecords)
      .where(and(eq(dailyRecords.record_date, data.record_date), eq(dailyRecords.shift, shift)))
      .limit(1);

    let record;
    if (existing.length) {
      [record] = await db.update(dailyRecords)
        .set({ ...data, shift })
        .where(and(eq(dailyRecords.record_date, data.record_date), eq(dailyRecords.shift, shift)))
        .returning();
    } else {
      [record] = await db.insert(dailyRecords).values({ ...data, shift }).returning();
    }

    return c.json({ record });
  })
  .get('/history', zValidator('query', querySchema), async (c) => {
    const { page, page_size, date, month, shift, limit } = c.req.valid('query');
    const db = createDb(c.env);

    let query = db.select().from(dailyRecords);
    if (month) {
      const start = new Date(month + '-01');
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      query = query.where(and(gte(dailyRecords.record_date, start.toISOString().split('T')[0]), lt(dailyRecords.record_date, end.toISOString().split('T')[0])));
    } else if (date) {
      query = query.where(eq(dailyRecords.record_date, date));
    }
    if (shift) query = query.where(eq(dailyRecords.shift, shift));

    if (month) {
      const recs = await query.orderBy(desc(dailyRecords.record_date)).all();
      return c.json({ records: recs });
    } else {
      const recs = await query.orderBy(desc(dailyRecords.record_date)).limit(limit).all();
      return c.json({ records: recs });
    }
  })
  .get('/dates', async (c) => {
    const db = createDb(c.env);
    const recs = await db.select({ record_date: dailyRecords.record_date })
      .from(dailyRecords)
      .orderBy(desc(dailyRecords.record_date))
      .all();
    return c.json({ dates: recs.map(r => r.record_date) });
  });