# Database Schema — TP-One

> Source of truth: `packages/server/src/db/schema/*.ts`

## ER Diagram

```
users ──────────────────────────────────────────────────────────────
  │ 1
  ├──< workspaces (owner)
  ├──< workspace_members
  ├──< projects (owner)
  ├──< project_members
  ├──< tasks (assignee, reporter)
  ├──< comments
  ├──< attachments
  ├──< notifications
  ├──< user_notification_settings (1:1)
  ├──< activity_logs
  ├──< annual_plans (createdBy)
  ├──< plan_indicators (assignee)
  ├──< indicator_updates (reportedBy)
  └──< quick_notes

workspaces ─────────────────────────────────────────────────────────
  │ 1
  ├──< workspace_statuses
  ├──< workspace_members
  ├──< projects
  ├──< tasks
  └──< tags ──< task_tags >── tasks

projects ───────────────────────────────────────────────────────────
  │ 1
  ├──< project_kpis
  ├──< project_members
  └──< tasks

tasks ──────────────────────────────────────────────────────────────
  │ 1
  ├──< tasks (self-ref: parentId → subtasks)
  ├──< task_watchers
  ├──< task_tags >── tags
  ├──< comments
  ├──< attachments
  ├──< activity_logs
  ├──< task_waiting (1:1 when status = "รอหน่วยงานอื่น")
  └──< quick_notes (converted_to_task_id)

task_waiting ──< task_follow_ups

annual_plans ───────────────────────────────────────────────────────
  │ 1
  └──< plan_categories ──< plan_indicators ──< indicator_updates

task_templates ──< task_template_items
```

---

## Tables

### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default random | |
| name | varchar(255) | NOT NULL | ชื่อ-สกุล |
| email | varchar(255) | NOT NULL, UNIQUE | อีเมลมหาวิทยาลัย |
| role | enum(admin, staff) | NOT NULL, default 'staff' | บทบาทระดับระบบ |
| avatarUrl | varchar(500) | | URL รูปโปรไฟล์ |
| isActive | boolean | NOT NULL, default true | |
| createdAt | timestamptz | NOT NULL, default now() | |
| updatedAt | timestamptz | NOT NULL, default now() | |

---

