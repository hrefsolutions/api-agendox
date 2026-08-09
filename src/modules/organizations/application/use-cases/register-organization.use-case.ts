import { Inject, Injectable } from '@nestjs/common';

import {
  CLOCK,
  DOMAIN_EVENT_PUBLISHER,
  UNIT_OF_WORK,
  type Clock,
  type DomainEventPublisher,
  type UnitOfWork,
} from '@shared/application';
import { Role } from '@shared/domain';
import { ConflictError, ValidationError } from '@shared/errors';

import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@modules/authentication/domain/services/password-hasher';
import { SettingsService } from '@modules/settings/application/settings.service';
import {
  TRIAL_REPOSITORY,
  type TrialRepository,
} from '@modules/trials/domain/repositories/trial.repository';
import { Trial } from '@modules/trials/domain/entities/trial.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@modules/users/domain/repositories/user.repository';
import { User } from '@modules/users/domain/entities/user.entity';

import { Organization } from '../../domain/entities/organization.entity';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/repositories/organization.repository';
import { Slug } from '../../domain/value-objects/slug.vo';
import type {
  RegisterOrganizationCommand,
  RegisterOrganizationResult,
} from '../dtos/register-organization.dto';

/**
 * Self-service tenant signup: creates the Organization, its first Owner and a
 * 30-day Trial atomically, then publishes the resulting domain events.
 */
@Injectable()
export class RegisterOrganization {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TRIAL_REPOSITORY) private readonly trials: TrialRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly publisher: DomainEventPublisher,
    private readonly settings: SettingsService,
  ) {}

  async execute(command: RegisterOrganizationCommand): Promise<RegisterOrganizationResult> {
    const slug = Slug.create(command.slug);
    if (!isValidTimeZone(command.timezone)) {
      throw new ValidationError('Zona horaria IANA inválida', { timezone: command.timezone });
    }

    if (await this.organizations.existsBySlug(slug.value)) {
      throw new ConflictError('El slug ya está en uso', { slug: slug.value });
    }
    if (await this.users.existsByEmail(command.owner.email)) {
      throw new ConflictError('El email ya está registrado');
    }

    const now = this.clock.now();
    const passwordHash = await this.hasher.hash(command.owner.password);

    const organization = Organization.create({
      name: command.organizationName,
      slug,
      timezone: command.timezone,
      now,
    });
    const owner = User.create({
      organizationId: organization.id,
      email: command.owner.email,
      passwordHash,
      firstName: command.owner.firstName,
      lastName: command.owner.lastName,
      role: Role.Owner,
      now,
    });
    const trial = Trial.start(organization.id, now);

    await this.uow.run(async () => {
      await this.organizations.save(organization);
      await this.users.save(owner);
      await this.trials.save(trial);
      await this.settings.initializeDefaults({
        organizationId: organization.id,
        businessName: organization.name,
        timezone: organization.timezone,
      });
    });

    await this.publisher.publishAll([...organization.pullEvents(), ...trial.pullEvents()]);

    return { organizationId: organization.id, slug: organization.slug, ownerUserId: owner.id };
  }
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}
