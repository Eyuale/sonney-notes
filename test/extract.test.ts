import assert from 'assert';
import fs from 'fs';
import path from 'path';

async function run() {
  const sample = path.resolve(__dirname, '..', 'README.md');
  // Use README.md as a tiny sample to ensure extractTextFromPdfBuffer handles non-pdf gracefully
  const buffer = fs.readFileSync(sample);
  const mod = await import('../lib/pdf-extract');
  const { extractTextFromPdfBuffer } = mod;
  const text = await extractTextFromPdfBuffer(Buffer.from(buffer));
  assert.strictEqual(typeof text, 'string');
  console.log('extract.test passed');
}

run().catch((e) => {
  console.error('Test failed', e);
  process.exit(1);
});
