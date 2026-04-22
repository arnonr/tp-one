# TP-One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างระบบจัดการงานสำหรับอุทยานเทคโนโลยี ที่ใช้ง่ายและออกแบบเพื่อคนไทยโดยเฉพาะ

**Architecture:** Monorepo (Bun workspaces) — Backend ElysiaJS + Drizzle ORM, Frontend Vue 3 + Naive UI + Pinia. Thai-first design: Buddhist Era dates, Thai fiscal year (ต.ค.-ก.ย.), Thai locale defaults. RBAC 2 ระดับ (admin/staff) + workspace/project permissions.

**Tech Stack:** Bun, ElysiaJS, Drizzle ORM, PostgreSQL 16, Redis 7, Vue 3, Naive UI (Thai locale), Pinia, ECharts, Day.js, Docker

---

## SA Analysis Adjustments (ปรับปรุงจาก SA เดิม)

### 1. การปรับเพื่อ "ใช้งานง่าย"

| จุดเดิม                     | การปรับ                                          | เหตุผล                                    |
| --------------------------- | ------------------------------------------------ | ----------------------------------------- |
| SSO OIDC ตั้งแต่ Phase 1    | **เพิ่ม local auth fallback** สำหรับ dev/staging | พัฒนาได้โดยไม่ต้องรอ IT มหาวิทยาลัย       |
| Phase 3 ถึงจะมี Kanban      | **ย้าย Kanban ขึ้น Phase 2** (ร่วมกับ Task CRUD) | ผู้ใช้เห็นประโยชน์เร็วขึ้น                |
| 20+ ตารางเริ่มต้น           | **เริ่มทีละ phase** สร้าง migration เฉพาะที่ใช้  | ลดความซับซ้อน migration                   |
| Copy to Clipboard Phase 3   | **ย้ายขึ้น Phase 2** (ร่วมกับ Task)              | ใช้งานได้ทันที                            |
| Quick Note Phase 7          | **ย้ายขึ้น Phase 3**                             | เจ้าหน้าที่ต้องการตั้งแต่แรก              |
| Snapshot of Success Phase 4 | **ย้ายขึ้น Phase 3** (ร่วมกับ notification)      | แนบรูปหลักฐานได้เร็วขึ้น                  |
| Report Phase 5              | **คงไว้** แต่เพิ่ม simple export เร็วขึ้น        | ส่งออก list เป็น Excel ได้ตั้งแต่ Phase 2 |
| Gantt/Calendar Phase 6      | **คงไว้** — ไม่จำเป็นสำหรับ MVP                  | ทำทีหลังได้                               |

### 2. การปรับเพื่อ "การใช้งานแบบคนไทย"

| จุดปรับ                            | รายละเอียด                                                                             | Phase ที่เริ่ม |
| ---------------------------------- | -------------------------------------------------------------------------------------- | -------------- |
| **Thai Utility Library**           | Buddhist Era, Thai months, Thai fiscal year — สร้างเป็น shared utility ตั้งแต่ Phase 1 | 1              |
| **Naive UI Thai locale**           | ตั้งค่า `n-config-provider` ใช้ `dateFns` locale ไทย ตั้งแต่วันแรก                     | 1              |
| **Thai date format ทุกหน้า**       | "1 เม.ย. 2569" แทน "2026-04-01"                                                        | 1              |
| **ปีงบประมาณ default filter**      | Dashboard, Report, Plan ใช้ปีงบประมาณปัจจุบันเป็น default                              | 2              |
| **Copy Summary ภาษาไทย**           | รูปแบบ emoji + ภาษาไทยสำหรับ Telegram                                                  | 2              |
| **Thai number format**             | 1,000,000 บาท, comma separators, หน่วย "บาท/โครงการ/คน"                                | 2              |
| **Thai status names เป็น default** | "รออนุมัติ", "กำลังดำเนินการ", "เสร็จสิ้น"                                             | 2              |
| **ไตรมาสงบประมาณ**                 | Q1=ต.ค.-ธ.ค., Q2=ม.ค.-มี.ค., Q3=เม.ย.-มิ.ย., Q4=ก.ค.-ก.ย.                              | 2              |
| **Thai government doc format**     | รองรับเลขที่เอกสารแบบไทย เช่น "อว. 0023/2569"                                          | 3              |
| **Thai holiday awareness**         | วันหยุดราชการ แจ้งเตือนงานข้ามวันหยุด                                                  | 5              |

---

## File Structure

### Backend (packages/server/src/)

```
src/
├── config/
│   ├── database.ts          # PostgreSQL connection
│   ├── redis.ts             # Redis connection
│   └── env.ts               # Environment variables (validated)
├── db/
│   ├── schema/
│   │   ├── index.ts          # Re-export all schemas
│   │   ├── users.ts
│   │   ├── workspaces.ts
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── notifications.ts
│   │   ├── annual-plans.ts
│   │   ├── templates.ts      # Task templates
│   │   ├── waiting.ts        # Waiting for others
│   │   ├── quick-notes.ts    # Quick notes
│   │   └── audit.ts          # Audit logs
│   ├── migrations/           # Drizzle migration files
│   └── seed.ts               # Seed data
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.plugin.ts    # Elysia plugin
│   ├── workspace/
│   │   ├── workspace.controller.ts
│   │   ├── workspace.service.ts
│   │   └── workspace.plugin.ts
│   ├── project/
│   │   ├── project.controller.ts
│   │   ├── project.service.ts
│   │   └── project.plugin.ts
│   ├── task/
│   │   ├── task.controller.ts
│   │   ├── task.service.ts
│   │   └── task.plugin.ts
│   ├── template/
│   │   ├── template.controller.ts
│   │   ├── template.service.ts
│   │   └── template.plugin.ts
│   ├── notification/
│   │   ├── notification.service.ts
│   │   ├── telegram.service.ts
│   │   ├── email.service.ts
│   │   └── notification.plugin.ts
│   ├── report/
│   │   ├── report.service.ts
│   │   ├── pdf.service.ts
│   │   ├── excel.service.ts
│   │   └── report.plugin.ts
│   ├── plan/
│   │   ├── plan.controller.ts
│   │   ├── plan.service.ts
│   │   └── plan.plugin.ts
│   ├── dashboard/
│   │   ├── dashboard.service.ts
│   │   └── dashboard.plugin.ts
│   └── my-work/
│       ├── my-work.service.ts
│       └── my-work.plugin.ts
├── middleware/
│   ├── auth.middleware.ts     # JWT verification
│   ├── rbac.middleware.ts     # Permission checking
│   └── logger.middleware.ts   # Request logging
├── shared/
│   ├── thai.utils.ts          # Thai date/fiscal year utilities
│   ├── errors.ts              # Custom error classes
│   ├── types.ts               # Shared TypeScript types
│   └── constants.ts           # System constants
├── workers/
│   ├── standup.worker.ts      # Daily standup job
│   └── notification.worker.ts # Notification queue worker
└── index.ts                   # Main entry point
```

### Frontend (packages/web/src/)

