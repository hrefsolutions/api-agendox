import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

/**
 * Supported runtime environments.
 */
export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Supported transactional email transports.
 * `log` prints rendered emails to the console (dev); `smtp` delivers via
 * Nodemailer over SMTP (requires the `SMTP_*` variables below).
 */
export enum MailProvider {
  Log = 'log',
  Smtp = 'smtp',
}

/**
 * Supported payment gateways. `mock` fakes the checkout end-to-end for dev/tests
 * (no external calls); `mercadopago` uses the real preapproval (subscription) API.
 */
export enum PaymentProvider {
  Mock = 'mock',
  MercadoPago = 'mercadopago',
}

/** Coerces an env string to a number, leaving absent values untouched. */
const toNumber = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
};

/** Coerces an env string to a boolean, leaving absent values untouched. */
const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

/**
 * Strongly-typed, validated shape of the process environment.
 *
 * Validation runs once at bootstrap (see {@link validateEnv}); the app refuses
 * to start with an invalid or incomplete environment ("fail fast"). Optional
 * variables that are absent fall back to the runtime defaults defined in
 * `configuration.ts`.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  @Max(65535)
  PORT = 3000;

  @IsOptional()
  @IsString()
  API_PREFIX = 'api';

  @IsOptional()
  @IsString()
  API_DEFAULT_VERSION = '1';

  /**
   * Comma-separated list of allowed CORS origins.
   * Use `*` to allow any origin (not recommended for production).
   */
  @IsOptional()
  @IsString()
  CORS_ORIGINS = '*';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED = true;

  @IsOptional()
  @IsString()
  SWAGGER_PATH = 'docs';

  @IsOptional()
  @IsString()
  LOG_LEVEL = 'info';

  /**
   * PostgreSQL connection string, e.g.
   * postgresql://user:password@host:5432/database
   */
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(100)
  DATABASE_POOL_MAX = 10;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  DATABASE_SSL = false;

  /**
   * Secret used to sign staff **access** JWTs. Required (fail-fast): the app
   * must never boot without an explicit signing secret.
   */
  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  /** Access token lifetime, as a `jsonwebtoken` duration (e.g. `15m`). */
  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL = '15m';

  /** Secret used to sign staff **refresh** JWTs. Must differ from the access secret. */
  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  /** Refresh token lifetime, as a `jsonwebtoken` duration (e.g. `30d`). */
  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL = '30d';

  /** Secret used to sign **customer** (OTP) session JWTs. Must differ from staff secrets. */
  @IsString()
  @IsNotEmpty()
  JWT_CUSTOMER_SECRET!: string;

  /** Customer session lifetime, as a `jsonwebtoken` duration (e.g. `30m`). */
  @IsOptional()
  @IsString()
  JWT_CUSTOMER_TTL = '30m';

  /** Secret used to sign **super admin** (platform) JWTs. Distinct from all others. */
  @IsString()
  @IsNotEmpty()
  JWT_SUPERADMIN_SECRET!: string;

  /** Super admin session lifetime, as a `jsonwebtoken` duration (e.g. `8h`). */
  @IsOptional()
  @IsString()
  JWT_SUPERADMIN_TTL = '8h';

  /** Minutes an emailed OTP code stays valid. */
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(60)
  OTP_TTL_MINUTES = 10;

  /** Max verification attempts per OTP before it is rejected. */
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(20)
  OTP_MAX_ATTEMPTS = 5;

  /** Sentry DSN for error reporting. Empty/unset disables Sentry (no-op). */
  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  /** Sentry performance trace sample rate (0–1). */
  @IsOptional()
  @Transform(toNumber)
  SENTRY_TRACES_SAMPLE_RATE?: number;

  /**
   * Transactional email transport. `smtp` requires the `SMTP_*` variables to be
   * present (enforced below, fail-fast).
   */
  @IsOptional()
  @IsEnum(MailProvider)
  MAIL_PROVIDER: MailProvider = MailProvider.Log;

  /** RFC 5322 "From" header, e.g. `Agendox <no-reply@agendox.local>`. */
  @IsOptional()
  @IsString()
  MAIL_FROM = 'Agendox <no-reply@agendox.local>';

  /** SMTP host. Required when `MAIL_PROVIDER=smtp` (e.g. `smtp.gmail.com`). */
  @ValidateIf((o: EnvironmentVariables) => o.MAIL_PROVIDER === MailProvider.Smtp)
  @IsString()
  @IsNotEmpty()
  SMTP_HOST?: string;

  /** SMTP port. Required when `MAIL_PROVIDER=smtp` (465 for TLS, 587 for STARTTLS). */
  @ValidateIf((o: EnvironmentVariables) => o.MAIL_PROVIDER === MailProvider.Smtp)
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT?: number;

  /** Whether the SMTP connection uses implicit TLS (`true` for port 465). */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  SMTP_SECURE = true;

  /** SMTP username. Required when `MAIL_PROVIDER=smtp`. */
  @ValidateIf((o: EnvironmentVariables) => o.MAIL_PROVIDER === MailProvider.Smtp)
  @IsString()
  @IsNotEmpty()
  SMTP_USER?: string;

  /** SMTP password / app password. Required when `MAIL_PROVIDER=smtp`. */
  @ValidateIf((o: EnvironmentVariables) => o.MAIL_PROVIDER === MailProvider.Smtp)
  @IsString()
  @IsNotEmpty()
  SMTP_PASS?: string;

  /** Payment gateway. `mercadopago` requires the `MP_*` variables below. */
  @IsOptional()
  @IsEnum(PaymentProvider)
  PAYMENT_PROVIDER: PaymentProvider = PaymentProvider.Mock;

  /** Public base URL of the dashboard app, for the checkout return URL. */
  @IsOptional()
  @IsString()
  APP_DASHBOARD_URL = 'http://localhost:3001';

  /** Public base URL of this API, for the provider webhook / notification URL. */
  @IsOptional()
  @IsString()
  API_PUBLIC_URL = 'http://localhost:3000';

  /** Mercado Pago access token. Required when `PAYMENT_PROVIDER=mercadopago`. */
  @ValidateIf((o: EnvironmentVariables) => o.PAYMENT_PROVIDER === PaymentProvider.MercadoPago)
  @IsString()
  @IsNotEmpty()
  MP_ACCESS_TOKEN?: string;

  /** Secret to verify Mercado Pago webhook signatures. Required when `PAYMENT_PROVIDER=mercadopago`. */
  @ValidateIf((o: EnvironmentVariables) => o.PAYMENT_PROVIDER === PaymentProvider.MercadoPago)
  @IsString()
  @IsNotEmpty()
  MP_WEBHOOK_SECRET?: string;
}

/**
 * Coerces + validates raw environment variables. Passed to
 * `ConfigModule.forRoot({ validate })`.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config);

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return validated;
}
