import * as THREE from "three";

import { BRAND, loadArtwork } from "./brand.js";

/**
 * As quatro peças do merch da Playbar, construídas em código.
 *
 * Cada modelo é um Group com o corpo e uma "casca de estampa": uma segunda
 * superfície com o mesmo perfil, deslocada uma fração para fora, que carrega
 * a arte. Como ela nasce do mesmo perfil, acompanha a curvatura da peça sem
 * deformar o print.
 */

/* =========================================================
   Helpers de perfil (revolução em torno de Y)
   ========================================================= */

const vec2 = (points) => points.map(([r, y]) => new THREE.Vector2(r, y));

/** Comprimentos acumulados ao longo do perfil. */
function cumulative(points) {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  return out;
}

/** Reamostra um trecho do perfil em `count` pontos igualmente espaçados. */
function resample(points, from, to, count) {
  const cum = cumulative(points);
  const total = cum.at(-1);
  const out = [];

  for (let k = 0; k < count; k++) {
    const target = (from + (to - from) * (k / (count - 1))) * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < target) i++;
    const span = cum[i] - cum[i - 1] || 1;
    out.push(points[i - 1].clone().lerp(points[i], (target - cum[i - 1]) / span));
  }

  return out;
}

/** Empurra cada ponto na direção da normal externa do perfil. */
function offsetOutward(points, amount) {
  return points.map((point, i) => {
    const prev = points[Math.max(i - 1, 0)];
    const next = points[Math.min(i + 1, points.length - 1)];
    const tangent = new THREE.Vector2().subVectors(next, prev).normalize();
    // Girar a tangente 90° no sentido horário aponta para fora da peça.
    return point.clone().addScaledVector(new THREE.Vector2(tangent.y, -tangent.x), amount);
  });
}

/** Em que fração do comprimento do perfil a altura `y` é alcançada. */
function fractionAtY(points, y) {
  const cum = cumulative(points);
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1].y, points[i].y];
    if ((y >= a && y <= b) || (y >= b && y <= a)) {
      const f = b === a ? 0 : (y - a) / (b - a);
      return (cum[i - 1] + (cum[i] - cum[i - 1]) * f) / cum.at(-1);
    }
  }
  return y <= points[0].y ? 0 : 1;
}

/* =========================================================
   Estampa
   ========================================================= */

const MAX_TEXTURE = 2048;

/**
 * Canvas com a proporção da área que ele vai cobrir na peça.
 *
 * Um canvas quadrado esticado sobre uma faixa larga e baixa deforma a arte.
 * Aqui o canvas nasce na proporção certa e `unit` diz à função de desenho
 * quantos pixels valem uma unidade de cena.
 */
function paint(draw, worldWidth, worldHeight) {
  const aspect = worldWidth / worldHeight;

  let width = MAX_TEXTURE;
  let height = Math.round(width / aspect);
  if (height > MAX_TEXTURE) {
    height = MAX_TEXTURE;
    width = Math.round(height * aspect);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), { unit: height / worldHeight, width, height });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Casca com a arte, colada na superfície entre duas alturas.
 *
 * `repeat` 2 imprime a arte em dois lados opostos — é o que faz a peça
 * continuar legível enquanto gira.
 */
function printBand(profile, draw, { yFrom, yTo, offset = 0.012, repeat = 2, segments = 128 }) {
  const band = offsetOutward(
    resample(profile, fractionAtY(profile, yFrom), fractionAtY(profile, yTo), 64),
    offset
  );

  const arc = cumulative(band).at(-1);
  const midRadius = band.reduce((sum, p) => sum + p.x, 0) / band.length;

  const texture = paint(draw, (2 * Math.PI * midRadius) / repeat, arc);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = repeat;
  // O perfil começa em phi = 0, que é justamente a frente da peça. Meio
  // ladrilho de deslocamento leva o centro da arte para lá.
  texture.offset.x = 0.5;

  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(band, segments),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.45,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  mesh.renderOrder = 3;
  return mesh;
}

/** Versão plana da estampa, para superfícies que não são de revolução. */
function printPlane(draw, width, height) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: paint(draw, width, height),
      transparent: true,
      roughness: 0.5,
      metalness: 0,
      depthWrite: false,
    })
  );
  mesh.renderOrder = 3;
  return mesh;
}

/* =========================================================
   Materiais
   ========================================================= */

const glass = (extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.96,
    transparent: true,
    roughness: 0.05,
    metalness: 0,
    thickness: 0.35,
    ior: 1.52,
    side: THREE.DoubleSide,
    ...extra,
  });

/** Plástico leitoso — o copo de palco e a sacola são desse material. */
const frosted = (color = 0xf3f2ef, extra = {}) =>
  new THREE.MeshPhysicalMaterial({
    color,
    transmission: 0.45,
    transparent: true,
    roughness: 0.62,
    metalness: 0,
    thickness: 0.6,
    ior: 1.46,
    side: THREE.DoubleSide,
    ...extra,
  });

/* =========================================================
   1 — Taça (casamentos e celebrações)
   ========================================================= */

