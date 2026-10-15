import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

/** Cobertura de nuvens: 1 tempestade, 0 céu limpo. As bordas se desfazem (limiar sobre o ruído). */
export const uCoverage = uniform(1);
/** 0 céu de Eorzea, 1 céu real de 2026-10-03 03:53 BRT. */
export const uWorldBlend = uniform(0);
/** Desenho progressivo das linhas de Órion, 0 a 1. */
export const uOrion = uniform(0);
/** 0 São Paulo, 1 Governador Valadares (a matriz é recalculada na CPU). */
export const uCityBlend = uniform(0);

/** Equatorial J2000 para a cena (src/sky/frame.ts). */
export const uEqToHor = uniform(new THREE.Matrix3());
/** Ângulo (em radianos) de um pixel CSS na vertical: tamanhos de estrela em pixels, para qualquer fov. */
export const uPixelAngle = uniform(0.001);
/** Pulso de brilho em estrelas do catálogo perto de uma direção (cada verso que termina acende algumas). */
export const uPulseDir = uniform(new THREE.Vector3(0, 1, 0));
export const uPulse = uniform(0);
