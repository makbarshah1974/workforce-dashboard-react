import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { authRoutes } from './routes/auth';
import { workerRoutes } from './routes/workers';
import { machineRoutes } from './routes/machines';
import { productionRoutes } from './routes/production';
import { runsRoutes } from './routes/runs';
import { shiftRoutes } from './routes/shifts';
import { reportRoutes } from './routes/reports';
import { notificationRoutes } from './routes/notifications';
import { settingsRoutes } from './routes/settings';
import { healthRoutes } from './routes/health';
import { workforceRoutes } from './routes/workforce';
import { pushRoutes } from './routes/push';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  FRONTEND_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', secureHeaders());
app.use('/api/*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL;
    if (origin === frontendUrl || origin === 'http://localhost:3000') {
      return origin;
    }
    return frontendUrl;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Set-Cookie'],
  maxAge: 86400,
}));

// Apply auth middleware to all /api/* routes except health and auth
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (path.startsWith('/api/health') || path.startsWith('/api/auth')) {
    return next();
  }
  return authMiddleware(c as any, next);
});

app.onError(errorHandler);

app.route('/api/health', healthRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/workers', workerRoutes);
app.route('/api/machines', machineRoutes);
app.route('/api/production', productionRoutes);
app.route('/api/runs', runsRoutes);
app.route('/api/shifts', shiftRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/workforce', workforceRoutes);
app.route('/api/push', pushRoutes);

app.get('/', (c) => c.json({ name: 'Workforce Dashboard API', version: '1.0.0' }));

export default app;