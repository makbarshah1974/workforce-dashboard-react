import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username', { length: 50 }).notNull().unique(),
  email: text('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash', { length: 255 }).notNull(),
  role: text('role', { enum: ['admin', 'manager', 'operator'] as const }).notNull().default('operator'),
  full_name: text('full_name', { length: 100 }).notNull(),
  avatar_url: text('avatar_url', { length: 500 }),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notify_live_activity: integer('notify_live_activity', { mode: 'boolean' }).notNull().default(false),
  last_login: integer('last_login', { mode: 'timestamp_ms' }),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  usernameIdx: uniqueIndex('users_username_idx').on(table.username),
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const workers = sqliteTable('workers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employee_id: text('employee_id', { length: 20 }).notNull().unique(),
  full_name: text('full_name', { length: 100 }).notNull(),
  email: text('email', { length: 255 }).notNull().unique(),
  phone: text('phone', { length: 20 }),
  department: text('department', { length: 50 }).notNull(),
  role: text('role', { length: 50 }).notNull(),
  shift_type: text('shift_type', { enum: ['day', 'night', 'rotating'] as const }).notNull().default('day'),
  hire_date: text('hire_date').notNull(),
  status: text('status', { enum: ['active', 'inactive', 'on_leave'] as const }).notNull().default('active'),
  avatar_url: text('avatar_url', { length: 500 }),
  skills: text('skills', { mode: 'json' }).default('[]'),
  certifications: text('certifications', { mode: 'json' }).default('[]'),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  employeeIdIdx: uniqueIndex('workers_employee_id_idx').on(table.employee_id),
  emailIdx: uniqueIndex('workers_email_idx').on(table.email),
  departmentIdx: index('workers_department_idx').on(table.department),
  statusIdx: index('workers_status_idx').on(table.status),
}));

export const machines = sqliteTable('machines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  machine_code: text('machine_code', { length: 20 }).notNull().unique(),
  name: text('name', { length: 100 }).notNull(),
  type: text('type', { length: 50 }).notNull(),
  manufacturer: text('manufacturer', { length: 100 }),
  model: text('model', { length: 100 }),
  serial_number: text('serial_number', { length: 100 }),
  location: text('location', { length: 100 }),
  status: text('status', { enum: ['operational', 'maintenance', 'offline', 'error'] as const }).notNull().default('operational'),
  last_maintenance: integer('last_maintenance', { mode: 'timestamp_ms' }),
  next_maintenance: integer('next_maintenance', { mode: 'timestamp_ms' }),
  specifications: text('specifications', { mode: 'json' }).default('{}'),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  machineCodeIdx: uniqueIndex('machines_machine_code_idx').on(table.machine_code),
  statusIdx: index('machines_status_idx').on(table.status),
  typeIdx: index('machines_type_idx').on(table.type),
}));

export const shifts = sqliteTable('shifts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name', { length: 50 }).notNull(),
  start_time: text('start_time').notNull(),
  end_time: text('end_time').notNull(),
  days: text('days', { mode: 'json' }).notNull().default('[1,2,3,4,5]'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

export const shiftAssignments = sqliteTable('shift_assignments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  worker_id: text('worker_id').notNull(),
  shift_id: text('shift_id').notNull(),
  date: text('date').notNull(),
  status: text('status', { enum: ['scheduled', 'completed', 'absent', 'late'] as const }).notNull().default('scheduled'),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workerDateIdx: uniqueIndex('shift_assignments_worker_date_idx').on(table.worker_id, table.date),
  dateIdx: index('shift_assignments_date_idx').on(table.date),
  shiftIdx: index('shift_assignments_shift_idx').on(table.shift_id),
}));

