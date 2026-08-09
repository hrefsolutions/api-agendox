import { Resource } from '../../domain/entities/resource.entity';
import type { NewResourceRow, ResourceRow } from '../persistence/resource.schema';

export class ResourceMapper {
  static toDomain(row: ResourceRow): Resource {
    return Resource.fromPersistence(row.id, {
      organizationId: row.organizationId,
      userId: row.userId,
      name: row.name,
      type: row.type,
      color: row.color,
      active: row.active,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toRow(resource: Resource): NewResourceRow {
    return {
      id: resource.id,
      organizationId: resource.organizationId,
      userId: resource.userId,
      name: resource.name,
      type: resource.type,
      color: resource.color,
      active: resource.active,
      description: resource.description,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }
}
