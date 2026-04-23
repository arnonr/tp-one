import api from './api'

export interface DashboardStats {
  total: number
  inProgress: number
  completed: number
  byPriority: { urgent: number; high: number; normal: number; low: number }
  byStatusType: Record<string, number>
}

export interface TaskChartData {
  byPriority: { label: string; value: number }[]
  byStatusType: { label: string; value: number; color: string }[]
  byWorkspace: { label: string; value: number }[]
}

export interface ProjectProgress {
  projects: { id: string; name: string; progress: number; status: string }[]
}

export interface WorkloadUser {
  userId: string
  displayName: string
  taskCount: number
}

export interface WorkloadData {
  users: WorkloadUser[]
}

export interface KpiItem {
  name: string
  target: number
  current: number
  unit: string
  achievement: number
}

export interface KpiData {
  kpis: KpiItem[]
}

export interface OverdueTask {
  id: string;
  title: string;
  dueDate: string;
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

export interface MonthlyStatusStatus {
  name: string;
  count: number;
  color: string;
}

export interface MonthlyStatusBreakdownItem {
  month: string;
  statuses: MonthlyStatusStatus[];
}

export interface MonthlyStatusBreakdownData {
  monthlyStatusBreakdown: MonthlyStatusBreakdownItem[];
}

export const dashboardService = {
  async getStats(fiscalYear: number, workspaceId?: string | null): Promise<DashboardStats> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/stats?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },

  async getTaskChart(fiscalYear: number, workspaceId?: string | null): Promise<TaskChartData> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/task-chart?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },

  async getProjects(fiscalYear: number, workspaceId?: string | null): Promise<ProjectProgress> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/projects?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },

  async getWorkload(fiscalYear: number, workspaceId?: string | null): Promise<WorkloadData> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/workload?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },

  async getKpi(fiscalYear: number, workspaceId?: string | null): Promise<KpiData> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/kpi?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },

  async getOverdue(fiscalYear: number, workspaceId?: string | null): Promise<{ overdue: { count: number; tasks: OverdueTask[] } }> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/overdue?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },

  async getTrend(fiscalYear: number, workspaceId?: string | null): Promise<{ monthlyTrend: MonthlyTrendItem[] }> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/trend?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },

  async getMonthlyStatusBreakdown(fiscalYear: number, workspaceId?: string | null): Promise<MonthlyStatusBreakdownData> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/monthly-status-breakdown?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },

  async getDeadlineHeatmap(fiscalYear: number, workspaceId?: string | null): Promise<{ deadlineHeatmap: DeadlineHeatmapItem[] }> {
    const ws = workspaceId ? `&workspaceId=${workspaceId}` : ''
    const { data } = await api.get(`/dashboard/deadline-heatmap?fiscalYear=${fiscalYear}${ws}`)
    return data.data
  },
}