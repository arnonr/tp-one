<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  NBadge,
  NPopover,
  NButton,
  NEmpty,
  NSpin,
  NIcon,
} from 'naive-ui';
import {
  NotificationsOutline,
  CheckmarkDoneOutline,
  TrashOutline,
} from '@vicons/ionicons5';
import { useNotificationStore } from '@/stores/notification';
import { useThaiDate } from '@/composables/useThaiDate';

const notifStore = useNotificationStore();
const { formatShort } = useThaiDate();
const panelOpen = ref(false);

onMounted(() => {
  notifStore.fetchUnreadCount();
});

function togglePanel() {
  panelOpen.value = !panelOpen.value;
  if (panelOpen.value) {
    notifStore.fetchNotifications(true);
  }
}

function handleMarkAllRead() {
  notifStore.markAllAsRead();
}

function handleMarkRead(id: string) {
  notifStore.markAsRead(id);
}

function handleDelete(id: string) {
  notifStore.deleteNotification(id);
}

function loadMore() {
  notifStore.loadMore();
}

function getNotifIcon(type: string): string {
  const icons: Record<string, string> = {
    task_assigned: '📋',
    task_status_changed: '🔄',
    task_comment: '💬',
    task_due_soon: '⏰',
    project_update: '📁',
    mention: '@',
    system: '⚙️',
  };
  return icons[type] || '🔔';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'เมื่อสักครู่';
  if (diffMins < 60) return `${diffMins} นาที`;
  if (diffHours < 24) return `${diffHours} ชม.`;
  if (diffDays < 7) return `${diffDays} วัน`;
  return formatShort(date);
}
</script>

<template>
  <NPopover
    v-model:show="panelOpen"
    trigger="click"
    placement="bottom-end"
    :width="380"
    content-class="notif-panel"
  >
    <template #trigger>
      <div class="notif-trigger">
        <NBadge :value="notifStore.unreadCount" :max="99" :show="notifStore.unreadCount > 0">
          <div class="notif-btn">
            <NIcon :size="20" color="var(--color-text-secondary)">
              <NotificationsOutline />
            </NIcon>
          </div>
        </NBadge>
      </div>
    </template>

    <div class="notif-panel-header">
      <h3 class="notif-panel-title">การแจ้งเตือน</h3>
      <NButton
        v-if="notifStore.unreadCount > 0"
        text
        size="small"
        @click="handleMarkAllRead"
      >
        <NIcon :size="14" style="margin-right: 4px">
          <CheckmarkDoneOutline />
        </NIcon>
        อ่านทั้งหมด
      </NButton>
    </div>

    <div class="notif-panel-list">
      <div v-if="notifStore.isLoading && notifStore.notifications.length === 0" class="notif-loading">
        <NSpin size="small" />
      </div>

      <NEmpty
        v-else-if="notifStore.notifications.length === 0"
        description="ไม่มีการแจ้งเตือน"
        class="notif-empty"
      />

      <template v-else>
        <div
          v-for="notif in notifStore.notifications"
          :key="notif.id"
          class="notif-item"
          :class="{ 'notif-item--unread': !notif.isRead }"
        >
          <div class="notif-icon">{{ getNotifIcon(notif.type) }}</div>
          <div class="notif-content">
            <div class="notif-title">{{ notif.title }}</div>
            <div v-if="notif.message" class="notif-message">{{ notif.message }}</div>
            <div class="notif-time">{{ formatTime(notif.createdAt) }}</div>
          </div>
          <div class="notif-actions">
            <button
              v-if="!notif.isRead"
              class="notif-action-btn"
              title="ทำเครื่องหมายว่าอ่านแล้ว"
              @click="handleMarkRead(notif.id)"
            >
              <NIcon :size="14" color="var(--color-text-tertiary)">
                <CheckmarkDoneOutline />
              </NIcon>
            </button>
            <button
              class="notif-action-btn"
              title="ลบ"
              @click="handleDelete(notif.id)"
            >
              <NIcon :size="14" color="var(--color-text-tertiary)">
                <TrashOutline />
              </NIcon>
            </button>
          </div>
        </div>

        <div v-if="notifStore.hasMore" class="notif-load-more">
          <NButton
            size="small"
            text
            :loading="notifStore.isLoading"
            @click="loadMore"
          >
            โหลดเพิ่มเติม
          </NButton>
        </div>
      </template>
    </div>
  </NPopover>
</template>

<style scoped>
.notif-trigger {
  cursor: pointer;
}

.notif-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: background var(--duration-fast) var(--ease-out);
}

.notif-btn:hover {
  background: var(--color-surface-variant);
}

.notif-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.notif-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.notif-panel-list {
  max-height: 420px;
  overflow-y: auto;
}

.notif-loading {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.notif-empty {
  padding: 32px 16px;
}

.notif-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  transition: background var(--duration-fast) var(--ease-out);
}

.notif-item:hover {
  background: var(--color-surface-variant);
}

.notif-item--unread {
  background: rgba(59, 130, 246, 0.04);
}

.notif-item--unread:hover {
  background: rgba(59, 130, 246, 0.08);
}

.notif-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.4;
}

.notif-message {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notif-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
}

.notif-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.notif-item:hover .notif-actions {
  opacity: 1;
}

.notif-action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.notif-action-btn:hover {
  background: var(--color-surface-variant);
}

.notif-load-more {
  display: flex;
  justify-content: center;
  padding: 12px;
}
</style>