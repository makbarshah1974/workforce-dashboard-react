export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
  full_name: string;
  avatar_url?: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  theme?: 'dark' | 'light' | 'system';
  password_hash?: string;
}

export interface Worker {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
  shift_type: 'day' | 'night' | 'rotating';
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  avatar_url?: string;
  skills: string[];
  certifications: Certification[];
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  name: string;
  issued_date: string;
  expiry_date?: string;
  issuer: string;
}

export interface Machine {
  id: string;
  machine_code: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  location: string;
  status: 'operational' | 'maintenance' | 'offline' | 'error';
  last_maintenance: string;
  next_maintenance: string;
  specifications: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  day_hours?: number;
  night_hours?: number;
  notes?: string;
}

export interface ProductionRecord {
  id: string;
  machine_id: string;
  worker_id: string;
  shift_id: string;
  product_name: string;
  quantity: number;
  target_quantity: number;
  quality_pass: number;
  quality_fail: number;
  start_time: string;
  end_time: string;
  downtime_minutes: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  machine_name?: string;
  worker_name?: string;
  shift_name?: string;
}

export interface ProductionRun {
  id: number;
  machine_id: number;
  product_id: number | null;
  group_id: number | null;
  item_name: string;
  item_code: string;
  operator: string;
  started_at: string;
  stopped_at: string | null;
  status: 'running' | 'stopped';
  note: string;
  shift: 'day' | 'night';
  created_at: string;
  run_seconds?: number;
  run_time?: string;
  machine_name?: string;
  product_name?: string;
  group_name?: string;
  machine_status?: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: string;
  worker_id: string;
  shift_id: string;
  date: string;
  status: 'scheduled' | 'completed' | 'absent' | 'late';
  created_at: string;
  updated_at: string;
  worker_name?: string;
  shift_name?: string;
  shift_start?: string;
  shift_end?: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  group_id: string | null;
  target_qty: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  action_url?: string;
  created_at: string;
}

export interface Report {
  id: string;
  name: string;
  type: 'production' | 'worker' | 'machine' | 'shift' | 'quality';
  filters: Record<string, unknown>;
  generated_at: string;
  generated_by: string;
  generated_by_name?: string;
  file_url?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Time calculation utilities
export * from './timeCalculations';