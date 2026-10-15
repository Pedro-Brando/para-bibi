import * as THREE from 'three/webgpu';
import { float, uniform } from 'three/tsl';
import { decodeCatalog, STAR_STRIDE, type CatalogMeta } from '../../sky/catalog';
import { equatorialToHorizontalMatrix, applyMat3, raDecToVector } from '../../sky/frame';
import { bodies } from '../../sky/bodies';
import { cityAt } from '../../sky/cities';
import { ORION, ORION_HIPS } from '../../sky/orion';
import { eorzeaStars } from '../../sky/eorzeaStars';
import { FIRST_DATE_UNIX } from '../../eorzea/time';
import { createBackdrop, createClouds } from './dome';
import { createStarField } from './stars';
import { createMoon, createPlanet } from './bodies';
import { createOrionLines } from './orion';
import { uCoverage, uWorldBlend, uOrion, uCityBlend, uEqToHor, uPixelAngle } from './uniforms';

/** O instante do céu real: 2026-10-03 03:53 BRT. */
export const SKY_DATE = new Date(FIRST_DATE_UNIX * 1000);

export interface Sky {
  /** Grupo centrado na câmera (acompanha a posição dela em `update`). */
  object: THREE.Group;
  update(dt: number, t: number): void;
  /** Direção na cena do centro de Órion (Alnilam) e da Lua, para a cidade atual. */
  orionDirection(): THREE.Vector3;
  moonDirection(): THREE.Vector3;
  uCoverage: typeof uCoverage;
  uWorldBlend: typeof uWorldBlend;
  uOrion: typeof uOrion;
  uCityBlend: typeof uCityBlend;
}

async function loadCatalog(): Promise<{ stars: Float32Array; meta: CatalogMeta }> {
  const base = import.meta.env.BASE_URL;
  const [bin, meta] = await Promise.all([
    fetch(`${base}stars.bin`).then((r) => r.arrayBuffer()),
    fetch(`${base}stars-meta.json`).then((r) => r.json() as Promise<CatalogMeta>),
  ]);
  return { stars: decodeCatalog(bin), meta };
}

/** Céu de Eorzea (tempestade e estrelas inventadas) e o céu real com Lua, planetas e Órion. */
export async function createSky(camera: THREE.PerspectiveCamera): Promise<Sky> {
  const { stars, meta } = await loadCatalog();
  const radec = new Map<number, [number, number]>();
  for (const hip of ORION_HIPS) {
    const i = meta.hip.indexOf(hip) * STAR_STRIDE;
    radec.set(hip, [stars[i]!, stars[i + 1]!]);
  }

  // As estrelas de Eorzea ficam paradas nos eixos da cena (matriz identidade).
  const uIdentity = uniform(new THREE.Matrix3());
  const moon = createMoon();
  const planets = (['mars', 'jupiter', 'saturn'] as const).map((n) => ({ name: n, ...createPlanet(n) }));
  const object = new THREE.Group();
  const eorzeaField = createStarField(eorzeaStars(), uIdentity, float(1).sub(uWorldBlend));
  const realField = createStarField(stars, uEqToHor, uWorldBlend);
  const orionLines = createOrionLines(radec);
  const clouds = createClouds();
  object.add(createBackdrop(), eorzeaField, realField, moon.mesh, ...planets.map((p) => p.sprite), orionLines, clouds);

  let matrix: number[] = [];
  let lastCity = NaN;
  const recompute = () => {
    const city = cityAt(uCityBlend.value);
    matrix = equatorialToHorizontalMatrix(SKY_DATE, city.lat, city.lon, city.height);
    uEqToHor.value.fromArray(matrix);
    const b = bodies(SKY_DATE, city, matrix);
    moon.set(b.moon.dir, b.moon.sunDir);
    for (const p of planets) {
      const pb = b.planets.find((x) => x.name === p.name)!;
      p.set(pb.dir, pb.mag);
    }
    lastCity = uCityBlend.value;
  };
  recompute();

  return {
    object,
    update() {
      if (uCityBlend.value !== lastCity) recompute();
      object.position.copy(camera.position);
      // Não desenha o que está invisível: o céu que não aparece, nuvens com o céu aberto, Órion apagado.
      eorzeaField.visible = uWorldBlend.value < 0.999;
      realField.visible = uWorldBlend.value > 0.001;
      clouds.visible = uCoverage.value > 0.001;
      orionLines.visible = uOrion.value > 0.001;
      uPixelAngle.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, window.innerHeight);
    },
    orionDirection() {
      const [ra, dec] = radec.get(ORION.alnilam)!;
      return new THREE.Vector3(...applyMat3(matrix, raDecToVector(ra, dec)));
    },
    moonDirection: () => moon.mesh.position.clone().normalize(),
    uCoverage, uWorldBlend, uOrion, uCityBlend,
  };
}
