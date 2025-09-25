#!/usr/bin/env node
try {
  require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'commonjs' } });
} catch {}
const fs = require('fs');
(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/find-unit-pages.js <pdf-path> <unit-number>');
    process.exit(2);
  }
  const wanted = Number(process.argv[3]);
  if (!wanted) {
    console.error('Please provide a numeric unit number as the second arg.');
    console.error('Example: node scripts/find-unit-pages.js file.pdf 3');
    process.exit(2);
  }
  const buf = fs.readFileSync(file);
  const mod = require('../lib/pdf-extract');
  const extractor = mod.extractTextPagesFromPdfBuffer || mod.default?.extractTextPagesFromPdfBuffer;
  if (!extractor) {
    console.error('extractTextPagesFromPdfBuffer not found in lib/pdf-extract');
    process.exit(3);
  }
  const pages = await extractor(Buffer.from(buf));
  const token = new RegExp(`\\b(?:unit|chapter)\\s*${wanted}\\b`, 'i');
  let found = false;
  for (const p of pages) {
    const txt = String(p.text || '');
    if (token.test(txt)) {
      found = true;
      const idx = txt.search(token);
      const start = Math.max(0, idx - 200);
      const snippet = txt.slice(start, idx + 400).replace(/\n/g, ' ');
      console.log('--- page', p.pageNumber, '---');
      console.log(snippet);
      console.log('');
    }
  }
  if (!found) console.log('No explicit unit/chapter token found for', wanted);
})();
