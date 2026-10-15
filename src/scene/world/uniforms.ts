import { uniform } from 'three/tsl';

/** Intensidade da chuva, 0 a 1. Na tempestade de 03:53, 1. */
export const uRain = uniform(1);
/** 1 com neblina ligada, 0 desligada (controle de dev). */
export const uFogOn = uniform(1);
/** Brilho do raio visível, 0 a 1 (a fita some em cerca de 0,3 s). */
export const uBolt = uniform(0);
/** Opacidade das duas camadas de silhueta mais perto (saem quando a câmera sobe para o céu). */
export const uNearLayers = uniform(1);
/** Opacidade da camada do moinho (a terceira): olhando para Órion lá de cima, a borda de cima do plano apareceria. */
export const uMidLayer = uniform(1);
