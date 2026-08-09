export interface OrganizationFilter {
  status?: string;
  /** Case-insensitive match against name or slug. */
  q?: string;
}

export interface AdminOrgListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  createdAt: Date;
  subscriptionStatus: string | null;
  planName: string | null;
}

export interface AdminOrgDetail extends AdminOrgListItem {
  ownerEmail: string | null;
  currentPeriodEnd: Date | null;
  trial: { status: string; endsAt: Date } | null;
  counts: { users: number; appointments: number };
}

export interface AdminMetrics {
  organizations: {
    total: number;
    trial: number;
    active: number;
    suspended: number;
    disabled: number;
  };
  activeSubscriptions: number;
  activeTrials: number;
  totalAppointments: number;
}

/**
 * Cross-tenant read model for the super-admin panel. Deliberately bypasses
 * tenant scoping (platform-global reporting); never exposed to staff/customers.
 */
export interface AdminReadRepository {
  listOrganizations(filter: OrganizationFilter, limit: number): Promise<AdminOrgListItem[]>;
  getOrganizationDetail(id: string): Promise<AdminOrgDetail | null>;
  getMetrics(now: Date): Promise<AdminMetrics>;
}

export const ADMIN_READ_REPOSITORY = Symbol('ADMIN_READ_REPOSITORY');
