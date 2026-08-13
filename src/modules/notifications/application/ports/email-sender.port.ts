/**
 * Identifier of an HTML template under `notifications/templates/<name>.html`.
 * Adding an email type means adding both a member here and the matching file.
 */
export type EmailTemplate =
  | 'otp'
  | 'organization-welcome'
  | 'appointment-pending-deposit'
  | 'appointment-confirmed'
  | 'appointment-rejected'
  | 'appointment-cancelled'
  | 'appointment-reminder'
  | 'deposit-confirmed';

/** Values interpolated into a template's `{{placeholders}}` (HTML-escaped). */
export type EmailVars = Record<string, string | number | null | undefined>;

export interface EmailMessage {
  to: string;
  subject: string;
  /** Template to render for the body; the copy lives in the `.html` file. */
  template: EmailTemplate;
  /** Placeholder values for the template. */
  vars: EmailVars;
}

/**
 * Transactional email port. Backed by a dev logger (`MAIL_PROVIDER=log`) or
 * Nodemailer over SMTP (`MAIL_PROVIDER=smtp`); both render the message from an
 * HTML template so the copy stays out of the domain code.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
