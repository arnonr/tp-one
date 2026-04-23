import api from './api'

export interface DashboardStats {
  total: number
  inProgress: number
  completed: number
  byPriority: { urgent: number; high: number; normal: number; low: number }
  byStatus: Record<string, number>
}

export interface TaskChartData {
  byPriority: { label: string; value: number }[]
  byStatus: { label: string; value: number }[]
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

export const dashboardService = {
  async getStats(fiscalYear: number): Promise<DashboardStats> {
    const { data } = await api.get(`/dashboard/stats?fiscalYear=${fiscalYear}`)
    return data.data
  },

  async getTaskChart(fiscalYear: number): Promise<TaskChartData> {
    const { data } = await api.get(`/dashboard/task-chart?fiscalYear=${fiscalYear}`)
    return data.data
  },

  async getProjects(fiscalYear: number): Promise<ProjectProgress> {
    const { data } = await api.get(`/dashboard/projects?fiscalYear=${fiscalYear}`)
    return data.data
  },

  async getWorkload(fiscalYear: number): Promise<WorkloadData> {
    const { data } = await api.get(`/dashboard/workload?fiscalYear=${fiscalYear}`)
    return data.data
  },

  async getKpi(fiscalYear: number): Promise<KpiData> {
    const { data } = await api.get(`/dashboard/kpi?fiscalYear=${fiscalYear}`)
    return data.data
  },
}