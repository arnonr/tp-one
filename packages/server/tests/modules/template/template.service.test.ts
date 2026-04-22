import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../src/config/database';
import { users, workspaces, workspaceMembers, tasks } from '../../../src/db/schema';
import { taskTemplates, taskTemplateItems } from '../../../src/db/schema/templates';
import { eq, inArray } from 'drizzle-orm';
import { TemplateService } from '../../../src/modules/template/template.service';
import { NotFoundError } from '../../../src/shared/errors';
import { randomUUID } from 'crypto';

const RUN = randomUUID().slice(0, 8);
const ADMIN_ID = randomUUID();
const WORKSPACE_ID = randomUUID();

const createdTemplateIds: string[] = [];
const createdTaskIds: string[] = [];

describe('TemplateService', () => {
  beforeAll(async () => {
    await db.insert(users).values({ id: ADMIN_ID, name: `[${RUN}] Admin`, email: `admin-${RUN}@tp.test`, role: 'admin' });
    await db.insert(workspaces).values({ id: WORKSPACE_ID, name: `[${RUN}] WS`, type: 'general', ownerId: ADMIN_ID });
    await db.insert(workspaceMembers).values({ workspaceId: WORKSPACE_ID, userId: ADMIN_ID, role: 'owner' });
  });

  afterAll(async () => {
    if (createdTaskIds.length) await db.delete(tasks).where(inArray(tasks.id, createdTaskIds));
    if (createdTemplateIds.length) {
      await db.delete(taskTemplateItems).where(inArray(taskTemplateItems.templateId, createdTemplateIds));
      await db.delete(taskTemplates).where(inArray(taskTemplates.id, createdTemplateIds));
    }
    await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, WORKSPACE_ID));
    await db.delete(workspaces).where(eq(workspaces.id, WORKSPACE_ID));
    await db.delete(users).where(eq(users.id, ADMIN_ID));
  });

  // ─── CREATE ───────────────────────────────────────

  describe('create', () => {
    it('creates template with items', async () => {
      const template = await TemplateService.create({
        name: `[${RUN}] จัดอบรม`,
        description: 'แม่แบบงานอบรม',
        workspaceId: WORKSPACE_ID,
        createdBy: ADMIN_ID,
        items: [
          { title: 'เตรียมสถานที่', priority: 'high', sortOrder: 0 },
          { title: 'ประสานงานวิทยากร', priority: 'normal', sortOrder: 1 },
        ],
      });

      createdTemplateIds.push(template.id);
      expect(template.name).toBe(`[${RUN}] จัดอบรม`);
      expect(template.items).toHaveLength(2);
      expect(template.items[0].title).toBe('เตรียมสถานที่');
    });

    it('creates template without items', async () => {
      const template = await TemplateService.create({
        name: `[${RUN}] เปล่า`,
        createdBy: ADMIN_ID,
        items: [],
      });

      createdTemplateIds.push(template.id);
      expect(template.items).toHaveLength(0);
    });
  });

  // ─── LIST ───────────────────────────────────────

  describe('list', () => {
    it('returns all templates when no workspaceId', async () => {
      const result = await TemplateService.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it('filters by workspaceId', async () => {
      const result = await TemplateService.list(WORKSPACE_ID);
      const names = result.map(t => t.name);
      expect(names.some(n => n.includes(RUN))).toBe(true);
    });
  });

  // ─── GET BY ID ───────────────────────────────────

  describe('getById', () => {
    it('returns template with items', async () => {
      const created = await TemplateService.create({
        name: `[${RUN}] ดูรายละเอียด`,
        createdBy: ADMIN_ID,
        items: [{ title: 'รายการแรก', sortOrder: 0 }],
      });
      createdTemplateIds.push(created.id);

      const result = await TemplateService.getById(created.id);
      expect(result.id).toBe(created.id);
      expect(result.items).toHaveLength(1);
    });

    it('throws NotFoundError when not found', async () => {
      await expect(TemplateService.getById(randomUUID())).rejects.toThrow(NotFoundError);
    });
  });

  // ─── UPDATE ───────────────────────────────────────

  describe('update', () => {
    it('updates name and replaces items', async () => {
      const created = await TemplateService.create({
        name: `[${RUN}] เดิม`,
        createdBy: ADMIN_ID,
        items: [{ title: 'รายการเดิม', sortOrder: 0 }],
      });
      createdTemplateIds.push(created.id);

      const updated = await TemplateService.update(created.id, {
        name: `[${RUN}] ใหม่`,
        items: [
          { title: 'รายการใหม่ 1', sortOrder: 0 },
          { title: 'รายการใหม่ 2', sortOrder: 1 },
        ],
      });

      expect(updated.name).toBe(`[${RUN}] ใหม่`);
      expect(updated.items).toHaveLength(2);
    });

    it('throws NotFoundError for unknown id', async () => {
      await expect(TemplateService.update(randomUUID(), { name: 'x' })).rejects.toThrow(NotFoundError);
    });
  });

  // ─── DELETE ───────────────────────────────────────

  describe('delete', () => {
    it('deletes non-system template', async () => {
      const created = await TemplateService.create({
        name: `[${RUN}] ลบทิ้ง`,
        createdBy: ADMIN_ID,
        items: [],
      });

      await TemplateService.delete(created.id);
      await expect(TemplateService.getById(created.id)).rejects.toThrow(NotFoundError);
    });

    it('throws when deleting system template', async () => {
      const [sys] = await db
        .insert(taskTemplates)
        .values({ name: `[${RUN}] System`, isSystem: true, createdById: ADMIN_ID })
        .returning();
      createdTemplateIds.push(sys.id);

      await expect(TemplateService.delete(sys.id)).rejects.toThrow();
    });

    it('throws NotFoundError for unknown id', async () => {
      await expect(TemplateService.delete(randomUUID())).rejects.toThrow(NotFoundError);
    });
  });

  // ─── INSTANTIATE ───────────────────────────────────

  describe('instantiate', () => {
    it('creates tasks from template items', async () => {
      const template = await TemplateService.create({
        name: `[${RUN}] สร้างงาน`,
        createdBy: ADMIN_ID,
        items: [
          { title: 'งานที่ 1', priority: 'high', sortOrder: 0 },
          { title: 'งานที่ 2', priority: 'normal', sortOrder: 1 },
        ],
      });
      createdTemplateIds.push(template.id);

      const created = await TemplateService.instantiate(template.id, {
        workspaceId: WORKSPACE_ID,
        reporterId: ADMIN_ID,
      });

      created.forEach(t => createdTaskIds.push(t.id));
      expect(created).toHaveLength(2);
      expect(created[0].title).toBe('งานที่ 1');
      expect(created[0].workspaceId).toBe(WORKSPACE_ID);
    });

    it('throws NotFoundError for unknown template', async () => {
      await expect(
        TemplateService.instantiate(randomUUID(), { workspaceId: WORKSPACE_ID, reporterId: ADMIN_ID }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
