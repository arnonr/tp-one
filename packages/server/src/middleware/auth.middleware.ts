import { AuthService } from '../modules/auth/auth.service';
import { UnauthorizedError } from '../shared/errors';
import type { JwtPayload } from '../shared/types';

export function authMiddleware() {
  return {
    beforeHandle(ctx: { request: Request; user: JwtPayload }) {
      const authHeader = ctx.request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid authorization header');
      }

      const token = authHeader.slice(7);
      try {
        ctx.user = AuthService.verifyToken(token);
      } catch {
        throw new UnauthorizedError('Invalid or expired token');
      }
    },
  };
}

export function requireRole(...roles: Array<'admin' | 'staff'>) {
  return {
    beforeHandle(ctx: { user: JwtPayload }) {
      if (!ctx.user) {
        throw new UnauthorizedError();
      }
      if (!roles.includes(ctx.user.role)) {
        throw new UnauthorizedError('Insufficient permissions');
      }
    },
  };
}
