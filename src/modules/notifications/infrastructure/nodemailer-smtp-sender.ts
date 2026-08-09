import { createTransport, type Transporter } from 'nodemailer';
import { Logger } from 'nestjs-pino';

import type { EmailMessage, EmailSender } from '../application/ports/email-sender.port';
import type { EmailTemplateRenderer } from './email-template-renderer';

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * Sends transactional email via SMTP (Nodemailer). The transport is created
 * once (connection pooling is left to Nodemailer). Delivery is best-effort:
 * failures are logged and swallowed so the domain flow never breaks — matching
 * the fire-and-forget contract of the dispatcher.
 */
export class NodemailerSmtpSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(
    private readonly from: string,
    options: SmtpOptions,
    private readonly renderer: EmailTemplateRenderer,
    private readonly logger: Logger,
  ) {
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: { user: options.user, pass: options.pass },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      const { html, text } = this.renderer.render(message.template, message.vars);
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(
        { err: error, to: message.to, template: message.template },
        'SMTP email failed',
      );
    }
  }
}
