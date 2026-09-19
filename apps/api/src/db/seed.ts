import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';
import * as schema from './schema';
import { hash } from 'bcryptjs';

config({ path: '.dev.vars' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await hash('admin123', 12);
  const [admin] = await db.insert(schema.users).values({
    username: 'admin',
    email: 'admin@metex.com',
    password_hash: passwordHash,
    role: 'admin',
    full_name: 'System Administrator',
  }).onConflictDoNothing().returning();

  if (admin) {
    console.log('Created admin user');
  }

  // Create sample shifts
  const shiftsData = [
    { name: 'Morning Shift', start_time: '06:00', end_time: '14:00', days: [1,2,3,4,5], is_active: true },
    { name: 'Afternoon Shift', start_time: '14:00', end_time: '22:00', days: [1,2,3,4,5], is_active: true },
    { name: 'Night Shift', start_time: '22:00', end_time: '06:00', days: [1,2,3,4,5], is_active: true },
    { name: 'Weekend Shift', start_time: '08:00', end_time: '16:00', days: [0,6], is_active: true },
  ];

  for (const shift of shiftsData) {
    await db.insert(schema.shifts).values(shift).onConflictDoNothing();
  }
  console.log('Created sample shifts');

  // Create sample machines
  const machinesData = [
    { machine_code: 'MC-001', name: 'CNC Lathe 1', type: 'CNC Lathe', manufacturer: 'Haas', model: 'ST-20', location: 'Floor A', status: 'operational' },
    { machine_code: 'MC-002', name: 'CNC Mill 1', type: 'CNC Mill', manufacturer: 'Haas', model: 'VF-2', location: 'Floor A', status: 'operational' },
    { machine_code: 'MC-003', name: 'Injection Molding 1', type: 'Injection Molding', manufacturer: 'Arburg', model: 'Allrounder 470', location: 'Floor B', status: 'maintenance' },
    { machine_code: 'MC-004', name: 'Laser Cutter 1', type: 'Laser Cutter', manufacturer: 'Trumpf', model: 'TruLaser 3030', location: 'Floor B', status: 'operational' },
    { machine_code: 'MC-005', name: 'Press Brake 1', type: 'Press Brake', manufacturer: 'Amada', model: 'HFE 1003', location: 'Floor C', status: 'operational' },
  ];

  for (const machine of machinesData) {
    await db.insert(schema.machines).values(machine).onConflictDoNothing();
  }
  console.log('Created sample machines');

  // Create sample workers
  const workersData = [
    { employee_id: 'EMP-001', full_name: 'Rajesh Kumar', email: 'rajesh@metex.com', phone: '+91-9876543210', department: 'Production', role: 'CNC Operator', shift_type: 'day', hire_date: '2022-01-15', status: 'active', skills: ['CNC Programming', 'Blueprint Reading'], certifications: [] },
    { employee_id: 'EMP-002', full_name: 'Priya Sharma', email: 'priya@metex.com', phone: '+91-9876543211', department: 'Quality', role: 'Quality Inspector', shift_type: 'day', hire_date: '2021-06-20', status: 'active', skills: ['Quality Control', 'Calibration'], certifications: [{ id: 'cert-1', name: 'ISO 9001 Lead Auditor', issued_date: '2023-01-15', issuer: 'BSI' }] },
    { employee_id: 'EMP-003', full_name: 'Amit Patel', email: 'amit@metex.com', phone: '+91-9876543212', department: 'Maintenance', role: 'Maintenance Technician', shift_type: 'rotating', hire_date: '2020-03-10', status: 'active', skills: ['Preventive Maintenance', 'Hydraulics', 'Pneumatics'], certifications: [] },
    { employee_id: 'EMP-004', full_name: 'Sunita Reddy', email: 'sunita@metex.com', phone: '+91-9876543213', department: 'Production', role: 'Machine Operator', shift_type: 'night', hire_date: '2023-02-01', status: 'active', skills: ['Machine Operation', 'Material Handling'], certifications: [] },
    { employee_id: 'EMP-005', full_name: 'Vikram Singh', email: 'vikram@metex.com', phone: '+91-9876543214', department: 'Production', role: 'Shift Supervisor', shift_type: 'rotating', hire_date: '2019-11-05', status: 'active', skills: ['Team Leadership', 'Production Planning', 'Lean Manufacturing'], certifications: [{ id: 'cert-2', name: 'Six Sigma Green Belt', issued_date: '2022-05-20', issuer: 'ASQ' }] },
  ];

  for (const worker of workersData) {
    await db.insert(schema.workers).values(worker).onConflictDoNothing();
  }
  console.log('Created sample workers');

  console.log('Seeding complete!');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});