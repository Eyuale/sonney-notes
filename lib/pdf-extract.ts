// Server-side PDF extraction utilities
// Tries to use pdf-parse first (keeps the dynamic import pattern to avoid bundler-time side effects),
// then falls back to pdfjs text extraction per page when pdf-parse returns little or no text.
// Exposes a single function: extractTextFromPdfBuffer(buffer: Buffer) => string

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Buffer } from 'buffer';
// Use require for the cleaning util to avoid ESM/CJS resolution issues at runtime
// when running the sample script via ts-node register.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cleanPdfText } = require('./pdf-clean');

/**
 * Try to extract text from a PDF buffer. Steps:
 * 1) Try to use pdf-parse (fast and often sufficient)
 * 2) If pdf-parse produces very little text, fall back to pdfjs-dist and extract text per page
 * 3) Run lightweight cleaning and return the result
 *
 * Note: This module deliberately uses dynamic imports for 'pdf-parse' and 'pdfjs-dist'
 * to avoid importing files that execute code during bundling/evaluation.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  if (!buffer) return '';

  // 1) pdf-parse (internal implementation path avoids index.js side-effects)
    try {
      try {
        const imported = await import('pdf-parse/lib/pdf-parse.js');
        const pdfParse = (imported && (imported.default ?? imported)) as (
          data: Buffer | Uint8Array | string
        ) => Promise<any>;
        if (typeof pdfParse === 'function') {
          const r = await pdfParse(buffer as any);
          const text = r && typeof r.text === 'string' ? String(r.text).trim() : '';
          if (text && text.length > 200) {
            return cleanPdfText(text);
          }
        }
      } catch {
        // continue to fallback
      }

    // 2) Fallback: pdfjs text extraction per page for better structure control
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdfRaw = await loadingTask.promise;
      const pdf: any = pdfRaw;
      const maxPages = pdf.numPages || 0;
      const pageTexts: string[] = [];
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // Join text items preserving natural ordering from pdfjs
          const strs = textContent.items.map((it: any) => it.str || '').join(' ');
          pageTexts.push(strs.trim());
        } catch {
          // skip page on error
        }
      }
      const combined = pageTexts.filter(Boolean).join('\n\n');
      if (combined && combined.length > 0) {
        // If extracted text is long enough, return cleaned text
        if (combined.length > 200) return cleanPdfText(combined);
        // Otherwise, fall through to try OCR rendering for scanned PDFs
      }
    } catch {
      // if pdfjs isn't available or fails, fall through
    }

    // 3) OCR fallback: render pages to images and run tesseract.js (optional deps)
    try {
      // Dynamic import of heavy optional deps. Cast to unknown then any to avoid TS trying to resolve
  const pdfjsModule = (await import('pdfjs-dist/legacy/build/pdf.js')) as unknown as any;

      // Try to load node-canvas optionally
      let createCanvas: any = null;
      try {
  const canvasModule = (await import('canvas')) as unknown as any;
        createCanvas = canvasModule?.createCanvas ?? null;
      } catch {
        createCanvas = null;
      }

      // Try to load tesseract.js optionally
      let tesseractModule: any = null;
      try {
  tesseractModule = (await import('tesseract.js')) as unknown as any;
      } catch {
        tesseractModule = null;
      }

      if (!tesseractModule || !pdfjsModule || !createCanvas) {
        // OCR path not available without these optional deps
      } else {
        const loadingTask = pdfjsModule.getDocument({ data: buffer });
        const pdf: any = await loadingTask.promise;
        const maxPages = Math.min((pdf.numPages || 0), 10); // limit pages to keep CPU reasonable
        const ocrTexts: string[] = [];
        for (let i = 1; i <= maxPages; i++) {
          try {
            const page: any = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = createCanvas(viewport.width, viewport.height);
            const ctx = canvas.getContext('2d');
            // Render page to canvas
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL();
            // Run tesseract on the data URL
            const worker = tesseractModule.createWorker({});
            await worker.load();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const { data } = await worker.recognize(dataUrl);
            await worker.terminate();
            if (data && typeof data.text === 'string') ocrTexts.push(data.text.trim());
          } catch {
            // skip OCR page on error
          }
        }
        const combinedOcr = ocrTexts.filter(Boolean).join('\n\n');
        if (combinedOcr && combinedOcr.length > 0) return cleanPdfText(combinedOcr);
      }
    } catch {
      // OCR attempted but failed or optional deps not present -> fall through
    }
  } catch {
    // swallow and return empty string
  }

  return '';
}

/**
 * Extract text per page and return an array of { pageNumber, text } objects.
 * This is a lightweight helper for page-aware mapping.
 */
