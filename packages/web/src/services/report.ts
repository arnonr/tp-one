import api from './api'
import type { WorkspaceStatusType } from '@/types'

export interface ReportSummary {
  fiscalYear: number
  totalTasks: number
  tasksByStatusType: Record<WorkspaceStatusType, number>
  tasksByWorkspace: { name: string; count: number; completed: number }[]
  projectStats: { total: number; completed: number; inProgress: number }
  monthlyData: { month: string; created: number; completed: number }[]
  quarterlyData: { quarter: number; label: string; created: number; completed: number; pending: number }[]
}

export interface MonthlyReport {
  tasks: { id: string; title: string; statusName: string; statusType: string; priority: string; workspaceName: string }[]
  monthName: string
  fiscalYear: number
}

function buildDownloadUrl(path: string): string {
  const base = import.meta.env.DEV ? 'http://localhost:3019' : ''
  return `${base}${path}`
}

async function downloadFile(path: string, filename: string) {
  const token = localStorage.getItem('token')
  const response = await fetch(buildDownloadUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Download failed')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const reportService = {
  async getSummary(fiscalYear: number, workspaceId?: string): Promise<ReportSummary> {
    const params = new URLSearchParams()
    params.set('fiscalYear', String(fiscalYear))
    if (workspaceId) params.set('workspaceId', workspaceId)
    const { data } = await api.get(`/reports/summary?${params}`)
    return data.data
  },

  async getMonthly(fiscalYear: number, month: number, workspaceId?: string): Promise<MonthlyReport> {
    const params = new URLSearchParams()
    params.set('fiscalYear', String(fiscalYear))
    params.set('month', String(month))
    if (workspaceId) params.set('workspaceId', workspaceId)
    const { data } = await api.get(`/reports/monthly?${params}`)
    return data.data
  },

  async exportPDF(fiscalYear: number, type = 'summary', workspaceId?: string, month?: number) {
    const params = new URLSearchParams()
    params.set('fiscalYear', String(fiscalYear))
    params.set('type', type)
    if (workspaceId) params.set('workspaceId', workspaceId)
    if (month) params.set('month', String(month))
    await downloadFile(`/api/reports/export/pdf?${params}`, `report-${fiscalYear}-${type}.pdf`)
  },

  async exportExcel(fiscalYear: number, type = 'summary', workspaceId?: string, month?: number) {
    const params = new URLSearchParams()
    params.set('fiscalYear', String(fiscalYear))
    params.set('type', type)
    if (workspaceId) params.set('workspaceId', workspaceId)
    if (month) params.set('month', String(month))
    await downloadFile(`/api/reports/export/excel?${params}`, `report-${fiscalYear}-${type}.xlsx`)
  },
}