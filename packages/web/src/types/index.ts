export type UserRole = "admin" | "manager" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
}

export type WorkspaceType = "rental" | "consulting" | "training" | "incubation" | "general";

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  color?: string;
  description?: string;
  ownerId: string;
  isActive: boolean;
}

export interface WorkspaceStatus {
  id: string;
  workspaceId: string;
  name: string;
  color?: string;
  sortOrder: string;
  isDefault: boolean;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  ownerId: string;
  progress: string;
}

export type TaskPriority = "urgent" | "high" | "normal" | "low";

export interface Task {
  id: string;
  projectId?: string;
  workspaceId: string;
  parentId?: string;
  title: string;
  description?: string;
  statusId?: string;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  sortOrder: number;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  isRead: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
}
