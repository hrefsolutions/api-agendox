import { Organization } from '../../domain/entities/organization.entity';
import { OrganizationStatus } from '../../domain/organization-status.enum';
import type { NewOrganizationRow, OrganizationRow } from '../persistence/organization.schema';

export class OrganizationMapper {
  static toDomain(row: OrganizationRow): Organization {
    return Organization.fromPersistence(row.id, {
      name: row.name,
      slug: row.slug,
      status: row.status as OrganizationStatus,
      timezone: row.timezone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toRow(organization: Organization): NewOrganizationRow {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      timezone: organization.timezone,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