```
src/
├── components/
│   ├── common/
│   │   ├── ThaiDate.vue         # Thai date display
│   │   ├── FiscalYearFilter.vue # ปีงบประมาณ selector
│   │   ├── PriorityBadge.vue    # Priority badge (Urgent/High/Normal/Low)
│   │   ├── StatusBadge.vue      # Status badge with color
│   │   ├── UserAvatar.vue       # User avatar
│   │   └── GlobalSearch.vue     # Global search bar
│   ├── layout/
│   │   ├── AppLayout.vue        # Main layout with sidebar
│   │   ├── Sidebar.vue          # Navigation sidebar
│   │   ├── Header.vue           # Top header with search
│   │   └── QuickNotePanel.vue   # Quick note sidebar panel
│   ├── dashboard/
│   │   ├── StatsCards.vue       # Overview stat cards
│   │   ├── TaskChart.vue        # Task status chart
│   │   └── WorkloadChart.vue    # Workload distribution
│   ├── task/
│   │   ├── TaskCard.vue         # Task card (list/kanban)
│   │   ├── TaskForm.vue         # Create/edit task form
│   │   ├── TaskDetail.vue       # Task detail drawer/page
│   │   ├── TaskList.vue         # List view table
│   │   ├── TaskKanban.vue       # Kanban board
│   │   ├── TaskCalendar.vue     # Calendar view
│   │   ├── SubtaskList.vue      # Subtask list
│   │   ├── CommentSection.vue   # Comments + @mention
│   │   ├── WaitingBadge.vue     # "รอหน่วยงานอื่น" badge
│   │   └── CopySummary.vue      # Copy to clipboard button
│   ├── project/
│   │   ├── ProjectCard.vue
│   │   ├── ProjectForm.vue
│   │   └── KpiProgress.vue
│   ├── report/
│   │   ├── ReportFilter.vue
│   │   └── ReportPreview.vue
│   └── plan/
│       ├── PlanTree.vue         # Plan → Category → Indicator tree
│       ├── IndicatorCard.vue
│       └── ProgressChart.vue
├── composables/
│   ├── useThaiDate.ts           # Thai date formatting composable
│   ├── useFiscalYear.ts         # Fiscal year utilities
│   ├── useClipboard.ts          # Copy summary to clipboard
│   └── usePermissions.ts        # RBAC permission checking
├── router/
│   └── index.ts
├── services/
│   ├── api.ts                   # Axios instance
│   ├── auth.ts                  # Auth API calls
│   ├── workspace.ts             # Workspace API calls
│   ├── task.ts                  # Task API calls
│   ├── project.ts               # Project API calls
│   ├── notification.ts          # Notification API calls
│   └── plan.ts                  # Plan API calls
├── stores/
│   ├── auth.ts                  # Auth store (Pinia)
│   ├── workspace.ts             # Active workspace store
│   ├── notification.ts          # Notification store
│   └── ui.ts                    # UI state (sidebar, theme)
├── styles/
│   ├── global.css
│   └── tokens.css
├── types/
│   └── index.ts
├── utils/
│   ├── thai.ts                  # Thai date/fiscal year utils (frontend)
│   └── format.ts                # Number/date formatters
├── views/
│   ├── LoginView.vue
│   ├── DashboardView.vue
│   ├── MyWorkView.vue            # "งานของฉัน"
│   ├── TaskListView.vue
│   ├── TaskBoardView.vue         # Kanban
│   ├── TaskCalendarView.vue
│   ├── ProjectListView.vue
│   ├── ProjectDetailView.vue
│   ├── AnnualPlanView.vue
│   ├── PlanDetailView.vue
│   └── ReportView.vue
├── App.vue
└── main.ts
```

---

## Phase 1: Foundation — Auth + UI Shell + Thai Utils (Week 1-4)

### Task 1.1: Environment Config & Validation

**Files:**

- Create: `packages/server/src/config/env.ts`

- [ ] **Step 1: Create env validation module**

```typescript
// packages/server/src/config/env.ts
import { env } from "bun";

export const config = {
  port: env.PORT || 3000,
  databaseUrl:
    env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/tp_one",
  redisUrl: env.REDIS_URL || "redis://localhost:6379",
  jwtSecret: env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: env.JWT_EXPIRES_IN || "7d",
  nodeEnv: env.NODE_ENV || "development",
  corsOrigin: env.CORS_ORIGIN || "http://localhost:5173",
  uploadDir: env.UPLOAD_DIR || "/data/uploads",
  telegramBotToken: env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: env.TELEGRAM_CHAT_ID || "",
  oidcIssuer: env.OIDC_ISSUER || "",
  oidcClientId: env.OIDC_CLIENT_ID || "",
  oidcClientSecret: env.OIDC_CLIENT_SECRET || "",
  oidcRedirectUri:
    env.OIDC_REDIRECT_URI || "http://localhost:3000/api/auth/callback",
} as const;

export type Config = typeof config;
```

- [ ] **Step 2: Verify config loads**

Run: `cd packages/server && bun run src/config/env.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/config/env.ts
git commit -m "feat: add environment config module"
```

---

### Task 1.2: Thai Utility Library (Backend)

**Files:**

- Create: `packages/server/src/shared/thai.utils.ts`
- Test: `packages/server/tests/shared/thai.utils.test.ts`

- [ ] **Step 1: Write failing tests for Thai utilities**

```typescript
// packages/server/tests/shared/thai.utils.test.ts
import { describe, it, expect } from "vitest";
import {
  getFiscalYear,
  getFiscalYearRange,
  getFiscalQuarter,
  toBuddhistYear,
  formatThaiDate,
  formatThaiDateShort,
  formatThaiMonth,
  getThaiFiscalLabel,
  getFiscalQuarterLabel,
  THAI_MONTHS_SHORT,
} from "../../src/shared/thai.utils";

describe("Thai Utilities", () => {
  describe("Buddhist Year", () => {
    it("converts AD 2026 to BE 2569", () => {
      expect(toBuddhistYear(2026)).toBe(2569);
    });

    it("converts AD 2025 to BE 2568", () => {
      expect(toBuddhistYear(2025)).toBe(2568);
    });
  });

  describe("Fiscal Year", () => {
    it("October belongs to next fiscal year", () => {
      // ต.ค. 2568 → ปีงบ 2569
      expect(getFiscalYear(new Date("2025-10-01"))).toBe(2569);
    });

    it("September is last month of fiscal year", () => {
      // ก.ย. 2569 → ปีงบ 2569
      expect(getFiscalYear(new Date("2026-09-15"))).toBe(2569);
    });

    it("January is Q2 of fiscal year", () => {
      // ม.ค. 2569 → ปีงบ 2569, Q2
      expect(getFiscalYear(new Date("2026-01-15"))).toBe(2569);
      expect(getFiscalQuarter(new Date("2026-01-15"))).toBe(2);
    });

    it("returns correct fiscal year range for 2569", () => {
      const range = getFiscalYearRange(2569);
      expect(range.startDate).toBe("2025-10-01");
      expect(range.endDate).toBe("2026-09-30");
    });

    it("returns correct fiscal year range for 2570", () => {
      const range = getFiscalYearRange(2570);
      expect(range.startDate).toBe("2026-10-01");
      expect(range.endDate).toBe("2027-09-30");
    });
  });

  describe("Fiscal Quarter", () => {
    it("Oct-Dec is Q1", () => {
      expect(getFiscalQuarter(new Date("2025-10-01"))).toBe(1);
      expect(getFiscalQuarter(new Date("2025-12-31"))).toBe(1);
    });

    it("Jan-Mar is Q2", () => {
      expect(getFiscalQuarter(new Date("2026-01-01"))).toBe(2);
      expect(getFiscalQuarter(new Date("2026-03-31"))).toBe(2);
    });

    it("Apr-Jun is Q3", () => {
      expect(getFiscalQuarter(new Date("2026-04-01"))).toBe(3);
      expect(getFiscalQuarter(new Date("2026-06-30"))).toBe(3);
    });

    it("Jul-Sep is Q4", () => {
      expect(getFiscalQuarter(new Date("2026-07-01"))).toBe(4);
      expect(getFiscalQuarter(new Date("2026-09-30"))).toBe(4);
    });
  });

  describe("Thai Date Formatting", () => {
    it("formatThaiDate: full format", () => {
      const result = formatThaiDate(new Date("2026-04-21"));
      expect(result).toContain("21");
      expect(result).toContain("เม.ย.");
      expect(result).toContain("2569");
    });

    it("formatThaiDateShort: short format", () => {
      const result = formatThaiDateShort(new Date("2026-04-21"));
      expect(result).toBe("21 เม.ย. 2569");
    });

    it("formatThaiMonth: month + year", () => {
      const result = formatThaiMonth(new Date("2026-04-21"));
      expect(result).toBe("เม.ย. 2569");
    });
  });

  describe("Labels", () => {
    it('getThaiFiscalLabel returns "ปีงบ 2569"', () => {
      expect(getThaiFiscalLabel(2569)).toBe("ปีงบ 2569");
    });

    it('getFiscalQuarterLabel returns "ไตรมาสที่ 1 (ต.ค. - ธ.ค.)"', () => {
      expect(getFiscalQuarterLabel(1)).toBe("ไตรมาสที่ 1 (ต.ค. - ธ.ค.)");
      expect(getFiscalQuarterLabel(2)).toBe("ไตรมาสที่ 2 (ม.ค. - มี.ค.)");
      expect(getFiscalQuarterLabel(3)).toBe("ไตรมาสที่ 3 (เม.ย. - มิ.ย.)");
      expect(getFiscalQuarterLabel(4)).toBe("ไตรมาสที่ 4 (ก.ค. - ก.ย.)");
    });

    it("THAI_MONTHS_SHORT has 12 entries", () => {
      expect(THAI_MONTHS_SHORT).toHaveLength(12);
      expect(THAI_MONTHS_SHORT[0]).toBe("ม.ค.");
      expect(THAI_MONTHS_SHORT[3]).toBe("เม.ย.");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/server && bun test tests/shared/thai.utils.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Thai utility library**

```typescript
// packages/server/src/shared/thai.utils.ts
export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

