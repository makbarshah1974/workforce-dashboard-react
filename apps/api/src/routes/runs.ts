import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { productionRuns, machines, products, groups, machineLogs, users } from '../db/schema';
import { eq, desc, and, or, ilike, count, sql, gte, lt, inArray } from 'drizzle-orm';
import { nowUAE, shiftOf, formatDurationMs, splitDayNight, shiftDayBounds, splitShiftDay, correctBucket, effRunHalf, effDownDay } from '@shared/utils/timeCalculations';

const runStartSchema = z.object({
  machine_id: z.number().int().positive(),
  product_id: z.number().int().positive().optional().nullable(),
  group_id: z.number().int().positive().optional().nullable(),
  item_name: z.string().optional(),
  item_code: z.string().optional(),
  operator: z.string().min(1),
  note: z.string().optional(),
  shift: z.enum(['day', 'night']).optional(),
});

const runUpdateSchema = z.object({
  started_at: z.string().min(1),
  stopped_at: z.string().optional().nullable(),
  status: z.enum(['running', 'stopped']).optional(),
  note: z.string().optional(),
  product_id: z.number().int().positive().optional().nullable(),
  group_id: z.number().int().positive().optional().nullable(),
  item_name: z.string().optional(),
  item_code: z.string().optional(),
  operator: z.string().optional(),
  shift: z.enum(['day', 'night']).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(2000).default(200),
  machine_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['running', 'stopped']).optional(),
  machine_status: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  date: z.string().optional(),
  shift: z.enum(['day', 'night']).optional(),
});

