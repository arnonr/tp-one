# Multi-Assignee for Tasks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single `assignee_id` on tasks with a many-to-many `task_assignees` junction table so each task can have multiple assignees.

**Architecture:** Add a `task_assignees` junction table (same pattern as `task_tags`, `task_watchers`). Remove `assignee_id` column from `tasks`. Backend service queries assignees via join. Frontend uses multi-select NSelect. Migration migrates existing data.

**Tech Stack:** Drizzle ORM, ElysiaJS, Vue 3 + Naive UI, PostgreSQL 16

---

### Task 1: Update Drizzle Schema — Add `task_assignees`, remove `assigneeId`

**Files:**
- Modify: `packages/server/src/db/schema/tasks.ts`

- [ ] **Step 1: Add `taskAssignees` table and update relations**

In `packages/server/src/db/schema/tasks.ts`:

Add the junction table after `taskWatchers`:

```ts
export const taskAssignees = pgTable("task_assignees", {
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
});
```

Remove `assigneeId` from the `tasks` table (line 18):
```ts
// DELETE this line:
assigneeId: uuid("assignee_id").references(() => users.id),
```

Update `taskRelations` — remove `assignee` relation, add `assignees`:
```ts
export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  workspace: one(workspaces, { fields: [tasks.workspaceId], references: [workspaces.id] }),
  status: one(workspaceStatuses, { fields: [tasks.statusId], references: [workspaceStatuses.id] }),
  // REMOVE: assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  reporter: one(users, { fields: [tasks.reporterId], references: [users.id] }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  parentTask: one(tasks, { fields: [tasks.parentId], references: [tasks.id], relationName: "subtasks" }),
  comments: many(comments),
  attachments: many(attachments),
  assignees: many(taskAssignees),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, { fields: [taskAssignees.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskAssignees.userId], references: [users.id] }),
}));
```

- [ ] **Step 2: Generate migration**

Run: `cd packages/server && bun run db:generate`
Expected: New migration file in `src/db/migrations/`

- [ ] **Step 3: Edit the generated migration to include data migration**

The auto-generated migration will create `task_assignees` and drop `assignee_id`. Edit the SQL to add data migration between those two operations:

```sql
-- After CREATE TABLE task_assignees, before ALTER TABLE tasks DROP assignee_id:

INSERT INTO task_assignees (task_id, user_id)
SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL;
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/db/schema/tasks.ts packages/server/src/db/migrations/
git commit -m "feat: add task_assignees junction table, remove single assignee_id from tasks"
```

---

### Task 2: Update Backend Service — Multi-assignee queries

**Files:**
- Modify: `packages/server/src/modules/task/task.service.ts`

- [ ] **Step 1: Update imports**

Add `taskAssignees` to the import from schema:

```ts
import { tasks, taskAssignees, taskWatchers, tags, taskTags, comments, attachments, workspaceStatuses, workspaces, users, projects } from '../../db/schema';
```

Add `inArray` to the drizzle-orm import:

```ts
import { eq, and, or, ilike, sql, desc, asc, count, isNull, lt, gte, lte, inArray } from 'drizzle-orm';
```

- [ ] **Step 2: Update `list()` method**

Replace the `list()` method. Remove `assigneeId`/`assigneeName` from select. After fetching task rows, batch-load assignees. Handle `assigneeId` filter via join.

