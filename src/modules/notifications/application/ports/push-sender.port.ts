export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path the Service Worker opens on click. Relative al origen de la app. */
  url?: string;
  /**
   * Agrupador: dos notificaciones con el mismo `tag` se reemplazan en vez de
   * apilarse. Se usa la entidad de la que hablan (el turno), así el usuario ve
   * el último estado y no seis avisos del mismo turno.
   */
  tag?: string;
}

export interface PushResult {
  ok: boolean;
  /** True when the subscription is gone (HTTP 404/410) and should be revoked. */
  gone: boolean;
  /** Por qué falló, para que el log diga algo accionable. */
  reason?: 'not-configured' | 'delivery-failed';
}

/** Sends a Web Push message to a single subscription (VAPID). */
export interface PushSender {
  send(target: PushTarget, payload: PushPayload): Promise<PushResult>;
}

export const PUSH_SENDER = Symbol('PUSH_SENDER');
