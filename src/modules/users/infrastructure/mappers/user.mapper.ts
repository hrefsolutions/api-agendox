import { Role } from '@shared/domain';

import { User } from '../../domain/entities/user.entity';
import { UserStatus } from '../../domain/user-status.enum';
import type { NewUserRow, UserRow } from '../persistence/user.schema';

export class UserMapper {
  static toDomain(row: UserRow): User {
    return User.fromPersistence(row.id, {
      organizationId: row.organizationId,
      email: row.email,
      passwordHash: row.passwordHash,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as Role,
      status: row.status as UserStatus,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toRow(user: User): NewUserRow {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
