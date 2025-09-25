PDF extraction
==============

This project contains a server-side PDF extraction helper at `lib/pdf-extract.ts`.

What it does
- Attempts text extraction using `pdf-parse` first.
- Falls back to `pdfjs-dist` text extraction per-page if `pdf-parse` returns little content.
- Optionally (disabled by default) performs OCR using `tesseract.js` and `canvas` (node-canvas) to handle scanned PDFs.

Enabling OCR fallback (optional)
1) Install optional dependencies:

```powershell
cd c:\Users\hp\Desktop\Projects\my-tiptap-project
npm install --save tesseract.js canvas
```

2) Ensure your environment can build `canvas` (node-gyp and Cairo deps) or use prebuilt binaries.

3) The extraction helper will dynamically load optional deps at runtime; if they are not installed, OCR will be skipped gracefully.

Buffer() deprecation warning
----------------------------
If you see a runtime deprecation warning about `Buffer()` coming from `node_modules`, it's likely from older packages. Examples found in this repo's `node_modules`:

- `lodash.merge` (bundled code references `new Buffer` in comments/examples)
- `memory-pager` uses `new Buffer(size)` in some code paths
- `sparse-bitfield` uses `new Buffer(n)` in some code paths

Suggested fixes:
- Prefer upgrading the offending packages to versions that use `Buffer.from`/`Buffer.alloc`.
- If immediate upgrades are not possible, patching locally (not recommended for long-term) or filing issues with maintainers is a short-term option.

Next steps
- Add table detection and structured extraction utilities (HTML/CSV output).
- Add data cleaning rules and optional spellcheck.
- Add unit tests and a small CLI/test runner to validate extraction on sample PDFs.
