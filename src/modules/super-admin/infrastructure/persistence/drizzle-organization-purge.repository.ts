import { Inject, Injectable } from '@nestjs/common';
import { eq, type AnyColumn } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import { appointments } from '@modules/appointments/infrastructure/persistence/appointment.schema';
import { deposits } from '@modules/appointments/infrastructure/persistence/deposit.schema';
import { refreshTokens } from '@modules/authentication/infrastructure/persistence/refresh-token.schema';
import { clients } from '@modules/clients/infrastructure/persistence/client.schema';
import { customerOtps } from '@modules/customer-portal/infrastructure/persistence/customer-otp.schema';
import { termsAcceptances } from '@modules/legal/infrastructure/persistence/terms-acceptance.schema';
import {
  notifications,
  pushSubscriptions,
} from '@modules/notifications/infrastructure/persistence/notification.schema';
import { organizationFeatures } from '@modules/organizations/infrastructure/persistence/organization-features.schema';
import { organizations } from '@modules/organizations/infrastructure/persistence/organization.schema';
import {
  blockedTimes,
  resources,
  resourceSchedules,
  resourceServices,
} from '@modules/resources/infrastructure/persistence/resource.schema';
import {
  serviceOptions,
  services,
} from '@modules/services/infrastructure/persistence/service.schema';
import {
  bookingSettings,
  brandingSettings,
  businessHours,
  businessSettings,
  notificationSettings,
  paymentSettings,
} from '@modules/settings/infrastructure/persistence/settings.schema';
import { subscriptions } from '@modules/subscriptions/infrastructure/persistence/subscription.schema';
import { trials } from '@modules/trials/infrastructure/persistence/trial.schema';
import { users } from '@modules/users/infrastructure/persistence/user.schema';

import type {
  OrganizationPurgeRepository,
  PurgeReport,
} from '../../application/ports/organization-purge.repository';

/**
 * Toda tabla con `organization_id`, en orden hijo → padre.
 *
 * El esquema no declara claves foráneas, así que Postgres no borra nada en
 * cascada: si una tabla falta acá, sus filas quedan huérfanas para siempre y ya
 * no hay forma de encontrarlas, porque la organización que las nombraba no
 * existe. **Al agregar una tabla multi-tenant hay que sumarla a esta lista.** El
 * orden no lo exige la base hoy; deja el borrado listo para cuando haya FKs.
 */
const TENANT_TABLES: readonly { name: string; table: PgTable; column: AnyColumn }[] = [
  { name: 'deposits', table: deposits, column: deposits.organizationId },
  { name: 'appointments', table: appointments, column: appointments.organizationId },
  { name: 'resource_services', table: resourceServices, column: resourceServices.organizationId },
  { name: 'resource_schedules', table: resourceSchedules, column: resourceSchedules.organizationId },
  { name: 'blocked_times', table: blockedTimes, column: blockedTimes.organizationId },
  { name: 'resources', table: resources, column: resources.organizationId },
  { name: 'service_options', table: serviceOptions, column: serviceOptions.organizationId },
  { name: 'services', table: services, column: services.organizationId },
  { name: 'clients', table: clients, column: clients.organizationId },
  { name: 'customer_otps', table: customerOtps, column: customerOtps.organizationId },
  { name: 'notifications', table: notifications, column: notifications.organizationId },
  { name: 'push_subscriptions', table: pushSubscriptions, column: pushSubscriptions.organizationId },
  { name: 'business_hours', table: businessHours, column: businessHours.organizationId },
  { name: 'business_settings', table: businessSettings, column: businessSettings.organizationId },
  { name: 'booking_settings', table: bookingSettings, column: bookingSettings.organizationId },
  { name: 'payment_settings', table: paymentSettings, column: paymentSettings.organizationId },
  {
    name: 'notification_settings',
    table: notificationSettings,
    column: notificationSettings.organizationId,
  },
  { name: 'branding_settings', table: brandingSettings, column: brandingSettings.organizationId },
  { name: 'terms_acceptances', table: termsAcceptances, column: termsAcceptances.organizationId },
  { name: 'subscriptions', table: subscriptions, column: subscriptions.organizationId },
  { name: 'trials', table: trials, column: trials.organizationId },
  { name: 'refresh_tokens', table: refreshTokens, column: refreshTokens.organizationId },
  {
    name: 'organization_features',
    table: organizationFeatures,
    column: organizationFeatures.organizationId,
  },
  { name: 'users', table: users, column: users.organizationId },
];

@Injectable()
export class DrizzleOrganizationPurgeRepository
  extends BaseDrizzleRepository
  implements OrganizationPurgeRepository
{
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async purge(organizationId: string): Promise<PurgeReport> {
    const byTable: Record<string, number> = {};
    let total = 0;

    // Secuencial y no en paralelo: son deletes dentro de una misma transacción,
    // y una transacción de Postgres no admite consultas concurrentes.
    for (const { name, table, column } of TENANT_TABLES) {
      const result = await this.executor.delete(table).where(eq(column, organizationId));
      const rows = result.rowCount ?? 0;
      if (rows > 0) {
        byTable[name] = rows;
        total += rows;
      }
    }

    const org = await this.executor.delete(organizations).where(eq(organizations.id, organizationId));
    const orgRows = org.rowCount ?? 0;
    if (orgRows > 0) {
      byTable.organizations = orgRows;
      total += orgRows;
    }

    return { total, byTable };
  }
}
