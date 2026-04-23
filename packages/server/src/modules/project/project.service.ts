import { db } from '../../config/database';
import { projects, projectMembers, projectKpis, tasks, users, workspaces, kpiAuditLogs } from '../../db/schema';
import { eq, and, ilike, desc, count, inArray, isNull } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ValidationError } from '../../shared/errors';

export const ProjectService = {
  async list(filters: {
    workspaceId?: string;
    status?: string;
    search?: string;
    fiscalYear?: number;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (filters.workspaceId) {
      conditions.push(eq(projects.workspaceId, filters.workspaceId));
    }
    if (filters.status) {
      conditions.push(eq(projects.status, filters.status as any));
    }
    if (filters.search) {
      conditions.push(ilike(projects.name, `%${filters.search}%`));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [data, [{ total }]] = await Promise.all([
      db
        .select({
          id: projects.id,
          workspaceId: projects.workspaceId,
          workspaceName: workspaces.name,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          startDate: projects.startDate,
          endDate: projects.endDate,
          ownerId: projects.ownerId,
          ownerName: users.name,
          progress: projects.progress,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .leftJoin(workspaces, eq(projects.workspaceId, workspaces.id))
        .leftJoin(users, eq(projects.ownerId, users.id))
        .where(whereClause)
        .orderBy(desc(projects.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(projects)
        .where(whereClause),
    ]);

    // Load member counts per project
    const projectIds = data.map(p => p.id);
    const memberCountByProject: Record<string, number> = {};
    if (projectIds.length > 0) {
      const memberCounts = await db
        .select({
          projectId: projectMembers.projectId,
          total: count(),
        })
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds))
        .groupBy(projectMembers.projectId);
      for (const row of memberCounts) {
        memberCountByProject[row.projectId as string] = Number(row.total);
      }
    }

    return {
      data: data.map(p => ({
        ...p,
        memberCount: memberCountByProject[p.id] || 0,
      })),
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  },

  async getById(projectId: string) {
    const [project] = await db
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        workspaceName: workspaces.name,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        ownerId: projects.ownerId,
        ownerName: users.name,
        progress: projects.progress,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(workspaces, eq(projects.workspaceId, workspaces.id))
      .leftJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new NotFoundError('Project', projectId);

    // Load members
    const members = await db
      .select({
        userId: projectMembers.userId,
        role: projectMembers.role,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    // Load KPIs
    const kpis = await db
      .select()
      .from(projectKpis)
      .where(eq(projectKpis.projectId, projectId));

    return { ...project, members, kpis };
  },

  async create(data: {
    workspaceId: string;
    name: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    ownerId: string;
  }) {
    if (!data.name?.trim()) throw new ValidationError('Project name is required');

    const [project] = await db
      .insert(projects)
      .values({
        workspaceId: data.workspaceId,
        name: data.name.trim(),
        description: data.description,
        status: (data.status || 'planning') as any,
        startDate: data.startDate,
        endDate: data.endDate,
        ownerId: data.ownerId,
      })
      .returning();

    // Auto-add owner as member with 'owner' role
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: data.ownerId,
      role: 'owner',
    });

    return this.getById(project.id);
  },

  async update(projectId: string, data: {
    name?: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    await this.getById(projectId);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;

    await db.update(projects).set(updateData as any).where(eq(projects.id, projectId));
    return this.getById(projectId);
  },

  async delete(projectId: string) {
    await db.delete(projectKpis).where(eq(projectKpis.projectId, projectId));
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
    return { success: true };
  },

  // --- Members ---

  async getMembers(projectId: string) {
    await this.getById(projectId); // verify project exists
    return db
      .select({
        userId: projectMembers.userId,
        role: projectMembers.role,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));
  },

  async addMember(projectId: string, userId: string, role: 'member' | 'viewer' = 'member') {
    await this.getById(projectId); // verify project exists

    // Check if already a member
    const [existing] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .limit(1);
    if (existing) throw new ValidationError('User is already a member of this project');

    await db.insert(projectMembers).values({ projectId, userId, role });
    return this.getMembers(projectId);
  },

  async removeMember(projectId: string, userId: string) {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .limit(1);
    if (!member) throw new NotFoundError('Project member');

    // Prevent removing owner
    if (member.role === 'owner') throw new ForbiddenError('Cannot remove project owner');

    await db.delete(projectMembers).where(
      and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
    );
    return { success: true };
  },

  async updateMemberRole(projectId: string, userId: string, role: 'member' | 'viewer') {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .limit(1);
    if (!member) throw new NotFoundError('Project member');
    if (member.role === 'owner') throw new ForbiddenError('Cannot change owner role');

    await db.update(projectMembers)
      .set({ role })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
    return this.getMembers(projectId);
  },

  // --- Auto progress calculation from tasks ---

  async autoCalculateProgress(projectId: string) {
    // Get all tasks in this project (top-level only)
    const projectTasks = await db
      .select({
        id: tasks.id,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), isNull(tasks.parentId)));

    if (projectTasks.length === 0) {
      await db.update(projects).set({ progress: '0' }).where(eq(projects.id, projectId));
      return { progress: 0, totalTasks: 0, completedTasks: 0 };
    }

    const completedCount = projectTasks.filter(t => t.completedAt !== null).length;
    const totalCount = projectTasks.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    await db.update(projects).set({ progress: String(progress) }).where(eq(projects.id, projectId));

    return { progress, totalTasks: totalCount, completedTasks: completedCount };
  },

  // --- KPIs ---

  async getKpis(projectId: string) {
    return db.select().from(projectKpis).where(eq(projectKpis.projectId, projectId));
  },

  async createKpi(userId: string, projectId: string, data: {
    name: string;
    targetValue: string;
    unit?: string;
    period?: string;
  }) {
    await this.getById(projectId);
    if (!data.name?.trim()) throw new ValidationError('KPI name is required');

    const [kpi] = await db.insert(projectKpis).values({
      projectId,
      name: data.name.trim(),
      targetValue: data.targetValue,
      unit: data.unit,
      period: (data.period || 'quarterly') as any,
    }).returning();

    await db.insert(kpiAuditLogs).values({
      kpiId: kpi.id,
      changedBy: userId,
      action: 'created',
      newValue: JSON.stringify({ name: kpi.name, targetValue: kpi.targetValue, unit: kpi.unit, period: kpi.period }),
    });

    return kpi;
  },

  async updateKpi(userId: string, kpiId: string, data: {
    name?: string;
    targetValue?: string;
    currentValue?: string;
    unit?: string;
    period?: string;
  }) {
    const [kpi] = await db.select().from(projectKpis).where(eq(projectKpis.id, kpiId)).limit(1);
    if (!kpi) throw new NotFoundError('KPI', kpiId);

    const updateData: Record<string, unknown> = {};
    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    if (data.name !== undefined && data.name !== kpi.name) {
      updateData.name = data.name.trim();
      changes.push({ field: 'name', oldValue: kpi.name, newValue: data.name.trim() });
    }
    if (data.targetValue !== undefined && data.targetValue !== kpi.targetValue) {
      updateData.targetValue = data.targetValue;
      changes.push({ field: 'targetValue', oldValue: String(kpi.targetValue), newValue: data.targetValue });
    }
    if (data.currentValue !== undefined && data.currentValue !== kpi.currentValue) {
      updateData.currentValue = data.currentValue;
      changes.push({ field: 'currentValue', oldValue: String(kpi.currentValue ?? ''), newValue: data.currentValue });
    }
    if (data.unit !== undefined && data.unit !== kpi.unit) {
      updateData.unit = data.unit;
      changes.push({ field: 'unit', oldValue: kpi.unit ?? '', newValue: data.unit });
    }
    if (data.period !== undefined && data.period !== kpi.period) {
      updateData.period = data.period;
      changes.push({ field: 'period', oldValue: kpi.period, newValue: data.period });
    }

    if (changes.length === 0) return kpi;

    for (const change of changes) {
      await db.insert(kpiAuditLogs).values({
        kpiId,
        changedBy: userId,
        action: 'updated',
        fieldName: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }

    const [updated] = await db.update(projectKpis).set(updateData as any).where(eq(projectKpis.id, kpiId)).returning();
    return updated;
  },

  async deleteKpi(userId: string, kpiId: string) {
    const [kpi] = await db.select().from(projectKpis).where(eq(projectKpis.id, kpiId)).limit(1);
    if (!kpi) throw new NotFoundError('KPI', kpiId);

    await db.insert(kpiAuditLogs).values({
      kpiId,
      changedBy: userId,
      action: 'deleted',
      oldValue: JSON.stringify({ name: kpi.name, targetValue: kpi.targetValue, unit: kpi.unit, period: kpi.period }),
    });

    await db.delete(projectKpis).where(eq(projectKpis.id, kpiId));
    return { success: true };
  },

  // --- KPI Audit Logs ---

  async getKpiAuditLogs(kpiId: string) {
    return db
      .select({
        id: kpiAuditLogs.id,
        kpiId: kpiAuditLogs.kpiId,
        changedBy: kpiAuditLogs.changedBy,
        changedByName: users.name,
        changedAt: kpiAuditLogs.changedAt,
        action: kpiAuditLogs.action,
        fieldName: kpiAuditLogs.fieldName,
        oldValue: kpiAuditLogs.oldValue,
        newValue: kpiAuditLogs.newValue,
        reason: kpiAuditLogs.reason,
      })
      .from(kpiAuditLogs)
      .leftJoin(users, eq(kpiAuditLogs.changedBy, users.id))
      .where(eq(kpiAuditLogs.kpiId, kpiId))
      .orderBy(desc(kpiAuditLogs.changedAt));
  },

  async revertKpi(kpiId: string, userId: string, auditLogId: string, reason?: string) {
    const [kpi] = await db.select().from(projectKpis).where(eq(projectKpis.id, kpiId)).limit(1);
    if (!kpi) throw new NotFoundError('KPI', kpiId);

    const [auditLog] = await db.select().from(kpiAuditLogs).where(
      and(eq(kpiAuditLogs.id, auditLogId), eq(kpiAuditLogs.kpiId, kpiId))
    ).limit(1);
    if (!auditLog) throw new NotFoundError('Audit log', auditLogId);

    const revertData: Record<string, unknown> = {};
    if (auditLog.fieldName && auditLog.oldValue !== null) {
      revertData[auditLog.fieldName] = auditLog.oldValue;
    } else if (!auditLog.fieldName && auditLog.oldValue) {
      const oldValues = JSON.parse(auditLog.oldValue);
      if (oldValues.name !== undefined) revertData.name = oldValues.name;
      if (oldValues.targetValue !== undefined) revertData.targetValue = oldValues.targetValue;
      if (oldValues.currentValue !== undefined) revertData.currentValue = oldValues.currentValue;
      if (oldValues.unit !== undefined) revertData.unit = oldValues.unit;
      if (oldValues.period !== undefined) revertData.period = oldValues.period;
    }

    if (Object.keys(revertData).length === 0) {
      throw new ValidationError('Nothing to revert');
    }

    const [updated] = await db.update(projectKpis).set(revertData as any).where(eq(projectKpis.id, kpiId)).returning();

    await db.insert(kpiAuditLogs).values({
      kpiId,
      changedBy: userId,
      action: 'reverted',
      oldValue: JSON.stringify({ currentValue: kpi.currentValue }),
      newValue: JSON.stringify(revertData),
      reason: reason ?? `Reverted from audit log ${auditLogId}`,
    });

    return updated;
  },
};