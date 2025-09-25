import assert from 'assert';
import { splitIntoUnits, getUnitContent } from '../lib/pdf-segment';

async function run() {
  const sample = `Introduction\nUnit 1 - Basics\nThis is content for unit one.\n\nUnit 2 - Advanced\nContent two.\n\nUnit 3 - Deep Dive\nHere is unit three content numbering and examples.\nMore lines.`;
  const map = splitIntoUnits(sample);
  assert.strictEqual(typeof map['Unit 3']?.content, 'string');
  const u3 = getUnitContent(sample, 3);
  assert.strictEqual(u3?.includes('unit three'), true);
  console.log('segment.test passed');
}

run().catch((e) => {
  console.error('Test failed', e);
  process.exit(1);
});