export async function extractTextPagesFromPdfBuffer(buffer: Buffer): Promise<Array<{ pageNumber: number; text: string }>> {
  const out: Array<{ pageNumber: number; text: string }> = [];
  if (!buffer) return out;
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf: any = await loadingTask.promise;
    const maxPages = pdf.numPages || 0;
    for (let i = 1; i <= maxPages; i++) {
      try {
        const page: any = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const strs = textContent.items.map((it: any) => it.str || '').join(' ');
        out.push({ pageNumber: i, text: String(strs).trim() });
      } catch {
        out.push({ pageNumber: i, text: '' });
      }
    }
  } catch {
    // ignore
  }
  return out;
}

// Re-export cleaning utility for other modules/tests
export { cleanPdfText };

/**
 * Simple table extraction heuristic.
 * - Uses pdfjs textContent items (str + transform) to build lines by Y position
 * - Within each line, items are sorted by X and clustered into columns by measuring gaps
 * - If a page contains multiple lines with consistent column counts (>=2), we return those as a table
 *
 * Note: This is intentionally conservative and intended for straightforward, column-aligned tables. For
 * complex table layouts (spanning cells, nested tables, irregular layouts), consider a dedicated table
 * extraction library or sending page images to a table-recognition model.
 */
export async function extractTablesFromPdfBuffer(buffer: Buffer): Promise<{
  pages: Array<{ pageNumber: number; tables: Array<{ rows: string[][] }> }>
}> {
  const out: { pages: Array<{ pageNumber: number; tables: Array<{ rows: string[][] }> }> } = { pages: [] };
  if (!buffer) return out;

  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf: any = await loadingTask.promise;
    const maxPages = pdf.numPages || 0;
    for (let p = 1; p <= maxPages; p++) {
      try {
        const page: any = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const items: any[] = textContent.items || [];

        // Convert items to {str, x, y, w} using transform matrix when available
        const mapped = items.map((it: any) => {
          const tm = it.transform || it.tx || [1, 0, 0, 1, 0, 0];
          // tm = [a, b, c, d, e, f] where e = x, f = y in PDF coordinate space
          const x = tm[4] ?? 0;
          const y = tm[5] ?? 0;
          const str = it.str || '';
          const w = (it.width || (str.length * 5)) as number;
          return { str: String(str).trim(), x: Number(x), y: Number(y), w: Number(w) };
        }).filter((i: any) => i.str.length > 0);

        if (!mapped.length) {
          out.pages.push({ pageNumber: p, tables: [] });
          continue;
        }

        // Group items into lines by Y coordinate (allow small deltas)
        mapped.sort((a: any, b: any) => b.y - a.y || a.x - b.x); // sort top-to-bottom
        const lines: Array<Array<any>> = [];
        const yTolerance = 4; // points
        for (const it of mapped) {
          const found = lines.find((ln) => Math.abs(ln[0].y - it.y) <= yTolerance);
          if (found) found.push(it);
          else lines.push([it]);
        }

        // For each line, sort by x
        for (const ln of lines) ln.sort((a: any, b: any) => a.x - b.x);

        // Build candidate column edges by collecting x positions and clustering.
        // Use rounded x positions and compute gaps; pick separators using a robust threshold
        const xPositions = Array.from(new Set(mapped.map((m) => Math.round(m.x)))).sort((a, b) => a - b);
        const gaps: Array<{ from: number; to: number; gap: number }> = [];
        for (let i = 1; i < xPositions.length; i++) {
          gaps.push({ from: xPositions[i - 1], to: xPositions[i], gap: xPositions[i] - xPositions[i - 1] });
        }

        // If we don't have gaps (all items same x), skip column detection
        if (gaps.length === 0) {
          out.pages.push({ pageNumber: p, tables: [] });
          continue;
        }

        // Robust gap threshold: use median gap scaled factor, fallback to mean
        const sortedGaps = gaps.map((g) => g.gap).sort((a, b) => a - b);
        const medianGap = sortedGaps.length % 2 === 1
          ? sortedGaps[(sortedGaps.length - 1) / 2]
          : Math.round((sortedGaps[sortedGaps.length / 2 - 1] + sortedGaps[sortedGaps.length / 2]) / 2);
        const meanGap = Math.round(gaps.reduce((s, g) => s + g.gap, 0) / gaps.length);
        const base = Math.max(8, Math.min(medianGap || meanGap, meanGap));
        const gapThreshold = Math.max(12, Math.round(base * 1.4));
        const separators = gaps.filter((g) => g.gap >= gapThreshold).map((g) => g.to);

        // Build columns by splitting xPositions at separators. Avoid empty columns.
        const columns: number[][] = [];
        let current: number[] = [];
        for (const x of xPositions) {
          current.push(x);
          if (separators.includes(x)) {
            if (current.length) columns.push(current.slice());
            current = [];
          }
        }
        if (current.length) columns.push(current.slice());

        // If we have at least 2 columns, try to map each line into columns
        const tables: Array<{ rows: string[][] }> = [];
        if (columns.length >= 2) {
          const colCenters = columns.map((col) => Math.round(col.reduce((s, v) => s + v, 0) / col.length));

          // For each line, assign each item to nearest column center
          const rows: string[][] = [];
          for (const ln of lines) {
            const row: string[] = new Array(colCenters.length).fill('');
            for (const it of ln) {
              // find nearest column center
              let best = 0;
              let bestDist = Math.abs(it.x - colCenters[0]);
              for (let ci = 1; ci < colCenters.length; ci++) {
                const d = Math.abs(it.x - colCenters[ci]);
                if (d < bestDist) {
                  best = ci;
                  bestDist = d;
                }
              }
              // Append with space if present
              row[best] = row[best] ? row[best] + ' ' + it.str : it.str;
            }
            // Heuristic: accept row if at least two columns have content
            const nonEmpty = row.filter((c) => c && c.trim().length > 0).length;
            if (nonEmpty >= 2) rows.push(row.map((c) => (c ? cleanPdfText(c) : '')));
          }

          // Post-filter: require at least 3 rows to consider a table
          if (rows.length >= 3) {
            tables.push({ rows });
          }
        }

        out.pages.push({ pageNumber: p, tables });
      } catch {
        out.pages.push({ pageNumber: p, tables: [] });
      }
    }
  } catch {
    // return empty when pdf parsing not available
  }

  return out;
}

