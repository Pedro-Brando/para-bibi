import GUI from 'lil-gui';
import type { FlowerParams } from '../flower/params';
import type { World } from '../scene/world';

export function createDevGui(state: { growth: number; playing: boolean; flash: () => void }, params: FlowerParams, world: World | null = null) {
  const gui = new GUI({ title: 'Quarrymill dev' });
  gui.add(state, 'growth', 0, 1, 0.001).listen();
  gui.add(state, 'playing');
  gui.add(state, 'flash').name('relâmpago');
  if (world) {
    const w = gui.addFolder('Quarrymill');
    w.add(world.uRain, 'value', 0, 1, 0.01).name('chuva (uRain)');
    w.add({ raio: () => world.strike() }, 'raio').name('disparar raio');
    w.add({ névoa: true }, 'névoa').onChange((v: boolean) => world.setFog(v));
    w.add({ silhuetas: true }, 'silhuetas').onChange((v: boolean) => world.setSilhouettes(v));
  }
  const info = gui.addFolder('parâmetros (seed)');
  for (const [k, v] of Object.entries(params)) info.add({ [k]: typeof v === 'number' ? +v.toFixed(3) : v }, k).disable();
  info.close();
  return gui;
}
