import { db } from '../../config/database';
import { workspaces, workspaceStatuses, workspaceMembers, users } from '../../db/schema';
import { eq, and, ilike, sql, inArray } from 'drizzle-orm';
import { NotFoundError, ForbiddenError } from '../../shared/errors';
import { canEditWorkspace, canManageWorkspace, getWorkspacePermission } from '../../middleware/rbac.middleware';
import type { GlobalRole } from '../../shared/constants';
import type { WorkspaceType, WorkspacePermission } from '../../shared/constants';

export interface WorkspaceCreateInput {
  name: string;
  type: WorkspaceType;
  color?: string;
  description?: string;
}

export interface WorkspaceUpdateInput {
  name?: string;
  color?: string;
  description?: string;
}

export type WorkspaceStatusType = 'pending' | 'in_progress' | 'review' | 'completed';

export interface StatusCreateInput {
  name: string;
  statusType: WorkspaceStatusType;
  color?: string;
  sortOrder?: string;
  isDefault?: boolean;
}

export interface StatusUpdateInput {
  name?: string;
  statusType?: WorkspaceStatusType;
  color?: string;
  sortOrder?: string;
  isDefault?: boolean;
}

function requireMembershipOrAdmin(userId: string, workspaceId: string, userRole: GlobalRole): Promise<void> {
  return getWorkspacePermission(userId, workspaceId).then((permission) => {
    if (userRole !== 'admin' && !permission) {
      throw new ForbiddenError('You are not a member of this workspace');
    }
  });
}

