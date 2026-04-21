import { db } from '../config/database';
import { users, workspaces, workspaceStatuses } from './schema';
import { DEFAULT_WORKSPACE_STATUSES } from '../shared/constants';

async function seed() {
  console.log('Seeding database...');

  // Seed admin user
  const [admin] = await db.insert(users).values({
    name: 'ผู้ดูแลระบบ',
    email: 'admin@tpone.local',
    role: 'admin',
  }).returning();

  // Seed demo staff
  const [staff] = await db.insert(users).values({
    name: 'เจ้าหน้าที่ทดสอบ',
    email: 'staff@tpone.local',
    role: 'staff',
  }).returning();

  console.log(`Created users: ${admin.name}, ${staff.name}`);

  // Seed default workspaces
  const workspaceData = [
    { name: 'เช่าพื้นที่/ห้องประชุม', type: 'rental' as const, color: '#4CAF50' },
    { name: 'ที่ปรึกษา/วิจัย', type: 'consulting' as const, color: '#2196F3' },
    { name: 'อบรม/สัมนา', type: 'training' as const, color: '#FF9800' },
    { name: 'บ่มเพาะ/Incubation', type: 'incubation' as const, color: '#9C27B0' },
    { name: 'งานทั่วไป', type: 'general' as const, color: '#607D8B' },
  ];

  for (const ws of workspaceData) {
    const [workspace] = await db.insert(workspaces).values({
      ...ws,
      ownerId: admin.id,
    }).returning();

    // Seed default statuses for each workspace
    const statuses = DEFAULT_WORKSPACE_STATUSES[ws.type];
    for (let i = 0; i < statuses.length; i++) {
      await db.insert(workspaceStatuses).values({
        workspaceId: workspace.id,
        name: statuses[i],
        color: '#666666',
        sortOrder: String(i + 1),
      });
    }

    console.log(`Created workspace: ${ws.name} (${statuses.length} statuses)`);
  }

  console.log('Seed data created successfully!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
