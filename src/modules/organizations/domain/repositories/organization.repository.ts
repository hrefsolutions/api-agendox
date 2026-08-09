import type { Organization } from '../entities/organization.entity';

/**
 * Persistence contract for {@link Organization}. The organization is the tenant
 * itself, so reads are keyed by its own id or its globally-unique slug.
 */
export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  existsBySlug(slug: string): Promise<boolean>;
  save(organization: Organization): Promise<void>;
}

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');
