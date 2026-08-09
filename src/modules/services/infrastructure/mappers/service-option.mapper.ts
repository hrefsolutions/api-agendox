import { Money } from '@shared/domain';

import { ServiceOption } from '../../domain/entities/service-option.entity';
import type { NewServiceOptionRow, ServiceOptionRow } from '../persistence/service.schema';

export class ServiceOptionMapper {
  static toDomain(row: ServiceOptionRow): ServiceOption {
    return ServiceOption.fromPersistence(row.id, {
      organizationId: row.organizationId,
      serviceId: row.serviceId,
      durationMinutes: row.durationMinutes,
      price: Money.fromDecimalString(row.price),
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toRow(option: ServiceOption): NewServiceOptionRow {
    return {
      id: option.id,
      organizationId: option.organizationId,
      serviceId: option.serviceId,
      durationMinutes: option.durationMinutes,
      price: option.price.toDecimalString(),
      active: option.active,
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
    };
  }
}
