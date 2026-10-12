# Local OCR resources

Pinned resources embedded by `scripts/build.py`. Runtime OCR does not fetch scripts, WASM or language models from the network.

- Tesseract.js **6.0.1**: `https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js` and `worker.min.js`.
- Tesseract.js core **6.0.0**: `https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-lstm.wasm.js`, saved as `core.js`. This wrapper contains its WASM bytes, so no separate WASM file is required.
- Languages **1.0.0**, `4.0.0_best_int`: `https://cdn.jsdelivr.net/npm/@tesseract.js-data/rus@1.0.0/4.0.0_best_int/rus.traineddata.gz` and the equivalent `eng` package/file.
- Engine/model licenses: Apache-2.0, in the accompanying LICENSE files. `LICENSE-bundle` and `LICENSE-worker` retain bundled notices. Model license source: https://github.com/tesseract-ocr/tessdata_best/blob/main/LICENSE.

## Local patch to worker.min.js

The published worker accepts `{code, data}` language objects during loading, but its initialization path joins `t.data` to construct the language name. Change exactly one expression:

```js
// Published:
a.map((function(t){return"string"==typeof t?t:t.data})).join("+")
// Local:
a.map((function(t){return"string"==typeof t?t:t.code})).join("+")
```

This preserves bytes for loading while passing `rus+eng` to `TessBaseAPI.Init`. The core is concatenated before the worker, and both language byte arrays are passed directly from the HTML. `cacheMethod: 'none'` prevents unnecessary language-cache storage. The browser test recognizes a synthetic Russian label with networking disabled and verifies the manual confirmation step.

When updating dependencies, revisit this narrowly scoped patch and rerun the offline OCR test. `SHA256SUMS` records the bundled file hashes, including the patched worker.
