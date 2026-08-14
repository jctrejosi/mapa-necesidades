import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { desc, eq, isNull, or } from 'drizzle-orm';
import { DB, Db } from '../db/database';
import { noticias } from '../db/schema';
import { AdminGuard } from '../common/admin.guard';
import { asDate } from '../common/serialize';
import { str, toDate, toInt, today } from '../common/util';

type NoticiaBody = {
  ciudad?: string;
  titulo?: string;
  contenido?: string;
  imagen?: string;
  autor?: string;
  fecha?: string;
};

@Injectable()
class NoticiasService {
  constructor(@Inject(DB) private db: Db) {}

  private serialize(n: typeof noticias.$inferSelect) {
    return {
      id: n.id,
      ciudad: n.ciudad,
      titulo: n.titulo,
      contenido: n.contenido,
      imagen: n.imagen ?? '',
      autor: n.autor ?? '',
      fecha: asDate(n.fecha),
    };
  }

  async list(ciudad: unknown) {
    const c = str(ciudad) || 'manizales';
    const rows = await this.db
      .select()
      .from(noticias)
      .where(or(isNull(noticias.ciudad), eq(noticias.ciudad, c)))
      .orderBy(desc(noticias.createdAt));
    return rows.map((r) => this.serialize(r));
  }

  async create(b: NoticiaBody) {
    const titulo = str(b.titulo);
    const contenido = str(b.contenido);
    if (!titulo) throw new BadRequestException({ error: 'Falta el título' });
    if (!contenido) throw new BadRequestException({ error: 'Falta el contenido' });

    const [n] = await this.db
      .insert(noticias)
      .values({
        ciudad: str(b.ciudad) || null, // vacío = visible en todas
        titulo,
        contenido,
        imagen: str(b.imagen) || null,
        autor: str(b.autor) || null,
        fecha: toDate(b.fecha) ?? today(),
      })
      .returning();
    return this.serialize(n);
  }

  async update(id: number, b: NoticiaBody) {
    const set: Partial<typeof noticias.$inferInsert> = {};
    if (b.ciudad !== undefined) set.ciudad = str(b.ciudad) || null;
    if (b.titulo !== undefined) set.titulo = str(b.titulo);
    if (b.contenido !== undefined) set.contenido = str(b.contenido);
    if (b.imagen !== undefined) set.imagen = str(b.imagen) || null;
    if (b.autor !== undefined) set.autor = str(b.autor) || null;
    if (b.fecha !== undefined) set.fecha = toDate(b.fecha) ?? today();
    const [n] = await this.db.update(noticias).set(set).where(eq(noticias.id, id)).returning();
    return this.serialize(n);
  }

  async remove(id: number) {
    await this.db.delete(noticias).where(eq(noticias.id, id));
    return { ok: true };
  }
}

@Controller('noticias')
export class NoticiasController {
  constructor(private readonly svc: NoticiasService) {}

  @Get()
  list(@Query('ciudad') ciudad?: string) {
    return this.svc.list(ciudad ?? 'manizales');
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() b: NoticiaBody) {
    return this.svc.create(b);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() b: NoticiaBody) {
    return this.svc.update(toInt(id), b);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(toInt(id));
  }
}

@Module({
  controllers: [NoticiasController],
  providers: [NoticiasService],
})
export class NoticiasModule {}