```ts
async list(userId: string, userRole: GlobalRole, filters: TaskFilter = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filters.workspaceId) {
    conditions.push(eq(tasks.workspaceId, filters.workspaceId));
  }
  if (filters.projectId) {
    conditions.push(eq(tasks.projectId, filters.projectId));
  }
  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority as any));
  }
  if (filters.search) {
    conditions.push(ilike(tasks.title, `%${filters.search}%`));
  }
  if (filters.fiscalYear) {
    conditions.push(eq(tasks.fiscalYear, filters.fiscalYear));
  }

  conditions.push(isNull(tasks.parentId));

  const whereClause = and(...conditions);

  let dataQuery = db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      statusId: tasks.statusId,
      statusName: workspaceStatuses.name,
      statusColor: workspaceStatuses.color,
      workspaceId: tasks.workspaceId,
      workspaceName: workspaces.name,
      workspaceType: workspaces.type,
      projectId: tasks.projectId,
      projectName: projects.name,
      reporterId: tasks.reporterId,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      fiscalYear: tasks.fiscalYear,
      budget: tasks.budget,
      estimatedHours: tasks.estimatedHours,
      sortOrder: tasks.sortOrder,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
    .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .orderBy(desc(tasks.createdAt))
    .limit(pageSize)
    .offset(offset);

  // If filtering by assignee, join task_assignees
  if (filters.assigneeId) {
    dataQuery = dataQuery.innerJoin(
      taskAssignees,
      and(eq(taskAssignees.taskId, tasks.id), eq(taskAssignees.userId, filters.assigneeId))
    );
  }

  const [data, totalResult] = await Promise.all([
    dataQuery.where(whereClause),
    db.select({ total: count() }).from(tasks).where(whereClause),
  ]);

  // Batch-load assignees for all tasks
  const taskIds = data.map((t) => t.id);
  let assigneesByTask: Record<string, Array<{ userId: string; name: string }>> = {};
  if (taskIds.length > 0) {
    const assigneeRows = await db
      .select({
        taskId: taskAssignees.taskId,
        userId: taskAssignees.userId,
        name: users.name,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(inArray(taskAssignees.taskId, taskIds));

    for (const row of assigneeRows) {
      if (!assigneesByTask[row.taskId]) assigneesByTask[row.taskId] = [];
      assigneesByTask[row.taskId].push({ userId: row.userId, name: row.name });
    }
  }

  const total = totalResult[0]?.total || 0;
  return {
    data: data.map((t) => ({
      ...t,
      assignees: assigneesByTask[t.id] || [],
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
},
```

- [ ] **Step 3: Update `getById()` method**

Replace to fetch assignees separately:

```ts
async getById(taskId: string) {
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      statusId: tasks.statusId,
      statusName: workspaceStatuses.name,
      statusColor: workspaceStatuses.color,
      workspaceId: tasks.workspaceId,
      workspaceName: workspaces.name,
      projectId: tasks.projectId,
      projectName: projects.name,
      reporterId: tasks.reporterId,
      fiscalYear: tasks.fiscalYear,
      budget: tasks.budget,
      estimatedHours: tasks.estimatedHours,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      sortOrder: tasks.sortOrder,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
    .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) throw new NotFoundError('Task', taskId);

  let reporterName: string | null = null;
  if (task.reporterId) {
    const [reporter] = await db.select({ name: users.name }).from(users).where(eq(users.id, task.reporterId)).limit(1);
    reporterName = reporter?.name ?? null;
  }

  const assignees = await db
    .select({ userId: taskAssignees.userId, name: users.name })
    .from(taskAssignees)
    .innerJoin(users, eq(taskAssignees.userId, users.id))
    .where(eq(taskAssignees.taskId, taskId));

  return { ...task, reporterName, assignees };
},
```

- [ ] **Step 4: Update `create()` method**

Change `assigneeId` to `assigneeIds`:

```ts
async create(data: {
  title: string;
  description?: string;
  workspaceId: string;
  projectId?: string;
  statusId?: string;
  priority?: string;
  assigneeIds?: string[];
  reporterId: string;
  fiscalYear?: number;
  budget?: string;
  estimatedHours?: string;
  startDate?: string;
  dueDate?: string;
  parentId?: string;
  tagIds?: string[];
}) {
  const { assigneeIds, tagIds, ...taskData } = data;
  const [task] = await db
    .insert(tasks)
    .values({
      title: taskData.title,
      description: taskData.description,
      workspaceId: taskData.workspaceId,
      projectId: taskData.projectId,
      statusId: taskData.statusId,
      priority: (taskData.priority || 'normal') as any,
      reporterId: taskData.reporterId,
      fiscalYear: taskData.fiscalYear,
      budget: taskData.budget,
      estimatedHours: taskData.estimatedHours,
      startDate: taskData.startDate,
      dueDate: taskData.dueDate,
      parentId: taskData.parentId,
    })
    .returning();

  // Auto-add reporter as watcher
  await db.insert(taskWatchers).values({ taskId: task.id, userId: data.reporterId });

  // Add assignees
  if (assigneeIds?.length) {
    await db.insert(taskAssignees).values(
      assigneeIds.map((userId) => ({ taskId: task.id, userId }))
    );
  }

  // Add tags if provided
  if (tagIds?.length) {
    await db.insert(taskTags).values(tagIds.map((tagId) => ({ taskId: task.id, tagId })));
  }

  return this.getById(task.id);
},
```

- [ ] **Step 5: Update `update()` method**

Replace `assigneeId` with `assigneeIds`:

