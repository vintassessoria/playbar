/**
 * Fitas de fundo — as "minhocas".
 *
 * Faixas rosas soltas que atravessam a seção na horizontal, com folga entre
 * elas. Diferente das ondas da abertura, que preenchem a tela inteira: aqui
 * o preto continua sendo o fundo e as fitas só passam por cima dele.
 *
 * Cada fita é um path preenchido, e não uma linha grossa: `preserveAspectRatio
 * ="none"` estica o desenho para cobrir qualquer proporção de tela, e stroke
 * esticado assim sai com espessura irregular.
 */

import { token } from "./tokens.js";

const NS = "http://www.w3.org/2000/svg";

/* Duas repetições da onda na largura do desenho. Deslocar metade devolve o
   mesmo quadro — é o que faz o loop fechar. Os dois andam juntos. */
const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 100;
const PERIOD = 100;

/** Cada fita: altura de repouso, espessura, amplitude, fase e opacidade. */
/* Só duas, uma em cada extremidade: o miolo fica livre para os cards. */
const RIBBONS = [
  { y: 8, thickness: 4.2, amplitude: 5, phase: 0, opacity: 0.55 },
  { y: 84, thickness: 3.8, amplitude: 6, phase: 2.6, opacity: 0.5 },
];

/**
 * @param {HTMLElement} host
 * @param {object} [options]
 * @param {string} [options.color]  cor das fitas; por padrão o --pink do CSS
 * @returns {HTMLElement} o elemento que deve ser animado no eixo X
 */
export function buildRibbons(host, { color = token("--pink", "#ff2d6b") } = {}) {
  const samples = 60;

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  RIBBONS.forEach(({ y, thickness, amplitude, phase, opacity }) => {
    const edge = (x, offset) =>
      y + offset + amplitude * Math.sin((2 * Math.PI * x) / PERIOD + phase);

    const points = [];
    for (let s = 0; s <= samples; s++) {
      const x = (VIEW_WIDTH * s) / samples;
      points.push(`${x.toFixed(2)} ${edge(x, 0).toFixed(2)}`);
    }
    for (let s = samples; s >= 0; s--) {
      const x = (VIEW_WIDTH * s) / samples;
      points.push(`${x.toFixed(2)} ${edge(x, thickness).toFixed(2)}`);
    }

    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", `M ${points.join(" L ")} Z`);
    path.setAttribute("fill", color);
    path.setAttribute("opacity", String(opacity));
    svg.appendChild(path);
  });

  const track = document.createElement("div");
  track.className = "ribbons-track";
  track.appendChild(svg);

  host.appendChild(track);
  return track;
}
