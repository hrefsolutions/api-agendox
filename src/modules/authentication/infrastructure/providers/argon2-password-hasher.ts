import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '../../domain/services/password-hasher';

/** Argon2id password hasher (prebuilt binary; no native toolchain required). */
@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  /** Lazily computed, valid Argon2 hash of a random secret (for timing parity). */
  private dummyHash?: Promise<string>;

  hash(plain: string): Promise<string> {
    return hash(plain);
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      // A malformed stored hash must never authenticate the caller.
      return false;
    }
  }

  async verifyAgainstDummy(plain: string): Promise<boolean> {
    this.dummyHash ??= this.hash(randomUUID());
    return this.verify(await this.dummyHash, plain);
  }
}