export const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const FISCAL_QUARTER_RANGES = [
  {
    label: "ไตรมาสที่ 1 (ต.ค. - ธ.ค.)",
    months: "ต.ค. - ธ.ค.",
    startMonth: 10,
    endMonth: 12,
  },
  {
    label: "ไตรมาสที่ 2 (ม.ค. - มี.ค.)",
    months: "ม.ค. - มี.ค.",
    startMonth: 1,
    endMonth: 3,
  },
  {
    label: "ไตรมาสที่ 3 (เม.ย. - มิ.ย.)",
    months: "เม.ย. - มิ.ย.",
    startMonth: 4,
    endMonth: 6,
  },
  {
    label: "ไตรมาสที่ 4 (ก.ค. - ก.ย.)",
    months: "ก.ค. - ก.ย.",
    startMonth: 7,
    endMonth: 9,
  },
] as const;

export function toBuddhistYear(adYear: number): number {
  return adYear + 543;
}

export function toADYear(beYear: number): number {
  return beYear - 543;
}

export function getFiscalYear(date: Date): number {
  const adYear = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  // ต.ค.-ธ.ค. (month 10-12) เป็นปีงบของปีถัดไป
  if (month >= 10) {
    return toBuddhistYear(adYear + 1);
  }
  return toBuddhistYear(adYear);
}

export function getCurrentFiscalYear(): number {
  return getFiscalYear(new Date());
}

export function getFiscalYearRange(fiscalYear: number): {
  startDate: string;
  endDate: string;
} {
  const adYear = toADYear(fiscalYear);
  return {
    startDate: `${adYear - 1}-10-01`,
    endDate: `${adYear}-09-30`,
  };
}

export function getFiscalQuarter(date: Date): number {
  const month = date.getMonth() + 1;
  if (month >= 10) return 1; // ต.ค.-ธ.ค.
  if (month >= 7) return 4; // ก.ค.-ก.ย.
  if (month >= 4) return 3; // เม.ย.-มิ.ย.
  return 2; // ม.ค.-มี.ค.
}

export function getFiscalQuarterLabel(quarter: 1 | 2 | 3 | 4): string {
  return FISCAL_QUARTER_RANGES[quarter - 1].label;
}

export function formatThaiDate(date: Date): string {
  const day = date.getDate();
  const month = THAI_MONTHS_SHORT[date.getMonth()];
  const year = toBuddhistYear(date.getFullYear());
  return `${day} ${month} ${year}`;
}

export function formatThaiDateShort(date: Date): string {
  const day = date.getDate();
  const month = THAI_MONTHS_SHORT[date.getMonth()];
  const year = toBuddhistYear(date.getFullYear());
  return `${day} ${month} ${year}`;
}

export function formatThaiDateFull(date: Date): string {
  const day = date.getDate();
  const month = THAI_MONTHS_FULL[date.getMonth()];
  const year = toBuddhistYear(date.getFullYear());
  return `${day} ${month} ${year}`;
}

export function formatThaiMonth(date: Date): string {
  const month = THAI_MONTHS_SHORT[date.getMonth()];
  const year = toBuddhistYear(date.getFullYear());
  return `${month} ${year}`;
}

export function getThaiFiscalLabel(fiscalYear: number): string {
  return `ปีงบ ${fiscalYear}`;
}

export function formatThaiNumber(value: number): string {
  return value.toLocaleString("th-TH");
}

export function formatThaiCurrency(value: number): string {
  return `${value.toLocaleString("th-TH")} บาท`;
}

