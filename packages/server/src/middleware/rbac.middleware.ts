import { db } from '../config/database';
import { workspaceMembers, projectMembers } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { ForbiddenError } from '../shared/errors';
import type { JwtPayload, GlobalRole } from '../shared/types';

export function requireAdmin() {
  return {
    beforeHandle(ctx: { user: JwtPayload }) {
      if (ctx.user.role !== 'admin') {
        throw new ForbiddenError('Admin access required');
      }
    },
  };
}

export async function getWorkspacePermission(userId: string, workspaceId: string): Promise<string | null> {
  const [membership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);
  return membership?.role ?? null;
}

export async function getProjectPermission(userId: string, projectId: string): Promise<string | null> {
  const [membership] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
    .limit(1);
  return membership?.role ?? null;
}

export function canEditWorkspace(permission: string | null, userRole: GlobalRole): boolean {
  if (userRole === 'admin') return true;
  return permission === 'owner' || permission === 'editor';
}

export function canManageWorkspace(permission: string | null, userRole: GlobalRole): boolean {
  if (userRole === 'admin') return true;
  return permission === 'owner';
}

export function canEditProject(permission: string | null, userRole: GlobalRole): boolean {
  if (userRole === 'admin') return true;
  return permission === 'owner' || permission === 'member';
}
