/** Password hashing contract (implemented with Argon2id in infrastructure). */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
  /**
   * Verifies against a stable internal dummy hash (always false). Used to keep
   * login timing constant whether or not the user exists (anti-enumeration).
   */
  verifyAgainstDummy(plain: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
