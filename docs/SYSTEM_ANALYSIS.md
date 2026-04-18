# เอกสารวิเคราะห์ระบบ (System Analysis Document)
# TP-One — ระบบจัดการงานอุทยานเทคโนโลยี

---

## 1. ข้อมูลทั่วไปของโครงการ

| รายการ | รายละเอียด |
|--------|-----------|
| ชื่อโครงการ | TP-One (Technology Park One) |
| หน่วยงานเจ้าของโครงการ | อุทยานเทคโนโลยี (Technology Park) |
| ประเภทหน่วยงาน | หน่วยงานรับบริการวิชาการ มหาวิทยาลัย (หน่วยงานรัฐ) |
| วันที่จัดทำเอกสาร | 2026-04-17 |
| เวอร์ชันเอกสาร | 1.1 |

---

## 2. ภูมิหลังและความจำเป็น

### 2.1 ภูมิหลัง

อุทยานเทคโนโลยี เป็นหน่วยงานรับบริการวิชาการของมหาวิทยาลัย อยู่ภายใต้การกำกับของรัฐ ให้บริการวิชาการครบ 4 ด้าน:

1. **เช่าพื้นที่/ห้องประชุม** — บริการเช่าพื้นที่สำนักงาน ห้องประชุม พื้นที่ coworking
2. **ที่ปรึกษา/วิจัย** — บริการที่ปรึกษา วิจัย พัฒนานวัตกรรม แก่องค์กรภายนอก
3. **อบรม/สัมนา** — จัดอบรม สัมนา เวิร์คช็อป ให้ความรู้แก่ภาคีเครือข่าย
4. **บ่มเพาะ/Incubation** — บ่มเพาะสตาร์ทอัป โปรแกรมเร่งรัดธุรกิจ (Accelerator)

### 2.2 ปัญหาปัจจุบัน

| ปัญหา | รายละเอียด | ผลกระทบ |
|-------|-----------|---------|
| ไม่มีระบบกลาง | งานกระจายอยู่ใน LINE, Excel, กระดาษ | ข้อมูลไม่เป็นศูนย์กลาง สูญหายง่าย |
| ติดตามงานไม่ได้ | ไม่รู้สถานะงาน งานตกหล่น | ประสิทธิภาพลดลง งานล่าช้า |
| รายงานผู้บริหารยาก | ต้องรวบรวมข้อมูลทำรายงานด้วยมือ | เสียเวลา ข้อมูลไม่ทันสมัย |

### 2.3 เป้าหมายของระบบ

1. สร้างระบบกลางสำหรับจัดการงานทั้งหน่วยงาน
2. มอบหมาย ติดตาม และรายงานสถานะงานได้อย่างชัดเจน
3. จัดการโครงการและติดตาม KPI ของหน่วยงาน
4. สร้าง Dashboard และรายงานสำหรับผู้บริหาร
5. Self-host บน server มหาวิทยาลัย

---

## 3. ขอบเขตของระบบ

### 3.1 ขอบเขตภายใน (In Scope)

- ระบบจัดการงาน (Task Management) สำหรับผู้บริหารและเจ้าหน้าที่
- ระบบจัดการโครงการ (Project Management)
- ระบบติดตาม KPI
- Dashboard สำหรับผู้บริหาร
- ระบบรายงาน (PDF/Excel Export)
- ระบบแจ้งเตือน (LINE Notify + Email)
- ระบบยืนยันตัวตนผ่าน SSO มหาวิทยาลัย

### 3.2 ขอบเขตภายนอก (Out of Scope)

- ระบบจองห้องประชุม (อาจพัฒนาในเฟสถัดไป)
- ระบบการเงิน/การเช่าพื้นที่ (อาจพัฒนาในเฟสถัดไป)
- พอร์ทัลสำหรับผู้ใช้บริการภายนอก
- แอปพลิเคชันมือถือ (Mobile App)

---

## 4. กลุ่มผู้ใช้งาน

### 4.1 จำนวนผู้ใช้

