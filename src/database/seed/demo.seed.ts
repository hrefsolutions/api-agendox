import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from '@app/app.module';
import { ResourcesService } from '@modules/resources/application/resources.service';
import { ServicesService } from '@modules/services/application/services.service';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '@modules/organizations/domain/repositories/organization.repository';

/**
 * Catálogo de prueba para la organización demo: servicios con opciones **con
 * nombre**, recursos, sus horarios y qué servicio hace cada uno.
 *
 * Es **idempotente y re-ejecutable**: identifica lo que ya existe por nombre y
 * solo crea lo que falta. Correrlo dos veces no duplica nada y no falla, así que
 * sirve para volver a dejar la demo en un estado conocido después de romperla
 * probando.
 *
 * Requiere que la organización ya exista (`pnpm db:seed`). Configurable con
 * `SEED_ORG_SLUG` (default `demo`).
 *
 * Correr: `pnpm db:seed:demo`
 */

/** Barbería: el ejemplo del dominio, con los tres servicios bien separados. */
const CATALOG = [
  {
    service: 'Corte de pelo',
    description: 'Corte para adultos, con lavado opcional.',
    options: [
      { name: 'Corte simple', durationMinutes: 30, price: 8000 },
      { name: 'Corte + lavado', durationMinutes: 45, price: 11000 },
      { name: 'Corte niño', durationMinutes: 30, price: 6500 },
    ],
  },
  {
    service: 'Barbería',
    description: 'Trabajo de barba y afeitado.',
    options: [
      { name: 'Perfilado de barba', durationMinutes: 20, price: 5000 },
      { name: 'Afeitado clásico con toalla', durationMinutes: 40, price: 9000 },
      { name: 'Corte + barba', durationMinutes: 60, price: 14000 },
    ],
  },
  {
    service: 'Coloración',
    description: 'Color y decoloración. Requiere turno más largo.',
    options: [
      { name: 'Color de raíz', durationMinutes: 60, price: 18000 },
      { name: 'Color completo', durationMinutes: 90, price: 26000 },
      { name: 'Decoloración y matiz', durationMinutes: 120, price: 38000 },
    ],
  },
] as const;

/**
 * Cada recurso hace un subconjunto distinto de servicios. Es a propósito: es la
 * razón por la que coloración y barbería son servicios separados y no opciones
 * de uno solo — la asignación de quién hace qué es por servicio.
 */
const STAFF = [
  {
    name: 'Nicolás',
    type: 'persona',
    color: '#2563eb',
    services: ['Corte de pelo', 'Barbería'],
    /** Lunes a viernes, con corte al mediodía. */
    schedule: [
      { days: [1, 2, 3, 4, 5], from: '09:00:00', to: '13:00:00' },
      { days: [1, 2, 3, 4, 5], from: '14:00:00', to: '18:00:00' },
    ],
  },
  {
    name: 'Valentina',
    type: 'persona',
    color: '#db2777',
    services: ['Corte de pelo', 'Coloración'],
    schedule: [
      { days: [2, 3, 4, 5], from: '10:00:00', to: '18:00:00' },
      { days: [6], from: '09:00:00', to: '13:00:00' },
    ],
  },
  {
    name: 'Sillón 3',
    type: 'box',
    color: '#65a30d',
    services: ['Corte de pelo'],
    schedule: [{ days: [1, 2, 3, 4, 5, 6], from: '09:00:00', to: '18:00:00' }],
  },
] as const;

/** `undefined_column` de Postgres: el código pide una columna que la base no tiene. */
const PG_UNDEFINED_COLUMN = '42703';

/**
 * Detecta el caso "falta correr la migración". Drizzle envuelve el error de `pg`
 * en un `DrizzleQueryError`, así que el código real vive en `cause`.
 */
function isMissingColumn(error: unknown): boolean {
  const causes = [error, (error as { cause?: unknown })?.cause];
  return causes.some(
    (candidate) => (candidate as { code?: string } | undefined)?.code === PG_UNDEFINED_COLUMN,
  );
}

