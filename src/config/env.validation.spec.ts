import { NodeEnv, validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/agendox',
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_CUSTOMER_SECRET: 'test-customer-secret',
    JWT_SUPERADMIN_SECRET: 'test-superadmin-secret',
  };

  it('applies defaults when only required vars are present', () => {
    const env = validateEnv({ ...base });

    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('api');
    expect(env.SWAGGER_ENABLED).toBe(true);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment configuration/);
  });

  it('coerces string values to their declared types', () => {
    const env = validateEnv({ ...base, PORT: '8080', SWAGGER_ENABLED: 'false' });

    expect(env.PORT).toBe(8080);
    expect(env.SWAGGER_ENABLED).toBe(false);
  });

  it('rejects an out-of-range port', () => {
    expect(() => validateEnv({ ...base, PORT: '70000' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  describe('SMTP', () => {
    const smtp = {
      ...base,
      MAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: '465',
      SMTP_USER: 'negocio@gmail.com',
    };

    it('accepts SMTP_PASS in place of the legacy APP_KEY', () => {
      const env = validateEnv({
        ...smtp,
        SMTP_PASS: 'app-password',
        MAIL_FROM: 'Agendox <negocio@gmail.com>',
      });

      expect(env.SMTP_PASS).toBe('app-password');
    });

    it('still accepts the legacy APP_KEY when SMTP_PASS is absent', () => {
      const env = validateEnv({
        ...smtp,
        APP_KEY: 'app-password',
        MAIL_FROM: 'Agendox <negocio@gmail.com>',
      });

      expect(env.APP_KEY).toBe('app-password');
    });

    it('requires a password under either name', () => {
      expect(() => validateEnv({ ...smtp, MAIL_FROM: 'Agendox <negocio@gmail.com>' })).toThrow(
        /Invalid environment configuration/,
      );
    });

    // Es la causa #1 de "el mail llega pero a spam": el From dice un dominio y
    // SPF/DKIM firman otro.
    it('rejects a MAIL_FROM whose domain does not match SMTP_USER', () => {
      expect(() =>
        validateEnv({
          ...smtp,
          SMTP_PASS: 'app-password',
          MAIL_FROM: 'Agendox <no-reply@agendox.local>',
        }),
      ).toThrow(/alineación SPF\/DKIM/);
    });

    it('ignores the alignment rule when the provider is not smtp', () => {
      const env = validateEnv({ ...base, MAIL_FROM: 'Agendox <no-reply@agendox.local>' });

      expect(env.MAIL_FROM).toBe('Agendox <no-reply@agendox.local>');
    });
  });

  describe('Web Push (VAPID)', () => {
    it('accepts a complete key pair', () => {
      const env = validateEnv({
        ...base,
        VAPID_PUBLIC_KEY: 'public',
        VAPID_PRIVATE_KEY: 'private',
        VAPID_SUBJECT: 'mailto:admin@agendox.com',
      });

      expect(env.VAPID_PUBLIC_KEY).toBe('public');
    });

    it.each(['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'])(
      'rejects %s configured on its own',
      (key) => {
        expect(() => validateEnv({ ...base, [key]: 'only-one' })).toThrow(
          /se configuran juntas o ninguna/,
        );
      },
    );

    it('rejects a VAPID_SUBJECT that is not a real mailto', () => {
      expect(() =>
        validateEnv({
          ...base,
          VAPID_PUBLIC_KEY: 'public',
          VAPID_PRIVATE_KEY: 'private',
          VAPID_SUBJECT: 'admin@agendox',
        }),
      ).toThrow(/VAPID_SUBJECT/);
    });
  });

  describe('Mercado Pago', () => {
    const mp = {
      ...base,
      PAYMENT_PROVIDER: 'mercadopago',
      MP_ACCESS_TOKEN: 'token',
      MP_WEBHOOK_SECRET: 'secret',
    };

    it('accepts public HTTPS URLs', () => {
      const env = validateEnv({
        ...mp,
        APP_DASHBOARD_URL: 'https://panel.agendox.com',
        API_PUBLIC_URL: 'https://api.agendox.com',
      });

      expect(env.APP_DASHBOARD_URL).toBe('https://panel.agendox.com');
    });

    // Es la causa más probable del "No se pudo iniciar el checkout": MP rechaza
    // un back_url que no puede alcanzar desde internet.
    it('rejects the localhost defaults', () => {
      expect(() => validateEnv({ ...mp })).toThrow(/Invalid environment configuration/);
    });

    it('rejects plain HTTP URLs', () => {
      expect(() =>
        validateEnv({
          ...mp,
          APP_DASHBOARD_URL: 'http://panel.agendox.com',
          API_PUBLIC_URL: 'https://api.agendox.com',
        }),
      ).toThrow(/Invalid environment configuration/);
    });

    it('leaves the localhost defaults alone with the mock gateway', () => {
      const env = validateEnv({ ...base });

      expect(env.APP_DASHBOARD_URL).toBe('http://localhost:3001');
    });
  });
});
