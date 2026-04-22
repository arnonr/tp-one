<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import {
  NLayout,
  NLayoutSider,
  NMenu,
  NIcon,
  NInput,
  NAvatar,
  NDropdown,
  NBadge,
  NConfigProvider,
} from "naive-ui";
import { h, computed, ref, onMounted, onUnmounted, watch } from "vue";
import {
  HomeOutline,
  CheckmarkCircleOutline,
  FolderOutline,
  DocumentTextOutline,
  StatsChartOutline,
  PersonOutline,
  NotificationsOutline,
  SearchOutline,
  LogOutOutline,
  SettingsOutline,
  PersonCircleOutline,
  ChevronUpOutline,
  MenuOutline,
  CloseOutline,
  ChevronBackOutline,
  ChevronForwardOutline,
  GridOutline,
} from "@vicons/ionicons5";
import LoginView from "../../views/LoginView.vue";
import NotificationPanel from "./NotificationPanel.vue";
import QuickNotePanel from "./QuickNotePanel.vue";
import { useNotificationStore } from "@/stores/notification";
import { useAuthStore } from "../../stores/auth";
import WorkspaceSelector from "./WorkspaceSelector.vue";
import { useWorkspaceStore } from "@/stores/workspace";
import { useQuickNoteStore } from "@/stores/quick-note";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const wsStore = useWorkspaceStore();
const notifStore = useNotificationStore();
const noteStore = useQuickNoteStore();
const searchQuery = ref("");
const isMobile = ref(false);
const mobileOpen = ref(false);
const siderCollapsed = ref(false);

function checkMobile() {
  isMobile.value = window.innerWidth < 1024;
}

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);

  if (authStore.isAuthenticated && !authStore.user) {
    try {
      authStore.fetchMe();
    } catch {
      authStore.logout();
    }
  }
  wsStore.fetchWorkspaces();
  notifStore.startPolling();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  notifStore.stopPolling();
});

const darkMenuTheme = {
  Menu: {
    color: "transparent",
    itemColorHover: "rgba(255, 255, 255, 0.07)",
    itemColorActive: "rgba(59, 130, 246, 0.18)",
    itemColorActiveHover: "rgba(59, 130, 246, 0.24)",
    itemColorActiveCollapsed: "rgba(59, 130, 246, 0.18)",
    itemTextColor: "rgba(255, 255, 255, 0.6)",
    itemTextColorHover: "rgba(255, 255, 255, 0.9)",
    itemTextColorActive: "#ffffff",
    itemTextColorChildActive: "#ffffff",
    itemIconColor: "rgba(255, 255, 255, 0.4)",
    itemIconColorHover: "rgba(255, 255, 255, 0.75)",
    itemIconColorActive: "#60a5fa",
    itemIconColorActiveHover: "#93c5fd",
    itemIconColorChildActive: "#60a5fa",
    itemIconColorCollapsed: "rgba(255, 255, 255, 0.4)",
    itemIconColorActiveCollapsed: "#60a5fa",
    itemIconColorHoverCollapsed: "rgba(255, 255, 255, 0.75)",
    arrowColor: "rgba(255, 255, 255, 0.3)",
    arrowColorHover: "rgba(255, 255, 255, 0.6)",
    arrowColorActive: "rgba(255, 255, 255, 0.75)",
    arrowColorChildActive: "rgba(255, 255, 255, 0.75)",
    groupTextColor: "rgba(255, 255, 255, 0.28)",
    dividerColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    itemHeight: "40px",
    fontSize: "14px",
  },
};

const menuOptions = [
  {
    label: "งานของฉัน",
    key: "my-work",
    icon: () => h(NIcon, { size: 18 }, { default: () => h(PersonOutline) }),
  },
  {
    label: "แดชบอร์ด",
    key: "dashboard",
    icon: () => h(NIcon, { size: 18 }, { default: () => h(HomeOutline) }),
  },
  { type: "divider" as const, key: "d1" },
  {
    label: "พื้นที่ทำงาน",
    key: "workspaces",
    icon: () => h(NIcon, { size: 18 }, { default: () => h(GridOutline) }),
  },
  {
    label: "งานทั้งหมด",
    key: "tasks",
    icon: () => h(NIcon, { size: 18 }, { default: () => h(CheckmarkCircleOutline) }),
  },
  {
    label: "โครงการ",
    key: "projects",
    icon: () => h(NIcon, { size: 18 }, { default: () => h(FolderOutline) }),
  },
  {
    label: "แผนปฏิบัติการ",
    key: "plans",
    icon: () => h(NIcon, { size: 18 }, { default: () => h(StatsChartOutline) }),
  },
  { type: "divider" as const, key: "d2" },
  {
    label: "รายงาน",
    key: "reports",
    icon: () => h(NIcon, { size: 18 }, { default: () => h(DocumentTextOutline) }),
  },
];

const activeKey = computed(() => {
  const name = route.name as string;
  if (name === "task-board" || name === "task-calendar") return "tasks";
  if (name === "plan-detail") return "plans";
  if (name === "project-detail") return "projects";
  return name;
});

