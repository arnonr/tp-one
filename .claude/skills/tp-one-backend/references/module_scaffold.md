# TP-One Module Scaffolding Reference

## สร้าง Module ใหม่ — Checklist

เมื่อต้องสร้าง feature ใหม่ เช่น `my-work`:

### 1. Schema (ถ้าต้องมีตารางใหม่)

ไฟล์: `src/db/schema/{feature}.ts`

```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const quickNotes = pgTable('quick_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  convertedToTaskId: uuid('converted_to_task_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const quickNoteRelations = relations(quickNotes, ({ one }) => ({
  user: one(users, { fields: [quickNotes.userId], references: [users.id] }),
  convertedTask: one(tasks, { fields: [quickNotes.convertedToTaskId], references: [tasks.id] }),
}))
```

อย่าลืม:
- Export จาก `schema/index.ts`
- `bun run db:generate` → ตรวจ SQL → `bun run db:migrate`

### 2. Service

ไฟล์: `src/modules/{feature}/{feature}.service.ts`

```typescript
import { db } from '../../config/database'
import { quickNotes } from '../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { NotFoundError } from '../../shared/errors'

export const QuickNoteService = {
  async list(userId: string, status?: string) {
    const conditions = [eq(quickNotes.userId, userId)]
    if (status) conditions.push(eq(quickNotes.status, status))

    return db.select().from(quickNotes)
      .where(and(...conditions))
      .orderBy(desc(quickNotes.createdAt))
  },

  async create(userId: string, content: string) {
    const [note] = await db.insert(quickNotes).values({ userId, content }).returning()
    return note
  },

  async delete(id: string, userId: string) {
    const [note] = await db.select().from(quickNotes).where(eq(quickNotes.id, id)).limit(1)
    if (!note) throw new NotFoundError('QuickNote', id)
    if (note.userId !== userId) throw new ForbiddenError()
    await db.delete(quickNotes).where(eq(quickNotes.id, id))
  },
}
```

### 3. Controller

ไฟล์: `src/modules/{feature}/{feature}.controller.ts`

```typescript
import { QuickNoteService } from './quick-note.service'

export const QuickNoteController = {
  async list(user: JwtPayload, status?: string) {
    const data = await QuickNoteService.list(user.userId, status)
    return { success: true, data }
  },

  async create(user: JwtPayload, body: { content: string }) {
    const data = await QuickNoteService.create(user.userId, body.content)
    return { success: true, data }
  },

  async delete(user: JwtPayload, id: string) {
    await QuickNoteService.delete(id, user.userId)
    return { success: true }
  },
}
```

### 4. Plugin (Routes)

ไฟล์: `src/modules/{feature}/{feature}.plugin.ts`

```typescript
import Elysia from 'elysia'
import { QuickNoteController } from './quick-note.controller'
import { authMiddleware } from '../../middleware/auth.middleware'

export const quickNotePlugin = new Elysia({ prefix: '/api/quick-notes' })
  .onBeforeHandle(authMiddleware())
  .get('/', async ({ query, user }) => QuickNoteController.list(user, query.status))
  .post('/', async ({ body, user }) => QuickNoteController.create(user, body as any))
  .delete('/:id', async ({ params: { id }, user }) => QuickNoteController.delete(user, id))
```

### 5. Register Plugin

ไฟล์: `src/index.ts`

```typescript
import { quickNotePlugin } from './modules/quick-note/quick-note.plugin'

const app = new Elysia()
  .use(authPlugin)
  .use(workspacePlugin)
  .use(taskPlugin)
  .use(quickNotePlugin)  // ← เพิ่ม
```

### 6. Test

ไฟล์: `tests/modules/{feature}/{feature}.service.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

describe('QuickNoteService', () => {
  it('creates a note', async () => { ... })
  it('lists user notes only', async () => { ... })
  it('deletes own note', async () => { ... })
  it('cannot delete others note', async () => { ... })
})
```
