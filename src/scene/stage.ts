import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const MAX_DPR = 2;

export async function createStage(canvasParent: HTMLElement, forceWebGL: boolean) {
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

  // Enquadra a semente em y = 0 e a flor inteira (cerca de 1,3 de altura) em crescimento 1.
  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.01, 50);
  camera.position.set(0.9, 1.08, 2.1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.62, 0);
  controls.enableDamping = true;
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
  // Limiar um pouco abaixo do padrão para o rosa neon (veias, miolo) brilhar em repouso.
  post.outputNode = color.add(bloom(color, 0.8, 0.4, 0.5));

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
