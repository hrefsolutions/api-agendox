import { Trial } from '../../domain/entities/trial.entity';
import { TrialStatus } from '../../domain/trial-status.enum';
import type { NewTrialRow, TrialRow } from '../persistence/trial.schema';

export class TrialMapper {
  static toDomain(row: TrialRow): Trial {
    return Trial.fromPersistence(row.id, {
      organizationId: row.organizationId,
      status: row.status as TrialStatus,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      convertedAt: row.convertedAt,
      createdAt: row.createdAt,
    });
  }

  static toRow(trial: Trial): NewTrialRow {
    return {
      id: trial.id,
      organizationId: trial.organizationId,
      status: trial.status,
      startsAt: trial.startsAt,
      endsAt: trial.endsAt,
      convertedAt: trial.convertedAt,
      createdAt: trial.createdAt,
    };
  }
}
