import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import type { JwtPayload } from '../../shared/types';

export const AuthService = {
  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  },

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
  },

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  },

  async handleSsoCallback(_code: string) {
    throw new Error('SSO not configured yet. Use local auth for development.');
  },
};
