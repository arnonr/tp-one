import Elysia from 'elysia';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const authPlugin = new Elysia({ prefix: '/api/auth' })
  .post('/login', async ({ body }) => AuthController.loginDev(body as { email: string }), {
    detail: { summary: 'Dev login — find user by email' },
  })
  .post('/refresh', async ({ user }) => AuthController.refreshToken(user.userId, user.role, user.email), {
    beforeHandle: [authMiddleware()],
    detail: { summary: 'Refresh JWT token' },
  })
  .get('/me', async ({ user }) => AuthController.getMe(user.userId), {
    beforeHandle: [authMiddleware()],
    detail: { summary: 'Get current user info' },
  })
  .post('/logout', async () => ({ success: true }), {
    beforeHandle: [authMiddleware()],
    detail: { summary: 'Logout (client discards token)' },
  });
