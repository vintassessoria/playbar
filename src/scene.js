import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import { BRAND } from "./brand.js";
import { MODELS } from "./models.js";

/**
 * Ambiente de reflexo: um quarto escuro com três faixas acesas.
 *
 * O RoomEnvironment do three é um estúdio branco — refletido por inteiro,
 * o vidro fica leitoso e some no fundo preto. Aqui o que o vidro reflete é
 * quase tudo preto, com dois riscos de luz que desenham as arestas.
 */
function buildEnvironment() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x040407);

  const strip = (color, width, height, position, rotationY) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    env.add(mesh);
  };

  strip(0xffffff, 3, 12, [-9, 1, 2], Math.PI / 2); // faixa branca à esquerda
  strip(BRAND.pink, 4, 12, [9, 0, -2], Math.PI / 2); // faixa rosa à direita
  strip(0x8fa4ff, 8, 3, [0, 8, -6], 0); // estouro frio no alto, ao fundo

  return env;
}

/**
 * Cena WebGL do hero.
 *
 * Os quatro modelos vivem juntos na cena; só um fica visível por vez.
 * A troca é uma encolhida rápida do que sai e uma crescida do que entra —
 * sem cross-fade, o que evita brigar com a transparência dos vidros.
 */
export function createHeroScene(container, { onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  // Reflexos PBR sem precisar de arquivo HDR externo. Vidro sem environment
  // fica chapado, então isso não é enfeite.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(buildEnvironment(), 0.03).texture;

  /* ── Luz: duas barras de estúdio, uma branca e uma rosa ──
     São elas que desenham as arestas do vidro contra o fundo preto. */

  const keyLight = new THREE.RectAreaLight(0xffffff, 3.4, 2.2, 7);
  keyLight.position.set(-3.6, 1.6, 3.2);
  keyLight.lookAt(0, 0, 0);
  scene.add(keyLight);

  const pinkLight = new THREE.RectAreaLight(BRAND.pink, 5.5, 2.2, 7);
  pinkLight.position.set(3.8, 0.8, -1.6);
  pinkLight.lookAt(0, 0, 0);
  scene.add(pinkLight);

  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.35);
  fill.position.set(2, 4, 4);
  scene.add(fill);

  // Ambiente quase zero de propósito: o que não for atingido pelas barras
  // some no preto, e é isso que dá o contorno de luz na peça.
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));

  // Pivô do modelo: tudo que gira, gira aqui.
  const pivot = new THREE.Group();
  scene.add(pivot);

  const TARGET_SIZE = 2.3; // maior dimensão da peça, em unidades de cena
  const BASE_Y = -0.7; // desce a peça para abrir espaço para o título

  let disposed = false;
  let progress = 0; // 0..1, vindo do scroll
  let targetStep = 0;
  let shownStep = 0;
  let presence = 1; // 1 = peça montada, 0 = peça recolhida
  const clock = new THREE.Clock();

  /* ── Montagem dos modelos ──────────────────────────────── */

  const models = [];

  /** Normaliza escala e origem para qualquer peça cair certinho no pivô. */
  function fit(object3d) {
    const box = new THREE.Box3().setFromObject(object3d);
    const size = box.getSize(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;

    object3d.scale.multiplyScalar(TARGET_SIZE / maxAxis);
    box.setFromObject(object3d);
    object3d.position.sub(box.getCenter(new THREE.Vector3()));
  }

  let built = 0;
  const ready = Promise.all(
    MODELS.map(async ({ build, sway }, index) => {
      const model = await build();

      // O wrapper isola o recentramento do fit da animação de troca.
      const wrapper = new THREE.Group();
      fit(model);
      wrapper.add(model);
      wrapper.visible = index === 0;
      wrapper.userData.sway = sway;

      models[index] = wrapper;
      pivot.add(wrapper);

      onProgress?.(++built / MODELS.length);
    })
  );

  /* ── Resize ────────────────────────────────────────────── */

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Afasta a câmera em telas estreitas para a peça não estourar.
    camera.position.z = w / h < 0.85 ? 9.5 : 7;
    camera.updateProjectionMatrix();
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  /* A cena não é mais a primeira coisa da página: sem isso, a GPU fica
     renderizando quatro modelos enquanto o visitante ainda está na abertura. */
  let onScreen = true;
  const visibility = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
    },
    { rootMargin: "15%" }
  );
  visibility.observe(container);

  /* ── Loop de render ────────────────────────────────────── */

  let smoothed = 0;

  function frame() {
    if (disposed) return;

    if (!onScreen) {
      clock.getDelta(); // consome o tempo parado para não voltar com um salto
      return;
    }

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    smoothed += (progress - smoothed) * Math.min(delta * 6, 1);

    // Troca de peça: recolhe a atual, troca, e monta a próxima.
    const swapping = shownStep !== targetStep;
    presence += ((swapping ? 0 : 1) - presence) * Math.min(delta * 11, 1);

    if (swapping && presence < 0.02) {
      if (models[shownStep]) models[shownStep].visible = false;
      shownStep = targetStep;
      if (models[shownStep]) models[shownStep].visible = true;
    }

    // easeOutBack dá o estalo de chegada sem precisar de lib de easing.
    // Os coeficientes têm que somar zero em presence = 0 (c3 = c1 + 1),
    // senão a peça nunca encolhe até sumir e a troca acontece à vista.
    const c1 = 1.2;
    const t = presence - 1;
    const eased = 1 + (c1 + 1) * t ** 3 + c1 * t ** 2;
    pivot.scale.setScalar(Math.max(eased, 0.001));

    // Volta completa ao longo dos 4 passos + respiração constante — exceto
    // nas peças chatas, que só balançam para não virarem de perfil.
    const turn = smoothed * Math.PI * 2;
    pivot.rotation.y = models[shownStep]?.userData.sway
      ? Math.sin(turn) * 0.42 + Math.sin(elapsed * 0.4) * 0.09 + (1 - presence) * 0.9
      : turn + elapsed * 0.12 + (1 - presence) * 0.9;
    pivot.rotation.z = Math.sin(turn) * 0.08;
    pivot.position.y = BASE_Y + Math.sin(elapsed * 0.9) * 0.07;

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);

  /* ── API pública ───────────────────────────────────────── */

  return {
    ready,
    /** Progresso do scroll do hero (0 → 1), para a rotação. */
    setProgress(value) {
      progress = Math.min(Math.max(value, 0), 1);
    },
    /** Passo ativo (0 → 3). Dispara a troca de peça. */
    setStep(index) {
      targetStep = Math.min(Math.max(index, 0), MODELS.length - 1);
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibility.disconnect();
      disposeTree(scene);
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/** Libera geometrias, materiais e texturas de uma subárvore. */
function disposeTree(root) {
  root.traverse((node) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material)
      ? node.material
      : node.material
        ? [node.material]
        : [];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value && value.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}

/** WebGL disponível? */
export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}
