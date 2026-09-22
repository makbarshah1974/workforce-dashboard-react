import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message, code: err.status }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json(
      { error: 'Validation failed', details: err.errors },
      400
    );
  }

  console.error('Unhandled error:', err);

  const errMsg = err.message || '';
  const errName = err.constructor?.name || '';

  if (errName === 'DrizzleQueryError' || errName === 'NeonPreparedQueryError') {
    return c.json(
      { error: 'Database connection failed. Please check DATABASE_URL.', code: 503 },
      503
    );
  }

  if (errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED') || errMsg.includes('ETIMEDOUT')) {
    return c.json(
      { error: 'Database connection failed. Please check DATABASE_URL.', code: 503 },
      503
    );
  }

  return c.json(
    { error: 'Internal server error', code: 500 },
    500
  );
}