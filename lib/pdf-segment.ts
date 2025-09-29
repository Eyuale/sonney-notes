// Helpers to split cleaned PDF text into logical sections/units/chapters using
// conservative, OCR-tolerant heading detection.

export type SectionMap = Record<string, { title: string; content: string }>;

function preNormalizeLineForHeading(line: string): string {
  // Fix common OCR variants that break the word 'Unit' or 'Chapter'
  return line
    .replace(/U[nN][l1I]t/gi, 'Unit') // Un1t, UnlT -> Unit
    .replace(/Un1t/gi, 'Unit')
    .replace(/Chapt?r/gi, 'Chapter')
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const headingRegex = /^(?:\s*)(?:(Unit|Chapter|Lesson|Section)\b)[\s\-:]*([0-9]{1,3})\b(.*)$/i;

// Inline (not-start-of-line) heading regex for contents-style lines
const inlineHeadingRegex = /(?:\b)(Unit|Chapter|Lesson|Section)\s*([0-9]{1,3})(?:\b)/ig;

/**
 * Split a cleaned text body into sections keyed by detected headings.
 * Returns a map where keys are normalized titles like 'Unit 3' and values contain title and content.
 */
export function splitIntoUnits(cleanedText: string): SectionMap {
  const out: SectionMap = {};
  if (!cleanedText) return out;

  const lines = cleanedText.split(/\r?\n/);
  let currentKey: string | null = null;
  let currentTitle = '';
  let buffer: string[] = [];

  for (const rawLine of lines) {
    const line = preNormalizeLineForHeading(rawLine);
    const m = line.match(headingRegex);
    if (m) {
      // flush previous
      if (currentKey) {
        out[currentKey] = { title: currentTitle, content: buffer.join('\n').trim() };
      }
      const kind = (m[1] || 'Unit').trim();
      const num = (m[2] || '').trim();
      currentTitle = `${kind} ${num}${(m[3] || '').trim() ? ' - ' + m[3].trim() : ''}`;
      currentKey = `${kind} ${num}`;
      buffer = [];
      continue; // heading line not included in body
    }

    // otherwise accumulate
    if (currentKey) buffer.push(rawLine);
  }

  if (currentKey) {
    out[currentKey] = { title: currentTitle, content: buffer.join('\n').trim() };
  }

  return out;
}

/**
 * Fallback: search the whole document for inline occurrences of "Unit X" and
 * extract a small window of text after that token as a candidate content.
 * This is used when the primary line-based detection finds no headings.
 */
function fallbackExtractUnits(cleanedText: string): SectionMap {
  const out: SectionMap = {};
  if (!cleanedText) return out;
  const text = cleanedText;
  const matches: Array<{ kind: string; num: number; index: number }> = [];
  let m: RegExpExecArray | null;
  // reset regex lastIndex
  (inlineHeadingRegex as any).lastIndex = 0;
  while ((m = inlineHeadingRegex.exec(text)) !== null) {
    const kind = m[1];
    const num = parseInt(m[2], 10);
    matches.push({ kind, num, index: m.index });
  }

  // For each match, grab the following chunk up to the next match or a size limit
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const start = Math.max(0, cur.index);
    const slice = text.slice(start, Math.min(nextIndex, start + 2000));
    const key = `${cur.kind} ${cur.num}`;
    out[key] = { title: `${cur.kind} ${cur.num}`, content: slice.trim() };
  }

  return out;
}

/**
 * Attempt to locate the real body start of the unit by searching for the unit
 * title or section markers (e.g., '3.1'). Returns the extracted body between
 * the found start and the next unit or a reasonable window if next unit not found.
 */
