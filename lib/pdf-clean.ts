// Lightweight PDF/text cleaning utilities

export function normalizeWhitespace(s: string): string {
  return s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function fixCommonOcrErrors(s: string): string {
  // Common OCR substitutions
  return s
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    // common mis-recognitions: '0' vs 'O', '1' vs 'l' in numeric contexts are left to downstream logic
    ;
}

export function fixHyphenationAndLineBreaks(s: string): string {
  if (!s) return s;
  let out = String(s);
  // Remove hyphenation at line endings (e.g. hy-
  // phen)
  out = out.replace(/-\n\s*/g, '');
  // Preserve paragraph separators (two or more newlines), but join single
  // newlines into spaces (common in PDFs where linebreaks are not paragraphs)
  out = out.replace(/\n{2,}/g, '\n\n');
  out = out.replace(/([^\n])\n([^\n])/g, '$1 $2');
  // collapse multiple spaces again
  out = out.replace(/[ \t]{2,}/g, ' ');
  return out.trim();
}

export function normalizePunctuation(s: string): string {
  // Fix spacing around punctuation
  return s.replace(/\s+([,.!?;:])/g, '$1').replace(/\s*\n\s*/g, '\n');
}

export function cleanPdfText(raw: string): string {
  if (!raw) return '';
  let out = String(raw);
  // normalize newlines first
  out = normalizeWhitespace(out);
  out = fixHyphenationAndLineBreaks(out);
  out = fixCommonOcrErrors(out);
  out = normalizePunctuation(out);
  return out.trim();
}
