import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, pgEnum, date, time, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['admin', 'manager', 'operator']);
export const workerStatusEnum = pgEnum('worker_status', ['active', 'inactive', 'on_leave']);
export const machineStatusEnum = pgEnum('machine_status', ['operational', 'maintenance', 'offline', 'error']);
export const shiftTypeEnum = pgEnum('shift_type', ['day', 'night', 'rotating']);
export const shiftAssignmentStatusEnum = pgEnum('shift_assignment_status', ['scheduled', 'completed', 'absent', 'late']);
export const notificationTypeEnum = pgEnum('notification_type', ['info', 'warning', 'error', 'success']);
export const reportTypeEnum = pgEnum('report_type', ['production', 'worker', 'machine', 'shift', 'quality']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('operator'),
  full_name: varchar('full_name', { length: 100 }).notNull(),
  avatar_url: varchar('avatar_url', { length: 500 }),
  is_active: boolean('is_active').notNull().default(true),
  notify_live_activity: boolean('notify_live_activity').notNull().default(false),
  last_login: timestamp('last_login', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  usernameIdx: uniqueIndex('users_username_idx').on(table.username),
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const workers = pgTable('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  employee_id: varchar('employee_id', { length: 20 }).notNull().unique(),
  full_name: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  department: varchar('department', { length: 50 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  shift_type: shiftTypeEnum('shift_type').notNull().default('day'),
  hire_date: date('hire_date').notNull(),
  status: workerStatusEnum('status').notNull().default('active'),
  avatar_url: varchar('avatar_url', { length: 500 }),
  skills: jsonb('skills').$type<string[]>().default([]),
  certifications: jsonb('certifications').$type<Certification[]>().default([]),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  employeeIdIdx: uniqueIndex('workers_employee_id_idx').on(table.employee_id),
  emailIdx: uniqueIndex('workers_email_idx').on(table.email),
  departmentIdx: index('workers_department_idx').on(table.department),
  statusIdx: index('workers_status_idx').on(table.status),
}));

export const machines = pgTable('machines', {
  id: uuid('id').primaryKey().defaultRandom(),
  machine_code: varchar('machine_code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  manufacturer: varchar('manufacturer', { length: 100 }),
  model: varchar('model', { length: 100 }),
  serial_number: varchar('serial_number', { length: 100 }),
  location: varchar('location', { length: 100 }),
  status: machineStatusEnum('status').notNull().default('operational'),
  last_maintenance: timestamp('last_maintenance', { withTimezone: true }),
  next_maintenance: timestamp('next_maintenance', { withTimezone: true }),
  specifications: jsonb('specifications').$type<Record<string, unknown>>().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  machineCodeIdx: uniqueIndex('machines_machine_code_idx').on(table.machine_code),
  statusIdx: index('machines_status_idx').on(table.status),
  typeIdx: index('machines_type_idx').on(table.type),
}));

export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(),
  start_time: time('start_time').notNull(),
  end_time: time('end_time').notNull(),
  days: integer('days').array().notNull().default([1,2,3,4,5]),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shiftAssignments = pgTable('shift_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  worker_id: uuid('worker_id').notNull().references(() => workers.id, { onDelete: 'cascade' }),
  shift_id: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  status: shiftAssignmentStatusEnum('status').notNull().default('scheduled'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workerDateIdx: uniqueIndex('shift_assignments_worker_date_idx').on(table.worker_id, table.date),
  dateIdx: index('shift_assignments_date_idx').on(table.date),
  shiftIdx: index('shift_assignments_shift_idx').on(table.shift_id),
}));

export const productionRecords = pgTable('production_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  machine_id: uuid('machine_id').notNull().references(() => machines.id, { onDelete: 'cascade' }),
  worker_id: uuid('worker_id').notNull().references(() => workers.id, { onDelete: 'cascade' }),
  shift_id: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  product_name: varchar('product_name', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull().default(0),
  target_quantity: integer('target_quantity').notNull().default(0),
  quality_pass: integer('quality_pass').notNull().default(0),
  quality_fail: integer('quality_fail').notNull().default(0),
  start_time: timestamp('start_time', { withTimezone: true }).notNull(),
  end_time: timestamp('end_time', { withTimezone: true }).notNull(),
  downtime_minutes: integer('downtime_minutes').notNull().default(0),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  machineIdx: index('production_machine_idx').on(table.machine_id),
  workerIdx: index('production_worker_idx').on(table.worker_id),
  shiftIdx: index('production_shift_idx').on(table.shift_id),
  dateIdx: index('production_date_idx').on(table.start_time),
}));

