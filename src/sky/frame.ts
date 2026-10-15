// Do equatorial J2000 para o horizonte local, já nos eixos da cena. Domínio puro, sem three.
//
// Convenção da cena: y para cima (zênite), -z para o norte, +x para o leste (então +z é sul).
// O astronomy-engine usa no horizonte x = norte, y = oeste, z = zênite. Conversão:
//   cena.x = -hor.y,  cena.y = hor.z,  cena.z = -hor.x.
// A matriz devolvida é mat3 coluna-major (9 números, como THREE.Matrix3.fromArray e o mat3 da TSL),
// aplicada a vetores unitários equatoriais J2000 (x para o ponto vernal, z para o polo norte celeste).
import { Observer, Rotation_EQJ_HOR } from 'astronomy-engine';

export type Vec3 = [number, number, number];

export function equatorialToHorizontalMatrix(date: Date, lat: number, lon: number, height = 700): number[] {
  // rot[c] é a coluna c (RotateVector: saída_j = Σ_c rot[c][j] · v_c); inclui precessão e nutação.
  const { rot } = Rotation_EQJ_HOR(date, new Observer(lat, lon, height));
  const m: number[] = [];
  for (let c = 0; c < 3; c++) m.push(-rot[c]![1]!, rot[c]![2]!, -rot[c]![0]!);
  return m;
}

export function raDecToVector(raRad: number, decRad: number): Vec3 {
  const cd = Math.cos(decRad);
  return [cd * Math.cos(raRad), cd * Math.sin(raRad), Math.sin(decRad)];
}

export function applyMat3(m: number[], v: Vec3): Vec3 {
  return [
    m[0]! * v[0] + m[3]! * v[1] + m[6]! * v[2],
    m[1]! * v[0] + m[4]! * v[1] + m[7]! * v[2],
    m[2]! * v[0] + m[5]! * v[1] + m[8]! * v[2],
  ];
}

/** Altitude em graus (sem refração) de uma estrela J2000 com a matriz da cena. */
export function altitudeDeg(raRad: number, decRad: number, matrix: number[]): number {
  const v = applyMat3(matrix, raDecToVector(raRad, decRad));
  return (Math.asin(Math.max(-1, Math.min(1, v[1]))) * 180) / Math.PI;
}