```ts
async update(taskId: string, data: {
  title?: string;
  description?: string;
  statusId?: string;
  priority?: string;
  assigneeIds?: string[];
  fiscalYear?: number;
  budget?: string;
  estimatedHours?: string;
  startDate?: string;
  dueDate?: string;
  sortOrder?: number;
}) {
  const existing = await this.getById(taskId);

  const { assigneeIds, ...updateData }: any = { ...data, updatedAt: new Date() };
  if (data.statusId) updateData.priority = data.priority as any;

  // If status changed to completed-like, set completedAt
  if (data.statusId && data.statusId !== existing.statusId) {
    const [newStatus] = await db.select().from(workspaceStatuses).where(eq(workspaceStatuses.id, data.statusId)).limit(1);
    if (newStatus?.name === 'เสร็จสิ้น' || newStatus?.name === 'สำเร็จ' || newStatus?.name === 'สรุปผล') {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
  }

  await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));

  // Replace assignees if provided
  if (assigneeIds !== undefined) {
    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
    if (assigneeIds.length > 0) {
      await db.insert(taskAssignees).values(
        assigneeIds.map((userId) => ({ taskId, userId }))
      );
    }
  }

  return this.getById(taskId);
},
```

- [ ] **Step 6: Update `delete()` method**

Add `taskAssignees` cleanup:

```ts
async delete(taskId: string) {
  await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
  await db.delete(taskWatchers).where(eq(taskWatchers.taskId, taskId));
  await db.delete(comments).where(eq(comments.taskId, taskId));
  await db.delete(attachments).where(eq(attachments.taskId, taskId));
  await db.delete(tasks).where(eq(tasks.parentId, taskId));
  await db.delete(tasks).where(eq(tasks.id, taskId));
  return { success: true };
},
```

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/modules/task/task.service.ts
git commit -m "feat: update task service to support multiple assignees"
```

---

### Task 3: Update Backend Controller

**Files:**
- Modify: `packages/server/src/modules/task/task.controller.ts`

- [ ] **Step 1: Update create and update methods**

No structural changes needed in the controller since it passes `body` through to the service. The body now contains `assigneeIds` instead of `assigneeId`. The existing pass-through code works as-is.

However, verify the `list` controller passes `assigneeId` filter correctly (it does — line 8 passes `query.assigneeId` which the service uses to join `task_assignees`).

No code changes needed in this file. The controller is a thin pass-through layer.

- [ ] **Step 2: Commit** (skip if no changes)

No changes needed.

---

### Task 4: Update Frontend Types

**Files:**
- Modify: `packages/web/src/types/index.ts`

- [ ] **Step 1: Update Task interface**

Replace `assigneeId` with `assignees` array:

```ts
export interface TaskAssignee {
  userId: string;
  name: string;
}

