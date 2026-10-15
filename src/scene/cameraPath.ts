import * as THREE from 'three/webgpu';
import type { Framing } from '../core/framing';

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Campo de visão do céu: Órion, a Lua e as noites cabem embaixo do poema. */
const SKY_FOV = 58;
/** Parallax do mouse no céu: no máximo uns 1,5 grau. */
const PARALLAX_RAD = THREE.MathUtils.degToRad(1.5);
/** Fim do trecho da flor no parâmetro da câmera (p = 0,35). */
const FLOWER_END = 0.3;
/** Altura da câmera no fim da subida e inclinação máxima para cima: as silhuetas só deslizam de frente. */
const ASCENT_TOP = 9;
const ASCENT_PITCH = THREE.MathUtils.degToRad(10);

/**
 * Câmera do site, sem controle livre. Flor: aproximação numa CatmullRomCurve3 a partir do enquadramento da
 * fase 1. Subida: sobe na vertical, de frente para os planos de silhueta (no máximo 10 graus para cima), então
 * as camadas só deslizam em parallax. Com o véu de névoa fechado (`skyView`), a câmera passa a olhar para Órion.
 */
export function createCameraPath(framing: Framing) {
  const T0 = new THREE.Vector3(...framing.target);
  const P0 = new THREE.Vector3(...framing.position);
  // Para onde a câmera inicial olha, no plano: os planos de silhueta estão voltados para ela.
  const F = new THREE.Vector3().subVectors(T0, P0).setY(0).normalize();
  const toward = (k: number) => T0.clone().lerp(P0, k);
  const approach = new THREE.CatmullRomCurve3([P0.clone(), toward(0.9), toward(0.72)], false, 'centripetal');
  const base = toward(0.72);
  const pitch0 = Math.asin(new THREE.Vector3().subVectors(T0, base).normalize().y);

  const dir = new THREE.Vector3(), aim = new THREE.Vector3(), right = new THREE.Vector3();
  const mouse = new THREE.Vector2(), smoothMouse = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  });
  const setFov = (camera: THREE.PerspectiveCamera, fov: number) => {
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
  };

  return {
    /** `t` da linha do tempo; `skyView` com o véu fechado; `sky` é a direção de Órion; `parallax` (0 a 1) liga o mouse. */
    apply(camera: THREE.PerspectiveCamera, t: number, skyView: boolean, sky: THREE.Vector3, parallax: number, dt: number) {
      smoothMouse.lerp(mouse, 1 - Math.exp(-dt * 3));
      if (skyView) {
        camera.position.copy(base).setY(ASCENT_TOP);
        dir.copy(sky).normalize();
        if (parallax > 0) {
          right.crossVectors(dir, camera.up).normalize();
          dir.applyAxisAngle(camera.up, -smoothMouse.x * PARALLAX_RAD * parallax);
          dir.applyAxisAngle(right, -smoothMouse.y * PARALLAX_RAD * parallax).normalize();
        }
        camera.lookAt(aim.copy(camera.position).add(dir));
        setFov(camera, SKY_FOV);
        return;
      }
      setFov(camera, framing.fov);
      if (t <= FLOWER_END) {
        approach.getPoint(t / FLOWER_END, camera.position);
        camera.lookAt(T0);
        return;
      }
      const a = (t - FLOWER_END) / (1 - FLOWER_END);
      camera.position.copy(base).setY(base.y + (ASCENT_TOP - base.y) * ss(0, 1, a));
      const pitch = pitch0 + (ASCENT_PITCH - pitch0) * ss(0, 0.45, a);
      dir.copy(F).multiplyScalar(Math.cos(pitch)).setY(Math.sin(pitch));
      camera.lookAt(aim.copy(camera.position).add(dir));
    },
  };
}
