# Workforce Dashboard - React + Cloudflare Workers

A modern workforce and machine monitoring dashboard built with React 18, TypeScript, Tailwind CSS, and deployed on Cloudflare Pages + Workers.

## Architecture

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS (deployed on Cloudflare Pages)
- **Backend**: Hono + TypeScript (deployed on Cloudflare Workers)
- **Database**: Neon PostgreSQL (existing DB from Flask app)
- **Auth**: JWT in HttpOnly cookies
- **Real-time**: Web Push notifications (VAPID)
- **Deployment**: Always-live free tier, no cold starts

## Project Structure

```
workforce-dashboard-react/
├── apps/
│   ├── web/          # React frontend (Cloudflare Pages)
│   └── api/          # Hono Worker API (Cloudflare Workers)
├── packages/
│   └── shared/       # Shared types and utilities
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Cloudflare account (for deployment)
- Neon PostgreSQL database

## Local Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   # Frontend
   cp apps/web/.env.example apps/web/.env
   
   # Backend
   cp apps/api/.dev.vars.example apps/api/.dev.vars
   # Edit apps/api/.dev.vars with your credentials
   ```

3. **Run database migrations**:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

4. **Start development servers**:
   ```bash
   # Terminal 1 - Frontend (port 3000)
   pnpm dev:web
   
   # Terminal 2 - API (port 8787)
   pnpm dev:api
   ```

5. **Open http://localhost:3000**

## Environment Variables

### Frontend (apps/web/.env)
```env
VITE_API_URL=http://localhost:8787/api
```

### Backend (apps/api/.dev.vars)
```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# JWT Secret (min 32 chars)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# VAPID Keys for Web Push
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:admin@yourdomain.com"

# Frontend URL for CORS
FRONTEND_URL="http://localhost:3000"
```

## Database Schema

The database schema matches the original Flask app with these key tables:

- **users** - Authentication, roles, permissions, web push preferences
- **machines** - Machine fleet with status, shift hours
- **machine_logs** - Status change audit trail
- **production_runs** - Start/stop production sessions
- **daily_records** - Daily workforce snapshots per shift
- **daily_production** - Daily production data (Excel import)
- **groups/products** - Organizational hierarchy
- **shifts/shift_assignments** - Shift scheduling
- **push_subscriptions** - Web Push endpoints
- **notifications** - In-app notifications
- **reports** - Generated reports
- **user_audit_logs** - General activity audit

## Key Features Ported from Flask

### Machine Monitoring
- Live machine status (running/idle/maintenance/out_of_order)
- Bulk start/stop operations
- Per-machine shift hours (day/night)
- Status change audit trail with notes

### Time Calculations (UAE UTC+4)
- Shift-day: 07:00 → next 07:00
- Day shift: 07:00-19:00, Night shift: 19:00-07:00
- Running time: -1h break per half if >6h (max 11h/half, no 9h cap)
- Downtime (idle/breakdown/maintenance): Day shift only, max 9h/shift-day

### Production Tracking
- Start/stop production runs with item tracking
- Daily production sheet with Excel import
- Machine-wise and product-wise summaries
- Runtime from MachineLog (single source of truth)

### Workforce Management
- Daily records per date + shift
- Multi-contractor staff tracking (Metex, CSK, TopQuality, BestCare, Prestige)
- Workers on leave, maintenance staff, loading staff

### Reports & Exports
- Machine-wise time summary (running/idle/breakdown/maintenance)
- Day-wise accumulated time
- Production summaries with runtime
- CSV exports for all reports

### Web Push Notifications
- VAPID-based push for live machine status alerts
- Admin-controlled per-user subscription
- Service Worker at root scope (/sw.js)

### Access Control
- Role-based: admin, manager, operator
- Per-page permissions
- JWT in HttpOnly cookies with CSRF protection

## Deployment

### Cloudflare Pages (Frontend)
1. Connect GitHub repo to Cloudflare Pages
2. Build command: `pnpm build:web`
3. Output directory: `apps/web/dist`
4. Add environment variable: `VITE_API_URL=https://your-worker.your-subdomain.workers.dev/api`

### Cloudflare Workers (API)
1. `pnpm deploy:api` or use Wrangler dashboard
2. Set secrets: `DATABASE_URL`, `JWT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `FRONTEND_URL`

## Scripts

```bash
# Development
pnpm dev:web        # Start frontend dev server
pnpm dev:api        # Start API dev server (Wrangler)
pnpm dev            # Run both (requires concurrent terminals)

# Building
pnpm build:web      # Build frontend for production
pnpm build:api      # Build & validate Worker
pnpm build          # Build both

# Database
pnpm db:push        # Run migrations
pnpm db:seed        # Seed with sample data

# Deployment
pnpm deploy:web     # Deploy to Cloudflare Pages
pnpm deploy:api     # Deploy to Cloudflare Workers

# Code Quality
pnpm lint           # Lint all packages
pnpm typecheck      # TypeScript check all packages
pnpm test           # Run tests
```

## Migration from Flask

This React app is a complete rewrite of the original Flask + Jinja2 application (`../react_dashboard/`). Key migrations:

| Flask Feature | React Implementation |
|---------------|---------------------|
| Jinja2 templates | React 18 + TypeScript components |
| Flask-SQLAlchemy | Drizzle ORM + Neon serverless |
| Session cookies | JWT in HttpOnly cookies |
| Flask routes | Hono Worker routes |
| Jinja2 macros | React component library |
| Server-side rendering | Client-side SPA with API |
| Celery/background tasks | Cloudflare Workers (edge) |
| Gunicorn | Cloudflare Workers (always live) |

## License

MIT