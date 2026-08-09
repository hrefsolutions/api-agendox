import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';
import { ConflictError, NotFoundError } from '@shared/errors';

import { Client } from '../domain/entities/client.entity';
import type { ClientStatus } from '../domain/client-status.enum';
import { CLIENT_REPOSITORY, type ClientRepository } from '../domain/repositories/client.repository';

export interface ClientView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  phone: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientInput {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  phone?: string | null;
  notes?: string | null;
}

export interface UpdateClientInput {
  firstName?: string;
  lastName?: string;
  whatsapp?: string;
  phone?: string | null;
  notes?: string | null;
  status?: ClientStatus;
}

@Injectable()
export class ClientsService {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(organizationId: string, input: CreateClientInput): Promise<ClientView> {
    const existing = await this.clients.findByEmail(organizationId, input.email);
    if (existing) {
      throw new ConflictError('Ya existe un cliente con este email en esta organización');
    }
    const client = Client.create({ organizationId, ...input, now: this.clock.now() });
    await this.clients.save(client);
    return toView(client);
  }

  async update(organizationId: string, id: string, input: UpdateClientInput): Promise<ClientView> {
    const client = await this.clients.findById(organizationId, id);
    if (!client) {
      throw new NotFoundError('Cliente no encontrado');
    }
    client.update(input, this.clock.now());
    await this.clients.save(client);
    return toView(client);
  }

  async list(
    organizationId: string,
    options: { q?: string; limit: number; offset: number },
  ): Promise<{ items: ClientView[]; total: number }> {
    const page = await this.clients.list(organizationId, options);
    return { items: page.items.map(toView), total: page.total };
  }

  async get(organizationId: string, id: string): Promise<ClientView> {
    const client = await this.clients.findById(organizationId, id);
    if (!client) {
      throw new NotFoundError('Cliente no encontrado');
    }
    return toView(client);
  }
}

function toView(client: Client): ClientView {
  return {
    id: client.id,
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
