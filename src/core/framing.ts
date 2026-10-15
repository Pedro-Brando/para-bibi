// Enquadramento da câmera a partir da altura da flor. Sem three: só aritmética, para ser testável em Node.
export type Vec3 = [number, number, number];
export interface Framing { fov: number; target: Vec3; position: Vec3 }

export const FRAME_FOV = 36;
/** Espaço acima do último nó do caule: o botão fechado sobe até petalLength (0,36) e sobra uma folga. */
export const HEAD_ROOM = 0.3;
/** A flor da seed do nome (altura 0,95) define o enquadramento de referência, ajustado à mão. */
const REFERENCE_SPAN = 1.25;
/** Do alvo até a câmera no enquadramento de referência (distância 2,33). */
const REFERENCE_OFFSET: Vec3 = [0.9, 0.46, 2.1];

/** Alvo no meio do vão (semente em y = 0 até o topo do botão) e câmera afastada na proporção do vão. */
export function frameFlower(height: number): Framing {
  const span = height + HEAD_ROOM;
  const scale = span / REFERENCE_SPAN;
  const target: Vec3 = [0, 0.5 * span, 0];
  const position: Vec3 = [
    target[0] + REFERENCE_OFFSET[0] * scale,
    target[1] + REFERENCE_OFFSET[1] * scale,
    target[2] + REFERENCE_OFFSET[2] * scale,
  ];
  return { fov: FRAME_FOV, target, position };
}
