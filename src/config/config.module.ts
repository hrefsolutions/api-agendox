import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { configurations } from './configuration';
import { validateEnv } from './env.validation';

/**
 * Global configuration module.
 *
 * - Loads `.env` (from the project root; falls back to the parent monorepo root).
 * - Validates the environment once, at bootstrap (fail fast).
 * - Exposes typed, namespaced configuration (`app`, `database`, `swagger`, `log`).
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env', '../.env'],
      load: configurations,
      validate: validateEnv,
    }),
  ],
})
export class ConfigModule {}
