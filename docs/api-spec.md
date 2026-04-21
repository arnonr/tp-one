# API Specification — TP-One

> Base URL: `/api` | Auth: Bearer JWT | ปีงบ default: ปีงบประมาณปัจจุบัน

## Response Format

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string, details?: unknown } }

// Paginated
{ success: true, data: T[], total: number, page: number, pageSize: number, totalPages: number }
```

## Common Query Params

| Param | Type | Description |
|-------|------|-------------|
| page | number | default 1 |
| pageSize | number | default 20, max 100 |
| fiscalYear | number | พ.ศ. เช่น 2569 |
| search | string | full-text search |
| sort | string | field:direction เช่น "dueDate:asc" |

---

## 1. Authentication

### POST /api/auth/login
Dev login — find user by email, return JWT. (จะเปลี่ยนเป็น SSO OIDC callback)

```
Body: { email: string }
Response: { token: string, user: AuthUser }
```

### GET /api/auth/callback
SSO OIDC callback — exchange code for token, find/create user.

```
Query: code, state
Response: redirect to frontend with token
```

### POST /api/auth/refresh
```
Headers: Authorization: Bearer <token>
Response: { token: string }
```

### GET /api/auth/me
```
Response: { id, name, email, role, avatarUrl }
```

### POST /api/auth/logout
Client-side token discard. Server logs the event.
```
Response: { success: true }
```

---

## 2. Fiscal Year

### GET /api/fiscal-year/current
```
Response: { fiscalYear: 2569, startDate: "2025-10-01", endDate: "2026-09-30", quarter: 3 }
```

### GET /api/fiscal-year/list
```
Response: { data: [{ fiscalYear: 2569, startDate, endDate }, ...] }
```

---

## 3. Workspaces

### GET /api/workspaces
```
Response: { data: Workspace[] }
// Admin: all workspaces | Staff: workspaces where member
```

### POST /api/workspaces
```
Body: { name: string, type: WorkspaceType, description?: string, color?: string }
Auth: admin only
Response: Workspace
```

### GET /api/workspaces/:id
```
Response: Workspace & { statuses: WorkspaceStatus[], memberCount: number, taskCount: number }
```

### PUT /api/workspaces/:id
```
Body: { name?, type?, description?, color?, isActive? }
Auth: admin or workspace owner
Response: Workspace
```

### DELETE /api/workspaces/:id
```
Auth: admin only
Response: { success: true }
```

### GET /api/workspaces/:id/statuses
```
Response: { data: WorkspaceStatus[] }
```

### POST /api/workspaces/:id/statuses
```
Body: { name: string, color?: string, sortOrder?: number, isDefault?: boolean }
Auth: admin or workspace owner
Response: WorkspaceStatus
```

### PUT /api/workspaces/:id/statuses/:statusId
```
Body: { name?, color?, sortOrder?, isDefault? }
Auth: admin or workspace owner
```

### DELETE /api/workspaces/:id/statuses/:statusId
```
Auth: admin or workspace owner
```

### GET /api/workspaces/:id/members
```
Response: { data: (User & { role: WorkspaceMemberRole })[] }
```

### POST /api/workspaces/:id/members
```
Body: { userId: string, role: "owner" | "editor" | "viewer" }
Auth: admin or workspace owner
```

### PUT /api/workspaces/:id/members/:userId
```
Body: { role: "owner" | "editor" | "viewer" }
Auth: admin or workspace owner
```

### DELETE /api/workspaces/:id/members/:userId
```
Auth: admin or workspace owner
```

---

## 4. Tasks

### GET /api/tasks
```
Query: workspaceId?, projectId?, assigneeId?, statusId?, priority?, search?, fiscalYear?, page?, pageSize?, sort?
Response: Paginated<Task & { assignee?: User, workspace: { id, name }, project?: { id, name }, status?: WorkspaceStatus }>
```

### POST /api/tasks
```
Body: {
  workspaceId: string,
  projectId?: string,
  parentId?: string,           // subtask
  title: string,
  description?: string,
  statusId?: string,           // default = workspace's default status
  priority?: "urgent"|"high"|"normal"|"low",
  assigneeId?: string,
  startDate?: string,
  dueDate?: string,
  tagIds?: string[],
  templateId?: string,         // สร้างจาก template → auto-create subtasks
}
Auth: admin or workspace editor/owner
Response: Task
```

### GET /api/tasks/:id
```
Response: Task & {
  assignee?, reporter, workspace, project?, status?,
  subtasks: Task[],
  comments: Comment[],
  attachments: Attachment[],
  tags: Tag[],
  watchers: User[],
  waiting?: TaskWaiting & { followUps: TaskFollowUp[] }
}
```

### PUT /api/tasks/:id
```
Body: { title?, description?, statusId?, priority?, assigneeId?, startDate?, dueDate?, projectId?, sortOrder? }
Auth: admin or workspace editor/owner or task reporter/assignee
Response: Task
```

### DELETE /api/tasks/:id
```
Auth: admin or task reporter
Response: { success: true }
```

### PATCH /api/tasks/:id/status
```
Body: { statusId: string }
Auth: admin or workspace editor/owner or assignee
Response: Task
Note: triggers activity_log + notification
```

---

### GET /api/tasks/:id/comments
```
Query: page?, pageSize?
Response: Paginated<Comment & { user: { id, name, avatarUrl } }>
```

### POST /api/tasks/:id/comments
```
Body: { content: string }  // supports @mention
Auth: any workspace member
Response: Comment
```

### PUT /api/comments/:commentId
```
Body: { content: string }
Auth: comment author only
```

### DELETE /api/comments/:commentId
```
Auth: comment author or admin
```

---

### POST /api/tasks/:id/attachments
```
Content-Type: multipart/form-data
Body: { file: File, evidenceType?: "activity"|"participants"|"venue"|"materials"|"other", eventName?: string, caption?: string }
Auth: any workspace member
Response: Attachment
```

### DELETE /api/tasks/:id/attachments/:attachmentId
```
Auth: uploader or admin
```

---

### POST /api/tasks/:id/watching
```
Auth: any user
Response: { success: true }
```

### DELETE /api/tasks/:id/watching
```
Response: { success: true }
```

---

### GET /api/tasks/:id/clipboard
```
Query: format: "short" | "full"
Response: { text: string }  // Thai emoji format สำหรับ copy ไป Telegram
```

**ตัวอย่าง short:**
```
📌 [จัดอบรม AI] | ⏳ รออนุมัติ | 👤 สมชาย | 📅 30 เม.ย. 69
🔗 https://tp-one.example.com/tasks/1234
```

**ตัวอย่าง full:**
```
📌 จัดอบรม AI for Business
━━━━━━━━━━━━━━━
⏳ สถานะ: รออนุมัติ
👤 ผู้รับผิดชอบ: สมชาย ใจดี
📅 Deadline: 30 เม.ย. 2569
🏢 Workspace: อบรม/สัมนา
⚡ ความสำคัญ: High
✅ Subtasks: 3/9 เสร็จ
🔗 https://tp-one.example.com/tasks/1234
```

---

### POST /api/tasks/:id/waiting
ตั้งสถานะ "รอหน่วยงานอื่น"
```
Body: {
  waitingForOrg: string,          // "กองคลัง มหาวิทยาลัย"
  reason: string,                 // "ขออนุมัติงบประมาณ"
  referenceDocNo?: string,        // "อว. 0023/2569"
  submittedDate: string,          // "2026-03-15"
  expectedReturnDate?: string,    // "2026-04-15"
}
Auth: admin or task assignee/reporter
Response: TaskWaiting
```

### DELETE /api/tasks/:id/waiting
ยกเลิกสถานะ "รอ" → งานกลับมาดำเนินการ
```
Response: { success: true }
```

### POST /api/tasks/:id/follow-up
บันทึกการติดตามงานที่รอ
```
Body: { note: string }  // "โทรติดตาม สภา.ตอบว่าอยู่ระหว่างพิจารณา"
Auth: admin or task assignee/reporter
Response: TaskFollowUp
```

### GET /api/tasks/:id/timeline
```
Response: { data: TimelineEntry[] }
// TimelineEntry: { status, changedBy, changedAt, durationMs, isBottleneck }
```

---

## 5. Task Templates

### GET /api/templates
```
Query: workspaceType?, workspaceId?
Response: { data: TaskTemplate[] }
```

### POST /api/templates
```
Body: {
  name: string,
  description?: string,
  workspaceType?: WorkspaceType,
  workspaceId?: string,
  items: [{ title: string, sortOrder: number, suggestedRole?: string }]
}
Auth: admin or workspace owner
Response: TaskTemplate
```

### GET /api/templates/:id
```
Response: TaskTemplate & { items: TaskTemplateItem[] }
```

### PUT /api/templates/:id
```
Body: { name?, description?, items?: [...] }
Auth: admin or workspace owner
```

### DELETE /api/templates/:id
```
Auth: admin or workspace owner
```

### POST /api/templates/:id/instantiate
สร้างงาน + subtasks จาก template
```
Body: { workspaceId: string, projectId?: string, assigneeId?: string }
Response: Task & { subtasks: Task[] }
```

---

## 6. My Work (งานของฉัน)

### GET /api/my-work
```
Query: group?: "today"|"overdue"|"this_week"|"this_month"|"waiting"|"all"
Response: {
  today: Task[],
  overdue: Task[],
  thisWeek: Task[],
  thisMonth: Task[],
  waiting: Task[],      // งานที่รอหน่วยงานอื่น
}
```

### GET /api/my-work/summary
```
Response: {
  today: number,
  overdue: number,
  thisWeek: number,
  thisMonth: number,
  waiting: number,
  total: number,
}
```

---

## 7. Projects

### GET /api/projects
```
Query: workspaceId?, status?, fiscalYear?, page?, pageSize?
Response: Paginated<Project & { workspace: { id, name }, owner: { id, name }, taskCount: number }>
```

### POST /api/projects
```
Body: { workspaceId: string, name: string, description?, startDate?, endDate?, memberIds?: string[] }
Auth: admin or workspace editor/owner
Response: Project
```

### GET /api/projects/:id
```
Response: Project & {
  workspace, owner, members[], tasks[],
  kpis: Kpi[],
  progress: number,
}
```

### PUT /api/projects/:id
```
Body: { name?, description?, status?, startDate?, endDate? }
Auth: admin or project owner
```

### DELETE /api/projects/:id
```
Auth: admin or project owner
```

### GET /api/projects/:id/members
```
Response: { data: (User & { role: ProjectMemberRole })[] }
```

### POST /api/projects/:id/members
```
Body: { userId: string, role: "owner"|"member"|"viewer" }
Auth: admin or project owner
```

### DELETE /api/projects/:id/members/:userId
```
Auth: admin or project owner
```

---

## 8. KPI

### GET /api/projects/:id/kpis
```
Response: { data: Kpi[] }
```

### POST /api/projects/:id/kpis
```
Body: { name: string, targetValue: number, unit?: string, period?: "monthly"|"quarterly"|"yearly" }
Auth: admin or project owner
Response: Kpi
```

### PUT /api/projects/:id/kpis/:kpiId
```
Body: { name?, targetValue?, currentValue?, unit?, period? }
Auth: admin or project owner
Note: ทุกการเปลี่ยนแปลงบันทึกลง kpi_audit_logs
```

### POST /api/projects/:id/kpis/:kpiId/update
อัปเดตค่า KPI ปัจจุบัน (สร้าง audit log)
```
Body: { currentValue: number, reason?: string }
Auth: admin or project owner/member
Response: Kpi & { auditLog: KpiAuditLog }
```

### GET /api/projects/:id/kpis/:kpiId/audit-logs
```
Query: page?, pageSize?
Response: Paginated<KpiAuditLog & { user: { id, name } }>
```

### POST /api/projects/:id/kpis/:kpiId/revert
ย้อนค่า KPI จาก audit log
```
Body: { auditLogId: string }
Auth: admin only
Response: Kpi
```

### GET /api/projects/:id/kpis/audit-logs/export
```
Query: format: "excel"
Auth: admin or project owner
Response: binary file (.xlsx)
```

---

## 9. Dashboard

### GET /api/dashboard/overview
```
Query: fiscalYear?, workspaceId?
Response: {
  totalTasks: number,
  inProgress: number,
  completed: number,
  overdue: number,
  waitingForOthers: number,
  byPriority: { urgent, high, normal, low },
  byWorkspace: { workspaceId, name, taskCount }[],
  recentTasks: Task[],       // 10 งานล่าสุด
  upcomingDeadlines: Task[], // 7 วันข้างหน้า
}
```

### GET /api/dashboard/workload
```
Query: workspaceId?, fiscalYear?
Response: { data: { userId, name, taskCount, overdueCount, completedCount }[] }
```

### GET /api/dashboard/kpi-summary
```
Query: fiscalYear?, projectId?
Response: { data: { projectId, name, kpiCount, avgProgress }[] }
```

### GET /api/dashboard/bottlenecks
```
Query: workspaceId?, fiscalYear?, month?, quarter?
Response: {
  bottlenecks: { statusName, avgDurationDays, taskCount, isBottleneck }[],
  stuckTasks: Task[],  // ค้างเกิน 14 วัน
}
```

### GET /api/dashboard/bottlenecks/trend
```
Query: workspaceId?, fiscalYear?
Response: { data: { period, bottlenecks: [...] }[] }
```

---

## 10. Notifications

### GET /api/notifications
```
Query: page?, pageSize?, isRead?
Response: Paginated<Notification>
```

### PUT /api/notifications/:id/read
```
Response: { success: true }
```

### PUT /api/notifications/read-all
```
Response: { success: true }
```

### GET /api/notification-settings
```
Response: UserNotificationSettings
```

### PUT /api/notification-settings
```
Body: { lineToken?, emailEnabled?, notifyOnAssign?, notifyOnStatus?, notifyOnComment?, notifyOnDueSoon?, dailyDigest? }
Response: UserNotificationSettings
```

### POST /api/standup/my
ส่ง/ดึงสรุป Standup ของตัวเอง
```
Response: { text: string, tasks: { today: Task[], overdue: Task[], waiting: Task[] } }
```

### POST /api/standup/workspace/:id
ส่งสรุป Standup ทั้งกลุ่ม Workspace (admin)
```
Response: { sent: boolean, recipientCount: number }
```

---

## 11. Quick Notes

### GET /api/quick-notes
```
Query: status?: "pending"|"converted"|"all", page?, pageSize?
Response: Paginated<QuickNote>
```

### POST /api/quick-notes
```
Body: { content: string }
Response: QuickNote
```

### PUT /api/quick-notes/:id
```
Body: { content: string }
Auth: note author only
```

### DELETE /api/quick-notes/:id
```
Auth: note author or admin
```

### POST /api/quick-notes/:id/convert
แปลง Note → Task
```
Body: { workspaceId: string, assigneeId?: string, priority?: TaskPriority, projectId?: string }
Response: Task
```

### POST /api/quick-notes/:id/convert-comment
แปลง Note → Comment ในงานที่มีอยู่
```
Body: { taskId: string }
Response: Comment
```

---

## 12. Annual Plans

### GET /api/plans
```
Query: fiscalYear?, status?
Response: { data: AnnualPlan[] }
```

### POST /api/plans
```
Body: { year: number, name: string }  // year = พ.ศ.
Auth: admin only
Response: AnnualPlan
```

### GET /api/plans/:id
```
Response: AnnualPlan & {
  categories: (PlanCategory & {
    indicators: (PlanIndicator & { currentValue: number, progressPct: number })[]
  })[],
  overallProgress: number,
}
```

### PUT /api/plans/:id
```
Body: { name?, status? }
Auth: admin only
```

### GET /api/plans/:id/categories
```
Response: { data: PlanCategory[] }
```

### POST /api/plans/:id/categories
```
Body: { code: string, name: string, sortOrder?: number }
Auth: admin only
```

### PUT /api/plans/categories/:categoryId
```
Body: { code?, name?, sortOrder? }
Auth: admin only
```

### GET /api/plans/:id/indicators
```
Query: categoryId?
Response: { data: PlanIndicator[] }
```

### POST /api/plans/:id/indicators
```
Body: { categoryId: string, code: string, name: string, targetValue: number, unit?: string, indicatorType?: "amount"|"count"|"percentage", assigneeId?: string, sortOrder?: number }
Auth: admin only
```

### PUT /api/plans/indicators/:indicatorId
```
Body: { name?, targetValue?, unit?, indicatorType?, assigneeId?, sortOrder? }
Auth: admin only
```

---

### GET /api/plans/indicators/:indicatorId/updates
```
Query: page?, pageSize?
Response: Paginated<IndicatorUpdate & { reporter: { id, name } }>
```

### POST /api/plans/indicators/:indicatorId/updates
อัปเดตค่าตัวชี้วัดรายเดือน
```
Body: { reportedValue: number, reportedMonth: number, reportedYear: number, note?: string, evidenceUrl?: string }
Auth: admin or indicator assignee
Response: IndicatorUpdate
```

### GET /api/plans/:id/progress
สรุป progress ทั้งแผน รายเดือน
```
Response: {
  overallProgress: number,
  byCategory: { categoryId, name, progressPct }[],
  monthly: { month, year, progressPct }[],
}
```

### GET /api/plans/:id/categories/:categoryId/progress
```
Response: { progressPct, indicators: { indicatorId, name, progressPct }[] }
```

### GET /api/plans/indicators/:indicatorId/audit-logs
```
Query: page?, pageSize?
Response: Paginated<IndicatorAuditLog & { user: { id, name } }>
```

### POST /api/plans/indicators/:indicatorId/revert
```
Body: { auditLogId: string }
Auth: admin only
```

### GET /api/plans/:id/export
```
Query: format: "pdf"|"excel"
Response: binary file
```

### GET /api/plans/:id/audit-logs/export
```
Query: format: "excel"
Response: binary file (.xlsx)
```

---

## 13. Reports

### GET /api/reports/monthly
```
Query: fiscalYear, month?, workspaceId?, projectId?
Response: {
  period: { month, year, fiscalYear },
  summary: { total, completed, inProgress, overdue },
  byWorkspace: { workspaceId, name, stats }[],
  byAssignee: { userId, name, stats }[],
  tasks: Task[],
}
```

### GET /api/reports/quarterly
```
Query: fiscalYear, quarter (1-4), workspaceId?
Response: {
  period: { quarter, fiscalYear, startDate, endDate },
  summary: { ... },
  monthlyBreakdown: { month, stats }[],
}
```

### GET /api/reports/export/pdf
```
Query: type: "monthly"|"quarterly", fiscalYear, month?|quarter?, workspaceId?
Response: binary file (.pdf)
```

### GET /api/reports/export/excel
```
Query: type: "monthly"|"quarterly"|"tasks", fiscalYear, workspaceId?
Response: binary file (.xlsx)
```

---

## 14. WebSocket

### WS /ws
Real-time events (authenticated via query param token)

```
// Client → Server
{ type: "subscribe", channels: ["task:123", "workspace:abc"] }
{ type: "unsubscribe", channels: [...] }

// Server → Client
{ type: "task.updated", data: { taskId, changes } }
{ type: "task.status_changed", data: { taskId, oldStatus, newStatus, changedBy } }
{ type: "comment.added", data: { taskId, comment } }
{ type: "notification", data: Notification }
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | ไม่ได้ login / token หมดอายุ |
| FORBIDDEN | 403 | ไม่มีสิทธิ์ |
| NOT_FOUND | 404 | ไม่พบข้อมูล |
| VALIDATION_ERROR | 400 | ข้อมูลไม่ถูกต้อง |
| CONFLICT | 409 | ข้อมูลซ้ำ |
| RATE_LIMITED | 429 | ส่ง request เร็วเกินไป |
| INTERNAL_ERROR | 500 | ข้อผิดพลาดภายใน |

## Status Codes Summary

| HTTP | Meaning |
|------|---------|
| 200 | สำเร็จ |
| 201 | สร้างสำเร็จ |
| 204 | ลบสำเร็จ (no content) |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Unprocessable entity |
| 500 | Internal server error |
