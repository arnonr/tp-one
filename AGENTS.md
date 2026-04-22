# TP-One — ระบบจัดการงานอุทยานเทคโนโลยี

## Project Overview

ระบบจัดการงานสำหรับอุทยานเทคโนโลยี (หน่วยงานรับบริการวิชาการ มหาวิทยาลัย) ให้บริการ 4 ด้าน: เช่าพื้นที่, ที่ปรึกษา/วิจัย, อบรม/สัมนา, บ่มเพาะสตาร์ทอัป

ผู้ใช้: 20-100 คน (เจ้าหน้าที่ภายใน) | Self-host มหาวิทยาลัย

## Tech Stack

- **Runtime:** Bun (monorepo workspaces)
- **Backend:** ElysiaJS + Drizzle ORM + PostgreSQL 16 + Redis 7
- **Frontend:** Vue 3 (Composition API) + Naive UI + Pinia + Vite
- **Charts:** Apache ECharts | **Date:** Day.js
- **Deploy:** Docker Compose + Nginx reverse proxy

## Commands

```bash
# Development
bun run dev                # Start all (server + web)
bun run dev:server         # Backend only (port 3000, --watch)
bun run dev:web            # Frontend only (port 5173, proxy /api → :3000)

# Database
bun run db:generate        # drizzle-kit generate migration
bun run db:migrate         # drizzle-kit run migration
bun run db:studio          # drizzle-kit studio GUI

# Build
bun run build              # Build all packages

# Testing
cd packages/server && bun test                    # Backend tests (vitest)
cd packages/web && bun run build                  # Frontend type-check + build

# Docker
docker compose up -d                              # Start PostgreSQL + Redis + Nginx + Server
```

## Architecture

```
[Browser] → [Nginx :80] → [/api/*] → [ElysiaJS :3000] → [PostgreSQL 16]
                          [/ws]   → [WebSocket]         → [Redis 7]
                          [/*]    → [Vue SPA :5173]
```

### Monorepo Structure

```
packages/
├── server/           # @tp-one/server — ElysiaJS backend
│   ├── src/
│   │   ├── config/   # database.ts, redis.ts, env.ts
│   │   ├── db/
│   │   │   ├── schema/   # Drizzle ORM schemas (source of truth)
│   │   │   ├── migrations/ # Generated SQL (don't edit)
│   │   │   └── seed.ts
│   │   ├── modules/  # Feature modules: {feature}/{controller,service,plugin}.ts
│   │   ├── middleware/ # auth, rbac, logger
│   │   ├── shared/   # thai.utils.ts, errors.ts, constants.ts, types.ts
│   │   └── workers/  # Background jobs (standup, notification)
│   ├── drizzle.config.ts
│   └── Dockerfile
└── web/              # @tp-one/web — Vue 3 frontend
    ├── src/
    │   ├── components/   # common/, layout/, task/, project/, report/, plan/
    │   ├── composables/  # useThaiDate, useFiscalYear, usePermissions
    │   ├── stores/       # Pinia: auth, workspace, notification, ui
    │   ├── services/     # API calls: api.ts, auth.ts, task.ts, project.ts
    │   ├── utils/        # thai.ts (date/fiscal utils), format.ts
    │   ├── views/        # Page components
    │   └── router/       # Vue Router
    └── vite.config.ts    # Proxy /api → :3000, alias @ → src/
```

## Thai-First Design Rules

**ทุกส่วนที่แสดงวันที่ต้องใช้พุทธศักราช (พ.ศ.)** — ไม่ใช้ ค.ศ.

- วันที่: `21 เม.ย. 2569` (ไม่ใช่ `2026-04-21`)
- ปีงบประมาณ: ต.ค. – ก.ย. (ไม่ใช่ ม.ค. – ธ.ค.)
- ไตรมาสงบ: Q1=ต.ค.-ธ.ค., Q2=ม.ค.-มี.ค., Q3=เม.ย.-มิ.ย., Q4=ก.ค.-ก.ย.
- Default filter ทุกหน้า: ปีงบประมาณปัจจุบัน
- Utility functions: `packages/server/src/shared/thai.utils.ts` (backend), `packages/web/src/utils/thai.ts` (frontend)
- Composable: `useThaiDate()`, `useFiscalYear()`

