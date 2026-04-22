import { db } from '../config/database';
import { users, workspaces, workspaceStatuses, workspaceMembers } from './schema';
import { taskTemplates, taskTemplateItems } from './schema/templates';
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

    // Add admin and staff as workspace members
    await db.insert(workspaceMembers).values([
      { workspaceId: workspace.id, userId: admin.id, role: 'owner' },
      { workspaceId: workspace.id, userId: staff.id, role: 'editor' },
    ]);

    console.log(`Created workspace: ${ws.name} (${statuses.length} statuses, 2 members)`);
  }

  // Seed default task templates
  const defaultTemplates = [
    {
      name: 'ขอจัดซื้อ/จัดจ้าง',
      description: 'แม่แบบงานจัดซื้อจัดจ้างภาครัฐ',
      isSystem: true,
      items: [
        { title: 'จัดทำรายละเอียดความต้องการ (TOR)', priority: 'high', sortOrder: 0 },
        { title: 'ขอเสนอราคา (RFQ)', priority: 'high', sortOrder: 1 },
        { title: 'ตรวจรับพัสดุ', priority: 'normal', sortOrder: 2 },
        { title: 'เบิกจ่าย', priority: 'normal', sortOrder: 3 },
      ],
    },
    {
      name: 'จัดอบรม/สัมนา',
      description: 'แม่แบบงานจัดการอบรมหรือสัมนา',
      isSystem: true,
      items: [
        { title: 'เตรียมสถานที่และอุปกรณ์', priority: 'high', sortOrder: 0 },
        { title: 'ประสานงานวิทยากร', priority: 'high', sortOrder: 1 },
        { title: 'ส่งหนังสือเชิญ', priority: 'normal', sortOrder: 2 },
        { title: 'ลงทะเบียนผู้เข้าร่วม', priority: 'normal', sortOrder: 3 },
        { title: 'ประเมินผลหลังการอบรม', priority: 'low', sortOrder: 4 },
      ],
    },
    {
      name: 'รับที่ปรึกษา/วิจัย',
      description: 'แม่แบบงานรับที่ปรึกษาหรือโครงการวิจัย',
      isSystem: true,
      items: [
        { title: 'ลงนามสัญญา', priority: 'high', sortOrder: 0 },
        { title: 'จัดตั้งคณะทำงาน', priority: 'high', sortOrder: 1 },
        { title: 'จัดประชุมเปิดโครงการ (Kickoff)', priority: 'normal', sortOrder: 2 },
        { title: 'ส่งรายงานความก้าวหน้า', priority: 'normal', sortOrder: 3 },
        { title: 'ส่งรายงานฉบับสมบูรณ์', priority: 'high', sortOrder: 4 },
        { title: 'ปิดโครงการและส่งมอบงาน', priority: 'high', sortOrder: 5 },
      ],
    },
  ];

  for (const tmpl of defaultTemplates) {
    const [created] = await db.insert(taskTemplates).values({
      name: tmpl.name,
      description: tmpl.description,
      isSystem: tmpl.isSystem,
      createdById: admin.id,
    }).returning();

    await db.insert(taskTemplateItems).values(
      tmpl.items.map(item => ({
        templateId: created.id,
        ...item,
      })),
    );
    console.log(`Created template: ${tmpl.name} (${tmpl.items.length} items)`);
  }

  console.log('Seed data created successfully!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
