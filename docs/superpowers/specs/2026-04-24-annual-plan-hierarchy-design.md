# Annual Operational Plan — Schema Redesign

**Date:** 2026-04-24
**Status:** Draft

---

## 1. Overview

ระบบแผนปฏิบัติรายปี (Annual Operational Plan) สำหรับ อุทยานเทคโนโลยี มีโครงสร้างลำดับชั้น 4 ระดับ:

| ระดับ | ชื่อ | คำอธิบาย |
|-------|------|---------|
| 1 | Annual Plan | ปีงบประมาณ (ปี พ.ศ.) |
| 2 | Strategy | หมวดยุทธศาสตร์ — สร้างได้ไม่จำกัด |
| 3 | Goal | หมวดเป้าประสงค์ — Sub ของ Strategy |
| 4 | Indicator | ตัวชี้วัด — Sub ของ Goal |

ผู้รับผิดชอบอยู่ที่ระดับ Indicator (หลายคนต่อตัวชี้วัด)

---

## 2. Database Schema

### 2.1 ตารางหลัก

```sql
strategies
├── id: uuid (PK)
├── planId: uuid (FK → annual_plans)
├── code: varchar(10) — auto-generated "S1", "S2"
├── name: varchar(255)
├── description: text
├── sortOrder: integer
└── timestamps (createdAt, updatedAt)

goals
├── id: uuid (PK)
├── strategyId: uuid (FK → strategies)
├── code: varchar(20) — auto-generated "S1-G1", "S1-G2"
├── name: varchar(255)
├── description: text
├── sortOrder: integer
└── timestamps

indicators
├── id: uuid (PK)
├── goalId: uuid (FK → goals)
├── code: varchar(30) — auto-generated "S1-G1-K01"
├── name: varchar(500)
├── description: text
├── targetValue: decimal(15,2)
├── unit: varchar(50)
├── indicatorType: enum (amount | count | percentage)
├── weight: decimal(5,2)
├── sortOrder: integer
└── timestamps

indicator_assignees (Junction)
├── id: uuid (PK)
├── indicatorId: uuid (FK → indicators)
└── userId: uuid (FK → users)

indicator_updates
├── id: uuid (PK)
├── indicatorId: uuid (FK → indicators)
├── reportedDate: timestamp — วันที่อัปเดต (เก็บเต็ม คำนวณ period ตอน report)
├── reportedValue: decimal(15,2)
├── progressPct: decimal(5,2) — คำนวณจาก targetValue
├── note: text
├── evidenceUrl: varchar(500)
├── reportedBy: uuid (FK → users)
└── createdAt: timestamp
```

### 2.2 Auto-code Generation

| ระดับ | รูปแบบ | ตัวอย่าง |
|-------|--------|---------|
| Strategy | `S{n}` | `S1`, `S2` |
| Goal | `{strategyCode}-G{n}` | `S1-G1`, `S1-G2` |
| Indicator | `{goalCode}-K{n}` | `S1-G1-K01` |

Code regenerate ได้เมื่อมีการ reorder

---

## 3. API Endpoints

```
GET    /api/annual-plans/:planId/strategies
POST   /api/annual-plans/:planId/strategies
PATCH  /api/strategies/:id
DELETE /api/strategies/:id

GET    /api/strategies/:strategyId/goals
POST   /api/strategies/:strategyId/goals
PATCH  /api/goals/:id
DELETE /api/goals/:id

GET    /api/goals/:goalId/indicators
POST   /api/goals/:goalId/indicators
PATCH  /api/indicators/:id
DELETE /api/indicators/:id

POST   /api/indicators/:id/updates
GET    /api/indicators/:id/updates

GET    /api/indicators/:id/assignees
POST   /api/indicators/:id/assignees
DELETE /api/indicators/:id/assignees/:userId

GET    /api/reports/plan-progress
```

### Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 4. Report Aggregation Logic

เก็บ `reportedDate` (timestamp) เอาไว้เลย คำนวณ period ตอน report:

- **รายสัปดาห์:** ใช้ ISO week number
- **รายเดือน:** extract month from date
- **รายไตรมาส:** Q1=ต.ค.-ธ.ค., Q2=ม.ค.-มี.ค., Q3=เม.ย.-มิ.ย., Q4=ก.ค.-ก.ย.
- **รายปี:** ปี พ.ศ.

ถ้ามีหลายอัปเดตในช่วงเดียวกัน → ใช้ update ล่าสุด

---

## 5. Module Structure

```
packages/server/src/modules/plan/
├── controller.ts
├── service.ts
├── plugin.ts
├── types.ts
└── schemas.ts

packages/server/src/db/schema/
├── strategies.ts      # NEW
├── goals.ts          # NEW
├── indicators.ts     # modify existing
└── indicator-updates.ts # modify existing
```

---

## 6. Frontend Components

```
packages/web/src/components/plan/
├── PlanDashboard.vue
├── strategy/
│   ├── StrategyList.vue
│   ├── StrategyForm.vue
│   └── StrategyCard.vue
├── goal/
│   ├── GoalList.vue
│   ├── GoalForm.vue
│   └── GoalCard.vue
├── indicator/
│   ├── IndicatorList.vue
│   ├── IndicatorForm.vue
│   └── IndicatorCard.vue
├── IndicatorUpdateForm.vue
├── IndicatorChart.vue
└── ProgressReport.vue
```

---

## 7. Dependencies

- ECharts (already in use)
- Thai date utils (already exist)
- Drizzle ORM (already in use)
- RBAC / auth middleware (already exist)
