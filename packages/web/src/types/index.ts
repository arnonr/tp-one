export type UserRole = "admin" | "staff";

export type WorkspaceMemberRole = "owner" | "editor" | "viewer";
export type ProjectMemberRole = "owner" | "member" | "viewer";

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

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
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

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
}

export type TaskPriority = "urgent" | "high" | "normal" | "low";

export interface TaskAssignee {
  userId: string;
  name: string;
}

export interface Task {
  id: string;
  projectId?: string;
  workspaceId: string;
  parentId?: string;
  title: string;
  description?: string;
  statusId?: string;
  priority: TaskPriority;
  assignees: TaskAssignee[];
  reporterId: string;
  fiscalYear?: number;
  budget?: string;
  estimatedHours?: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  sortOrder: number;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color?: string;
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

export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_comment'
  | 'task_due_soon'
  | 'project_update'
  | 'mention'
  | 'system';

export interface ApiError {
  message: string;
  statusCode: number;
}

// Annual Operational Plan
export type PlanStatus = "draft" | "active" | "completed";
export type IndicatorType = "amount" | "count" | "percentage";

export interface AnnualPlan {
  id: string;
  year: number;
  name: string;
  status: PlanStatus;
  createdById: string;
}

export interface PlanCategory {
  id: string;
  planId: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface PlanIndicator {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description?: string;
  targetValue: string;
  unit?: string;
  indicatorType: IndicatorType;
  assigneeId?: string;
  sortOrder: number;
}

export interface IndicatorUpdate {
  id: string;
  indicatorId: string;
  reportedValue: string;
  reportedMonth: number;
  reportedYear: number;
  progressPct?: string;
  note?: string;
  evidenceUrl?: string;
  reportedBy: string;
}