const currentPageTitle = computed(() => {
  const titleMap: Record<string, string> = {
    "my-work": "งานของฉัน",
    dashboard: "แดชบอร์ด",
    workspaces: "พื้นที่ทำงาน",
    tasks: "All Tasks",
    "task-board": "บอร์ดงาน",
    "task-calendar": "ปฏิทินงาน",
    projects: "โครงการ",
    "project-detail": "รายละเอียดโครงการ",
    plans: "แผนปฏิบัติการรายปี",
    "plan-detail": "รายละเอียดแผน",
    reports: "รายงาน",
  };
  return titleMap[route.name as string] || "TP-One";
});

const userDropdownOptions = [
  {
    label: "โปรไฟล์",
    key: "profile",
    icon: () => h(NIcon, null, { default: () => h(PersonCircleOutline) }),
  },
  {
    label: "ตั้งค่า",
    key: "settings",
    icon: () => h(NIcon, null, { default: () => h(SettingsOutline) }),
  },
  { type: "divider" as const, key: "d1" },
  {
    label: "ออกจากระบบ",
    key: "logout",
    icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }),
  },
];

function handleMenuUpdate(key: string) {
  router.push({ name: key });
}

function handleUserAction(key: string) {
  if (key === "logout") {
    authStore.logout();
    router.push("/login");
  }
}

onMounted(async () => {
  if (authStore.isAuthenticated && !authStore.user) {
    try {
      await authStore.fetchMe();
    } catch {
      authStore.logout();
    }
  }
  await wsStore.fetchWorkspaces();
  notifStore.startPolling();
});

onUnmounted(() => {
  notifStore.stopPolling();
});
</script>