ประมาณ 20-100 คน (เจ้าหน้าที่ภายในหน่วยงาน)

### 4.2 บทบาทและสิทธิ์ (RBAC)

ระบบใช้ **2 บทบาทระดับระบบ (Global Role)** + **สิทธิ์ระดับ Workspace/Project**

| บทบาทระดับระบบ | จำนวนประมาณ | หน้าที่หลัก |
|---------------|------------|-----------|
| **Admin** | 1-3 คน | จัดการระบบทั้งหมด จัดการผู้ใช้ ดูข้อมูลทุก workspace |
| **Staff** | 15-90 คน | ทำงานตามสิทธิ์ที่ได้รับในแต่ละ workspace/project |

สิทธิ์เฉพาะเจาะจงกำหนดที่ระดับ **Workspace** และ **Project**:

**สิทธิ์ระดับ Workspace** (`workspace_members`):
| สิทธิ์ | คำอธิบาย |
|-------|---------|
| owner | สร้าง workspace เป็นเจ้าของ แก้ไข/ลบ workspace ได้, เพิ่ม/ลบสมาชิก, กำหนดสถานะ |
| editor | สร้าง/แก้ไขงานใน workspace, มอบหมายงาน, เปลี่ยนสถานะ |
| viewer | ดูข้อมูลใน workspace ได้อย่างเดียว |

**สิทธิ์ระดับ Project** (`project_members`):
| สิทธิ์ | คำอธิบาย |
|-------|---------|
| owner | แก้ไข/ลบโครงการ เพิ่ม/ลบสมาชิก จัดการ KPI |
| member | สร้าง/แก้ไขงานในโครงการ อัปเดตสถานะ |
| viewer | ดูข้อมูลโครงการได้อย่างเดียว |

### 4.3 ตารางสิทธิ์ (Global Role + Workspace/Project Permission)

| ฟีเจอร์ | Admin | Staff (ws owner/editor) | Staff (ws viewer) | Staff (ไม่มีสิทธิ์) |
|---------|-------|------|--------|---------|
| จัดการ Workspace | ทั้งหมด | ของตัวเอง (owner) | - | - |
| เพิ่ม/ลบสมาชิก Workspace | ✓ | owner เท่านั้น | - | - |
| สร้างโครงการ | ✓ | ✓ | - | - |
| ลบโครงการ | ✓ | project owner | - | - |
| สร้างงาน | ✓ | ✓ | - | - |
| มอบหมายงานให้คนอื่น | ✓ | ✓ | - | - |
| ลบงาน | ✓ | ของตัวเอง | - | - |
| ดู Dashboard | ทั้งหมด | Workspace ตัวเอง | ดูได้อย่างเดียว | - |
| Export รายงาน | ✓ | Workspace ตัวเอง | ✓ | - |
| จัดการผู้ใช้ | ✓ | - | - | - |

---

## 5. ข้อกำหนดเชิงฟังก์ชัน (Functional Requirements)

### 5.1 ระบบยืนยันตัวตนและการจัดการสิทธิ์ (Auth & RBAC)

| ID | ข้อกำหนด | ความสำคัญ |
|----|---------|----------|
| FR-AUTH-01 | ผู้ใช้เข้าสู่ระบบผ่าน SSO ของมหาวิทยาลัย (OAuth2/CAS/LDAP) | สูง |
| FR-AUTH-02 | ระบบจัดการ JWT token พร้อม refresh mechanism | สูง |
| FR-AUTH-03 | ระบบควบคุมสิทธิ์ 2 ระดับระบบ (admin/staff) + สิทธิ์ระดับ workspace/project | สูง |
| FR-AUTH-04 | Admin จัดการบทบาทผู้ใช้ได้ | สูง |
| FR-AUTH-05 | ระบบ logout + ลบ session | กลาง |

### 5.2 ระบบจัดการ Workspace

