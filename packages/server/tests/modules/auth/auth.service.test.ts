import { describe, it, expect } from 'vitest';

describe('Auth Service', () => {
  describe('generateToken', () => {
    it('generates a JWT token with user payload', async () => {
      const { AuthService } = await import('../../../src/modules/auth/auth.service');
      const payload = { userId: 'test-uuid-1', role: 'staff' as const, email: 'test@example.com' };
      const token = AuthService.generateToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('verifies a valid token and returns payload', async () => {
      const { AuthService } = await import('../../../src/modules/auth/auth.service');
      const payload = { userId: 'test-uuid-1', role: 'staff' as const, email: 'test@example.com' };
      const token = AuthService.generateToken(payload);
      const decoded = AuthService.verifyToken(token);
      expect(decoded.userId).toBe('test-uuid-1');
      expect(decoded.role).toBe('staff');
    });

    it('rejects an invalid token', async () => {
      const { AuthService } = await import('../../../src/modules/auth/auth.service');
      expect(() => AuthService.verifyToken('invalid-token')).toThrow();
    });
  });
});
