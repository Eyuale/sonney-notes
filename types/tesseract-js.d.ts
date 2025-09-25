/* eslint-disable @typescript-eslint/no-explicit-any */
// Ambient module declarations for optional runtime-only libraries
declare module 'tesseract.js' {
  const content: any;
  export = content;
}

declare module 'canvas' {
  const content: any;
  export = content;
}

declare module 'pdfjs-dist/legacy/build/pdf.js' {
  const content: any;
  export = content;
}
