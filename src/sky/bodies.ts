// Lua e planetas visíveis no céu real. Domínio puro, sem three. Direções nos eixos da cena (ver frame.ts).
import { Body, Equator, Illumination, Observer } from 'astronomy-engine';
import { applyMat3, equatorialToHorizontalMatrix, raDecToVector, type Vec3 } from './frame';
import type { City } from './cities';

export interface Planet { name: 'mars' | 'jupiter' | 'saturn'; dir: Vec3; mag: number }
export interface Bodies {
  /** dir: direção topocêntrica da Lua; sunDir: direção do Sol (ilumina a esfera); fraction: 0 a 1. */
  moon: { dir: Vec3; sunDir: Vec3; fraction: number };
  planets: Planet[];
}

const PLANETS = [['mars', Body.Mars], ['jupiter', Body.Jupiter], ['saturn', Body.Saturn]] as const;

export function bodies(date: Date, city: City, matrix = equatorialToHorizontalMatrix(date, city.lat, city.lon, city.height)): Bodies {
  const obs = new Observer(city.lat, city.lon, city.height);
  // Coordenadas J2000 (ofdate = false) para usar a mesma matriz das estrelas; topocêntricas, com aberração.
  const dirOf = (body: Body): Vec3 => {
    const eq = Equator(body, date, obs, false, true);
    return applyMat3(matrix, raDecToVector((eq.ra * Math.PI) / 12, (eq.dec * Math.PI) / 180));
  };
  return {
    moon: { dir: dirOf(Body.Moon), sunDir: dirOf(Body.Sun), fraction: Illumination(Body.Moon, date).phase_fraction },
    planets: PLANETS.map(([name, body]) => ({ name, dir: dirOf(body), mag: Illumination(body, date).mag })),
  };
}