export const productionRecords = sqliteTable('production_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  machine_id: text('machine_id').notNull(),
  worker_id: text('worker_id').notNull(),
  shift_id: text('shift_id').notNull(),
  product_name: text('product_name', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull().default(0),
  target_quantity: integer('target_quantity').notNull().default(0),
  quality_pass: integer('quality_pass').notNull().default(0),
  quality_fail: integer('quality_fail').notNull().default(0),
  start_time: integer('start_time', { mode: 'timestamp_ms' }).notNull(),
  end_time: integer('end_time', { mode: 'timestamp_ms' }).notNull(),
  downtime_minutes: integer('downtime_minutes').notNull().default(0),
  notes: text('notes'),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  machineIdx: index('production_machine_idx').on(table.machine_id),
  workerIdx: index('production_worker_idx').on(table.worker_id),
  shiftIdx: index('production_shift_idx').on(table.shift_id),
  dateIdx: index('production_date_idx').on(table.start_time),
}));

export const productionRuns = sqliteTable('production_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  machine_id: text('machine_id').notNull(),
  product_id: text('product_id'),
  group_id: text('group_id'),
  item_name: text('item_name', { length: 160 }).default(''),
  item_code: text('item_code', { length: 80 }).default(''),
  operator: text('operator', { length: 120 }).default(''),
  started_at: integer('started_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  stopped_at: integer('stopped_at', { mode: 'timestamp_ms' }),
  status: text('status', { length: 32 }).default('running'),
  note: text('note').default(''),
  shift: text('shift', { length: 16 }).default('day'),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  machineIdx: index('production_runs_machine_idx').on(table.machine_id),
  startedAtIdx: index('production_runs_started_at_idx').on(table.started_at),
}));

export const machineLogs = sqliteTable('machine_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  machine_id: text('machine_id').notNull(),
  status: text('status', { length: 32 }).default(''),
  note: text('note').default(''),
  updated_by: text('updated_by', { length: 120 }).default(''),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  shift: text('shift', { length: 16 }).default('day'),
}, (table) => ({
  machineTimestampIdx: uniqueIndex('machine_logs_machine_timestamp_idx').on(table.machine_id, table.timestamp),
}));

export const dailyRecords = sqliteTable('daily_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  record_date: text('record_date').notNull(),
  total_workforce: integer('total_workforce').default(0),
  metex_staff: integer('metex_staff').default(0),
  csk_staff: integer('csk_staff').default(0),
  topquality_staff: integer('topquality_staff').default(0),
  bestcare_staff: integer('bestcare_staff').default(0),
  prestige_staff: integer('prestige_staff').default(0),
  working_machines: integer('working_machines').default(0),
  working_machine_names: text('working_machine_names').default(''),
  out_of_order_machines: integer('out_of_order_machines').default(0),
  out_of_order_machine_names: text('out_of_order_machine_names').default(''),
  workers_on_leave: integer('workers_on_leave').default(0),
  workers_on_leave_names: text('workers_on_leave_names').default(''),
  maintenance_staff: text('maintenance_staff').default(''),
  loading_staff: integer('loading_staff').default(0),
  loading_staff_names: text('loading_staff_names').default(''),
  shift: text('shift', { length: 16 }).default('day'),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  dateShiftIdx: uniqueIndex('daily_records_date_shift_idx').on(table.record_date, table.shift),
  dateIdx: index('daily_records_date_idx').on(table.record_date),
}));

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id').notNull(),
  title: text('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  type: text('type', { enum: ['info', 'warning', 'error', 'success'] as const }).notNull().default('info'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  action_url: text('action_url', { length: 500 }),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  last_seen: integer('last_seen', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.user_id),
  readIdx: index('notifications_read_idx').on(table.read),
}));

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name', { length: 200 }).notNull(),
  type: text('type', { enum: ['production', 'worker', 'machine', 'shift', 'quality'] as const }).notNull(),
  filters: text('filters', { mode: 'json' }).default('{}'),
  generated_at: integer('generated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  generated_by: text('generated_by').notNull(),
  file_url: text('file_url', { length: 500 }),
}, (table) => ({
  typeIdx: index('reports_type_idx').on(table.type),
  generatedByIdx: index('reports_generated_by_idx').on(table.generated_by),
}));

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id').notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  last_seen: integer('last_seen', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('push_subscriptions_user_idx').on(table.user_id),
}));

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name', { length: 120 }).notNull(),
  description: text('description').default(''),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name', { length: 120 }).notNull(),
  code: text('code', { length: 64 }).default(''),
  group_id: text('group_id'),
  target_qty: integer('target_qty').default(0),
  unit: text('unit', { length: 32 }).default('units'),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  groupIdx: index('products_group_idx').on(table.group_id),
}));

