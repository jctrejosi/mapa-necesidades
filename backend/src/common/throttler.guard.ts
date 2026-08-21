import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

/**
 * Límites por IP (throttler) con mensaje amigable: el frontend lee el campo
 * `error` de la respuesta y lo muestra como alert, así que aquí se responde
 * 429 con un mensaje claro en español.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected errorMessage =
    'Demasiadas peticiones desde esta IP. Espera un minuto e intenta de nuevo.';

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException({ error: this.errorMessage }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
