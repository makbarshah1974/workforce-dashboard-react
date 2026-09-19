import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { notifications, pushSubscriptions, users } from '../db/schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import webPush from 'web-push';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(20),
  unread_only: z.string().optional(),
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export const notificationRoutes = new Hono()
  .get('/', zValidator('query', querySchema), async (c) => {
    const { page, page_size, unread_only } = c.req.valid('query');
    const user = c.get('user');
    const db = createDb(c.env);

    let query = db.select().from(notifications).where(eq(notifications.user_id, user.id));
    if (unread_only === 'true') {
      query = query.where(eq(notifications.read, false));
    }
    query = query.orderBy(desc(notifications.created_at));

    const total = await db.select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.user_id, user.id), unread_only === 'true' ? eq(notifications.read, false) : undefined));

    const data = await query.limit(page_size).offset((page - 1) * page_size);

    return c.json({
      data,
      total: total[0].count,
      page,
      page_size,
      total_pages: Math.ceil(total[0].count / page_size),
    });
  })
  .get('/unread-count', async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const result = await db.select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.user_id, user.id), eq(notifications.read, false)));

    return c.json({ count: result[0].count });
  })
  .patch('/:id/read', async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const [notification] = await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, c.req.param('id')), eq(notifications.user_id, user.id)))
      .returning();

    if (!notification) return c.json({ error: 'Notification not found' }, 404);
    return c.json({ data: notification });
  })
  .patch('/read-all', async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.user_id, user.id), eq(notifications.read, false)));

    return c.json({ message: 'All notifications marked as read' });
  })
  .delete('/:id', async (c) => {
    const user = c.get('user');
    const db = createDb(c.env);

    const [notification] = await db.delete(notifications)
      .where(and(eq(notifications.id, c.req.param('id')), eq(notifications.user_id, user.id)))
      .returning();

    if (!notification) return c.json({ error: 'Notification not found' }, 404);
    return c.json({ message: 'Notification deleted' });
  })
  .post('/subscribe', zValidator('json', subscriptionSchema), async (c) => {
    const { endpoint, keys } = c.req.valid('json');
    const user = c.get('user');
    const db = createDb(c.env);

    const existing = await db.select().from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.user_id, user.id), eq(pushSubscriptions.endpoint, endpoint)))
      .limit(1);

    if (existing.length) {
      return c.json({ message: 'Already subscribed' });
    }

    const [subscription] = await db.insert(pushSubscriptions).values({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }).returning();

    return c.json({ data: subscription }, 201);
  })
  .delete('/unsubscribe', zValidator('json', z.object({ endpoint: z.string().url() })), async (c) => {
    const { endpoint } = c.req.valid('json');
    const user = c.get('user');
    const db = createDb(c.env);

    await db.delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.user_id, user.id), eq(pushSubscriptions.endpoint, endpoint)));

    return c.json({ message: 'Unsubscribed' });
  })
  .get('/vapid-key', (c) => {
    return c.json({ publicKey: c.env.VAPID_PUBLIC_KEY });
  });

// Helper function to send push notification
export async function sendPushNotification(
  env: { VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; VAPID_SUBJECT: string },
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info',
  actionUrl?: string
) {
  const db = createDb(env);
  const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.user_id, userId));

  webPush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({ title, message, type, actionUrl });

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
    } catch (error) {
      if ((error as any).statusCode === 410 || (error as any).statusCode === 404) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
      console.error('Push notification failed:', error);
    }
  }
}

// Helper to create in-app notification
export async function createNotification(
  env: { DATABASE_URL: string },
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info',
  actionUrl?: string
) {
  const db = createDb(env);
  const [notification] = await db.insert(notifications).values({
    user_id: userId,
    title,
    message,
    type,
    action_url: actionUrl,
  }).returning();
  return notification;
}