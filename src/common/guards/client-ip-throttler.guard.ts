import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limiter que cuenta por **cliente real** y no por IP de socket.
 *
 * Las tres apps de front hablan con esta API desde el servidor (patrón BFF: el
 * browser pega same-origin a Next, y Next reenvía). Para Express, entonces,
 * *todos* los visitantes del planeta llegan desde la misma IP: la del deploy de
 * Next. Con el `ThrottlerGuard` de fábrica eso hace que los topes se compartan
 * entre todos — 5 pedidos de código por minuto para toda la plataforma, no por
 * persona—, así que un puñado de reservas simultáneas (o un solo usuario
 * probando) dejaba a los demás con 429 sin haber hecho nada. Ese era el "no
 * puedo reenviarme el código".
 *
 * La IP del visitante viaja en `x-forwarded-for`, que cada BFF propaga. Se toma
 * la entrada **más a la izquierda**: es la del cliente original, y las que
 * siguen son los saltos intermedios.
 *
 * Sobre la confianza en la cabecera: es falsificable por quien le pegue directo
 * a la API, así que este tope es defensa en profundidad y no el control real.
 * Lo que de verdad acota el abuso del OTP vive en el caso de uso y cuenta por
 * (organización, email) contra la base — eso no se falsifica cambiando una
 * cabecera. El intercambio es a favor: hoy la cabecera se ignora y el efecto es
 * bloquear a usuarios legítimos, que es el peor de los dos errores.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    return clientIp(req) ?? 'unknown';
  }
}

function clientIp(req: Record<string, unknown>): string | null {
  const headers = req.headers as Record<string, string | string[] | undefined> | undefined;
  const forwarded = headers?.['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(',')[0]?.trim();
  if (first) return first;

  const ip = req.ip;
  return typeof ip === 'string' && ip.length > 0 ? ip : null;
}
