/** A persisted (hashed) refresh token, used for rotation and revocation. */
export interface RefreshTokenRecord {
  id: string;
  organizationId: string;
  userId: string;
  jti: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface RefreshTokenRepository {
  save(record: RefreshTokenRecord): Promise<void>;
  findByJti(jti: string): Promise<RefreshTokenRecord | null>;
  revoke(jti: string, at: Date): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