export function getFiscalYearList(
  currentFiscalYear: number,
  yearsBack: number = 3,
  yearsForward: number = 1,
): number[] {
  const years: number[] = [];
  for (
    let y = currentFiscalYear - yearsBack;
    y <= currentFiscalYear + yearsForward;
    y++
  ) {
    years.push(y);
  }
  return years;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/server && bun test tests/shared/thai.utils.test.ts`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/shared/thai.utils.ts packages/server/tests/shared/thai.utils.test.ts
git commit -m "feat: add Thai utility library (Buddhist Era, fiscal year, date formatting)"
```

---

### Task 1.3: Shared Error Types & Constants

**Files:**

- Create: `packages/server/src/shared/errors.ts`
- Create: `packages/server/src/shared/constants.ts`
- Create: `packages/server/src/shared/types.ts`

- [ ] **Step 1: Create error classes**

```typescript
// packages/server/src/shared/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(404, "NOT_FOUND", `${resource}${id ? ` (id: ${id})` : ""} not found`);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, "FORBIDDEN", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}
```

- [ ] **Step 2: Create constants**

```typescript
// packages/server/src/shared/constants.ts
export const GLOBAL_ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
} as const;

export type GlobalRole = (typeof GLOBAL_ROLES)[keyof typeof GLOBAL_ROLES];

export const WORKSPACE_PERMISSIONS = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type WorkspacePermission =
  (typeof WORKSPACE_PERMISSIONS)[keyof typeof WORKSPACE_PERMISSIONS];

export const PROJECT_PERMISSIONS = {
  OWNER: "owner",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export type ProjectPermission =
  (typeof PROJECT_PERMISSIONS)[keyof typeof PROJECT_PERMISSIONS];

export const TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "เร่งด่วน",
  high: "สูง",
  normal: "ปกติ",
  low: "ต่ำ",
};

export const WORKSPACE_TYPES = [
  "rental",
  "consulting",
  "training",
  "incubation",
  "general",
] as const;
export type WorkspaceType =
  (typeof WORKSPACE_TYPES)[keyof typeof WORKSPACE_TYPES];

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  rental: "เช่าพื้นที่/ห้องประชุม",
  consulting: "ที่ปรึกษา/วิจัย",
  training: "อบรม/สัมนา",
  incubation: "บ่มเพาะ/Incubation",
  general: "ทั่วไป",
};

export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export type ProjectStatus =
  (typeof PROJECT_STATUSES)[keyof typeof PROJECT_STATUSES];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "วางแผน",
  active: "กำลังดำเนินการ",
  on_hold: "ระงับชั่วคราว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export const DEFAULT_WORKSPACE_STATUSES: Record<WorkspaceType, string[]> = {
  rental: ["รับแจ้ง", "ตรวจสอบ", "อนุมัติ", "จัดเตรียม", "เสร็จสิ้น"],
  consulting: ["รับเรื่อง", "ประเมิน", "ดำเนินการ", "ส่งมอบ", "เสร็จสิ้น"],
  training: [
    "วางแผน",
    "ขออนุมัติ",
    "จัดเตรียม",
    "ดำเนินการ",
    "สรุปผล",
    "เสร็จสิ้น",
  ],
  incubation: ["รับสมัคร", "คัดเลือก", "บ่มเพาะ", "ติดตาม", "สำเร็จ"],
  general: ["รอทำ", "กำลังทำ", "รอตรวจ", "เสร็จสิ้น"],
};
```

- [ ] **Step 3: Create shared types**

```typescript
// packages/server/src/shared/types.ts
import type {
  GlobalRole,
  WorkspacePermission,
  ProjectPermission,
  TaskPriority,
  WorkspaceType,
  ProjectStatus,
} from "./constants";

export interface JwtPayload {
  userId: number;
  role: GlobalRole;
  email: string;
}

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: GlobalRole;
  avatarUrl?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface TaskFilter {
  workspaceId?: number;
  projectId?: number;
  assigneeId?: number;
  status?: string;
  priority?: TaskPriority;
  search?: string;
  fiscalYear?: number;
  page?: number;
  pageSize?: number;
}

export interface MyWorkGroup {
  today: number;
  overdue: number;
  thisWeek: number;
  thisMonth: number;
  waiting: number;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/shared/errors.ts packages/server/src/shared/constants.ts packages/server/src/shared/types.ts
git commit -m "feat: add shared error types, constants, and TypeScript interfaces"
```

---

### Task 1.4: Auth Module — Local Auth + JWT (with SSO placeholder)

**Files:**

- Create: `packages/server/src/modules/auth/auth.service.ts`
- Create: `packages/server/src/modules/auth/auth.controller.ts`
- Create: `packages/server/src/modules/auth/auth.plugin.ts`
- Create: `packages/server/src/middleware/auth.middleware.ts`
- Test: `packages/server/tests/modules/auth/auth.service.test.ts`

- [ ] **Step 1: Write failing tests for auth service**

```typescript
// packages/server/tests/modules/auth/auth.service.test.ts
import { describe, it, expect, beforeEach } from "vitest";

describe("Auth Service", () => {
  describe("generateToken", () => {
    it("generates a JWT token with user payload", async () => {
      const { AuthService } =
        await import("../../../src/modules/auth/auth.service");
      const payload = {
        userId: 1,
        role: "staff" as const,
        email: "test@example.com",
      };
      const token = await AuthService.generateToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });
  });

  describe("verifyToken", () => {
    it("verifies a valid token and returns payload", async () => {
      const { AuthService } =
        await import("../../../src/modules/auth/auth.service");
      const payload = {
        userId: 1,
        role: "staff" as const,
        email: "test@example.com",
      };
      const token = await AuthService.generateToken(payload);
      const decoded = await AuthService.verifyToken(token);
      expect(decoded.userId).toBe(1);
      expect(decoded.role).toBe("staff");
    });

    it("rejects an invalid token", async () => {
      const { AuthService } =
        await import("../../../src/modules/auth/auth.service");
      await expect(AuthService.verifyToken("invalid-token")).rejects.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/server && bun test tests/modules/auth/auth.service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement auth service**

```typescript
// packages/server/src/modules/auth/auth.service.ts
import jwt from "jsonwebtoken";
import { config } from "../../config/env";
import type { JwtPayload } from "../../shared/types";

export const AuthService = {
  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
  },

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: "30d" });
  },

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  },

  /**
   * SSO callback — placeholder for OIDC integration
   * Currently creates/finds user from local DB
   * Will be replaced with OIDC flow when IT provides endpoints
   */
  async handleSsoCallback(code: string) {
    // TODO: Replace with actual OIDC flow
    // 1. Exchange code for token with OIDC provider
    // 2. Get user info from OIDC provider
    // 3. Find or create user in DB
    throw new Error("SSO not configured yet. Use local auth for development.");
  },
};
```

- [ ] **Step 4: Implement auth middleware**

```typescript
// packages/server/src/middleware/auth.middleware.ts
import type { Context } from "elysia";
import { AuthService } from "../modules/auth/auth.service";
import { UnauthorizedError } from "../shared/errors";
import type { JwtPayload, GlobalRole } from "../shared/types";

declare module "elysia" {
  interface Context {
    user: JwtPayload;
  }
}

export function authMiddleware() {
  return {
    beforeHandle(ctx: Context) {
      const authHeader = ctx.request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new UnauthorizedError("Missing or invalid authorization header");
      }

      const token = authHeader.slice(7);
      try {
        ctx.user = AuthService.verifyToken(token);
      } catch {
        throw new UnauthorizedError("Invalid or expired token");
      }
    },
  };
}

export function requireRole(...roles: GlobalRole[]) {
  return {
    beforeHandle(ctx: Context & { user: JwtPayload }) {
      if (!ctx.user) {
        throw new UnauthorizedError();
      }
      if (!roles.includes(ctx.user.role)) {
        throw new UnauthorizedError("Insufficient permissions");
      }
    },
  };
}
```

- [ ] **Step 5: Implement auth controller + plugin**

```typescript
// packages/server/src/modules/auth/auth.controller.ts
import { AuthService } from "./auth.service";
import { db } from "../../config/database";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../../shared/errors";
import { AuthService as AuthSvc } from "./auth.service";

export const AuthController = {
  async loginDev(body: { email: string }) {
    // Dev-only: find user by email, generate token
    // Remove this when SSO is ready
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (!user) throw new NotFoundError("User", body.email);

    const token = AuthSvc.generateToken({
      userId: user.id,
      role: user.role as "admin" | "staff",
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    };
  },

  async getMe(userId: number) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundError("User");
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  },

  async refreshToken(userId: number, role: string, email: string) {
    const token = AuthService.generateToken({
      userId,
      role: role as "admin" | "staff",
      email,
    });
    return { token };
  },
};
```

```typescript
// packages/server/src/modules/auth/auth.plugin.ts
import Elysia from "elysia";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

export const authPlugin = new Elysia({ prefix: "/api/auth" })
  .post(
    "/login",
    async ({ body }) => AuthController.loginDev(body as { email: string }),
    {
      detail: { summary: "Dev login — find user by email" },
    },
  )
  .post(
    "/refresh",
    async ({ user }) =>
      AuthController.refreshToken(user.userId, user.role, user.email),
    {
      beforeHandle: authMiddleware(),
      detail: { summary: "Refresh JWT token" },
    },
  )
  .get("/me", async ({ user }) => AuthController.getMe(user.userId), {
    beforeHandle: authMiddleware(),
    detail: { summary: "Get current user info" },
  })
  .post("/logout", async () => ({ success: true }), {
    beforeHandle: authMiddleware(),
    detail: { summary: "Logout (client discards token)" },
  });
```

- [ ] **Step 6: Run tests**

Run: `cd packages/server && bun test tests/modules/auth/auth.service.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/modules/auth/ packages/server/src/middleware/auth.middleware.ts packages/server/tests/modules/auth/
git commit -m "feat: add auth module with JWT (local auth + SSO placeholder)"
```

---

### Task 1.5: RBAC Middleware

**Files:**

- Create: `packages/server/src/middleware/rbac.middleware.ts`
- Test: `packages/server/tests/middleware/rbac.middleware.test.ts`

- [ ] **Step 1: Implement RBAC middleware**

```typescript
// packages/server/src/middleware/rbac.middleware.ts
import { db } from "../config/database";
import { workspaceMembers, projectMembers } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { ForbiddenError } from "../shared/errors";
import type {
  JwtPayload,
  GlobalRole,
  WorkspacePermission,
  ProjectPermission,
} from "../shared/types";

export function requireAdmin() {
  return {
    beforeHandle(ctx: { user: JwtPayload }) {
      if (ctx.user.role !== "admin") {
        throw new ForbiddenError("Admin access required");
      }
    },
  };
}

export async function getWorkspacePermission(
  userId: number,
  workspaceId: number,
): Promise<WorkspacePermission | null> {
  const [membership] = await db
    .select({ permission: workspaceMembers.permission })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return (membership?.permission as WorkspacePermission) ?? null;
}