export const WorkspaceService = {
  async list(userId: string, userRole: GlobalRole, filters?: { type?: string; search?: string }) {
    const conditions = [eq(workspaces.isActive, true)];

    if (userRole !== 'admin') {
      const memberRows = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId));
      const wsIds = memberRows.map((m) => m.workspaceId);
      if (wsIds.length === 0) return [];
      conditions.push(inArray(workspaces.id, wsIds));
    }

    if (filters?.type) {
      conditions.push(eq(workspaces.type, filters.type as WorkspaceType));
    }
    if (filters?.search) {
      conditions.push(ilike(workspaces.name, `%${filters.search}%`));
    }

    return db.select().from(workspaces).where(and(...conditions));
  },

  async getById(workspaceId: string, userId?: string, userRole?: GlobalRole) {
    if (userId && userRole) {
      await requireMembershipOrAdmin(userId, workspaceId, userRole);
    }
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
    if (!workspace) throw new NotFoundError('Workspace', workspaceId);
    return workspace;
  },

  async create(data: WorkspaceCreateInput, userId: string) {
    return db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({ name: data.name, type: data.type, color: data.color, description: data.description, ownerId: userId })
        .returning();

      await tx.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, role: 'owner' });

      return workspace;
    });
  },

  async update(workspaceId: string, data: WorkspaceUpdateInput, userId: string, userRole: GlobalRole) {
    await this.getById(workspaceId);
    const permission = await getWorkspacePermission(userId, workspaceId);
    if (!canEditWorkspace(permission, userRole)) throw new ForbiddenError('Cannot edit this workspace');

    const [updated] = await db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning();
    return updated;
  },

  async delete(workspaceId: string, userId: string, userRole: GlobalRole) {
    await this.getById(workspaceId);
    const permission = await getWorkspacePermission(userId, workspaceId);
    if (!canManageWorkspace(permission, userRole)) throw new ForbiddenError('Cannot delete this workspace');

    await db.update(workspaces).set({ isActive: false, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId));
    return { success: true };
  },

  // --- Custom Statuses ---

  async getStatuses(workspaceId: string, userId?: string, userRole?: GlobalRole) {
    if (userId && userRole) {
      await requireMembershipOrAdmin(userId, workspaceId, userRole);
    }
    await this.getById(workspaceId);
    return db.select().from(workspaceStatuses).where(eq(workspaceStatuses.workspaceId, workspaceId));
  },

  async createStatus(workspaceId: string, data: StatusCreateInput, userId: string, userRole: GlobalRole) {
    await this.getById(workspaceId);
    const permission = await getWorkspacePermission(userId, workspaceId);
    if (!canEditWorkspace(permission, userRole)) throw new ForbiddenError('Cannot add statuses to this workspace');

    const [status] = await db
      .insert(workspaceStatuses)
      .values({ workspaceId, name: data.name, statusType: data.statusType, color: data.color, sortOrder: data.sortOrder, isDefault: data.isDefault })
      .returning();
    return status;
  },

  async updateStatus(statusId: string, data: StatusUpdateInput, userId: string, userRole: GlobalRole) {
    const [existing] = await db.select().from(workspaceStatuses).where(eq(workspaceStatuses.id, statusId)).limit(1);
    if (!existing) throw new NotFoundError('Status', statusId);

    const permission = await getWorkspacePermission(userId, existing.workspaceId);
    if (!canEditWorkspace(permission, userRole)) throw new ForbiddenError('Cannot edit statuses');

    const [updated] = await db.update(workspaceStatuses).set(data).where(eq(workspaceStatuses.id, statusId)).returning();
    return updated;
  },

  async deleteStatus(statusId: string, userId: string, userRole: GlobalRole) {
    const [existing] = await db.select().from(workspaceStatuses).where(eq(workspaceStatuses.id, statusId)).limit(1);
    if (!existing) throw new NotFoundError('Status', statusId);

    const permission = await getWorkspacePermission(userId, existing.workspaceId);
    if (!canManageWorkspace(permission, userRole)) throw new ForbiddenError('Cannot delete statuses');

    await db.delete(workspaceStatuses).where(eq(workspaceStatuses.id, statusId));
    return { success: true };
  },

  // --- Members ---

  async getMembers(workspaceId: string, userId?: string, userRole?: GlobalRole) {
    if (userId && userRole) {
      await requireMembershipOrAdmin(userId, workspaceId, userRole);
    }
    await this.getById(workspaceId);
    return db
      .select({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
  },

  async addMember(workspaceId: string, targetUserId: string, role: WorkspacePermission, callerId: string, callerRole: GlobalRole) {
    const permission = await getWorkspacePermission(callerId, workspaceId);
    if (!canEditWorkspace(permission, callerRole)) throw new ForbiddenError('Cannot add members');

    await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: targetUserId, role })
      .onConflictDoNothing();
    return { success: true };
  },

  async updateMemberRole(workspaceId: string, targetUserId: string, newRole: WorkspacePermission, callerId: string, callerRole: GlobalRole) {
    const permission = await getWorkspacePermission(callerId, workspaceId);
    if (!canManageWorkspace(permission, callerRole)) throw new ForbiddenError('Cannot change member roles');

    // Prevent demoting/removing the last owner
    const [target] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)))
      .limit(1);

    if (target?.role === 'owner' && newRole !== 'owner') {
      const [{ count: ownerCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, 'owner')));

      if (Number(ownerCount) <= 1) {
        throw new ForbiddenError('Cannot demote the last owner of a workspace');
      }
    }

    await db
      .update(workspaceMembers)
      .set({ role: newRole })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)));
    return { success: true };
  },

  async removeMember(workspaceId: string, targetUserId: string, callerId: string, callerRole: GlobalRole) {
    const permission = await getWorkspacePermission(callerId, workspaceId);
    if (!canManageWorkspace(permission, callerRole)) throw new ForbiddenError('Cannot remove members');

    // Prevent removing the last owner
    const [target] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)))
      .limit(1);

    if (target?.role === 'owner') {
      const [{ count: ownerCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, 'owner')));

      if (Number(ownerCount) <= 1) {
        throw new ForbiddenError('Cannot remove the last owner of a workspace');
      }
    }

    await db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)));
    return { success: true };
  },
};