export const productionRuns = pgTable('production_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  machine_id: uuid('machine_id').notNull().references(() => machines.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  group_id: uuid('group_id').references(() => groups.id, { onDelete: 'set null' }),
  item_name: varchar('item_name', { length: 160 }).default(''),
  item_code: varchar('item_code', { length: 80 }).default(''),
  operator: varchar('operator', { length: 120 }).default(''),
  started_at: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  stopped_at: timestamp('stopped_at', { withTimezone: true }),
  status: varchar('status', { length: 32 }).default('running'),
  note: text('note').default(''),
  shift: varchar('shift', { length: 16 }).default('day'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  machineIdx: index('production_runs_machine_idx').on(table.machine_id),
  startedAtIdx: index('production_runs_started_at_idx').on(table.started_at),
}));

export const machineLogs = pgTable('machine_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  machine_id: uuid('machine_id').notNull().references(() => machines.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 32 }).default(''),
  note: text('note').default(''),
  updated_by: varchar('updated_by', { length: 120 }).default(''),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  shift: varchar('shift', { length: 16 }).default('day'),
}, (table) => ({
  machineTimestampIdx: index('machine_logs_machine_timestamp_idx').on(table.machine_id, table.timestamp),
}));

export const dailyRecords = pgTable('daily_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  record_date: date('record_date').notNull(),
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
  shift: varchar('shift', { length: 16 }).default('day'),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dateShiftIdx: uniqueIndex('daily_records_date_shift_idx').on(table.record_date, table.shift),
  dateIdx: index('daily_records_date_idx').on(table.record_date),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull().default('info'),
  read: boolean('read').notNull().default(false),
  action_url: varchar('action_url', { length: 500 }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.user_id),
  readIdx: index('notifications_read_idx').on(table.read),
}));

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  type: reportTypeEnum('type').notNull(),
  filters: jsonb('filters').$type<Record<string, unknown>>().default({}),
  generated_at: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  generated_by: uuid('generated_by').notNull().references(() => users.id),
  file_url: varchar('file_url', { length: 500 }),
}, (table) => ({
  typeIdx: index('reports_type_idx').on(table.type),
  generatedByIdx: index('reports_generated_by_idx').on(table.generated_by),
}));

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  last_seen: timestamp('last_seen', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('push_subscriptions_user_idx').on(table.user_id),
}));

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description').default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  code: varchar('code', { length: 64 }).default(''),
  group_id: uuid('group_id').references(() => groups.id, { onDelete: 'set null' }),
  target_qty: integer('target_qty').default(0),
  unit: varchar('unit', { length: 32 }).default('units'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  groupIdx: index('products_group_idx').on(table.group_id),
}));

export const dailyProduction = pgTable('daily_production', {
  id: uuid('id').primaryKey().defaultRandom(),
  record_date: date('record_date').notNull(),
  machine_id: uuid('machine_id').references(() => machines.id, { onDelete: 'set null' }),
  machine_name: varchar('machine_name', { length: 120 }).notNull().default(''),
  product_id: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  item_code: varchar('item_code', { length: 160 }).notNull().default(''),
  group_id: uuid('group_id').references(() => groups.id, { onDelete: 'set null' }),
  day_production: integer('day_production').notNull().default(0),
  day_weight: integer('day_weight').notNull().default(0),
  night_production: integer('night_production').notNull().default(0),
  night_weight: integer('night_weight').notNull().default(0),
  total_production: integer('total_production').notNull().default(0),
  total_weight: integer('total_weight').notNull().default(0),
  note: varchar('note', { length: 255 }).default(''),
  created_by: varchar('created_by', { length: 120 }).default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dateMachineIdx: index('daily_production_date_machine_idx').on(table.record_date, table.machine_id),
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

export const productionRunsRelations = relations(productionRuns, ({ one }) => ({
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