export function extractUnitBody(cleanedText: string, unitNumber: number, maxChars = 20000): string | null {
  if (!cleanedText) return null;
  const text = cleanedText;
  const unitToken = new RegExp(`\\b(?:Unit|Chapter)\\s*${unitNumber}\\b`, 'i');

  // 1) Try to find the unit title in ToC and capture title words following it
  const tocMatch = text.match(new RegExp(`(?:Unit\\s*${unitNumber}[^\n]{0,80})`, 'i'));
  const titleSnippet: string | null = tocMatch ? tocMatch[0] : null;

  // 2) Search for an exact title phrase occurrence in the body if found in toc
  if (titleSnippet) {
    // Take the last few meaningful words from the toc snippet as a title candidate
    const words = titleSnippet.replace(/\d+/g, '').replace(/Unit/i, '').trim().split(/\s+/).filter(Boolean);
    const candidate = words.slice(0, 6).join(' ');
    if (candidate) {
      const re = new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const bodyTitleIdx = text.search(re);
      // Ensure the found candidate is not the same ToC line by preferring matches that
      // occur after the first 1000 chars (likely body starts later) or that appear at line starts
      if (bodyTitleIdx >= 0 && bodyTitleIdx > 1000) {
        const start = bodyTitleIdx;
        const nextUnit = text.slice(start + 10).search(/\b(Unit|Chapter)\s*[0-9]{1,3}\b/i);
        const end = nextUnit >= 0 ? start + 10 + nextUnit : Math.min(text.length, start + maxChars);
        return text.slice(start, end).trim();
      }

      // Try a stricter line-start match for the section numbers (e.g., '\n3.1')
      const sectionLineRe = new RegExp(`(^|\\n)\\s*${unitNumber}\\.[0-9]{1,3}\\b`, 'm');
      const sectionExec = sectionLineRe.exec(text);
      if (sectionExec && sectionExec.index >= 0) {
        const start = sectionExec.index;
        const nextUnit = text.slice(start + 10).search(/\b(Unit|Chapter)\s*[0-9]{1,3}\b/i);
        const end = nextUnit >= 0 ? start + 10 + nextUnit : Math.min(text.length, start + maxChars);
        return text.slice(start, end).trim();
      }
    }
  }

  // 3) If no title match, search for section marker like '\n3.1' anchored at line starts and use it as start
  const sectionLineRe2 = new RegExp(`(^|\\n)\\s*${unitNumber}\\.[0-9]{1,3}\\b`, 'm');
  const sectionExec2 = sectionLineRe2.exec(text);
  if (sectionExec2 && sectionExec2.index >= 0) {
    const start = sectionExec2.index;
    const nextUnit = text.slice(start + 10).search(/\b(Unit|Chapter)\s*[0-9]{1,3}\b/i);
    const end = nextUnit >= 0 ? start + 10 + nextUnit : Math.min(text.length, start + maxChars);
    return text.slice(start, end).trim();
  }

  // 4) Last resort: locate unit token and return a following window
  const unitIdx = text.search(unitToken);
  if (unitIdx >= 0) {
    const start = unitIdx;
    const nextUnit = text.slice(start + 10).search(/\b(Unit|Chapter)\s*[0-9]{1,3}\b/i);
    const end = nextUnit >= 0 ? start + 10 + nextUnit : Math.min(text.length, start + maxChars);
    return text.slice(start, end).trim();
  }

  return null;
}

/** Return the content for a specific unit number (e.g. 3 for 'Unit 3') or null if not found. */
export function getUnitContent(cleanedText: string, unitNumber: number): string | null {
  // Prefer to map a ToC entry to an actual body start
  const body = extractUnitBody(cleanedText, unitNumber);
  if (body) return body;

  let map = splitIntoUnits(cleanedText);
  const keyCandidates = [
    `Unit ${unitNumber}`,
    `unit ${unitNumber}`,
    `Chapter ${unitNumber}`,
  ];
  for (const k of keyCandidates) {
    if (map[k]) return map[k].content || null;
  }
  // Fallback: try inline scanning across the whole document
  map = { ...map, ...fallbackExtractUnits(cleanedText) };
  const found = Object.keys(map).find((k) => k.match(new RegExp(`\\b(?:Unit|Chapter)\\s*${unitNumber}\\b`, 'i')));
  return found ? map[found].content : null;
}

export default splitIntoUnits;
