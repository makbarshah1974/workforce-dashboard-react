import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sign, verify } from 'hono/jwt';
import { createDb } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import type { Env } from '../index';

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2).max(100),
  role: z.enum(['admin', 'manager', 'operator']).default('operator'),
});

export const authRoutes = new Hono<{ Bindings: Env }>()
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { username, password } = c.req.valid('json');
    const db = createDb(c.env);

    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user.length) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const valid = await bcrypt.compare(password, user[0].password_hash);
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (!user[0].is_active) {
      return c.json({ error: 'Account is disabled' }, 403);
    }

    const token = await sign(
      { sub: user[0].id, username: user[0].username, role: user[0].role },
      c.env.JWT_SECRET,
      'HS256'
    );

    await db.update(users).set({ last_login: new Date() }).where(eq(users.id, user[0].id));

    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    const { password_hash, ...userWithoutPassword } = user[0];
    return c.json({ user: userWithoutPassword, token });
  })
  .post('/register', zValidator('json', registerSchema), async (c) => {
    const { username, email, password, full_name, role } = c.req.valid('json');
    const db = createDb(c.env);

    // @ts-ignore - drizzle type inference
    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing.length) {
      return c.json({ error: 'Username already exists' }, 409);
    }

    const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail.length) {
      return c.json({ error: 'Email already exists' }, 409);
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [newUser] = await db.insert(users).values({
      username,
      email,
      password_hash,
      full_name,
      role,
    }).returning();

    const token = await sign(
      { sub: newUser.id, username: newUser.username, role: newUser.role },
      c.env.JWT_SECRET,
      'HS256'
    );

    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    const { password_hash: _, ...userWithoutPassword } = newUser;
    return c.json({ user: userWithoutPassword, token }, 201);
  })
  .post('/logout', async (c) => {
    deleteCookie(c, 'auth_token', { path: '/', secure: true, sameSite: 'None' });
    return c.json({ message: 'Logged out successfully' });
  })
  .get('/me', async (c) => {
    const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.slice(7);
    if (!token) {
      return c.json({ error: 'Not authenticated' }, 401);
    }

    try {
      const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as { sub: string; role: string };
      const db = createDb(c.env);
      const user = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);

      if (!user.length || !user[0].is_active) {
        return c.json({ error: 'User not found' }, 401);
      }

      const { password_hash, ...userWithoutPassword } = user[0];
      return c.json({ user: userWithoutPassword });
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  })
  .post('/refresh', async (c) => {
    const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.slice(7);
    if (!token) {
      return c.json({ error: 'Not authenticated' }, 401);
    }

    try {
      const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as { sub: string; username: string; role: string };
      const newToken = await sign(
        { sub: payload.sub, username: payload.username, role: payload.role },
        c.env.JWT_SECRET,
        'HS256'
      );

      setCookie(c, 'auth_token', newToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return c.json({ token: newToken });
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  });