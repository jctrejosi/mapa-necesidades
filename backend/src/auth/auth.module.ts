import { Body, Controller, Module, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { isAdminPass } from '../common/util';

@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  /** Verifica la contraseña de admin (equivale a `verificar_admin`). */
  @Post('verify')
  verify(@Body() body: Record<string, unknown>) {
    return { ok: isAdminPass(body?.['admin_password']) };
  }
}

@Module({ controllers: [AuthController] })
export class AuthModule {}
