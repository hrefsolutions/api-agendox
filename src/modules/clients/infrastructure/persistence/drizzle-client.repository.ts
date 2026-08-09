import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, or, type SQL } from 'drizzle-orm';

import { DRIZZLE, type Database } from '@database/database.constants';
import { BaseDrizzleRepository } from '@database/drizzle/base.repository';

import type { Client } from '../../domain/entities/client.entity';
import type {
  ClientPage,
  ClientRepository,
  ListClientsOptions,
} from '../../domain/repositories/client.repository';
import { ClientMapper } from '../mappers/client.mapper';
import { clients } from './client.schema';

@Injectable()
export class DrizzleClientRepository extends BaseDrizzleRepository implements ClientRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findById(organizationId: string, id: string): Promise<Client | null> {
    const rows = await this.executor
      .select()
      .from(clients)
      .where(and(eq(clients.organizationId, organizationId), eq(clients.id, id)))
      .limit(1);
    return rows[0] ? ClientMapper.toDomain(rows[0]) : null;
  }

  async findByEmail(organizationId: string, email: string): Promise<Client | null> {
    const rows = await this.executor
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, organizationId),
          eq(clients.email, email.trim().toLowerCase()),
        ),
      )
      .limit(1);
    return rows[0] ? ClientMapper.toDomain(rows[0]) : null;
  }

  async list(organizationId: string, options: ListClientsOptions): Promise<ClientPage> {
    const conditions: SQL[] = [eq(clients.organizationId, organizationId)];
    const q = options.q?.trim();
    if (q) {
      const term = `%${q}%`;
      conditions.push(
        or(
          ilike(clients.firstName, term),
          ilike(clients.lastName, term),
          ilike(clients.email, term),
          ilike(clients.whatsapp, term),
        )!,
      );
    }
    const where = and(...conditions);

    const total = await this.executor.$count(clients, where);
    const rows = await this.executor
      .select()
      .from(clients)
      .where(where)
      .orderBy(asc(clients.lastName), asc(clients.firstName))
      .limit(options.limit)
      .offset(options.offset);
    return { items: rows.map((row) => ClientMapper.toDomain(row)), total };
  }

  async save(client: Client): Promise<void> {
    const row = ClientMapper.toRow(client);
    await this.executor
      .insert(clients)
      .values(row)
      .onConflictDoUpdate({
        target: clients.id,
        set: {
          firstName: row.firstName,
          lastName: row.lastName,
          whatsapp: row.whatsapp,
          phone: row.phone,
          notes: row.notes,
          status: row.status,
          updatedAt: row.updatedAt,
        },
      });
  }
}