export const dailyProduction = sqliteTable('daily_production', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  record_date: text('record_date').notNull(),
  machine_id: text('machine_id'),
  machine_name: text('machine_name', { length: 120 }).notNull().default(''),
  product_id: text('product_id'),
  item_code: text('item_code', { length: 160 }).notNull().default(''),
  group_id: text('group_id'),
  day_production: integer('day_production').notNull().default(0),
  day_weight: integer('day_weight').notNull().default(0),
  night_production: integer('night_production').notNull().default(0),
  night_weight: integer('night_weight').notNull().default(0),
  total_production: integer('total_production').notNull().default(0),
  total_weight: integer('total_weight').notNull().default(0),
  note: text('note', { length: 255 }).default(''),
  created_by: text('created_by', { length: 120 }).default(''),
  created_at: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  dateMachineIdx: uniqueIndex('daily_production_date_machine_idx').on(table.record_date, table.machine_id),
}));

export type Certification = {
  id: string;
  name: string;
  issued_date: string;
  expiry_date?: string;
  issuer: string;
};

export const usersRelations = relations(users, ({ many }) => ({
  notifications: many(notifications),
  generatedReports: many(reports),
  pushSubscriptions: many(pushSubscriptions),
}));

export const workersRelations = relations(workers, ({ many }) => ({
  productionRecords: many(productionRecords),
  shiftAssignments: many(shiftAssignments),
}));

export const machinesRelations = relations(machines, ({ many }) => ({
  productionRecords: many(productionRecords),
  productionRuns: many(productionRuns),
  machineLogs: many(machineLogs),
}));

export const shiftsRelations = relations(shifts, ({ many }) => ({
  productionRecords: many(productionRecords),
  shiftAssignments: many(shiftAssignments),
}));

export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one }) => ({
  worker: one(workers, { fields: [shiftAssignments.worker_id], references: [workers.id] }),
  shift: one(shifts, { fields: [shiftAssignments.shift_id], references: [shifts.id] }),
}));

export const productionRecordsRelations = relations(productionRecords, ({ one }) => ({
  machine: one(machines, { fields: [productionRecords.machine_id], references: [machines.id] }),
  worker: one(workers, { fields: [productionRecords.worker_id], references: [workers.id] }),
  shift: one(shifts, { fields: [productionRecords.shift_id], references: [shifts.id] }),
}));

export const productionRunsRelations = relations(productionRuns, ({ one, many }) => ({
  machine: one(machines, { fields: [productionRuns.machine_id], references: [machines.id] }),
  product: one(products, { fields: [productionRuns.product_id], references: [products.id] }),
  group: one(groups, { fields: [productionRuns.group_id], references: [groups.id] }),
}));

export const machineLogsRelations = relations(machineLogs, ({ one }) => ({
  machine: one(machines, { fields: [machineLogs.machine_id], references: [machines.id] }),
}));

export const dailyRecordsRelations = relations(dailyRecords, () => ({}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.user_id], references: [users.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  generatedBy: one(users, { fields: [reports.generated_by], references: [users.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.user_id], references: [users.id] }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  machines: many(machines),
  products: many(products),
  productionRuns: many(productionRuns),
  dailyProduction: many(dailyProduction),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  group: one(groups, { fields: [products.group_id], references: [groups.id] }),
  machines: many(machines),
  productionRuns: many(productionRuns),
  dailyProduction: many(dailyProduction),
}));

export const dailyProductionRelations = relations(dailyProduction, ({ one }) => ({
  machine: one(machines, { fields: [dailyProduction.machine_id], references: [machines.id] }),
  product: one(products, { fields: [dailyProduction.product_id], references: [products.id] }),
  group: one(groups, { fields: [dailyProduction.group_id], references: [groups.id] }),
}));