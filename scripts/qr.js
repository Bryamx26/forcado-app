// Génère un QR code par table.
// Usage : node scripts/qr.js <URL de base> [nombre de tables]
// Exemple : node scripts/qr.js http://192.168.1.20:3001 12
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';

const base = (process.argv[2] || 'http://localhost:5173').replace(/\/$/, '');
const count = parseInt(process.argv[3], 10) || 10;
const out = path.resolve('qr');
fs.mkdirSync(out, { recursive: true });

const cards = [];
for (let t = 1; t <= count; t++) {
  const url = `${base}/table/${t}`;
  await QRCode.toFile(path.join(out, `table-${t}.png`), url, { width: 600, margin: 2, color: { dark: '#1d3f7a' } });
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#1d3f7a' } });
  cards.push(`<div class="card"><div class="brand">Forcado</div>${svg}<div class="t">Table ${t}</div><div class="h">Scannez pour commander</div></div>`);
}

fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="fr"><meta charset="utf-8"><title>QR codes des tables</title>
<style>
body{font-family:Georgia,serif;margin:0;padding:16px;background:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{border:2px dashed #1d3f7a;border-radius:12px;padding:16px;text-align:center;break-inside:avoid;color:#1d3f7a}
.brand{font-size:22px;font-style:italic;letter-spacing:1px}
.card svg{width:100%;height:auto}
.t{font-size:28px;font-weight:bold}
.h{font-size:14px}
@media print{body{padding:0}}
</style>
<div class="grid">${cards.join('')}</div></html>`);

console.log(`${count} QR codes générés dans ${out} (page imprimable : qr/index.html)`);
console.log(`Exemple : ${base}/table/1`);
