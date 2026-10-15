// Espelho de growVertex() em meshdata.ts. Mudou um, mude o outro.
import {
  Fn, attribute, uniform, positionLocal, normalLocal, smoothstep, cos, sin, cross, dot, normalize,
  transformNormalToView, negateOnBackSide,
} from 'three/tsl';
import type { Node } from 'three/webgpu';

export const uGrowth = uniform(1);

const rodrigues = Fn(([v, k, a]: [Node<'vec3'>, Node<'vec3'>, Node<'float'>]) => {
  const c = cos(a);
  const s = sin(a);
  return v.mul(c).add(cross(k, v).mul(s)).add(k.mul(dot(k, v)).mul(c.oneMinus()));
});

const growth = () => {
  const age = attribute('aAge', 'float');
  const grow = attribute('aGrow', 'vec2');
  const scale = smoothstep(age.sub(grow.x), age, uGrowth);
  const open = smoothstep(age, age.add(grow.y), uGrowth);
  const angle = attribute('aClosed', 'float').mul(open.oneMinus());
  const axis = normalize(attribute('aAxis', 'vec3'));
  return { scale, angle, axis };
};

export const growthPositionNode = Fn(() => {
  const { scale, angle, axis } = growth();
  const pivot = attribute('aPivot', 'vec3');
  return pivot.add(rodrigues(positionLocal.sub(pivot), axis, angle).mul(scale));
})();

// NodeMaterial.normalNode é lido em espaço de visão (setupNormal alimenta normalView), então a normal
// girada passa pela mesma transformação local->visão que o three aplica ao atributo, vira varying e,
// em materiais DoubleSide, é invertida nas faces de trás como no caminho padrão.
export const growthNormalNode = Fn(() => {
  const { angle, axis } = growth();
  const view = transformNormalToView(rodrigues(normalLocal, axis, angle)).toVarying('v_growthNormalView');
  return negateOnBackSide(normalize(view));
})();
