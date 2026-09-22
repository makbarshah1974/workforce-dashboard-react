import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import * as schema from './schema.sqlite';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config({ path: '.dev.vars' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const client = createClient({ url: DATABASE_URL });
  const db = drizzle(client, { schema });

  console.log('Seeding database...');

  const existingUser = await db.select().from(schema.users).where(
    eq(schema.users.username, 'admin')
  ).limit(1);

  if (existingUser.length) {
    console.log('Admin user already exists');
  } else {
    const passwordHash = await bcrypt.hash('admin123', 12);
    const now = new Date();
    const [admin] = await db.insert(schema.users).values({
      username: 'admin',
      email: 'admin@metex.com',
      password_hash: passwordHash,
      role: 'admin' as const,
      full_name: 'System Administrator',
      is_active: true,
      notify_live_activity: false,
      created_at: now,
      updated_at: now,
    }).returning();

    if (admin) {
      console.log('Created admin user');
    }
  }

  const shiftsData = [
    { name: 'Morning Shift', start_time: '06:00', end_time: '14:00', days: '[1,2,3,4,5]', is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: 'Afternoon Shift', start_time: '14:00', end_time: '22:00', days: '[1,2,3,4,5]', is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: 'Night Shift', start_time: '22:00', end_time: '06:00', days: '[1,2,3,4,5]', is_active: true, created_at: new Date(), updated_at: new Date() },
    { name: 'Weekend Shift', start_time: '08:00', end_time: '16:00', days: '[0,6]', is_active: true, created_at: new Date(), updated_at: new Date() },
  ];

  for (const shift of shiftsData) {
    await db.insert(schema.shifts).values(shift).onConflictDoNothing();
  }
  console.log('Created sample shifts');

  const machinesData = [
    { machine_code: 'MC-001', name: 'CNC Lathe 1', type: 'CNC Lathe', manufacturer: 'Haas', model: 'ST-20', serial_number: 'SN-001', location: 'Floor A', status: 'operational' as const, specifications: '{}', created_at: new Date(), updated_at: new Date() },
    { machine_code: 'MC-002', name: 'CNC Mill 1', type: 'CNC Mill', manufacturer: 'Haas', model: 'VF-2', serial_number: 'SN-002', location: 'Floor A', status: 'operational' as const, specifications: '{}', created_at: new Date(), updated_at: new Date() },
    { machine_code: 'MC-003', name: 'Injection Molding 1', type: 'Injection Molding', manufacturer: 'Arburg', model: 'Allrounder 470', serial_number: 'SN-003', location: 'Floor B', status: 'maintenance' as const, specifications: '{}', created_at: new Date(), updated_at: new Date() },
    { machine_code: 'MC-004', name: 'Laser Cutter 1', type: 'Laser Cutter', manufacturer: 'Trumpf', model: 'TruLaser 3030', serial_number: 'SN-004', location: 'Floor B', status: 'operational' as const, specifications: '{}', created_at: new Date(), updated_at: new Date() },
    { machine_code: 'MC-005', name: 'Press Brake 1', type: 'Press Brake', manufacturer: 'Amada', model: 'HFE 1003', serial_number: 'SN-005', location: 'Floor C', status: 'operational' as const, specifications: '{}', created_at: new Date(), updated_at: new Date() },
  ];

  for (const machine of machinesData) {
    await db.insert(schema.machines).values(machine).onConflictDoNothing();
  }
  console.log('Created sample machines');

  const workersData = [
    { employee_id: 'EMP-001', full_name: 'Rajesh Kumar', email: 'rajesh@metex.com', phone: '+91-9876543210', department: 'Production', role: 'CNC Operator', shift_type: 'day' as const, hire_date: '2022-01-15', status: 'active' as const, avatar_url: null as string | null, skills: '["CNC Programming","Blueprint Reading"]', certifications: '[]', created_at: new Date(), updated_at: new Date() },
    { employee_id: 'EMP-002', full_name: 'Priya Sharma', email: 'priya@metex.com', phone: '+91-9876543211', department: 'Quality', role: 'Quality Inspector', shift_type: 'day' as const, hire_date: '2021-06-20', status: 'active' as const, avatar_url: null as string | null, skills: '["Quality Control","Calibration"]', certifications: '[{"id":"cert-1","name":"ISO 9001 Lead Auditor","issued_date":"2023-01-15","issuer":"BSI"}]', created_at: new Date(), updated_at: new Date() },
    { employee_id: 'EMP-003', full_name: 'Amit Patel', email: 'amit@metex.com', phone: '+91-9876543212', department: 'Maintenance', role: 'Maintenance Technician', shift_type: 'rotating' as const, hire_date: '2020-03-10', status: 'active' as const, avatar_url: null as string | null, skills: '["Preventive Maintenance","Hydraulics","Pneumatics"]', certifications: '[]', created_at: new Date(), updated_at: new Date() },
    { employee_id: 'EMP-004', full_name: 'Sunita Reddy', email: 'sunita@metex.com', phone: '+91-9876543213', department: 'Production', role: 'Machine Operator', shift_type: 'night' as const, hire_date: '2023-02-01', status: 'active' as const, avatar_url: null as string | null, skills: '["Machine Operation","Material Handling"]', certifications: '[]', created_at: new Date(), updated_at: new Date() },
    { employee_id: 'EMP-005', full_name: 'Vikram Singh', email: 'vikram@metex.com', phone: '+91-9876543214', department: 'Production', role: 'Shift Supervisor', shift_type: 'rotating' as const, hire_date: '2019-11-05', status: 'active' as const, avatar_url: null as string | null, skills: '["Team Leadership","Production Planning","Lean Manufacturing"]', certifications: '[{"id":"cert-2","name":"Six Sigma Green Belt","issued_date":"2022-05-20","issuer":"ASQ"}]', created_at: new Date(), updated_at: new Date() },
  ];

  for (const worker of workersData) {
    await db.insert(schema.workers).values(worker).onConflictDoNothing();
  }
  console.log('Created sample workers');

  console.log('Seeding complete!');
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});