import { AuthService } from './auth.service';
import { db } from '../../config/database';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../../shared/errors';

export const AuthController = {
  async loginDev(body: { email: string }) {
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (!user) throw new NotFoundError('User', body.email);

    const token = AuthService.generateToken({
      userId: user.id,
      role: user.role as 'admin' | 'staff',
      email: user.email,
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },

  async getMe(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User');
    return { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
  },

  async refreshToken(userId: string, role: string, email: string) {
    const token = AuthService.generateToken({ userId, role: role as 'admin' | 'staff', email });
    return { token };
  },
};
