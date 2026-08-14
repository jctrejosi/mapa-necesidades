/** Serializa los objetos anidados del contrato del frontend. */
export function nested(
  nombre: string | null | undefined,
  telefono: string | null | undefined,
  fecha: string | null | undefined,
): { nombre: string; telefono: string; fecha: string } | null {
  const n = typeof nombre === 'string' ? nombre.trim() : '';
  if (!n) return null;
  return {
    nombre: n,
    telefono: typeof telefono === 'string' ? telefono : '',
    fecha: typeof fecha === 'string' ? fecha : '',
  };
}

/** `numeric` de Postgres llega como string; el frontend espera number. */
export const asNum = (v: string | number | null | undefined): number => Number(v ?? 0);

/** `date` de Postgres llega como string 'YYYY-MM-DD'. */
export const asDate = (v: string | Date | null | undefined): string => {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return typeof v === 'string' ? v.slice(0, 10) : '';
};

/** `timestamptz` llega como Date; el frontend espera ISO string. */
export const asIso = (v: string | Date | null | undefined): string => {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
};
