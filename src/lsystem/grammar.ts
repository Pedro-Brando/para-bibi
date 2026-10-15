import type { Rng } from '../seed/prng';

export interface Module {
  sym: string;
  args: number[];
}

export function mod(sym: string, ...args: number[]): Module {
  return { sym, args };
}

export type Rule = (m: Module, rng: Rng) => Module[] | null;
export type Rules = Readonly<Record<string, Rule>>;

export function expand(axiom: readonly Module[], rules: Rules, iterations: number, rng: Rng): Module[] {
  let current: Module[] = [...axiom];
  for (let i = 0; i < iterations; i++) {
    const next: Module[] = [];
    let changed = false;
    for (const m of current) {
      const rule = rules[m.sym];
      const out = rule ? rule(m, rng) : null;
      if (out) {
        next.push(...out);
        changed = true;
      } else {
        next.push(m);
      }
    }
    current = next;
    if (!changed) break;
  }
  return current;
}

export function toText(modules: readonly Module[]): string {
  return modules
    .map((m) => (m.args.length ? `${m.sym}(${m.args.map((a) => +a.toFixed(4)).join(',')})` : m.sym))
    .join('');
}
