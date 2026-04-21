import { env } from 'bun';

export const config = {
  port: env.PORT || 3019,
  databaseUrl: env.DATABASE_URL || 'postgresql://tp_admin:changeme@localhost:5433/tp_one',
  redisUrl: env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
  nodeEnv: env.NODE_ENV || 'development',
  corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
  uploadDir: env.UPLOAD_DIR || '/data/uploads',
  telegramBotToken: env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: env.TELEGRAM_CHAT_ID || '',
  oidcIssuer: env.OIDC_ISSUER || '',
  oidcClientId: env.OIDC_CLIENT_ID || '',
  oidcClientSecret: env.OIDC_CLIENT_SECRET || '',
  oidcRedirectUri: env.OIDC_REDIRECT_URI || 'http://localhost:3019/api/auth/callback',
} as const;

export type Config = typeof config;