export const runsRoutes = new Hono()
  .get('/', zValidator('query', querySchema), async (c) => {
    const { page, page_size, machine_id, status, machine_status, date_from, date_to, date, shift } = c.req.valid('query');
    const db = createDb(c.env);

    let query = db.select({
      id: productionRuns.id,
      machine_id: productionRuns.machine_id,
      product_id: productionRuns.product_id,
      group_id: productionRuns.group_id,
      item_name: productionRuns.item_name,
      item_code: productionRuns.item_code,
      operator: productionRuns.operator,
      started_at: productionRuns.started_at,
      stopped_at: productionRuns.stopped_at,
      status: productionRuns.status,
      note: productionRuns.note,
      shift: productionRuns.shift,
      created_at: productionRuns.created_at,
      machine_name: machines.name,
      product_name: products.name,
      group_name: groups.name,
      machine_status: machines.status,
    })
      .from(productionRuns)
      .leftJoin(machines, eq(productionRuns.machine_id, machines.id))
      .leftJoin(products, eq(productionRuns.product_id, products.id))
      .leftJoin(groups, eq(productionRuns.group_id, groups.id));

    if (machine_id) query = query.where(eq(productionRuns.machine_id, machine_id));
    if (status) query = query.where(eq(productionRuns.status, status));
    if (machine_status) query = query.where(eq(machines.status, machine_status));
    if (shift) query = query.where(eq(productionRuns.shift, shift));

    if (date_from) {
      const d = new Date(date_from);
      query = query.where(gte(productionRuns.started_at, d));
    }
    if (date_to) {
      const d = new Date(date_to);
      d.setUTCDate(d.getUTCDate() + 1);
      query = query.where(lt(productionRuns.started_at, d));
    }
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      query = query.where(and(gte(productionRuns.started_at, d), lt(productionRuns.started_at, next)));
    }

    const hasFilter = machine_id || status || machine_status || date_from || date_to || date || shift;
    const limit = hasFilter ? 2000 : 200;

    query = query.orderBy(desc(productionRuns.started_at)).limit(page_size).offset((page - 1) * page_size);

    const data = await query;

    // Calculate run_seconds for each run
    const now = nowUAE();
    const runsWithDuration = data.map(run => {
      const started = new Date(run.started_at);
      const stopped = run.stopped_at ? new Date(run.stopped_at) : now;
      const rawSeconds = Math.floor((stopped.getTime() - started.getTime()) / 1000);
      const { daySeconds, nightSeconds } = splitDayNight(started, stopped);
      const corrected = effRunHalf(daySeconds) + effRunHalf(nightSeconds);
      return {
        ...run,
        run_seconds: corrected,
        run_time: formatDurationMs(corrected),
      };
    });

    return c.json({ runs: runsWithDuration });
  })
  .post('/start', zValidator('json', runStartSchema), async (c) => {
    const data = c.req.valid('json');
    const db = createDb(c.env);
    const actor = c.get('user');

    const machine = await db.select().from(machines).where(eq(machines.id, data.machine_id)).limit(1);
    if (!machine.length) return c.json({ error: 'Machine not found' }, 404);

    // Close any open run for this machine
    await db.update(productionRuns)
      .set({ status: 'stopped', stopped_at: nowUAE() })
      .where(and(eq(productionRuns.machine_id, data.machine_id), eq(productionRuns.status, 'running')));

    const shift = data.shift || shiftOf(nowUAE());
    const [run] = await db.insert(productionRuns).values({
      machine_id: data.machine_id,
      product_id: data.product_id,
      group_id: data.group_id || machine[0].group_id,
      item_name: data.item_name || '',
      item_code: data.item_code || '',
      operator: data.operator,
      note: data.note || '',
      status: 'running',
      shift,
    }).returning();

    // Update machine status
    await db.update(machines)
      .set({ status: 'running', updated_by: actor.display_name || actor.username, updated_at: nowUAE() })
      .where(eq(machines.id, data.machine_id));

    // Log status change
    await db.insert(machineLogs).values({
      machine_id: data.machine_id,
      status: 'running',
      note: `Run started${data.item_name ? ` (${data.item_name})` : ''}`,
      updated_by: actor.display_name || actor.username,
      shift,
    });

    return c.json({ run }, 201);
  })
  .post('/stop/:rid', async (c) => {
    const rid = parseInt(c.req.param('rid'));
    const db = createDb(c.env);
    const actor = c.get('user');

    const run = await db.select().from(productionRuns).where(eq(productionRuns.id, rid)).limit(1);
    if (!run.length) return c.json({ error: 'Run not found' }, 404);
    if (run[0].status !== 'running') return c.json({ run: run[0] });

    const payload = await c.req.json().catch(() => ({})) as { shift?: string; note?: string };
    const shift = payload.shift || shiftOf(nowUAE());

    await db.update(productionRuns)
      .set({ status: 'stopped', stopped_at: nowUAE(), note: payload.note || run[0].note })
      .where(eq(productionRuns.id, rid));

    const machine = await db.select().from(machines).where(eq(machines.id, run[0].machine_id)).limit(1);
    if (machine.length) {
      await db.update(machines)
        .set({ status: 'idle', updated_by: actor.display_name || actor.username, updated_at: nowUAE() })
        .where(eq(machines.id, run[0].machine_id));

      await db.insert(machineLogs).values({
        machine_id: run[0].machine_id,
        status: 'idle',
        note: `Run stopped`,
        updated_by: actor.display_name || actor.username,
        shift,
      });
    }

    const updated = await db.select().from(productionRuns).where(eq(productionRuns.id, rid)).limit(1);
    return c.json({ run: updated[0] });
  })
  .put('/:rid', zValidator('json', runUpdateSchema), async (c) => {
    const rid = parseInt(c.req.param('rid'));
    const data = c.req.valid('json');
    const db = createDb(c.env);

    const run = await db.select().from(productionRuns).where(eq(productionRuns.id, rid)).limit(1);
    if (!run.length) return c.json({ error: 'Run not found' }, 404);

    const startedAt = new Date(data.started_at);
    let stoppedAt: Date | null = null;
    if (data.stopped_at) {
      stoppedAt = new Date(data.stopped_at);
      if (stoppedAt < startedAt) return c.json({ error: 'Stop time cannot be before start time' }, 400);
    }

    const updateData: any = {
      started_at: startedAt,
      stopped_at: stoppedAt,
      shift: shiftOf(startedAt),
      updated_at: nowUAE(),
    };
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'stopped' && !stoppedAt) {
        updateData.stopped_at = nowUAE();
        updateData.shift = shiftOf(updateData.stopped_at);
      }
      if (data.status === 'running') {
        updateData.stopped_at = null;
      }
    }
    if (data.note !== undefined) updateData.note = data.note;
    if (data.product_id !== undefined) updateData.product_id = data.product_id;
    if (data.group_id !== undefined) updateData.group_id = data.group_id;
    if (data.item_name !== undefined) updateData.item_name = data.item_name;
    if (data.item_code !== undefined) updateData.item_code = data.item_code;
    if (data.operator !== undefined) updateData.operator = data.operator;

    await db.update(productionRuns).set(updateData).where(eq(productionRuns.id, rid));
    const updated = await db.select().from(productionRuns).where(eq(productionRuns.id, rid)).limit(1);
    return c.json({ run: updated[0] });
  })
  .delete('/:rid', async (c) => {
    const rid = parseInt(c.req.param('rid'));
    const db = createDb(c.env);
    await db.delete(productionRuns).where(eq(productionRuns.id, rid));
    return c.json({ ok: true, id: rid });
  })
  .get('/export', zValidator('query', querySchema), async (c) => {
    const { machine_id, status, machine_status, date_from, date_to, date, shift } = c.req.valid('query');
    const db = createDb(c.env);

    let query = db.select({
      started_at: productionRuns.started_at,
      stopped_at: productionRuns.stopped_at,
      machine_id: productionRuns.machine_id,
      group_id: productionRuns.group_id,
      product_id: productionRuns.product_id,
      item_name: productionRuns.item_name,
      item_code: productionRuns.item_code,
      operator: productionRuns.operator,
      status: productionRuns.status,
      note: productionRuns.note,
    }).from(productionRuns);

    if (machine_id) query = query.where(eq(productionRuns.machine_id, machine_id));
    if (status) query = query.where(eq(productionRuns.status, status));
    if (machine_status) query = query.where(eq(machines.status, machine_status));
    if (shift) query = query.where(eq(productionRuns.shift, shift));
    if (date_from) query = query.where(gte(productionRuns.started_at, new Date(date_from)));
    if (date_to) query = query.where(lt(productionRuns.started_at, new Date(new Date(date_to).getTime() + 24*60*60*1000)));
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      query = query.where(and(gte(productionRuns.started_at, d), lt(productionRuns.started_at, next)));
    }

    const runs = await query.orderBy(desc(productionRuns.started_at)).all();

    const machineNames = new Map();
    const productNames = new Map();
    const groupNames = new Map();
    for (const m of await db.select({ id: machines.id, name: machines.name }).from(machines)) machineNames.set(m.id, m.name);
    for (const p of await db.select({ id: products.id, name: products.name }).from(products)) productNames.set(p.id, p.name);
    for (const g of await db.select({ id: groups.id, name: groups.name }).from(groups)) groupNames.set(g.id, g.name);

    let csv = 'Started,Stopped,Run Time,Machine,Group,Product,Item Name,Item Code,Operator,Status,Note\n';
    for (const r of runs) {
      const started = new Date(r.started_at);
      const stopped = r.stopped_at ? new Date(r.stopped_at) : nowUAE();
      const { daySeconds, nightSeconds } = splitDayNight(started, stopped);
      const runSeconds = effRunHalf(daySeconds) + effRunHalf(nightSeconds);
      csv += [
        r.started_at,
        r.stopped_at || '',
        formatDurationMs(runSeconds),
        machineNames.get(r.machine_id) || '',
        groupNames.get(r.group_id) || '',
        productNames.get(r.product_id) || '',
        r.item_name || '',
        r.item_code || '',
        r.operator,
        r.status,
        r.note || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    }

    return c.body(csv, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=production_runs.csv',
    });
  });