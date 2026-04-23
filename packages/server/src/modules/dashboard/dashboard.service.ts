import { db } from '../../config/database';
import { tasks, taskAssignees, workspaceStatuses, workspaces, projects, projectKpis, users } from '../../db/schema';
import { eq, and, isNull, sql, inArray, count } from 'drizzle-orm';
import { getCurrentFiscalYear, THAI_MONTHS_SHORT } from '../../shared/thai.utils';

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
  async getStats(fiscalYear: number = getCurrentFiscalYear()): Promise<StatsResponse> {
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
      .where(eq(tasks.fiscalYear, fiscalYear));

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

  async getTaskStatusChart(fiscalYear: number = getCurrentFiscalYear()): Promise<TaskChartResponse> {
    // By priority
    const priorityRows = await db
      .select({
        priority: tasks.priority,
        count: count(),
      })
      .from(tasks)
      .where(eq(tasks.fiscalYear, fiscalYear))
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
    const statusRows = await db
      .select({
        statusName: workspaceStatuses.name,
        count: count(),
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .where(eq(tasks.fiscalYear, fiscalYear))
      .groupBy(workspaceStatuses.name);

    const byStatus = statusRows.map(row => ({
      label: row.statusName || 'ไม่ระบุ',
      value: Number(row.count),
    }));

    // By workspace
    const workspaceRows = await db
      .select({
        workspaceId: tasks.workspaceId,
        workspaceName: workspaces.name,
        count: count(),
      })
      .from(tasks)
      .innerJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(eq(tasks.fiscalYear, fiscalYear))
      .groupBy(tasks.workspaceId, workspaces.name);

    const byWorkspace = workspaceRows.map(row => ({
      label: row.workspaceName || 'ไม่ระบุ',
      value: Number(row.count),
    }));

    return { byPriority, byStatus, byWorkspace };
  },

  async getProjectProgress(fiscalYear: number = getCurrentFiscalYear()): Promise<ProjectProgressResponse> {
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
      .where(eq(tasks.fiscalYear, fiscalYear))
      .groupBy(projects.id, projects.name, projects.progress, projects.status);

    const projectsList = projectRows.map(row => ({
      id: row.id,
      name: row.name,
      progress: Number(row.progress) || 0,
      status: row.status,
    }));

    return { projects: projectsList };
  },

  async getWorkloadDistribution(fiscalYear: number = getCurrentFiscalYear()): Promise<WorkloadDistributionResponse> {
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
      .where(eq(tasks.fiscalYear, fiscalYear))
      .groupBy(taskAssignees.userId, users.name);

    const usersList = rows.map(row => ({
      userId: row.userId,
      displayName: row.displayName || 'ไม่ระบุ',
      taskCount: Number(row.taskCount),
    }));

    return { users: usersList };
  },

  async getKpiSummary(fiscalYear: number = getCurrentFiscalYear()): Promise<KpiSummaryResponse> {
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
      .where(eq(tasks.fiscalYear, fiscalYear))
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

  async getOverdueTasks(fiscalYear: number = getCurrentFiscalYear()): Promise<{ count: number; tasks: OverdueTask[] }> {
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
      .where(
        and(
          eq(tasks.fiscalYear, fiscalYear),
          isNull(tasks.completedAt),
        )
      );

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

  async getMonthlyTrend(fiscalYear: number = getCurrentFiscalYear()): Promise<MonthlyTrendItem[]> {
    // Get fiscal year date range (Oct of previous AD year to Sep of current AD year)
    const adYear = fiscalYear - 543;
    const fiscalStartDate = `${adYear - 1}-10-01`;
    const fiscalEndDate = `${adYear}-09-30`;

    // Get all tasks created within fiscal year
    const createdRows = await db
      .select({
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(eq(tasks.fiscalYear, fiscalYear));

    // Get all tasks completed within fiscal year
    const completedRows = await db
      .select({
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.fiscalYear, fiscalYear),
          isNull(tasks.completedAt),
        )
      );

    // Build monthly counts
    // Fiscal year: Oct(10) -> Sep(9) of next year
    const createdCounts: number[] = Array(12).fill(0);
    const completedCounts: number[] = Array(12).fill(0);

    for (const row of createdRows) {
      if (row.createdAt) {
        const date = new Date(row.createdAt);
        const month = date.getMonth(); // 0-11
        createdCounts[month]++;
      }
    }

    // For completed, we need to count tasks that have completedAt set and completed within fiscal year
    // Since we're querying completedAt IS NULL, we need different approach
    const allCompletedRows = await db
      .select({
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(eq(tasks.fiscalYear, fiscalYear));

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

  async getDeadlineHeatmap(fiscalYear: number = getCurrentFiscalYear()): Promise<DeadlineHeatmapItem[]> {
    const deadlineRows = await db
      .select({
        dueDate: tasks.dueDate,
        count: count(),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.fiscalYear, fiscalYear),
          isNull(tasks.completedAt),
        )
      )
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