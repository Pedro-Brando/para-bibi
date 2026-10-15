export function createClock(now: () => number = () => performance.now()) {
  let last = now();
  return {
    step(): number {
      const t = now();
      const dt = Math.min(0.1, Math.max(0, (t - last) / 1000));
      last = t;
      return dt;
    },
  };
}
