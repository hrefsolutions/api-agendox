import type { Client } from '../entities/client.entity';

export interface ListClientsOptions {
  /** Case-insensitive match against name / email / whatsapp. */
  q?: string;
  limit: number;
  offset: number;
}

export interface ClientPage {
  items: Client[];
  total: number;
}

export interface ClientRepository {
  findById(organizationId: string, id: string): Promise<Client | null>;
  findByEmail(organizationId: string, email: string): Promise<Client | null>;
  list(organizationId: string, options: ListClientsOptions): Promise<ClientPage>;
  save(client: Client): Promise<void>;
}

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');
