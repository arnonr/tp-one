import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/my-work" },
    { path: "/login", name: "login", component: () => import("@/views/LoginView.vue") },
    { path: "/my-work", name: "my-work", component: () => import("@/views/MyWorkView.vue"), meta: { title: "งานของฉัน" } },
    { path: "/dashboard", name: "dashboard", component: () => import("@/views/DashboardView.vue"), meta: { title: "Dashboard" } },
    { path: "/tasks", name: "tasks", component: () => import("@/views/TaskListView.vue"), meta: { title: "All Tasks" } },
    { path: "/tasks/board", name: "task-board", component: () => import("@/views/TaskBoardView.vue"), meta: { title: "Kanban Board" } },
    { path: "/tasks/:id", name: "task-detail", component: () => import("@/views/TaskListView.vue"), meta: { title: "Task Detail" } },
    { path: "/tasks/calendar", name: "task-calendar", component: () => import("@/views/TaskCalendarView.vue"), meta: { title: "ปฏิทิน" } },
    { path: "/workspaces", name: "workspaces", component: () => import("@/views/WorkspaceView.vue"), meta: { title: "พื้นที่ทำงาน" } },
    { path: "/projects", name: "projects", component: () => import("@/views/ProjectListView.vue"), meta: { title: "โครงการ" } },
    { path: "/projects/:id", name: "project-detail", component: () => import("@/views/ProjectDetailView.vue"), meta: { title: "รายละเอียดโครงการ" } },
    { path: "/plans", name: "plans", component: () => import("@/views/AnnualPlanView.vue"), meta: { title: "แผนปฏิบัติการ" } },
    { path: "/plans/:id", name: "plan-detail", component: () => import("@/views/PlanDetailView.vue"), meta: { title: "รายละเอียดแผน" } },
    { path: "/reports", name: "reports", component: () => import("@/views/ReportView.vue"), meta: { title: "รายงาน" } },
  ],
});

router.beforeEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} — TP-One` : "TP-One";
});

export default router;
