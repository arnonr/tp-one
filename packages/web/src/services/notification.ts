import api from './api';
import type { NotificationType } from '@/types';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListParams {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  entityType?: string;
}

export interface PaginatedNotifications {
  data: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function getNotifications(params: NotificationListParams = {}): Promise<PaginatedNotifications> {
  const { data } = await api.get('/notifications/', { params });
  return data;
}

async function getUnreadCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count');
  return data.data;
}

async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

async function markAllAsRead(): Promise<{ markedAsRead: number }> {
  const { data } = await api.patch('/notifications/read-all');
  return data.data;
}

async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

async function getSettings(): Promise<Record<string, unknown> | null> {
  const { data } = await api.get('/notifications/settings');
  return data.data;
}

async function updateSettings(settings: Record<string, unknown>): Promise<void> {
  await api.put('/notifications/settings', settings);
}

export const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getSettings,
  updateSettings,
};