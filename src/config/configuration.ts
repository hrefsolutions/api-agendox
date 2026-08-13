import { registerAs } from '@nestjs/config';

import { NodeEnv } from './env.validation';

/**
 * Parses a comma-separated CORS origins string into a value consumable by
 * Nest's `enableCors`. `*` (or empty) maps to "allow any origin".
 */
function parseCorsOrigins(raw: string | undefined): string[] | boolean {
  if (!raw || raw.trim() === '' || raw.trim() === '*') {
    return true;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Evita las URLs con doble barra al concatenar rutas (`https://app//login`). */
function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const appConfig = registerAs('app', () => ({
  nodeEnv: (process.env.NODE_ENV as NodeEnv | undefined) ?? NodeEnv.Development,
  isProduction: process.env.NODE_ENV === NodeEnv.Production,
  port: toInt(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiDefaultVersion: process.env.API_DEFAULT_VERSION ?? '1',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  /**
   * Public base URL of the dashboard app. Vive acá y no en `payment` porque ya
   * no la usa solo el checkout: también es el link de login que viaja en el mail
   * de bienvenida del alta.
   */
  dashboardUrl: stripTrailingSlash(process.env.APP_DASHBOARD_URL ?? 'http://localhost:3001'),
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL ?? '',
  poolMax: toInt(process.env.DATABASE_POOL_MAX, 10),
  ssl: toBoolean(process.env.DATABASE_SSL, false),
}));

export const authConfig = registerAs('auth', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  customerSecret: process.env.JWT_CUSTOMER_SECRET ?? '',
  customerTtl: process.env.JWT_CUSTOMER_TTL ?? '30m',
  otpTtlMinutes: toInt(process.env.OTP_TTL_MINUTES, 10),
  otpMaxAttempts: toInt(process.env.OTP_MAX_ATTEMPTS, 5),
  /** Ventana en la que se cuentan los códigos emitidos a un mismo email. */
  otpResendWindowMinutes: toInt(process.env.OTP_RESEND_WINDOW_MINUTES, 60),
  superAdminSecret: process.env.JWT_SUPERADMIN_SECRET ?? '',
  superAdminTtl: process.env.JWT_SUPERADMIN_TTL ?? '8h',
}));

export const mailConfig = registerAs('mail', () => ({
  provider: process.env.MAIL_PROVIDER ?? 'log',
  from: process.env.MAIL_FROM ?? 'Agendox <no-reply@agendox.local>',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: toInt(process.env.SMTP_PORT, 465),
    secure: toBoolean(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER ?? '',
    // `SMTP_PASS` es el nombre correcto; `APP_KEY` queda como fallback para no
    // romper los deploys que ya lo tienen seteado.
    pass: process.env.SMTP_PASS ?? process.env.APP_KEY ?? '',
  },
}));

export const pushConfig = registerAs('push', () => ({
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@agendox.local',
}));

export const paymentConfig = registerAs('payment', () => ({
  provider: process.env.PAYMENT_PROVIDER ?? 'mock',
  // La URL del dashboard (return URL del checkout) vive en `app.dashboardUrl`.
  // Public base URL of THIS API (used for the provider's webhook/notification URL).
  apiPublicUrl: process.env.API_PUBLIC_URL ?? 'http://localhost:3000',
  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN ?? '',
    webhookSecret: process.env.MP_WEBHOOK_SECRET ?? '',
  },
}));

export const swaggerConfig = registerAs('swagger', () => ({
  enabled: toBoolean(process.env.SWAGGER_ENABLED, true),
  path: process.env.SWAGGER_PATH ?? 'docs',
}));

export const logConfig = registerAs('log', () => ({
  level: process.env.LOG_LEVEL ?? 'info',
}));

/**
 * All configuration namespaces, loaded together by the ConfigModule.
 */
export const configurations = [
  appConfig,
  databaseConfig,
  authConfig,
  mailConfig,
  pushConfig,
  paymentConfig,
  swaggerConfig,
  logConfig,
];

export type AppConfig = ReturnType<typeof appConfig>;
export type DatabaseConfig = ReturnType<typeof databaseConfig>;
export type AuthConfig = ReturnType<typeof authConfig>;
export type MailConfig = ReturnType<typeof mailConfig>;
export type PushConfig = ReturnType<typeof pushConfig>;
export type PaymentConfig = ReturnType<typeof paymentConfig>;
export type SwaggerConfig = ReturnType<typeof swaggerConfig>;
export type LogConfig = ReturnType<typeof logConfig>;
