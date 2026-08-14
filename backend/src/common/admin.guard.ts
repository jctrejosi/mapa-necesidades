import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { isAdminPass } from './util';

/** Exige la contraseña de admin en el header `x-admin-password`. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const pass = (req.headers as Record<string, unknown>)['x-admin-password'];
    if (!isAdminPass(pass)) {
      throw new UnauthorizedException({ error: 'No autorizado' });
    }
    return true;
  }
}