async function seedDemo(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const logger = app.get(Logger);

  const organizations = app.get<OrganizationRepository>(ORGANIZATION_REPOSITORY);
  const services = app.get(ServicesService);
  const resources = app.get(ResourcesService);

  const slug = process.env.SEED_ORG_SLUG ?? 'demo';

  try {
    const organization = await organizations.findBySlug(slug);
    if (!organization) {
      logger.error(
        `No existe una organización con slug "${slug}". Corré primero \`pnpm db:seed\`.`,
      );
      process.exitCode = 1;
      return;
    }
    const orgId = organization.id;

    // --- Servicios y opciones -------------------------------------------------
    const existingServices = await services.listServices(orgId);
    const serviceIdByName = new Map(existingServices.map((s) => [s.name, s.id]));

    for (const entry of CATALOG) {
      let serviceId = serviceIdByName.get(entry.service);
      if (!serviceId) {
        const created = await services.createService(orgId, {
          name: entry.service,
          description: entry.description,
        });
        serviceId = created.id;
        serviceIdByName.set(entry.service, serviceId);
        logger.log(`Servicio creado: ${entry.service}`);
      }

      // Las opciones se identifican por nombre dentro del servicio: así el seed
      // se puede volver a correr después de agregar una a mano sin duplicarla.
      const existingOptions = await services.listOptions(orgId, serviceId);
      const optionNames = new Set(existingOptions.map((o) => o.name));
      for (const option of entry.options) {
        if (optionNames.has(option.name)) continue;
        await services.createOption(orgId, serviceId, {
          name: option.name,
          durationMinutes: option.durationMinutes,
          price: option.price,
        });
        logger.log(`  Opción creada: ${entry.service} → ${option.name}`);
      }
    }

    // --- Recursos, horarios y asignaciones ------------------------------------
    const existingResources = await resources.listResources(orgId);
    const resourceIdByName = new Map(existingResources.map((r) => [r.name, r.id]));

    for (const staff of STAFF) {
      let resourceId = resourceIdByName.get(staff.name);
      if (!resourceId) {
        const created = await resources.createResource(orgId, {
          name: staff.name,
          type: staff.type,
          color: staff.color,
        });
        resourceId = created.id;
        resourceIdByName.set(staff.name, resourceId);
        logger.log(`Recurso creado: ${staff.name}`);
      }

      // `setSchedule` reemplaza el horario completo, así que es idempotente por
      // definición: correrlo de nuevo deja exactamente estas filas.
      await resources.setSchedule(
        orgId,
        resourceId,
        staff.schedule.flatMap((block) =>
          block.days.map((dayOfWeek) => ({
            dayOfWeek,
            startsAt: block.from,
            endsAt: block.to,
            validFrom: null,
            validTo: null,
          })),
        ),
      );

      for (const serviceName of staff.services) {
        const serviceId = serviceIdByName.get(serviceName);
        if (!serviceId) continue;
        // `assign` es un upsert sobre (recurso, servicio): repetirlo no duplica.
        await resources.assignService(orgId, resourceId, serviceId);
      }
    }

    logger.log(
      `Demo lista para "${slug}": ${CATALOG.length} servicios, ` +
        `${CATALOG.reduce((n, c) => n + c.options.length, 0)} opciones y ${STAFF.length} recursos.`,
    );
  } catch (error) {
    // El caso típico: se corre el seed antes de migrar. Sin este mensaje, lo que
    // se ve es un stack trace de Drizzle que no dice qué hacer.
    if (isMissingColumn(error)) {
      logger.error(
        'La base no tiene todavía las columnas que este seed necesita ' +
          '(`service_options.name` / `appointments.service_option_name`). ' +
          'Corré la migración primero: ver docs/deploy/migracion-nombre-de-opcion.md ' +
          '(`pnpm db:generate` → editar el SQL generado → `pnpm db:migrate`).',
      );
      process.exitCode = 1;
      return;
    }
    throw error;
  } finally {
    await app.close();
  }
}

void seedDemo();
