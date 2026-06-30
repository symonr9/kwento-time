const fs = require('node:fs');
const path = require('node:path');

const workerChannelPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-sqlite',
  'web',
  'WorkerChannel.ts',
);

const broken = '    resultArray.set(new Uint32Array([length]), 0);';
const fixed = `    new DataView(resultArray.buffer).setUint32(0, length, true);`;

if (!fs.existsSync(workerChannelPath)) {
  console.warn('[patch-expo-sqlite-web-sync] WorkerChannel.ts not found; skipping patch.');
  process.exit(0);
}

const source = fs.readFileSync(workerChannelPath, 'utf8');

if (source.includes(fixed)) {
  process.exit(0);
}

if (!source.includes(broken)) {
  console.warn('[patch-expo-sqlite-web-sync] Expected Expo SQLite sync bridge line not found; skipping patch.');
  process.exit(0);
}

fs.writeFileSync(workerChannelPath, source.replace(broken, fixed));
console.log('[patch-expo-sqlite-web-sync] Patched Expo SQLite web sync result length encoding.');
