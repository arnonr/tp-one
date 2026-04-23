import { db } from '../../config/database';
import { tasks, taskAssignees, workspaceStatuses, workspaces, projects, projectKpis, users } from '../../db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';
import { getCurrentFiscalYear, THAI_MONTHS_SHORT } from '../../shared/thai.utils';

type WorkspaceStatusType = 'pending' | 'in_progress' | 'review' | 'completed';

const STATUS_TYPE_LABELS: Record<WorkspaceStatusType, string> = {
  pending: 'รอทำ',
  in_progress: 'อยู่ระหว่างทำ',
  review: 'อยู่ระหว่างตรวจ',
  completed: 'เสร็จสิ้น',
}

const STATUS_TYPE_COLORS: Record<WorkspaceStatusType, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  review: '#8b5cf6',
  completed: '#10b981',
}

function buildWorkspaceFilter(workspaceId: string | null) {
  if (!workspaceId) return undefined;
  return eq(tasks.workspaceId, workspaceId);
}

export interface DashboardStats {
  total: number;
  inProgress: number;
  completed: number;
  byPriority: { urgent: number; high: number; normal: number; low: number };
  byStatusType: Record<WorkspaceStatusType, number>;
}

export interface TaskChartResponse {
  byPriority: { label: string; value: number }[];
  byStatusType: { label: string; value: number; color: string }[];
  byWorkspace: { label: string; value: number }[];
}

export interface ProjectProgressResponse {
  projects: { id: string; name: string; progress: number; status: string }[];
}

export interface WorkloadDistributionResponse {
  users: { userId: string; displayName: string; taskCount: number }[];
}

export interface KpiSummaryResponse {
  kpis: { name: string; target: number; current: number; unit: string; achievement: number }[];
}

export interface OverdueTask {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  workspaceName: string;
}

export interface MonthlyStatusBreakdownItem {
  month: string;
  statuses: { name: string; count: number; color: string }[];
}

export interface MonthlyTrendItem {
  month: string;
  created: number;
  completed: number;
}

export interface DeadlineHeatmapItem {
  month: string;
  count: number;
}

