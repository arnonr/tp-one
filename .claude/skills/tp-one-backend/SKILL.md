---
name: tp-one-backend
description: Use when working on any backend code in tp-one project (packages/server/) — writing controllers, services, schemas, middleware, jobs, or database migrations with Elysia.js and Drizzle ORM. Enforces consistent module structure, Thai utilities, and clean code.
---

# TP-One Backend Skill

ElysiaJS + Drizzle ORM backend สำหรับระบบจัดการงานอุทยานเทคโนโลยี

## เอกสารอ้างอิง

อ่านเมื่อต้องการ context เพิ่มเติม:
- `docs/SYSTEM_ANALYSIS.md` — requirements เต็ม (เฉพาะส่วน business logic, data model)
- `docs/api-spec.md` — API endpoints ทั้งหมด (request/response format)
- `docs/database-schema.md` — ตาราง, คอลัมน์, ความสัมพันธ์ทั้งหมด
- `docs/superpowers/plans/2026-04-21-tp-one-implementation.md` — phase ปัจจุบัน + task details

## Architecture — Module Pattern

ทุก feature ใช้โครงสร้างเดียวกัน:

```
src/modules/{feature}/
├── {feature}.service.ts    # Business logic + DB queries
├── {feature}.controller.ts # Request handling, calls service
└── {feature}.plugin.ts     # Elysia route definitions
```

### Service — Business Logic

```typescript
// modules/task/task.service.ts
import { db } from '../../config/database'
import { tasks, workspaceStatuses } from '../../db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { NotFoundError, ForbiddenError } from '../../shared/errors'

export const TaskService = {
  async list(filter: TaskFilter, userId: string, userRole: GlobalRole) {
    const conditions = []

    if (filter.workspaceId) {
      conditions.push(eq(tasks.workspaceId, filter.workspaceId))
    }
    if (filter.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filter.assigneeId))
    }

    return db
      .select()
      .from(tasks)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(tasks.createdAt))
      .limit(filter.pageSize ?? 20)
      .offset(((filter.page ?? 1) - 1) * (filter.pageSize ?? 20))
  },

  async getById(id: string) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!task) throw new NotFoundError('Task', id)
    return task
  },
}
```

### Controller — Thin Layer

```typescript
// modules/task/task.controller.ts
import { TaskService } from './task.service'

export const TaskController = {
  async list(query: TaskFilter, user: JwtPayload) {
    const result = await TaskService.list(query, user.userId, user.role)
    return { success: true, ...result }
  },

  async getById(id: string, user: JwtPayload) {
    const task = await TaskService.getById(id)
    return { success: true, data: task }
  },
}
```

### Plugin — Route Definitions

```typescript
// modules/task/task.plugin.ts
import Elysia from 'elysia'
import { TaskController } from './task.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

export const taskPlugin = new Elysia({ prefix: '/api/tasks' })
  .onBeforeHandle(authMiddleware())
  .get('/', async ({ query, user }) => TaskController.list(query, user), {
    detail: { summary: 'แสดงรายการงาน' },
  })
  .get('/:id', async ({ params: { id }, user }) => TaskController.getById(id, user), {
    detail: { summary: 'ดูรายละเอียดงาน' },
  })
```

## Database Rules

### Schema — Source of Truth

```typescript
// db/schema/*.ts — แก้ที่นี่เท่านั้น, ห้ามแก้ migration SQL โดยตรง
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### Query — Drizzle ORM Only

```typescript
// ✅ ใช้ Drizzle query builder
const result = await db.select().from(tasks).where(eq(tasks.id, id))

// ✅ Join
const result = await db
  .select({
    task: tasks,
    assignee: { id: users.id, name: users.name },
  })
  .from(tasks)
  .leftJoin(users, eq(tasks.assigneeId, users.id))
  .where(eq(tasks.workspaceId, workspaceId))

// ❌ ห้าม raw SQL
await db.execute(sql`SELECT * FROM tasks WHERE id = ${id}`)
```

### Pagination — ใช้ format เดียวกันทุกที่

```typescript
interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

