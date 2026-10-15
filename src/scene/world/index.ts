import * as THREE from 'three/webgpu';
import { createGround } from './ground';
import { createStream } from './stream';
import { createSilhouettes } from './silhouettes';
import { createFireflies } from './fireflies';
import { createRain } from './rain';
import { createLightning } from './lightning';
import { createSky, type Sky } from '../sky';
import { stormFromCoverage } from '../../sky/storm';
import { lightningSchedule } from './bolt';
import { treeSeed } from './layout';
import { uRain, uFogOn, uBolt } from './uniforms';
import { sfc32 } from '../../seed/prng';

export interface WorldOptions {
  camera: THREE.PerspectiveCamera;
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
  /** As duas camadas de silhueta mais perto (3,4 m e 6,5 m): olhando para cima, as copas cobrem a cabeça de Órion. */
  setNearSilhouettes(on: boolean): void;
  /** Céus de Eorzea e real; uCoverage também conduz a chuva e os relâmpagos. */
  sky: Sky;
  uRain: typeof uRain;
  uFogOn: typeof uFogOn;
  uBolt: typeof uBolt;
}

/** Duração coberta pelo cronograma; depois disso ele recomeça. */
const SCHEDULE_SECONDS = 600;

export async function createWorld(scene: THREE.Scene, opts: WorldOptions): Promise<World> {
  const sky = await createSky(opts.camera);
  const silhouettes = createSilhouettes(opts.camera, opts.target);
  const lightning = createLightning(sfc32(treeSeed(20_000)), opts.camera);
  scene.add(sky.object, createGround(), createStream(), silhouettes.object, createFireflies(), createRain(), ...lightning.objects);

  const schedule = lightningSchedule(sfc32(treeSeed(20_001)), SCHEDULE_SECONDS);
  let next = 0;
  let clock = 0;
  const strike = () => opts.onStrike?.(lightning.strike());

  return {
    update(dt, t) {
      // A tempestade passou às 04:13: com o céu abrindo, a chuva some e os raios param juntos.
      const storm = stormFromCoverage(sky.uCoverage.value);
      uRain.value = storm.rain;
      clock += dt;
      if (clock > SCHEDULE_SECONDS) { clock -= SCHEDULE_SECONDS; next = 0; }
      while (next < schedule.length && schedule[next]! <= clock) { next++; if (storm.lightning) strike(); }
      sky.update(dt, t);
      silhouettes.update(dt);
      lightning.update(dt);
    },
    strike,
    setFog(on) { uFogOn.value = on ? 1 : 0; },
    setSilhouettes(on) { silhouettes.object.visible = on; },
    // Os dois primeiros filhos são as camadas 0 e 1 (a roda do moinho vem depois, com a camada 2).
    setNearSilhouettes(on) { for (const c of silhouettes.object.children.slice(0, 2)) c.visible = on; },
    sky,
    uRain, uFogOn, uBolt,
  };
}
