import { db } from '../../config/database';
import { tasks, taskAssignees, workspaceStatuses, workspaces, projects, projectKpis, users } from '../../db/schema';
import { eq, and, isNull, sql, inArray, count } from 'drizzle-orm';
import { getCurrentFiscalYear, THAI_MONTHS_SHORT } from '../../shared/thai.utils';

function buildWorkspaceFilter(workspaceId: string | null) {
  if (!workspaceId) return undefined;
  return eq(tasks.workspaceId, workspaceId);
}

export interface StatsResponse {
  total: number;
  inProgress: number;
  completed: number;
  byPriority: { urgent: number; high: number; normal: number; low: number };
  byStatus: Record<string, number>;
}

export interface TaskChartResponse {
  byPriority: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
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

const STATUS_GROUPS = [
  { name: 'รออนุมัติ', color: '#f59e0b', keywords: ['อนุมัติ', 'ขออนุมัติ', 'รอ', 'ตรวจสอบ'] },
  { name: 'กำลังดำเนินการ', color: '#3b82f6', keywords: ['กำลัง', 'ดำเนินการ', 'ประเมิน', 'บ่มเพาะ', 'ดำเนิน', 'รับ', 'ส่ง', 'ศึกษา'] },
  { name: 'เสร็จสิ้น', color: '#10b981', keywords: ['เสร็จสิ้น', 'สำเร็จ', 'สรุปผล', 'ส่งมอบ', 'ติดตาม', 'เสร็จ', 'สำเร็จ'] },
];

function getStatusGroup(statusName: string): number {
  for (let i = 0; i < STATUS_GROUPS.length; i++) {
    if (STATUS_GROUPS[i].keywords.some(k => statusName.includes(k))) {
      return i;
    }
  }
  return 1; // default to "กำลังดำเนินการ"
}

export const DashboardService = {
  async getMonthlyStatusBreakdown(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<MonthlyStatusBreakdownItem[]> {
    const wsCondition = workspaceId ? eq(tasks.workspaceId, workspaceId) : undefined;
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    if (wsCondition) conditions.push(wsCondition);

    const rows = await db
      .select({
        createdAt: tasks.createdAt,
        statusName: workspaceStatuses.name,
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .where(and(...conditions));

    const monthlyData: number[][] = Array.from({ length: 12 }, () => [0, 0, 0]);

    for (const row of rows) {
      if (row.createdAt) {
        const date = new Date(row.createdAt);
        const month = date.getMonth();
        const statusName = row.statusName || '';
        const groupIndex = getStatusGroup(statusName);
        monthlyData[month][groupIndex]++;
      }
    }

    return THAI_MONTHS_SHORT.map((month, idx) => ({
      month,
      statuses: STATUS_GROUPS.map((g, i) => ({ name: g.name, count: monthlyData[idx][i], color: g.color })),
    }));
  },

  async getStats(fiscalYear: number = getCurrentFiscalYear(), workspaceId?: string | null): Promise<StatsResponse> {
    // Build filter conditions
    const conditions = [eq(tasks.fiscalYear, fiscalYear)];
    const wsFilter = buildWorkspaceFilter(workspaceId ?? undefined);
    if (wsFilter) conditions.push(wsFilter);

    // Get all tasks for fiscal year
    const tasksResult = await db
      .select({
        id: tasks.id,
        priority: tasks.priority,
        statusId: tasks.statusId,
        statusName: workspaceStatuses.name,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .where(and(...conditions));

    const total = tasksResult.length;

    // Count by status name (completed = has completedAt or status name contains "เสร็จสิ้น", "สำเร็จ", "สรุปผล")
    const byStatus: Record<string, number> = {};
    const completionKeywords = ['เสร็จสิ้น', 'สำเร็จ', 'สรุปผล'];
    let inProgress = 0;
    let completed = 0;

    for (const task of tasksResult) {
      // Count by status
      const statusName = task.statusName || 'ไม่ระบุ';
      byStatus[statusName] = (byStatus[statusName] || 0) + 1;

      // Determine if completed
      const isCompleted = task.completedAt !== null ||
        completionKeywords.some(k => statusName.includes(k));
      if (isCompleted) {
        completed++;
      } else {
        inProgress++;
      }
    }

    // Count by priority
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
      byStatus,
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

    // By status
    const statusConditions = [eq(tasks.fiscalYear, fiscalYear), ...wsConditions];
    const statusRows = await db
      .select({
        statusName: workspaceStatuses.name,
        count: count(),
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .where(and(...statusConditions))
      .groupBy(workspaceStatuses.name);

    const byStatus = statusRows.map(row => ({
      label: row.statusName || 'ไม่ระบุ',
      value: Number(row.count),
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

    return { byPriority, byStatus, byWorkspace };
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