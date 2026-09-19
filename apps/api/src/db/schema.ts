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
}, (table) => ({
  userIdx: index('push_subscriptions_user_idx').on(table.user_id),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.user_id], references: [users.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  generatedBy: one(users, { fields: [reports.generated_by], references: [users.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.user_id], references: [users.id] }),
}));