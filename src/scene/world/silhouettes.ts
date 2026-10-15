import * as THREE from 'three/webgpu';
import {
  color, float, vec2, mix, smoothstep, fwidth, max, texture, uv,
} from 'three/tsl';
import { treeModules } from '../../lsystem/tree';
import { interpret } from '../../lsystem/turtle';
import { sfc32, range, type Rng } from '../../seed/prng';
import { LAYERS, LAYER_BOTTOM, MILL, layerTrees, treeSeed, type LayerSpec } from './layout';
import { uFlash } from '../flower/materials';
import { uFogOn } from './uniforms';

const MAX_TEX = 2048;

/** Cores por camada, da mais perto para a mais longe: mais perto mais escura, mais longe mais clara e azul. */
const LAYER_COLORS = ['#020308', '#060915', '#0b1022', '#121a33', '#1c2647'];
const MIST_COLOR = '#27305a';

interface Canvas2D { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D; ppm: number; toPx(x: number, y: number): [number, number] }

function makeCanvas(width: number, height: number): Canvas2D {
  const ppm = Math.min(MAX_TEX / width, MAX_TEX / height, 96);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ppm);
  canvas.height = Math.round(height * ppm);
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // Origem no centro de baixo do plano; y em metros a partir de LAYER_BOTTOM.
  const toPx = (x: number, y: number): [number, number] => [(x + width / 2) * ppm, canvas.height - (y - LAYER_BOTTOM) * ppm];
  return { canvas, g, ppm, toPx };
}

/**
 * Desenha uma árvore do L-system: galhos como traços de largura = diâmetro, base alargada nas raízes,
 * inclinação leve e copa como nuvem de círculos nas pontas.
 */
