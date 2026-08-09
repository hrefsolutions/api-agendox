import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';

import type { EmailTemplate, EmailVars } from '../application/ports/email-sender.port';

/** Rendered output for both the HTML part and the plain-text fallback. */
export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Templates live under `notifications/templates/` and are copied next to the
 * compiled output by `nest build` (see `nest-cli.json` assets). At runtime this
 * file sits in `dist/modules/notifications/infrastructure`, so the folder is one
 * level up — the same relative path holds in dev (`nest start` also runs `dist`).
 */
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

/**
 * Renders transactional emails from HTML templates with `{{placeholder}}`
 * interpolation. Values are HTML-escaped; template files are read once and
 * cached. Also derives a plain-text fallback from the rendered HTML.
 */
@Injectable()
export class EmailTemplateRenderer {
  private readonly cache = new Map<EmailTemplate, string>();

  render(template: EmailTemplate, vars: EmailVars): RenderedEmail {
    const source = this.load(template);
    const html = source.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) =>
      escapeHtml(stringify(vars[key])),
    );
    return { html, text: htmlToText(html) };
  }

  private load(template: EmailTemplate): string {
    const cached = this.cache.get(template);
    if (cached !== undefined) return cached;
    const source = readFileSync(join(TEMPLATES_DIR, `${template}.html`), 'utf8');
    this.cache.set(template, source);
    return source;
  }
}

function stringify(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Best-effort HTML → text for the fallback part: drops head/style, turns block
 * boundaries into newlines, strips the rest and decodes the entities we emit.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>(?=.)/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}
