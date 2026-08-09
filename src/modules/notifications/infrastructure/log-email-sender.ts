import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import type { EmailMessage, EmailSender } from '../application/ports/email-sender.port';
import { EmailTemplateRenderer } from './email-template-renderer';

/**
 * Development email sender: renders the template and logs the plain-text body
 * instead of delivering it. Lets the OTP / notification flows work end-to-end
 * without an SMTP account (`MAIL_PROVIDER=log`).
 */
@Injectable()
export class LogEmailSender implements EmailSender {
  constructor(
    private readonly renderer: EmailTemplateRenderer,
    private readonly logger: Logger,
  ) {}

  send(message: EmailMessage): Promise<void> {
    const { text } = this.renderer.render(message.template, message.vars);
    this.logger.log(
      { to: message.to, subject: message.subject, template: message.template },
      `[email:dev] ${message.subject}\n${text}`,
    );
    return Promise.resolve();
  }
}