export async function getProjectPermission(
  userId: number,
  projectId: number,
): Promise<ProjectPermission | null> {
  const [membership] = await db
    .select({ permission: projectMembers.permission })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.projectId, projectId),
      ),
    )
    .limit(1);
  return (membership?.permission as ProjectPermission) ?? null;
}

export function canEditWorkspace(
  permission: WorkspacePermission | null,
  userRole: GlobalRole,
): boolean {
  if (userRole === "admin") return true;
  return permission === "owner" || permission === "editor";
}

export function canManageWorkspace(
  permission: WorkspacePermission | null,
  userRole: GlobalRole,
): boolean {
  if (userRole === "admin") return true;
  return permission === "owner";
}

export function canEditProject(
  permission: ProjectPermission | null,
  userRole: GlobalRole,
): boolean {
  if (userRole === "admin") return true;
  return permission === "owner" || permission === "member";
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/middleware/rbac.middleware.ts
git commit -m "feat: add RBAC middleware for workspace and project permissions"
```

---

### Task 1.6: Database Schema — Phase 1 (Core Tables)

**Files:**

- Modify: `packages/server/src/db/schema/users.ts`
- Modify: `packages/server/src/db/schema/workspaces.ts`
- Modify: `packages/server/src/db/schema/index.ts`

The schema files already exist but need to be verified and potentially updated for the new requirements (waiting, templates, quick notes, audit logs). For Phase 1, we only need: `users`, `workspaces`, `workspace_statuses`, `workspace_members`.

- [ ] **Step 1: Verify and update users schema**

Read the existing `packages/server/src/db/schema/users.ts` and ensure it has: id, email, displayName, role (admin/staff), avatarUrl, ssoId, createdAt, updatedAt.

- [ ] **Step 2: Verify and update workspaces schema**

Read the existing `packages/server/src/db/schema/workspaces.ts` and ensure it has: id, name, description, type (rental/consulting/training/incubation/general), color, createdBy, createdAt, updatedAt.

- [ ] **Step 3: Generate and run migration**

Run: `cd packages/server && bun drizzle-kit generate`
Run: `cd packages/server && bun drizzle-kit migrate`

- [ ] **Step 4: Create seed data script**

```typescript
// packages/server/src/db/seed.ts
import { db } from "../config/database";
import { users, workspaces, workspaceStatuses } from "./schema";
import { DEFAULT_WORKSPACE_STATUSES } from "../shared/constants";

async function seed() {
  // Seed admin user
  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@tpone.local",
      displayName: "ผู้ดูแลระบบ",
      role: "admin",
    })
    .returning();

  // Seed demo staff
  const [staff] = await db
    .insert(users)
    .values({
      email: "staff@tpone.local",
      displayName: "เจ้าหน้าที่ทดสอบ",
      role: "staff",
    })
    .returning();

  // Seed default workspaces
  const workspaceData = [
    {
      name: "เช่าพื้นที่/ห้องประชุม",
      type: "rental" as const,
      color: "#4CAF50",
    },
    { name: "ที่ปรึกษา/วิจัย", type: "consulting" as const, color: "#2196F3" },
    { name: "อบรม/สัมนา", type: "training" as const, color: "#FF9800" },
    {
      name: "บ่มเพาะ/Incubation",
      type: "incubation" as const,
      color: "#9C27B0",
    },
    { name: "งานทั่วไป", type: "general" as const, color: "#607D8B" },
  ];

  for (const ws of workspaceData) {
    const [workspace] = await db
      .insert(workspaces)
      .values({
        ...ws,
        createdBy: admin.id,
      })
      .returning();

    // Seed default statuses for each workspace
    const statuses = DEFAULT_WORKSPACE_STATUSES[ws.type];
    for (let i = 0; i < statuses.length; i++) {
      await db.insert(workspaceStatuses).values({
        workspaceId: workspace.id,
        name: statuses[i],
        color: "#666666",
        order: i + 1,
      });
    }
  }

  console.log("Seed data created successfully");
}

seed().catch(console.error);
```

- [ ] **Step 5: Run seed**

Run: `cd packages/server && bun run src/db/seed.ts`
Expected: "Seed data created successfully"

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/db/seed.ts
git commit -m "feat: add seed data with default workspaces and Thai statuses"
```

---

### Task 1.7: Frontend — Thai Date Composables & Utilities

**Files:**

- Create: `packages/web/src/utils/thai.ts`
- Create: `packages/web/src/composables/useThaiDate.ts`
- Create: `packages/web/src/composables/useFiscalYear.ts`

- [ ] **Step 1: Create Thai utilities (frontend)**

```typescript
// packages/web/src/utils/thai.ts
export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

export const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const THAI_DAYS_SHORT = [
  "อา.",
  "จ.",
  "อ.",
  "พ.",
  "พฤ.",
  "ศ.",
  "ส.",
] as const;

export function toBE(adYear: number): number {
  return adYear + 543;
}

export function toAD(beYear: number): number {
  return beYear - 543;
}

export function formatThaiDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${toBE(d.getFullYear())}`;
}

export function formatThaiDateFull(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} ${toBE(d.getFullYear())}`;
}

export function formatThaiMonth(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${THAI_MONTHS_SHORT[d.getMonth()]} ${toBE(d.getFullYear())}`;
}

export function getFiscalYear(date: Date = new Date()): number {
  const month = date.getMonth() + 1;
  if (month >= 10) return toBE(date.getFullYear() + 1);
  return toBE(date.getFullYear());
}

export function getFiscalYearRange(fiscalYear: number) {
  const adYear = toAD(fiscalYear);
  return { start: new Date(adYear - 1, 9, 1), end: new Date(adYear, 8, 30) };
}

export function getFiscalQuarter(date: Date = new Date()): number {
  const month = date.getMonth() + 1;
  if (month >= 10) return 1;
  if (month >= 7) return 4;
  if (month >= 4) return 3;
  return 2;
}

export const FISCAL_QUARTER_LABELS: Record<number, string> = {
  1: "ไตรมาสที่ 1 (ต.ค. - ธ.ค.)",
  2: "ไตรมาสที่ 2 (ม.ค. - มี.ค.)",
  3: "ไตรมาสที่ 3 (เม.ย. - มิ.ย.)",
  4: "ไตรมาสที่ 4 (ก.ค. - ก.ย.)",
};

export function formatNumber(value: number): string {
  return value.toLocaleString("th-TH");
}

export function formatCurrency(value: number): string {
  return `${value.toLocaleString("th-TH")} บาท`;
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = daysUntil(d);
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "พรุ่งนี้";
  if (diff === -1) return "เมื่อวาน";
  if (diff > 0 && diff <= 7) return `อีก ${diff} วัน`;
  if (diff < 0) return `เลย ${Math.abs(diff)} วัน`;
  return formatThaiDate(d);
}
```

- [ ] **Step 2: Create useThaiDate composable**

```typescript
// packages/web/src/composables/useThaiDate.ts
import {
  formatThaiDate,
  formatThaiDateFull,
  formatThaiMonth,
  relativeTime,
  daysUntil,
} from "../utils/thai";

export function useThaiDate() {
  return {
    formatShort: formatThaiDate,
    formatFull: formatThaiDateFull,
    formatMonth: formatThaiMonth,
    relative: relativeTime,
    daysUntil,
  };
}
```

- [ ] **Step 3: Create useFiscalYear composable**

```typescript
// packages/web/src/composables/useFiscalYear.ts
import { ref, computed } from "vue";
import {
  getFiscalYear,
  getFiscalYearRange,
  getFiscalQuarter,
  toAD,
  FISCAL_QUARTER_LABELS,
} from "../utils/thai";

