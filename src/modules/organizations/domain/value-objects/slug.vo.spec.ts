import { ValidationError } from '@shared/errors';

import { Slug } from './slug.vo';

describe('Slug', () => {
  it('accepts and normalizes a valid slug', () => {
    expect(Slug.create('Barberia-Central').value).toBe('barberia-central');
    expect(Slug.create('  demo-123 ').value).toBe('demo-123');
  });

  it.each(['ab', 'has space', '-leading', 'trailing-', 'double--hyphen', 'accént', ''])(
    'rejects invalid slug %p',
    (raw) => {
      expect(() => Slug.create(raw)).toThrow(ValidationError);
    },
  );

  it('rejects a slug longer than 63 chars', () => {
    expect(() => Slug.create('a'.repeat(64))).toThrow(ValidationError);
  });

  it.each(['legal', 'api', 'PORTAL', ' admin '])(
    'rejects the reserved slug %p',
    (raw) => {
      expect(() => Slug.create(raw)).toThrow(ValidationError);
    },
  );
});
