import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createDb } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { verify } from 'hono/jwt';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const cookieHeader = c.req.header('Cookie');

  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    token = cookies['auth_token'] || null;
  }

  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET) as { sub: string; role: string };
    const db = createDb(c.env);
    const user = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);

    if (!user.length || !user[0].is_active) {
      throw new HTTPException(401, { message: 'User not found or inactive' });
    }

    c.set('user', user[0]);
    c.set('db', db);
    await next();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(401, { message: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }
    await next();
  };
}