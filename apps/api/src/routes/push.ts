import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createDb } from '../db';
import { pushSubscriptions, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import webPush from 'web-push';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const testPushSchema = z.object({
  user_id: z.string().uuid().optional(),
  body: z.string().optional(),
});

export const pushRoutes = new Hono()
  .get('/vapid-key', (c) => {
    return c.json({ publicKey: c.env.VAPID_PUBLIC_KEY });
  })
  .post('/subscribe', zValidator('json', subscriptionSchema), async (c) => {
    const { endpoint, keys } = c.req.valid('json');
    const user = c.get('user');
    const db = createDb(c.env);

    const existing = await db.select().from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.user_id, user.id), eq(pushSubscriptions.endpoint, endpoint)))
      .limit(1);

    if (existing.length) {
      await db.update(pushSubscriptions)
        .set({ p256dh: keys.p256dh, auth: keys.auth, last_seen: new Date() })
        .where(eq(pushSubscriptions.id, existing[0].id));
      return c.json({ ok: true });
    }

    await db.insert(pushSubscriptions).values({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    return c.json({ ok: true }, 201);
  })
  .delete('/unsubscribe', zValidator('json', z.object({ endpoint: z.string().url() })), async (c) => {
    const { endpoint } = c.req.valid('json');
    const user = c.get('user');
    const db = createDb(c.env);

    await db.delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.user_id, user.id), eq(pushSubscriptions.endpoint, endpoint)));

    return c.json({ ok: true });
  })
  .post('/test', zValidator('json', testPushSchema), async (c) => {
    if (!c.env.VAPID_PRIVATE_KEY || !c.env.VAPID_PUBLIC_KEY) {
      return c.json({ ok: false, error: 'VAPID keys not configured' }, 400);
    }

    const { user_id, body } = c.req.valid('json');
    const targetUserId = user_id || c.get('user').id;
    const db = createDb(c.env);

    const subs = await db.select().from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.user_id, targetUserId), eq(users.id, targetUserId), eq(users.notify_live_activity, true)))
      .innerJoin(users, eq(pushSubscriptions.user_id, users.id))
      .all();

    if (!subs.length) {
      return c.json({ ok: false, error: 'No push subscription found for user' }, 400);
    }

    webPush.setVapidDetails(
      c.env.VAPID_SUBJECT,
      c.env.VAPID_PUBLIC_KEY,
      c.env.VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      title: 'Live Machine Activity',
      body: body || 'This is a test push — live status alerts work.',
      action: 'test',
    });

    for (const s of subs) {
      try {
        await webPush.sendNotification(
          { endpoint: s.push_subscriptions.endpoint, keys: { p256dh: s.push_subscriptions.p256dh, auth: s.push_subscriptions.auth } },
          payload
        );
        await db.update(pushSubscriptions).set({ last_seen: new Date() }).where(eq(pushSubscriptions.id, s.push_subscriptions.id));
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.push_subscriptions.id));
        }
      }
    }

    return c.json({ ok: true, message: 'Test push sent' });
  });