const TACA_PROFILE = vec2([
  [0, 0], [1.15, 0], [1.22, 0.05], [1.16, 0.15], [0.72, 0.24],
  [0.17, 0.36], [0.16, 1.12],
  [0.36, 1.3], [0.98, 1.7], [1.44, 2.32], [1.62, 2.98], [1.58, 3.58],
  [1.43, 3.97], [1.39, 4.08],
]);

async function buildTaca() {
  const group = new THREE.Group();

  group.add(new THREE.Mesh(new THREE.LatheGeometry(TACA_PROFILE, 128), glass()));
  group.add(
    printBand(TACA_PROFILE, await loadArtwork("taca"), {
      yFrom: 2.25,
      yTo: 3.75,
      offset: 0.015,
    })
  );

  return group;
}

/* =========================================================
   2 — Copo de palco e camarote
   ========================================================= */

const COPO_PROFILE = vec2([
  [0, 0], [0.9, 0], [0.95, 0.07], [0.91, 0.14],
  [0.96, 0.5], [1.06, 1.4], [1.16, 2.3], [1.25, 3.0], [1.29, 3.16], [1.33, 3.24],
]);

async function buildCopo() {
  const group = new THREE.Group();

  group.add(new THREE.Mesh(new THREE.LatheGeometry(COPO_PROFILE, 96), frosted()));
  group.add(
    printBand(COPO_PROFILE, await loadArtwork("copo"), {
      yFrom: 0.75,
      yTo: 2.95,
      offset: 0.014,
    })
  );

  return group;
}

/* =========================================================
   3 — Sacola de festival
   ========================================================= */

/** Retângulo de cantos arredondados, como Shape (contorno) ou Path (buraco). */
function roundedRect(target, { width, height, radius, cx = 0, cy = 0 }) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);

  target.moveTo(cx - w + r, cy - h);
  target.lineTo(cx + w - r, cy - h);
  target.quadraticCurveTo(cx + w, cy - h, cx + w, cy - h + r);
  target.lineTo(cx + w, cy + h - r);
  target.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
  target.lineTo(cx - w + r, cy + h);
  target.quadraticCurveTo(cx - w, cy + h, cx - w, cy + h - r);
  target.lineTo(cx - w, cy - h + r);
  target.quadraticCurveTo(cx - w, cy - h, cx - w + r, cy - h);
  return target;
}

async function buildSacola() {
  const group = new THREE.Group();

  const shape = roundedRect(new THREE.Shape(), {
    width: 3.1,
    height: 3.4,
    radius: 0.22,
  });

  // Recorte da alça, no topo.
  shape.holes.push(
    roundedRect(new THREE.Path(), {
      width: 1.25,
      height: 0.42,
      radius: 0.2,
      cy: 1.25,
    })
  );

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 3,
      curveSegments: 20,
    }),
    frosted(0xf5f4f1, { roughness: 0.5, transmission: 0.3 })
  );
  body.geometry.center();
  body.geometry.computeBoundingBox();
  group.add(body);

  // Pegador escuro atravessando o recorte.
  const grip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 1.15, 6, 16),
    new THREE.MeshStandardMaterial({ color: 0x17171b, roughness: 0.35, metalness: 0.5 })
  );
  grip.rotation.z = Math.PI / 2;
  grip.position.y = 1.44;
  group.add(grip);

  const front = printPlane(await loadArtwork("sacola"), 2.3, 2.3);
  front.position.set(0, -0.25, body.geometry.boundingBox.max.z + 0.01);
  group.add(front);

  return group;
}

/* =========================================================
   4 — Copo corporativo (facetado)
   ========================================================= */

const CORP_PROFILE = vec2([
  [0, 0], [0.82, 0], [0.88, 0.07], [0.84, 0.16],
  [0.76, 0.45], [0.8, 1.05], [0.92, 1.75], [1.0, 2.2], [1.03, 2.34], [1.06, 2.42],
]);

async function buildCorporativo() {
  const group = new THREE.Group();

  // Poucos segmentos + flatShading: o copo ganha facetas em vez de curva.
  const FACETS = 18;

  group.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(CORP_PROFILE, FACETS),
      glass({
        color: 0x2b2b33,
        transmission: 0.88,
        roughness: 0.1,
        thickness: 0.5,
        flatShading: true,
      })
    )
  );

  // Aro rosa no topo, assinando a peça.
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.035, 12, FACETS * 3),
    new THREE.MeshStandardMaterial({
      color: BRAND.pink,
      emissive: BRAND.pink,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.2,
    })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 2.4;
  group.add(rim);

  group.add(
    printBand(CORP_PROFILE, await loadArtwork("corporativo"), {
      yFrom: 0.9,
      yTo: 2.1,
      offset: 0.016,
      segments: FACETS,
    })
  );

  return group;
}

/* =========================================================
   Registro — a ordem espelha os .hero-step do HTML
   ========================================================= */

/**
 * `sway: true` troca a volta completa por um vaivém.
 * Peça chata que gira 360° passa a maior parte do tempo de perfil, virando
 * uma lasca — a sacola precisa ficar de frente.
 */
export const MODELS = [
  { build: buildTaca, sway: false },
  { build: buildCopo, sway: false },
  { build: buildSacola, sway: true },
  { build: buildCorporativo, sway: false },
];