/**
 * Convert extracted tables to CSV. Returns a map of pageNumber -> array of CSV strings (one per table).
 */
export function tablesToCsv(pages: Array<{ pageNumber: number; tables: Array<{ rows: string[][] }> }>): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  for (const p of pages) {
    const csvs: string[] = [];
    for (const t of p.tables) {
      const rows = t.rows.map((r) => r.map((c) => {
        // Escape double quotes by doubling them and wrap fields that contain commas/quotes/newlines
        const needsWrap = /[",\n]/.test(c);
        const escaped = String(c).replace(/"/g, '""');
        return needsWrap ? `"${escaped}"` : escaped;
      }).join(','));
      csvs.push(rows.join('\n'));
    }
    out[p.pageNumber] = csvs;
  }
  return out;
}

/**
 * Convert extracted tables to simple HTML strings. Returns a map of pageNumber -> array of HTML strings (one per table).
 */
export function tablesToHtml(pages: Array<{ pageNumber: number; tables: Array<{ rows: string[][] }> }>): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  for (const p of pages) {
    const htmls: string[] = [];
    for (const t of p.tables) {
      const rowsHtml = t.rows.map((r) => '<tr>' + r.map((c) => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>').join('');
      htmls.push(`<table border="1">${rowsHtml}</table>`);
    }
    out[p.pageNumber] = htmls;
  }
  return out;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/*
Notes and next steps (developer):
- For improved OCR fallback, install and wire one of:
  - Google Vision API (recommended for high-quality OCR) and call it per-page with images
  - tesseract.js (WASM) as a local fallback: requires rendering PDF pages to images using node-canvas or sharp
  - AWS Textract for cloud OCR
- Helpful packages: 'tesseract.js', 'canvas' (node-canvas), 'sharp' or native poppler-based tools for PDF -> image rasterization
*/
