import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { UnauthorizedError } from '@shared/errors';

import type { CustomerPrincipal } from '../tenant/request-context';

/** Injects the authenticated customer (set by the `CustomerOtpGuard`). */
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CustomerPrincipal => {
    const request = ctx.switchToHttp().getRequest<{ customer?: CustomerPrincipal }>();
    if (!request.customer) {
      throw new UnauthorizedError('No estás autenticado como cliente');
    }
    return request.customer;
  },
);
