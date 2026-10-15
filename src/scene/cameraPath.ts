import * as THREE from 'three/webgpu';
import type { Framing } from '../core/framing';

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Campo de visão: o da flor (fase 1) até um céu mais aberto, para Órion, a Lua e as noites caberem. */
const SKY_FOV = 58;
/** Parallax do mouse no céu: no máximo uns 1,5 grau. */
const PARALLAX_RAD = THREE.MathUtils.degToRad(1.5);

/**
 * Câmera do site, sem controle livre: posição numa CatmullRomCurve3 (flor, aproximação, subida pelos troncos,
 * acima das copas) e um alvo que segue outra curva e então gira até Órion. `t` vem da linha do tempo.
 */
export function createCameraPath(framing: Framing) {
  const T0 = new THREE.Vector3(...framing.target);
  const P0 = new THREE.Vector3(...framing.position);
  // Para onde a câmera inicial olha, no plano: as camadas de silhueta ficam nessa direção.
  const F = new THREE.Vector3().subVectors(T0, P0).setY(0).normalize();
  const R = new THREE.Vector3(-F.z, 0, F.x);
  const v = (f: number, r: number, y: number) => new THREE.Vector3().addScaledVector(F, f).addScaledVector(R, r).setY(y);
  const toward = (k: number) => T0.clone().lerp(P0, k);

  // Marcos igualmente espaçados em t (getPoint divide t pelos trechos); o t da linha do tempo dá o ritmo de cada ato.
  const positions = new THREE.CatmullRomCurve3([
    P0.clone(), toward(0.92), toward(0.72), v(-0.6, 0.6, 1.6), v(-0.5, 0.5, 3.5), v(-0.6, 0.6, 6), v(0, 0.8, 13), v(0.5, 1, 21),
  ], false, 'centripetal');
  const targets = new THREE.CatmullRomCurve3([
    T0.clone(), T0.clone(), T0.clone().setY(T0.y + 0.1), v(3, 0.4, 2.2), v(5, 0.4, 6), v(6, 0.6, 13), v(8, 0.8, 26), v(8, 0.8, 34),
  ], false, 'centripetal');
  const dir = new THREE.Vector3(), aim = new THREE.Vector3(), tmp = new THREE.Vector3();
  const mouse = new THREE.Vector2(), smoothMouse = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  });

  return {
    /** Aplica o ponto `t` à câmera. `sky` é a direção de Órion; `parallax` (0 a 1) liga o mouse. */
    apply(camera: THREE.PerspectiveCamera, t: number, sky: THREE.Vector3, parallax: number, dt: number) {
      positions.getPoint(t, camera.position);
      targets.getPoint(t, aim);
      dir.subVectors(aim, camera.position).normalize();
      // Gira para Órion no fim da subida; um pouco acima do centro dele, para o poema ter céu em cima.
      const w = ss(0.62, 1, t);
      tmp.copy(sky).normalize();
      dir.lerp(tmp, w).normalize();
      smoothMouse.lerp(mouse, 1 - Math.exp(-dt * 3));
      if (parallax > 0) {
        const right = tmp.crossVectors(dir, camera.up).normalize();
        dir.applyAxisAngle(camera.up, -smoothMouse.x * PARALLAX_RAD * parallax);
        dir.applyAxisAngle(right, -smoothMouse.y * PARALLAX_RAD * parallax).normalize();
      }
      camera.lookAt(aim.copy(camera.position).add(dir));
      const fov = framing.fov + (SKY_FOV - framing.fov) * ss(0.35, 0.95, t);
      if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
    },
  };
}