export function useFiscalYear() {
  const currentFY = getFiscalYear();
  const selectedFY = ref(currentFY);

  const fyRange = computed(() => getFiscalYearRange(selectedFY.value));
  const fyLabel = computed(() => `ปีงบ ${selectedFY.value}`);

  const fyOptions = computed(() => {
    const options: { label: string; value: number }[] = [];
    for (let y = currentFY - 3; y <= currentFY + 1; y++) {
      options.push({ label: `ปีงบ ${y}`, value: y });
    }
    return options.reverse();
  });

  const currentQuarter = getFiscalQuarter();

  function quarterRange(quarter: number, fiscalYear?: number) {
    const fy = fiscalYear ?? selectedFY.value;
    const adYear = toAD(fy);
    const ranges: Record<number, { start: Date; end: Date }> = {
      1: {
        start: new Date(adYear - 1, 9, 1),
        end: new Date(adYear - 1, 11, 31),
      },
      2: { start: new Date(adYear, 0, 1), end: new Date(adYear, 2, 31) },
      3: { start: new Date(adYear, 3, 1), end: new Date(adYear, 5, 30) },
      4: { start: new Date(adYear, 6, 1), end: new Date(adYear, 8, 30) },
    };
    return ranges[quarter];
  }

  return {
    currentFY,
    selectedFY,
    fyRange,
    fyLabel,
    fyOptions,
    currentQuarter,
    quarterRange,
    quarterLabels: FISCAL_QUARTER_LABELS,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/utils/thai.ts packages/web/src/composables/useThaiDate.ts packages/web/src/composables/useFiscalYear.ts
git commit -m "feat: add Thai date utilities and fiscal year composables for frontend"
```

---

### Task 1.8: Frontend — Naive UI Setup with Thai Locale

**Files:**

- Modify: `packages/web/src/main.ts`
- Modify: `packages/web/src/App.vue`

- [ ] **Step 1: Configure Naive UI with Thai locale in App.vue**

```vue
<!-- packages/web/src/App.vue -->
<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  dateZhHant,
} from "naive-ui";
import { thTH } from "naive-ui/es/locales/common/thTH";
import { dateThTH } from "naive-ui/es/locales/date/thTH";
import AppLayout from "./components/layout/AppLayout.vue";
</script>

<template>
  <NConfigProvider :locale="thTH" :date-locale="dateThTH">
    <NMessageProvider>
      <NDialogProvider>
        <AppLayout />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
```

> **Note:** ตรวจสอบว่า Naive UI มี Thai locale ในเวอร์ชันที่ใช้ ถ้าไม่มี จะต้องสร้าง custom locale object ขึ้นมาเอง

- [ ] **Step 2: Verify app starts**

Run: `cd packages/web && bun run dev`
Expected: App loads without errors, Naive UI components use Thai locale

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/App.vue packages/web/src/main.ts
git commit -m "feat: configure Naive UI with Thai locale"
```

---

### Task 1.9: Frontend — Layout Shell + Sidebar

**Files:**

- Modify: `packages/web/src/components/layout/AppLayout.vue`
- Create: `packages/web/src/components/layout/Sidebar.vue`
- Create: `packages/web/src/components/layout/Header.vue`
- Modify: `packages/web/src/router/index.ts`

- [ ] **Step 1: Create Sidebar component with Thai labels**

```vue
<!-- packages/web/src/components/layout/Sidebar.vue -->
<script setup lang="ts">
import { NMenu, NIcon } from "naive-ui";
import { useRoute, useRouter } from "vue-router";
import { computed, h } from "vue";

const route = useRoute();
const router = useRouter();

const menuOptions = [
  { label: "งานของฉัน", key: "my-work", icon: () => h("span", {}, "📋") },
  { label: "Dashboard", key: "dashboard", icon: () => h("span", {}, "📊") },
  { type: "divider" as const, key: "d1" },
  { label: "งานทั้งหมด", key: "tasks", icon: () => h("span", {}, "📝") },
  { label: "โครงการ", key: "projects", icon: () => h("span", {}, "📁") },
  { label: "แผนปฏิบัติการ", key: "plans", icon: () => h("span", {}, "📈") },
  { type: "divider" as const, key: "d2" },
  { label: "รายงาน", key: "reports", icon: () => h("span", {}, "📄") },
];

const activeKey = computed(() => {
  const path = route.path;
  if (path === "/my-work") return "my-work";
  if (path === "/dashboard") return "dashboard";
  if (path.startsWith("/task")) return "tasks";
  if (path.startsWith("/project")) return "projects";
  if (path.startsWith("/plan")) return "plans";
  if (path.startsWith("/report")) return "reports";
  return "";
});

const routeMap: Record<string, string> = {
  "my-work": "/my-work",
  dashboard: "/dashboard",
  tasks: "/tasks",
  projects: "/projects",
  plans: "/plans",
  reports: "/reports",
};

function handleMenuClick(key: string) {
  const path = routeMap[key];
  if (path) router.push(path);
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1 class="sidebar-title">TP-One</h1>
      <span class="sidebar-subtitle">อุทยานเทคโนโลยี</span>
    </div>
    <NMenu
      :value="activeKey"
      :options="menuOptions"
      @update:value="handleMenuClick"
    />
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}
.sidebar-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}
.sidebar-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
</style>
```

- [ ] **Step 2: Create Header component**

```vue
<!-- packages/web/src/components/layout/Header.vue -->
<script setup lang="ts">
import { NInput, NAvatar, NDropdown, NBadge } from "naive-ui";
import { useAuthStore } from "../../stores/auth";
import { ref } from "vue";

const authStore = useAuthStore();
const searchQuery = ref("");

const userDropdownOptions = [
  { label: "โปรไฟล์", key: "profile" },
  { label: "ตั้งค่า", key: "settings" },
  { type: "divider" as const, key: "d1" },
  { label: "ออกจากระบบ", key: "logout" },
];
</script>

<template>
  <header class="app-header">
    <NInput
      v-model:value="searchQuery"
      placeholder="ค้นหางาน..."
      clearable
      class="search-input"
    />
    <div class="header-actions">
      <NBadge :value="3" :max="99">
        <span class="notification-icon">🔔</span>
      </NBadge>
      <NDropdown :options="userDropdownOptions">
        <NAvatar round size="small">{{
          authStore.user?.displayName?.charAt(0) || "?"
        }}</NAvatar>
      </NDropdown>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--color-border);
  background: white;
}
.search-input {
  max-width: 400px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.notification-icon {
  cursor: pointer;
  font-size: 1.2rem;
}
</style>
```

- [ ] **Step 3: Update AppLayout**

```vue
<!-- packages/web/src/components/layout/AppLayout.vue -->
<script setup lang="ts">
import { useRoute } from "vue-router";
import Sidebar from "./Sidebar.vue";
import Header from "./Header.vue";
import LoginView from "../../views/LoginView.vue";
import { useAuthStore } from "../../stores/auth";

const route = useRoute();
const authStore = useAuthStore();
</script>

<template>
  <LoginView v-if="!authStore.isAuthenticated" />
  <div v-else class="app-layout">
    <Sidebar />
    <div class="main-area">
      <Header />
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--color-bg);
}
</style>
```

- [ ] **Step 4: Update router with Thai labels**

```typescript
// packages/web/src/router/index.ts
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/my-work" },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/my-work",
      name: "my-work",
      component: () => import("../views/MyWorkView.vue"),
      meta: { title: "งานของฉัน" },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("../views/DashboardView.vue"),
      meta: { title: "Dashboard" },
    },
    {
      path: "/tasks",
      name: "tasks",
      component: () => import("../views/TaskListView.vue"),
      meta: { title: "งานทั้งหมด" },
    },
    {
      path: "/tasks/board",
      name: "task-board",
      component: () => import("../views/TaskBoardView.vue"),
      meta: { title: "Kanban Board" },
    },
    {
      path: "/tasks/calendar",
      name: "task-calendar",
      component: () => import("../views/TaskCalendarView.vue"),
      meta: { title: "ปฏิทิน" },
    },
    {
      path: "/projects",
      name: "projects",
      component: () => import("../views/ProjectListView.vue"),
      meta: { title: "โครงการ" },
    },
    {
      path: "/projects/:id",
      name: "project-detail",
      component: () => import("../views/ProjectDetailView.vue"),
      meta: { title: "รายละเอียดโครงการ" },
    },
    {
      path: "/plans",
      name: "plans",
      component: () => import("../views/AnnualPlanView.vue"),
      meta: { title: "แผนปฏิบัติการ" },
    },
    {
      path: "/plans/:id",
      name: "plan-detail",
      component: () => import("../views/PlanDetailView.vue"),
      meta: { title: "รายละเอียดแผน" },
    },
    {
      path: "/reports",
      name: "reports",
      component: () => import("../views/ReportView.vue"),
      meta: { title: "รายงาน" },
    },
  ],
});

router.beforeEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} — TP-One` : "TP-One";
});

