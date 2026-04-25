# Plan Audit Trail — Design Spec

**Task:** 7.4 — Plan Audit Trail
**Scope:** Indicator-level audit logging only (Plan → Strategy → Goal → **Indicator**)

## Requirements

- `plan_indicator_audit_logs` table
- Every indicator change tracked (create, update, delete)
- Revert capability (admin only, single-entry revert)
- Export audit log to Excel (.xlsx)

## Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Audit scope | Indicator only | Task requirement specifies `plan_indicator_audit_logs` |
| Revert type | Single-entry | Simpler, matches existing KPI audit pattern |
| Export format | Excel (.xlsx) | Standard for government reporting |
| UI location | PlanDetailView | Inline with indicator cards, no separate page |
| Architecture | Follow KPI audit pattern | Proven pattern, codebase consistency |

---

## Section 1: Database Schema

**File:** `packages/server/src/db/schema/plan-indicator-audit-logs.ts`

```
plan_indicator_audit_logs
├── id (uuid PK, defaultRandom)
├── indicatorId (FK → indicators.id, NOT NULL)
├── changedBy (FK → users.id, NOT NULL)
├── changedAt (timestamp with timezone, defaultNow)
├── action (enum: created | updated | deleted | reverted)
├── fieldName (varchar 50, nullable) — null for created/deleted
├── oldValue (text, nullable) — JSON snapshot, null for created
├── newValue (text, nullable) — JSON snapshot, null for deleted
└── reason (text, nullable) — required for revert
```

**Pattern:** Identical to `kpi-audit-logs.ts` but references `indicators` table instead of `projectKpis`.

---

## Section 2: Backend Service Layer

**File:** `packages/server/src/modules/plan/plan.service.ts`

### Audit logging in existing methods

- `createIndicator()` — log action `created`, newValue = JSON snapshot of initial values
- `updateIndicator()` — log action `updated`, diff each changed field (fieldName, oldValue, newValue)
- `deleteIndicator()` — log action `deleted`, oldValue = JSON snapshot before deletion

### New methods

- `getIndicatorAuditLogs(indicatorId, { page, pageSize })` — paginated audit history with user info via leftJoin
- `revertIndicator(auditLogId, userId, reason)` — restore indicator to previous state (admin only)

### Revert logic

1. Fetch audit log entry by ID
2. Validate: only `created` or `updated` entries can be reverted (not `deleted`)
3. Parse oldValue JSON back to object
4. Update indicator with old values
5. Log action `reverted` with reason

---

## Section 3: Backend API Routes

**File:** `packages/server/src/modules/plan/plan.plugin.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plans/indicators/:indicatorId/audit-logs` | staff+ | Paginated audit history |
| POST | `/plans/indicators/:indicatorId/revert` | admin only | Revert to previous state |
| GET | `/plans/indicators/:indicatorId/audit-logs/export` | staff+ | Export as .xlsx |

### Request/Response

```
GET /audit-logs?page=1&pageSize=20
→ { success: true, data: AuditLogEntry[], total, page, pageSize, totalPages }

POST /revert
→ body: { auditLogId: string, reason: string }
→ { success: true, data: updatedIndicator }

GET /audit-logs/export
→ Binary xlsx (Content-Disposition: attachment; filename=indicator-audit-log.xlsx)
```

### Excel columns

วันที่ (พ.ศ.), ผู้เปลี่ยนแปลง, การกระทำ, ฟิลด์, ค่าเดิม, ค่าใหม่, เหตุผล

---

## Section 4: Frontend UI

### New component

**File:** `packages/web/src/components/plan/indicator/IndicatorAuditLog.vue`

- Timeline list of audit entries (newest first)
- Each entry: date (พ.ศ.), user, action badge (color-coded), field → old → new
- Revert button (admin only) → confirm modal with reason input
- Export button → triggers .xlsx download

### Modified files

- `planApi.ts` — add `getAuditLogs()`, `revertIndicator()`, `exportAuditLogs()`
- `IndicatorCard.vue` — add "ประวัติการเปลี่ยนแปลง" toggle button
- `PlanDetailView.vue` — wire events for audit log display

### Naive UI components used

`NTimeline`, `NTimelineItem`, `NTag`, `NButton`, `NModal`, `NInput`

---

## Files Changed Summary

| File | Action |
|------|--------|
| `packages/server/src/db/schema/plan-indicator-audit-logs.ts` | New |
| `packages/server/src/db/schema/index.ts` | Modify (export new schema) |
| `packages/server/src/modules/plan/plan.service.ts` | Modify (add audit logging + 2 new methods) |
| `packages/server/src/modules/plan/plan.controller.ts` | Modify (add 3 route handlers) |
| `packages/server/src/modules/plan/plan.plugin.ts` | Modify (add 3 routes) |
| `packages/server/src/modules/plan/types.ts` | Modify (add audit types) |
| `packages/web/src/services/planApi.ts` | Modify (add 3 API calls) |
| `packages/web/src/components/plan/indicator/IndicatorAuditLog.vue` | New |
| `packages/web/src/components/plan/indicator/IndicatorCard.vue` | Modify (add audit toggle) |
| `packages/web/src/views/PlanDetailView.vue` | Modify (wire events) |
