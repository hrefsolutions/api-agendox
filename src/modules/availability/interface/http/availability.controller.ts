import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { TenantId } from '@common/decorators/tenant-id.decorator';

import { CalculateAvailability } from '../../application/calculate-availability.use-case';
import type { AvailabilityResult } from '../../application/availability.dto';
import { AvailabilityQueryRequest } from './availability.requests';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly calculateAvailability: CalculateAvailability) {}

  @Get()
  @ApiOkResponse({ description: 'Bookable slots for the given service option and date range' })
  get(
    @TenantId() organizationId: string,
    @Query() query: AvailabilityQueryRequest,
  ): Promise<AvailabilityResult> {
    return this.calculateAvailability.execute(organizationId, query);
  }
}
