import GUI from 'lil-gui';
import type { FlowerParams } from '../flower/params';
import type { World } from '../scene/world';
import type { LookTarget } from '../main';

export function createDevGui(
  state: { growth: number; playing: boolean; flash: () => void }, params: FlowerParams, world: World | null = null,
  look: (what: LookTarget) => void = () => {},
) {
  const gui = new GUI({ title: 'Quarrymill dev' });
  gui.add(state, 'growth', 0, 1, 0.001).listen();
  gui.add(state, 'playing');
  gui.add(state, 'flash').name('relâmpago');
  if (world) {
    const w = gui.addFolder('Quarrymill');
    w.add(world.uRain, 'value', 0, 1, 0.01).name('chuva (segue uCoverage)').listen().disable();
    w.add({ raio: () => world.strike() }, 'raio').name('disparar raio');
    w.add({ névoa: true }, 'névoa').onChange((v: boolean) => world.setFog(v));
    w.add({ silhuetas: true }, 'silhuetas').onChange((v: boolean) => world.setSilhouettes(v));
    const s = gui.addFolder('Céus');
    s.add(world.sky.uCoverage, 'value', 0, 1, 0.01).name('nuvens (uCoverage)').listen();
    s.add(world.sky.uWorldBlend, 'value', 0, 1, 0.01).name('Eorzea → real (uWorldBlend)').listen();
    s.add(world.sky.uOrion, 'value', 0, 1, 0.01).name('Órion (uOrion)').listen();
    s.add(world.sky.uCityBlend, 'value', 0, 1, 0.01).name('SP → GV (uCityBlend)').listen();
    const views: LookTarget[] = ['orion', 'moon', 'default'];
    let v = 0;
    s.add({ olhar: () => { look(views[v]!); v = (v + 1) % views.length; } }, 'olhar').name('olhar para o céu (Órion, Lua, flor)');
  }
  const info = gui.addFolder('parâmetros (seed)');
  for (const [k, v] of Object.entries(params)) info.add({ [k]: typeof v === 'number' ? +v.toFixed(3) : v }, k).disable();
  info.close();
  return gui;
}
