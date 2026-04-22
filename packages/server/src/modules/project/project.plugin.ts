import Elysia from 'elysia';
import { ProjectController } from './project.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const projectPlugin = new Elysia({ prefix: '/api/projects' })
  .onBeforeHandle(authMiddleware())
  .get('/', async ({ query }) => ProjectController.list(query), {
    detail: { summary: 'List projects with optional filters' },
  });
