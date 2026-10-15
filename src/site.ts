import * as THREE from 'three/webgpu';
import type { AppOptions } from './core/url';
import { createClock } from './core/clock';
import { frameFlower } from './core/framing';
import { createStage } from './scene/stage';
import { buildFlower } from './scene/flower/build';
import { createFlowerGroup } from './scene/flower/group';
import { uFlash, uPulse as uFlowerPulse, SEED_FADE_END } from './scene/flower/materials';
import { uGrowth } from './scene/flower/growthNode';
import { NAME_SEED } from './seed/constants';
import { cyrb128 } from './seed/hash';
import { eorzeaTime, formatEt, FIRST_DATE_UNIX } from './eorzea/time';
import { weatherChance, southShroudWeather, weatherLabelPt } from './eorzea/weather';
import { stateAt } from './timeline/timeline';
import { STEPS, StepNav } from './timeline/steps';
import { createNameFlower } from './ui/nameFlower';
import { nightsTogether } from './nights/count';
import { createWorld } from './scene/world';
import { createCameraPath } from './scene/cameraPath';
import { createNights } from './scene/nights';
import { createVeil, uVeil } from './scene/veil';
import { uPulse, uPulseDir } from './scene/sky/uniforms';
import { startAudio, type Audio } from './audio/context';
import { playThunder } from './audio/thunder';
import { createRainSound } from './audio/rain';
import { createMusic, setSound } from './audio/music';
import { createPoem } from './ui/poem';
import { isSmallScreen, showSmallScreen, createEntry, createCorner, createText, createStepper } from './ui/site';

const SCROLL_RATE = 3.2; // amortecimento exponencial do progresso, por segundo
const EXPLORE_AT = 0.995;
const SEEN_KEY = 'quarrymill.nightsSeen';

const PHRASE = 'Às 3:53, Órion estava sobre São Paulo e sobre Governador Valadares. O mesmo céu, a 700 km de distância.';
const eorzeaLabel = () =>
  `Bibi Bilota · South Shroud · ${formatEt(eorzeaTime(FIRST_DATE_UNIX))} ET · ${weatherLabelPt(southShroudWeather(weatherChance(FIRST_DATE_UNIX)))}`;
const realLabel = (city: number) => `Ana Beatriz · ${city > 0.5 ? 'Governador Valadares' : 'São Paulo'} · 3 de outubro de 2026 · 3:53`;

