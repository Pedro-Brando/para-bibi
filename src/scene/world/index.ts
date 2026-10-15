import * as THREE from 'three/webgpu';
import { createGround } from './ground';
import { createStream } from './stream';
import { createSilhouettes } from './silhouettes';
import { createFireflies } from './fireflies';
import { createRain } from './rain';
import { createLightning } from './lightning';
import { createSky } from './sky';
import { lightningSchedule } from './bolt';
import { treeSeed } from './layout';
import { uRain, uFogOn, uBolt } from './uniforms';
import { sfc32 } from '../../seed/prng';

export interface WorldOptions {
  camera: THREE.Camera;
  /** Ponto da flor para onde a câmera olha; as silhuetas ficam atrás dele. */
  target: THREE.Vector3;
  /** Chamado a cada raio, com a distância do raio até a câmera (unidades de cena tratadas como metros). */
  onStrike?: (distance: number) => void;
}

export interface World {
  update(dt: number, t: number): void;
  strike(): void;
  setFog(on: boolean): void;
  setSilhouettes(on: boolean): void;
  uRain: typeof uRain;
  uFogOn: typeof uFogOn;
  uBolt: typeof uBolt;
}

/** Duração coberta pelo cronograma; depois disso ele recomeça. */
const SCHEDULE_SECONDS = 600;

export function createWorld(scene: THREE.Scene, opts: WorldOptions): World {
  const sky = createSky();
  const silhouettes = createSilhouettes(opts.camera, opts.target);
  const lightning = createLightning(sfc32(treeSeed(20_000)), opts.camera);
  scene.add(sky, createGround(), createStream(), silhouettes.object, createFireflies(), createRain(), ...lightning.objects);
  uRain.value = 1;

  const schedule = lightningSchedule(sfc32(treeSeed(20_001)), SCHEDULE_SECONDS);
  let next = 0;
  let clock = 0;
  const strike = () => opts.onStrike?.(lightning.strike());

  return {
    update(dt) {
      clock += dt;
      if (clock > SCHEDULE_SECONDS) { clock -= SCHEDULE_SECONDS; next = 0; }
      while (next < schedule.length && schedule[next]! <= clock) { next++; strike(); }
      sky.position.copy(opts.camera.position);
      silhouettes.update(dt);
      lightning.update(dt);
    },
    strike,
    setFog(on) { uFogOn.value = on ? 1 : 0; },
    setSilhouettes(on) { silhouettes.object.visible = on; },
    uRain, uFogOn, uBolt,
  };
}