| ID | ข้อกำหนด | ความสำคัญ |
|----|---------|----------|
| FR-WS-01 | สร้าง/แก้ไข/ลบ Workspace ได้ | สูง |
| FR-WS-02 | กำหนดประเภท Workspace (rental, consulting, training, incubation, general) | สูง |
| FR-WS-03 | กำหนด custom statuses ของแต่ละ Workspace | สูง |
| FR-WS-04 | กำหนดสีของ Workspace และ Status ได้ | กลาง |
| FR-WS-05 | เพิ่ม/ลบสมาชิก Workspace พร้อมกำหนดสิทธิ์ (owner, editor, viewer) | สูง |

### 5.3 ระบบจัดการงาน (Task Management)

| ID | ข้อกำหนด | ความสำคัญ |
|----|---------|----------|
| FR-TASK-01 | สร้าง/แก้ไข/ลบงานได้ พร้อม title, description, priority, due date | สูง |
| FR-TASK-02 | มอบหมายงานให้ผู้รับผิดชอบ (Assignee) | สูง |
| FR-TASK-03 | เปลี่ยนสถานะงานได้ (ตาม custom statuses ของ Workspace) | สูง |
| FR-TASK-04 | สร้าง Subtask (งานย่อย) ได้ | สูง |
| FR-TASK-05 | กำหนด Priority: Urgent, High, Normal, Low | สูง |
| FR-TASK-06 | เพิ่ม/ลบแท็ก (Tags) ให้งานได้ | กลาง |
| FR-TASK-07 | เพิ่มความคิดเห็น (Comments) ในงานได้ | สูง |
| FR-TASK-08 | แนบไฟล์ (Attachments) ในงานได้ | กลาง |
| FR-TASK-09 | ติดตามงาน (Watch/Follow) ได้ | ต่ำ |

### 5.4 มุมมองงาน (Task Views)

| ID | ข้อกำหนด | ความสำคัญ |
|----|---------|----------|
| FR-VIEW-01 | **Kanban Board** — แสดงงานแยกตามสถานะ ลากเพื่อเปลี่ยนสถานะได้ | สูง |
| FR-VIEW-02 | **List View** — แสดงงานเป็นตาราง พร้อม sorting, filtering, pagination | สูง |
| FR-VIEW-03 | **Calendar View** — แสดงงานตาม due date ในรูปแบบปฏิทิน | กลาง |
| FR-VIEW-04 | **Gantt Chart** — แสดง timeline โครงการพร้อม dependencies | กลาง |
| FR-VIEW-05 | สลับมุมมองได้ (List ↔ Kanban ↔ Calendar) | สูง |

### 5.5 ระบบจัดการโครงการและ KPI

| ID | ข้อกำหนด | ความสำคัญ |
|----|---------|----------|
| FR-PROJ-01 | สร้าง/แก้ไข/ลบโครงการได้ ภายใต้ Workspace | สูง |
| FR-PROJ-02 | กำหนดสมาชิกโครงการ (owner, member, viewer) | สูง |
| FR-PROJ-03 | กำหนดสถานะโครงการ: planning, active, on_hold, completed, cancelled | สูง |
| FR-PROJ-04 | คำนวณ % progress อัตโนมัติจากงานที่เสร็จ | สูง |
| FR-KPI-01 | สร้าง/แก้ไข KPI ในโครงการได้ (name, target, current, unit, period) | สูง |
| FR-KPI-02 | อัปเดตค่า KPI ปัจจุบันได้ | สูง |
| FR-KPI-03 | แสดง KPI ย้อนหลัง (history tracking) | กลาง |
| FR-KPI-04 | รายงาน KPI รายไตรมาส | กลาง |

### 5.6 Dashboard สำหรับผู้บริหาร

