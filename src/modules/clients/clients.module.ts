import { Module } from '@nestjs/common';

import { ClientsService } from './application/clients.service';
import { CLIENT_REPOSITORY } from './domain/repositories/client.repository';
import { ClientsController } from './interface/http/clients.controller';
import { DrizzleClientRepository } from './infrastructure/persistence/drizzle-client.repository';

/**
 * Clients module (M3). Owns end-customer profiles. Exports {@link CLIENT_REPOSITORY}
 * for appointments/customer-portal to reference.
 */
@Module({
  controllers: [ClientsController],
  providers: [{ provide: CLIENT_REPOSITORY, useClass: DrizzleClientRepository }, ClientsService],
  exports: [CLIENT_REPOSITORY],
})
export class ClientsModule {}
