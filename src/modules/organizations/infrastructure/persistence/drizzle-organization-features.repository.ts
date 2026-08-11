import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import {
  DEFAULT_ORGANIZATION_FEATURES,
  type OrganizationFeatures,
  type OrganizationFeaturesRepository,
} from '../../domain/organization-features';
import { organizationFeatures } from './organization-features.schema';

@Injectable()
export class DrizzleOrganizationFeaturesRepository
  extends BaseDrizzleRepository
  implements OrganizationFeaturesRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async find(organizationId: string): Promise<OrganizationFeatures | null> {
    const rows = await this.executor
      .select()
      .from(organizationFeatures)
      .where(eq(organizationFeatures.organizationId, organizationId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      whatsappNotifications: row.whatsappNotifications,
      logoUpload: row.logoUpload,
    };
  }

  async save(
    organizationId: string,
    changes: Partial<OrganizationFeatures>,
    now: Date,
  ): Promise<OrganizationFeatures> {
    // El insert necesita valores completos, así que los flags ausentes caen al
    // default; el update, en cambio, solo toca lo que vino en `changes`.
    const inserted = { ...DEFAULT_ORGANIZATION_FEATURES, ...changes };
    const rows = await this.executor
      .insert(organizationFeatures)
      .values({ organizationId, ...inserted, updatedAt: now })
      .onConflictDoUpdate({
        target: organizationFeatures.organizationId,
        set: { ...changes, updatedAt: now },
      })
      .returning();

    const row = rows[0];
    return row
      ? { whatsappNotifications: row.whatsappNotifications, logoUpload: row.logoUpload }
      : inserted;
  }

  async delete(organizationId: string): Promise<void> {
    await this.executor
      .delete(organizationFeatures)
      .where(eq(organizationFeatures.organizationId, organizationId));
  }
}
