import { Context, HTTPException } from 'hono';
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

  return c.json(
    { error: 'Internal server error', code: 500 },
    500
  );
}