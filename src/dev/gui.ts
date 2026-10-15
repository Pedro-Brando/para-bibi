import GUI from 'lil-gui';
import type { FlowerParams } from '../flower/params';

export function createDevGui(state: { growth: number; playing: boolean; flash: () => void }, params: FlowerParams) {
  const gui = new GUI({ title: 'Quarrymill dev' });
  gui.add(state, 'growth', 0, 1, 0.001).listen();
  gui.add(state, 'playing');
  gui.add(state, 'flash').name('relâmpago');
  const info = gui.addFolder('parâmetros (seed)');
  for (const [k, v] of Object.entries(params)) info.add({ [k]: typeof v === 'number' ? +v.toFixed(3) : v }, k).disable();
  info.close();
  return gui;
}
