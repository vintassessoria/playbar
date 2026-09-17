/**
 * Prepara as logos das marcas para a marquise.
 *
 * Os arquivos que se acham soltos por aí (seeklogo e similares) vêm como PNG
 * de preview: fundo branco chapado, sem canal alpha. Jogados direto na seção
 * escura, cada um vira um cartão branco.
 *
 * Este script transforma qualquer PNG desses numa silhueta branca recortada:
 *
 *   1. alpha derivado da luminância — branco vira transparente, tinta vira
 *      opaco, e a rampa estreita perto do branco preserva o antisserrilhado
 *      das bordas em vez de deixá-las em escada;
 *   2. corte na caixa do conteúdo, para o logo não navegar dentro de 600px de
 *      vazio (a marquise dimensiona por altura: sobra = logo minúsculo);
 *   3. redução para ALTURA_FINAL, que já cobre telas retina e derruba o peso.
 *
 * Uso:  node scripts/preparar-logos.mjs <pasta-de-entrada> <pasta-de-saida>
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { PNG } from "pngjs";

const ALTURA_FINAL = 160; // ~4x o tamanho que a marquise renderiza

/* Abaixo de OPACO a tinta é sólida; acima de VAZIO é fundo. No meio fica a
   rampa que salva as bordas suavizadas do arquivo original. */
const OPACO = 0.87;
const VAZIO = 0.97;

/** Silhueta branca: a cor é descartada, só a densidade da tinta importa. */
function silhuetar({ data, width, height }) {
  for (let p = 0; p < data.length; p += 4) {
    const lum =
      (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;

    // Respeita quem já tinha alpha: o menor dos dois vence.
    const doFundo = (VAZIO - lum) / (VAZIO - OPACO);
    const a = Math.max(0, Math.min(1, doFundo)) * (data[p + 3] / 255);

    data[p] = data[p + 1] = data[p + 2] = 255;
    data[p + 3] = Math.round(a * 255);
  }
  return { data, width, height };
}

/** Caixa mínima que contém tudo que não é transparente. */
function caixa({ data, width, height }) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x1 < 0) return null; // imagem inteiramente vazia
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Corta e reduz numa passada só, com média de área.
 *
 * Média de área e não vizinho mais próximo: a maioria dessas logos é tipografia
 * fina, e amostrar um pixel por destino come as hastes das letras.
 *
 * As médias são feitas em alpha pré-multiplicado — aqui trivial, já que a cor
 * é branca em todo lugar, mas mantém o resultado correto se alguém apontar o
 * script para um arquivo colorido.
 */
function reduzir(origem, box, alturaFinal) {
  const escala = alturaFinal / box.h;
  const w = Math.max(1, Math.round(box.w * escala));
  const h = alturaFinal;
  const saida = new PNG({ width: w, height: h });

  for (let y = 0; y < h; y++) {
    const sy0 = box.y0 + (y * box.h) / h;
    const sy1 = box.y0 + ((y + 1) * box.h) / h;

    for (let x = 0; x < w; x++) {
      const sx0 = box.x0 + (x * box.w) / w;
      const sx1 = box.x0 + ((x + 1) * box.w) / w;

      let soma = 0;
      let peso = 0;

      for (let py = Math.floor(sy0); py < Math.ceil(sy1); py++) {
        // Quanto deste pixel de origem cai dentro do pixel de destino.
        const fy = Math.min(py + 1, sy1) - Math.max(py, sy0);
        if (fy <= 0) continue;

        for (let px = Math.floor(sx0); px < Math.ceil(sx1); px++) {
          const fx = Math.min(px + 1, sx1) - Math.max(px, sx0);
          if (fx <= 0) continue;

          const area = fx * fy;
          soma += origem.data[(py * origem.width + px) * 4 + 3] * area;
          peso += area;
        }
      }

      const d = (y * w + x) * 4;
      saida.data[d] = saida.data[d + 1] = saida.data[d + 2] = 255;
      saida.data[d + 3] = peso ? Math.round(soma / peso) : 0;
    }
  }

  return saida;
}

const [entrada, destino] = process.argv.slice(2);
if (!entrada || !destino) {
  console.error("uso: node scripts/preparar-logos.mjs <entrada> <saida>");
  process.exit(1);
}

mkdirSync(destino, { recursive: true });

for (const arquivo of readdirSync(entrada).filter((f) => f.endsWith(".png"))) {
  const bruto = silhuetar(PNG.sync.read(readFileSync(join(entrada, arquivo))));
  const box = caixa(bruto);

  if (!box) {
    console.warn(`${arquivo}: vazio depois do recorte, pulando`);
    continue;
  }

  const png = reduzir(bruto, box, ALTURA_FINAL);
  const saida = join(destino, basename(arquivo));
  writeFileSync(saida, PNG.sync.write(png));

  console.log(`${arquivo} -> ${png.width}x${png.height}`);
}