export interface Task {
  id: string;
  projectId?: string;
  workspaceId: string;
  parentId?: string;
  title: string;
  description?: string;
  statusId?: string;
  priority: TaskPriority;
  assignees: TaskAssignee[];  // replaces assigneeId
  reporterId: string;
  fiscalYear?: number;
  budget?: string;
  estimatedHours?: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  sortOrder: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/types/index.ts
git commit -m "feat: update Task type to use assignees array"
```

---

### Task 5: Update TaskForm — Multi-select assignees

**Files:**
- Modify: `packages/web/src/components/task/TaskForm.vue`

- [ ] **Step 1: Update form model**

Change `assigneeId` to `assigneeIds` array:

```ts
// In formValue ref, replace:
assigneeId: null as string | null,
// With:
assigneeIds: [] as string[],
```

In `loadTask()`, populate `assigneeIds` from task data:

```ts
// Replace:
assigneeId: task.assigneeId || null,
// With:
assigneeIds: (task as any).assignees?.map((a: any) => a.userId) || [],
```

In the watch on `workspaceId`, reset `assigneeIds`:

```ts
// Replace:
formValue.value.assigneeId = null;
// With:
formValue.value.assigneeIds = [];
```

In the reset block inside the `show` watcher:

```ts
// Replace:
assigneeId: null,
// With:
assigneeIds: [],
```

- [ ] **Step 2: Update template — NSelect with multiple**

Replace the assignee NSelect:

```html
<!-- Replace the assignee NFormItem with: -->
<NFormItem label="ผู้รับผิดชอบ">
  <NSelect v-model:value="formValue.assigneeIds" :options="memberOptions" placeholder="เลือกผู้รับผิดชอบ"
    multiple clearable filterable />
</NFormItem>
```

- [ ] **Step 3: Update submit body**

In `handleSubmit()`, replace:

```ts
// Replace:
assigneeId: formValue.value.assigneeId || undefined,
// With:
assigneeIds: formValue.value.assigneeIds?.length ? formValue.value.assigneeIds : undefined,
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/task/TaskForm.vue
git commit -m "feat: update TaskForm to support multi-select assignees"
```

---

### Task 6: Update TaskCard — Show multiple assignees

**Files:**
- Modify: `packages/web/src/components/task/TaskCard.vue`

- [ ] **Step 1: Update props**

Replace `assigneeName` with `assignees`:

```ts
defineProps<{
  id: string
  title: string
  priority: TaskPriority
  statusName?: string
  statusColor?: string
  workspaceName?: string
  assignees?: Array<{ userId: string; name: string }>
  dueDate?: string
  startDate?: string
  description?: string
}>()
```

- [ ] **Step 2: Update template**

Replace the single assignee display with multi-assignee:

```html
<!-- Replace the assignee meta-item with: -->
<template v-if="assignees?.length">
  <span class="meta-item">
    <span class="meta-icon">👤</span>
    {{ assignees.length === 1 ? assignees[0].name : `${assignees[0].name} +${assignees.length - 1}` }}
  </span>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/task/TaskCard.vue
git commit -m "feat: update TaskCard to display multiple assignees"
```

---

### Task 7: Update TaskKanban — Pass assignees to TaskCard

**Files:**
- Modify: `packages/web/src/components/task/TaskKanban.vue`

- [ ] **Step 1: Update TaskCard prop in template**

Replace `:assignee-name` with `:assignees`:

```html
<!-- Replace: -->
:assignee-name="task.assigneeName"
<!-- With: -->
:assignees="task.assignees"
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/task/TaskKanban.vue
git commit -m "feat: update TaskKanban to pass assignees array to TaskCard"
```

---

### Task 8: Update TaskList — Show assignee names in table

**Files:**
- Modify: `packages/web/src/components/task/TaskList.vue`

- [ ] **Step 1: Update the assignee column render**

Replace the 'มอบหมาย' column:

```ts
{
  title: 'มอบหมาย',
  key: 'assignees',
  width: 180,
  render(row: any) {
    if (!row.assignees?.length) return '—'
    const names = row.assignees.map((a: any) => a.name).join(', ')
    return h('span', { style: 'font-size: 0.85rem' }, names)
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/task/TaskList.vue
git commit -m "feat: update TaskList table to show multiple assignee names"
```

---

### Task 9: Update TaskDetail — Show multiple assignees

**Files:**
- Modify: `packages/web/src/components/task/TaskDetail.vue`

- [ ] **Step 1: Update assignee display**

Replace the single assignee description item:

```html
<!-- Replace: -->
<NDescriptionsItem label="ผู้รับผิดชอบ">
  {{ (task as any).assigneeName || '—' }}
</NDescriptionsItem>

<!-- With: -->
<NDescriptionsItem label="ผู้รับผิดชอบ">
  <NSpace v-if="(task as any).assignees?.length" size="small" align="center">
    <span v-for="a in (task as any).assignees" :key="a.userId">{{ a.name }}</span>
  </NSpace>
  <span v-else>—</span>
</NDescriptionsItem>
```

Ensure `NSpace` is in the imports (it already is on line 6).

- [ ] **Step 2: Update handleCopy to use assignees**

In `handleCopy()`, replace:

```ts
// Replace:
assigneeName: (task.value as any).assigneeName,
// With:
assigneeName: (task.value as any).assignees?.map((a: any) => a.name).join(', '),
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/task/TaskDetail.vue
git commit -m "feat: update TaskDetail to display multiple assignees"
```

---

### Task 10: Update CopySummary — Use assignees array

**Files:**
- Modify: `packages/web/src/composables/useClipboard.ts`

- [ ] **Step 1: Update `formatTaskShort` and `formatTaskFull`**

Both functions accept `assigneeName?: string`. The caller (TaskDetail) now joins names with commas, so no change needed in the composable itself.

Verify the CopySummary component — it receives `task` prop with `assigneeName` field. The caller in TaskDetail now passes the joined string, so no changes needed.

- [ ] **Step 2: Commit** (skip if no changes)

No changes needed.

---

### Task 11: Verify build

**Files:** None

- [ ] **Step 1: Run backend type check**

Run: `cd packages/server && bunx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run frontend build**

Run: `cd packages/web && bun run build`
Expected: Build succeeds

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve type errors from multi-assignee migration"
```
