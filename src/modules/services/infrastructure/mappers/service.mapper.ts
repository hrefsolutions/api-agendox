import { Service } from '../../domain/entities/service.entity';
import type { NewServiceRow, ServiceRow } from '../persistence/service.schema';

export class ServiceMapper {
  static toDomain(row: ServiceRow): Service {
    return Service.fromPersistence(row.id, {
      organizationId: row.organizationId,
      name: row.name,
      description: row.description,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toRow(service: Service): NewServiceRow {
    return {
      id: service.id,
      organizationId: service.organizationId,
      name: service.name,
      description: service.description,
      active: service.active,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}
