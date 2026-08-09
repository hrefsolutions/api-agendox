import { randomUUID } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';

import type { AppConfig, LogConfig } from './configuration';

/**
 * Builds the nestjs-pino configuration.
 *
 * - Pretty, colorized output in development; structured JSON in production.
 * - Attaches a correlation id (`x-request-id`) to every request-scoped log.
 * - Redacts common sensitive headers so they never reach the logs.
 */
export function createLoggerOptions(configService: ConfigService): Params {
  const app = configService.getOrThrow<AppConfig>('app');
  const log = configService.getOrThrow<LogConfig>('log');

  return {
    pinoHttp: {
      level: log.level,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existing = req.headers['x-request-id'];
        const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: true,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },
      transport: app.isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname,req.headers',
            },
          },
    },
  };
}