| ID | ข้อกำหนด | ความสำคัญ |
|----|---------|----------|
| FR-DASH-01 | แสดงสถิติภาพรวม: จำนวนงานทั้งหมด, กำลังดำเนินการ, เสร็จสิ้น | สูง |
| FR-DASH-02 | กราฟสถานะงานแยกตาม priority, assignee, workspace | สูง |
| FR-DASH-03 | แถบความคืบหน้าของโครงการ | สูง |
| FR-DASH-04 | กราฟ KPI achievement | กลาง |
| FR-DASH-05 | การกระจายภาระงานของเจ้าหน้าที่ (workload) | กลาง |
| FR-DASH-06 | แจ้งเตือนงานใกล้ deadline | กลาง |
| FR-DASH-07 | อัปเดตข้อมูลแบบ real-time (WebSocket) | กลาง |

### 5.7 ระบบรายงาน

| ID | ข้อกำหนด | ความสำคัญ |
|----|---------|----------|
| FR-RPT-01 | สร้างรายงานสรุปรายเดือน/รายไตรมาส | สูง |
| FR-RPT-02 | Export เป็น PDF | สูง |
| FR-RPT-03 | Export เป็น Excel | สูง |
| FR-RPT-04 | เลือกช่วงวันที่ (date range filter) | กลาง |
| FR-RPT-05 | สร้างสรุปรายสัปดาห์อัตโนมัติ | ต่ำ |

### 5.8 ระบบแจ้งเตือน

| ID | ข้อกำหนด | ความสำคัญ |
|----|---------|----------|
| FR-NOTIF-01 | แจ้งเตือนในแอป (in-app notification center) | สูง |
| FR-NOTIF-02 | แจ้งเตือนผ่าน LINE Notify | สูง |
| FR-NOTIF-03 | แจ้งเตือนผ่าน Email | กลาง |
| FR-NOTIF-04 | ผู้ใช้ตั้งค่าการแจ้งเตือนได้ (เปิด/ปิดตามประเภท) | กลาง |
| FR-NOTIF-05 | แจ้งเตือนเมื่อ: ได้รับมอบหมาย, เปลี่ยนสถานะ, มีความคิดเห็นใหม่, ใกล้ deadline | สูง |
| FR-NOTIF-06 | สรุปรายวัน (daily digest) ผ่าน email | ต่ำ |

---

## 6. ข้อกำหนดเชิงเทคนิค (Non-Functional Requirements)

### 6.1 ประสิทธิภาพ (Performance)

| ข้อกำหนด | ค่าเป้าหมาย |
|---------|-----------|
| API response time | < 200ms (P95) |
| Dashboard load time | < 2 วินาที |
| รองรับผู้ใช้พร้อมกัน | >= 50 คน |
| Database query ที่ซับซ้อน | < 500ms |

### 6.2 ความปลอดภัย (Security)

| ข้อกำหนด | รายละเอียด |
|---------|-----------|
| Authentication | SSO มหาวิทยาลัย (OAuth2/CAS/LDAP) |
| Authorization | RBAC 2 ระดับระบบ (admin/staff) + workspace/project-level permissions |
| Data transmission | HTTPS ทุกการสื่อสาร |
| Password | ไม่จัดเก็บรหัสผ่าน (ใช้ SSO) |
| Session | JWT + refresh token |
| File upload | ตรวจสอบ file type + จำกัดขนาด <= 50MB |

### 6.3 ความพร้อมใช้งาน (Availability)

| ข้อกำหนด | รายละเอียด |
|---------|-----------|
| Uptime | >= 99% (ช่วงเวลาราชการ) |
| Backup | Database backup รายวัน |
| Recovery | Recovery time <= 4 ชั่วโมง |

### 6.4 ความเข้ากันได้ (Compatibility)

| ข้อกำหนด | รายละเอียด |
|---------|-----------|
| เบราว์เซอร์ | Chrome, Firefox, Safari (2 เวอร์ชันล่าสุด) |
| Responsive | รองรับ 1024px - 1920px (Desktop เป็นหลัก) |
| ภาษา | ภาษาไทยเป็นหลัก |

### 6.5 การปรับใช้ (Deployment)

| ข้อกำหนด | รายละเอียด |
|---------|-----------|
| Hosting | Self-host บน server มหาวิทยาลัย |
| Containerization | Docker + docker-compose |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |

