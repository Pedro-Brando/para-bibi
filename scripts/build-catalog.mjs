// Gera public/stars.bin e public/stars-meta.json a partir do catálogo do d3-celestial (BSD-3-Clause).
// Roda uma vez (node scripts/build-catalog.mjs); os arquivos gerados ficam no repositório.
import { writeFileSync, mkdirSync } from 'node:fs';

const SOURCE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json';
const DEFAULT_BV = 0.6;

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`${SOURCE}: HTTP ${res.status}`);
const { features } = await res.json();

const out = new Float32Array(features.length * 4);
const hip = [];
const TAU = 2 * Math.PI;
features.forEach((f, i) => {
  const [raDeg, decDeg] = f.geometry.coordinates;
  const ra = (((raDeg * Math.PI) / 180) % TAU + TAU) % TAU;
  const bv = parseFloat(f.properties.bv);
  out.set([ra, (decDeg * Math.PI) / 180, f.properties.mag, Number.isFinite(bv) ? bv : DEFAULT_BV], i * 4);
  hip.push(f.id);
});

mkdirSync('public', { recursive: true });
writeFileSync('public/stars.bin', Buffer.from(out.buffer));
writeFileSync('public/stars-meta.json', JSON.stringify({
  count: features.length,
  stride: 4,
  layout: '[raRad, decRad, mag, bv] float32, little-endian',
  source: SOURCE,
  license: 'BSD-3-Clause, Olaf Frohn (d3-celestial)',
  hip,
}) + '\n');
console.log(`stars: ${features.length}`);
