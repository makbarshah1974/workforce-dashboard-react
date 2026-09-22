import { config } from 'dotenv';
import { serve } from '@hono/node-server';
import app from './index';

config({ path: './.dev.vars' });

const port = parseInt(process.env.PORT || '8787');

function getEnv() {
  return {
    DATABASE_URL: process.env.DATABASE_URL || '',
    JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || '',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  };
}

serve({
  fetch: (request) => app.fetch(request, getEnv()),
  port,
}, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
