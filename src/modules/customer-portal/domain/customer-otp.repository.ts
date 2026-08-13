export interface CustomerOtpRecord {
  id: string;
  organizationId: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  createdAt: Date;
}

/**
 * Nota sobre el throttling de reenvíos: sólo cuentan los códigos **sin
 * consumir**. Un código que la persona usó demuestra que el buzón es suyo, así
 * que no es la señal de abuso que el tope busca frenar; contarlos hacía que
 * entrar y salir un par de veces —o probar el flujo— dejara al cliente sin
 * poder pedir otro código durante una hora.
 */
export interface CustomerOtpRepository {
  save(record: CustomerOtpRecord): Promise<void>;
  /**
   * Latest not-yet-consumed OTP for the (organization, email) pair. Es también
   * el que manda en la espera entre reenvíos.
   */
  findLatestActive(organizationId: string, email: string): Promise<CustomerOtpRecord | null>;
  /** How many unconsumed codes were issued to the pair since a point in time. */
  countSince(organizationId: string, email: string, since: Date): Promise<number>;
  /**
   * Oldest unconsumed OTP still inside the throttling window. It is the one
   * whose ageing out frees a slot, so it drives the "try again in…" hint.
   */
  findOldestSince(
    organizationId: string,
    email: string,
    since: Date,
  ): Promise<CustomerOtpRecord | null>;
  incrementAttempts(id: string): Promise<void>;
  consume(id: string, at: Date): Promise<void>;
}

export const CUSTOMER_OTP_REPOSITORY = Symbol('CUSTOMER_OTP_REPOSITORY');
