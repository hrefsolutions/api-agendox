import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type {
  CustomerOtpRecord,
  CustomerOtpRepository,
} from '../../domain/customer-otp.repository';
import { customerOtps } from './customer-otp.schema';

@Injectable()
export class DrizzleCustomerOtpRepository
  extends BaseDrizzleRepository
  implements CustomerOtpRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async save(record: CustomerOtpRecord): Promise<void> {
    await this.executor.insert(customerOtps).values(record);
  }

  async findLatestActive(organizationId: string, email: string): Promise<CustomerOtpRecord | null> {
    const rows = await this.executor
      .select()
      .from(customerOtps)
      .where(
        and(
          eq(customerOtps.organizationId, organizationId),
          eq(customerOtps.email, email.trim().toLowerCase()),
          isNull(customerOtps.consumedAt),
        ),
      )
      .orderBy(desc(customerOtps.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async countSince(organizationId: string, email: string, since: Date): Promise<number> {
    return this.executor.$count(
      customerOtps,
      and(
        eq(customerOtps.organizationId, organizationId),
        eq(customerOtps.email, email.trim().toLowerCase()),
        gte(customerOtps.createdAt, since),
        // Los códigos ya usados no gastan cupo: ver la nota del repositorio.
        isNull(customerOtps.consumedAt),
      ),
    );
  }

  async findOldestSince(
    organizationId: string,
    email: string,
    since: Date,
  ): Promise<CustomerOtpRecord | null> {
    const rows = await this.executor
      .select()
      .from(customerOtps)
      .where(
        and(
          eq(customerOtps.organizationId, organizationId),
          eq(customerOtps.email, email.trim().toLowerCase()),
          gte(customerOtps.createdAt, since),
          isNull(customerOtps.consumedAt),
        ),
      )
      .orderBy(asc(customerOtps.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.executor
      .update(customerOtps)
      .set({ attempts: sql`${customerOtps.attempts} + 1` })
      .where(eq(customerOtps.id, id));
  }

  async consume(id: string, at: Date): Promise<void> {
    await this.executor.update(customerOtps).set({ consumedAt: at }).where(eq(customerOtps.id, id));
  }
}
