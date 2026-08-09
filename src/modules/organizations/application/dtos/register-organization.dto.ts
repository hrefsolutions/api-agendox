export interface RegisterOrganizationCommand {
  organizationName: string;
  slug: string;
  timezone: string;
  owner: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}

export interface RegisterOrganizationResult {
  organizationId: string;
  slug: string;
  ownerUserId: string;
}

export interface OrganizationView {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  createdAt: Date;
}
