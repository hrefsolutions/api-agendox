import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '@shared/application';

import type { OrganizationAccess } from '@modules/appointments/application/ports/organization-access.port';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '@modules/organizations/domain/repositories/organization.repository';
import {
  TRIAL_REPOSITORY,
  type TrialRepository,
} from '@modules/trials/domain/repositories/trial.repository';

import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepository,
} from '../domain/repositories/subscription.repository';

/**
 * Implements the {@link OrganizationAccess} gate: an organization can operate if
 * it is not suspended/disabled AND has a running trial OR an active subscription
 * (BR-120/130/131).
 */
@Injectable()
export class OrganizationAccessService implements OrganizationAccess {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(TRIAL_REPOSITORY) private readonly trials: TrialRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canOperate(organizationId: string): Promise<boolean> {
    const organization = await this.organizations.findById(organizationId);
    if (!organization || !organization.isOperational) {
      return false;
    }
    const now = this.clock.now();
    const trial = await this.trials.findCurrentByOrganization(organizationId);
    if (trial && trial.isActiveAt(now)) {
      return true;
    }
    const subscription = await this.subscriptions.findActiveByOrganization(organizationId);
    return subscription !== null && subscription.isActiveAt(now);
  }
}
