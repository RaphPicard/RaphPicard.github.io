// ===== SHOWROOM 3D (page Projets) =====
//
// Inspiré de la mécanique de ciaoenergy.com, recodé de zéro avec le contenu du portfolio :
//   1. Une scène Three.js en arrière-plan fixe (canvas plein écran).
//   2. Un objet `data` qui décrit TOUT l'état visuel (caméra, espacement, focus, spirale, opacités de l'UI…).
//   3. Une timeline GSAP en pause, qui anime `data` d'une étape à l'autre.
//   4. À chaque image : la position du scroll fixe la progression de la timeline (« scrub »),
//      puis la boucle de rendu lit `data` et place chaque panneau.
// Résultat : scroller = avancer dans une animation 3D, sans jamais la jouer « toute seule ».
//
// Les projets sont lus directement dans les cartes .project-card de la grille en dessous :
// ajouter un projet dans la grille l'ajoute aussi en 3D (il suffit d'une texture assets/showroom/<NomImage>.webp).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import Lenis from 'lenis';

// #region Helpers ------------------------------------------------------------

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
// wrap : ramène v dans [min, max[ — c'est ce qui rend le carrousel infini
const wrap = (v, min, max) => { const s = max - min; return ((((v - min) % s) + s) % s) + min; };
// damp : lissage indépendant du framerate (même rendu à 60 ou 144 Hz)
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const mod = (n, m) => ((n % m) + m) % m;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const lang = () => { try { return localStorage.getItem('lang') || 'en'; } catch (e) { return 'en'; } };
// Écrit un texte bilingue compatible avec js/lang.js (data-en / data-fr) : le bouton FR/EN le retraduira tout seul
const setBi = (el, en, fr) => {
  if (!el) return;
  el.dataset.en = en; el.dataset.fr = fr ?? en;
  el.innerHTML = lang() === 'fr' ? el.dataset.fr : el.dataset.en;
};
const escapeHTML = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// #endregion
// #region Garde-fous ---------------------------------------------------------

const root = document.documentElement;
const stageEl = $('.sr-stage');
const showroomEl = $('#showroom');

const fail = (why) => {
  console.warn('[showroom] désactivé :', why);
  root.classList.remove('sr-on');
  root.classList.add('sr-off');
};

if (!stageEl || !showroomEl || !window.gsap) {
  fail(!window.gsap ? 'GSAP absent' : 'markup absent');
  throw new Error('showroom disabled');
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const lowPower = isIOS || window.innerWidth < 1024; // mobile : pas de bloom, matériaux plus légers

// #endregion
// #region Projets (lus dans la grille existante) -------------------------------

// Couleur d'ambiance de chaque projet (clé = nom du fichier image, sans extension)
const COLORS = {
  DataMining: '#7C6CF2', CpeFighter: '#F0533A', AIAgents: '#19C3E6', Minecraft: '#45C46A', MVC: '#3D7EFF',
  Chess: '#D9B13B', SpaceInvaders: '#FF3D8B', WEB: '#FF9F1C', Plume: '#2EC4B6', SmartFridge: '#8FD8FF',
};

const projects = $$('#projects-page .project-card')
  .map((card) => {
    const img = $('.project-img', card);
    const file = img ? img.getAttribute('src').split('/').pop().replace(/\.\w+$/, '') : null;
    const name = $('.project-name', card);
    const desc = $('.project-desc', card);
    const link = $('.project-links a', card);
    return {
      file,
      icon: ($('.project-icon', card)?.textContent || '').trim(),
      nameEn: name?.dataset.en || name?.textContent.trim() || '',
      nameFr: name?.dataset.fr || name?.dataset.en || name?.textContent.trim() || '',
      descEn: desc?.dataset.en || desc?.textContent.trim() || '',
      descFr: desc?.dataset.fr || desc?.dataset.en || desc?.textContent.trim() || '',
      stack: $$('.project-tech span', card).map((s) => s.textContent.trim()),
      github: link ? link.href : null,
      color: COLORS[file] || '#ffffff',
    };
  })
  .filter((p) => p.file);

const N = projects.length;
if (N < 3) { fail('pas assez de projets'); throw new Error('showroom disabled'); }

// #endregion
// #region Renderer & scène ---------------------------------------------------

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  fail('WebGL indisponible'); throw e;
}
const canvas = renderer.domElement;
canvas.className = 'sr-canvas';
canvas.setAttribute('aria-hidden', 'true');
stageEl.prepend(canvas);

const pixelRatio = Math.min(window.devicePixelRatio, lowPower ? 1.75 : 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // fond transparent : le dégradé CSS teinté est derrière
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 200);

// Environnement de reflets généré en code (pas de fichier HDR à télécharger)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

// Lumières : une clé blanche + un contre-jour teinté de la couleur du projet
const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(2, 5, 6);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0xffffff, 40, 30, 1.6);
rimLight.position.set(0, 1.5, -4);
scene.add(rimLight);

