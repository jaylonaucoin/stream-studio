/**
 * music-metadata ID3 PRIV postMap assumes tag.value.data is a Buffer; strtok3 may yield Uint8Array.
 * @see https://github.com/Borewit/music-metadata (ID3v24TagMapper PRIV AverageLevel/PeakValue)
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../node_modules/music-metadata/lib/id3v2/ID3v24TagMapper.js');
const needle =
  'tag.value = tag.value.data.length === 4 ? tag.value.data.readUInt32LE(0) : null;';
const replacement = `tag.value = (() => {
                            const d = tag.value.data;
                            const buf = Buffer.isBuffer(d) ? d : Buffer.from(d);
                            return buf.length === 4 ? buf.readUInt32LE(0) : null;
                        })();`;

if (!fs.existsSync(target)) {
  process.exit(0);
}

const src = fs.readFileSync(target, 'utf8');
if (src.includes('Buffer.isBuffer(d) ? d : Buffer.from(d)')) {
  process.exit(0);
}
if (!src.includes(needle)) {
  console.warn('[patch-music-metadata-id3-priv] Expected line not found; skip (version mismatch?)');
  process.exit(0);
}

fs.writeFileSync(target, src.replace(needle, replacement), 'utf8');
console.log('[patch-music-metadata-id3-priv] Applied ID3v24TagMapper PRIV buffer fix');
