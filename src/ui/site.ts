import './site.css';
import { POEM_EN, POEM_PT } from './poem';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Tela pequena ou toque: o presente é para o computador; aqui fica só o poema em texto. */
export function isSmallScreen(): boolean {
  return window.innerWidth < 900 || window.matchMedia('(pointer: coarse)').matches;
}

export function showSmallScreen() {
  const root = el('main', 'small-screen');
  root.append(el('h1', '', 'Ana Beatriz'), el('p', 'note', 'Este presente foi feito para abrir no computador. Enquanto isso, o poema:'));
  POEM_EN.forEach((en, i) => {
    if (!en) { root.append(el('div', 'gap')); return; }
    const line = el('div', 'line');
    line.append(el('div', 'en', en), el('div', 'pt', POEM_PT[i]!));
    root.append(line);
  });
  document.body.style.overflow = 'auto';
  document.body.appendChild(root);
}

/** Tela de entrada: o nome, e "clique para entrar" quando a cena termina de carregar. */
export function createEntry() {
  const root = el('div', 'entry');
  const loading = el('div', 'loading', 'carregando');
  const button = el('button', 'enter', 'clique para entrar');
  button.disabled = true;
  root.append(el('h1', '', 'Ana Beatriz'), button, loading);
  document.body.appendChild(root);
  let resolve!: () => void;
  const entered = new Promise<void>((r) => { resolve = r; });
  return {
    entered,
    /** A cena está pronta: o convite aparece; o clique (gesto do usuário) chama `onEnter` e some a tela. */
    ready(onEnter: () => void) {
      loading.remove();
      button.disabled = false;
      button.classList.add('ready');
      button.focus({ preventScroll: true });
      button.addEventListener('click', () => {
        // Se o som falhar (AudioContext, elemento de mídia), a visita segue sem som em vez de travar aqui.
        try {
          onEnter();
        } catch (err) {
          console.error(err);
        } finally {
          root.classList.add('gone');
          setTimeout(() => root.remove(), 1800);
          resolve();
        }
      }, { once: true });
    },
  };
}

type Choice<T> = { label: string; value: T };

function toggleRow<T>(choices: Choice<T>[], initial: T, onPick: (v: T) => void) {
  const row = el('div', 'row');
  const buttons = choices.map((c, i) => {
    if (i > 0) row.append(el('span', 'sep', '/'));
    const b = el('button', '', c.label);
    b.type = 'button';
    b.addEventListener('click', () => { select(c.value); onPick(c.value); });
    row.append(b);
    return b;
  });
  const select = (v: T) => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(choices[i]!.value === v)));
  select(initial);
  return { row, select };
}

export interface CornerHandlers {
  onSound(on: boolean): void;
  onWorld(blend: number): void;
  onCity(blend: number): void;
  onRestart(): void;
}

/** Controles discretos no canto, com cara de site: som sempre; céu, cidade e recomeçar só no fim. */
export function createCorner(h: CornerHandlers) {
  const root = el('nav', 'corner');
  root.setAttribute('aria-label', 'controles');
  const world = toggleRow([{ label: 'Eorzea', value: 0 }, { label: 'Real', value: 1 }, { label: 'Os dois', value: 0.5 }], 1, h.onWorld);
  const city = toggleRow([{ label: 'São Paulo', value: 0 }, { label: 'Governador Valadares', value: 1 }], 0, h.onCity);
  const restartRow = el('div', 'row');
  const restart = el('button', '', 'recomeçar');
  restart.type = 'button';
  restart.addEventListener('click', h.onRestart);
  restartRow.append(restart);
  const explore = [world.row, city.row, restartRow];
  for (const r of explore) { r.classList.add('hidden'); r.inert = true; }
  let on = true;
  const soundRow = el('div', 'row');
  const sound = el('button', '', 'som: ligado');
  sound.type = 'button';
  sound.addEventListener('click', () => { on = !on; sound.textContent = on ? 'som: ligado' : 'som: desligado'; h.onSound(on); });
  soundRow.append(sound);
  root.append(...explore, soundRow);
  document.body.appendChild(root);
  let shown = false;
  return {
    setExplore(v: boolean) {
      if (v === shown) return;
      shown = v;
      for (const r of explore) { r.classList.toggle('hidden', !v); r.inert = !v; }
      if (!v) { world.select(1); city.select(0); }
    },
  };
}

export function createText(cls: string, text = '') {
  const e = el('div', `overlay ${cls}`, text);
  e.style.opacity = '0';
  document.body.appendChild(e);
  return e;
}

const chevron = (up: boolean) =>
  `<svg viewBox="0 0 24 14" width="26" height="15" aria-hidden="true"><path d="${up ? 'M2 12 L12 2 L22 12' : 'M2 2 L12 12 L22 2'}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** As setinhas no centro de baixo (a de subir mais apagada) e uma linha fina de progresso na lateral. */
export function createStepper(onStep: (dir: 1 | -1) => void) {
  const nav = el('nav', 'stepper');
  nav.setAttribute('aria-label', 'passos');
  const make = (dir: 1 | -1, label: string) => {
    const b = el('button', dir > 0 ? 'step-next' : 'step-prev');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = chevron(dir < 0);
    b.addEventListener('click', () => onStep(dir));
    return b;
  };
  const prev = make(-1, 'voltar');
  const next = make(1, 'seguir');
  nav.append(prev, next);
  const track = el('div', 'progress');
  const fill = el('div', 'fill');
  track.append(fill);
  document.body.append(nav, track);
  let shown = '';
  return {
    show() { nav.classList.add('on'); track.classList.add('on'); },
    update(p: number, canPrev: boolean, canNext: boolean) {
      const key = `${p.toFixed(3)}${canPrev}${canNext}`;
      if (key === shown) return;
      shown = key;
      fill.style.transform = `scaleY(${p.toFixed(3)})`;
      prev.classList.toggle('off', !canPrev);
      next.classList.toggle('off', !canNext);
    },
  };
}