---

## 7. สถาปัตยกรรมระบบ (System Architecture)

### 7.1 ภาพรวม

```
+----------------------------------------------------+
|                 Nginx (Reverse Proxy)               |
|                   Port 80/443                       |
+--------------------+-------------------------------+
|  Vue 3 SPA         |  ElysiaJS API Server           |
|  (Frontend)        |  (Backend)                     |
|  Port 5173 (dev)   |  Port 3000                     |
|                    |                                |
|  - Dashboard       |  - /api/auth/*                 |
|  - Kanban Board    |  - /api/workspaces/*           |
|  - Gantt Chart     |  - /api/projects/*             |
|  - List View       |  - /api/tasks/*                |
|  - Calendar        |  - /api/reports/*              |
|  - Reports         |  - /api/notifications/*        |
|                    |  - /ws (WebSocket)             |
+--------------------+-------------------------------+
|              PostgreSQL 16                          |
|              Redis 7 (Cache + Queue)                |
+----------------------------------------------------+
```

### 7.2 เทคโนโลยีที่ใช้

| ชั้น | เทคโนโลยี | เหตุผล |
|-----|----------|--------|
| Frontend | Vue 3 + TypeScript + Vite | ทีมถนัด |
| UI Framework | Naive UI | Component ครบ, รองรับ Thai locale |
| State Management | Pinia | Vue 3 standard |
| Backend | ElysiaJS (Bun) | ทีมถนัด, ประสิทธิภาพสูง |
| Database | PostgreSQL 16 | Self-host friendly, JSON, full-text search |
| ORM | Drizzle ORM | Type-safe, ทำงานกับ Bun ได้ดี |
| Real-time | WebSocket (ElysiaJS native) | อัปเดตสถานะ real-time |
| Auth | JWT + SSO proxy | รองรับ OAuth2/CAS |
| Notification | LINE Notify API + Nodemailer | ช่องทางที่ทีมใช้อยู่ |
| Export | ExcelJS + PDFKit | PDF/Excel generation |
| Charts | Apache ECharts | Dashboard visualization |
| Container | Docker + docker-compose | Deploy ง่าย, self-host |

---

## 8. โครงสร้างฐานข้อมูล (Database Schema)

### 8.1 Entity Relationship (สรุป)

```
users --< workspaces (owner)
users --< workspace_members
users --< projects (owner)
users --< tasks (assignee, reporter)
users --< comments
users --< notifications
users --< user_notification_settings (1:1)
users --< project_members

workspaces --< workspace_statuses
workspaces --< workspace_members
workspaces --< projects
workspaces --< tasks
workspaces --< tags

projects --< project_kpis
projects --< project_members
projects --< tasks

tasks --< tasks (self-ref: parent_id = subtasks)
tasks --< task_watchers
tasks --< task_tags >-- tags
tasks --< comments
tasks --< attachments
tasks --< activity_logs
tasks >-- workspace_statuses
```

### 8.2 ตารางหลัก

| ตาราง | จำนวนประมาณ (6 เดือน) | วัตถุประสงค์ |
|--------|---------------------|-----------|
| users | 20-100 | เก็บข้อมูลผู้ใช้ |
| workspaces | 5-20 | แบ่งงานตามประเภทบริการ |
| workspace_members | 50-500 | สมาชิกและสิทธิ์ระดับ workspace |
| workspace_statuses | 20-100 | สถานะที่กำหนดเองต่อ workspace |
| projects | 50-200 | โครงการต่างๆ |
| project_kpis | 100-500 | KPI ของแต่ละโครงการ |
| tasks | 5,000-50,000 | งานทั้งหมด |
| comments | 10,000-100,000 | ความคิดเห็น |
| attachments | 1,000-10,000 | ไฟล์แนบ |
| activity_logs | 50,000-500,000 | ประวัติการทำงาน |
| notifications | 10,000-100,000 | การแจ้งเตือน |

---

## 9. API Endpoints

### 9.1 Authentication

