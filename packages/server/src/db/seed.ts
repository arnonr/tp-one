import { db } from '../config/database';
import {
  users,
  workspaces,
  workspaceStatuses,
  workspaceMembers,
  annualPlans,
  strategies,
  goals,
  indicators,
  indicatorAssignees,
  indicatorUpdates,
} from './schema';
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

  // Seed annual plan with strategies, goals, indicators
  const [plan] = await db.insert(annualPlans).values({
    year: 2569,
    name: 'แผนปฏิบัติการ ประจำปีงบประมาณ 2569',
    description: 'แผนปฏิบัติการประจำปีงบประมาณ พ.ศ. 2569 อุทยานเทคโนโลยี',
    status: 'active',
    createdById: admin.id,
  }).returning();

  const strategyData = [
    { code: 'S1', name: 'ยกระดับคุณภาพบริการเช่าพื้นที่และห้องประชุม', description: 'พัฒนาสิ่งอำนวยความสะดวกและระบบจองที่ทันสมัย' },
    { code: 'S2', name: 'ขยายงานที่ปรึกษาและวิจัย', description: 'เพิ่มจำนวนโครงการที่ปรึกษาและวิจัยให้ได้ตามเป้าหมาย' },
    { code: 'S3', name: 'เพิ่มประสิทธิภาพการจัดอบรม/สัมนา', description: 'พัฒนาหลักสูตรและกระบวนการจัดอบรมให้มีคุณภาพสูงขึ้น' },
    { code: 'S4', name: 'ส่งเสริมการบ่มเพาะสตาร์ทอัพ', description: 'รับและดูแลสตาร์ทอัพให้เติบโตอย่างยั่งยืน' },
  ];

  const createdStrategies = [];
  for (const s of strategyData) {
    const [strategy] = await db.insert(strategies).values({
      planId: plan.id,
      ...s,
    }).returning();
    createdStrategies.push(strategy);
  }
  console.log(`Created ${createdStrategies.length} strategies`);

  // Seed goals and indicators for each strategy
  const goalIndicatorsData = [
    {
      strategyIdx: 0,
      goals: [
        {
          code: 'G1-1', name: 'เพิ่มอัตราการใช้พื้นที่', description: 'เพิ่มอัตราการใช้พื้นที่ให้ไม่ต่ำกว่า 70%',
          indicators: [
            { code: 'I1-1-1', name: 'อัตราการใช้พื้นที่ (%)', targetValue: '70', unit: '%', indicatorType: 'percentage', weight: '1.0' },
            { code: 'I1-1-2', name: 'จำนวนผู้ใช้บริการ (คน)', targetValue: '5000', unit: 'คน', indicatorType: 'count', weight: '1.0' },
          ],
        },
        {
          code: 'G1-2', name: 'ลดระยะเวลาจองห้อง', description: 'ลดระยะเวลาการจองห้องให้ไม่เกิน 3 วันทำการ',
          indicators: [
            { code: 'I1-2-1', name: 'ระยะเวลาจองเฉลี่ย (วัน)', targetValue: '3', unit: 'วัน', indicatorType: 'amount', weight: '0.8' },
          ],
        },
      ],
    },
    {
      strategyIdx: 1,
      goals: [
        {
          code: 'G2-1', name: 'รับโครงการที่ปรึกษา/วิจัยตามเป้า', description: 'รับโครงการที่ปรึกษาและวิจัยไม่น้อยกว่า 15 โครงการ',
          indicators: [
            { code: 'I2-1-1', name: 'จำนวนโครงการที่ปรึกษา (โครงการ)', targetValue: '15', unit: 'โครงการ', indicatorType: 'count', weight: '1.0' },
            { code: 'I2-1-2', name: 'มูลค่าสัญญารวม (ล้านบาท)', targetValue: '10', unit: 'ล้านบาท', indicatorType: 'amount', weight: '1.0' },
          ],
        },
      ],
    },
    {
      strategyIdx: 2,
      goals: [
        {
          code: 'G3-1', name: 'พัฒนาหลักสูตรใหม่', description: 'พัฒนาหลักสูตรอบรมใหม่ไม่น้อยกว่า 5 หลักสูตร',
          indicators: [
            { code: 'I3-1-1', name: 'จำนวนหลักสูตรใหม่ (หลักสูตร)', targetValue: '5', unit: 'หลักสูตร', indicatorType: 'count', weight: '1.0' },
            { code: 'I3-1-2', name: 'จำนวนผู้เข้าอบรม (คน)', targetValue: '1000', unit: 'คน', indicatorType: 'count', weight: '1.0' },
          ],
        },
      ],
    },
    {
      strategyIdx: 3,
      goals: [
        {
          code: 'G4-1', name: 'รับสตาร์ทอัพเข้าร่วมโครงการ', description: 'รับสตาร์ทอัพเข้าร่วมโครงการบ่มเพาะไม่น้อยกว่า 10 ราย',
          indicators: [
            { code: 'I4-1-1', name: 'จำนวนสตาร์ทอัพที่รับ (ราย)', targetValue: '10', unit: 'ราย', indicatorType: 'count', weight: '1.0' },
            { code: 'I4-1-2', name: 'อัตราการสำเร็จโครงการ (%)', targetValue: '70', unit: '%', indicatorType: 'percentage', weight: '1.0' },
          ],
        },
      ],
    },
  ];

  let totalIndicators = 0;
  for (const sd of goalIndicatorsData) {
    const strategy = createdStrategies[sd.strategyIdx];
    for (const g of sd.goals) {
      const [goal] = await db.insert(goals).values({
        strategyId: strategy.id,
        code: g.code,
        name: g.name,
        description: g.description,
      }).returning();

      for (let i = 0; i < g.indicators.length; i++) {
        const ind = g.indicators[i];
        const [indicator] = await db.insert(indicators).values({
          goalId: goal.id,
          code: ind.code,
          name: ind.name,
          targetValue: ind.targetValue,
          unit: ind.unit,
          indicatorType: ind.indicatorType,
          weight: ind.weight,
          sortOrder: i,
        }).returning();

        // Assign admin as responsible
        await db.insert(indicatorAssignees).values({
          indicatorId: indicator.id,
          userId: admin.id,
        });

        totalIndicators++;
      }
    }
  }
  console.log(`Created goals and ${totalIndicators} indicators`);

  // Seed sample indicator update
  const allIndicators = await db.query.indicators.findMany({ limit: 2 });
  if (allIndicators.length > 0) {
    await db.insert(indicatorUpdates).values({
      indicatorId: allIndicators[0].id,
      reportedDate: new Date('2026-01-15'),
      reportedValue: '45',
      progressPct: '64',
      note: 'ดำเนินการตามแผน คาดว่าจะเสร็จสิ้นภายในไตรมาส 2',
      reportedBy: admin.id,
    });
    console.log('Created sample indicator update');
  }

  console.log('Seed data created successfully!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
