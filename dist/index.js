"use strict";
/**
 * csv-parser — an RFC 4180 compliant CSV parser and stringifier.
 *
 * Handles quoted fields, escaped quotes ("" inside quotes), embedded
 * newlines/commas inside quoted fields, CRLF and LF line endings, an
 * optional header row, a configurable delimiter, and opt-in type
 * coercion. Includes a streaming-friendly chunked API for large inputs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvStreamParser = void 0;
exports.parse = parse;
exports.stringify = stringify;
const DEFAULT_DELIMITER = ',';
function coerceValue(raw, kind) {
    if (kind === 'string' || kind === undefined)
        return raw;
    if (kind === 'null')
        return raw === '' ? null : raw;
    if (kind === 'number') {
        if (raw.trim() === '')
            return raw;
        const n = Number(raw);
        return Number.isNaN(n) ? raw : n;
    }
    if (kind === 'boolean') {
        if (raw === 'true')
            return true;
        if (raw === 'false')
            return false;
        return raw;
    }
    return raw;
}
function autoCoerce(raw) {
    if (raw === '')
        return raw;
    if (raw === 'true')
        return true;
    if (raw === 'false')
        return false;
    if (raw === 'null')
        return null;
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw)) {
        const n = Number(raw);
        if (!Number.isNaN(n))
            return n;
    }
    return raw;
}
function applyCoercion(row, headers, coerce) {
    if (!coerce)
        return row;
    return row.map((raw, i) => {
        if (coerce === 'auto')
            return autoCoerce(raw);
        const key = headers ? headers[i] : undefined;
        const kind = key !== undefined ? coerce[key] : undefined;
        return coerceValue(raw, kind);
    });
}
/**
 * Incremental RFC 4180 CSV parser. Feed it chunks of text as they arrive
 * (e.g. from a stream) via parseChunk(), then call flush() once at EOF to
 * retrieve any trailing unterminated field/row and finalize output.
 *
 * State machine states: FIELD_START -> UNQUOTED | QUOTED -> (delimiter|newline) -> FIELD_START
 */
class CsvStreamParser {
    constructor(options = {}) {
        this.headers = null;
        this.headerCaptured = false;
        this.field = '';
        this.row = [];
        this.inQuotes = false;
        this.fieldHadContent = false;
        this.pendingCR = false;
        this.out = [];
        this.delimiter = options.delimiter ?? DEFAULT_DELIMITER;
        if (this.delimiter.length !== 1) {
            throw new Error('delimiter must be a single character');
        }
        this.wantHeader = options.header ?? true;
        this.coerce = options.coerce;
        this.headerCaptured = !this.wantHeader;
    }
    /** Feed the next chunk of raw CSV text. Returns rows completed by this chunk. */
    parseChunk(chunk) {
        const produced = [];
        let i = 0;
        const n = chunk.length;
        while (i < n) {
            const c = chunk[i];
            if (this.pendingCR) {
                this.pendingCR = false;
                if (c === '\n') {
                    i++;
                    continue; // CRLF already handled as one newline when CR was seen
                }
            }
            if (this.inQuotes) {
                if (c === '"') {
                    const next = chunk[i + 1];
                    if (next === '"') {
                        this.field += '"';
                        i += 2;
                        continue;
                    }
                    this.inQuotes = false;
                    i++;
                    continue;
                }
                this.field += c;
                i++;
                continue;
            }
            if (c === '"' && !this.fieldHadContent) {
                this.inQuotes = true;
                this.fieldHadContent = true;
                i++;
                continue;
            }
            if (c === this.delimiter) {
                this.row.push(this.field);
                this.field = '';
                this.fieldHadContent = false;
                i++;
                continue;
            }
            if (c === '\r') {
                this.pendingCR = true;
                this.endRow(produced);
                i++;
                continue;
            }
            if (c === '\n') {
                this.endRow(produced);
                i++;
                continue;
            }
            this.field += c;
            this.fieldHadContent = true;
            i++;
        }
        return this.consumeRows(produced);
    }
    endRow(produced) {
        // Skip fully-empty lines (no field content and only one empty pending field)
        if (this.row.length === 0 && this.field === '' && !this.fieldHadContent) {
            return;
        }
        this.row.push(this.field);
        produced.push(this.row);
        this.row = [];
        this.field = '';
        this.fieldHadContent = false;
    }
    consumeRows(rows) {
        const result = [];
        for (const row of rows) {
            if (!this.headerCaptured) {
                this.headers = row;
                this.headerCaptured = true;
                continue;
            }
            const coerced = applyCoercion(row, this.headers, this.coerce);
            const finalValue = this.headers
                ? this.buildRecord(coerced)
                : coerced;
            result.push(finalValue);
            this.out.push(finalValue);
        }
        return result;
    }
    buildRecord(coerced) {
        const rec = {};
        const headers = this.headers;
        for (let i = 0; i < headers.length; i++) {
            rec[headers[i]] = coerced[i] ?? '';
        }
        return rec;
    }
    /** Call at end of input to flush any trailing unterminated row/field. */
    flush() {
        const produced = [];
        if (this.inQuotes || this.field !== '' || this.fieldHadContent || this.row.length > 0) {
            this.endRow(produced);
        }
        this.inQuotes = false;
        return this.consumeRows(produced);
    }
    /** All rows parsed so far across every parseChunk()/flush() call. */
    getResults() {
        return this.out;
    }
}
exports.CsvStreamParser = CsvStreamParser;
function parse(input, options = {}) {
    const parser = new CsvStreamParser(options);
    parser.parseChunk(input);
    parser.flush();
    return parser.getResults();
}
/** Escape a single field for CSV output per RFC 4180 quoting rules. */
function escapeField(value, delimiter) {
    const str = value === null || value === undefined ? '' : String(value);
    const needsQuoting = str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r');
    if (!needsQuoting)
        return str;
    return `"${str.replace(/"/g, '""')}"`;
}
/**
 * Serialize an array of objects (or array-of-arrays) back to CSV text.
 * Always quotes fields that contain the delimiter, a quote, or a newline.
 */
function stringify(rows, options = {}) {
    const delimiter = options.delimiter ?? DEFAULT_DELIMITER;
    const newline = options.newline ?? '\n';
    const wantHeader = options.header ?? true;
    if (rows.length === 0)
        return '';
    const isObjectRows = !Array.isArray(rows[0]);
    const lines = [];
    if (isObjectRows) {
        const objRows = rows;
        const headers = Object.keys(objRows[0]);
        if (wantHeader) {
            lines.push(headers.map((h) => escapeField(h, delimiter)).join(delimiter));
        }
        for (const row of objRows) {
            lines.push(headers.map((h) => escapeField(row[h], delimiter)).join(delimiter));
        }
    }
    else {
        const arrRows = rows;
        for (const row of arrRows) {
            lines.push(row.map((v) => escapeField(v, delimiter)).join(delimiter));
        }
    }
    return lines.join(newline);
}
exports.default = { parse, stringify, CsvStreamParser };
