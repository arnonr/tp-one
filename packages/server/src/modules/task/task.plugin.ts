import Elysia from 'elysia';
import { TaskController } from './task.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const taskPlugin = new Elysia({ prefix: '/api/tasks' })
  .onBeforeHandle(authMiddleware())

  // Task CRUD
  .get('/', async ({ user, query }) => TaskController.list(user, query), {
    detail: { summary: 'List tasks with filters and pagination' },
  })
  .get('/:id', async ({ params }) => TaskController.getById(params), {
    detail: { summary: 'Get task by ID' },
  })
  .post('/', async ({ user, body }) => TaskController.create(user, body), {
    detail: { summary: 'Create task' },
  })
  .patch('/:id', async ({ user, params, body }) => TaskController.update(user, params, body), {
    detail: { summary: 'Update task' },
  })
  .delete('/:id', async ({ user, params }) => TaskController.remove(user, params), {
    detail: { summary: 'Delete task' },
  })

  // Subtasks
  .get('/:id/subtasks', async ({ params }) => TaskController.getSubtasks(params), {
    detail: { summary: 'Get subtasks' },
  })

  // Tags
  .get('/tags', async ({ query }) => TaskController.getTags(query), {
    detail: { summary: 'Get workspace tags' },
  })
  .post('/tags', async ({ user, body }) => TaskController.createTag(user, body), {
    detail: { summary: 'Create tag' },
  })
  .put('/:id/tags', async ({ user, params, body }) => TaskController.setTags(user, params, body), {
    detail: { summary: 'Set task tags' },
  })

  // Comments
  .get('/:id/comments', async ({ params }) => TaskController.getComments(params), {
    detail: { summary: 'Get task comments' },
  })
  .post('/:id/comments', async ({ user, params, body }) => TaskController.addComment(user, params, body), {
    detail: { summary: 'Add comment' },
  })
  .delete('/:id/comments/:commentId', async ({ user, params }) => TaskController.deleteComment(user, params), {
    detail: { summary: 'Delete comment' },
  })

  // Batch operations
  .post('/batch/status', async ({ user, body }) => TaskController.batchUpdateStatus(user, body), {
    detail: { summary: 'Batch update task statuses (Kanban drag)' },
  });
