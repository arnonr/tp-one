import api from './api'
import type {
  AnnualPlan,
  Strategy,
  Goal,
  Indicator,
  IndicatorUpdate,
  UserMini,
  PlanProgress,
  PlanListItem,
} from '@/types/plan'

// ========== Annual Plans ==========
export async function listPlans(fiscalYear?: number, status?: string) {
  const params: Record<string, string> = {}
  if (fiscalYear) params.fiscalYear = String(fiscalYear)
  if (status) params.status = status
  const { data } = await api.get('/plans', { params })
  return data as PlanListItem[]
}

export async function getPlan(id: string) {
  const { data } = await api.get(`/plans/${id}`)
  return data as AnnualPlan
}

export async function createPlan(payload: { year: number; name: string; description?: string }) {
  const { data } = await api.post('/plans', payload)
  return data as AnnualPlan
}

export async function updatePlan(id: string, payload: { name?: string; description?: string; status?: string }) {
  const { data } = await api.patch(`/plans/${id}`, payload)
  return data as AnnualPlan
}

export async function deletePlan(id: string) {
  const { data } = await api.delete(`/plans/${id}`)
  return data
}

// ========== Strategies ==========
export async function listStrategies(planId: string) {
  const { data } = await api.get(`/plans/annual-plans/${planId}/strategies`)
  return data as Strategy[]
}

export async function createStrategy(planId: string, payload: { name: string; description?: string; sortOrder?: number }) {
  const { data } = await api.post(`/plans/annual-plans/${planId}/strategies`, payload)
  return data as Strategy
}

export async function updateStrategy(strategyId: string, payload: { name?: string; description?: string; sortOrder?: number }) {
  const { data } = await api.patch(`/plans/strategies/${strategyId}`, payload)
  return data as Strategy
}

export async function deleteStrategy(strategyId: string) {
  const { data } = await api.delete(`/plans/strategies/${strategyId}`)
  return data
}

// ========== Goals ==========
export async function listGoals(strategyId: string) {
  const { data } = await api.get(`/plans/strategies/${strategyId}/goals`)
  return data as Goal[]
}

export async function createGoal(strategyId: string, payload: { name: string; description?: string; sortOrder?: number }) {
  const { data } = await api.post(`/plans/strategies/${strategyId}/goals`, payload)
  return data as Goal
}

export async function updateGoal(goalId: string, payload: { name?: string; description?: string; sortOrder?: number }) {
  const { data } = await api.patch(`/plans/goals/${goalId}`, payload)
  return data as Goal
}

export async function deleteGoal(goalId: string) {
  const { data } = await api.delete(`/plans/goals/${goalId}`)
  return data
}

// ========== Indicators ==========
export async function listIndicators(goalId: string) {
  const { data } = await api.get(`/plans/goals/${goalId}/indicators`)
  return data as Indicator[]
}

export async function createIndicator(goalId: string, payload: {
  name: string
  description?: string
  targetValue: string
  unit?: string
  indicatorType?: 'amount' | 'count' | 'percentage'
  weight?: number
  sortOrder?: number
}) {
  const { data } = await api.post(`/plans/goals/${goalId}/indicators`, payload)
  return data as Indicator
}

export async function updateIndicator(indicatorId: string, payload: {
  name?: string
  description?: string
  targetValue?: string
  unit?: string
  indicatorType?: 'amount' | 'count' | 'percentage'
  weight?: number
  sortOrder?: number
}) {
  const { data } = await api.patch(`/plans/indicators/${indicatorId}`, payload)
  return data as Indicator
}

export async function deleteIndicator(indicatorId: string) {
  const { data } = await api.delete(`/plans/indicators/${indicatorId}`)
  return data
}

// ========== Indicator Updates ==========
export async function listIndicatorUpdates(indicatorId: string) {
  const { data } = await api.get(`/plans/indicators/${indicatorId}/updates`)
  return data as IndicatorUpdate[]
}

export async function createIndicatorUpdate(indicatorId: string, payload: {
  reportedValue: string
  reportedDate: string
  progressPct?: string
  note?: string
  evidenceUrl?: string
}) {
  const { data } = await api.post(`/plans/indicators/${indicatorId}/updates`, payload)
  return data as IndicatorUpdate
}

export async function deleteIndicatorUpdate(indicatorId: string, updateId: string) {
  const { data } = await api.delete(`/plans/indicators/${indicatorId}/updates/${updateId}`)
  return data
}

// ========== Indicator Assignees ==========
export async function listIndicatorAssignees(indicatorId: string) {
  const { data } = await api.get(`/plans/indicators/${indicatorId}/assignees`)
  return data as UserMini[]
}

export async function addIndicatorAssignee(indicatorId: string, userId: string) {
  const { data } = await api.post(`/plans/indicators/${indicatorId}/assignees`, { userId })
  return data
}

export async function removeIndicatorAssignee(indicatorId: string, userId: string) {
  const { data } = await api.delete(`/plans/indicators/${indicatorId}/assignees/${userId}`)
  return data
}

// ========== Progress ==========
export async function getPlanProgress(planId: string) {
  const { data } = await api.get(`/plans/${planId}/progress`)
  return data as PlanProgress
}

// ========== Indicator Audit Trail ==========
export async function getIndicatorAuditLogs(indicatorId: string, page = 1, pageSize = 20) {
  const { data } = await api.get(`/plans/indicators/${indicatorId}/audit-logs`, {
    params: { page, pageSize },
  })
  return data as import('@/types/plan').IndicatorAuditLogResponse
}

export async function revertIndicator(indicatorId: string, auditLogId: string, reason: string) {
  const { data } = await api.post(`/plans/indicators/${indicatorId}/revert`, {
    auditLogId,
    reason,
  })
  return data
}

export async function exportIndicatorAuditLogs(indicatorId: string) {
  const response = await api.get(`/plans/indicators/${indicatorId}/audit-logs/export`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'indicator-audit-log.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}