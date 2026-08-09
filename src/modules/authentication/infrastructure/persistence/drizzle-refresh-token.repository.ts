import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { refreshTokens } from './refresh-token.schema';

@Injectable()
export class DrizzleRefreshTokenRepository
  extends BaseDrizzleRepository
  implements RefreshTokenRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async save(record: RefreshTokenRecord): Promise<void> {
    await this.executor.insert(refreshTokens).values(record);
  }

  async findByJti(jti: string): Promise<RefreshTokenRecord | null> {
    const rows = await this.executor
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.jti, jti))
      .limit(1);
    return rows[0] ?? null;
  }

  async revoke(jti: string, at: Date): Promise<void> {
    await this.executor
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(eq(refreshTokens.jti, jti));
  }
}
