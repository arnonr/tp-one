import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import { notificationService } from '@/services/notification';
import type { NotificationItem } from '@/services/notification';

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationItem[]>([]);
  const unreadCount = ref(0);
  const isLoading = ref(false);
  const currentPage = ref(1);
  const pageSize = ref(20);
  const total = ref(0);

  // Polling interval for real-time updates (30 seconds)
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const hasMore = computed(() => notifications.value.length < total.value);

  async function fetchNotifications(reset = false) {
    if (isLoading.value) return;
    isLoading.value = true;

    try {
      if (reset) {
        currentPage.value = 1;
        notifications.value = [];
      }

      const result = await notificationService.getNotifications({
        page: currentPage.value,
        pageSize: pageSize.value,
      });

      if (reset) {
        notifications.value = result.data;
      } else {
        notifications.value.push(...result.data);
      }
      total.value = result.total;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchUnreadCount() {
    unreadCount.value = await notificationService.getUnreadCount();
  }

  async function markAsRead(id: string) {
    await notificationService.markAsRead(id);
    const notification = notifications.value.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function markAllAsRead() {
    await notificationService.markAllAsRead();
    notifications.value.forEach(n => { n.isRead = true; });
    unreadCount.value = 0;
  }

  async function deleteNotification(id: string) {
    await notificationService.deleteNotification(id);
    const idx = notifications.value.findIndex(n => n.id === id);
    if (idx !== -1) {
      const notification = notifications.value[idx];
      notifications.value.splice(idx, 1);
      if (!notification.isRead) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
      total.value = Math.max(0, total.value - 1);
    }
  }

  function loadMore() {
    if (hasMore.value) {
      currentPage.value++;
      fetchNotifications(false);
    }
  }

  function startPolling(intervalMs = 30000) {
    stopPolling();
    // Initial fetch
    fetchUnreadCount();
    pollInterval = setInterval(() => {
      fetchUnreadCount();
    }, intervalMs);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    currentPage,
    pageSize,
    total,
    hasMore,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    startPolling,
    stopPolling,
  };
});