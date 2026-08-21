/** Tipos mínimos del plugin pdfkit-table (no trae tipos propios). */
declare module 'pdfkit-table' {
  import type PDFDocument from 'pdfkit';

  export class PDFDocumentWithTables extends PDFDocument {
    table(table: unknown, options?: Record<string, unknown>): void;
  }
}
