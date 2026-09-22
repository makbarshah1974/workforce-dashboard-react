import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

config({ path: '.dev.vars' });

const DATABASE_URL = process.env.DATABASE_URL || 'file:./data.db';

const dbPath = DATABASE_URL.replace('file:', '');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const client = createClient({ url: DATABASE_URL });

const sql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  notify_live_activity INTEGER NOT NULL DEFAULT 0,
  last_login INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'day',
  hire_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  skills TEXT DEFAULT '[]',
  certifications TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS workers_employee_id_idx ON workers(employee_id);
CREATE INDEX IF NOT EXISTS workers_email_idx ON workers(email);
CREATE INDEX IF NOT EXISTS workers_department_idx ON workers(department);
CREATE INDEX IF NOT EXISTS workers_status_idx ON workers(status);

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  machine_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'operational',
  last_maintenance INTEGER,
  next_maintenance INTEGER,
  specifications TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS machines_machine_code_idx ON machines(machine_code);
CREATE INDEX IF NOT EXISTS machines_status_idx ON machines(status);
CREATE INDEX IF NOT EXISTS machines_type_idx ON machines(type);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS shift_assignments (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS shift_assignments_worker_date_idx ON shift_assignments(worker_id, date);
CREATE INDEX IF NOT EXISTS shift_assignments_date_idx ON shift_assignments(date);
CREATE INDEX IF NOT EXISTS shift_assignments_shift_idx ON shift_assignments(shift_id);

CREATE TABLE IF NOT EXISTS production_records (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  target_quantity INTEGER NOT NULL DEFAULT 0,
  quality_pass INTEGER NOT NULL DEFAULT 0,
  quality_fail INTEGER NOT NULL DEFAULT 0,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  downtime_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS production_machine_idx ON production_records(machine_id);
CREATE INDEX IF NOT EXISTS production_worker_idx ON production_records(worker_id);
CREATE INDEX IF NOT EXISTS production_shift_idx ON production_records(shift_id);
CREATE INDEX IF NOT EXISTS production_date_idx ON production_records(start_time);

CREATE TABLE IF NOT EXISTS production_runs (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  product_id TEXT,
  group_id TEXT,
  item_name TEXT DEFAULT '',
  item_code TEXT DEFAULT '',
  operator TEXT DEFAULT '',
  started_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  stopped_at INTEGER,
  status TEXT DEFAULT 'running',
  note TEXT DEFAULT '',
  shift TEXT DEFAULT 'day',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS production_runs_machine_idx ON production_runs(machine_id);
CREATE INDEX IF NOT EXISTS production_runs_started_at_idx ON production_runs(started_at);

CREATE TABLE IF NOT EXISTS machine_logs (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  status TEXT DEFAULT '',
  note TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  shift TEXT DEFAULT 'day'
);

CREATE UNIQUE INDEX IF NOT EXISTS machine_logs_machine_timestamp_idx ON machine_logs(machine_id, timestamp);

CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY,
  record_date TEXT NOT NULL,
  total_workforce INTEGER DEFAULT 0,
  metex_staff INTEGER DEFAULT 0,
  csk_staff INTEGER DEFAULT 0,
  topquality_staff INTEGER DEFAULT 0,
  bestcare_staff INTEGER DEFAULT 0,
  prestige_staff INTEGER DEFAULT 0,
  working_machines INTEGER DEFAULT 0,
  working_machine_names TEXT DEFAULT '',
  out_of_order_machines INTEGER DEFAULT 0,
  out_of_order_machine_names TEXT DEFAULT '',
  workers_on_leave INTEGER DEFAULT 0,
  workers_on_leave_names TEXT DEFAULT '',
  maintenance_staff TEXT DEFAULT '',
  loading_staff INTEGER DEFAULT 0,
  loading_staff_names TEXT DEFAULT '',
  shift TEXT DEFAULT 'day',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_records_date_shift_idx ON daily_records(record_date, shift);
CREATE INDEX IF NOT EXISTS daily_records_date_idx ON daily_records(record_date);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read INTEGER NOT NULL DEFAULT 0,
  action_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  last_seen INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  filters TEXT DEFAULT '{}',
  generated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  generated_by TEXT NOT NULL,
  file_url TEXT
);

CREATE INDEX IF NOT EXISTS reports_type_idx ON reports(type);
CREATE INDEX IF NOT EXISTS reports_generated_by_idx ON reports(generated_by);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  last_seen INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  group_id TEXT,
  target_qty INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'units',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS products_group_idx ON products(group_id);

CREATE TABLE IF NOT EXISTS daily_production (
  id TEXT PRIMARY KEY,
  record_date TEXT NOT NULL,
  machine_id TEXT,
  machine_name TEXT DEFAULT '',
  product_id TEXT,
  item_code TEXT DEFAULT '',
  group_id TEXT,
  day_production INTEGER NOT NULL DEFAULT 0,
  day_weight INTEGER NOT NULL DEFAULT 0,
  night_production INTEGER NOT NULL DEFAULT 0,
  night_weight INTEGER NOT NULL DEFAULT 0,
  total_production INTEGER NOT NULL DEFAULT 0,
  total_weight INTEGER NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_production_date_machine_idx ON daily_production(record_date, machine_id);
`;

async function main() {
  console.log('Creating database...');
  const statements = sql.split(';').filter(s => s.trim());
  for (let i = 0; i < statements.length; i++) {
    try {
      await client.execute({ sql: statements[i].trim() });
    } catch (err) {
      console.error(`Error in statement ${i}:`, statements[i].trim().substring(0, 200));
      throw err;
    }
  }
  console.log('Database created!');
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});