function drawTree(c: Canvas2D, rng: Rng, x0: number, y0: number, height: number, radius: number) {
  const sk = interpret(treeModules(rng, height, radius), { tropism: [0, 1, 0], tropismStrength: 0.03, substeps: 2 });
  const yaw = rng() * Math.PI * 2;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const lean = range(rng, -0.04, 0.04);
  const px = (p: [number, number, number]) => c.toPx(x0 + p[0] * cy - p[2] * sy + lean * p[1], y0 + p[1]);
  const { g, ppm } = c;
  // Raízes: trapézio que alarga a base do tronco até 2,4 vezes o raio.
  g.beginPath();
  g.moveTo(...c.toPx(x0 - radius * 2.4, y0 - 0.3));
  g.quadraticCurveTo(...c.toPx(x0 - radius * 1.05, y0 + 0.15), ...c.toPx(x0 - radius * 0.95, y0 + radius * 3));
  g.lineTo(...c.toPx(x0 + radius * 0.95, y0 + radius * 3));
  g.quadraticCurveTo(...c.toPx(x0 + radius * 1.05, y0 + 0.15), ...c.toPx(x0 + radius * 2.4, y0 - 0.3));
  g.closePath();
  g.fill();
  for (const b of sk.branches) {
    for (let i = 0; i < b.nodes.length - 1; i++) {
      const a = b.nodes[i]!, n = b.nodes[i + 1]!;
      g.lineWidth = Math.max(1.5, (a.radius + n.radius) * ppm);
      g.beginPath();
      g.moveTo(...px(a.position));
      g.lineTo(...px(n.position));
      g.stroke();
    }
  }
  const leaf = height * 0.11;
  for (const at of sk.attachments) {
    const [cx, cyPx] = px(at.position);
    for (let k = 0; k < 10; k++) {
      const r = leaf * range(rng, 0.35, 0.8) * at.scale * ppm;
      const a = rng() * Math.PI * 2, d = leaf * range(rng, 0, 1) * ppm;
      g.beginPath();
      g.arc(cx + Math.cos(a) * d * 1.3, cyPx - Math.sin(a) * d * 0.6 - leaf * 0.3 * ppm, r, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** Abeto distante: tronco fino e saia de galhos em dentes, mais simples que o L-system e bem legível longe. */
function drawSpruce(c: Canvas2D, rng: Rng, x0: number, y0: number, height: number) {
  const { g } = c;
  const w = height * range(rng, 0.12, 0.17);
  const tiers = 7;
  g.beginPath();
  g.moveTo(...c.toPx(x0, y0 + height));
  for (let k = 1; k <= tiers; k++) {
    const y = y0 + height * (1 - k / tiers) * 0.85 + height * 0.1;
    const half = (w * k) / tiers;
    g.lineTo(...c.toPx(x0 + half, y));
    g.lineTo(...c.toPx(x0 + half * 0.55, y + height * 0.03));
  }
  for (let k = tiers; k >= 1; k--) {
    const y = y0 + height * (1 - k / tiers) * 0.85 + height * 0.1;
    const half = (w * k) / tiers;
    g.lineTo(...c.toPx(x0 - half * 0.55, y + height * 0.03));
    g.lineTo(...c.toPx(x0 - half, y));
  }
  g.closePath();
  g.fill();
  g.fillRect(...c.toPx(x0 - height * 0.02, y0 + height * 0.15), height * 0.04 * c.ppm, height * 0.2 * c.ppm);
}

/** Faixa de terreno na base da camada, ondulando suave. */
function drawRidge(c: Canvas2D, spec: LayerSpec, rng: Rng) {
  const { g } = c;
  const p1 = rng() * 10, p2 = rng() * 10;
  g.beginPath();
  g.moveTo(...c.toPx(-spec.width / 2, LAYER_BOTTOM));
  for (let x = -spec.width / 2; x <= spec.width / 2 + 0.01; x += spec.width / 120) {
    const y = spec.ridge * (0.6 + 0.25 * Math.sin(x * 0.35 + p1) + 0.15 * Math.sin(x * 1.1 + p2));
    g.lineTo(...c.toPx(x, y));
  }
  g.lineTo(...c.toPx(spec.width / 2, LAYER_BOTTOM));
  g.closePath();
  g.fill();
  // Arbustos e samambaias quebram a linha do terreno.
  const shrubs = Math.round(spec.width * 3);
  for (let k = 0; k < shrubs; k++) {
    const x = range(rng, -spec.width / 2, spec.width / 2);
    const top = spec.ridge * (0.6 + 0.25 * Math.sin(x * 0.35 + p1) + 0.15 * Math.sin(x * 1.1 + p2));
    const r = range(rng, 0.08, 0.3) * (0.6 + spec.ridge * 0.5);
    g.beginPath();
    g.ellipse(...c.toPx(x, top), r * 1.4 * c.ppm, r * c.ppm, 0, 0, Math.PI * 2);
    g.fill();
  }
}

/** Casa do moinho: paredes, telhado de duas águas, chaminé, e o eixo onde a roda gira. */
function drawMill(c: Canvas2D) {
  const { g } = c;
  const m = MILL;
  const mid = (m.houseLeft + m.houseRight) / 2;
  g.beginPath();
  for (const [x, y] of [
    [m.houseLeft, LAYER_BOTTOM], [m.houseLeft, m.wallTop], [m.houseLeft - 0.4, m.wallTop], [mid, m.roofTop],
    [m.houseRight + 0.4, m.wallTop], [m.houseRight, m.wallTop], [m.houseRight, LAYER_BOTTOM],
  ] as const) g.lineTo(...c.toPx(x, y));
  g.closePath();
  g.fill();
  g.fillRect(...c.toPx(m.houseLeft + 0.8, m.roofTop + 0.4), 0.5 * c.ppm, 1.6 * c.ppm);
  // Calha de madeira levando água ao topo da roda.
  g.lineWidth = 0.18 * c.ppm;
  g.beginPath();
  g.moveTo(...c.toPx(m.houseRight, m.wheelY + m.wheelRadius + 0.25));
  g.lineTo(...c.toPx(m.wheelX + 0.2, m.wheelY + m.wheelRadius + 0.15));
  g.stroke();
}

function wheelCanvas(): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.strokeStyle = g.fillStyle = '#fff';
  const c = size / 2, R = size * 0.42;
  g.lineWidth = size * 0.025;
  for (const r of [R, R * 0.82]) { g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = size * 0.018;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    g.beginPath();
    g.moveTo(c - Math.cos(a) * R, c - Math.sin(a) * R);
    g.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R);
    g.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.save();
    g.translate(c + Math.cos(a) * R, c + Math.sin(a) * R);
    g.rotate(a);
    g.fillRect(-size * 0.02, -size * 0.06, size * 0.1, size * 0.12);
    g.restore();
  }
  g.beginPath(); g.arc(c, c, size * 0.06, 0, Math.PI * 2); g.fill();
  return canvas;
}

/**
 * Material de silhueta: recorte nítido com antisserrilhado por fwidth (o alfa do canvas funciona como campo
 * de distância grosseiro, então a borda fica limpa mesmo ampliada), cor da camada, faixa de névoa na base,
 * contorno claro voltado para o céu durante o relâmpago.
 */
function silhouetteMaterial(tex: THREE.Texture, layerColor: string, depth01: number, heightM: number, mistM: number, mistAmount = 0.55) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  m.fog = false;
  const t = uv();
  const a = texture(tex, t).a;
  const aa = max(fwidth(a), 0.001);
  const sil = smoothstep(float(0.5).sub(aa), float(0.5).add(aa), a);
  // Contorno: dentro da silhueta, mas com o céu logo acima ou ao lado (luz vindo de trás).
  const img = tex.image as HTMLCanvasElement;
  const px = vec2(1.5 / img.width, 2.5 / img.height);
  const outside = texture(tex, t.add(vec2(px.x.mul(0.5), px.y))).a.oneMinus();
  const rim = sil.mul(smoothstep(0.3, 0.9, outside));
  // Perspectiva aérea: o relâmpago clareia mais as camadas de longe.
  const base = mix(color(layerColor), color('#4a4f86'), uFlash.mul(0.15 + 0.45 * depth01));
  const silColor = base.add(color('#c9b8ff').mul(rim.mul(uFlash.mul(0.45))));
  const yM = t.y.mul(heightM).add(LAYER_BOTTOM);
  const mist = smoothstep(-0.5, mistM, yM).oneMinus().mul(mistAmount).mul(uFogOn);
  const mistColor = mix(color(MIST_COLOR), color('#7d80b8'), uFlash.mul(0.6));
  m.colorNode = mix(mistColor, mix(silColor, mistColor, mist), sil);
  m.opacityNode = max(sil, mist);
  return m;
}

function canvasTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Silhuetas de Quarrymill contra a luz: 5 planos verticais atrás da flor, voltados para a câmera inicial,
 * texturas desenhadas uma vez em canvas 2D. A roda d'água é um plano pequeno à parte que gira devagar.
 */
export function createSilhouettes(camera: THREE.Camera, flowerTarget: THREE.Vector3) {
  const group = new THREE.Group();
  const forward = new THREE.Vector3().subVectors(flowerTarget, camera.position).setY(0).normalize();
  const lookY = (mesh: THREE.Object3D) => mesh.lookAt(camera.position.x, mesh.position.y, camera.position.z);
  let wheel: THREE.Mesh | null = null;

  LAYERS.forEach((spec, i) => {
    const c = makeCanvas(spec.width, spec.height);
    const rng = sfc32(treeSeed(50_000 + i));
    for (const tr of layerTrees(i)) {
      const r = sfc32(treeSeed(tr.seedIndex));
      // Nas camadas de longe metade são abetos: a copa lê melhor contra o céu.
      if (i >= 3 && r() < 0.5) drawSpruce(c, r, tr.x, spec.ridge * 0.4, tr.height);
      else drawTree(c, r, tr.x, spec.ridge * 0.4, tr.height, tr.radius);
    }
    drawRidge(c, spec, rng);
    if (spec.mill) drawMill(c);
    const tex = canvasTexture(c.canvas);
    const depth01 = i / (LAYERS.length - 1);
    const mistM = 1.2 + i * 0.6;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.height), silhouetteMaterial(tex, LAYER_COLORS[i]!, depth01, spec.height, mistM));
    const center = forward.clone().multiplyScalar(spec.dist);
    mesh.position.set(center.x, LAYER_BOTTOM + spec.height / 2, center.z);
    lookY(mesh);
    // Mais longe primeiro; o raio (renderOrder 1) fica atrás de todas.
    mesh.renderOrder = 10 + (LAYERS.length - i);
    group.add(mesh);

    if (spec.mill) {
      const wtex = canvasTexture(wheelCanvas());
      const size = MILL.wheelRadius * 2 / 0.84 * 1.08;
      wheel = new THREE.Mesh(new THREE.PlaneGeometry(size, size), silhouetteMaterial(wtex, LAYER_COLORS[i]!, depth01, size, 1, 0));
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const p = center.clone().addScaledVector(right, MILL.wheelX).addScaledVector(forward, -0.05);
      wheel.position.set(p.x, MILL.wheelY, p.z);
      lookY(wheel);
      wheel.renderOrder = mesh.renderOrder + 0.5;
      group.add(wheel);
    }
  });

  return {
    object: group,
    update(dt: number) { wheel?.rotateZ(-dt * 0.35); },
  };
}

