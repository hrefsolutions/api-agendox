import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
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

  /** Window in which OTP sends to the same (organization, email) are counted. */
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(5)
  @Max(1440)
  OTP_RESEND_WINDOW_MINUTES = 60;

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

  /**
   * SMTP password (with Gmail, the 16-char App Password — never the account
   * password). Preferred name; `APP_KEY` is still read for compatibility.
   */
  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  /**
   * Legacy name for {@link SMTP_PASS}. Only required when `MAIL_PROVIDER=smtp`
   * and `SMTP_PASS` is absent, so existing deployments keep booting.
   */
  @ValidateIf(
    (o: EnvironmentVariables) => o.MAIL_PROVIDER === MailProvider.Smtp && !o.SMTP_PASS,
  )
  @IsString()
  @IsNotEmpty()
  APP_KEY?: string;

  /**
   * Web Push VAPID keys (`pnpm exec web-push generate-vapid-keys`). Both or
   * neither: a half-configured pair silently disables push, which is the exact
   * failure mode this pairing check exists to prevent.
   */
  @IsOptional()
  @IsString()
  VAPID_PUBLIC_KEY?: string;

  @IsOptional()
  @IsString()
  VAPID_PRIVATE_KEY?: string;

  /** `mailto:` de contacto que los push services usan para avisar problemas. */
  @IsOptional()
  @IsString()
  VAPID_SUBJECT?: string;

  /** Payment gateway. `mercadopago` requires the `MP_*` variables below. */
  @IsOptional()
  @IsEnum(PaymentProvider)
  PAYMENT_PROVIDER: PaymentProvider = PaymentProvider.Mock;

  /**
   * Public base URL of the dashboard app, for the checkout return URL.
   *
   * With `PAYMENT_PROVIDER=mercadopago` this must be a public HTTPS URL: Mercado
   * Pago rejects the `back_url` of a preapproval otherwise, and the failure
   * surfaces as a generic "checkout could not start" at the worst moment. The
   * default (`localhost`) is fine for the `mock` gateway only.
   */
  @ValidateIf((o: EnvironmentVariables) => o.PAYMENT_PROVIDER === PaymentProvider.MercadoPago)
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: true })
  APP_DASHBOARD_URL = 'http://localhost:3001';

  /**
   * Public base URL of this API, for the provider webhook / notification URL.
   * Same HTTPS requirement as {@link APP_DASHBOARD_URL} — Mercado Pago has to be
   * able to reach it from the internet to deliver webhooks.
   */
  @ValidateIf((o: EnvironmentVariables) => o.PAYMENT_PROVIDER === PaymentProvider.MercadoPago)
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: true })
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

  const crossFieldErrors = validateRelations(validated);
  if (crossFieldErrors.length > 0) {
    throw new Error(`Invalid environment configuration: ${crossFieldErrors.join('; ')}`);
  }

  return validated;
}

/**
 * Reglas que involucran más de una variable y no se pueden expresar como
 * decorador de un campo. Todas apuntan al mismo problema: configuraciones que
 * arrancan sin queja y fallan después, en runtime, con un síntoma que no señala
 * la causa.
 */
function validateRelations(env: EnvironmentVariables): string[] {
  const problems: string[] = [];

  if (env.MAIL_PROVIDER === MailProvider.Smtp) {
    const fromDomain = emailDomain(env.MAIL_FROM);
    const userDomain = emailDomain(env.SMTP_USER);
    // El From tiene que estar alineado con la cuenta que autentica, o el correo
    // se firma para un dominio y se presenta como otro: SPF/DKIM no alinean y
    // Gmail y Outlook lo mandan a spam. Es la causa #1 de "llega pero a spam".
    if (fromDomain && userDomain && fromDomain !== userDomain) {
      problems.push(
        `MAIL_FROM usa el dominio "${fromDomain}" pero SMTP_USER autentica contra "${userDomain}". ` +
          'Deben coincidir o el correo cae en spam por falta de alineación SPF/DKIM. ' +
          `Usá MAIL_FROM="Agendox <${env.SMTP_USER}>" o configurá un alias verificado en ese dominio.`,
      );
    }
  }

  const hasPublicKey = !!env.VAPID_PUBLIC_KEY;
  const hasPrivateKey = !!env.VAPID_PRIVATE_KEY;
  if (hasPublicKey !== hasPrivateKey) {
    problems.push(
      'VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY se configuran juntas o ninguna. ' +
        'Generá el par con `pnpm exec web-push generate-vapid-keys`.',
    );
  }
  if (hasPublicKey && env.VAPID_SUBJECT && !/^mailto:\S+@\S+\.\S+$/.test(env.VAPID_SUBJECT)) {
    // Apple valida el subject antes de aceptar el push en Safari/iOS.
    problems.push(
      `VAPID_SUBJECT debe ser un mailto: con un email real (recibido: "${env.VAPID_SUBJECT}").`,
    );
  }

  return problems;
}

/** Dominio de un `Nombre <user@host>` o de un email pelado. */
function emailDomain(value?: string): string | null {
  if (!value) return null;
  const address = value.match(/<([^>]+)>/)?.[1] ?? value;
  const domain = address.trim().split('@')[1];
  return domain ? domain.toLowerCase() : null;
}
