import type { ConfigService } from '@nestjs/config';

import { RateLimitError } from '@shared/errors';

import type { CustomerOtpRecord, CustomerOtpRepository } from '../domain/customer-otp.repository';
import { RequestCustomerOtp } from './request-customer-otp.use-case';

/**
 * Regresión del throttling de reenvíos.
 *
 * El bug que motivó estos casos: el helper que calculaba los segundos restantes
 * tenía piso 1, así que la comparación "¿ya pasó la espera?" daba siempre que
 * no. Con un solo código sin consumir, **todo** reenvío posterior moría con
 * "Esperá 1 segundos", esperaras lo que esperaras.
 */
describe('RequestCustomerOtp — espera entre reenvíos', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');
  const organizationId = '11111111-1111-1111-1111-111111111111';
  const email = 'cliente@correo.com';
  /** Espera que corresponde al primer reenvío. */
  const FIRST_DELAY_SECONDS = 30;

  function otpIssuedSecondsAgo(seconds: number): CustomerOtpRecord {
    return {
      id: '22222222-2222-2222-2222-222222222222',
      organizationId,
      email,
      codeHash: 'hash',
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      attempts: 0,
      consumedAt: null,
      createdAt: new Date(now.getTime() - seconds * 1000),
    };
  }

  /** Arma el caso de uso con un histórico de `sent` códigos sin consumir. */
  function build(sent: number, latest: CustomerOtpRecord | null) {
    // Los stubs quedan con su tipo de mock para poder aserciones encima; el
    // calce con el puerto se fuerza recién al construir el caso de uso.
    const otps = {
      save: jest.fn().mockResolvedValue(undefined),
      countSince: jest.fn().mockResolvedValue(sent),
      findLatestActive: jest.fn().mockResolvedValue(latest),
      findOldestSince: jest.fn().mockResolvedValue(latest),
      incrementAttempts: jest.fn(),
      consume: jest.fn(),
    };

    const email_ = { send: jest.fn().mockResolvedValue(undefined) };

    const useCase = new RequestCustomerOtp(
      {
        findBySlug: jest
          .fn()
          .mockResolvedValue({ id: organizationId, name: 'Demo', isOperational: true }),
      } as never,
      otps as unknown as CustomerOtpRepository,
      { hash: jest.fn().mockResolvedValue('hash') } as never,
      email_ as never,
      { now: () => now } as never,
      {
        getOrThrow: () => ({ otpTtlMinutes: 10, otpResendWindowMinutes: 60 }),
      } as unknown as ConfigService,
    );

    return { useCase, otps, email: email_ };
  }

  it('deja pedir otro código cuando la espera ya venció', async () => {
    const { useCase, otps, email: sender } = build(1, otpIssuedSecondsAgo(FIRST_DELAY_SECONDS + 1));

    await expect(useCase.execute('demo', email)).resolves.toBeUndefined();

    expect(otps.save).toHaveBeenCalledTimes(1);
    expect(sender.send).toHaveBeenCalledTimes(1);
  });

  it('deja pedir otro código justo al cumplirse la espera', async () => {
    const { useCase, email: sender } = build(1, otpIssuedSecondsAgo(FIRST_DELAY_SECONDS));

    await expect(useCase.execute('demo', email)).resolves.toBeUndefined();

    expect(sender.send).toHaveBeenCalledTimes(1);
  });

  it('corta con el tiempo que falta si la espera sigue corriendo', async () => {
    const { useCase, email: sender } = build(1, otpIssuedSecondsAgo(10));

    await expect(useCase.execute('demo', email)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterSeconds: FIRST_DELAY_SECONDS - 10,
    });
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('no cuenta la espera cuando no hay ningún código sin consumir', async () => {
    const { useCase, email: sender } = build(0, null);

    await expect(useCase.execute('demo', email)).resolves.toBeUndefined();

    expect(sender.send).toHaveBeenCalledTimes(1);
  });

  it('agota el cupo de la ventana y devuelve cuándo se libera', async () => {
    // 6 envíos = el inicial más los cinco reenvíos de la escala.
    const { useCase } = build(6, otpIssuedSecondsAgo(60));

    const error = await useCase.execute('demo', email).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    // La ventana es de 60 minutos y el más viejo tiene 60 segundos.
    expect((error as RateLimitError).retryAfterSeconds).toBe(60 * 60 - 60);
  });
});
