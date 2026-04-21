import { AuthService } from '../modules/auth/auth.service';
import { UnauthorizedError } from '../shared/errors';
import type { JwtPayload } from '../shared/types';

export function authMiddleware() {
  return (ctx: any) => {
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
  };
}

export function requireRole(...roles: Array<'admin' | 'staff'>) {
  return (ctx: any) => {
    if (!ctx.user) {
      throw new UnauthorizedError();
    }
    if (!roles.includes((ctx.user as JwtPayload).role)) {
      throw new UnauthorizedError('Insufficient permissions');
    }
  };
}
