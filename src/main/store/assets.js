// Asset imports: copy files into the vault's assets/ folder.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function importAsset(store, srcPath) {
  const ext = path.extname(srcPath) || '.bin';
  const name = `${crypto.randomUUID()}${ext}`;
  fs.copyFileSync(srcPath, path.join(store.dir, 'assets', name));
  return `assets/${name}`;
}

module.exports = { importAsset };
