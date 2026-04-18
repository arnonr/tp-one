<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { NLayout, NLayoutSider, NMenu, NIcon } from "naive-ui";
import { h, computed } from "vue";
import {
  HomeOutline,
  CheckmarkCircleOutline,
  CalendarOutline,
  FolderOutline,
  DocumentTextOutline,
  StatsChartOutline,
} from "@vicons/ionicons5";

const router = useRouter();
const route = useRoute();

const menuOptions = [
  { label: "แดชบอร์ด", key: "dashboard", icon: () => h(NIcon, null, { default: () => h(HomeOutline) }) },
  { label: "บอร์ดงาน", key: "tasks", icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }) },
  { label: "ปฏิทิน", key: "task-calendar", icon: () => h(NIcon, null, { default: () => h(CalendarOutline) }) },
  { label: "โครงการ", key: "projects", icon: () => h(NIcon, null, { default: () => h(FolderOutline) }) },
  { label: "แผนปฏิบัติการ", key: "plans", icon: () => h(NIcon, null, { default: () => h(StatsChartOutline) }) },
  { label: "รายงาน", key: "reports", icon: () => h(NIcon, null, { default: () => h(DocumentTextOutline) }) },
];

const activeKey = computed(() => {
  const name = route.name as string;
  if (name === "plan-detail") return "plans";
  return name;
});

function handleMenuUpdate(key: string) {
  router.push({ name: key });
}
</script>

<template>
  <NLayout has-sider style="height: 100vh">
    <NLayoutSider
      bordered
      :width="240"
      :native-scrollbar="false"
      content-class="layout-sider"
    >
      <div class="sider-header">
        <h2 class="sider-title">TP-One</h2>
        <p class="sider-subtitle">อุทยานเทคโนโลยี</p>
      </div>
      <NMenu
        :value="activeKey"
        :options="menuOptions"
        @update:value="handleMenuUpdate"
      />
    </NLayoutSider>
    <NLayout>
      <main class="main-content">
        <router-view />
      </main>
    </NLayout>
  </NLayout>
</template>

<style scoped>
.sider-header {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}
.sider-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-primary);
}
.sider-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
}
.main-content {
  padding: var(--space-xl);
  min-height: 100vh;
}
</style>
