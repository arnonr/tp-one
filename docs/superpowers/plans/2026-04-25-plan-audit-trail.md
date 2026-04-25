# Plan Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audit trail for indicator changes — track every create/update/delete, allow admin revert, and export to Excel.

**Architecture:** Follow existing KPI audit pattern (`kpi-audit-logs.ts` + `project.service.ts`). New schema table, extend plan service/controller/plugin, new frontend component.

**Tech Stack:** Drizzle ORM, ExcelJS (already installed), ElysiaJS, Vue 3 + Naive UI

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/server/src/db/schema/plan-indicator-audit-logs.ts` | Create | Audit log table definition |
| `packages/server/src/db/schema/index.ts` | Modify | Export new schema |
| `packages/server/src/modules/plan/types.ts` | Modify | Add audit-related types |
| `packages/server/src/modules/plan/plan.service.ts` | Modify | Add audit logging + query/revert/export methods |
| `packages/server/src/modules/plan/plan.controller.ts` | Modify | Add 3 route handlers |
| `packages/server/src/modules/plan/plan.plugin.ts` | Modify | Add 3 routes |
| `packages/web/src/types/plan.ts` | Modify | Add frontend audit types |
| `packages/web/src/services/planApi.ts` | Modify | Add 3 API calls |
| `packages/web/src/components/plan/indicator/IndicatorAuditLog.vue` | Create | Audit timeline component |
| `packages/web/src/components/plan/indicator/IndicatorCard.vue` | Modify | Add audit toggle button |

---

### Task 1: Database Schema

**Files:**
- Create: `packages/server/src/db/schema/plan-indicator-audit-logs.ts`
- Modify: `packages/server/src/db/schema/index.ts`

- [ ] **Step 1: Create the audit log schema file**

Create `packages/server/src/db/schema/plan-indicator-audit-logs.ts`:

```typescript
import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { indicators } from './indicators';
import { users } from './users';

export const planAuditActionEnum = pgEnum('plan_audit_action', [
  'created',
  'updated',
  'deleted',
  'reverted',
]);