export const DashboardService = {
  async getMonthlyStatusBreakdown(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<MonthlyStatusBreakdownItem[]> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    if (wsCondition) conditions.push(wsCondition);

    const rows = await db
      .select({
        createdAt: tasks.createdAt,
        statusType: workspaceStatuses.statusType,
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .where(and(...conditions));

    const monthlyData: Record<WorkspaceStatusType, number[]> = {
      pending: Array(12).fill(0),
      in_progress: Array(12).fill(0),
      review: Array(12).fill(0),
      completed: Array(12).fill(0),
    };

    for (const row of rows) {
      if (row.createdAt) {
        const date = new Date(row.createdAt);
        const month = date.getMonth();
        const st = (row.statusType as WorkspaceStatusType) || 'pending';
        monthlyData[st][month]++;
      }
    }

    return THAI_MONTHS_SHORT.map((month, idx) => ({
      month,
      statuses: (['pending', 'in_progress', 'review', 'completed'] as WorkspaceStatusType[]).map(st => ({
        name: STATUS_TYPE_LABELS[st],
        count: monthlyData[st][idx],
        color: STATUS_TYPE_COLORS[st],
      })),
    }));
  },

  async getStats(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<DashboardStats> {
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    const wsFilter = buildWorkspaceFilter(workspaceId ?? undefined);
    if (wsFilter) conditions.push(wsFilter);

    const tasksResult = await db
      .select({
        id: tasks.id,
        priority: tasks.priority,
        statusId: tasks.statusId,
        statusType: workspaceStatuses.statusType,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .where(and(...conditions));

    const total = tasksResult.length;

    const byStatusType: Record<WorkspaceStatusType, number> = {
      pending: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
    };

    let inProgress = 0;
    let completed = 0;

    for (const task of tasksResult) {
      const st = (task.statusType as WorkspaceStatusType) || 'pending';
      byStatusType[st] = (byStatusType[st] || 0) + 1;

      if (st === 'completed') {
        completed++;
      } else if (st === 'in_progress' || st === 'review') {
        inProgress++;
      }
    }

    const byPriority = { urgent: 0, high: 0, normal: 0, low: 0 };
    for (const task of tasksResult) {
      const priority = task.priority || 'normal';
      if (priority in byPriority) {
        byPriority[priority as keyof typeof byPriority]++;
      }
    }

    return {
      total,
      inProgress,
      completed,
      byPriority,
      byStatusType,
    };
  },

  async getTaskStatusChart(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<TaskChartResponse> {
    const wsConditions = workspaceId ? [eq(tasks.workspaceId, workspaceId)] : [];

    // By priority
    const priorityRows = await db
      .select({
        priority: tasks.priority,
        count: count(),
      })
      .from(tasks)
      .where(and(eq(tasks.fiscalYear, fiscalYear), ...wsConditions))
      .groupBy(tasks.priority);

    const priorityLabels: Record<string, string> = {
      urgent: 'เร่งด่วน',
      high: 'สูง',
      normal: 'ปกติ',
      low: 'ต่ำ',
    };
    const byPriority = priorityRows.map(row => ({
      label: priorityLabels[row.priority || 'normal'] || row.priority,
      value: Number(row.count),
    }));

    // By status type
    const statusConditions = [eq(tasks.fiscalYear, fiscalYear), ...wsConditions];
    const statusRows = await db
      .select({
        statusType: workspaceStatuses.statusType,
        count: count(),
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .where(and(...statusConditions))
      .groupBy(workspaceStatuses.statusType);

    const byStatusType = statusRows.map(row => ({
      label: STATUS_TYPE_LABELS[(row.statusType as WorkspaceStatusType) || 'pending'],
      value: Number(row.count),
      color: STATUS_TYPE_COLORS[(row.statusType as WorkspaceStatusType) || 'pending'],
    }));

    // By workspace
    const wsConditionsForGroupBy = workspaceId ? [eq(tasks.workspaceId, workspaceId)] : [];
    const workspaceRows = await db
      .select({
        workspaceId: tasks.workspaceId,
        workspaceName: workspaces.name,
        count: count(),
      })
      .from(tasks)
      .innerJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(eq(tasks.fiscalYear, fiscalYear), ...wsConditionsForGroupBy))
      .groupBy(tasks.workspaceId, workspaces.name);

    const byWorkspace = workspaceRows.map(row => ({
      label: row.workspaceName || 'ไม่ระบุ',
      value: Number(row.count),
    }));

    return { byPriority, byStatusType, byWorkspace };
  },

  async getProjectProgress(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<ProjectProgressResponse> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    if (wsCondition) conditions.push(wsCondition);

    // Get projects that have tasks in this fiscal year
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        progress: projects.progress,
        status: projects.status,
      })
      .from(projects)
      .innerJoin(tasks, eq(tasks.projectId, projects.id))
      .where(and(...conditions))
      .groupBy(projects.id, projects.name, projects.progress, projects.status);

    const projectsList = projectRows.map(row => ({
      id: row.id,
      name: row.name,
      progress: Number(row.progress) || 0,
      status: row.status,
    }));

    return { projects: projectsList };
  },

  async getWorkloadDistribution(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<WorkloadDistributionResponse> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    if (wsCondition) conditions.push(wsCondition);

    // Get tasks per assignee for the fiscal year
    const rows = await db
      .select({
        userId: taskAssignees.userId,
        displayName: users.name,
        taskCount: count(),
      })
      .from(taskAssignees)
      .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(and(...conditions))
      .groupBy(taskAssignees.userId, users.name);

    const usersList = rows.map(row => ({
      userId: row.userId,
      displayName: row.displayName || 'ไม่ระบุ',
      taskCount: Number(row.taskCount),
    }));

    return { users: usersList };
  },

  async getKpiSummary(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<KpiSummaryResponse> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    if (wsCondition) conditions.push(wsCondition);

    // Get all KPIs from projects that have tasks in this fiscal year
    const kpiRows = await db
      .select({
        name: projectKpis.name,
        targetValue: projectKpis.targetValue,
        currentValue: projectKpis.currentValue,
        unit: projectKpis.unit,
      })
      .from(projectKpis)
      .innerJoin(projects, eq(projects.id, projectKpis.projectId))
      .innerJoin(tasks, eq(tasks.projectId, projects.id))
      .where(and(...conditions))
      .groupBy(
        projectKpis.id,
        projectKpis.name,
        projectKpis.targetValue,
        projectKpis.currentValue,
        projectKpis.unit
      );

    const kpis = kpiRows.map(row => {
      const target = Number(row.targetValue) || 0;
      const current = Number(row.currentValue) || 0;
      const achievement = target > 0 ? Math.round((current / target) * 100) : 0;
      return {
        name: row.name,
        target,
        current,
        unit: row.unit || '',
        achievement,
      };
    });

    return { kpis };
  },

  async getOverdueTasks(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<{ count: number; tasks: OverdueTask[] }> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear), isNull(tasks.completedAt)];
    if (wsCondition) conditions.push(wsCondition);

    const overdueRows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        workspaceName: workspaces.name,
      })
      .from(tasks)
      .innerJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(...conditions));

    // Filter for overdue: dueDate < today (date only comparison)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks: OverdueTask[] = [];
    for (const task of overdueRows) {
      if (task.dueDate) {
        const dueDateObj = new Date(task.dueDate);
        if (dueDateObj < today) {
          overdueTasks.push({
            id: task.id,
            title: task.title,
            dueDate: task.dueDate,
            priority: task.priority || 'normal',
            workspaceName: task.workspaceName || 'ไม่ระบุ',
          });
        }
      }
    }

    return {
      count: overdueTasks.length,
      tasks: overdueTasks,
    };
  },

  async getMonthlyTrend(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<MonthlyTrendItem[]> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    if (wsCondition) conditions.push(wsCondition);

    // Get all tasks created within fiscal year
    const createdRows = await db
      .select({
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(and(...conditions));

    // Get all tasks completed within fiscal year
    const allCompletedRows = await db
      .select({
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(and(...conditions));

    // Build monthly counts
    const createdCounts: number[] = Array(12).fill(0);
    const completedCounts: number[] = Array(12).fill(0);

    for (const row of createdRows) {
      if (row.createdAt) {
        const date = new Date(row.createdAt);
        const month = date.getMonth(); // 0-11
        createdCounts[month]++;
      }
    }

    for (const row of allCompletedRows) {
      if (row.completedAt) {
        const date = new Date(row.completedAt);
        const month = date.getMonth(); // 0-11
        completedCounts[month]++;
      }
    }

    return THAI_MONTHS_SHORT.map((month, index) => ({
      month,
      created: createdCounts[index],
      completed: completedCounts[index],
    }));
  },

  async getDeadlineHeatmap(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<DeadlineHeatmapItem[]> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear), isNull(tasks.completedAt)];
    if (wsCondition) conditions.push(wsCondition);

    const deadlineRows = await db
      .select({
        dueDate: tasks.dueDate,
        count: count(),
      })
      .from(tasks)
      .where(and(...conditions))
      .groupBy(tasks.dueDate);

    // Group by month (0-11)
    const monthlyCounts: number[] = Array(12).fill(0);

    for (const row of deadlineRows) {
      if (row.dueDate) {
        const dueDateObj = new Date(row.dueDate);
        const month = dueDateObj.getMonth(); // 0-11
        monthlyCounts[month] += Number(row.count);
      }
    }

    return THAI_MONTHS_SHORT.map((month, index) => ({
      month,
      count: monthlyCounts[index],
    }));
  },
};