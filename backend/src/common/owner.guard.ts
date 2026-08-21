import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { isOwnerPass } from './util';

/**
 * Exige la contraseña del rol OWNER en el header `x-admin-password`.
 * Los endpoints protegidos con este guard solo los ve/quiere el owner
 * (p. ej. la auditoría). Sin OWNER_PASSWORD configurada, nadie es owner
 * y estas secciones quedan inaccesibles hasta que se configure.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const pass = (req.headers as Record<string, unknown>)['x-admin-password'];
    if (!isOwnerPass(pass)) {
      throw new UnauthorizedException({ error: 'No autorizado: se requiere rol owner' });
    }
    return true;
  }
}
