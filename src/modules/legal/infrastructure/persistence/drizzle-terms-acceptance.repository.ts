import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { TermsAcceptance, TermsAcceptanceRepository } from '../../domain/terms';
import { termsAcceptances, type TermsAcceptanceRow } from './terms-acceptance.schema';

function toDomain(row: TermsAcceptanceRow): TermsAcceptance {
  return {
    organizationId: row.organizationId,
    userId: row.userId,
    version: row.version,
    acceptedAt: row.acceptedAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
  };
}

@Injectable()
export class DrizzleTermsAcceptanceRepository
  extends BaseDrizzleRepository
  implements TermsAcceptanceRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findLatest(organizationId: string): Promise<TermsAcceptance | null> {
    const rows = await this.executor
      .select()
      .from(termsAcceptances)
      .where(eq(termsAcceptances.organizationId, organizationId))
      .orderBy(desc(termsAcceptances.acceptedAt))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async record(acceptance: TermsAcceptance): Promise<TermsAcceptance> {
    const rows = await this.executor
      .insert(termsAcceptances)
      .values({
        organizationId: acceptance.organizationId,
        userId: acceptance.userId,
        version: acceptance.version,
        acceptedAt: acceptance.acceptedAt,
        ipAddress: acceptance.ipAddress,
        userAgent: acceptance.userAgent,
      })
      // Ya aceptada: no se sobreescribe la evidencia original.
      .onConflictDoNothing({
        target: [termsAcceptances.organizationId, termsAcceptances.version],
      })
      .returning();

    const inserted = rows[0];
    if (inserted) return toDomain(inserted);

    // El insert no hizo nada porque la fila ya existía: se devuelve esa.
    const existing = await this.executor
      .select()
      .from(termsAcceptances)
      .where(
        and(
          eq(termsAcceptances.organizationId, acceptance.organizationId),
          eq(termsAcceptances.version, acceptance.version),
        ),
      )
      .limit(1);
    const row = existing[0];
    return row ? toDomain(row) : acceptance;
  }

  async listByOrganization(organizationId: string): Promise<TermsAcceptance[]> {
    const rows = await this.executor
      .select()
      .from(termsAcceptances)
      .where(eq(termsAcceptances.organizationId, organizationId))
      .orderBy(desc(termsAcceptances.acceptedAt));
    return rows.map(toDomain);
  }
}
