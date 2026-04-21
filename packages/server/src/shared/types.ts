import type { GlobalRole, WorkspacePermission, ProjectPermission, TaskPriority } from './constants';

export interface JwtPayload {
  userId: string;
  role: GlobalRole;
  email: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: GlobalRole;
  avatarUrl?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface TaskFilter {
  workspaceId?: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: TaskPriority;
  search?: string;
  fiscalYear?: number;
  page?: number;
  pageSize?: number;
}

export interface MyWorkGroup {
  today: number;
  overdue: number;
  thisWeek: number;
  thisMonth: number;
  waiting: number;
}
