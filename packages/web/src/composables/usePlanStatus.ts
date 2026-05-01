import type { PlanItemStatus } from '@/types/plan'

export const PLAN_ITEM_STATUS_OPTIONS: { value: PlanItemStatus; label: string; color: string; tagType: 'default' | 'info' | 'success' | 'error' }[] = [
  { value: 'pending', label: 'รอดำเนินการ', color: '#8a8a8a', tagType: 'default' },
  { value: 'in_progress', label: 'อยู่ระหว่างดำเนินการ', color: '#2080f0', tagType: 'info' },
  { value: 'completed', label: 'ดำเนินการเสร็จสิ้น', color: '#18a058', tagType: 'success' },
  { value: 'cancelled', label: 'ขอยกเลิก', color: '#d03050', tagType: 'error' },
]

export function getStatusLabel(status: PlanItemStatus): string {
  return PLAN_ITEM_STATUS_OPTIONS.find(o => o.value === status)?.label ?? status
}

export function getStatusTagType(status: PlanItemStatus): 'default' | 'info' | 'success' | 'error' {
  return PLAN_ITEM_STATUS_OPTIONS.find(o => o.value === status)?.tagType ?? 'default'
}
