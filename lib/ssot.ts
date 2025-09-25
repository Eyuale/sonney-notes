import { extractTablesFromPdfBuffer, tablesToCsv } from './pdf-extract';
import { getUnitContent, extractUnitBody } from './pdf-segment';
import { cleanPdfText } from './pdf-clean';

/**
 * Given a PDF buffer and a unit number, produce a single-source-of-truth context
 * string trimmed to roughly `maxChars` characters and a grounded prompt for an LLM.
 */
export async function buildUnitContextAndPrompt(buffer: Buffer, unitNumber: number, opts?: { maxChars?: number }) {
  const maxChars = opts?.maxChars ?? 8000;
  // Try page-aware extraction first
  const { extractTextPagesFromPdfBuffer, extractTextFromPdfBuffer } = await import('./pdf-extract');
  const pages = await extractTextPagesFromPdfBuffer(buffer as Buffer);
  let body = '';
  // Look for title or section on pages
  const titleToken = new RegExp(`\\b(?:Unit|Chapter)\\s*${unitNumber}\\b`, 'i');
  const sectionToken = new RegExp(`\\b${unitNumber}\\.[0-9]{1,3}\\b`);
  let startPage = -1;
  for (const p of pages) {
    if (titleToken.test(p.text) || sectionToken.test(p.text)) {
      startPage = p.pageNumber;
      break;
    }
  }

  if (startPage > 0) {
    // collect pages from startPage until we find the next unit token or reach a reasonable limit
    const collected: string[] = [];
    for (let i = startPage; i <= pages.length && collected.join('\n').length < (opts?.maxChars ?? 8000) * 2; i++) {
      const p = pages.find((pp) => pp.pageNumber === i);
      if (!p) break;
      // stop if next unit detected on this page (and not the start page)
      if (i > startPage && new RegExp(`\\b(?:Unit|Chapter)\\s*\\d{1,3}\\b`, 'i').test(p.text)) break;
      collected.push(p.text);
    }
    body = collected.join('\n\n');
  }

  // If page-aware failed, fallback to extracting all text and then segmentation
  if (!body) {
  const raw = await extractTextFromPdfBuffer(buffer as Buffer);
    const cleaned = cleanPdfText(raw || '');
    body = extractUnitBody(cleaned, unitNumber) || getUnitContent(cleaned, unitNumber) || '';
  }
  body = String(body || '').trim();

  // If still empty, try tables extraction for the PDF as a fallback
  if (!body) {
    try {
  const tablesRes = await extractTablesFromPdfBuffer(buffer as Buffer);
      const csvMap = tablesToCsv(tablesRes.pages);
      const pageKeys = Object.keys(csvMap).map((k) => Number(k)).sort((a, b) => a - b);
      // join small amount of table text
      const snippets: string[] = [];
      for (const pk of pageKeys.slice(0, 3)) {
        for (const s of csvMap[pk] || []) snippets.push(s.slice(0, 1000));
      }
      if (snippets.length) body = snippets.join('\n\n');
    } catch {
      // ignore
    }
  }

  // Trim body for prompt: prefer whole paragraphs, but keep within maxChars
  if (body.length > maxChars) {
    // keep first maxChars, then backtrack to last paragraph break
    let trimmed = body.slice(0, maxChars);
    const lastBreak = Math.max(trimmed.lastIndexOf('\n\n'), trimmed.lastIndexOf('. '));
    if (lastBreak > 200) trimmed = trimmed.slice(0, lastBreak + 1);
    body = trimmed;
  }

  const prompt = `You are given the following authoritative excerpt from a user's textbook (Unit ${unitNumber}). Use only this text to answer the user's question. If the answer is not present, say you don't know and suggest where the user might look in the unit.

Context:\n${body}\n\nQuestion: <INSERT USER QUESTION HERE>`;

  return { context: body, prompt };
}

export default buildUnitContextAndPrompt;
