import * as THREE from 'three/webgpu';
import { parseOptions } from './core/url';
import { createClock } from './core/clock';
import { createStage } from './scene/stage';
import { buildFlower } from './scene/flower/build';
import { toBufferGeometry } from './scene/flower/toGeometry';
import { createFlowerMaterials, uFlash, SEED_FADE_END } from './scene/flower/materials';
import { uGrowth } from './scene/flower/growthNode';
import { flowerPalette } from './flower/params';
import { NAME_SEED } from './seed/constants';
import { cyrb128 } from './seed/hash';

declare global {
  interface Window {
    __quarrymill?: { backend: 'webgpu' | 'webgl2'; ready: boolean; setGrowth(g: number): void; dpr(): number };
  }
}

const GROW_SECONDS = 12;

async function main() {
  const opts = parseOptions(location.search);
  const stage = await createStage(document.body, opts.backend === 'webgl');
  const seed = opts.seed === 'name' ? NAME_SEED : cyrb128(opts.seed);
  const { params, meshes } = buildFlower(seed);
  const mats = createFlowerMaterials(flowerPalette(params));

  const seedMesh = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), mats.seed);
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(toBufferGeometry(meshes.stem), mats.stem),
    new THREE.Mesh(toBufferGeometry(meshes.leaves), mats.leaf),
    new THREE.Mesh(toBufferGeometry(meshes.petals), mats.petal),
    new THREE.Mesh(toBufferGeometry(meshes.stamens), mats.stamen),
    seedMesh,
  );
  for (const child of group.children) child.frustumCulled = false;
  stage.scene.add(group);

  const state = {
    growth: opts.growth ?? 0,
    playing: opts.growth === null && !opts.freeze,
    flashT: 0,
    flash: () => { state.flashT = 1; },
  };
  if (opts.dev) {
    const { createDevGui } = await import('./dev/gui');
    createDevGui(state, params);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'l' || e.key === 'L') state.flash(); });

  window.__quarrymill = {
    backend: stage.backend,
    ready: false,
    setGrowth: (g: number) => { state.growth = Math.min(1, Math.max(0, g)); state.playing = false; },
    dpr: stage.dpr,
  };

  const clock = createClock();
  let frames = 0;
  stage.renderer.setAnimationLoop(() => {
    const dt = opts.freeze ? 0 : clock.step();
    if (state.playing) state.growth = Math.min(1, state.growth + dt / GROW_SECONDS);
    state.flashT = Math.max(0, state.flashT - dt * 2.5);
    const flicker = state.flashT > 0 ? state.flashT * (0.6 + 0.4 * Math.sin(state.flashT * 40)) : 0;
    uGrowth.value = state.growth;
    uFlash.value = flicker;
    // Apagada, a esfera da semente seria um ponto preto espiando pela base aberta do caule.
    seedMesh.visible = state.growth < SEED_FADE_END;
    stage.flash.intensity = flicker * 15;
    stage.controls.update();
    stage.render();
    if (++frames === 3) window.__quarrymill!.ready = true;
  });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', '<p style="color:#ffb3d1;font:16px serif;padding:2rem">Seu navegador não conseguiu abrir a cena 3D.</p>');
});
