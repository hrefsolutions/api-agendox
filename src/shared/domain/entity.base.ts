/**
 * Base class for domain entities: objects with a stable identity.
 *
 * Equality is by identity (`id`), not by attribute values. The domain layer is
 * framework-free; entities must not depend on NestJS, the ORM or HTTP.
 */
export abstract class Entity<TId extends string = string> {
  protected constructor(public readonly id: TId) {}

  equals(other?: Entity<TId>): boolean {
    if (other === undefined || other === null) return false;
    if (!(other instanceof Entity)) return false;
    return this.id === other.id;
  }
}
