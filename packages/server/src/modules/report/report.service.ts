import { db } from '../../config/database';
import { tasks, workspaceStatuses, workspaces, projects } from '../../db/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { getCurrentFiscalYear, toBuddhistYear, THAI_MONTHS_SHORT } from '../../shared/thai.utils';
import type { WorkspaceStatusType } from '../workspace/workspace.service';

export interface ReportSummary {
  fiscalYear: number;
  totalTasks: number;
  tasksByStatusType: Record<WorkspaceStatusType, number>;
  tasksByWorkspace: { name: string; count: number; completed: number }[];
  projectStats: { total: number; completed: number; inProgress: number };
  monthlyData: { month: string; created: number; completed: number }[];
  quarterlyData: { quarter: number; label: string; created: number; completed: number; pending: number }[];
}

function getFiscalQuarter(month: number): number {
  // 10-12=Q1, 1-3=Q2, 4-6=Q3, 7-9=Q4
  if (month >= 10) return 1;
  if (month >= 7) return 4;
  if (month >= 4) return 3;
  return 2;
}

function getQuarterMonths(quarter: number): string {
  switch (quarter) {
    case 1: return 'ต.ค. - ธ.ค.';
    case 2: return 'ม.ค. - มี.ค.';
    case 3: return 'เม.ย. - มิ.ย.';
    case 4: return 'ก.ค. - ก.ย.';
  }
}

export const ReportService = {
  async getSummary(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<ReportSummary> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    if (wsCondition) conditions.push(wsCondition);

    // Get all tasks for fiscal year
    const taskRows = await db
      .select({
        id: tasks.id,
        statusType: workspaceStatuses.statusType,
        workspaceId: tasks.workspaceId,
        workspaceName: workspaces.name,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(...conditions));

    // Tasks by status type
    const tasksByStatusType: Record<WorkspaceStatusType, number> = {
      pending: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
    };

    // Tasks by workspace
    const wsMap = new Map<string, { name: string; count: number; completed: number }>();

    // Monthly data
    const monthlyCreated = Array(12).fill(0);
    const monthlyCompleted = Array(12).fill(0);

    for (const task of taskRows) {
      const st = (task.statusType as WorkspaceStatusType) || 'pending';
      tasksByStatusType[st] = (tasksByStatusType[st] || 0) + 1;

      if (task.workspaceName) {
        const ws = wsMap.get(task.workspaceName) || { name: task.workspaceName, count: 0, completed: 0 };
        ws.count++;
        if (st === 'completed') ws.completed++;
        wsMap.set(task.workspaceName, ws);
      }

      if (task.createdAt) {
        const d = new Date(task.createdAt);
        monthlyCreated[d.getMonth()]++;
      }
      if (task.completedAt) {
        const d = new Date(task.completedAt);
        monthlyCompleted[d.getMonth()]++;
      }
    }

    // Project stats
    const projectRows = await db
      .select({ count: count() })
      .from(projects)
      .where(workspaceId ? eq(projects.workspaceId, workspaceId) : undefined);

    const totalProjects = Number(projectRows[0]?.count || 0);

    const completedProjects = await db
      .select({ count: count() })
      .from(projects)
      .where(and(
        workspaceId ? eq(projects.workspaceId, workspaceId) : undefined,
        eq(projects.status, 'completed')
      ));

    const inProgressProjects = await db
      .select({ count: count() })
      .from(projects)
      .where(and(
        workspaceId ? eq(projects.workspaceId, workspaceId) : undefined,
        eq(projects.status, 'active')
      ));

    // Quarterly aggregation
    const quarterlyData = [1, 2, 3, 4].map(q => {
      const monthRange = q === 1 ? [9, 10, 11] : q === 2 ? [0, 1, 2] : q === 3 ? [3, 4, 5] : [6, 7, 8];
      let created = 0, completed = 0, pending = 0;
      monthRange.forEach(m => {
        created += monthlyCreated[m];
        completed += monthlyCompleted[m];
        pending += tasksByStatusType.pending;
      });
      return {
        quarter: q,
        label: `ไตรมาสที่ ${q} (${getQuarterMonths(q)})`,
        created,
        completed,
        pending,
      };
    });

    return {
      fiscalYear,
      totalTasks: taskRows.length,
      tasksByStatusType,
      tasksByWorkspace: Array.from(wsMap.values()),
      projectStats: {
        total: totalProjects,
        completed: Number(completedProjects[0]?.count || 0),
        inProgress: Number(inProgressProjects[0]?.count || 0),
      },
      monthlyData: THAI_MONTHS_SHORT.map((month, i) => ({
        month,
        created: monthlyCreated[i],
        completed: monthlyCompleted[i],
      })),
      quarterlyData,
    };
  },

  async getMonthlyDetail(fiscalYear: number, month: number, workspaceId?: string | null) {
    // month: 1-12 (Thai month index)
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    if (wsCondition) conditions.push(wsCondition);

    const monthIndex = month - 1; // 0-based
    const startDate = new Date(fiscalYear - 543, monthIndex, 1);
    const endDate = new Date(fiscalYear - 543, monthIndex + 1, 0);

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        statusName: workspaceStatuses.name,
        statusType: workspaceStatuses.statusType,
        priority: tasks.priority,
        workspaceName: workspaces.name,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(...conditions));

    return rows
      .filter(r => r.completedAt && new Date(r.completedAt) >= startDate && new Date(r.completedAt) <= endDate)
      .map(r => ({
        id: r.id,
        title: r.title,
        statusName: r.statusName,
        statusType: r.statusType,
        priority: r.priority,
        workspaceName: r.workspaceName,
      }));
  },
};