### workspaces

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| name | varchar(255) | NOT NULL | ชื่อ workspace |
| type | enum(rental, consulting, training, incubation, general) | NOT NULL, default 'general' | ประเภทบริการ |
| color | varchar(7) | | สี (#RRGGBB) |
| description | text | | |
| ownerId | uuid | FK → users.id | ผู้สร้าง |
| isActive | boolean | NOT NULL, default true | |
| createdAt | timestamptz | NOT NULL, default now() | |
| updatedAt | timestamptz | NOT NULL, default now() | |

### workspace_statuses

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| workspaceId | uuid | FK → workspaces.id, NOT NULL | |
| name | varchar(100) | NOT NULL | ชื่อสถานะ (ภาษาไทย) |
| color | varchar(7) | | สี |
| sortOrder | varchar | default '0' | ลำดับบน Kanban |
| isDefault | boolean | default false | สถานะเริ่มต้นของงานใหม่ |

### workspace_members

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| workspaceId | uuid | FK → workspaces.id, NOT NULL | |
| userId | uuid | FK → users.id, NOT NULL | |
| role | enum(owner, editor, viewer) | default 'viewer' | สิทธิ์ระดับ workspace |

**Composite PK:** (workspaceId, userId)

---

### projects

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| workspaceId | uuid | FK → workspaces.id, NOT NULL | |
| name | varchar(255) | NOT NULL | |
| description | text | | |
| status | enum(planning, active, on_hold, completed, cancelled) | NOT NULL, default 'planning' | |
| startDate | date | | |
| endDate | date | | |
| ownerId | uuid | FK → users.id, NOT NULL | |
| progress | numeric(5,2) | default '0' | % auto-calculated |
| createdAt | timestamptz | NOT NULL, default now() | |
| updatedAt | timestamptz | NOT NULL, default now() | |

### project_kpis

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| projectId | uuid | FK → projects.id, NOT NULL | |
| name | varchar(255) | NOT NULL | |
| targetValue | numeric | NOT NULL | ค่าเป้าหมาย |
| currentValue | numeric | default '0' | ค่าปัจจุบัน |
| unit | varchar(50) | | หน่วย (บาท, โครงการ, คน) |
| period | enum(monthly, quarterly, yearly) | default 'quarterly' | รอบการวัด |
| createdAt | timestamptz | NOT NULL, default now() | |

### project_members

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| projectId | uuid | FK → projects.id, NOT NULL | |
| userId | uuid | FK → users.id, NOT NULL | |
| role | enum(owner, member, viewer) | default 'member' | |

---

### tasks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| projectId | uuid | FK → projects.id (nullable) | อาจไม่ผูกโครงการ |
| workspaceId | uuid | FK → workspaces.id, NOT NULL | |
| parentId | uuid | (self-ref) | subtask อ้างถึง task แม่ |
| title | varchar(500) | NOT NULL | |
| description | text | | |
| statusId | uuid | FK → workspace_statuses.id | |
| priority | enum(urgent, high, normal, low) | NOT NULL, default 'normal' | |
| assigneeId | uuid | FK → users.id | ผู้รับผิดชอบ |
| reporterId | uuid | FK → users.id, NOT NULL | ผู้สร้างงาน |
| startDate | date | | |
| dueDate | date | | |
| completedAt | timestamptz | | |
| sortOrder | integer | default 0 | ลำดับบน Kanban |
| createdAt | timestamptz | NOT NULL, default now() | |
| updatedAt | timestamptz | NOT NULL, default now() | |

### task_watchers

| Column | Type | Constraints |
|--------|------|-------------|
| taskId | uuid | FK → tasks.id, NOT NULL |
| userId | uuid | FK → users.id, NOT NULL |

### tags

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| workspaceId | uuid | FK → workspaces.id, NOT NULL |
| name | varchar(100) | NOT NULL |
| color | varchar(7) | |

### task_tags

| Column | Type | Constraints |
|--------|------|-------------|
| taskId | uuid | FK → tasks.id, NOT NULL |
| tagId | uuid | FK → tags.id, NOT NULL |

### comments

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| taskId | uuid | FK → tasks.id, NOT NULL |
| userId | uuid | FK → users.id, NOT NULL |
| content | text | NOT NULL |
| createdAt | timestamptz | NOT NULL, default now() |
| updatedAt | timestamptz | NOT NULL, default now() |

### attachments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| taskId | uuid | FK → tasks.id, NOT NULL | |
| userId | uuid | FK → users.id, NOT NULL | |
| fileName | varchar(255) | NOT NULL | |
| filePath | varchar(500) | NOT NULL | `/data/uploads/{yyyy}/{mm}/{taskId}/{filename}` |
| fileSize | varchar(20) | | |
| mimeType | varchar(100) | | |
| createdAt | timestamptz | NOT NULL, default now() | |

---

### notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| userId | uuid | FK → users.id, NOT NULL | |
| type | varchar(100) | NOT NULL | task_assigned, status_changed, comment_added, due_soon |
| title | varchar(255) | NOT NULL | |
| message | text | | |
| entityType | varchar(50) | | task, project, plan |
| entityId | uuid | | |
| isRead | boolean | NOT NULL, default false | |
| createdAt | timestamptz | NOT NULL, default now() | |

### user_notification_settings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| userId | uuid | FK → users.id, NOT NULL, UNIQUE | |
| lineToken | varchar(500) | | LINE Notify token |
| emailEnabled | boolean | NOT NULL, default true | |
| notifyOnAssign | boolean | NOT NULL, default true | |
| notifyOnStatus | boolean | NOT NULL, default true | |
| notifyOnComment | boolean | NOT NULL, default true | |
| notifyOnDueSoon | boolean | NOT NULL, default true | |
| dailyDigest | boolean | default false | Daily standup summary |

### activity_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| userId | uuid | FK → users.id, NOT NULL | |
| action | varchar(100) | NOT NULL | created, updated, deleted, status_changed |
| entityType | varchar(50) | NOT NULL | task, project, kpi |
| entityId | uuid | NOT NULL | |
| details | jsonb | | diff หรือข้อมูลเพิ่มเติม |
| createdAt | timestamptz | NOT NULL, default now() | |

---

### annual_plans

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| year | integer | NOT NULL, UNIQUE | ปีงบประมาณ (พ.ศ.) เช่น 2569 |
| name | varchar(255) | NOT NULL | |
| status | enum(draft, active, completed) | NOT NULL, default 'draft' | |
| createdById | uuid | FK → users.id, NOT NULL | |
| createdAt | timestamptz | NOT NULL, default now() | |
| updatedAt | timestamptz | NOT NULL, default now() | |

**Index:** idx_annual_plans_year

### plan_categories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| planId | uuid | FK → annual_plans.id, NOT NULL | |
| code | varchar(10) | NOT NULL | "1", "2", "3" |
| name | varchar(255) | NOT NULL | "การบริการวิชาการ" |
| sortOrder | integer | default 0 | |

### plan_indicators

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| categoryId | uuid | FK → plan_categories.id, NOT NULL | |
| code | varchar(10) | NOT NULL | "1.1", "1.2" |
| name | varchar(500) | NOT NULL | |
| description | text | | |
| targetValue | numeric(15,2) | NOT NULL | ค่าเป้าหมาย |
| unit | varchar(50) | | หน่วย |
| indicatorType | enum(amount, count, percentage) | NOT NULL, default 'amount' | |
| assigneeId | uuid | FK → users.id | ผู้รับผิดชอบ |
| sortOrder | integer | default 0 | |

**Index:** idx_plan_indicators_category, idx_plan_indicators_assignee

### indicator_updates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | |
| indicatorId | uuid | FK → plan_indicators.id, NOT NULL | |
| reportedValue | numeric(15,2) | NOT NULL | |
| reportedMonth | integer | NOT NULL | 1-12 (ไทย: เดือน 1=ม.ค.) |
| reportedYear | integer | NOT NULL | พ.ศ. |
| progressPct | numeric(5,2) | | auto-calculated |
| note | text | | |
| evidenceUrl | varchar(500) | | |
| reportedBy | uuid | FK → users.id, NOT NULL | |
| createdAt | timestamptz | NOT NULL, default now() | |

**Index:** idx_indicator_updates_indicator, idx_indicator_updates_period (indicatorId, reportedYear, reportedMonth)

---

## Tables ที่ยังไม่มีใน schema (จะสร้างใน Phase ถัดไป)

| Table | Phase | Description |
|-------|-------|-------------|
| task_templates | Phase 2 | แม่แบบงาน (ชื่อ, คำอธิบาย, ประเภท workspace) |
| task_template_items | Phase 2 | รายการ subtask ใน template (ชื่อ, ลำดับ, assignee role) |
| task_waiting | Phase 2 | บันทึก "รอหน่วยงานอื่น" (หน่วยงาน, เหตุผล, เลขเอกสาร, วันที่ส่ง) |
| task_follow_ups | Phase 2 | บันทึกการติดตามงานที่รอ (วันที่, ผล, note) |
| kpi_audit_logs | Phase 4 | Audit trail การเปลี่ยนแปลง KPI (誰, จาก→เป็น, เมื่อไหร่, เหตุผล) |
| plan_indicator_audit_logs | Phase 7 | Audit trail ตัวชี้วัดแผนปฏิบัติการ |
| quick_notes | Phase 3 | บันทึกด่วน (content, status, converted_to_task_id) |

---

## Enums

| Enum | Values | Used In |
|------|--------|---------|
| user_role | admin, staff | users.role |
| workspace_type | rental, consulting, training, incubation, general | workspaces.type |
| workspace_member_role | owner, editor, viewer | workspace_members.role |
| project_status | planning, active, on_hold, completed, cancelled | projects.status |
| project_member_role | owner, member, viewer | project_members.role |
| task_priority | urgent, high, normal, low | tasks.priority |
| plan_status | draft, active, completed | annual_plans.status |
| indicator_type | amount, count, percentage | plan_indicators.indicatorType |

---

## Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| idx_annual_plans_year | annual_plans | year | ค้นหาแผนตามปีงบ |
| idx_plan_indicators_category | plan_indicators | categoryId | ดึงตัวชี้วัดตามหมวด |
| idx_plan_indicators_assignee | plan_indicators | assigneeId | ดึงงานของผู้รับผิดชอบ |
| idx_indicator_updates_indicator | indicator_updates | indicatorId | ดึงประวัติอัปเดต |
| idx_indicator_updates_period | indicator_updates | indicatorId, reportedYear, reportedMonth | ค้นหาอัปเดตตามช่วงเวลา |
