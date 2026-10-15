import * as THREE from 'three/webgpu';
import { parseOptions } from './core/url';
import { createClock } from './core/clock';
import { frameFlower } from './core/framing';
import { createStage } from './scene/stage';
import { buildFlower } from './scene/flower/build';
import { toBufferGeometry } from './scene/flower/toGeometry';
import { createFlowerMaterials, uFlash, SEED_FADE_END } from './scene/flower/materials';
import { uGrowth } from './scene/flower/growthNode';
import { flowerPalette } from './flower/params';
import { NAME_SEED } from './seed/constants';
import { cyrb128 } from './seed/hash';
import { eorzeaTime, formatEt, FIRST_DATE_UNIX } from './eorzea/time';
import { weatherChance, southShroudWeather, weatherLabelPt } from './eorzea/weather';
import type { World } from './scene/world';

type SkyUniform = 'uCoverage' | 'uWorldBlend' | 'uOrion' | 'uCityBlend';
export type LookTarget = 'orion' | 'moon' | 'default';

declare global {
  interface Window {
    __quarrymill?: {
      backend: 'webgpu' | 'webgl2'; ready: boolean; setGrowth(g: number): void; dpr(): number;
      /** Só na cena completa: dispara um raio agora (dev e capturas). */
      strike?: () => void;
      /** Só na cena completa: conduz os céus (bloco C fará isso pelo scroll) e aponta a câmera. */
      sky?: { set(u: Partial<Record<SkyUniform, number>>): void; look(what: LookTarget): void };
    };
  }
}

const GROW_SECONDS = 12;

async function main() {
  const opts = parseOptions(location.search);
  const seed = opts.seed === 'name' ? NAME_SEED : cyrb128(opts.seed);
  const { params, meshes } = buildFlower(seed);
  const stage = await createStage(document.body, opts.backend === 'webgl', frameFlower(meshes.height), opts.dev || opts.scene === 'flower');
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

  // Cena completa: Quarrymill sob a tempestade. Com scene=flower fica só a flor no fundo escuro (fase 1).
  let world: World | null = null;
  let rainSound: { setIntensity(r: number): void } | null = null;
  if (opts.scene === 'full') {
    const [{ createWorld }, audio, { playThunder }, { createRainSound }] = await Promise.all([
      import('./scene/world'), import('./audio/context'), import('./audio/thunder'), import('./audio/rain'),
    ]);
    audio.enableAudioOnFirstGesture();
    audio.onAudioReady((a) => { rainSound = createRainSound(a); });
    world = await createWorld(stage.scene, {
      camera: stage.camera,
      target: stage.controls.target,
      onStrike: (distance) => {
        state.flash();
        const a = audio.getAudio();
        if (a) playThunder(a, distance);
      },
    });
    showLabel();
  }

  const state = {
    growth: opts.growth ?? 0,
    playing: opts.growth === null && !opts.freeze,
    flashT: 0,
    flash: () => { state.flashT = 1; },
  };
  // Olhar para o céu: só gira a câmera (a posição fica), apontando o alvo do OrbitControls para a direção.
  const homeTarget = stage.controls.target.clone();
  const look = (what: LookTarget) => {
    if (!world) return;
    // Olhando para cima, as copas das duas camadas mais perto escondem a cabeça de Órion: elas saem do quadro.
    world.setNearSilhouettes(what === 'default');
    if (what === 'default') { stage.controls.target.copy(homeTarget); return; }
    const dir = what === 'orion' ? world.sky.orionDirection() : world.sky.moonDirection();
    stage.controls.target.copy(stage.camera.position).addScaledVector(dir, 5);
  };
  const setSky = (u: Partial<Record<SkyUniform, number>>) => {
    if (!world) return;
    for (const [k, v] of Object.entries(u) as [SkyUniform, number][]) world.sky[k].value = Math.min(1, Math.max(0, v));
    world.sky.update(0, 0); // a cidade nova já vale para um look() logo em seguida
  };
  if (world && opts.view === 'sky') {
    setSky({ uCoverage: 0, uWorldBlend: 1, uOrion: 1 });
    look('orion');
  }
  if (opts.dev) {
    const { createDevGui } = await import('./dev/gui');
    createDevGui(state, params, world, look);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'l' || e.key === 'L') state.flash(); });

  window.__quarrymill = {
    backend: stage.backend,
    ready: false,
    setGrowth: (g: number) => { state.growth = Math.min(1, Math.max(0, g)); state.playing = false; },
    dpr: stage.dpr,
    strike: world ? () => world!.strike() : undefined,
    sky: world ? { set: setSky, look } : undefined,
  };

  const clock = createClock();
  let frames = 0;
  let elapsed = 0;
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
    if (world) {
      elapsed += dt;
      world.update(dt, elapsed);
      rainSound?.setIntensity(world.uRain.value);
    }
    stage.controls.update();
    stage.render();
    if (++frames === 3) window.__quarrymill!.ready = true;
  });
}

/** Rótulo discreto no canto: hora de Eorzea e clima de South Shroud no instante do primeiro encontro. */
function showLabel() {
  const weather = weatherLabelPt(southShroudWeather(weatherChance(FIRST_DATE_UNIX)));
  const el = document.createElement('div');
  el.className = 'place-label';
  el.textContent = `Bibi Bilota · South Shroud · ${formatEt(eorzeaTime(FIRST_DATE_UNIX))} ET · ${weather}`;
  el.style.cssText = 'position:fixed;left:1.25rem;bottom:1rem;font:italic 15px/1.2 Georgia,"Times New Roman",serif;'
    + 'color:#ffc8e1;opacity:0.45;letter-spacing:0.04em;pointer-events:none;user-select:none';
  document.body.appendChild(el);
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', '<p style="color:#ffb3d1;font:16px serif;padding:2rem">Seu navegador não conseguiu abrir a cena 3D.</p>');
});
