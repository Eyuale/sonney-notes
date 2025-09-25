#!/usr/bin/env ts-node
const fs = require('fs');
const path = require('path');

async function main() {
  const argv = process.argv.slice(2);
  if (!argv[0]) {
    console.error('Usage: ts-node scripts/extract-sample.ts <path-to-pdf>');
    process.exit(2);
  }
  const file = path.resolve(argv[0]);
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    process.exit(2);
  }

  const buffer = fs.readFileSync(file);
  try {
    const mod = require('../lib/pdf-extract');
    const { extractTextFromPdfBuffer, extractTablesFromPdfBuffer, tablesToCsv, tablesToHtml } = mod;
    const segment = require('../lib/pdf-segment');
    console.log('Running text extraction...');
    const text = await extractTextFromPdfBuffer(Buffer.from(buffer));
    console.log('--- Text Preview ---');
    console.log(text ? text.slice(0, 2000) : '(no text)');

    // Try to split into units and print Unit 3 if present
    try {
      const units = segment.splitIntoUnits(text);
      console.log('\nDetected units:', Object.keys(units).join(', ') || '(none)');
      const u3 = segment.getUnitContent(text, 3);
      if (u3) {
        console.log('\n--- Unit 3 Preview ---');
        console.log(u3.slice(0, 2000));
      } else {
        console.log('\nUnit 3 not detected');
      }
    } catch (err) {
      // non-fatal
    }

    console.log('\nRunning table extraction...');
    const tablesRes = await extractTablesFromPdfBuffer(Buffer.from(buffer));
    console.log('Detected pages:', tablesRes.pages.length);
    const csvMap = tablesToCsv(tablesRes.pages);
    const htmlMap = tablesToHtml(tablesRes.pages);
    for (const p of tablesRes.pages) {
      console.log(`\nPage ${p.pageNumber}: ${p.tables.length} table(s)`);
      const cs = csvMap[p.pageNumber] || [];
      cs.forEach((c: string, i: number) => {
        console.log(`\n-- Table ${i + 1} CSV --\n${c.slice(0, 2000)}`);
      });
      const hs = htmlMap[p.pageNumber] || [];
      hs.forEach((h: string, i: number) => {
        console.log(`\n-- Table ${i + 1} HTML (snippet) --\n${h.slice(0, 2000)}`);
      });
    }
  } catch (err) {
    console.error('Extraction failed:', err);
    process.exit(1);
  }
}

main();
