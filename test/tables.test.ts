import assert from 'assert';
import { tablesToCsv, tablesToHtml } from '../lib/pdf-extract';

function makeSample() {
  return [
    {
      pageNumber: 1,
      tables: [
        { rows: [ ['Name', 'Age'], ['Alice', '30'], ['Bob', '25'] ] }
      ]
    }
  ];
}

async function run() {
  const pages = makeSample();
  const csvMap = tablesToCsv(pages);
  const htmlMap = tablesToHtml(pages);

  assert.strictEqual(Array.isArray(csvMap[1]), true);
  assert.strictEqual(csvMap[1].length, 1);
  assert.strictEqual(csvMap[1][0].includes('Alice'), true);

  assert.strictEqual(Array.isArray(htmlMap[1]), true);
  assert.strictEqual(htmlMap[1].length, 1);
  assert.strictEqual(htmlMap[1][0].includes('<table'), true);

  console.log('tables.test passed');
}

run().catch((e) => {
  console.error('Test failed', e);
  process.exit(1);
});
