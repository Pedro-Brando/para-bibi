// Quantas noites juntos. Puro: sem three.

/** 2026-10-03 00:00 em Brasília (UTC-3, sem horário de verão). */
const FIRST_MIDNIGHT_MS = Date.UTC(2026, 9, 3, 3, 0, 0);
const DAY_MS = 86_400_000;

/** A noite do encontro (2 para 3 de outubro) conta 1; cada meia-noite de Brasília depois dela soma 1. */
export function nightsTogether(now: Date): number {
  const days = Math.floor((now.getTime() - FIRST_MIDNIGHT_MS) / DAY_MS);
  return 1 + Math.max(0, days);
}