| Method | Endpoint | คำอธิบาย |
|--------|---------|---------|
| POST | /api/auth/login | SSO callback |
| POST | /api/auth/refresh | Refresh JWT |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | ข้อมูลผู้ใช้ปัจจุบัน |

### 9.2 Workspace

| Method | Endpoint | คำอธิบาย |
|--------|---------|---------|
| GET | /api/workspaces | แสดงรายการ |
| POST | /api/workspaces | สร้างใหม่ |
| GET | /api/workspaces/:id | ดูรายละเอียด |
| PUT | /api/workspaces/:id | แก้ไข |
| DELETE | /api/workspaces/:id | ลบ |

### 9.3 Project

| Method | Endpoint | คำอธิบาย |
|--------|---------|---------|
| GET | /api/projects | แสดงรายการ |
| POST | /api/projects | สร้างใหม่ |
| GET | /api/projects/:id | ดูรายละเอียด |
| PUT | /api/projects/:id | แก้ไข |
| DELETE | /api/projects/:id | ลบ |
| GET | /api/projects/:id/kpis | แสดง KPI |
| POST | /api/projects/:id/kpis | สร้าง KPI |
| PUT | /api/projects/:id/kpis/:kpiId | แก้ไข KPI |

### 9.4 Task

| Method | Endpoint | คำอธิบาย |
|--------|---------|---------|
| GET | /api/tasks | แสดงรายการ (filter ได้) |
| POST | /api/tasks | สร้างใหม่ |
| GET | /api/tasks/:id | ดูรายละเอียด |
| PUT | /api/tasks/:id | แก้ไข |
| DELETE | /api/tasks/:id | ลบ |
| GET | /api/tasks/:id/comments | แสดงความคิดเห็น |
| POST | /api/tasks/:id/comments | เพิ่มความคิดเห็น |
| POST | /api/tasks/:id/attachments | อัปโหลดไฟล์ |

### 9.5 Dashboard / Report / Notification

| Method | Endpoint | คำอธิบาย |
|--------|---------|---------|
| GET | /api/dashboard/overview | สถิติภาพรวม |
| GET | /api/dashboard/workload | การกระจายภาระงาน |
| GET | /api/dashboard/kpi-summary | สรุป KPI |
| GET | /api/reports/monthly | รายงานรายเดือน |
| GET | /api/reports/quarterly | รายงานรายไตรมาส |
| GET | /api/reports/export/pdf | Export PDF |
| GET | /api/reports/export/excel | Export Excel |
| GET | /api/notifications | แสดงรายการ |
| PUT | /api/notifications/:id/read | อ่านแล้ว |
| GET | /api/notification-settings | ดูการตั้งค่า |
| PUT | /api/notification-settings | แก้ไขการตั้งค่า |
| WebSocket | /ws | อัปเดต real-time |

---

## 10. แผนการพัฒนา (Development Timeline)

### Phase 1: Foundation (เดือนที่ 1)

| สัปดาห์ | งาน | Deliverable |
|---------|-----|------------|
| 1-2 | สร้าง monorepo, Docker, DB schema, project setup | โครงสร้างโปรเจคพร้อมทำงาน |
| 3-4 | SSO Auth, JWT, RBAC, UI Shell (Layout/Sidebar/Routing) | Login ผ่าน SSO ได้ เห็น Dashboard เปล่า |

### Phase 2: Core Task Management (เดือนที่ 2)

| สัปดาห์ | งาน | Deliverable |
|---------|-----|------------|
| 5-6 | Workspace CRUD, Task CRUD, Subtask, Tags | สร้าง/แก้ไขงานได้ |
| 7-8 | List view, Project CRUD, Activity log, Search | มอบหมายงานได้ เห็นใน List view |

### Phase 3: Views & Collaboration (เดือนที่ 3)

| สัปดาห์ | งาน | Deliverable |
|---------|-----|------------|
| 9-10 | Kanban board (DnD), Calendar view | ใช้ Kanban จัดการงานได้ |
| 11-12 | Comments, @mention, File upload, Task watchers | คอมเมนต์และแนบไฟล์ได้ |

