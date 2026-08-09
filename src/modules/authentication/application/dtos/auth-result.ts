import type { Role } from '@shared/domain';

export interface AuthUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUserView;
}
