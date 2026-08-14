import {
  BadRequestException,
  Body,
  Controller,
  Injectable,
  Module,
  Post,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { str } from '../common/util';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Configuración de Cloudinary (si las credenciales existen en el entorno)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

@Injectable()
class UploadsService {
  /**
   * Recibe una imagen como data URL base64 (así la envía el frontend con
   * compressImage). La sube a Cloudinary y devuelve la URL; en la base de
   * datos se guarda solo esa URL. Si no hay credenciales de Cloudinary
   * (desarrollo), guarda el archivo en UPLOAD_DIR como respaldo.
   */
  async save(imagen: unknown): Promise<{ path: string }> {
    const s = str(imagen);
    const m = /^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/.exec(s);
    if (!m) {
      throw new BadRequestException({ error: 'Imagen inválida (se espera un data URL base64)' });
    }
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length === 0) throw new BadRequestException({ error: 'Imagen vacía' });
    if (buf.length > MAX_BYTES) {
      throw new BadRequestException({ error: 'Imagen demasiado grande (máx. 5 MB)' });
    }

    if (cloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(s, { folder: 'redsolidaria' });
        return { path: result.secure_url };
      } catch {
        throw new BadRequestException({ error: 'No se pudo subir la imagen a Cloudinary' });
      }
    }

    // Respaldo local (dev sin credenciales)
    const ext = m[1] === 'jpg' ? 'jpg' : m[1];
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