### Phase 4: Project & KPI (เดือนที่ 4)

| สัปดาห์ | งาน | Deliverable |
|---------|-----|------------|
| 13-14 | Gantt chart, Milestones, Dependencies | เห็น timeline โครงการ |
| 15-16 | KPI CRUD, Progress calculation, KPI dashboard | ติดตาม KPI ได้ |

### Phase 5: Dashboard & Reports (เดือนที่ 5)

| สัปดาห์ | งาน | Deliverable |
|---------|-----|------------|
| 17-18 | Dashboard, Charts, WebSocket real-time | ผู้บริหารดูภาพรวมได้ |
| 19-20 | Report templates, PDF/Excel export | ส่งออกรายงานได้ |

### Phase 6: Notifications & Polish (เดือนที่ 6)

| สัปดาห์ | งาน | Deliverable |
|---------|-----|------------|
| 21-22 | LINE Notify, Email, In-app notifications | แจ้งเตือนครบทุกช่องทาง |
| 23-24 | UI polish, Testing, Deploy, Documentation | ระบบพร้อมใช้งาน production |

---

## 11. การวิเคราะห์ความเสี่ยง

| ความเสี่ยง | ระดับ | การบรรเทา |
|-----------|-------|----------|
| SSO integration ซับซ้อน | สูง | สำรวจ API มหาวิทยาลัยก่อน, เตรียม local auth เป็น fallback |
| Gantt chart performance | กลาง | ใช้ virtual scrolling, limit visible tasks |
| Self-host server spec จำกัด | กลาง | สำรวจ spec ก่อน, optimize query + indexing |
| 6 เดือน timeline แน่น | กลาง | แบ่ง phase ชัดเจน, MVP แต่ละ phase ต้องใช้ได้ |
| Bun runtime maturity | ต่ำ | ElysiaJS stable, มี fallback เป็น Node.js |
| ข้อมูลเยอะเกิน (activity_logs) | ต่ำ | สร้าง index, purge old logs อัตโนมัติ |

---

## 12. การทดสอบและตรวจรับ

### เกณฑ์การทดสอบแต่ละ Phase

| Phase | เกณฑ์ผ่าน |
|-------|----------|
| Phase 1 | Login ผ่าน SSO สำเร็จ, เห็น profile, สลับ role ได้ถูกต้อง |
| Phase 2 | CRUD task ครบ, มอบหมายงานได้, เปลี่ยนสถานะได้, List view + filter ได้ |
| Phase 3 | Kanban drag เปลี่ยนสถานะได้, Calendar แสดงงานตาม due date, คอมเมนต์และแนบไฟล์ได้ |
| Phase 4 | Gantt แสดง timeline ถูกต้อง, KPI update แล้วคำนวณ progress ได้ |
| Phase 5 | Dashboard แสดง real-time, Export PDF/Excel ได้ |
| Phase 6 | แจ้งเตือน LINE + Email ส่งถึง, ระบบทำงานบน production, API < 200ms, Dashboard < 2s |

---

## 13. ผู้มีส่วนได้ส่วนเสีย (Stakeholders)

| บทบาท | ความรับผิดชอบ |
|-------|------------|
| ผู้อำนวยการอุทยานเทคโนโลยี | อนุมัติโครงการ, กำหนดนโยบาย, ดู Dashboard/รายงาน |
| รองผู้อำนวยการ / หัวหน้าส่วน | จัดการ workspace, มอบหมายงาน, ติดตามโครงการ |
| เจ้าหน้าที่ | รับมอบหมาย, ทำงาน, รายงานผล, อัปเดตสถานะ |
| ฝ่าย IT มหาวิทยาลัย | จัดหา server, SSO access, network, security policy |

---

*เอกสารนี้จัดทำโดยระบบวิเคราะห์อัตโนมัติ ณ วันที่ 2026-04-17*
