#!/usr/bin/env node
try {
  require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'commonjs' } });
} catch (err) {
  console.error('ts-node is required for this helper');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

async function main() {
  const argv = process.argv.slice(2);
  if (!argv[0] || !argv[1]) {
    console.error('Usage: node scripts/ssot-test.js <pdf-path> <unit-number>');
    process.exit(2);
  }
  const pdfPath = path.resolve(argv[0]);
  const unit = Number(argv[1]);
  const buf = fs.readFileSync(pdfPath);
  const ssot = require('../lib/ssot');
  const { buildUnitContextAndPrompt } = ssot;
  const res = await buildUnitContextAndPrompt(buf, unit);
  console.log('--- Context (truncated) ---');
  console.log(res.context.slice(0, 2000));
  console.log('\n--- Prompt (preview) ---');
  console.log(res.prompt.slice(0, 800));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
