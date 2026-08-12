# CSV Parser

High-performance CSV parsing with type coercion and schema validation. Used by Ferrow for data ingestion.

```javascript
const parser = new CSVParser({ header: true, types: { age: 'number' } });
const data = await parser.parse(csvString);
```

Features: Streaming, type inference, escape handling, Ferrow data pipelines.
License: MIT
