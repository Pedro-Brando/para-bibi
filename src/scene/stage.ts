import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Framing } from '../core/framing';

export const MAX_DPR = 2;
/** Escala de renderização do site (fração do tamanho CSS): começa em 0,75 e desce até 0,5 se travar. */
export const RENDER_SCALE = { start: 0.75, min: 0.5, max: 0.75, step: 0.05 } as const;

/**
 * `light`: o site, pensado para um PC fraco (GPU integrada, talvez sem WebGPU): sem antisserrilhado, sem bloom
 * (o brilho neon vem dos materiais e de um halo), escala de renderização adaptativa. `?hq` devolve o bloom.
 */
export async function createStage(canvasParent: HTMLElement, forceWebGL: boolean, framing: Framing, orbit = true, light = false) {
  const query = new URLSearchParams(location.search);
  // ?gputime: mede o tempo de GPU por quadro (timestamp queries), só para medição de desempenho.
  const trackTimestamp = query.has('gputime');
  const useBloom = !light || query.has('hq');
  const renderer = new THREE.WebGPURenderer({ antialias: !light, forceWebGL, trackTimestamp });
  await renderer.init();
  if (trackTimestamp) (window as unknown as { __qmRenderer: unknown }).__qmRenderer = renderer;
  let scale: number = RENDER_SCALE.start;
  const pixelRatio = () => (light ? scale : Math.min(window.devicePixelRatio, MAX_DPR));
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Neutral (Khronos PBR Neutral) preserva o rosa saturado; AgX lavava as pétalas em pastel.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvasParent.appendChild(renderer.domElement);
  const backend: 'webgpu' | 'webgl2' = renderer.backend instanceof THREE.WebGPUBackend ? 'webgpu' : 'webgl2';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07060d');

  // Enquadramento calculado da altura desta flor (src/core/framing.ts): a semente em y = 0 e o topo do
  // botão fechado cabem no quadro para qualquer seed; a flor da seed do nome fica como foi ajustada à mão.
  // far cobre a cúpula do céu (raio 400) da cena completa.
  const camera = new THREE.PerspectiveCamera(framing.fov, window.innerWidth / window.innerHeight, 0.01, 1000);
  camera.position.set(...framing.position);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...framing.target);
  controls.enableDamping = true;
  // Na cena completa o plano é fixo e composto; OrbitControls só com ?dev=1 (e na cena só da flor).
  controls.enabled = orbit;
  controls.update();

  // Luar frio mas quase branco (um azul saturado fazia o rosa virar lavanda), ambiente quase nulo.
  const moon = new THREE.DirectionalLight('#dfe6ff', 0.9);
  moon.position.set(-1.5, 3, 1.2);
  scene.add(moon, new THREE.HemisphereLight('#1b2140', '#050408', 0.25));
  // Relâmpago rosado: a flor acende, mas não estoura em branco.
  const flash = new THREE.PointLight('#ffd6ec', 0, 8, 1.5);
  flash.position.set(0.3, 1.6, -1.2);
  scene.add(flash);

  // Em 0.186.1 a classe de pipeline chama-se RenderPipeline; PostProcessing é só um alias deprecado.
  let post: THREE.RenderPipeline | null = null;
  if (useBloom) {
    post = new THREE.RenderPipeline(renderer);
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode('output');
    // Limiar abaixo do padrão para o rosa neon (veias, miolo, borda) brilhar de leve em repouso.
    post.outputNode = color.add(bloom(color, 0.8, 0.4, 0.45));
  }

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);

  // Escala adaptativa: média do tempo de quadro em janelas de meio segundo. Acima de 18 ms desce um degrau;
  // colado no vsync (até 17,2 ms) por alguns segundos sobe um, e se logo depois precisar descer de novo, a
  // espera para subir dobra (sem ficar oscilando). Quadros de aba escondida ou travadas de carga não contam.
  let acc = 0, n = 0, calm = 0, calmNeeded = 4, sinceRaise = Infinity;
  const adapt = (dt: number) => {
    if (!light || dt <= 0 || dt > 0.25 || document.hidden) return;
    acc += dt; n++; sinceRaise += dt;
    if (acc < 0.5) return;
    const avg = (acc / n) * 1000;
    acc = 0; n = 0;
    let next = scale;
    if (avg > 18) {
      next = Math.max(RENDER_SCALE.min, scale - RENDER_SCALE.step);
      if (sinceRaise < 3) calmNeeded = Math.min(calmNeeded * 2, 64);
      calm = 0;
    } else if (avg < 17.2) {
      calm += 0.5;
      if (calm >= calmNeeded && scale < RENDER_SCALE.max) { next = Math.min(RENDER_SCALE.max, scale + RENDER_SCALE.step); calm = 0; sinceRaise = 0; }
    } else calm = 0;
    if (Math.abs(next - scale) > 1e-6) { scale = next; renderer.setPixelRatio(scale); }
  };

  return {
    renderer, scene, camera, controls, flash, backend,
    dpr: () => renderer.getPixelRatio(),
    /** `dt` (segundos) alimenta a escala adaptativa do modo leve. */
    render: (dt = 0) => {
      adapt(dt);
      if (post) post.render();
      else renderer.render(scene, camera);
    },
  };
}
