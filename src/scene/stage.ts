import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Framing } from '../core/framing';

export const MAX_DPR = 2;

export async function createStage(canvasParent: HTMLElement, forceWebGL: boolean, framing: Framing, orbit = true) {
  const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
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
  const post = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode('output');
  // Limiar abaixo do padrão para o rosa neon (veias, miolo, borda) brilhar de leve em repouso.
  post.outputNode = color.add(bloom(color, 0.8, 0.4, 0.45));

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, controls, flash, backend,
    dpr: () => renderer.getPixelRatio(),
    render: () => post.render(),
  };
}