// Couleurs de la 3D selon le thème du site (les couleurs de l'interface 2D sont dans css/showroom.css)
const THEMES = {
  light: {
    body: 0xdfe3ea, metalness: 0.55, roughness: 0.28, tintStrength: 0.4, // aluminium clair
    backFrom: '#FFFFFF', backTo: '#EEF1F6', backText: '#0D1117', backMuted: 'rgba(13,17,23,0.55)',
    floorBlending: THREE.NormalBlending, floorOpacity: 0.35, // un halo additif serait invisible sur fond clair
    bloom: 0, // le bloom ferait « brûler » le fond blanc
  },
  dark: {
    body: 0x1b1f29, metalness: 0.85, roughness: 0.3, tintStrength: 0.7,
    backFrom: '#0b0e16', backTo: '#141a28', backText: '#ffffff', backMuted: 'rgba(255,255,255,0.55)',
    floorBlending: THREE.AdditiveBlending, floorOpacity: 0.55,
    bloom: 0.22,
  },
};
const isDark = () => root.getAttribute('data-theme') === 'dark';
let theme = THEMES[isDark() ? 'dark' : 'light'];

// Teinte d'ambiance partagée par tous les matériaux métalliques 
// on multiplie la lumière indirecte par une couleur, injectée dans le shader standard de Three.js
const tint = { color: { value: new THREE.Color('#3D7EFF') }, strength: { value: theme.tintStrength } };
const applyTint = (material) => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.tintColor = tint.color;
    shader.uniforms.tintStrength = tint.strength;
    shader.fragmentShader = 'uniform vec3 tintColor;\nuniform float tintStrength;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
       vec3 srTint = mix(vec3(1.0), tintColor * 1.6, tintStrength);
       reflectedLight.indirectSpecular *= srTint;
       reflectedLight.indirectDiffuse *= srTint;`,
    );
  };
  material.customProgramCacheKey = () => 'sr-tint';
  return material;
};

// Physical (vernis, reflets fins) sur ordinateur, Standard (plus léger) sur mobile
const makeMaterial = (params) => {
  if (lowPower) {
    const { clearcoat, clearcoatRoughness, ...std } = params;
    return new THREE.MeshStandardMaterial(std);
  }
  return new THREE.MeshPhysicalMaterial(params);
};

// Post-traitement : léger bloom (halo lumineux) sur ordinateur uniquement
const composer = new EffectComposer(renderer);
composer.setPixelRatio(pixelRatio);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
let bloomPass = null;
if (!lowPower) {
  // seuil à 1 : seuls les reflets du métal brillent, jamais le blanc des captures d'écran
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.22, 0.4, 1.0);
  composer.addPass(bloomPass);
}
composer.addPass(new OutputPass());

// #endregion
// #region Textures -----------------------------------------------------------

const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const screenTextures = projects.map((p) => {
  const url = new URL(`../assets/showroom/${p.file}.webp`, import.meta.url).href;
  const t = texLoader.load(url, undefined, undefined, () => console.warn('[showroom] texture manquante', url));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAniso);
  return t;
});

// Dos des panneaux : texture dessinée dans un <canvas> (numéro + nom du projet)
// (redessinée à chaque changement de thème)
const drawBack = (c, p, i) => {
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1024, 640);
  grd.addColorStop(0, theme.backFrom); grd.addColorStop(1, theme.backTo);
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 640);
  g.fillStyle = p.color; g.globalAlpha = 0.9; g.fillRect(72, 72, 64, 6); g.globalAlpha = 1;
  g.fillStyle = theme.backMuted;
  g.font = '500 28px "JetBrains Mono", monospace';
  g.fillText('RAPHAËL PICARD · PROJECT', 72, 130);
  g.fillStyle = p.color;
  g.font = '600 220px Lora, Georgia, serif';
  g.fillText(String(i + 1).padStart(2, '0'), 64, 380);
  g.fillStyle = theme.backText;
  g.font = '600 46px Sora, Arial, sans-serif';
  const title = p.nameEn.split(' — ')[0];
  g.fillText(title.length > 34 ? title.slice(0, 33) + '…' : title, 72, 500);
  g.fillStyle = theme.backMuted;
  g.font = '400 28px "JetBrains Mono", monospace';
  g.fillText(p.stack.slice(0, 4).join('  ·  '), 72, 560);
};
const makeBackTexture = (p, i) => {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 640;
  drawBack(c, p, i);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// Halo au sol sous le panneau central (dégradé radial dessiné en canvas, mélange additif)
const floorTexture = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();

// #endregion
// #region Panneaux -----------------------------------------------------------

const PANEL_W = 3.2;
const PANEL_H = 2.0; // ratio 16:10, comme les textures

// Rectangle à coins arrondis avec des UV normalisés 0→1 (pour que l'image remplisse l'écran)
const roundedPlane = (w, h, r) => {
  const x = -w / 2, y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ShapeGeometry(s, 6);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  return geo;
};

const bodyGeo = new RoundedBoxGeometry(PANEL_W + 0.16, PANEL_H + 0.16, 0.12, 4, 0.1);
const screenGeo = roundedPlane(PANEL_W, PANEL_H, 0.07);
const backTextures = projects.map(makeBackTexture);

// Assez de panneaux pour que la boucle infinie ne « saute » jamais à l'écran 
const TOTAL = N * Math.max(2, Math.ceil(20 / N));
const panels = [];
const pickables = [];
const bodyMats = [];
const screenMats = [];

for (let i = 0; i < TOTAL; i++) {
  const pi = i % N;
  const group = new THREE.Group();

  const bodyMat = applyTint(makeMaterial({
    color: theme.body, metalness: theme.metalness, roughness: theme.roughness, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 1.3,
  }));
  bodyMats.push(bodyMat);
  // L'écran est une vitre vernie noire qui émet la capture, comme un vrai écran : les lumières n'éclairent
  // pas l'image (sinon les captures très blanches sont « brûlées »), elles ne font que glisser un reflet dessus
  const screenMat = makeMaterial({
    color: 0x000000, emissive: 0xffffff, emissiveMap: screenTextures[pi], emissiveIntensity: 1,
    roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.35,
  });
  screenMats.push(screenMat);
  const backMat = new THREE.MeshBasicMaterial({ map: backTextures[pi] });

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = 0.061;
  const back = new THREE.Mesh(screenGeo, backMat);
  back.position.z = -0.061; back.rotation.y = Math.PI;

  group.add(body, screen, back);
  group.userData = { slot: i, project: pi, mats: [bodyMat, screenMat, backMat] };
  body.userData.slot = screen.userData.slot = back.userData.slot = i;
  pickables.push(body, screen, back);
  scene.add(group);
  panels.push(group);
}

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(9, 4),
  new THREE.MeshBasicMaterial({ map: floorTexture, transparent: true, blending: theme.floorBlending, depthWrite: false, opacity: 0.6 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -PANEL_H / 2 - 0.45;
scene.add(floor);

// Bascule clair / sombre en direct quand on clique sur le bouton du site (js/theme.js change data-theme)
const applyTheme = () => {
  theme = THEMES[isDark() ? 'dark' : 'light'];
  tint.strength.value = theme.tintStrength;
  bodyMats.forEach((m) => { m.color.set(theme.body); m.metalness = theme.metalness; m.roughness = theme.roughness; });
  backTextures.forEach((t, i) => { drawBack(t.image, projects[i], i); t.needsUpdate = true; });
  floor.material.blending = theme.floorBlending;
  floor.material.needsUpdate = true;
};
new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

// Opacité d'un panneau (pour isoler le projet sélectionné à l'étape « focus »)
const setOpacity = (group, o) => {
  group.visible = o > 0.01;
  group.userData.mats.forEach((m) => {
    m.opacity = o;
    m.transparent = o < 0.995;
    m.depthWrite = o > 0.5;
  });
};

// #endregion
// #region Carrousel ----------------------------------------------------------

// Position en « slots » : 0 = premier projet centré, 1 = deuxième… (valeur flottante pendant les transitions)
const carousel = { pos: 0, target: 0, index: 0, lastIndex: -1, dragging: false, velocity: 0 };

carousel.goTo = (pi) => {
  // chemin le plus court dans la boucle (de 10 à 1 on avance d'un cran au lieu de reculer de 9)
  const cur = Math.round(carousel.target);
  let delta = mod(pi - cur, N);
  if (delta > N / 2) delta -= N;
  carousel.target = cur + delta;
};
carousel.next = () => { carousel.target = Math.round(carousel.target) + 1; };
carousel.prev = () => { carousel.target = Math.round(carousel.target) - 1; };

// #endregion
// #region Scroll (Lenis + étapes) --------------------------------------------

// Lenis lisse la molette : c'est ce lissage qui rend le « scrub » de la timeline si fluide
const lenis = reducedMotion ? null : new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false });
if (lenis) root.classList.add('lenis');

const scroller = {
  y: () => (lenis ? lenis.animatedScroll : window.scrollY),
  to: (y, duration = 1.2) => {
    if (lenis) lenis.scrollTo(y, { duration, lock: true, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
  },
};

// 3 étapes plein écran + le haut de la grille : [carrousel, focus, spirale, grille]
const stepEls = $$('.sr-step', showroomEl);
const gridEl = $('#projects-page');
let tops = [];
const measure = () => {
  tops = [...stepEls.map((el) => el.offsetTop), gridEl.offsetTop];
};
measure();
const LAST = tops.length - 1; // = 3

// Progression continue 0 → 3 à partir de la position de scroll
const progressFromY = (y) => {
  if (y <= tops[0]) return 0;
  for (let k = 0; k < LAST; k++) {
    if (y < tops[k + 1]) return k + (y - tops[k]) / (tops[k + 1] - tops[k]);
  }
  return LAST;
};
const nearestStep = (y) => tops.reduce((best, t, k) => (Math.abs(t - y) < Math.abs(tops[best] - y) ? k : best), 0);
const inShowroom = (y = scroller.y()) => y < tops[LAST] - 2;

// Pagination à la molette  : un cran = une étape, verrouillé pendant l'animation
//
// Trackpad : un geste = UNE action (une étape à la verticale, un projet à l'horizontale). Après un déclenchement,
// on ignore la suite du geste et son inertie, jusqu'à :
//   - une pause : plus aucun événement wheel pendant `pause` ms ;
//   - ou une vraie relance : le mouvement a nettement ralenti (au moins 6 deltas décroissants d'affilée, sous la
//     moitié du pic : c'est la signature de l'inertie) puis repart fort.
// Comparer un delta au précédent ne suffit pas : sur les trackpads Windows, les deltas d'un même geste oscillent
// du simple au triple, et chaque oscillation relançait un projet (jusqu'à 6 d'un coup sur un long swipe).
const gesture = (pause) => ({ pause, armed: true, last: 0, time: 0, peak: 0, low: Infinity, run: 0, decayed: false, firedAt: 0, accum: 0 });
const gestureArmed = (g, mag, now) => {
  if (now - g.time > g.pause) { g.armed = true; g.accum = 0; }
  else if (!g.armed && g.decayed && now - g.firedAt > 250 && mag > 12 && mag > g.low * 2.5) { g.armed = true; g.accum = 0; }
  g.run = mag <= g.last + 1 ? g.run + 1 : 0; // +1 : tolère les arrondis de l'inertie macOS
  g.peak = Math.max(g.peak, mag);
  if (g.run >= 6 && mag < g.peak * 0.5) g.decayed = true;
  if (g.decayed) g.low = Math.min(g.low, mag);
  g.last = mag; g.time = now;
  return g.armed;
};
const disarm = (g) => {
  Object.assign(g, { armed: false, peak: g.last, low: Infinity, run: 0, decayed: false, firedAt: performance.now(), accum: 0 });
};

const pager = { locked: false, timer: null, h: gesture(180), v: gesture(150) };
const goStep = (k, duration = k === LAST || k === 0 ? 1.4 : 1.15) => {
  k = clamp(k, 0, LAST);
  pager.locked = true; disarm(pager.v);
  scroller.to(tops[k], duration);
  clearTimeout(pager.timer);
  pager.timer = setTimeout(() => (pager.locked = false), duration * 1000 + 80);
};

window.addEventListener('wheel', (e) => {
  const y = scroller.y();
  if (!ready) { if (inShowroom(y)) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
  // Description qui défile (très petit écran) : la molette la fait défiler tant qu'elle n'est pas en butée
  const desc = e.target.closest?.('.is-scrolling .sr-focus-desc');
  if (desc && (e.deltaY > 0 ? desc.scrollTop + desc.clientHeight < desc.scrollHeight - 1 : desc.scrollTop > 0)) return;
  const step = nearestStep(y);
  const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2;

  // Glissement horizontal au trackpad = changer de projet (carrousel ou spirale)
  if (horizontal && inShowroom(y)) {
    e.preventDefault(); e.stopImmediatePropagation();
    // Un swipe = un seul projet (voir gestureArmed)
    const g = pager.h;
    if (!gestureArmed(g, Math.abs(e.deltaX), performance.now())) return;
    g.accum += e.deltaX;
    if (Math.abs(g.accum) > 30) { g.accum > 0 ? carousel.next() : carousel.prev(); disarm(g); }
    return;
  }
  // Molette verticale dans le showroom (ou en remontant tout en haut de la grille) = étape suivante / précédente
  const atGridTop = y <= tops[LAST] + 4 && e.deltaY < 0;
  if (!inShowroom(y) && !atGridTop) return;
  e.preventDefault(); e.stopImmediatePropagation();
  // Un geste = une étape : l'inertie du trackpad qui continue après l'animation ne doit pas relancer d'étape
  const mag = Math.abs(e.deltaY);
  const armed = gestureArmed(pager.v, mag, performance.now());
  if (pager.locked || !armed || mag < 4) return;
  goStep(step + (e.deltaY > 0 ? 1 : -1));
}, { passive: false, capture: true });

// Tactile : dans le showroom on bloque le scroll natif (son élan sautait le focus et se battait avec le recalage)
// et un swipe vertical = une étape, comme la molette
const touch = { x0: 0, y0: 0, captured: false };
window.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touch.x0 = t.clientX; touch.y0 = t.clientY; touch.captured = false;
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) return; // pinch-zoom
  const y = scroller.y();
  if (!ready) { if (inShowroom(y)) e.preventDefault(); return; }
  const dy = touch.y0 - e.touches[0].clientY; // > 0 : le contenu monte (on descend dans la page)
  const desc = e.target.closest?.('.is-scrolling .sr-focus-desc');
  if (desc && !touch.captured && (dy > 0 ? desc.scrollTop + desc.clientHeight < desc.scrollHeight - 1 : desc.scrollTop > 0)) return;
  const atGridTop = y <= tops[LAST] + 4 && dy < 0;
  if (!inShowroom(y) && !atGridTop) return;
  e.preventDefault();
  touch.captured = true;
}, { passive: false });
window.addEventListener('touchend', (e) => {
  if (!touch.captured) return;
  touch.captured = false;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x0, dy = touch.y0 - t.clientY;
  if (pager.locked || carousel.dragging || Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx)) return;
  goStep(nearestStep(scroller.y()) + (dy > 0 ? 1 : -1));
}, { passive: true });

// Sur mobile (scroll tactile natif) : on se recale sur l'étape la plus proche quand le scroll s'arrête
let settleTimer = null;
const onScrollSettled = () => {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    const y = scroller.y();
    if (!pager.locked && !carousel.dragging && inShowroom(y) && Math.abs(tops[nearestStep(y)] - y) > 3) goStep(nearestStep(y));
  }, 140);
};
if (lenis) lenis.on('scroll', onScrollSettled); else window.addEventListener('scroll', onScrollSettled, { passive: true });

// #endregion
// #region Timeline pilotée par le scroll -------------------------------------

// `data` = état visuel complet. La timeline l'anime, la boucle de rendu le lit.
const data = {};
let timeline = null;

const keyframes = () => {
  const aspect = window.innerWidth / window.innerHeight;
  const mobile = window.innerWidth < 768;
  const zs = Math.max(1, 8.2 / aspect / 11); // recule la caméra sur écran étroit pour que le panneau tienne
  const focusCamZ = (mobile ? 9.2 : 9.4) * zs;
  // Mobile : on remonte le panneau focus pour que son bord haut colle à la navbar (+ 12 px),
  // ce qui libère de la place en bas pour la description
  let focusY = 0.05;
  if (mobile) {
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;
    const halfH = focusCamZ * Math.tan(THREE.MathUtils.degToRad(30 / 2)); // demi-hauteur visible au plan z = 0
    const panelHalf = (1.1 + 0.05) * (PANEL_H + 0.16) / 2; // échelle du panneau centré en focus
    focusY = halfH * (1 - 2 * (navH + 12) / window.innerHeight) - panelHalf;  // changer le 12 si on veut que le bord haut du panneau colle à la navbar
  }
  return [
    // 0 · Carrousel
    { camY: -0.6, camZ: 11 * zs, camRotZ: 0, fov: 30, spacing: 3.9, depth: 1.4, arc: 0.3, focus: 0,
      focusX: mobile ? 0 : -1.45, focusY, focusTurn: mobile ? 0 : 0.3, focusScale: mobile ? 0.05 : 0.08,
      swirl: 0, ribbonGap: 1.55, ribbonX: mobile ? 0 : 1.6, ribbonY: mobile ? 1.2 : 0.45, pointer: 1, exitY: 0, light: 1, floor: 1, bloom: 1,
      uiC: 1, uiF: 0, uiW: 0, stage: 1 },
    // 1 · Focus sur le projet courant
    { camY: 0, camZ: focusCamZ, camRotZ: 0, fov: 30, focus: 1, floor: 0.35, pointer: 0.8 },
    // 2 · Spirale de tous les projets
    { camY: -0.3, camZ: (mobile ? 11 : 13.5) * zs, camRotZ: -0.08, fov: 32, focus: 0, swirl: 1, pointer: 0.3, floor: 0.45 },
    // 3 · Sortie : les panneaux s'envolent, la grille classique apparaît
    { camY: 0.6, exitY: 10, light: 0.4, floor: 0, bloom: 0.4 },
  ];
};

const buildTimeline = () => {
  const progress = timeline ? timeline.progress() : 0;
  if (timeline) timeline.kill();
  const K = keyframes();
  Object.assign(data, K[0]);
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut', duration: 1 } });
  tl.to(data, { ...K[1] }, 0);
  tl.to(data, { ...K[2] }, 1);
  tl.to(data, { ...K[3] }, 2);
  // Fondus de l'interface : plus courts que les mouvements 3D, pour ne jamais superposer deux textes
  tl.to(data, { uiC: 0, duration: 0.3, ease: 'power1.out' }, 0);
  tl.to(data, { uiF: 1, duration: 0.35, ease: 'power1.in' }, 0.62);
  tl.to(data, { uiF: 0, duration: 0.3, ease: 'power1.out' }, 1);
  tl.to(data, { uiW: 1, duration: 0.35, ease: 'power1.in' }, 1.62);
  tl.to(data, { uiW: 0, duration: 0.25, ease: 'power1.out' }, 2);
  tl.to(data, { stage: 0, duration: 0.3, ease: 'power1.in' }, 2.7);
  tl.progress(progress);
  timeline = tl;
};
buildTimeline();

// Animation d'intro (après chargement) : décalages ajoutés par-dessus `data`, puis ramenés à zéro
const intro = { z: reducedMotion ? 0 : 14, spread: reducedMotion ? 0 : 1.6, light: reducedMotion ? 0 : -1 };

// #endregion
// #region Interface (DOM) ----------------------------------------------------

const ui = {
  carousel: $('.sr-ui--carousel'), focus: $('.sr-ui--focus'), wall: $('.sr-ui--wall'),
  title: $('.sr-title'), counter: $('.sr-counter'), chips: $('.sr-chips'), dots: $('.sr-dots'),
  fIndex: $('.sr-focus-index'), fTitle: $('.sr-focus-title'), fDesc: $('.sr-focus-desc'), fChips: $('.sr-focus-chips'), fGithub: $('.sr-github'),
  wallCount: $('.sr-wall-count'), live: $('.sr-live'),
  loader: $('.sr-loader'), loaderPct: $('.sr-loader-pct'), loaderBar: $('.sr-loader-bar span'),
};

// Points de pagination
projects.forEach((p, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'sr-dot';
  b.setAttribute('aria-label', `${i + 1} / ${N}`);
  b.addEventListener('click', () => carousel.goTo(i));
  ui.dots.appendChild(b);
});
const dots = $$('.sr-dot', ui.dots);
// « N projets » compte toutes les cartes de la grille, même celles sans image (absentes de la 3D)
if (ui.wallCount) ui.wallCount.textContent = $$('#projects-page .project-card').length;

const chipsHTML = (stack, max) => stack.slice(0, max).map((s) => `<span>${escapeHTML(s)}</span>`).join('');

const updateProjectUI = (i, animate = true) => {
  const p = projects[i];
  const num = String(i + 1).padStart(2, '0');
  // couleur d'ambiance (variable CSS animée via @property dans showroom.css)
  stageEl.style.setProperty('--sr-tint', p.color);
  tint.target = new THREE.Color(p.color);

  ui.counter.textContent = `${num} / ${String(N).padStart(2, '0')}`;
  setBi(ui.title, escapeHTML(p.nameEn), escapeHTML(p.nameFr));
  ui.chips.innerHTML = chipsHTML(p.stack, 4);
  dots.forEach((d, k) => d.classList.toggle('is-active', k === i));

  ui.fIndex.textContent = `${p.icon}  ${num} / ${String(N).padStart(2, '0')}`;
  setBi(ui.fTitle, escapeHTML(p.nameEn), escapeHTML(p.nameFr));
  setBi(ui.fDesc, escapeHTML(p.descEn), escapeHTML(p.descFr));
  ui.fChips.innerHTML = chipsHTML(p.stack, 8);
  if (p.github) { ui.fGithub.href = p.github; ui.fGithub.hidden = false; } else ui.fGithub.hidden = true;
  if (ui.live) ui.live.textContent = lang() === 'fr' ? p.nameFr : p.nameEn;

  if (animate && !reducedMotion) {
    gsap.fromTo([ui.title, ui.chips, ui.fTitle, ui.fDesc, ui.fChips], { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.04, overwrite: true });
  }
};

// Boutons
$$('[data-sr="prev"]').forEach((b) => b.addEventListener('click', () => carousel.prev()));
$$('[data-sr="next"]').forEach((b) => b.addEventListener('click', () => carousel.next()));
$$('[data-sr="focus"]').forEach((b) => b.addEventListener('click', () => goStep(1)));
$$('[data-sr="skip"]').forEach((b) => b.addEventListener('click', () => goStep(LAST)));

window.addEventListener('keydown', (e) => {
  if (!interactive || !inShowroom() || /input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
  if (e.key === 'ArrowRight') carousel.next();
  if (e.key === 'ArrowLeft') carousel.prev();
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); if (!pager.locked) goStep(nearestStep(scroller.y()) + 1); }
  if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); if (!pager.locked) goStep(nearestStep(scroller.y()) - 1); }
});

const showLayer = (el, v) => {
  if (!el) return;
  el.style.opacity = v.toFixed(3);
  el.style.visibility = v < 0.02 ? 'hidden' : 'visible';
  el.style.pointerEvents = v > 0.6 ? '' : 'none';
};

// La fiche projet doit toujours tenir en entier à l'écran (texte long, langue changée, petite fenêtre) :
// on réduit le texte par petits pas via --sr-fit, et en dernier recours la description devient défilante.
const focusCard = $('.sr-focus-card');
const fitFocusCard = () => {
  if (!focusCard || !ui.focus) return;
  const cs = getComputedStyle(ui.focus);
  const maxShare = parseFloat(getComputedStyle(focusCard).getPropertyValue('--sr-card-max')) || 1;
  const avail = (ui.focus.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * maxShare;
  focusCard.classList.remove('is-scrolling');
  let fit = 1;
  focusCard.style.setProperty('--sr-fit', fit);
  while (focusCard.scrollHeight > avail && fit > 0.72) {
    fit = Math.round((fit - 0.04) * 100) / 100;
    focusCard.style.setProperty('--sr-fit', fit);
  }
  focusCard.classList.toggle('is-scrolling', focusCard.scrollHeight > avail);
  if (ui.fDesc) ui.fDesc.scrollTop = 0;
};
// le contenu change à chaque projet (updateProjectUI) et au changement de langue (js/lang.js réécrit le texte)
if (focusCard) new MutationObserver(fitFocusCard).observe(focusCard, { childList: true, subtree: true, characterData: true });
document.fonts?.ready.then(fitFocusCard); // les polices web changent la hauteur du texte une fois chargées
fitFocusCard();

// #endregion
// #region Souris, glisser, clic ----------------------------------------------

const pointer = { x: 0, y: 0, sx: 0, sy: 0 }; // -1 → 1, lissé dans la boucle
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pickSlot = (clientX, clientY) => {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(pickables.filter((m) => m.parent.visible), false)[0];
  return hit ? hit.object.userData.slot : null;
};
const slotOffset = (slot) => wrap(slot - carousel.pos, -TOTAL / 2, TOTAL / 2);

window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

const drag = { active: false, startX: 0, startY: 0, lastX: 0, lastT: 0, moved: false, axis: 0, startSlot: 0 };
const pxPerSlot = () => Math.max(220, window.innerWidth * 0.3);

canvas.addEventListener('pointerdown', (e) => {
  if (!interactive || nearestStep(scroller.y()) === LAST) return;
  drag.active = true; drag.moved = false; drag.axis = 0;
  drag.startX = drag.lastX = e.clientX; drag.startY = e.clientY; drag.lastT = performance.now();
  carousel.velocity = 0;
  drag.startSlot = Math.round(carousel.target);
});
window.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  const dx = e.clientX - drag.lastX;
  if (drag.axis === 0 && (Math.abs(e.clientX - drag.startX) > 6 || Math.abs(e.clientY - drag.startY) > 6)) {
    drag.axis = Math.abs(e.clientX - drag.startX) > Math.abs(e.clientY - drag.startY) ? 1 : 2; // 1 = horizontal
    drag.moved = true;
    if (drag.axis === 1) { carousel.dragging = true; lenis?.stop(); stageEl.classList.add('is-grabbing'); }
  }
  if (drag.axis !== 1) return;
  const now = performance.now();
  const ds = -dx / pxPerSlot();
  // le doigt ne peut pas entraîner le carrousel au-delà du projet voisin
  carousel.pos = clamp(carousel.pos + ds, drag.startSlot - 1, drag.startSlot + 1); carousel.target = carousel.pos;
  carousel.velocity = ds / Math.max(1, now - drag.lastT) * 16; // slots par image
  drag.lastX = e.clientX; drag.lastT = now;
});
const endDrag = (e) => {
  if (!drag.active) return;
  drag.active = false;
  if (carousel.dragging) {
    // un glissement = un projet max : un geste vif ou assez long passe au voisin, sinon on revient
    const moved = carousel.pos - drag.startSlot;
    const dir = Math.abs(carousel.velocity) > 0.02 ? Math.sign(carousel.velocity) : Math.abs(moved) > 0.3 ? Math.sign(moved) : 0;
    carousel.target = drag.startSlot + dir;
    carousel.dragging = false;
    lenis?.start();
    stageEl.classList.remove('is-grabbing');
    return;
  }
  if (drag.moved || !e) return;
  // simple clic : panneau central → étape « focus », panneau latéral → on le centre,
  // panneau de la spirale (étape 2) → on le centre ET on remonte au focus sur lui
  const slot = pickSlot(e.clientX, e.clientY);
  if (slot === null) return;
  const off = Math.round(slotOffset(slot));
  const step = nearestStep(scroller.y());
  if (step === 2) { carousel.target = Math.round(carousel.target) + off; goStep(1, 3); } // 3 s : plus posé qu'un cran de molette
  else if (off === 0) { if (step === 0) goStep(1); }
  else carousel.target = Math.round(carousel.target) + off;
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', () => endDrag(null));

// Curseur : main ouverte sur la scène, doigt sur ce qui ouvre le focus
// (panneau central du carrousel, ou n'importe quel panneau de la spirale)
let hoverQueued = false;
canvas.addEventListener('pointermove', (e) => {
  if (hoverQueued || carousel.dragging || e.pointerType !== 'mouse') return;
  hoverQueued = true;
  requestAnimationFrame(() => {
    hoverQueued = false;
    const slot = interactive ? pickSlot(e.clientX, e.clientY) : null;
    const step = nearestStep(scroller.y());
    const clickable = slot !== null && (step === 2 || (step === 0 && Math.round(slotOffset(slot)) === 0));
    stageEl.classList.toggle('is-pointing', clickable);
  });
});
// #endregion
// #region Chargement & intro -------------------------------------------------

let ready = false;       // scroll autorisé
let interactive = false; // glisser / clic / clavier autorisés
let started = false;
// Si la page s'ouvre directement sur la grille (retour arrière, rechargement), pas d'intro ni de blocage
const openedInShowroom = inShowroom(window.scrollY);
if (openedInShowroom) lenis?.stop();
else { intro.z = 0; intro.spread = 0; intro.light = 0; }

const start = () => {
  if (started) return;
  started = true;
  updateProjectUI(0, false);
  root.classList.add('sr-ready');
  gsap.to(ui.loader, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' });
  // Filets de sécurité en temps réel : sur un appareil très lent, GSAP ralentit volontairement son horloge
  // (lagSmoothing) ; l'interface ne doit jamais rester bloquée derrière l'écran de chargement.
  setTimeout(() => { ui.loader.style.visibility = 'hidden'; }, 900);
  interactive = true; // glisser / cliquer / flèches : tout de suite
  const enable = () => { if (ready) return; ready = true; lenis?.start(); }; // molette / scroll : après l'intro
  if (reducedMotion || !openedInShowroom) { enable(); return; }
  setTimeout(() => { // l'intro est décorative : si elle n'a pas fini à temps, on la termine net
    gsap.killTweensOf(intro); intro.z = 0; intro.spread = 0; intro.light = 0; enable();
  }, 3200);
  gsap.timeline({ onComplete: enable })
    .to(intro, { light: 0, duration: 1.2, ease: 'power2.out' }, 0)
    .to(intro, { z: 0, spread: 0, duration: 2.4, ease: 'power4.out' }, 0.15)
    .fromTo([ui.carousel], { y: 24 }, { y: 0, duration: 1.2, ease: 'power3.out' }, 1.1);
};

manager.onProgress = (url, loaded, total) => {
  const pct = Math.round((loaded / total) * 100);
  if (ui.loaderPct) ui.loaderPct.textContent = pct + ' %';
  if (ui.loaderBar) ui.loaderBar.style.transform = `scaleX(${pct / 100})`;
};
manager.onLoad = start;
manager.onError = () => {}; // une texture manquante ne bloque pas le showroom
setTimeout(start, 12000); // filet de sécurité : on démarre même si un fichier traîne

// #endregion
// #region Boucle de rendu ----------------------------------------------------

let last = performance.now();
let time = 0;
let contextLost = false;
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); contextLost = true; });
canvas.addEventListener('webglcontextrestored', () => { contextLost = false; });

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;
  lenis?.raf(now);

  // 1. Scroll → progression de la timeline → `data`
  const y = scroller.y();
  timeline.progress(progressFromY(y) / LAST);

  // 2. Interface 2D
  showLayer(ui.carousel, data.uiC);
  showLayer(ui.focus, data.uiF);
  showLayer(ui.wall, data.uiW);
  const stageVisible = data.stage > 0.005;
  stageEl.style.opacity = data.stage.toFixed(3);
  stageEl.style.visibility = stageVisible ? 'visible' : 'hidden';
  root.classList.toggle('sr-stage-visible', data.stage > 0.5);
  if (!stageVisible || contextLost || document.hidden) return; // rien à dessiner : on économise la batterie

  // 3. Carrousel : lissage vers la cible (sauf pendant le glisser, où le doigt pilote directement)
  if (!carousel.dragging) carousel.pos = damp(carousel.pos, carousel.target, 7, dt);
  carousel.index = mod(Math.round(carousel.pos), N);
  if (carousel.index !== carousel.lastIndex) {
    updateProjectUI(carousel.index, carousel.lastIndex !== -1);
    carousel.lastIndex = carousel.index;
  }

  // 4. Souris lissée + teinte qui glisse vers la couleur du projet
  pointer.sx = damp(pointer.sx, pointer.x, 5, dt);
  pointer.sy = damp(pointer.sy, pointer.y, 5, dt);
  if (tint.target) tint.color.value.lerp(tint.target, 1 - Math.exp(-4 * dt));
  rimLight.color.copy(tint.color.value);
  floor.material.color.copy(tint.color.value);

  // 5. Placement de chaque panneau : mélange de 3 dispositions (carrousel / focus / spirale)
  const D = data;
  for (const group of panels) {
    const i = group.userData.slot;
    const x = wrap(i - carousel.pos, -TOTAL / 2, TOTAL / 2); // décalage par rapport au centre, en slots
    const ax = Math.abs(x);
    const p = clamp(1 - ax, 0, 1); // 1 = panneau centré

    // a) carrousel en arc
    let px = x * D.spacing * (1 + intro.spread);
    let py = Math.sin(time * 0.9 + i * 1.7) * 0.06;
    let pz = -Math.pow(ax, 1.15) * D.depth - intro.spread * ax * 2;
    let rx = 0, ry = -x * D.arc, rz = 0;
    let s = 1 + 0.1 * p;

    // b) spirale : panneaux serrés en ruban diagonal, tournés de profil
    const sw = D.swirl;
    px = lerp(px, x * D.ribbonGap + D.ribbonX, sw);
    py = lerp(py, x * 0.36 + D.ribbonY, sw);
    pz = lerp(pz, -ax * 0.12, sw);
    rx = lerp(rx, 0.12 + x * 0.05, sw);
    ry = lerp(ry, -1.0 + x * 0.035, sw);
    rz = lerp(rz, 0.16, sw);

    // c) focus : le panneau central vient sur le côté, les autres reculent et s'effacent
    const f = D.focus;
    px = lerp(px, D.focusX, f * p);
    py = lerp(py, D.focusY, f * p);
    pz -= (1 - p) * 6 * f;
    ry += f * p * D.focusTurn;
    s += f * p * D.focusScale;

    // d) la souris incline le panneau central, e) sortie vers le haut
    ry += pointer.sx * 0.32 * p * D.pointer;
    rx += pointer.sy * 0.2 * p * D.pointer;
    py += D.exitY * (1 + (i % 3) * 0.18);

    group.position.set(px, py, pz);
    group.rotation.set(rx, ry, rz);
    group.scale.setScalar(s);
    setOpacity(group, lerp(1, 0, f * (1 - p)));
  }

  // 6. Caméra, lumières, halo
  camera.position.set(pointer.sx * 0.35 * D.pointer, D.camY - pointer.sy * 0.15 * D.pointer, D.camZ + intro.z);
  camera.rotation.set(0, 0, D.camRotZ);
  if (camera.fov !== D.fov) { camera.fov = D.fov; camera.updateProjectionMatrix(); }
  const light = clamp(D.light + intro.light, 0, 1);
  keyLight.intensity = 1.6 * light;
  rimLight.intensity = 40 * light;
  const screenLevel = 0.25 + 0.75 * light; // les écrans « s'allument » avec la scène pendant l'intro
  screenMats.forEach((m) => { m.emissiveIntensity = screenLevel; });
  floor.material.opacity = theme.floorOpacity * D.floor * light;
  floor.position.x = lerp(0, D.focusX, D.focus);
  if (bloomPass) bloomPass.strength = theme.bloom * D.bloom;

  composer.render();
}
requestAnimationFrame(frame);

// #endregion
// #region Redimensionnement --------------------------------------------------

let lastW = window.innerWidth;
const onResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  measure();
  fitFocusCard();
  // les barres d'adresse mobiles changent la hauteur en permanence : on ne reconstruit que si la largeur change
  if (window.innerWidth !== lastW) { lastW = window.innerWidth; buildTimeline(); }
};
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(onResize, 120); });
// la grille charge ses images en lazy-load : sa position peut bouger, on remesure régulièrement
new ResizeObserver(() => measure()).observe(document.body);

// #endregion