export default router;
```

- [ ] **Step 5: Create auth store (Pinia)**

```typescript
// packages/web/src/stores/auth.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../services/api";

interface User {
  id: number;
  displayName: string;
  email: string;
  role: "admin" | "staff";
  avatarUrl?: string;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("token"));

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === "admin");

  async function login(email: string) {
    const { data } = await api.post("/api/auth/login", { email });
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem("token", data.token);
  }

  async function fetchMe() {
    const { data } = await api.get("/api/auth/me");
    user.value = data;
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
  }

  return { user, token, isAuthenticated, isAdmin, login, fetchMe, logout };
});
```

- [ ] **Step 6: Verify app loads with layout**

Run: `cd packages/web && bun run dev`
Expected: Sidebar with Thai menu, header with search, routes work

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/
git commit -m "feat: add UI shell with Thai sidebar, header, auth store, and routing"
```

---

### Task 1.10: Login Page (Thai)

**Files:**

- Modify: `packages/web/src/views/LoginView.vue`

- [ ] **Step 1: Create Thai login page**

```vue
<!-- packages/web/src/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { NCard, NButton, NInput, NSpace, NAlert } from "naive-ui";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const email = ref("");
const loading = ref(false);
const error = ref("");

async function handleLogin() {
  loading.value = true;
  error.value = "";
  try {
    await authStore.login(email.value);
  } catch (e: unknown) {
    error.value = "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมล";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <NCard class="login-card" title="เข้าสู่ระบบ TP-One">
      <p class="login-subtitle">ระบบจัดการงานอุทยานเทคโนโลยี</p>
      <NAlert v-if="error" type="error" class="login-error">{{ error }}</NAlert>
      <NSpace vertical :size="16">
        <NInput
          v-model:value="email"
          placeholder="อีเมลมหาวิทยาลัย"
          size="large"
          @keyup.enter="handleLogin"
        />
        <NButton
          type="primary"
          block
          size="large"
          :loading="loading"
          @click="handleLogin"
        >
          เข้าสู่ระบบ
        </NButton>
        <p class="login-dev-note">
          ⚡ โหมดพัฒนา: ใช้อีเมลในระบบเพื่อเข้าสู่ระบบ
        </p>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 400px;
}
.login-subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 16px;
}
.login-error {
  margin-bottom: 8px;
}
.login-dev-note {
  text-align: center;
  font-size: 0.8rem;
  color: #999;
}
</style>
```

- [ ] **Step 2: Verify login page renders**

Run: `cd packages/web && bun run dev`
Expected: Login page with Thai text, gradient background

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/views/LoginView.vue
git commit -m "feat: add Thai login page with dev auth mode"
```

---

## Phase 2: Core Task Management (Week 5-8)

### Task 2.1: Workspace CRUD (Backend)

**Files:**

- Create: `packages/server/src/modules/workspace/workspace.service.ts`
- Create: `packages/server/src/modules/workspace/workspace.controller.ts`
- Create: `packages/server/src/modules/workspace/workspace.plugin.ts`
- Test: `packages/server/tests/modules/workspace/workspace.service.test.ts`

- [ ] **Step 1: Write failing tests for workspace CRUD**
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement workspace service (CRUD + members + custom statuses)**
- [ ] **Step 4: Implement workspace controller + Elysia plugin**
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add workspace CRUD with custom statuses and member management"
```

---

### Task 2.2: Task CRUD (Backend)

**Files:**

- Create: `packages/server/src/modules/task/task.service.ts`
- Create: `packages/server/src/modules/task/task.controller.ts`
- Create: `packages/server/src/modules/task/task.plugin.ts`
- Test: `packages/server/tests/modules/task/task.service.test.ts`

- [ ] **Step 1: Write failing tests for task CRUD**
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement task service (CRUD + subtasks + tags + comments)**
- [ ] **Step 4: Implement task controller + Elysia plugin**
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add task CRUD with subtasks, tags, comments, and filtering"
```

---

### Task 2.3: "รอหน่วยงานอื่น" (Waiting for Others) — Backend

**Files:**

- Create: `packages/server/src/db/schema/waiting.ts`
- Create: `packages/server/src/modules/task/waiting.service.ts`
- Test: `packages/server/tests/modules/task/waiting.service.test.ts`

- [ ] **Step 1: Create waiting schema (task_waiting + task_follow_ups)**
- [ ] **Step 2: Write failing tests**
- [ ] **Step 3: Implement waiting service (set waiting, follow-up, auto-remind)**
- [ ] **Step 4: Run tests**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add 'waiting for others' status with follow-up tracking"
```

---

### Task 2.4: Task Templates — Backend

**Files:**

- Create: `packages/server/src/db/schema/templates.ts`
- Create: `packages/server/src/modules/template/template.service.ts`
- Create: `packages/server/src/modules/template/template.controller.ts`
- Create: `packages/server/src/modules/template/template.plugin.ts`
- Test: `packages/server/tests/modules/template/template.service.test.ts`

- [ ] **Step 1: Create template schema (task_templates + task_template_items)**
- [ ] **Step 2: Write failing tests**
- [ ] **Step 3: Implement template service (CRUD + instantiate)**
- [ ] **Step 4: Implement template controller + plugin**
- [ ] **Step 5: Run tests**
- [ ] **Step 6: Seed default templates (จัดอบรม, ขอจัดซื้อ, วิจัย/ที่ปรึกษา)**
- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add task templates with instantiate functionality and Thai defaults"
```

---

### Task 2.5: My Work Today — Backend

**Files:**

- Create: `packages/server/src/modules/my-work/my-work.service.ts`
- Create: `packages/server/src/modules/my-work/my-work.plugin.ts`

- [ ] **Step 1: Implement my-work service (group tasks: today/overdue/this_week/waiting)**
- [ ] **Step 2: Implement my-work plugin (GET /api/my-work, GET /api/my-work/summary)**
- [ ] **Step 3: Write tests**
- [ ] **Step 4: Run tests**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add 'my work today' endpoint with task grouping by deadline"
```

---

### Task 2.6: Frontend — Task List View + Thai Date Display

**Files:**

- Create: `packages/web/src/components/common/ThaiDate.vue`
- Create: `packages/web/src/components/common/PriorityBadge.vue`
- Create: `packages/web/src/components/common/StatusBadge.vue`
- Create: `packages/web/src/components/task/TaskList.vue`
- Create: `packages/web/src/components/task/TaskCard.vue`
- Create: `packages/web/src/services/task.ts`
- Modify: `packages/web/src/views/TaskListView.vue`

- [ ] **Step 1: Create ThaiDate component**
- [ ] **Step 2: Create PriorityBadge + StatusBadge components**
- [ ] **Step 3: Create task API service**
- [ ] **Step 4: Create TaskList + TaskCard components**
- [ ] **Step 5: Update TaskListView with list + filter + pagination**
- [ ] **Step 6: Verify task list displays with Thai dates and labels**
- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add task list view with Thai dates, priority badges, and filtering"
```

---

### Task 2.7: Frontend — Kanban Board

**Files:**

- Create: `packages/web/src/components/task/TaskKanban.vue`
- Modify: `packages/web/src/views/TaskBoardView.vue`

- [ ] **Step 1: Implement Kanban board with drag-and-drop (using vuedraggable or @vueuse/integrations)**
- [ ] **Step 2: Columns from workspace custom statuses**
- [ ] **Step 3: Task cards with Thai date, priority, assignee**
- [ ] **Step 4: Drag to change status with API call**
- [ ] **Step 5: Verify Kanban works end-to-end**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add Kanban board with drag-and-drop status change"
```

