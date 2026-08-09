import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { ResourceServiceRepository } from '../../domain/repositories';
import { resourceServices } from './resource.schema';

@Injectable()
export class DrizzleResourceServiceRepository
  extends BaseDrizzleRepository
  implements ResourceServiceRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async exists(organizationId: string, resourceId: string, serviceId: string): Promise<boolean> {
    const rows = await this.executor
      .select({ id: resourceServices.id })
      .from(resourceServices)
      .where(
        and(
          eq(resourceServices.organizationId, organizationId),
          eq(resourceServices.resourceId, resourceId),
          eq(resourceServices.serviceId, serviceId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async assign(organizationId: string, resourceId: string, serviceId: string): Promise<void> {
    await this.executor
      .insert(resourceServices)
      .values({ id: randomUUID(), organizationId, resourceId, serviceId, active: true })
      .onConflictDoNothing({
        target: [
          resourceServices.organizationId,
          resourceServices.resourceId,
          resourceServices.serviceId,
        ],
      });
  }

  async remove(organizationId: string, resourceId: string, serviceId: string): Promise<void> {
    await this.executor
      .delete(resourceServices)
      .where(
        and(
          eq(resourceServices.organizationId, organizationId),
          eq(resourceServices.resourceId, resourceId),
          eq(resourceServices.serviceId, serviceId),
        ),
      );
  }

  async listServiceIds(organizationId: string, resourceId: string): Promise<string[]> {
    const rows = await this.executor
      .select({ serviceId: resourceServices.serviceId })
      .from(resourceServices)
      .where(
        and(
          eq(resourceServices.organizationId, organizationId),
          eq(resourceServices.resourceId, resourceId),
          eq(resourceServices.active, true),
        ),
      );
    return rows.map((row) => row.serviceId);
  }

  async listResourceIds(organizationId: string, serviceId: string): Promise<string[]> {
    const rows = await this.executor
      .select({ resourceId: resourceServices.resourceId })
      .from(resourceServices)
      .where(
        and(
          eq(resourceServices.organizationId, organizationId),
          eq(resourceServices.serviceId, serviceId),
          eq(resourceServices.active, true),
        ),
      );
    return rows.map((row) => row.resourceId);
  }
}
