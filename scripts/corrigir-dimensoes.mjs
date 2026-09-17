/**
 * Sincroniza os `width`/`height` do HTML com o tamanho real dos arquivos.
 *
 * O navegador usa esses dois números para reservar o espaço da imagem antes
 * de ela chegar. Se ficarem defasados depois de um redimensionamento, a
 * proporção declarada deixa de bater com a real e a página dá um salto no
 * meio do carregamento.
 *
 * Uso:  node scripts/corrigir-dimensoes.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const HTML = "index.html";

/** Lê as dimensões do arquivo com ffprobe. */
function medir(caminho) {
  const saida = execFileSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=p=0",
    caminho,
  ]).toString().trim();

  const [largura, altura] = saida.split(",").map(Number);
  return { largura, altura };
}

let html = readFileSync(HTML, "utf8");
let trocas = 0;

/* Percorre cada <img> com src local e reescreve o par de atributos dentro
   daquela tag — e só dentro dela, para não misturar as medidas de uma
   imagem com as da seguinte. */
html = html.replace(/<img\b[^>]*>/g, (tag) => {
  const src = tag.match(/src="\/([^"]+)"/)?.[1];
  if (!src) return tag;

  const arquivo = `public/${src}`;
  if (!existsSync(arquivo)) return tag;

  const { largura, altura } = medir(arquivo);
  if (!largura || !altura) return tag;

  const atual = [
    Number(tag.match(/width="(\d+)"/)?.[1]),
    Number(tag.match(/height="(\d+)"/)?.[1]),
  ];
  if (atual[0] === largura && atual[1] === altura) return tag;

  trocas++;
  const antes = atual[0] ? `${atual[0]}x${atual[1]}` : "(sem medidas)";
  console.log(`${src}: ${antes} -> ${largura}x${altura}`);

  /* Quando os atributos já existem basta reescrevê-los. Quando não, entram
     logo depois do src — a tag do logo, por exemplo, nunca os teve, e sem
     este ramo o script relatava a troca sem escrever nada. */
  if (atual[0] && atual[1]) {
    return tag
      .replace(/width="\d+"/, `width="${largura}"`)
      .replace(/height="\d+"/, `height="${altura}"`);
  }

  return tag.replace(
    /(src="[^"]+")/,
    `$1 width="${largura}" height="${altura}"`
  );
});

writeFileSync(HTML, html);
console.log(`\n${trocas} imagem(ns) atualizada(s).`);
