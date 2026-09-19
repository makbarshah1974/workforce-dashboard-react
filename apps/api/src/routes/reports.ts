import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { reports, users } from '../db/schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';

const reportSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['production', 'worker', 'machine', 'shift', 'quality']),
  filters: z.record(z.unknown()).default({}),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),
  type: z.string().optional(),
});

export const reportRoutes = new Hono()
  .get('/', zValidator('query', querySchema), async (c) => {
    const { page, page_size, type } = c.req.valid('query');
    const db = createDb(c.env);

    let query = db.select({
      id: reports.id,
      name: reports.name,
      type: reports.type,
      filters: reports.filters,
      generated_at: reports.generated_at,
      generated_by: reports.generated_by,
      file_url: reports.file_url,
      generated_by_name: users.full_name,
    })
      .from(reports)
      .leftJoin(users, eq(reports.generated_by, users.id));

    if (type) {
      query = query.where(eq(reports.type, type));
    }

    query = query.orderBy(desc(reports.generated_at));

    const total = await db.select({ count: count() }).from(reports).where(type ? eq(reports.type, type) : undefined);
    const data = await query.limit(page_size).offset((page - 1) * page_size);

    return c.json({
      data,
      total: total[0].count,
      page,
      page_size,
      total_pages: Math.ceil(total[0].count / page_size),
    });
  })
  .post('/generate', zValidator('json', reportSchema), async (c) => {
    const { name, type, filters } = c.req.valid('json');
    const db = createDb(c.env);
    const user = c.get('user');

    // In a real implementation, this would generate the report file
    // For now, we just create a report record
    const [report] = await db.insert(reports).values({
      name,
      type,
      filters,
      generated_by: user.id,
    }).returning();

    // TODO: Actually generate report (CSV/Excel/PDF) and store in R2/S3
    // Update with file_url when done

    return c.json({ data: report }, 201);
  })
  .get('/:id', async (c) => {
    const db = createDb(c.env);
    const report = await db.select({
      id: reports.id,
      name: reports.name,
      type: reports.type,
      filters: reports.filters,
      generated_at: reports.generated_at,
      generated_by: reports.generated_by,
      file_url: reports.file_url,
      generated_by_name: users.full_name,
    })
      .from(reports)
      .leftJoin(users, eq(reports.generated_by, users.id))
      .where(eq(reports.id, c.req.param('id')))
      .limit(1);

    if (!report.length) return c.json({ error: 'Report not found' }, 404);
    return c.json({ data: report[0] });
  })
  .delete('/:id', async (c) => {
    const db = createDb(c.env);
    const [report] = await db.delete(reports).where(eq(reports.id, c.req.param('id'))).returning();
    if (!report) return c.json({ error: 'Report not found' }, 404);
    return c.json({ message: 'Report deleted' });
  });