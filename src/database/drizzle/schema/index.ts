/**
 * Aggregated Drizzle schema.
 *
 * Each feature module owns its persistence tables under
 * `src/modules/<module>/infrastructure/persistence/*.schema.ts` and re-exports
 * them here so a single schema object drives migrations and typed queries.
 *
 * Paths are relative (not `@/*` aliases) because drizzle-kit loads this file
 * outside the Nest/tsconfig-paths runtime. Every tenant table includes
 * `organization_id` (see docs/04-multi-tenancy.md and docs/12-base-datos.md).
 */
export * from '../../../modules/organizations/infrastructure/persistence/organization.schema';
export * from '../../../modules/users/infrastructure/persistence/user.schema';
export * from '../../../modules/trials/infrastructure/persistence/trial.schema';
export * from '../../../modules/authentication/infrastructure/persistence/refresh-token.schema';
// Business configuration (M2).
export * from '../../../modules/settings/infrastructure/persistence/settings.schema';
// Resources, services and clients (M3).
export * from '../../../modules/clients/infrastructure/persistence/client.schema';
export * from '../../../modules/services/infrastructure/persistence/service.schema';
export * from '../../../modules/resources/infrastructure/persistence/resource.schema';
// Appointments and deposits (M5 + M7).
export * from '../../../modules/appointments/infrastructure/persistence/appointment.schema';
export * from '../../../modules/appointments/infrastructure/persistence/deposit.schema';
// Customer OTP (M6).
export * from '../../../modules/customer-portal/infrastructure/persistence/customer-otp.schema';
// Notifications feed + push subscriptions (M8).
export * from '../../../modules/notifications/infrastructure/persistence/notification.schema';
// Plans + subscriptions (M9).
export * from '../../../modules/plans/infrastructure/persistence/plan.schema';
export * from '../../../modules/subscriptions/infrastructure/persistence/subscription.schema';
// Super admin (platform-global; MS5).
export * from '../../../modules/super-admin/infrastructure/persistence/super-admin.schema';
