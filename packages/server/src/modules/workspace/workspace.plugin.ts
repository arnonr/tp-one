import Elysia from 'elysia';
import { t } from 'elysia';
import { WorkspaceController } from './workspace.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const WORKSPACE_TYPES = ['rental', 'consulting', 'training', 'incubation', 'general'] as const;
const MEMBER_ROLES = ['owner', 'editor', 'viewer'] as const;

export const workspacePlugin = new Elysia({ prefix: '/api/workspaces' })
  .onBeforeHandle(authMiddleware())

  // Workspace CRUD
  .get('/', async ({ user, query }) => WorkspaceController.list(user!, query), {
    query: t.Object({
      type: t.Optional(t.Union(WORKSPACE_TYPES.map((v) => t.Literal(v)))),
      search: t.Optional(t.String({ maxLength: 255 })),
    }),
    detail: { summary: 'แสดงรายการพื้นที่ทำงาน' },
  })
  .get('/:id', async ({ user, params }) => WorkspaceController.getById(user!, params.id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    detail: { summary: 'ดูรายละเอียดพื้นที่ทำงาน' },
  })
  .post('/', async ({ user, body }) => WorkspaceController.create(user!, body), {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      type: t.Union(WORKSPACE_TYPES.map((v) => t.Literal(v))),
      color: t.Optional(t.String({ maxLength: 7 })),
      description: t.Optional(t.String({ maxLength: 2000 })),
    }),
    detail: { summary: 'สร้างพื้นที่ทำงานใหม่' },
  })
  .patch('/:id', async ({ user, params, body }) => WorkspaceController.update(user!, params.id, body), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      color: t.Optional(t.String({ maxLength: 7 })),
      description: t.Optional(t.String({ maxLength: 2000 })),
    }),
    detail: { summary: 'แก้ไขพื้นที่ทำงาน' },
  })
  .delete('/:id', async ({ user, params }) => WorkspaceController.remove(user!, params.id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    detail: { summary: 'ลบพื้นที่ทำงาน (soft delete)' },
  })

  // Custom Statuses
  .get('/:id/statuses', async ({ user, params }) => WorkspaceController.getStatuses(user!, params.id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    detail: { summary: 'ดูสถานะที่กำหนดเองของพื้นที่ทำงาน' },
  })
  .post('/:id/statuses', async ({ user, params, body }) => WorkspaceController.createStatus(user!, params.id, body), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      color: t.Optional(t.String({ maxLength: 7 })),
      sortOrder: t.Optional(t.String({ maxLength: 10 })),
      isDefault: t.Optional(t.Boolean()),
    }),
    detail: { summary: 'เพิ่มสถานะที่กำหนดเอง' },
  })
  .patch('/statuses/:statusId', async ({ user, params, body }) => WorkspaceController.updateStatus(user!, params.statusId, body), {
    params: t.Object({ statusId: t.String({ format: 'uuid' }) }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      color: t.Optional(t.String({ maxLength: 7 })),
      sortOrder: t.Optional(t.String({ maxLength: 10 })),
      isDefault: t.Optional(t.Boolean()),
    }),
    detail: { summary: 'แก้ไขสถานะ' },
  })
  .delete('/statuses/:statusId', async ({ user, params }) => WorkspaceController.deleteStatus(user!, params.statusId), {
    params: t.Object({ statusId: t.String({ format: 'uuid' }) }),
    detail: { summary: 'ลบสถานะ' },
  })

  // Members
  .get('/:id/members', async ({ user, params }) => WorkspaceController.getMembers(user!, params.id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    detail: { summary: 'ดูสมาชิกในพื้นที่ทำงาน' },
  })
  .post('/:id/members', async ({ user, params, body }) => WorkspaceController.addMember(user!, params.id, body), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Object({
      userId: t.String({ format: 'uuid' }),
      role: t.Union(MEMBER_ROLES.map((v) => t.Literal(v))),
    }),
    detail: { summary: 'เพิ่มสมาชิก' },
  })
  .patch('/:id/members/:userId', async ({ user, params, body }) => WorkspaceController.updateMember(user!, params.id, params.userId, body), {
    params: t.Object({ id: t.String({ format: 'uuid' }), userId: t.String({ format: 'uuid' }) }),
    body: t.Object({
      role: t.Union(MEMBER_ROLES.map((v) => t.Literal(v))),
    }),
    detail: { summary: 'เปลี่ยนบทบาทสมาชิก' },
  })
  .delete('/:id/members/:userId', async ({ user, params }) => WorkspaceController.removeMember(user!, params.id, params.userId), {
    params: t.Object({ id: t.String({ format: 'uuid' }), userId: t.String({ format: 'uuid' }) }),
    detail: { summary: 'ลบสมาชิกออกจากพื้นที่ทำงาน' },
  });