function readSeen(): number | null {
  try {
    const v = Number(localStorage.getItem(SEEN_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}
function writeSeen(n: number) {
  try { localStorage.setItem(SEEN_KEY, String(n)); } catch { /* sem armazenamento, tudo aparece normalmente */ }
}

/**
 * O site: tela de entrada, scroll nativo conduzindo a linha do tempo (livre), setinhas e teclado andando um passo
 * de cada vez, a flor do nome, poema, as noites e o modo explorar.
 */
export async function runSite(opts: AppOptions) {
  if (isSmallScreen()) { showSmallScreen(); return; }
  document.documentElement.classList.add('site');
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  document.body.appendChild(spacer);
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  const entry = createEntry();

  const seed = opts.seed === 'name' ? NAME_SEED : cyrb128(opts.seed);
  const { params, meshes } = buildFlower(seed);
  const framing = frameFlower(meshes.height);
  const stage = await createStage(document.body, opts.backend === 'webgl', framing, false, true);
  const { group, seedMesh, head } = createFlowerGroup(params, meshes);
  stage.scene.add(group);

  let audio: Audio | null = null;
  let music: ReturnType<typeof createMusic> | null = null;
  let rainSound: { setIntensity(r: number): void } | null = null;
  let flashT = 0;
  const world = await createWorld(stage.scene, {
    camera: stage.camera,
    target: stage.controls.target,
    onStrike: (distance) => {
      flashT = 1;
      if (audio) { playThunder(audio, distance); music?.duck(); }
    },
  });
  const sky = world.sky;

  const count = nightsTogether(new Date());
  const seen = readSeen();
  const nights = createNights(count, seen === null ? count : Math.min(seen, count));
  sky.object.add(nights.object);

  const veil = createVeil();
  stage.scene.add(veil);
  const camPath = createCameraPath(framing);
  camPath.setFocusTarget(head.clone().add(new THREE.Vector3(0, 0.04, 0)));
  const camera = stage.camera;
  const vignette = createText('vignette');
  const nameFlower = createNameFlower(document.body, NAME_SEED);
  const label = createText('place-label');
  const eorzeaText = eorzeaLabel();
  const phrase = createText('phrase', PHRASE);
  const forward = new THREE.Vector3(), side = new THREE.Vector3(), upv = new THREE.Vector3();
  const poem = createPoem(document.body, () => {
    // Um pulso de brilho em estrelas do catálogo perto de onde se olha, um pouco ao lado a cada verso.
    camera.getWorldDirection(forward);
    side.crossVectors(forward, camera.up).normalize();
    upv.crossVectors(side, forward).normalize();
    const a = Math.random() * Math.PI * 2, r = 0.08 + Math.random() * 0.16;
    uPulseDir.value.copy(forward).addScaledVector(side, Math.cos(a) * r * 1.4).addScaledVector(upv, Math.sin(a) * r).normalize();
    uPulse.value = 1;
  });

  // Modo explorar: céu (Eorzea, real, os dois) e cidade animados por cima da linha do tempo.
  const explore = { world: 1, city: 0, cityNow: 0, worldNow: 1 };
  let p = 0;
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const scrollTarget = () => Math.min(1, Math.max(0, window.scrollY / maxScroll()));
  const nav = new StepNav();
  // Onde a última transição das setas parou: o scroll em pixels arredonda o p, e o próximo passo sai daqui.
  let settled = { p: 0, scrollY: 0 };
  const jump = (to: number) => {
    nav.cancel();
    window.scrollTo({ top: to * maxScroll(), behavior: 'instant' });
    p = to;
    settled = { p: to, scrollY: window.scrollY };
  };
  const step = (dir: 1 | -1) => {
    if (!window.__quarrymill?.entered) return;
    nav.command(dir, window.scrollY === settled.scrollY ? settled.p : scrollTarget());
  };
  const stepper = createStepper(step);
  // A roda e o trackpad continuam livres; mexer neles no meio de uma transição das setas cancela a transição.
  const stopNav = () => { if (nav.busy) nav.cancel(); };
  window.addEventListener('wheel', stopNav, { passive: true });
  window.addEventListener('touchstart', stopNav, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const onButton = e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter');
    if (onButton) return;
    const dir = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey) ? 1
      : e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey) ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    step(dir);
  });
  const fade = document.createElement('div');
  fade.className = 'fade';
  document.body.appendChild(fade);
  const corner = createCorner({
    onSound: (on) => { if (audio) setSound(audio, on); },
    onWorld: (v) => { explore.world = v; },
    onCity: (v) => { explore.city = v; },
    onRestart: () => {
      fade.classList.add('on');
      setTimeout(() => {
        jump(0);
        explore.world = 1; explore.city = 0;
        fade.classList.remove('on');
      }, 650);
    },
  });

  try {
    await (stage.renderer as unknown as { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<void> })
      .compileAsync?.(stage.scene, camera);
  } catch { /* compila no primeiro quadro */ }

  window.__quarrymill = {
    backend: stage.backend,
    ready: false,
    setGrowth: () => {},
    dpr: stage.dpr,
    strike: () => world.strike(),
    progress: () => p,
    jump,
    navBusy: () => nav.busy,
    entered: false,
  };

  const clock = createClock();
  let frames = 0;
  let elapsed = 0;
  let savedSeen = false;
  let lastName = 0;
  stage.renderer.setAnimationLoop(() => {
    const rawDt = clock.step();
    const dt = Math.min(rawDt, 0.1);
    elapsed += dt;
    const stepped = nav.update(dt);
    if (stepped !== null) {
      // As setas conduzem o próprio scroll da página, então a barra e o scroll livre continuam coerentes.
      p = stepped;
      window.scrollTo({ top: p * maxScroll(), behavior: 'instant' });
      if (!nav.busy) settled = { p, scrollY: window.scrollY };
    } else {
      p += (scrollTarget() - p) * (1 - Math.exp(-dt * SCROLL_RATE));
      if (Math.abs(scrollTarget() - p) < 1e-4) p = scrollTarget();
    }
    const s = stateAt(p);
    const exploring = p >= EXPLORE_AT;
    corner.setExplore(exploring);

    uGrowth.value = s.growth;
    seedMesh.visible = s.growth < SEED_FADE_END;
    // No modo explorar os botões animam céu e cidade; fora dele, a linha do tempo manda direto.
    const k = exploring ? 1 - Math.exp(-dt * 1.5) : 1;
    const approach = (now: number, to: number) => (Math.abs(to - now) < 1e-3 ? to : now + (to - now) * k);
    explore.worldNow = approach(explore.worldNow, exploring ? explore.world : s.worldBlend);
    explore.cityNow = approach(explore.cityNow, exploring ? explore.city : s.cityBlend);
    sky.uCoverage.value = s.coverage;
    sky.uWorldBlend.value = explore.worldNow;
    sky.uOrion.value = s.orion;
    sky.uCityBlend.value = explore.cityNow;
    // Com o véu fechado a cena troca: lá em cima, olhando o céu, as silhuetas e a flor não aparecem.
    uVeil.value = s.veil;
    veil.visible = s.veil > 0.001;
    world.setSilhouettes(!s.skyView);
    world.setGround(!s.skyView);
    group.visible = !s.skyView;

    // A flor do nome: a cena escurece em volta, os textos em etapas, e um pulso quando o nome vira número.
    nameFlower.update(s.nameStage);
    vignette.style.opacity = (s.nameFocus * 0.9).toFixed(3);
    if (lastName < 1.9 && s.nameStage >= 1.9) uFlowerPulse.value = 1;
    lastName = s.nameStage;
    uFlowerPulse.value = Math.max(0, uFlowerPulse.value - dt * 0.7);

    flashT = Math.max(0, flashT - dt * 2.5);
    const flicker = flashT > 0 ? flashT * (0.6 + 0.4 * Math.sin(flashT * 40)) : 0;
    uFlash.value = flicker;
    stage.flash.intensity = flicker * 15;
    uPulse.value = Math.max(0, uPulse.value - dt * 0.45);

    world.update(dt, elapsed);
    rainSound?.setIntensity(world.uRain.value);
    const orion = sky.orionDirection();
    camPath.apply(camera, s.cameraT, s.skyView, orion, s.nights, dt, s.nameFocus, elapsed);
    nights.update(dt, orion, s.nights, s.nights >= 1);
    if (s.nights >= 1 && !savedSeen) { savedSeen = true; writeSeen(count); }

    poem.update(s.poemLine);
    phrase.style.opacity = s.phraseOpacity.toFixed(3);
    const text = s.realLabel ? realLabel(sky.uCityBlend.value) : eorzeaText;
    if (label.textContent !== text) label.textContent = text;
    label.style.opacity = (s.labelOpacity * 0.55).toFixed(3);

    stepper.update(p, nav.target(-1, p) >= 0, p < STEPS[STEPS.length - 1]!.p - 1e-4);
    stage.render(rawDt);
    if (++frames === 3) window.__quarrymill!.ready = true;
  });

  entry.ready(() => {
    // Primeiro libera o scroll: se o som falhar logo abaixo, o site continua.
    document.documentElement.classList.add('entered');
    window.__quarrymill!.entered = true;
    stepper.show();
    audio = startAudio();
    rainSound = createRainSound(audio);
    music = createMusic(audio, `${import.meta.env.BASE_URL}audio/neath-dark-waters.mp3`);
    music.start();
  });
  await entry.entered;
}
