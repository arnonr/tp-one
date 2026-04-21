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
  NText,
} from "naive-ui";
import { h, computed, ref, onMounted } from "vue";
import {
  HomeOutline,
  CheckmarkCircleOutline,
  CalendarOutline,
  FolderOutline,
  DocumentTextOutline,
  StatsChartOutline,
  PersonOutline,
  NotificationsOutline,
  SearchOutline,
  LogOutOutline,
  SettingsOutline,
  PersonCircleOutline,
} from "@vicons/ionicons5";
import LoginView from "../../views/LoginView.vue";
import { useAuthStore } from "../../stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const searchQuery = ref("");

const menuOptions = [
  {
    label: "งานของฉัน",
    key: "my-work",
    icon: () => h(NIcon, { size: 20 }, { default: () => h(PersonOutline) }),
  },
  {
    label: "แดชบอร์ด",
    key: "dashboard",
    icon: () => h(NIcon, { size: 20 }, { default: () => h(HomeOutline) }),
  },
  { type: "divider" as const, key: "d1" },
  {
    label: "งานทั้งหมด",
    key: "tasks",
    icon: () => h(NIcon, { size: 20 }, { default: () => h(CheckmarkCircleOutline) }),
  },
  {
    label: "โครงการ",
    key: "projects",
    icon: () => h(NIcon, { size: 20 }, { default: () => h(FolderOutline) }),
  },
  {
    label: "แผนปฏิบัติการ",
    key: "plans",
    icon: () => h(NIcon, { size: 20 }, { default: () => h(StatsChartOutline) }),
  },
  { type: "divider" as const, key: "d2" },
  {
    label: "รายงาน",
    key: "reports",
    icon: () => h(NIcon, { size: 20 }, { default: () => h(DocumentTextOutline) }),
  },
];

const activeKey = computed(() => {
  const name = route.name as string;
  if (name === "my-work") return "my-work";
  if (name === "task-board" || name === "task-calendar") return "tasks";
  if (name === "plan-detail") return "plans";
  if (name === "project-detail") return "projects";
  return name;
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
});
</script>

<template>
  <LoginView v-if="!authStore.isAuthenticated" />
  <NLayout v-else has-sider style="height: 100vh">
    <NLayoutSider
      bordered
      :width="260"
      :native-scrollbar="false"
      content-class="sider-content"
      content-style="padding: 0;"
    >
      <div class="sider-header">
        <div class="sider-brand">
          <div class="sider-logo">TP</div>
          <div>
            <div class="sider-title">TP-One</div>
            <div class="sider-subtitle">อุทยานเทคโนโลยี</div>
          </div>
        </div>
      </div>
      <div class="sider-menu-wrapper">
        <NMenu
          :value="activeKey"
          :options="menuOptions"
          @update:value="handleMenuUpdate"
        />
      </div>
      <div class="sider-footer">
        <div class="sider-version">v1.0.0-dev</div>
      </div>
    </NLayoutSider>
    <NLayout>
      <header class="app-header">
        <div class="header-left">
          <NInput
            v-model:value="searchQuery"
            placeholder="ค้นหางาน โครงการ แผนปฏิบัติการ..."
            clearable
            class="search-input"
          >
            <template #prefix>
              <NIcon :size="18" color="var(--color-text-tertiary)">
                <SearchOutline />
              </NIcon>
            </template>
          </NInput>
        </div>
        <div class="header-actions">
          <NBadge :value="0" :max="99">
            <div class="notification-btn">
              <NIcon :size="22" color="var(--color-text-secondary)">
                <NotificationsOutline />
              </NIcon>
            </div>
          </NBadge>
          <div class="header-divider" />
          <NDropdown :options="userDropdownOptions" @select="handleUserAction">
            <div class="user-trigger">
              <NAvatar round :size="32" class="user-avatar">
                {{ authStore.user?.name?.charAt(0) || "?" }}
              </NAvatar>
              <div class="user-info">
                <NText class="user-name">{{ authStore.user?.name || "ผู้ใช้" }}</NText>
                <NText class="user-role" depth="3">{{ authStore.user?.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่" }}</NText>
              </div>
            </div>
          </NDropdown>
        </div>
      </header>
      <main class="main-content">
        <router-view />
      </main>
    </NLayout>
  </NLayout>
</template>

<style scoped>
/* ── Sidebar ── */
.sider-content {
  display: flex;
  flex-direction: column;
}

.sider-header {
  padding: var(--space-lg) var(--space-lg) var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
}

.sider-brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.sider-logo {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: white;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--text-sm);
  flex-shrink: 0;
}

.sider-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text);
  line-height: var(--leading-tight);
}

.sider-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.sider-menu-wrapper {
  flex: 1;
  padding: var(--space-sm) var(--space-xs);
}

.sider-footer {
  padding: var(--space-sm) var(--space-lg);
  border-top: 1px solid var(--color-border-light);
}

.sider-version {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* ── Header ── */
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-xl);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: var(--z-header);
}

.header-left {
  flex: 1;
  max-width: 480px;
}

.search-input {
  width: 100%;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: var(--space-lg);
}

.notification-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.notification-btn:hover {
  background: var(--color-surface-variant);
}

.header-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
  margin: 0 var(--space-xs);
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  padding: var(--space-2xs) var(--space-sm);
  border-radius: var(--radius-md);
  transition: background var(--duration-fast) var(--ease-out);
}

.user-trigger:hover {
  background: var(--color-surface-variant);
}

.user-avatar {
  background: var(--color-primary-lighter);
  color: var(--color-primary);
  font-weight: 600;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: var(--leading-tight);
}

.user-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.user-role {
  font-size: var(--text-xs);
}

/* ── Main Content ── */
.main-content {
  padding: var(--space-xl);
  min-height: calc(100vh - var(--header-height));
  background: var(--color-background);
}
</style>