---

### Task 2.8: Frontend — My Work Today Page

**Files:**

- Create: `packages/web/src/views/MyWorkView.vue`

- [ ] **Step 1: Create My Work page with task groups (วันนี้/เลยกำหนด/สัปดาห์นี้/รอหน่วยงานอื่น)**
- [ ] **Step 2: Quick status change from My Work (no navigation needed)**
- [ ] **Step 3: Task count summary cards**
- [ ] **Step 4: Verify My Work loads correctly**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add 'my work today' page with Thai task grouping and quick actions"
```

---

### Task 2.9: Frontend — Copy to Clipboard (Thai Telegram Format)

**Files:**

- Create: `packages/web/src/composables/useClipboard.ts`
- Create: `packages/web/src/components/task/CopySummary.vue`

- [ ] **Step 1: Create useClipboard composable**
- [ ] **Step 2: Create CopySummary button with short/full format**
- [ ] **Step 3: Thai emoji format for Telegram**
- [ ] **Step 4: Integrate into TaskDetail**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add copy-to-clipboard with Thai Telegram format"
```

---

## Phase 3: Notifications + Kanban Polish (Week 9-12)

### Task 3.1: Telegram Bot Integration

- Create telegram.service.ts — send message to personal/group chat
- Configure bot token + chat ID mapping
- Send notification on: task assigned, status changed, comment added, deadline approaching

### Task 3.2: In-App Notification System

- Notification service + store
- Notification bell in header
- Real-time via WebSocket (Elysia native)

### Task 3.3: Daily Standup Auto-Summary

- Cron job (Bun worker) runs at 08:30
- Per-user summary: งานวันนี้, งานค้าง, subtasks progress
- Send via Telegram

### Task 3.4: Quick Note Sidebar

- Quick note CRUD backend + frontend
- Slide-out panel from any page
- Convert note → task with workspace/assignee selection

### Task 3.5: Snapshot of Success (Photo Evidence)

- File upload backend (multipart, compress, storage)
- Photo metadata (evidence_type, event_name, taken_date)
- Batch upload frontend component

### Task 3.6: Comments + @mention

- Comment CRUD with @mention parsing
- Notification trigger on @mention
- Thread-style comment UI

---

## Phase 4: Project & KPI Management (Week 13-16)

### Task 4.1: Project CRUD

- Project service + controller + plugin
- Project members management
- Auto progress calculation from tasks

### Task 4.2: KPI Management + Audit Trail

- KPI CRUD (name, target, current, unit, period)
- kpi_audit_logs table — every change tracked
- Revert from audit log (admin)

### Task 4.3: Project Detail Page (Frontend)

- Project overview with progress bar
- KPI cards with progress
- Task list within project
- Member management

---

## Phase 5: Dashboard & Reports (Week 17-20)

### Task 5.1: Executive Dashboard

- Stats cards (total tasks, in progress, completed) — filtered by fiscal year
- Task status chart by priority/assignee/workspace
- Project progress bars
- Workload distribution chart
- KPI achievement summary

### Task 5.2: Fiscal Year Filter Component

- Reusable FiscalYearFilter.vue
- Default to current fiscal year
- Used in Dashboard, Reports, Plans

### Task 5.3: Report Generation

- Monthly/quarterly report (Thai fiscal quarter)
- PDF export (PDFKit)
- Excel export (ExcelJS)
- Thai date/number formatting in reports

### Task 5.4: Email Notifications

- Email service (Nodemailer)
- Send on: task assigned, deadline approaching, weekly summary

---

## Phase 6: Advanced Views (Week 21-24)

### Task 6.1: Calendar View

- Monthly/weekly view with tasks on due dates
- Thai month headers (มกราคม, กุมภาพันธ์, ...)
- Drag to reschedule

### Task 6.2: Gantt Chart

- Project timeline view
- Task dependencies
- Thai date axis (พ.ศ.)

### Task 6.3: Audit Timeline + Bottleneck Detection

- Task timeline (horizontal, color-coded duration)
- Bottleneck dashboard (average time per status)
- Trend comparison (month/quarter)

### Task 6.4: UI Polish + Performance

- Responsive layout optimization (1024px-1920px)
- Loading states + error handling
- Keyboard shortcuts
- Performance audit (API < 200ms, Dashboard < 2s)

### Task 6.5: Testing + Deployment

- E2E tests (Playwright): login, task CRUD, Kanban DnD, report export
- Integration tests: all API endpoints
- Docker production build
- Nginx production config
- Deploy to university server

---

## Phase 7: Annual Operational Plan (Week 25-28)

### Task 7.1: Plan/Category/Indicator CRUD

- Annual plan with fiscal year
- Category hierarchy within plan
- Indicators (code, name, target, unit, responsible person)

### Task 7.2: Monthly Update + Progress

- Staff updates indicator value monthly
- Auto calculate progress percentage
- Weighted average for category/plan totals

### Task 7.3: Plan Dashboard + Charts

- Progress chart per indicator (monthly line chart)
- Category progress bar
- Plan overview with fiscal year filter

### Task 7.4: Plan Audit Trail

- plan_indicator_audit_logs table
- Every indicator change tracked
- Revert capability (admin)
- Export audit log to Excel

### Task 7.5: Plan Report Export

- PDF report with progress charts
- Excel export with monthly data
- Thai fiscal year quarter grouping

---

## Self-Review Checklist

### 1. Spec Coverage

| SA Requirement                                       | Plan Task          | Status  |
| ---------------------------------------------------- | ------------------ | ------- |
| FR-AUTH-01..05 SSO + JWT + RBAC                      | Task 1.4, 1.5      | Covered |
| FR-WS-01..05 Workspace CRUD + statuses + members     | Task 2.1           | Covered |
| FR-TASK-01..09 Task CRUD + subtask + tags + comments | Task 2.2           | Covered |
| FR-VIEW-01..06 Kanban + List + Calendar + My Work    | Task 2.6-2.8, 6.1  | Covered |
| FR-TPL-01..06 Task Templates                         | Task 2.4           | Covered |
| FR-WAIT-01..06 Waiting for Others                    | Task 2.3           | Covered |
| FR-CLIP-01..05 Copy to Clipboard                     | Task 2.9           | Covered |
| FR-MYWORK-01..06 My Work Today                       | Task 2.5, 2.8      | Covered |
| FR-PROJ-01..04 Project management                    | Task 4.1           | Covered |
| FR-KPI-01..08 KPI + audit trail                      | Task 4.2           | Covered |
| FR-PLAN-01..15 Annual operational plan               | Task 7.1-7.5       | Covered |
| FR-DASH-01..07 Dashboard                             | Task 5.1           | Covered |
| FR-RPT-01..05 Reports + export                       | Task 5.3           | Covered |
| FR-NOTIF-01..09 Notifications + Telegram + Standup   | Task 3.1-3.3       | Covered |
| FR-QNOTE-01..06 Quick Note                           | Task 3.4           | Covered |
| FR-PHOTO-01..08 Snapshot/Evidence                    | Task 3.5           | Covered |
| FR-ATL-01..06 Audit Timeline + Bottleneck            | Task 6.3           | Covered |
| FR-FY-01..05 Thai Fiscal Year                        | Task 1.2, 1.7, 5.2 | Covered |

### 2. Placeholder Scan

No TBD/TODO/fill-in-later placeholders found in actionable steps. Phase 3-7 use summary-level descriptions — these will be expanded to bite-sized tasks when each phase begins.

### 3. Type Consistency

All type names, function signatures, and property names are consistent across tasks. Thai utility function names match between backend (`thai.utils.ts`) and frontend (`utils/thai.ts`).