async function paginate<T>(
  query: any,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResult<T>> {
  const [data, [{ count }]] = await Promise.all([
    query.limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(query),
  ])

  return {
    data,
    total: Number(count),
    page,
    pageSize,
    totalPages: Math.ceil(Number(count) / pageSize),
  }
}
```

## Error Handling — ใช้ AppError subclasses

```typescript
import { AppError, NotFoundError, ForbiddenError, UnauthorizedError, ValidationError } from '../../shared/errors'

// ✅ ใช้ error classes
if (!task) throw new NotFoundError('Task', id)
if (!canEdit) throw new ForbiddenError()
if (!token) throw new UnauthorizedError()
if (!title) throw new ValidationError('title is required')

// ❌ ห้าม throw generic Error
throw new Error('Task not found')
```

Elysia error handler ใน `index.ts`:

```typescript
app.onError(({ error, set }) => {
  if (error instanceof AppError) {
    set.status = error.statusCode
    return { success: false, error: { code: error.code, message: error.message } }
  }
  set.status = 500
  return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }
})
```

## RBAC Pattern — ตรวจสอบสิทธิ์ทุก route

```typescript
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../middleware/rbac.middleware'
import { canEditWorkspace, getWorkspacePermission } from '../../middleware/rbac.middleware'

// Route-level: ต้อง login
.onBeforeHandle(authMiddleware())

// Route-level: admin เท่านั้น
.onBeforeHandle(requireAdmin())

// Service-level: ตรวจ permission
async function updateTask(taskId: string, userId: string, userRole: GlobalRole) {
  const task = await this.getById(taskId)
  const permission = await getWorkspacePermission(userId, task.workspaceId)
  if (!canEditWorkspace(permission, userRole)) {
    throw new ForbiddenError()
  }
  // ... proceed
}
```

## Thai Utilities — ใช้จาก shared/thai.utils.ts

```typescript
import {
  getFiscalYear,
  getFiscalYearRange,
  getCurrentFiscalYear,
  getFiscalQuarter,
  toBuddhistYear,
  formatThaiDate,
  formatThaiCurrency,
  getThaiFiscalLabel,
  getFiscalQuarterLabel,
  THAI_MONTHS_SHORT,
} from '../../shared/thai.utils'

// Default fiscal year filter
const currentFY = getCurrentFiscalYear()
const { startDate, endDate } = getFiscalYearRange(currentFY)

// Fiscal quarter date range
const quarter = getFiscalQuarter(new Date())
const quarterLabel = getFiscalQuarterLabel(quarter) // "ไตรมาสที่ 3 (เม.ย. - มิ.ย.)"
```

## Response Format — ใช้ format เดียวกันทุก endpoint

```typescript
// Success
return { success: true, data }

// Paginated
return { success: true, data: items, total, page, pageSize, totalPages }

// Error (handled by error handler)
{ success: false, error: { code: 'NOT_FOUND', message: 'Task (id: xxx) not found' } }
```

## Activity Logging — ทุก state-changing operation

```typescript
import { db } from '../../config/database'
import { activityLogs } from '../../db/schema'

async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>
) {
  await db.insert(activityLogs).values({
    userId,
    action,
    entityType,
    entityId,
    details,
  })
}

// ใช้ทุกครั้งที่ create/update/delete/status_change
await logActivity(user.userId, 'status_changed', 'task', task.id, {
  from: oldStatus,
  to: newStatus,
})
```

## File Upload Pattern

```typescript
// ตรวจสอบ file type + จำกัดขนาด
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function validateUpload(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError('ไฟล์ประเภทนี้ไม่รองรับ')
  }
  if (file.size > MAX_SIZE) {
    throw new ValidationError('ไฟล์ขนาดเกิน 50MB')
  }
}

// Save to /data/uploads/{yyyy}/{mm}/{taskId}/{filename}
```

## Notification Trigger Pattern

```typescript
// หลังทุก action ที่มี notification
async function assignTask(taskId: string, assigneeId: string) {
  // 1. อัปเดต DB
  await db.update(tasks).set({ assigneeId }).where(eq(tasks.id, taskId))

  // 2. Log activity
  await logActivity(userId, 'assigned', 'task', taskId, { assigneeId })

  // 3. Trigger notification
  await NotificationService.send({
    userId: assigneeId,
    type: 'task_assigned',
    title: 'คุณได้รับมอบหมายงานใหม่',
    entityType: 'task',
    entityId: taskId,
  })
}
```

## TypeScript Rules

```typescript
// ✅ Type inference จาก schema
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

