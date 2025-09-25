#!/usr/bin/env node
try {
  require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'commonjs' } });
} catch (err) {
  // ts-node is optional but helpful for running these helpers
}
const fs = require('fs');
(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/dump-pages.js <pdf-path>');
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
  for (const p of pages) {
    console.log('--- page', p.pageNumber, '---');
    console.log(p.text ? p.text.slice(0, 2000) : '[no text]');
    console.log('');
  }
  console.log('Total pages:', pages.length);
})();
