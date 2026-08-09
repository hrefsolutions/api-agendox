import { ValueObject } from '@shared/domain';
import { ValidationError } from '@shared/errors';

/**
 * Public URL slug of an organization. Globally unique, lowercase, kebab-case.
 * Used to resolve the tenant on the public booking surface.
 */
export class Slug extends ValueObject<{ value: string }> {
  private static readonly PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Slug {
    const value = raw.trim().toLowerCase();
    if (value.length < 3 || value.length > 63 || !Slug.PATTERN.test(value)) {
      throw new ValidationError('Slug inválido: usá entre 3 y 63 letras minúsculas, números y guiones', {
        slug: raw,
      });
    }
    return new Slug(value);
  }

  get value(): string {
    return this.props.value;
  }
}
