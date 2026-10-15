// Uso: node scripts/seed.mjs "Nome"  (imprime a Seed128; não grave o nome em arquivo)
const input = (process.argv[2] ?? '').normalize('NFC').trim();
if (!input) {
  console.error('uso: node scripts/seed.mjs "Nome"');
  process.exit(1);
}
let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
for (let i = 0; i < input.length; i++) {
  const k = input.charCodeAt(i);
  h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
  h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
  h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
  h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
}
h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
console.log(JSON.stringify([h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]));