<template>
  <LoginView v-if="!authStore.isAuthenticated" />
  <template v-else>
    <NLayout :has-sider="!isMobile" style="height: 100vh">
      <!-- ── Desktop Sidebar ── -->
      <NLayoutSider v-if="!isMobile" :width="siderCollapsed ? 64 : 240" :native-scrollbar="false" :bordered="false"
        content-style="padding: 0; display: flex; flex-direction: column; height: 100%;" class="dark-sider">
        <div class="sider-brand" :class="{ 'sider-brand--collapsed': siderCollapsed }">
          <div class="brand-logo">TP</div>
          <Transition name="fade-slide">
            <div v-if="!siderCollapsed">
              <div class="brand-name">TP-One</div>
              <div class="brand-sub">อุทยานเทคโนโลยี</div>
            </div>
          </Transition>
        </div>
        <Transition name="fade-slide">
          <div v-if="!siderCollapsed" class="nav-section-label">เมนูหลัก</div>
        </Transition>
        <div class="sider-nav" :class="{ 'sider-nav--collapsed': siderCollapsed }">
          <NConfigProvider :theme-overrides="darkMenuTheme">
            <NMenu :value="activeKey" :options="menuOptions" :collapsed="siderCollapsed" :collapsed-width="64"
              :collapsed-icon-size="20" @update:value="handleMenuUpdate" />
          </NConfigProvider>
        </div>
        <NDropdown :options="userDropdownOptions" @select="handleUserAction" placement="right-end">
          <div class="sider-user" :class="{ 'sider-user--collapsed': siderCollapsed }">
            <NAvatar round :size="32" class="sider-user-avatar">
              {{ authStore.user?.name?.charAt(0) || "?" }}
            </NAvatar>
            <Transition name="fade-slide">
              <div v-if="!siderCollapsed" class="sider-user-text">
                <div class="sider-user-name">{{ authStore.user?.name || "ผู้ใช้" }}</div>
                <div class="sider-user-role">
                  {{ authStore.user?.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่" }}
                </div>
              </div>
            </Transition>
            <NIcon v-if="!siderCollapsed" :size="14" color="rgba(255,255,255,0.3)">
              <ChevronUpOutline />
            </NIcon>
          </div>
        </NDropdown>
        <!-- Collapse toggle button -->
        <button class="collapse-btn" @click="siderCollapsed = !siderCollapsed">
          <NIcon :size="16" color="rgba(255,255,255,0.5)">
            <ChevronBackOutline v-if="!siderCollapsed" />
            <ChevronForwardOutline v-else />
          </NIcon>
        </button>
      </NLayoutSider>

      <!-- ── Main Area ── -->
      <NLayout>
        <header class="app-header">
          <!-- Hamburger (mobile only) -->
          <button v-if="isMobile" class="hamburger-btn" @click="mobileOpen = true">
            <NIcon :size="22" color="var(--color-text-secondary)">
              <MenuOutline />
            </NIcon>
          </button>
          <h1 class="header-title">{{ currentPageTitle }}</h1>
          <WorkspaceSelector />
          <div class="header-right">
            <NInput v-if="!isMobile" v-model:value="searchQuery" placeholder="ค้นหา..." clearable class="search-input">
              <template #prefix>
                <NIcon :size="15" color="var(--color-text-tertiary)">
                  <SearchOutline />
                </NIcon>
              </template>
            </NInput>
            <button class="quick-note-btn" title="บันทึกด่วน" @click="noteStore.togglePanel">
              <NIcon :size="18" color="var(--color-text-secondary)">
                <DocumentTextOutline />
              </NIcon>
            </button>
            <NBadge :value="3" :max="99">
              <NotificationPanel />
            </NBadge>
          </div>
        </header>
        <main class="main-content">
          <router-view />
        </main>
      </NLayout>
    </NLayout>

    <!-- ── Quick Note Panel ── -->
    <QuickNotePanel />

    <!-- ── Mobile Sidebar Drawer ── -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isMobile && mobileOpen" class="mobile-drawer">
          <div class="sider-brand">
            <div class="brand-logo">TP</div>
            <div>
              <div class="brand-name">TP-One</div>
              <div class="brand-sub">อุทยานเทคโนโลยี</div>
            </div>
            <button class="drawer-close-btn" @click="mobileOpen = false">
              <NIcon :size="20" color="rgba(255,255,255,0.5)">
                <CloseOutline />
              </NIcon>
            </button>
          </div>
          <div class="nav-section-label">เมนูหลัก</div>
          <div class="sider-nav">
            <NConfigProvider :theme-overrides="darkMenuTheme">
              <NMenu :value="activeKey" :options="menuOptions" @update:value="handleMenuUpdate" />
            </NConfigProvider>
          </div>
          <NDropdown :options="userDropdownOptions" @select="handleUserAction" placement="right-end">
            <div class="sider-user">
              <NAvatar round :size="32" class="sider-user-avatar">
                {{ authStore.user?.name?.charAt(0) || "?" }}
              </NAvatar>
              <div class="sider-user-text">
                <div class="sider-user-name">{{ authStore.user?.name || "ผู้ใช้" }}</div>
                <div class="sider-user-role">
                  {{ authStore.user?.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่" }}
                </div>
              </div>
              <NIcon :size="14" color="rgba(255,255,255,0.3)">
                <ChevronUpOutline />
              </NIcon>
            </div>
          </NDropdown>
        </div>
      </Transition>
      <Transition name="overlay">
        <div v-if="isMobile && mobileOpen" class="sidebar-overlay" @click="mobileOpen = false" />
      </Transition>
    </Teleport>
  </template>
</template>

<style scoped>
/* ── Desktop Sidebar ── */
:deep(.dark-sider.n-layout-sider) {
  background: #111827 !important;
  transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

:deep(.dark-sider .n-scrollbar-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  background: #111827;
}

:deep(.dark-sider .n-layout-sider-scroll-container) {
  background: #111827;
}

/* ── Shared Sidebar Styles ── */
.sider-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 18px 16px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

.sider-brand--collapsed {
  padding: 18px 0 14px;
  justify-content: center;
}

.brand-logo {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12px;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #f9fafb;
  line-height: 1.3;
}

.brand-sub {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.38);
  margin-top: 1px;
}

.nav-section-label {
  padding: 14px 20px 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28);
}

.sider-nav {
  flex: 1;
  padding: 0 8px;
  overflow-y: auto;
}

.sider-nav--collapsed {
  padding: 0;
}

.sider-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition: background 150ms ease;
  overflow: hidden;
}

.sider-user--collapsed {
  justify-content: center;
  padding: 10px 0 12px;
}

.sider-user:hover {
  background: rgba(255, 255, 255, 0.05);
}

.sider-user-avatar {
  background: rgba(59, 130, 246, 0.25) !important;
  color: #93c5fd !important;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.sider-user-text {
  flex: 1;
  min-width: 0;
}

.sider-user-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.82);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sider-user-role {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.37);
  margin-top: 1px;
}

/* ── Header ── */
.app-header {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.hamburger-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--duration-fast) var(--ease-out);
}

.hamburger-btn:hover {
  background: var(--color-surface-variant);
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.search-input {
  width: 220px;
}

.notif-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.notif-btn:hover {
  background: var(--color-surface-variant);
}

.quick-note-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.quick-note-btn:hover {
  background: var(--color-surface-variant);
}

/* ── Main Content ── */
.main-content {
  padding: 20px 20px;
  min-height: calc(100vh - 56px);
  background-color: var(--color-background);
  background-image: radial-gradient(circle, rgba(148, 163, 184, 0.2) 1px, transparent 1px);
  background-size: 20px 20px;
  overflow-y: auto;
}

@media (min-width: 1024px) {
  .main-content {
    padding: 24px 28px;
  }
}

/* ── Mobile Drawer ── */
.mobile-drawer {
  position: fixed;
  inset: 0 auto 0 0;
  width: 260px;
  background: #111827;
  z-index: 400;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
}

.drawer-close-btn {
  margin-left: auto;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.07);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.drawer-close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* ── Overlay ── */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 399;
  backdrop-filter: blur(2px);
}

/* ── Collapse Button ── */
.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 32px;
  background: none;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 150ms ease;
  flex-shrink: 0;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* ── Fade-slide Transition ── */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

/* ── Transitions ── */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.25s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
