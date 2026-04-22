import Elysia from 'elysia';
import { TemplateController } from './template.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const templatePlugin = new Elysia({ prefix: '/api/templates' })
  .onBeforeHandle(authMiddleware())

  .get('/', async ({ query }) => TemplateController.list(query), {
    detail: { summary: 'List task templates' },
  })
  .get('/:id', async ({ params }) => TemplateController.getById(params), {
    detail: { summary: 'Get template with items' },
  })
  .post('/', async ({ user, body }) => TemplateController.create(user, body), {
    detail: { summary: 'Create template' },
  })
  .patch('/:id', async ({ user, params, body }) => TemplateController.update(user, params, body), {
    detail: { summary: 'Update template' },
  })
  .delete('/:id', async ({ user, params }) => TemplateController.remove(user, params), {
    detail: { summary: 'Delete template' },
  })
  .post('/:id/instantiate', async ({ user, params, body }) => TemplateController.instantiate(user, params, body), {
    detail: { summary: 'Create tasks from template' },
  });
