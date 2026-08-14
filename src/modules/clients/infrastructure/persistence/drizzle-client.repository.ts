import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';

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

/** Campos que mira el buscador. `phone` y `notes` quedan afuera a propósito. */
const SEARCHABLE_COLUMNS: readonly SQLWrapper[] = [
  clients.firstName,
  clients.lastName,
  clients.email,
  clients.whatsapp,
];

/**
 * `%token%` con los comodines de LIKE escapados: sin esto, un `%` o un `_`
 * tipeados por el usuario se interpretaban como patrón y no como texto literal.
 */
function likePattern(token: string): string {
  return `%${token.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/**
 * `ILIKE` ignora mayúsculas pero NO tildes, así que "Sebastian" no encontraba a
 * "Sebastián". `unaccent` normaliza los dos lados de la comparación; la
 * extensión la crea `src/database/sql/clients-search-unaccent.sql` en el deploy.
 */
function matchesUnaccented(column: SQLWrapper, pattern: string): SQL {
  return sql`unaccent(lower(${column})) LIKE unaccent(lower(${pattern}))`;
}

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
      // Un token por palabra, y cada token debe aparecer en ALGÚN campo: el
      // nombre vive partido en dos columnas, así que comparar el término entero
      // contra cada una por separado hacía que "prueba 1" no encontrara al
      // cliente `first_name='prueba'` / `last_name='1'`. Tokenizar también
      // acepta el orden invertido ("Cerutti Sebastián").
      for (const token of q.split(/\s+/)) {
        const term = likePattern(token);
        conditions.push(
          or(...SEARCHABLE_COLUMNS.map((column) => matchesUnaccented(column, term)))!,
        );
      }
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