**UI Language: ภาษาไทยทั้งหมด**

- Naive UI locale: Thai (`thTH`)
- Sidebar, labels, buttons, messages: ภาษาไทย
- Status names เริ่มต้น: "รออนุมัติ", "กำลังดำเนินการ", "เสร็จสิ้น"
- Priority labels: "เร่งด่วน", "สูง", "ปกติ", "ต่ำ"

## Project Skills — ใช้เมื่อทำงานใน project นี้

### tp-one-frontend

ใช้เมื่อทำงานกับ `packages/web/` — เขียน Vue component, page, composable, store, service, routing, หรือ styling

- บังคับ: Thai-first (พ.ศ., เดือนไทย, UI ภาษาไทย), Naive UI, Composition API, Pinia pattern
- มี reference: component/page/composable/store scaffolding templates

### tp-one-backend

ใช้เมื่อทำงานกับ `packages/server/` — เขียน module, controller, service, plugin, middleware, schema, migration

- บังคับ: module pattern (service → controller → plugin), Drizzle ORM, AppError, RBAC, activity log
- มี reference: module scaffolding checklist (schema → service → controller → plugin → register → test)

## Response & Output Rules

- ตอบสั้นที่สุด อธิบายเป็นภาษาไทยเมื่อจำเป็น
- Do not explain code unless asked. Just provide the code.
- When modifying existing files, output only the diff or specific block that changes — never the entire file.
- ยึดหลัก Clean Code: descriptive naming, single responsibility, small functions, no magic numbers/strings, DRY

## Coding Conventions

### Backend (ElysiaJS)

- **1 feature = 1 module directory** with `controller.ts`, `service.ts`, `plugin.ts`
- Elysia plugins group routes by prefix: `new Elysia({ prefix: '/api/tasks' })`
- Use `drizzle-orm` query builder — never raw SQL
- Schema files are source of truth for DB — migrations are auto-generated
- Error handling: throw `AppError` subclasses from `shared/errors.ts`
- RBAC: use `authMiddleware()` + `requireRole()` / `requireAdmin()`

### Frontend (Vue 3)

- Composition API + `<script setup lang="ts">` — no Options API
- Components organized by feature domain, not by type
- Use Naive UI components — don't build custom UI primitives
- State in Pinia stores, server state fetched via API services
- Use `@/` alias for imports (configured in vite.config.ts)

### General

- TypeScript strict mode
- No `any` — use proper types
- Commit messages: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- Language in code: English (variables, functions, types)
- Language in UI/strings: Thai

## Database Conventions

- Schema definitions in `packages/server/src/db/schema/*.ts`
- Generate migrations: `bun run db:generate`
- Every migration must have rollback capability
- Seed data includes: admin user, 5 default workspaces, Thai status names, task templates
- Table names: plural snake_case (`users`, `workspace_members`)
- Column names: camelCase (Drizzle convention)

## API Conventions

- Prefix: `/api/` for REST, `/ws` for WebSocket
- Response format: `{ success: boolean, data?: T, error?: { code, message } }`
- Pagination: `?page=1&pageSize=20` → `{ data, total, page, pageSize, totalPages }`
- Filter by fiscal year: `?fiscalYear=2569` (default: current fiscal year)
- Auth: Bearer JWT in Authorization header

## Implementation Plan

See `docs/superpowers/plans/2026-04-21-tp-one-implementation.md` for the full phased plan.

Current phase: **Phase 1 — Foundation (Auth + UI Shell + Thai Utils)**

## Key Files

| File                                                         | Purpose                                            |
| ------------------------------------------------------------ | -------------------------------------------------- |
| `docs/SYSTEM_ANALYSIS.md`                                    | Full system requirements (Thai)                    |
| `docs/superpowers/plans/2026-04-21-tp-one-implementation.md` | Implementation plan                                |
| `packages/server/src/shared/thai.utils.ts`                   | Thai date/fiscal year utilities (backend)          |
| `packages/web/src/utils/thai.ts`                             | Thai date/fiscal year utilities (frontend)         |
| `packages/server/src/db/schema/`                             | Database schema source of truth                    |
| `docker-compose.yml`                                         | Local dev environment (PostgreSQL + Redis + Nginx) |
| `.env.example`                                               | Environment variables template                     |
