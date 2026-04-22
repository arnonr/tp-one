export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_comment'
  | 'task_due_soon'
  | 'project_update'
  | 'mention'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  lineToken: string | null;
  emailEnabled: boolean;
  notifyOnAssign: boolean;
  notifyOnStatus: boolean;
  notifyOnComment: boolean;
  notifyOnDueSoon: boolean;
  dailyDigest: boolean;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
}

export interface NotificationListParams {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  entityType?: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}