import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { runMigrations } from './db/migrate';

async function bootstrap() {
  // 1) Esquema actualizado (idempotente)
  await runMigrations();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 2) API bajo /api
  app.setGlobalPrefix('api');

  // Confiar en el proxy (nginx local / proxy de Render) para capturar la IP
  // real del cliente en X-Forwarded-For al registrar visitas.
  app.set('trust proxy', true);

  // 3) CORS para los frontends (lista separada por comas; se normaliza
  //    quitando espacios y la barra final para evitar errores de origen).
  const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  app.enableCors({ origin: origins.length ? origins : true });

  // 4) Imágenes subidas: /uploads/...
  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`✔ API SolidaridadCO en http://localhost:${port}/api`);
}

bootstrap().catch((e) => {
  console.error('✖ Error al arrancar el backend:', e);
  process.exit(1);
});

