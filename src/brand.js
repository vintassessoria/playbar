/**
 * Identidade Playbar e as artes das estampas.
 *
 * Cada arte é desenhada direto no canvas da textura, em UNIDADES DE MUNDO:
 * quem chama informa `unit` (pixels por unidade de cena) e a função desenha
 * com as proporções reais da peça. Sem isso a arte sai esticada, porque a
 * faixa impressa é bem mais larga que alta.
 *
 * As versões procedurais aqui são aproximações das peças reais. Se você tiver
 * os arquivos de arte, salve em public/brand/ com os nomes de ART_OVERRIDES e
 * eles passam a ser usados no lugar do desenho.
 */

export const BRAND = {
  pink: "#ff2d6b",
  pinkDeep: "#c1004a",
  white: "#fdfafb",
  black: "#07070a",
  teal: "#38c6c9", // a estampa do copo de palco é turquesa
};

const LOGO_URL = "/brand/playbar-logo.png";

/** Artes reais, quando existirem. Ausentes = cai no desenho procedural. */
const ART_OVERRIDES = {
  taca: "/brand/art-taca.png",
  copo: "/brand/art-copo.png",
  sacola: "/brand/art-sacola.png",
  corporativo: "/brand/art-corporativo.png",
};

/** Largura da arte na peça, em unidades de cena. Vale para os dois caminhos. */
const ART_WIDTH = {
  taca: 1.9,
  copo: 1.3,
  sacola: 1.85,
  corporativo: 1.2,
};

/* ── Carregamento ─────────────────────────────────────────── */

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

let logoPromise = null;

/** O wordmark, carregado uma vez e reaproveitado. */
export function loadLogo() {
  logoPromise ??= loadImage(LOGO_URL);
  return logoPromise;
}

/* ── Utilidades de desenho ────────────────────────────────── */

/**
 * Redesenha uma imagem com alpha numa cor sólida.
 * O logo vem branco sobre transparente, então `source-in` troca a cor
 * preservando o recorte.
 */
function tint(img, color, width) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(Math.round(width), 1);
  canvas.height = Math.max(Math.round((img.height / img.width) * width), 1);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * Desenha o wordmark centrado em `cx`, com o topo em `top`.
 * @returns a altura ocupada, para empilhar o que vem embaixo.
 */
function drawLogo(ctx, logo, color, cx, top, width) {
  if (!logo) return 0;
  const tinted = tint(logo, color, width);
  ctx.drawImage(tinted, cx - width / 2, top, width, tinted.height);
  return tinted.height;
}

/* ── Artes procedurais ────────────────────────────────────── */

/**
 * Taça de casamento: wordmark rosa + a hashtag manuscrita.
 * Referência: o print vermelho na taça de gin.
 */
function drawTaca(ctx, { unit, width, height }, logo) {
  const cx = width / 2;
  const logoWidth = ART_WIDTH.taca * unit;
  const block = logoWidth / 2.296 + 0.52 * unit; // logo + linha da hashtag
  const top = height / 2 - block / 2;

  const logoHeight = drawLogo(ctx, logo, BRAND.pink, cx, top, logoWidth);

  ctx.fillStyle = BRAND.pink;
  ctx.textAlign = "center";
  ctx.font = `400 ${0.46 * unit}px 'Caveat', cursive`;
  ctx.fillText("#aperteoplay", cx, top + logoHeight + 0.4 * unit);
}

/**
 * Copo de palco: wordmark turquesa, a assinatura "aperte o #Play"
 * e o shaka com o olho sobre as ondas.
 */
function drawCopo(ctx, { unit, width, height }, logo) {
  const cx = width / 2;
  const logoWidth = ART_WIDTH.copo * unit;
  const top = height / 2 - 1.0 * unit;

  // Logo e assinatura formam uma linha só: o logo recua para a esquerda
  // exatamente o quanto o texto ocupa à direita.
  const logoCenter = cx - 0.3 * unit;
  drawLogo(ctx, logo, BRAND.teal, logoCenter, top, logoWidth);

  ctx.fillStyle = BRAND.black;
  ctx.textAlign = "left";
  ctx.font = `600 ${0.16 * unit}px 'Archivo', sans-serif`;
  ctx.fillText("aperte o", logoCenter + logoWidth / 2 + 0.08 * unit, top + 0.26 * unit);
  ctx.font = `700 ${0.18 * unit}px 'Archivo', sans-serif`;
  ctx.fillText("#Play", logoCenter + logoWidth / 2 + 0.08 * unit, top + 0.48 * unit);

  drawShakaEye(ctx, cx, height / 2 + 0.55 * unit, 1.4 * unit);
}

/** Sacola de festival: wordmark preto, grande e centralizado. */
function drawSacola(ctx, { unit, width, height }, logo) {
  const logoWidth = ART_WIDTH.sacola * unit;
  drawLogo(
    ctx,
    logo,
    BRAND.black,
    width / 2,
    height / 2 - logoWidth / 2.296 / 2,
    logoWidth
  );
}

