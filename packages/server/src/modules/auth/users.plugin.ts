import Elysia from 'elysia'
import { db } from '../../config/database'
import { users } from '../../db/schema'
import { or, ilike } from 'drizzle-orm'
import { authMiddleware } from '../../middleware/auth.middleware'

export const usersPlugin = new Elysia({ prefix: '/api/users' })
  .get('/', async ({ query }) => {
    const search = (query as Record<string, string>).search || ''
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .where(search ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)) : undefined)
      .limit(20)
    return { success: true, data: rows }
  }, {
    beforeHandle: [authMiddleware()],
  })
