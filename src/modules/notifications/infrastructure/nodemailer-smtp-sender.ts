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
  /** Dirección pelada del `From`, sin el nombre para mostrar. */
  private readonly fromAddress: string;

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
    this.fromAddress = bareAddress(from) ?? options.user;
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
        // Sin Reply-To, una respuesta del cliente va a una casilla que nadie
        // lee; con él, al menos llega a la cuenta que manda.
        replyTo: this.fromAddress,
        headers: {
          // Los filtros de spam premian que exista una forma clara de cortar el
          // envío, incluso en correo transaccional. `List-Unsubscribe=One-Click`
          // no aplica acá porque no hay endpoint de baja: alcanza el mailto.
          'List-Unsubscribe': `<mailto:${this.fromAddress}?subject=unsubscribe>`,
          // Marca el correo como automático para que los autorespondedores
          // ("estoy de vacaciones") no contesten y generen bucles.
          'Auto-Submitted': 'auto-generated',
        },
        // Alinea el remitente del sobre (SMTP MAIL FROM) con el From visible.
        // Si difieren, SPF valida un dominio y DMARC evalúa otro.
        envelope: { from: this.fromAddress, to: message.to },
      });
    } catch (error) {
      this.logger.error(
        { err: error, to: message.to, template: message.template },
        'SMTP email failed',
      );
    }
  }
}

/** `Agendox <no-reply@x.com>` → `no-reply@x.com`; un email pelado queda igual. */
function bareAddress(from: string): string | null {
  const angled = from.match(/<([^>]+)>/)?.[1];
  const candidate = (angled ?? from).trim();
  return candidate.includes('@') ? candidate : null;
}
