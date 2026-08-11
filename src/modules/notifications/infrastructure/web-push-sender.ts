import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import webpush from 'web-push';

import type { PushConfig } from '@config/configuration';

import type {
  PushPayload,
  PushResult,
  PushSender,
  PushTarget,
} from '../application/ports/push-sender.port';

/** Web Push sender (VAPID). Disabled (no-op) when VAPID keys are not configured. */
@Injectable()
export class WebPushSender implements PushSender {
  private readonly enabled: boolean;

  constructor(
    configService: ConfigService,
    private readonly logger: Logger,
  ) {
    const push = configService.getOrThrow<PushConfig>('push');
    if (push.vapidPublicKey && push.vapidPrivateKey) {
      webpush.setVapidDetails(push.vapidSubject, push.vapidPublicKey, push.vapidPrivateKey);
      this.enabled = true;
    } else {
      this.enabled = false;
      // Sin este aviso, el push "funciona" en silencio: la app muestra el
      // toaster in-app, nadie recibe la notificación del navegador y no hay
      // ninguna señal de por qué.
      this.logger.warn(
        'Web Push deshabilitado: faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY. ' +
          'Generá el par con `pnpm exec web-push generate-vapid-keys` y cargalas en el entorno.',
      );
    }
  }

  async send(target: PushTarget, payload: PushPayload): Promise<PushResult> {
    if (!this.enabled) {
      return { ok: false, gone: false, reason: 'not-configured' };
    }
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(payload),
      );
      return { ok: true, gone: false };
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      const gone = statusCode === 404 || statusCode === 410;
      this.logger.warn(
        { err: error, statusCode, endpoint: target.endpoint },
        'Web Push delivery failed',
      );
      return { ok: false, gone, reason: 'delivery-failed' };
    }
  }
}
