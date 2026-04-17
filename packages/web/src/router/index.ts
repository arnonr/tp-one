import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: () => import("@/views/DashboardView.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
    },
    {
      path: "/tasks",
      name: "tasks",
      component: () => import("@/views/TaskBoardView.vue"),
    },
    {
      path: "/tasks/list",
      name: "task-list",
      component: () => import("@/views/TaskListView.vue"),
    },
    {
      path: "/tasks/calendar",
      name: "task-calendar",
      component: () => import("@/views/TaskCalendarView.vue"),
    },
    {
      path: "/projects",
      name: "projects",
      component: () => import("@/views/ProjectListView.vue"),
    },
    {
      path: "/projects/:id/gantt",
      name: "project-gantt",
      component: () => import("@/views/ProjectGanttView.vue"),
    },
    {
      path: "/reports",
      name: "reports",
      component: () => import("@/views/ReportView.vue"),
    },
  ],
});

export default router;
