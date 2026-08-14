import {
  BadRequestException,
  Body,
  Controller,
  Injectable,
  Module,
  Post,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { str } from '../common/util';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
class UploadsService {
  /**
   * Recibe una imagen como data URL base64 (así la envía el frontend
   * con compressImage) y la guarda en UPLOAD_DIR. Devuelve la ruta pública.
   */
  save(imagen: unknown): { path: string } {
    const s = str(imagen);
    const m = /^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/.exec(s);
    if (!m) {
      throw new BadRequestException({ error: 'Imagen inválida (se espera un data URL base64)' });
    }
    const ext = m[1] === 'jpg' ? 'jpg' : m[1];
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length === 0) throw new BadRequestException({ error: 'Imagen vacía' });
    if (buf.length > MAX_BYTES) throw new BadRequestException({ error: 'Imagen demasiado grande (máx. 5 MB)' });

    const dir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    const name = `img_${crypto.randomBytes(8).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(dir, name), buf);
    return { path: `/uploads/${name}` };
  }
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly svc: UploadsService) {}

  @Post()
  upload(@Body() b: { imagen?: string }) {
    return this.svc.save(b?.imagen);
  }
}

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
