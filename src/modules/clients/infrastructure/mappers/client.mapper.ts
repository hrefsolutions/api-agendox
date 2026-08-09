import { Client } from '../../domain/entities/client.entity';
import { ClientStatus } from '../../domain/client-status.enum';
import type { ClientRow, NewClientRow } from '../persistence/client.schema';

export class ClientMapper {
  static toDomain(row: ClientRow): Client {
    return Client.fromPersistence(row.id, {
      organizationId: row.organizationId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      whatsapp: row.whatsapp,
      phone: row.phone,
      notes: row.notes,
      status: row.status as ClientStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toRow(client: Client): NewClientRow {
    return {
      id: client.id,
      organizationId: client.organizationId,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      whatsapp: client.whatsapp,
      phone: client.phone,
      notes: client.notes,
      status: client.status,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}
