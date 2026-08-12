# csv-parser

```sh
npm install @ferrow/csv-parser
```
![CI](https://github.com/FerrowAI/csv-parser/actions/workflows/ci.yml/badge.svg)

An RFC 4180 CSV parser and stringifier for TypeScript/Node. Handles the parts
of CSV that trip up naive `split(',')` implementations: quoted fields,
escaped `""` quotes, commas and newlines embedded inside quoted fields,
both CRLF and LF line endings, and a streaming-friendly chunked API for
large inputs. Zero runtime dependencies.

## Install

Copy `src/index.ts` into your project, or build this repo (`npm run build`)
and depend on the compiled `dist/`.

## Quickstart

```ts
import { parse, stringify } from 'csv-parser';

const rows = parse('name,age\nAda,36\nBob,29', { coerce: 'auto' });
// [{ name: 'Ada', age: 36 }, { name: 'Bob', age: 29 }]

const csv = stringify(rows);
// "name,age\nAda,36\nBob,29"
```

### Streaming

```ts
import { CsvStreamParser } from 'csv-parser';

const parser = new CsvStreamParser({ coerce: 'auto' });
for await (const chunk of readableStream) {
  parser.parseChunk(chunk); // returns rows completed by this chunk
}
parser.flush(); // finalize any trailing unterminated row
const allRows = parser.getResults();
```

`parseChunk` correctly handles a quoted field, delimiter, or newline split
across chunk boundaries — you don't need to pre-buffer complete lines.

## API

- `parse(input, options?)` — one-shot parse of a full CSV string.
  - `options.delimiter` — single-character field delimiter (default `,`).
  - `options.header` — treat row 1 as a header; returns `Record<string, value>[]`
    when `true` (default), or `string[][]`/`value[][]` when `false`.
  - `options.coerce` — opt-in type coercion, off by default:
    - `'auto'` — infer `number` / `boolean` (`true`/`false`) / `null` per field.
    - `{ columnName: 'number' | 'boolean' | 'null' | 'string' }` — per-column
      coercion when `header: true`.
- `stringify(rows, options?)` — serialize `Record<string, unknown>[]` or
  `unknown[][]` back to CSV text, quoting any field that contains the
  delimiter, a `"`, or a newline. `options.delimiter`, `options.header`,
  `options.newline` (`'\n'` default or `'\r\n'`).
- `class CsvStreamParser<T>` — incremental parser: `parseChunk(text)`,
  `flush()`, `getResults()`. Constructor takes the same options as `parse`
  minus `input`.

## Scope and limits

- This is a general-purpose CSV parser, not a schema-validation or
  data-pipeline library — type coercion is a flat auto/manual mapping, not
  a validation schema.
- `delimiter` must be exactly one character (matches RFC 4180 and most
  real-world CSV; it does not support multi-character delimiters).
- Fully blank lines are skipped rather than emitted as empty rows.
- No BOM stripping is performed — strip a leading UTF-8 BOM yourself if
  your source may include one.

Sponsored by [Ferrow](https://ferrow.ai)

---
Part of the [ferrow-toolkit](https://github.com/FerrowAI/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
