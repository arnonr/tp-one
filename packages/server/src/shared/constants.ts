export const GLOBAL_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

export type GlobalRole = (typeof GLOBAL_ROLES)[keyof typeof GLOBAL_ROLES];

export const WORKSPACE_PERMISSIONS = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[keyof typeof WORKSPACE_PERMISSIONS];

export const PROJECT_PERMISSIONS = {
  OWNER: 'owner',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type ProjectPermission = (typeof PROJECT_PERMISSIONS)[keyof typeof PROJECT_PERMISSIONS];

export const TASK_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'เร่งด่วน',
  high: 'สูง',
  normal: 'ปกติ',
  low: 'ต่ำ',
};

export const WORKSPACE_TYPES = ['rental', 'consulting', 'training', 'incubation', 'general'] as const;
export type WorkspaceType = (typeof WORKSPACE_TYPES)[keyof typeof WORKSPACE_TYPES];

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  rental: 'เช่าพื้นที่/ห้องประชุม',
  consulting: 'ที่ปรึกษา/วิจัย',
  training: 'อบรม/สัมนา',
  incubation: 'บ่มเพาะ/Incubation',
  general: 'ทั่วไป',
};

export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[keyof typeof PROJECT_STATUSES];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'วางแผน',
  active: 'กำลังดำเนินการ',
  on_hold: 'ระงับชั่วคราว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
};

export const DEFAULT_WORKSPACE_STATUSES: Record<WorkspaceType, string[]> = {
  rental: ['รับแจ้ง', 'ตรวจสอบ', 'อนุมัติ', 'จัดเตรียม', 'เสร็จสิ้น'],
  consulting: ['รับเรื่อง', 'ประเมิน', 'ดำเนินการ', 'ส่งมอบ', 'เสร็จสิ้น'],
  training: ['วางแผน', 'ขออนุมัติ', 'จัดเตรียม', 'ดำเนินการ', 'สรุปผล', 'เสร็จสิ้น'],
  incubation: ['รับสมัคร', 'คัดเลือก', 'บ่มเพาะ', 'ติดตาม', 'สำเร็จ'],
  general: ['รอทำ', 'กำลังทำ', 'รอตรวจ', 'เสร็จสิ้น'],
};
