// O poema, verso a verso sobre o céu. Original em inglês (minúsculas e hífen como no original) e a tradução.

export const POEM_EN = [
  'I was raised on scarcity',
  'so forgive me',
  'if i hoard you-',
  'your laugh in my pockets',
  'your hands in my hair',
  'every same-thing night',
  'stacked like coins',
  'i refuse to spend',
  'bright and thin.',
  '',
  'i keep counting my blessings',
  "for fear they'll stop coming in",
];

export const POEM_PT = [
  'eu cresci na escassez',
  'então me perdoa',
  'se eu te guardo feito tesouro -',
  'teu riso nos meus bolsos',
  'tuas mãos no meu cabelo',
  'cada noite de sempre',
  'empilhada como moeda',
  'que eu me recuso a gastar',
  'reluzente e fina.',
  '',
  'eu conto e reconto as minhas bênçãos',
  'com medo de que parem de vir',
];

/** Vagas 0 a 8 são versos soltos, 9 é só céu, 10 e 11 o dístico final, que aparece junto e devagar. */
const COUPLET = 10;

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function lineEl(en: string, pt: string) {
  const e = document.createElement('div');
  e.className = 'en';
  e.textContent = en;
  const p = document.createElement('div');
  p.className = 'pt';
  p.textContent = pt;
  return [e, p] as const;
}

/** Camada HTML do poema. `update(x)` recebe o `poemLine` da linha do tempo; `onLineEnd` dispara quando um verso termina. */
export function createPoem(parent: HTMLElement, onLineEnd: (slot: number) => void) {
  const root = document.createElement('div');
  root.className = 'overlay poem';
  root.setAttribute('aria-live', 'polite');
  const singles: (readonly [HTMLElement, HTMLElement])[] = [];
  for (let i = 0; i < COUPLET - 1; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const pair = lineEl(POEM_EN[i]!, POEM_PT[i]!);
    slot.append(...pair);
    root.appendChild(slot);
    singles.push(pair);
  }
  const couplet = document.createElement('div');
  couplet.className = 'slot couplet';
  const c1 = lineEl(POEM_EN[COUPLET]!, POEM_PT[COUPLET]!);
  const c2 = lineEl(POEM_EN[COUPLET + 1]!, POEM_PT[COUPLET + 1]!);
  couplet.append(...c1, ...c2);
  root.appendChild(couplet);
  parent.appendChild(root);

  const all = [...singles.flat(), ...c1, ...c2];
  for (const el of all) el.style.opacity = '0';
  const set = (el: HTMLElement, o: number) => {
    const s = o < 0.004 ? '0' : o.toFixed(3);
    if (el.style.opacity !== s) el.style.opacity = s;
  };
  let last = 0;

  return {
    update(x: number) {
      singles.forEach(([en, pt], i) => {
        const out = 1 - ss(i + 0.78, i + 1, x);
        set(en, ss(i + 0.02, i + 0.3, x) * out);
        // A tradução surge meio passo depois, logo abaixo.
        set(pt, ss(i + 0.3, i + 0.55, x) * out);
      });
      set(c1[0], ss(10, 10.6, x));
      set(c1[1], ss(10.35, 10.95, x));
      set(c2[0], ss(10.7, 11.3, x));
      set(c2[1], ss(11.05, 11.65, x));
      // Cada verso que termina acende algumas estrelas (só rolando para a frente).
      for (let i = 0; i < COUPLET - 1; i++) if (last < i + 0.78 && x >= i + 0.78) onLineEnd(i);
      if (last < 11.65 && x >= 11.65) onLineEnd(11);
      last = x;
    },
  };
}
