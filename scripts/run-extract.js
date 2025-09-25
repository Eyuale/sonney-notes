#!/usr/bin/env node
// Small runner to execute the TypeScript extract-sample script with ts-node
// in transpile-only/CommonJS mode so users can call it via `node` regardless of
// their environment's ESM/CJS defaults.

// Register ts-node programmatically
try {
  require('ts-node').register({
    transpileOnly: true,
    // Skip the project's tsconfig to avoid incompatible bundler/module settings
    skipProject: true,
    compilerOptions: { module: 'commonjs', target: 'es2019' }
  });
} catch (err) {
  console.error('ts-node is required to run this script. Please install it (npm i -D ts-node)');
  console.error(err && err.message ? err.message : err);
  process.exit(1);
}

// Forward argv (strip node + this file)
const argv = process.argv.slice(2);
process.argv = [process.argv[0], require.resolve('./extract-sample.ts'), ...argv];

// Require the TypeScript entry (it will be transpiled by ts-node register)
try {
  require('./extract-sample.ts');
} catch (err) {
  console.error('Failed to run extract-sample:', err && err.stack ? err.stack : err);
  process.exit(1);
}