// ✅ Explicit return types สำหรับ public functions
export async function getById(id: string): Promise<Task> { ... }

// ❌ ห้าม any
const data: any = {} // ผิด

// ✅ Const assertions
const ROLES = ['admin', 'staff'] as const
type Role = (typeof ROLES)[number]
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `task.service.ts`, `rbac.middleware.ts` |
| Variables/Functions | camelCase | `getById`, `fiscalYearRange` |
| Types/Interfaces | PascalCase | `TaskFilter`, `JwtPayload` |
| Database tables | snake_case | `workspace_members` |
| Database columns | camelCase (Drizzle) | `assigneeId`, `createdAt` |
| API routes | kebab-case | `/api/quick-notes`, `/api/fiscal-year` |
| Enums | camelCase values | `'on_hold'`, `'in_progress'` |

## Migration Workflow

```bash
# 1. แก้ schema ใน db/schema/*.ts
# 2. Generate migration
cd packages/server && bun run db:generate
# 3. ตรวจสอบ SQL ที่ generate
# 4. Run migration
bun run db:migrate
```

ห้ามแก้ migration SQL โดยตรง — แก้ schema แล้ว generate ใหม่เท่านั้น

## Common Drizzle Patterns

```typescript
// Insert + return
const [newTask] = await db.insert(tasks).values(input).returning()

// Update + return
const [updated] = await db.update(tasks).set({ title }).where(eq(tasks.id, id)).returning()

// Delete
await db.delete(tasks).where(eq(tasks.id, id))

// Count
const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(tasks)

// Transaction
await db.transaction(async (tx) => {
  const [task] = await tx.insert(tasks).values(input).returning()
  await tx.insert(activityLogs).values({ action: 'created', entityId: task.id })
})

// Conditional where
const conditions = [eq(tasks.workspaceId, workspaceId)]
if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId))
const result = await db.select().from(tasks).where(and(...conditions))
```

## Input Validation — Elysia + TypeBox

```typescript
import { t } from 'elysia'

// Route-level validation: body, query, params
export const taskPlugin = new Elysia({ prefix: '/api/tasks' })
  .post('/', async ({ body, user }) => TaskController.create(body, user), {
    body: t.Object({
      title: t.String({ minLength: 1, maxLength: 500 }),
      description: t.Optional(t.String({ maxLength: 5000 })),
      priority: t.Union([t.Literal('urgent'), t.Literal('high'), t.Literal('normal'), t.Literal('low')]),
      dueDate: t.Optional(t.String({ format: 'date' })),
      assigneeId: t.Optional(t.String({ format: 'uuid' })),
    }),
    detail: { summary: 'สร้างงานใหม่' },
  })

// ✅ Elysia auto-validates — invalid input returns 422 before hitting controller
// ❌ ห้าม validate เองใน controller/service
```

## Query Optimization — PostgreSQL + Drizzle

### ใส่ index ที่ column ที่ filter/sort บ่อย

```sql
-- ใน migration SQL (generate แล้วเพิ่ม manual ใน migration file)
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(workspace_id, status_id);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_fiscal_year ON tasks(workspace_id, created_at);
```

### หลีกเลี่ยง N+1 queries

```typescript
// ❌ N+1 — 1 query tasks + N queries assignees
const tasks = await db.select().from(tasks)
for (const task of tasks) {
  const [assignee] = await db.select().from(users).where(eq(users.id, task.assigneeId))
}

// ✅ 1 query with join
const tasksWithAssignees = await db
  .select({
    task: tasks,
    assignee: { id: users.id, name: users.name, avatar: users.avatar },
  })
  .from(tasks)
  .leftJoin(users, eq(tasks.assigneeId, users.id))

// ✅ Batch load — ใช้เมื่อจำเป็นต้อง separate queries
const taskIds = tasks.map(t => t.id)
const subtasks = await db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds))
```

