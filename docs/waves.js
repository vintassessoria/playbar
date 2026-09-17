/*
  GERADOR DESLIGADO — as faixas de onda que ficavam no fundo da abertura.

  A abertura virou fundo branco chapado. Para religar: mover de volta para
  src/, recolocar <div class="opening-waves" data-opening-waves></div> na
  seção e chamar buildWaves() em src/main.js.

  src/ribbons.js usa a mesma técnica no eixo horizontal e continua em uso
  na faixa de serviços.
*/

/**
 * Fundo de ondas da abertura.
 *
 * Faixas verticais que ondulam, geradas em SVG, alternando o rosa da marca
 * com branco. Quem segura o contraste com o título é o véu de
 * `.opening-waves::after`, não a cor das faixas.
 *
 * O movimento é um translate no container, não nos paths: animar o <g> obriga
 * o navegador a rasterizar o SVG de novo a cada quadro, enquanto o transform
 * do <div> é composto na GPU.
 */

import { token } from "./tokens.js";

const NS = "http://www.w3.org/2000/svg";

/* O desenho tem 200 unidades de altura e a onda se repete a cada 100. É essa
   razão exata que faz o loop fechar: deslocar metade da altura devolve o
   mesmo quadro. Mexer em um destes números sem mexer no outro quebra a emenda. */
const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 200;
const PERIOD = 100;

/**
 * @param {HTMLElement} host  onde o SVG é montado
 * @param {object} [options]
 * @param {number} [options.bands]      quantas faixas cruzam a largura
 * @param {number} [options.amplitude]  o quanto a onda desvia, em unidades
 */
export function buildWaves(host, { bands = 8, amplitude = 6.5 } = {}) {
  // Lidas do CSS: o rosa daqui é o mesmo rosa do botão e do sticker.
  const colors = [token("--pink", "#ff2d6b"), token("--white", "#fdfafb")];

  const step = VIEW_WIDTH / bands;
  const samples = 48;

  /** Deslocamento horizontal da onda na altura `y`.
      Duas senoides somadas: uma só daria um ondulado regular demais. */
  const offsetAt = (y) =>
    amplitude * Math.sin((2 * Math.PI * y) / PERIOD) +
    amplitude * 0.45 * Math.sin((4 * Math.PI * y) / PERIOD + 1.1);

  const edgeAt = (index, y) => index * step + offsetAt(y);

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  // Estende para fora dos dois lados: a onda desloca as bordas e sem a
  // sobra apareceria fundo vazio nos cantos.
  const first = -2;
  const last = bands + 2;

  for (let i = first; i < last; i++) {
    const points = [];

    for (let s = 0; s <= samples; s++) {
      const y = (VIEW_HEIGHT * s) / samples;
      points.push(`${edgeAt(i, y).toFixed(2)} ${y.toFixed(2)}`);
    }
    for (let s = samples; s >= 0; s--) {
      const y = (VIEW_HEIGHT * s) / samples;
      points.push(`${edgeAt(i + 1, y).toFixed(2)} ${y.toFixed(2)}`);
    }

    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", `M ${points.join(" L ")} Z`);
    // Índice negativo continua a sequência de cores sem quebrar o ritmo.
    path.setAttribute(
      "fill",
      colors[((i % colors.length) + colors.length) % colors.length]
    );
    svg.appendChild(path);
  }

  const track = document.createElement("div");
  track.className = "waves-track";
  track.appendChild(svg);

  host.appendChild(track);
  return track;
}
