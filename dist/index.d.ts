/**
 * csv-parser — an RFC 4180 compliant CSV parser and stringifier.
 *
 * Handles quoted fields, escaped quotes ("" inside quotes), embedded
 * newlines/commas inside quoted fields, CRLF and LF line endings, an
 * optional header row, a configurable delimiter, and opt-in type
 * coercion. Includes a streaming-friendly chunked API for large inputs.
 */
export type CoercedValue = string | number | boolean | null;
export interface ParseOptions {
    /** Field delimiter. Default ",". Must be a single character. */
    delimiter?: string;
    /** Treat the first row as a header and return objects keyed by it. Default true. */
    header?: boolean;
    /**
     * Opt-in type coercion applied to every field after parsing.
     * "auto" infers number/boolean/null, or pass an explicit map from
     * column name (when header: true) to a coercion kind.
     */
    coerce?: 'auto' | Record<string, 'number' | 'boolean' | 'null' | 'string'>;
}
export interface StringifyOptions {
    delimiter?: string;
    /** Emit a header row from the keys of the first object. Default true. */
    header?: boolean;
    /** Line ending to use. Default "\n". */
    newline?: '\n' | '\r\n';
}
/**
 * Incremental RFC 4180 CSV parser. Feed it chunks of text as they arrive
 * (e.g. from a stream) via parseChunk(), then call flush() once at EOF to
 * retrieve any trailing unterminated field/row and finalize output.
 *
 * State machine states: FIELD_START -> UNQUOTED | QUOTED -> (delimiter|newline) -> FIELD_START
 */
export declare class CsvStreamParser<T = Record<string, CoercedValue> | string[]> {
    private readonly delimiter;
    private readonly wantHeader;
    private readonly coerce;
    private headers;
    private headerCaptured;
    private field;
    private row;
    private inQuotes;
    private fieldHadContent;
    private pendingCR;
    private readonly out;
    constructor(options?: ParseOptions);
    /** Feed the next chunk of raw CSV text. Returns rows completed by this chunk. */
    parseChunk(chunk: string): T[];
    private endRow;
    private consumeRows;
    private buildRecord;
    /** Call at end of input to flush any trailing unterminated row/field. */
    flush(): T[];
    /** All rows parsed so far across every parseChunk()/flush() call. */
    getResults(): T[];
}
/**
 * One-shot parse of a complete CSV string.
 *
 * With `header: true` (default) returns an array of objects keyed by the
 * first row. With `header: false` returns an array of string[] rows.
 */
export declare function parse(input: string, options?: ParseOptions & {
    header: false;
}): CoercedValue[][];
export declare function parse(input: string, options?: ParseOptions & {
    header?: true;
}): Record<string, CoercedValue>[];
/**
 * Serialize an array of objects (or array-of-arrays) back to CSV text.
 * Always quotes fields that contain the delimiter, a quote, or a newline.
 */
export declare function stringify(rows: Array<Record<string, unknown>> | unknown[][], options?: StringifyOptions): string;
declare const _default: {
    parse: typeof parse;
    stringify: typeof stringify;
    CsvStreamParser: typeof CsvStreamParser;
};
export default _default;