/** Copo corporativo: wordmark rosa sobre uma régua fina branca. */
function drawCorporativo(ctx, { unit, width, height }, logo) {
  const cx = width / 2;
  const logoWidth = ART_WIDTH.corporativo * unit;
  const block = logoWidth / 2.296 + 0.34 * unit;
  const top = height / 2 - block / 2;

  const logoHeight = drawLogo(ctx, logo, BRAND.pink, cx, top, logoWidth);
  const ruleY = top + logoHeight + 0.11 * unit;

  ctx.strokeStyle = "rgba(253, 250, 251, 0.7)";
  ctx.lineWidth = Math.max(0.012 * unit, 1);
  ctx.beginPath();
  ctx.moveTo(cx - logoWidth / 2, ruleY);
  ctx.lineTo(cx + logoWidth / 2, ruleY);
  ctx.stroke();

  ctx.fillStyle = "rgba(253, 250, 251, 0.85)";
  ctx.textAlign = "center";
  ctx.font = `600 ${0.1 * unit}px 'Archivo', sans-serif`;
  ctx.letterSpacing = `${0.022 * unit}px`;
  ctx.fillText("APERTE O PLAY", cx, ruleY + 0.21 * unit);
  ctx.letterSpacing = "0px";
}

/**
 * Shaka com olho na palma sobre ondas — versão line-art simplificada
 * do desenho do copo. É a peça mais aproximada do conjunto; a arte real
 * em /brand/art-copo.png substitui isso por inteiro.
 */
function drawShakaEye(ctx, cx, cy, size) {
  const u = size / 100;
  const at = (x, y) => [cx + x * u, cy + y * u];

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Ondas ao fundo
  ctx.strokeStyle = BRAND.teal;
  ctx.lineWidth = 3.2 * u;
  for (let i = 0; i < 3; i++) {
    const y = 30 + i * 14;
    ctx.beginPath();
    ctx.moveTo(...at(-50, y));
    for (let x = -50; x <= 50; x += 25) {
      ctx.quadraticCurveTo(...at(x + 6, y - 8), ...at(x + 12.5, y));
      ctx.quadraticCurveTo(...at(x + 19, y + 8), ...at(x + 25, y));
    }
    ctx.stroke();
  }

  /* A mão é montada com traços grossos de ponta redonda em vez de uma
     bezier única: dois dedos e uma palma. Desenhada duas vezes, primeiro
     mais grossa em preto, ela ganha contorno sem precisar de path duplo. */
  const hand = (color, grow) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = (16 + grow) * u;

    ctx.beginPath(); // polegar
    ctx.moveTo(...at(-13, 12));
    ctx.lineTo(...at(-38, -10));
    ctx.stroke();

    ctx.beginPath(); // mindinho
    ctx.moveTo(...at(13, 8));
    ctx.lineTo(...at(35, -20));
    ctx.stroke();

    ctx.beginPath(); // palma
    ctx.ellipse(...at(0, 10), (23 + grow / 2) * u, (25 + grow / 2) * u, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  hand(BRAND.black, 7);
  hand("rgba(253, 250, 251, 0.95)", 0);

  // Olho na palma
  ctx.strokeStyle = BRAND.black;
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.moveTo(...at(-14, 10));
  ctx.quadraticCurveTo(...at(0, -4), ...at(14, 10));
  ctx.quadraticCurveTo(...at(0, 24), ...at(-14, 10));
  ctx.closePath();
  ctx.fillStyle = BRAND.white;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(...at(0, 10), 6 * u, 0, Math.PI * 2);
  ctx.fillStyle = BRAND.black;
  ctx.fill();

  ctx.restore();
}

/* ── API ──────────────────────────────────────────────────── */

const PROCEDURAL = {
  taca: drawTaca,
  copo: drawCopo,
  sacola: drawSacola,
  corporativo: drawCorporativo,
};

/**
 * Devolve a função que pinta a estampa pedida.
 *
 * @param {"taca"|"copo"|"sacola"|"corporativo"} name
 * @returns {Promise<(ctx: CanvasRenderingContext2D, metrics: {unit:number,width:number,height:number}) => void>}
 *   `unit` são os pixels que equivalem a uma unidade de cena.
 */
export async function loadArtwork(name) {
  const override = await loadImage(ART_OVERRIDES[name]);

  if (override) {
    return (ctx, { unit, width, height }) => {
      const w = ART_WIDTH[name] * unit;
      const h = (override.height / override.width) * w;
      ctx.drawImage(override, width / 2 - w / 2, height / 2 - h / 2, w, h);
    };
  }

  // As artes usam Caveat e Archivo; desenhar antes das fontes chegarem
  // renderiza com a fonte errada e a textura fica congelada assim.
  await document.fonts?.ready;
  const logo = await loadLogo();
  return (ctx, metrics) => PROCEDURAL[name](ctx, metrics, logo);
}