export const planIndicatorAuditLogs = pgTable('plan_indicator_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicatorId: uuid('indicator_id').references(() => indicators.id).notNull(),
  changedBy: uuid('changed_by').references(() => users.id).notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  action: planAuditActionEnum('action').notNull(),
  fieldName: varchar('field_name', { length: 50 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  reason: text('reason'),
}, (table) => [
  index('idx_plan_audit_indicator').on(table.indicatorId),
  index('idx_plan_audit_changed_at').on(table.changedAt),
]);
```

- [ ] **Step 2: Export from schema index**

Add to `packages/server/src/db/schema/index.ts`:

```typescript
export * from "./plan-indicator-audit-logs";
```

- [ ] **Step 3: Generate and run migration**

Run: `cd packages/server && bun run db:generate`
Then: `cd packages/server && bun run db:migrate`

- [ ] **Step 4: Verify migration**

Run: `cd packages/server && bun run db:studio` — check `plan_indicator_audit_logs` table exists with correct columns.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/db/schema/plan-indicator-audit-logs.ts packages/server/src/db/schema/index.ts packages/server/src/db/migrations/
git commit -m "feat: add plan_indicator_audit_logs schema and migration"
```

---

### Task 2: Backend Types

**Files:**
- Modify: `packages/server/src/modules/plan/types.ts`

- [ ] **Step 1: Add audit-related types**

Append to `packages/server/src/modules/plan/types.ts`:

```typescript
// ===== Audit Trail =====

export interface IndicatorAuditLogEntry {
  id: string;
  indicatorId: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  action: 'created' | 'updated' | 'deleted' | 'reverted';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface RevertInput {
  auditLogId: string;
  reason: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd packages/server && bunx tsc --noEmit --pretty false 2>&1 | head -20`

Expected: No new errors (existing errors are acceptable).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/modules/plan/types.ts
git commit -m "feat: add audit trail types for plan indicators"
```

---

### Task 3: Service — Audit Logging in CRUD Methods

**Files:**
- Modify: `packages/server/src/modules/plan/plan.service.ts`

This task adds audit log writes to the existing `createIndicator`, `updateIndicator`, and `deleteIndicator` methods. The methods currently do not accept a `userId` parameter — we need to add it.

- [ ] **Step 1: Add import for audit schema**

At the top of `plan.service.ts`, add `planIndicatorAuditLogs` to the import from `../../db/schema`:

```typescript
import {
  annualPlans, strategies, goals, indicators,
  indicatorUpdates, indicatorAssignees,
  planIndicatorAuditLogs,
} from '../../db/schema';
```

Also add `SQL` import if not present:

```typescript
import { eq, and, desc, asc, count, inArray, sql } from 'drizzle-orm';
```

- [ ] **Step 2: Modify createIndicator to log audit**

Change `createIndicator` signature to accept `createdById: string` and add audit log:

```typescript
async createIndicator(goalId: string, data: CreateIndicatorInput, createdById: string) {
  await resolveGoal(goalId);
  if (!data.name?.trim()) throw new ValidationError('name is required');
  if (!data.targetValue?.trim()) throw new ValidationError('targetValue is required');

  const code = await generateIndicatorCode(goalId);
  const [indicator] = await db
    .insert(indicators)
    .values({
      goalId,
      code,
      name: data.name.trim(),
      description: data.description?.trim(),
      targetValue: data.targetValue,
      unit: data.unit,
      indicatorType: (data.indicatorType as any) ?? 'amount',
      weight: data.weight ?? '1',
      sortOrder: data.sortOrder ?? 0,
    })
    .returning();

  await db.insert(planIndicatorAuditLogs).values({
    indicatorId: indicator.id,
    changedBy: createdById,
    action: 'created',
    newValue: JSON.stringify({
      name: indicator.name,
      description: indicator.description,
      targetValue: indicator.targetValue,
      unit: indicator.unit,
      indicatorType: indicator.indicatorType,
      weight: indicator.weight,
      sortOrder: indicator.sortOrder,
    }),
  });

  return indicator;
},
```

- [ ] **Step 3: Modify updateIndicator to log audit**

Change `updateIndicator` to accept `updatedById: string`, fetch current values, diff, and log:

```typescript
async updateIndicator(indicatorId: string, data: UpdateIndicatorInput, updatedById: string) {
  const current = await resolveIndicator(indicatorId);

  const updates: Record<string, unknown> = {
    ...(data.name !== undefined && { name: data.name.trim() }),
    ...(data.description !== undefined && { description: data.description?.trim() }),
    ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
    ...(data.unit !== undefined && { unit: data.unit }),
    ...(data.indicatorType !== undefined && { indicatorType: data.indicatorType as any }),
    ...(data.weight !== undefined && { weight: data.weight }),
    ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(indicators)
    .set(updates)
    .where(eq(indicators.id, indicatorId))
    .returning();

  const trackableFields = ['name', 'description', 'targetValue', 'unit', 'indicatorType', 'weight', 'sortOrder'] as const;
  const auditEntries = trackableFields
    .filter((field) => data[field as keyof UpdateIndicatorInput] !== undefined)
    .map((field) => ({
      indicatorId,
      changedBy: updatedById,
      action: 'updated' as const,
      fieldName: field,
      oldValue: String(current[field as keyof typeof current] ?? ''),
      newValue: String(updated[field as keyof typeof updated] ?? ''),
    }));

  if (auditEntries.length > 0) {
    await db.insert(planIndicatorAuditLogs).values(auditEntries);
  }

  return updated;
},
```

- [ ] **Step 4: Modify deleteIndicator to log audit**

Change `deleteIndicator` to accept `deletedById: string` and log before deletion:

```typescript
async deleteIndicator(indicatorId: string, deletedById: string) {
  const indicator = await resolveIndicator(indicatorId);

  await db.insert(planIndicatorAuditLogs).values({
    indicatorId,
    changedBy: deletedById,
    action: 'deleted',
    oldValue: JSON.stringify({
      name: indicator.name,
      description: indicator.description,
      targetValue: indicator.targetValue,
      unit: indicator.unit,
      indicatorType: indicator.indicatorType,
      weight: indicator.weight,
      sortOrder: indicator.sortOrder,
    }),
  });

  await db.delete(indicatorUpdates).where(eq(indicatorUpdates.indicatorId, indicatorId));
  await db.delete(indicatorAssignees).where(eq(indicatorAssignees.indicatorId, indicatorId));
  await db.delete(indicators).where(eq(indicators.id, indicatorId));
  return { success: true };
},
```

- [ ] **Step 5: Update controller calls to pass userId**

In `plan.controller.ts`, update the three indicator methods to pass `user.id`:

`createIndicator` (line ~168):
```typescript
const { planService } = await import('./plan.service');
return planService.createIndicator(goalId!, body, user.id);
```

`updateIndicator` (line ~179):
```typescript
const { planService } = await import('./plan.service');
return planService.updateIndicator(indicatorId!, body, user.id);
```

`deleteIndicator` (line ~188):
```typescript
const { planService } = await import('./plan.service');
return planService.deleteIndicator(indicatorId!, user.id);
```

- [ ] **Step 6: Verify build**

Run: `cd packages/server && bunx tsc --noEmit --pretty false 2>&1 | head -20`

Expected: No new errors related to plan module.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/modules/plan/plan.service.ts packages/server/src/modules/plan/plan.controller.ts
git commit -m "feat: add audit logging to plan indicator CRUD operations"
```

---

### Task 4: Service — Audit Query, Revert, and Export Methods

**Files:**
- Modify: `packages/server/src/modules/plan/plan.service.ts`

- [ ] **Step 1: Add import for ExcelJS**

At the top of `plan.service.ts`:

```typescript
import ExcelJS from 'exceljs';
```

- [ ] **Step 2: Add getIndicatorAuditLogs method**

Add after the existing `createIndicatorUpdate` method, in the `// Update tracking` section:

```typescript
async getIndicatorAuditLogs(indicatorId: string, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [logs, [{ count: total }]] = await Promise.all([
    db
      .select({
        id: planIndicatorAuditLogs.id,
        indicatorId: planIndicatorAuditLogs.indicatorId,
        changedBy: planIndicatorAuditLogs.changedBy,
        changedByName: users.name,
        changedAt: planIndicatorAuditLogs.changedAt,
        action: planIndicatorAuditLogs.action,
        fieldName: planIndicatorAuditLogs.fieldName,
        oldValue: planIndicatorAuditLogs.oldValue,
        newValue: planIndicatorAuditLogs.newValue,
        reason: planIndicatorAuditLogs.reason,
      })
      .from(planIndicatorAuditLogs)
      .leftJoin(users, eq(planIndicatorAuditLogs.changedBy, users.id))
      .where(eq(planIndicatorAuditLogs.indicatorId, indicatorId))
      .orderBy(desc(planIndicatorAuditLogs.changedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(planIndicatorAuditLogs)
      .where(eq(planIndicatorAuditLogs.indicatorId, indicatorId)),
  ]);

  return {
    data: logs,
    total: Number(total),
    page,
    pageSize,
    totalPages: Math.ceil(Number(total) / pageSize),
  };
},
```

- [ ] **Step 3: Add revertIndicator method**

```typescript
async revertIndicator(indicatorId: string, userId: string, auditLogId: string, reason: string) {
  const indicator = await resolveIndicator(indicatorId);

  const [auditLog] = await db
    .select()
    .from(planIndicatorAuditLogs)
    .where(and(
      eq(planIndicatorAuditLogs.id, auditLogId),
      eq(planIndicatorAuditLogs.indicatorId, indicatorId),
    ))
    .limit(1);
  if (!auditLog) throw new NotFoundError('Audit log', auditLogId);

  const revertData: Record<string, unknown> = {};
  if (auditLog.fieldName && auditLog.oldValue !== null) {
    revertData[auditLog.fieldName] = auditLog.oldValue;
  } else if (!auditLog.fieldName && auditLog.oldValue) {
    const oldValues = JSON.parse(auditLog.oldValue);
    if (oldValues.name !== undefined) revertData.name = oldValues.name;
    if (oldValues.targetValue !== undefined) revertData.targetValue = oldValues.targetValue;
    if (oldValues.unit !== undefined) revertData.unit = oldValues.unit;
    if (oldValues.description !== undefined) revertData.description = oldValues.description;
    if (oldValues.indicatorType !== undefined) revertData.indicatorType = oldValues.indicatorType;
    if (oldValues.weight !== undefined) revertData.weight = oldValues.weight;
    if (oldValues.sortOrder !== undefined) revertData.sortOrder = oldValues.sortOrder;
  }

  if (Object.keys(revertData).length === 0) {
    throw new ValidationError('Nothing to revert');
  }

  const [updated] = await db
    .update(indicators)
    .set({ ...revertData, updatedAt: new Date() } as any)
    .where(eq(indicators.id, indicatorId))
    .returning();

  await db.insert(planIndicatorAuditLogs).values({
    indicatorId,
    changedBy: userId,
    action: 'reverted',
    oldValue: JSON.stringify({
      name: indicator.name,
      targetValue: indicator.targetValue,
      unit: indicator.unit,
      description: indicator.description,
    }),
    newValue: JSON.stringify(revertData),
    reason,
  });

  return updated;
},
```

- [ ] **Step 4: Add exportAuditLogs method**

```typescript
async exportAuditLogs(indicatorId: string): Promise<Buffer> {
  const logs = await db
    .select({
      changedAt: planIndicatorAuditLogs.changedAt,
      changedByName: users.name,
      action: planIndicatorAuditLogs.action,
      fieldName: planIndicatorAuditLogs.fieldName,
      oldValue: planIndicatorAuditLogs.oldValue,
      newValue: planIndicatorAuditLogs.newValue,
      reason: planIndicatorAuditLogs.reason,
    })
    .from(planIndicatorAuditLogs)
    .leftJoin(users, eq(planIndicatorAuditLogs.changedBy, users.id))
    .where(eq(planIndicatorAuditLogs.indicatorId, indicatorId))
    .orderBy(desc(planIndicatorAuditLogs.changedAt));

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Audit Log');

  ws.columns = [
    { header: 'วันที่', key: 'date', width: 18 },
    { header: 'ผู้เปลี่ยนแปลง', key: 'user', width: 20 },
    { header: 'การกระทำ', key: 'action', width: 14 },
    { header: 'ฟิลด์', key: 'field', width: 16 },
    { header: 'ค่าเดิม', key: 'oldVal', width: 30 },
    { header: 'ค่าใหม่', key: 'newVal', width: 30 },
    { header: 'เหตุผล', key: 'reason', width: 30 },
  ];

  const actionLabels: Record<string, string> = {
    created: 'สร้าง',
    updated: 'แก้ไข',
    deleted: 'ลบ',
    reverted: 'กู้คืน',
  };

  const fieldLabels: Record<string, string> = {
    name: 'ชื่อ',
    description: 'รายละเอียด',
    targetValue: 'ค่าเป้าหมาย',
    unit: 'หน่วย',
    indicatorType: 'ประเภท',
    weight: 'น้ำหนัก',
    sortOrder: 'ลำดับ',
  };

  const buddhistYear = (d: Date) => {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  };

  for (const log of logs) {
    ws.addRow({
      date: buddhistYear(new Date(log.changedAt)),
      user: log.changedByName ?? '-',
      action: actionLabels[log.action] ?? log.action,
      field: log.fieldName ? (fieldLabels[log.fieldName] ?? log.fieldName) : '-',
      oldVal: log.oldValue ?? '-',
      newVal: log.newValue ?? '-',
      reason: log.reason ?? '-',
    });
  }

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
},
```

- [ ] **Step 5: Verify build**

Run: `cd packages/server && bunx tsc --noEmit --pretty false 2>&1 | head -20`

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/modules/plan/plan.service.ts
git commit -m "feat: add audit query, revert, and export methods to plan service"
```

---

### Task 5: Backend — Controller & Plugin Routes

**Files:**
- Modify: `packages/server/src/modules/plan/plan.controller.ts`
- Modify: `packages/server/src/modules/plan/plan.plugin.ts`

- [ ] **Step 1: Add controller handlers**

In `plan.controller.ts`, add after the existing `createIndicatorUpdate` method, before `// Reports`:

```typescript
// Indicator Audit Trail

async getIndicatorAuditLogs(
  _user: { id: string; role: GlobalRole },
  params: Record<string, string>,
  query: Record<string, string>,
) {
  const { indicatorId } = parseParams(params);
  const { planService } = await import('./plan.service');
  return planService.getIndicatorAuditLogs(
    indicatorId!,
    query.page ? parseInt(query.page) : 1,
    query.pageSize ? parseInt(query.pageSize) : 20,
  );
},

async revertIndicator(
  user: { id: string; role: GlobalRole },
  params: Record<string, string>,
  body: { auditLogId: string; reason: string },
) {
  const { indicatorId } = parseParams(params);
  const { planService } = await import('./plan.service');
  return planService.revertIndicator(indicatorId!, user.id, body.auditLogId, body.reason);
},

async exportAuditLogs(
  _user: { id: string; role: GlobalRole },
  params: Record<string, string>,
) {
  const { indicatorId } = parseParams(params);
  const { planService } = await import('./plan.service');
  const buffer = await planService.exportAuditLogs(indicatorId!);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=indicator-audit-log.xlsx',
    },
  });
},
```

Also update the type import at the top to include the new types:

```typescript
import type {
  CreateStrategyInput, UpdateStrategyInput,
  CreateGoalInput, UpdateGoalInput,
  CreateIndicatorInput, UpdateIndicatorInput,
  CreateIndicatorUpdateInput,
} from './types';
```

(No change needed if these are already imported — just verify.)

- [ ] **Step 2: Add plugin routes**

In `plan.plugin.ts`, add after the Indicator Updates section (after line ~90) and before `// Reports`:

```typescript
// Indicator Audit Trail
.get('/indicators/:indicatorId/audit-logs', async ({ user, params, query }) => planController.getIndicatorAuditLogs(user, params, query as any), {
  detail: { summary: 'Get indicator audit history' },
})
.post('/indicators/:indicatorId/revert', async ({ user, params, body }) => planController.revertIndicator(user, params, body as any), {
  detail: { summary: 'Revert indicator to previous state (admin)' },
})
.get('/indicators/:indicatorId/audit-logs/export', async ({ user, params }) => planController.exportAuditLogs(user, params), {
  detail: { summary: 'Export indicator audit log to Excel' },
})
```

- [ ] **Step 3: Verify build**

Run: `cd packages/server && bunx tsc --noEmit --pretty false 2>&1 | head -20`

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/modules/plan/plan.controller.ts packages/server/src/modules/plan/plan.plugin.ts
git commit -m "feat: add audit trail API routes for plan indicators"
```

---

### Task 6: Frontend — Types & API Service

**Files:**
- Modify: `packages/web/src/types/plan.ts`
- Modify: `packages/web/src/services/planApi.ts`

- [ ] **Step 1: Add frontend audit types**

Append to `packages/web/src/types/plan.ts`:

```typescript
// ===== Audit Trail =====

export interface IndicatorAuditLogEntry {
  id: string;
  indicatorId: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  action: 'created' | 'updated' | 'deleted' | 'reverted';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface IndicatorAuditLogResponse {
  data: IndicatorAuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

- [ ] **Step 2: Add API service functions**

Append to `packages/web/src/services/planApi.ts`:

```typescript
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
```

Also add `IndicatorAuditLogEntry` and `IndicatorAuditLogResponse` to the import at the top of the file if needed (they're used via inline import in the code above).

- [ ] **Step 3: Verify frontend build**

Run: `cd packages/web && bunx vue-tsc --noEmit --pretty false 2>&1 | head -20`

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/types/plan.ts packages/web/src/services/planApi.ts
git commit -m "feat: add frontend audit trail types and API service"
```

---

### Task 7: Frontend — IndicatorAuditLog Component

**Files:**
- Create: `packages/web/src/components/plan/indicator/IndicatorAuditLog.vue`

- [ ] **Step 1: Create the audit log component**

Create `packages/web/src/components/plan/indicator/IndicatorAuditLog.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NTimeline, NTimelineItem, NTag, NButton, NIcon, NSpin,
  NModal, NInput, NForm, NFormItem, NSpace, NText, NPagination,
} from 'naive-ui'
import { RefreshOutline, DownloadOutline } from '@vicons/ionicons5'
import type { IndicatorAuditLogEntry } from '@/types/plan'
import { getIndicatorAuditLogs, revertIndicator, exportIndicatorAuditLogs } from '@/services/planApi'

const props = defineProps<{
  indicatorId: string
  isAdmin: boolean
}>()

const emit = defineEmits<{
  reverted: []
}>()

const logs = ref<IndicatorAuditLogEntry[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showRevertModal = ref(false)
const revertTarget = ref<IndicatorAuditLogEntry | null>(null)
const revertReason = ref('')
const reverting = ref(false)

const actionLabels: Record<string, string> = {
  created: 'สร้าง',
  updated: 'แก้ไข',
  deleted: 'ลบ',
  reverted: 'กู้คืน',
}

const actionColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  created: 'success',
  updated: 'warning',
  deleted: 'error',
  reverted: 'info',
}

const fieldLabels: Record<string, string> = {
  name: 'ชื่อ',
  description: 'รายละเอียด',
  targetValue: 'ค่าเป้าหมาย',
  unit: 'หน่วย',
  indicatorType: 'ประเภท',
  weight: 'น้ำหนัก',
  sortOrder: 'ลำดับ',
}

async function fetchLogs() {
  loading.value = true
  try {
    const res = await getIndicatorAuditLogs(props.indicatorId, page.value, pageSize.value)
    logs.value = res.data
    total.value = res.total
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function formatBuddhistDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function handleRevertClick(entry: IndicatorAuditLogEntry) {
  revertTarget.value = entry
  revertReason.value = ''
  showRevertModal.value = true
}

async function confirmRevert() {
  if (!revertTarget.value || !revertReason.value.trim()) return
  reverting.value = true
  try {
    await revertIndicator(props.indicatorId, revertTarget.value.id, revertReason.value.trim())
    showRevertModal.value = false
    emit('reverted')
    await fetchLogs()
  } catch {
    // ignore
  } finally {
    reverting.value = false
  }
}

async function handleExport() {
  try {
    await exportIndicatorAuditLogs(props.indicatorId)
  } catch {
    // ignore
  }
}

function handlePageChange(p: number) {
  page.value = p
  fetchLogs()
}

onMounted(fetchLogs)
</script>

<template>
  <div class="audit-log">
    <div class="audit-log-header">
      <NText strong>ประวัติการเปลี่ยนแปลง</NText>
      <NSpace :size="8">
        <NButton size="tiny" quaternary @click="handleExport">
          <template #icon><NIcon><DownloadOutline /></NIcon></template>
          ส่งออก Excel
        </NButton>
        <NButton size="tiny" quaternary @click="fetchLogs">
          <template #icon><NIcon><RefreshOutline /></NIcon></template>
        </NButton>
      </NSpace>
    </div>

    <NSpin :show="loading">
      <NTimeline v-if="logs.length > 0" size="small">
        <NTimelineItem
          v-for="entry in logs"
          :key="entry.id"
          :type="actionColors[entry.action] ?? 'default'"
        >
          <div class="audit-entry">
            <div class="audit-meta">
              <NTag :type="actionColors[entry.action]" size="small" :bordered="false">
                {{ actionLabels[entry.action] }}
              </NTag>
              <NText depth="3" class="audit-time">{{ formatBuddhistDate(entry.changedAt) }}</NText>
              <NText depth="2">โดย {{ entry.changedByName ?? '-' }}</NText>
            </div>
            <div v-if="entry.fieldName" class="audit-detail">
              <NText depth="3">{{ fieldLabels[entry.fieldName] ?? entry.fieldName }}:</NText>
              <NText>{{ entry.oldValue ?? '-' }} → {{ entry.newValue ?? '-' }}</NText>
            </div>
            <div v-if="entry.reason" class="audit-reason">
              <NText depth="3">เหตุผล: {{ entry.reason }}</NText>
            </div>
            <NButton
              v-if="isAdmin && entry.action !== 'deleted'"
              size="tiny"
              type="warning"
              quaternary
              @click="handleRevertClick(entry)"
              style="margin-top: 4px"
            >
              กู้คืน
            </NButton>
          </div>
        </NTimelineItem>
      </NTimeline>
      <NText v-else-if="!loading" depth="3">ยังไม่มีประวัติการเปลี่ยนแปลง</NText>
    </NSpin>

    <NPagination
      v-if="total > pageSize"
      :page="page"
      :page-size="pageSize"
      :item-count="total"
      size="small"
      @update:page="handlePageChange"
      style="margin-top: 12px"
    />

    <NModal v-model:show="showRevertModal" preset="dialog" title="กู้คืนข้อมูล">
      <NForm>
        <NFormItem label="เหตุผลที่กู้คืน">
          <NInput
            v-model:value="revertReason"
            type="textarea"
            placeholder="ระบุเหตุผล..."
            :rows="3"
          />
        </NFormItem>
      </NForm>
      <template #action>
        <NSpace>
          <NButton @click="showRevertModal = false">ยกเลิก</NButton>
          <NButton type="warning" :loading="reverting" :disabled="!revertReason.trim()" @click="confirmRevert">
            กู้คืน
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.audit-log {
  padding: 8px 0;
}
.audit-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.audit-entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.audit-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.audit-time {
  font-size: 12px;
}
.audit-detail {
  font-size: 13px;
  display: flex;
  gap: 4px;
}
.audit-reason {
  font-size: 12px;
  font-style: italic;
}
</style>
```

- [ ] **Step 2: Verify component builds**

Run: `cd packages/web && bunx vue-tsc --noEmit --pretty false 2>&1 | head -20`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/plan/indicator/IndicatorAuditLog.vue
git commit -m "feat: add IndicatorAuditLog component with timeline, revert, and export"
```

---

### Task 8: Frontend — Integrate Audit into IndicatorCard

**Files:**
- Modify: `packages/web/src/components/plan/indicator/IndicatorCard.vue`

- [ ] **Step 1: Add audit toggle to IndicatorCard**

In `IndicatorCard.vue`, add the following changes:

**Imports** — add `IndicatorAuditLog` import:
```typescript
import IndicatorAuditLog from './IndicatorAuditLog.vue'
```

**Add `showAudit` ref:**
```typescript
const showAudit = ref(false)
```

**Add `isAdmin` computed** (or receive as prop):
```typescript
// Check if user is admin from auth store
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')
```

**Add `reverted` emit:**
```typescript
const emit = defineEmits<{
  edit: [indicatorId: string]
  delete: [indicatorId: string]
  addUpdate: [indicatorId: string]
  reverted: []
}>()
```

**Add audit toggle button** in the template's `<NSpace>` action buttons area (next to the chart toggle):
```html
<NButton size="tiny" quaternary @click="showAudit = !showAudit">
  <template #icon><NIcon><TimeOutline /></NIcon></template>
</NButton>
```

Add `TimeOutline` to the ionicons5 import.

**Add the audit component** at the bottom of the `<NCard>`, after the chart section:
```html
<IndicatorAuditLog
  v-if="showAudit"
  :indicator-id="indicator.id"
  :is-admin="isAdmin"
  @reverted="emit('reverted')"
/>
```

- [ ] **Step 2: Wire the `reverted` event up the component chain**

Check if `IndicatorCard` is used in `GoalList.vue` or `GoalCard.vue` — add `@reverted` listener there and propagate it up through `StrategyCard` → `StrategyList` → `PlanDetailView` so the indicator data refreshes after revert.

The event chain should be: `IndicatorCard` → `GoalList` → `GoalCard` → `StrategyCard` → `StrategyList` → `PlanDetailView`

At each level, add the `reverted` emit declaration and forward it:
```typescript
emit('reverted')
```

In `PlanDetailView`, the handler should re-fetch the strategies list:
```typescript
function handleReverted() {
  // Re-fetch to refresh indicator data
  fetchPlanDetail()
}
```

- [ ] **Step 3: Verify full frontend build**

Run: `cd packages/web && bun run build`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/plan/indicator/IndicatorCard.vue packages/web/src/components/plan/goal/ packages/web/src/components/plan/strategy/ packages/web/src/views/PlanDetailView.vue
git commit -m "feat: integrate audit trail into indicator card with event propagation"
```

---

### Task 9: Manual Smoke Test

- [ ] **Step 1: Start dev environment**

Run: `bun run dev`

- [ ] **Step 2: Create an indicator**

1. Navigate to a plan → strategy → goal
2. Create a new indicator
3. Verify: indicator appears in list

- [ ] **Step 3: Update the indicator**

1. Edit the indicator (change name and target value)
2. Click the audit toggle button (clock icon)
3. Verify: audit timeline shows "สร้าง" and "แก้ไข" entries
4. Verify: dates are in พ.ศ. format

- [ ] **Step 4: Test revert (admin)**

1. Click "กู้คืน" on an entry
2. Enter reason in modal
3. Confirm
4. Verify: indicator values restored, new "กู้คืน" entry appears

- [ ] **Step 5: Test Excel export**

1. Click "ส่งออก Excel"
2. Verify: .xlsx file downloads
3. Open file and verify columns: วันที่ (พ.ศ.), ผู้เปลี่ยนแปลง, การกระทำ, ฟิลด์, ค่าเดิม, ค่าใหม่, เหตุผล

- [ ] **Step 6: Test delete**

1. Delete the indicator
2. Verify: last audit entry shows "ลบ" action
3. Verify: "กู้คืน" button is NOT shown on deleted entries

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete Task 7.4 Plan Audit Trail"
```
