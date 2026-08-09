export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushResult {
  ok: boolean;
  /** True when the subscription is gone (HTTP 404/410) and should be revoked. */
  gone: boolean;
}

/** Sends a Web Push message to a single subscription (VAPID). */
export interface PushSender {
  send(target: PushTarget, payload: PushPayload): Promise<PushResult>;
}

export const PUSH_SENDER = Symbol('PUSH_SENDER');
