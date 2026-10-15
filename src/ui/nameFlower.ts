// A flor do nome: "Esta flor nasceu do seu nome.", o nome que se desfaz na seed, a seed que vira a flor.
import type { Seed128 } from '../seed/hash';
import { seedHex, nameFacts } from '../timeline/steps';

const PUBLIC_NAME = 'Ana Beatriz';

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const div = (cls: string, text = '') => {
  const e = document.createElement('div');
  e.className = cls;
  if (text) e.textContent = text;
  e.style.opacity = '0';
  return e;
};

const spans = (parent: HTMLElement, text: string) =>
  [...text].map((ch) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.opacity = '0';
    parent.appendChild(s);
    return s;
  });

/** Camada HTML da flor do nome. `update(x)` recebe o `nameStage` da linha do tempo (0 a 5). */
export function createNameFlower(parent: HTMLElement, seed: Seed128) {
  const root = document.createElement('div');
  root.className = 'overlay name-flower';
  root.setAttribute('aria-live', 'polite');
  const first = div('caption', 'Esta flor nasceu do seu nome.');
  const last = div('caption', 'Nenhuma outra pessoa no mundo tem esta flor.');
  const morph = document.createElement('div');
  morph.className = 'morph';
  const name = div('name');
  name.style.opacity = '1';
  const letters = spans(name, PUBLIC_NAME);
  const hex = div('hex');
  hex.style.opacity = '1';
  const digits = spans(hex, seedHex(seed));
  const facts = div('facts');
  facts.style.opacity = '1';
  const items = nameFacts(seed).split(' · ');
  // Cada característica aparece como um bloco só.
  const factSpans = items.map((t, i) => {
    const s = document.createElement('span');
    s.textContent = i < items.length - 1 ? `${t} · ` : t;
    s.style.opacity = '0';
    facts.appendChild(s);
    return s;
  });
  morph.append(name, hex, facts);
  root.append(first, last, morph);
  parent.appendChild(root);

  const set = (e: HTMLElement, o: number) => {
    const v = o < 0.004 ? '0' : o.toFixed(3);
    if (e.style.opacity !== v) e.style.opacity = v;
  };

  return {
    update(x: number) {
      const visible = x > 0.01 && x < 4.99;
      root.style.display = visible ? '' : 'none';
      if (!visible) return;
      set(first, ss(0.15, 0.75, x) * (1 - ss(3.15, 3.6, x)));
      set(last, ss(3.3, 3.85, x) * (1 - ss(4.15, 4.6, x)));
      // O nome aparece e as letras se desfazem, uma depois da outra, subindo e desfocando.
      const nameIn = ss(1.0, 1.25, x);
      letters.forEach((s, k) => {
        const a = 1.42 + (k / letters.length) * 0.3;
        const d = ss(a, a + 0.14, x);
        set(s, nameIn * (1 - d));
        const f = d > 0.001 ? `blur(${(d * 6).toFixed(1)}px)` : '';
        if (s.style.filter !== f) { s.style.filter = f; s.style.transform = f ? `translateY(${(-d * 0.5).toFixed(2)}em)` : ''; }
      });
      // O número surge no lugar, dígito a dígito, e some antes das características.
      digits.forEach((s, j) => {
        const a = 1.55 + (j / digits.length) * 0.32;
        const b = 2.12 + (j / digits.length) * 0.2;
        set(s, ss(a, a + 0.1, x) * (1 - ss(b, b + 0.12, x)));
      });
      factSpans.forEach((s, i) => {
        const a = 2.45 + i * 0.09;
        set(s, ss(a, a + 0.25, x) * (1 - ss(4.15, 4.6, x)));
      });
    },
  };
}
