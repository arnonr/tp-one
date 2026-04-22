# Multi-Assignee for Tasks — Design Spec

**Date:** 2026-04-21
**Status:** Approved

## Problem

Tasks currently support only one assignee (`assignee_id` FK on `tasks`). Real work often involves multiple responsible persons.

## Decision

Replace the single `assignee_id` column with a many-to-many junction table `task_assignees`, following the existing pattern of `task_tags` and `task_watchers`. All assignees are equal — no primary/secondary distinction.

## Database Changes

### New Table: `task_assignees`

| Column  | Type | Constraints |
|---------|------|-------------|
| task_id | uuid | FK → tasks.id, NOT NULL |
| user_id | uuid | FK → users.id, NOT NULL |

Primary key: `(task_id, user_id)`

### Remove

- Column `assignee_id` from `tasks` table
- Relation `assignee` from `taskRelations`

### Add

- Table `taskAssignees` in schema
- Relations: `taskAssigneesRelations` with `task` and `user` references
- Add `assignees` to `taskRelations` as `many(taskAssignees)`

## Backend Changes

### Schema (`packages/server/src/db/schema/tasks.ts`)

```ts
export const taskAssignees = pgTable("task_assignees", {
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
});
```

Remove `assigneeId` field from `tasks` table definition and `assignee` from `taskRelations`.

### Service (`task.service.ts`)

**list():**
- Remove `assigneeId`/`assigneeName` from select
- After fetching tasks, batch-load assignees from `task_assignees` joined with `users`
- Add each task's `assignees: Array<{ userId, name }>`
- Filter `?assigneeId=X`: join `task_assignees` in WHERE clause using `inArray` subquery

**getById():**
- Fetch assignees separately: `select from task_assignees join users where taskId = ?`
- Return `assignees` array instead of `assigneeId`/`assigneeName`

**create():**
- Accept `assigneeIds?: string[]` instead of `assigneeId?: string`
- After inserting task, insert rows into `task_assignees`

**update():**
- Accept `assigneeIds?: string[]` instead of `assigneeId?: string`
- If `assigneeIds` provided: delete existing, insert new (replace-all pattern, same as `setTaskTags`)

**delete():**
- Add `delete taskAssignees where taskId = ?` before deleting task

### Controller (`task.controller.ts`)

- create: pass `assigneeIds` from body
- update: pass `assigneeIds` from body

## Frontend Changes

### TaskForm.vue

- `assigneeId: null` → `assigneeIds: [] as string[]`
- `NSelect` for assignee: add `multiple` prop
- Reset `assigneeIds` to `[]` on workspace change
- Submit: send `assigneeIds` array instead of `assigneeId`
- Edit mode: populate `assigneeIds` from `task.assignees.map(a => a.userId)`

### TaskCard.vue / TaskList.vue / TaskKanban.vue / TaskDetail.vue

- Display multiple avatars/names instead of single assignee
- Show "2+ คน" summary where space is limited

## Migration Strategy

Single migration that:
1. Creates `task_assignees` table
2. Migrates existing `assignee_id` data: `INSERT INTO task_assignees (task_id, user_id) SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL`
3. Drops `assignee_id` column from `tasks`

## API Response Format Change

Before:
```json
{ "assigneeId": "uuid", "assigneeName": "สมชาย" }
```

After:
```json
{ "assignees": [{ "userId": "uuid", "name": "สมชาย" }, { "userId": "uuid", "name": "สมหญิง" }] }
```