### Select เฉพาะ columns ที่ต้องการ

```typescript
// ❌ SELECT * สำหรับ list view
const tasks = await db.select().from(tasks)

// ✅ เลือกเฉพาะที่ list view ต้องการ
const tasks = await db
  .select({
    id: tasks.id,
    title: tasks.title,
    priority: tasks.priority,
    status: tasks.status,
    dueDate: tasks.dueDate,
    assigneeName: users.name,
  })
  .from(tasks)
  .leftJoin(users, eq(tasks.assigneeId, users.id))
```

## Caching — Redis Patterns

```typescript
import { redis } from '../../config/redis'

// 1. Cache-aside: read-through
async function getWorkspace(id: string): Promise<Workspace> {
  const cached = await redis.get(`workspace:${id}`)
  if (cached) return JSON.parse(cached)

  const workspace = await WorkspaceService.getById(id)
  await redis.set(`workspace:${id}`, JSON.stringify(workspace), 'EX', 300) // 5 min
  return workspace
}

// 2. Invalidate on write
async function updateWorkspace(id: string, data: Partial<Workspace>) {
  const result = await db.update(workspaces).set(data).where(eq(workspaces.id, id)).returning()
  await redis.del(`workspace:${id}`)
  return result[0]
}

// 3. Pagination cache — key รวม query params
const cacheKey = `tasks:${workspaceId}:fy${fiscalYear}:p${page}:s${pageSize}`
```

## Security Checklist — ทุก route ต้องผ่าน

### Authentication & Authorization

```typescript
// ✅ ทุก /api/* route ต้องมี authMiddleware
.onBeforeHandle(authMiddleware())

// ✅ Admin-only routes เพิ่ม requireAdmin()
.onBeforeHandle(requireAdmin())

// ✅ Resource-level permission check ใน service
const permission = await getWorkspacePermission(userId, resource.workspaceId)
if (!canEditWorkspace(permission, userRole)) throw new ForbiddenError()
```

### Input Sanitization

```typescript
// ✅ Elysia TypeBox validation บน body/query/params
// ✅ ตรวจ file type + size สำหรับ uploads
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 50 * 1024 * 1024

// ✅ หลีกเลี่ยง user-controlled string ใน order by
const VALID_SORT_COLUMNS = ['createdAt', 'dueDate', 'title', 'priority'] as const
function safeSort(column: string) {
  if (!VALID_SORT_COLUMNS.includes(column as any)) return tasks.createdAt
  return tasks[column]
}
```

### Sensitive Data

```typescript
// ❌ ห้าม return password hash, JWT secret
const [user] = await db.select({
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  // ไม่ select passwordHash
}).from(users).where(eq(users.id, id))

// ❌ ห้าม log sensitive data
logger.info({ userId: user.id }, 'User logged in') // ✅
logger.info({ password: body.password }, 'Login attempt') // ❌
```

## Error Response Mapping

```typescript
// AppError subclasses → HTTP status
// NotFoundError → 404
// UnauthorizedError → 401
// ForbiddenError → 403
// ValidationError → 422
// AppError (default) → 500

// Elysia global error handler (index.ts)
app.onError(({ error, set }) => {
  if (error instanceof AppError) {
    set.status = error.statusCode
    return { success: false, error: { code: error.code, message: error.message } }
  }
  // Unexpected errors — don't leak internals
  set.status = 500
  return { success: false, error: { code: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดภายในระบบ' } }
})
```

## Testing Pattern

```typescript
// tests/modules/task/task.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('TaskService', () => {
  describe('getById', () => {
    it('returns task when found', async () => {
      // Arrange
      const [task] = await db.insert(tasks).values({ title: 'Test', ... }).returning()
      // Act
      const result = await TaskService.getById(task.id)
      // Assert
      expect(result.title).toBe('Test')
    })

    it('throws NotFoundError when not found', async () => {
      await expect(TaskService.getById('nonexistent'))
        .rejects.toThrow(NotFoundError)
    })
  })
})
```
