import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { users } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';
import { setCookie } from 'hono/cookie';
import type { AuthContext } from '../types/context';

const profileSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  avatar_url: z.string().url().optional().nullable(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

const settingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  notifications_enabled: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.enum(['12h', '24h']).optional(),
});

export const settingsRoutes = new Hono<AuthContext>()
  .get('/profile', async (c) => {
    const user = c.get('user');
    const { password_hash, ...userWithoutPassword } = user;
    return c.json({ data: userWithoutPassword });
  })
  .patch('/profile', zValidator('json', profileSchema), async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    const db = createDb(c.env);

    if (data.email !== user.email) {
      const existing = await db.select().from(users).where(and(eq(users.email, data.email), sql`${users.id} != ${user.id}`)).limit(1);
      if (existing.length) return c.json({ error: 'Email already in use' }, 409);
    }

    const [updated] = await db.update(users).set({ ...data, updated_at: new Date() }).where(eq(users.id, user.id)).returning();
    const { password_hash, ...userWithoutPassword } = updated;
    return c.json({ data: userWithoutPassword });
  })
  .patch('/password', zValidator('json', passwordSchema), async (c) => {
    const { current_password, new_password } = c.req.valid('json');
    const user = c.get('user');
    const db = createDb(c.env);

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return c.json({ error: 'Current password is incorrect' }, 400);

    const password_hash = await bcrypt.hash(new_password, 12);
    await db.update(users).set({ password_hash, updated_at: new Date() }).where(eq(users.id, user.id));

    return c.json({ message: 'Password updated successfully' });
  })
  .get('/preferences', async (c) => {
    const user = c.get('user');
    // In a real app, preferences would be stored in a separate table or user metadata
    // For now, return defaults
    return c.json({
      data: {
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: true,
        language: 'en',
        timezone: 'Asia/Kolkata',
        date_format: 'DD MMM YYYY',
        time_format: '24h',
      },
    });
  })
  .patch('/preferences', zValidator('json', settingsSchema), async (c) => {
    const data = c.req.valid('json');
    // In a real app, save to user preferences table
    return c.json({ data, message: 'Preferences updated' });
  })
  .get('/system', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

    return c.json({
      data: {
        app_name: 'Workforce Dashboard',
        version: '1.0.0',
        maintenance_mode: false,
        max_file_upload_mb: 10,
        allowed_file_types: ['csv', 'xlsx', 'xls'],
        session_timeout_minutes: 480,
        password_min_length: 8,
        require_2fa: false,
      },
    });
  })
  .patch('/system', async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

    // In a real app, save to system settings table
    return c.json({ message: 'System settings updated' });
  });