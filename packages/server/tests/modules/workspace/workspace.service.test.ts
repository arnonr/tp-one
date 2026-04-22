import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../src/config/database';
import { workspaces, workspaceStatuses, workspaceMembers, users } from '../../../src/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { WorkspaceService } from '../../../src/modules/workspace/workspace.service';
import { NotFoundError, ForbiddenError } from '../../../src/shared/errors';
import { randomUUID } from 'crypto';

// Unique prefix to isolate test data
const RUN = randomUUID().slice(0, 8);

const ADMIN_ID = randomUUID();
const STAFF_ID = randomUUID();
const VIEWER_ID = randomUUID();
const OUTSIDER_ID = randomUUID();

const createdWorkspaceIds: string[] = [];
const createdStatusIds: string[] = [];
let testWorkspaceId: string;

async function insertTestUser(id: string, name: string, email: string, role: 'admin' | 'staff') {
  await db.insert(users).values({ id, name, email, role });
}

describe('WorkspaceService', () => {
  beforeAll(async () => {
    await Promise.all([
      insertTestUser(ADMIN_ID, `[${RUN}] Admin`, `admin-${RUN}@tp.test`, 'admin'),
      insertTestUser(STAFF_ID, `[${RUN}] Staff`, `staff-${RUN}@tp.test`, 'staff'),
      insertTestUser(VIEWER_ID, `[${RUN}] Viewer`, `viewer-${RUN}@tp.test`, 'staff'),
      insertTestUser(OUTSIDER_ID, `[${RUN}] Outsider`, `outsider-${RUN}@tp.test`, 'staff'),
    ]);
  });

  afterAll(async () => {
    // Cleanup only test-created data, in safe order
    if (createdStatusIds.length) {
      await db.delete(workspaceStatuses).where(inArray(workspaceStatuses.id, createdStatusIds));
    }
    const memberWsIds = [...createdWorkspaceIds, testWorkspaceId].filter(Boolean);
    if (memberWsIds.length) {
      await db.delete(workspaceMembers).where(inArray(workspaceMembers.workspaceId, memberWsIds));
    }
    if (createdWorkspaceIds.length) {
      await db.delete(workspaces).where(inArray(workspaces.id, createdWorkspaceIds));
    }
    await db.delete(users).where(inArray(users.id, [ADMIN_ID, STAFF_ID, VIEWER_ID, OUTSIDER_ID]));
  });

  // ─── CREATE ───────────────────────────────────────

  describe('create', () => {
    it('creates a workspace and auto-adds creator as owner', async () => {
      const workspace = await WorkspaceService.create(
        { name: `[${RUN}] ฝ่ายเช่าพื้นที่`, type: 'rental', color: '#3B82F6', description: 'จัดการเช่าพื้นที่และห้องประชุม' },
        ADMIN_ID,
      );

      testWorkspaceId = workspace.id;
      createdWorkspaceIds.push(workspace.id);
      expect(workspace.name).toBe(`[${RUN}] ฝ่ายเช่าพื้นที่`);
      expect(workspace.type).toBe('rental');
      expect(workspace.isActive).toBe(true);

      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, ADMIN_ID)));
      expect(membership.role).toBe('owner');
    });
  });

  // ─── GET BY ID ───────────────────────────────────

  describe('getById', () => {
    it('returns workspace when found', async () => {
      const ws = await WorkspaceService.getById(testWorkspaceId);
      expect(ws.id).toBe(testWorkspaceId);
      expect(ws.name).toBe(`[${RUN}] ฝ่ายเช่าพื้นที่`);
    });

    it('throws NotFoundError for non-existent workspace', async () => {
      await expect(WorkspaceService.getById(randomUUID())).rejects.toThrow(NotFoundError);
    });
  });

  // ─── LIST ────────────────────────────────────────

  describe('list', () => {
    it('admin sees all active workspaces', async () => {
      const results = await WorkspaceService.list(ADMIN_ID, 'admin');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((w) => w.id === testWorkspaceId)).toBe(true);
    });

    it('non-admin sees only workspaces they are member of', async () => {
      await db.insert(workspaceMembers).values({ workspaceId: testWorkspaceId, userId: STAFF_ID, role: 'editor' });

      const results = await WorkspaceService.list(STAFF_ID, 'staff');
      expect(results.every((w) => w.isActive)).toBe(true);
      expect(results.some((w) => w.id === testWorkspaceId)).toBe(true);
    });

    it('non-admin with no memberships sees empty list', async () => {
      const results = await WorkspaceService.list(OUTSIDER_ID, 'staff');
      expect(results).toEqual([]);
    });

    it('filters by search keyword', async () => {
      const results = await WorkspaceService.list(ADMIN_ID, 'admin', { search: RUN });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((w) => w.name.includes(RUN))).toBe(true);
    });

    it('filters by type', async () => {
      const results = await WorkspaceService.list(ADMIN_ID, 'admin', { type: 'rental' });
      expect(results.every((w) => w.type === 'rental')).toBe(true);
    });
  });

  // ─── UPDATE ──────────────────────────────────────

  describe('update', () => {
    it('owner can update workspace', async () => {
      const updated = await WorkspaceService.update(
        testWorkspaceId,
        { name: `[${RUN}] ฝ่ายเช่าพื้นที่ (อัปเดต)`, description: 'คำอธิบายใหม่' },
        ADMIN_ID,
        'admin',
      );
      expect(updated.name).toBe(`[${RUN}] ฝ่ายเช่าพื้นที่ (อัปเดต)`);
      expect(updated.description).toBe('คำอธิบายใหม่');
    });

    it('editor can update workspace', async () => {
      const updated = await WorkspaceService.update(testWorkspaceId, { color: '#EF4444' }, STAFF_ID, 'staff');
      expect(updated.color).toBe('#EF4444');
    });

    it('viewer cannot update workspace', async () => {
      await db.insert(workspaceMembers).values({ workspaceId: testWorkspaceId, userId: VIEWER_ID, role: 'viewer' });
      await expect(WorkspaceService.update(testWorkspaceId, { name: 'ไม่ควรผ่าน' }, VIEWER_ID, 'staff')).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('outsider cannot update workspace', async () => {
      await expect(WorkspaceService.update(testWorkspaceId, { name: 'ไม่ควรผ่าน' }, OUTSIDER_ID, 'staff')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  // ─── DELETE (soft) ───────────────────────────────

  describe('delete', () => {
    let deleteTargetId: string;

    it('owner can soft-delete workspace', async () => {
      const ws = await WorkspaceService.create({ name: `[${RUN}] ลบฉัน`, type: 'general' }, ADMIN_ID);
      deleteTargetId = ws.id;
      createdWorkspaceIds.push(deleteTargetId);

      await WorkspaceService.delete(deleteTargetId, ADMIN_ID, 'admin');
      const [deleted] = await db.select().from(workspaces).where(eq(workspaces.id, deleteTargetId));
      expect(deleted.isActive).toBe(false);
    });

    it('non-owner cannot delete workspace', async () => {
      await expect(WorkspaceService.delete(testWorkspaceId, STAFF_ID, 'staff')).rejects.toThrow(ForbiddenError);
    });
  });

  // ─── CUSTOM STATUSES ─────────────────────────────

  describe('custom statuses', () => {
    let statusId: string;

    it('creates a custom status', async () => {
      const status = await WorkspaceService.createStatus(
        testWorkspaceId,
        { name: `[${RUN}] รับแจ้ง`, color: '#10B981', sortOrder: '1', isDefault: true },
        ADMIN_ID,
        'admin',
      );
      statusId = status.id;
      createdStatusIds.push(statusId);
      expect(status.name).toBe(`[${RUN}] รับแจ้ง`);
      expect(status.workspaceId).toBe(testWorkspaceId);
    });

    it('lists statuses for workspace', async () => {
      const statuses = await WorkspaceService.getStatuses(testWorkspaceId);
      expect(statuses.length).toBeGreaterThanOrEqual(1);
      expect(statuses.some((s) => s.id === statusId)).toBe(true);
    });

    it('updates a status', async () => {
      const updated = await WorkspaceService.updateStatus(statusId, { name: `[${RUN}] รับแจ้งแล้ว`, color: '#F59E0B' }, ADMIN_ID, 'admin');
      expect(updated.name).toBe(`[${RUN}] รับแจ้งแล้ว`);
      expect(updated.color).toBe('#F59E0B');
    });

    it('editor can create/update status', async () => {
      const status = await WorkspaceService.createStatus(
        testWorkspaceId,
        { name: `[${RUN}] ตรวจสอบ`, color: '#6366F1' },
        STAFF_ID,
        'staff',
      );
      createdStatusIds.push(status.id);
      expect(status.name).toBe(`[${RUN}] ตรวจสอบ`);

      const updated = await WorkspaceService.updateStatus(status.id, { name: `[${RUN}] ตรวจสอบเอกสาร` }, STAFF_ID, 'staff');
      expect(updated.name).toBe(`[${RUN}] ตรวจสอบเอกสาร`);
    });

    it('viewer cannot create status', async () => {
      await expect(
        WorkspaceService.createStatus(testWorkspaceId, { name: 'ไม่ควรผ่าน' }, VIEWER_ID, 'staff'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('deletes a status', async () => {
      await WorkspaceService.deleteStatus(statusId, ADMIN_ID, 'admin');
      const statuses = await WorkspaceService.getStatuses(testWorkspaceId);
      expect(statuses.some((s) => s.id === statusId)).toBe(false);
    });
  });

  // ─── MEMBERS ─────────────────────────────────────

  describe('members', () => {
    it('lists workspace members with user info', async () => {
      const members = await WorkspaceService.getMembers(testWorkspaceId);
      expect(members.length).toBeGreaterThanOrEqual(1);
      const adminMember = members.find((m) => m.userId === ADMIN_ID);
      expect(adminMember).toBeDefined();
      expect(adminMember!.name).toBe(`[${RUN}] Admin`);
      expect(adminMember!.role).toBe('owner');
    });

    it('editor can add a member', async () => {
      await WorkspaceService.addMember(testWorkspaceId, OUTSIDER_ID, 'viewer', STAFF_ID, 'staff');
      const members = await WorkspaceService.getMembers(testWorkspaceId);
      expect(members.some((m) => m.userId === OUTSIDER_ID)).toBe(true);
    });

    it('viewer cannot add a member', async () => {
      await expect(
        WorkspaceService.addMember(testWorkspaceId, OUTSIDER_ID, 'viewer', VIEWER_ID, 'staff'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('owner can update member role', async () => {
      await WorkspaceService.updateMemberRole(testWorkspaceId, OUTSIDER_ID, 'editor', ADMIN_ID, 'admin');
      const members = await WorkspaceService.getMembers(testWorkspaceId);
      const member = members.find((m) => m.userId === OUTSIDER_ID);
      expect(member!.role).toBe('editor');
    });

    it('non-owner cannot update member role', async () => {
      await expect(
        WorkspaceService.updateMemberRole(testWorkspaceId, OUTSIDER_ID, 'owner', STAFF_ID, 'staff'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('owner can remove a member', async () => {
      await WorkspaceService.removeMember(testWorkspaceId, OUTSIDER_ID, ADMIN_ID, 'admin');
      const members = await WorkspaceService.getMembers(testWorkspaceId);
      expect(members.some((m) => m.userId === OUTSIDER_ID)).toBe(false);
    });

    it('non-owner cannot remove a member', async () => {
      // Re-add outsider first
      await WorkspaceService.addMember(testWorkspaceId, OUTSIDER_ID, 'viewer', ADMIN_ID, 'admin');
      await expect(
        WorkspaceService.removeMember(testWorkspaceId, OUTSIDER_ID, STAFF_ID, 'staff'),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
