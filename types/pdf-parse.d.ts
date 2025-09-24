declare module 'pdf-parse' {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
  info: Record<string, unknown>;
  metadata: Record<string, unknown>;
    text: string;
    version?: string;
  }

  function pdfParse(data: Buffer | Uint8Array | string): Promise<PDFParseResult>;

  export default pdfParse;
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  import type pdfParse from 'pdf-parse';
  export = pdfParse;
}
