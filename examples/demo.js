const { parse, stringify, CsvStreamParser } = require('../dist/index.js');

const tricky = [
  'name,bio,age,active',
  '"Ann ""The Ace"" Lee","Loves ""quotes"" and\ncommas, like this",34,true',
  'Bob,"Simple bio",29,false',
].join('\r\n');

const rows = parse(tricky, { coerce: 'auto' });
console.log(JSON.stringify(rows, null, 2));

const csvBack = stringify(rows);
console.log('--- round-tripped csv ---');
console.log(csvBack);

const rows2 = parse(csvBack, { coerce: 'auto' });
console.log('--- round-trip matches parsed bios ---');
console.log(rows2[0].bio === rows[0].bio, rows2[0].name === rows[0].name);

// streaming API split mid-quoted-field
const streamer = new CsvStreamParser({ coerce: 'auto' });
const chunkA = 'id,val\n1,"hello wor';
const chunkB = 'ld, with comma"\n2,42\n';
streamer.parseChunk(chunkA);
streamer.parseChunk(chunkB);
streamer.flush();
console.log('--- streamed chunks ---');
console.log(streamer.getResults());
