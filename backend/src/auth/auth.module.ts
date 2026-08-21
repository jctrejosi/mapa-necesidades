import { Body, Controller, Module, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { isAdminPass, isOwnerPass } from '../common/util';

@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  /**
   * Verifica la contraseña y devuelve el ROL: 'owner' si coincide con
   * OWNER_PASSWORD, 'admin' si solo coincide con ADMIN_PASSWORD.
   */
  @Post('verify')
  verify(@Body() body: Record<string, unknown>) {
    const pass = body?.['admin_password'];
    const owner = isOwnerPass(pass);
    const admin = isAdminPass(pass);
    return { ok: owner || admin, rol: owner ? 'owner' : admin ? 'admin' : null };
  }
}

@Module({ controllers: [AuthController] })
export class AuthModule {}
