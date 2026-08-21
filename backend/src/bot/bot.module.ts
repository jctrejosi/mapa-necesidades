import { Body, Controller, HttpException, HttpStatus, Module, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/** URL del servicio de chatbot (FastAPI). Solo el backend lo conoce. */
const BOT_SERVICE_URL = (process.env.BOT_SERVICE_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

@Controller('bot')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class BotController {
  @Post('chat')
  async chat(@Body() body: Record<string, unknown>) {
    try {
      const res = await fetch(`${BOT_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new HttpException(
          (data && (data.detail || data.error)) || `El bot respondió con ${res.status}`,
          res.status >= 400 && res.status < 500 ? res.status : HttpStatus.BAD_GATEWAY,
        );
      }
      return data;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        `No se pudo conectar con el bot: ${e instanceof Error ? e.message : String(e)}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

@Module({
  controllers: [BotController],
})
export class BotModule {}
