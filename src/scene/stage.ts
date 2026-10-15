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
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvasParent.appendChild(renderer.domElement);
  const backend: 'webgpu' | 'webgl2' = renderer.backend instanceof THREE.WebGPUBackend ? 'webgpu' : 'webgl2';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07060d');

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.01, 50);
  camera.position.set(0.9, 1.05, 1.9);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.75, 0);
  controls.enableDamping = true;
  controls.update();

  // Luar frio, ambiente quase nulo, contraluz rosa fraca.
  const moon = new THREE.DirectionalLight('#8fa3ff', 0.7);
  moon.position.set(-1.5, 3, 1.2);
  scene.add(moon, new THREE.HemisphereLight('#1b2140', '#050408', 0.25));
  const flash = new THREE.PointLight('#cfd8ff', 0, 8, 1.5);
  flash.position.set(0.3, 1.6, -1.2);
  scene.add(flash);

  // Em 0.186.1 a classe de pipeline chama-se RenderPipeline; PostProcessing é só um alias deprecado.
  const post = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode('output');
  post.outputNode = color.add(bloom(color, 0.8, 0.4, 0.6));

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
