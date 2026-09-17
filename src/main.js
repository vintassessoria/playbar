import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { buildRibbons } from "./ribbons.js";
import { montarOrcamento } from "./orcamento.js";
import {
  revelarTitulos,
  tornarMagnetico,
  trocarLogosDasMarcas,
} from "./interacoes.js";

gsap.registerPlugin(ScrollTrigger);

/**
 * Cor do fundo da seção 3D em cada passo — precisa acompanhar os --step-N
 * de src/styles.css. Tudo quase preto: o giro é lido pelo hairline neon
 * da divisa e pelo halo de cada fatia, não pela troca de matiz.
 */
const STEP_COLORS = ["#120810", "#0b0910", "#14060c", "#08090d"];

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

document.documentElement.classList.remove("no-js");
document.querySelector("[data-year]").textContent = new Date().getFullYear();

/* O navegador restaura o scroll ao recarregar, e num site todo movido a
   scroll isso devolve o visitante para o meio de uma animação — com a
   abertura já consumida e o Lenis inicializando em cima disso. Toda recarga
   começa do topo. */
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

/* =========================================================
   Scroll suave (Lenis) alimentando o ScrollTrigger
   ========================================================= */

if (!reducedMotion) {
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* =========================================================
   Header — troca de tema ao entrar e sair da abertura

   A abertura é a única seção colorida do site. Sem isso, o botão "Reservar",
   que é rosa, ficaria rosa sobre rosa.
   ========================================================= */

{
  const header = document.querySelector(".site-header");
  const opening = document.querySelector(".opening");
  let observer;

  /* Observa só a faixa do topo onde o header mora: enquanto a abertura
     cruzar essa faixa, o header usa o tema da abertura.

     O rootMargin negativo embaixo encolhe a área de observação até sobrar
     apenas a altura do header. É mais direto do que medir onde a seção
     começa e termina, porque a pergunta real é "o que está atrás do header
     agora?" — e a resposta não depende de refresh nem de remedição. */
  const watch = () => {
    observer?.disconnect();
    observer = new IntersectionObserver(
      ([entry]) => header.classList.toggle("is-on-pink", entry.isIntersecting),
      { rootMargin: `0px 0px ${header.offsetHeight - window.innerHeight}px 0px` }
    );
    observer.observe(opening);
  };

  watch();
  window.addEventListener("resize", watch);
}

/* =========================================================
   Abertura — entrada do tipo, dos copos e dos stickers
   ========================================================= */

/* As fitas são montadas mesmo com movimento reduzido — o que fica de fora,
   logo abaixo, é só o deslocamento contínuo. */
const ribbonsTrack = buildRibbons(document.querySelector("[data-strip-ribbons]"));

if (!reducedMotion) {
  gsap.to(ribbonsTrack, {
    xPercent: -50, // meia largura = uma repetição da onda: emenda invisível
    duration: 34,
    ease: "none",
    repeat: -1,
  });
}

if (!reducedMotion) {
  const lines = gsap.utils.toArray("[data-opening-line]");

  const lineup = document.querySelector("[data-opening-lineup]");
  const doodle = document.querySelector("[data-opening-doodle]");
  const sticker = document.querySelector("[data-opening-sticker]");

  // Estado inicial aplicado já, antes de qualquer pintura: se a timeline
  // só começasse depois das fontes, a abertura apareceria montada e depois
  // saltaria para o começo da animação.
  gsap.set(lines, { yPercent: 118 });
  gsap.set([doodle, sticker], { opacity: 0, scale: 0.4 });
  gsap.set(lineup, { opacity: 0, yPercent: 16 });
  gsap.set(".site-header", { yPercent: -130, opacity: 0 });

  const intro = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });

  intro
    .to(lines, { yPercent: 0, duration: 1.05, stagger: 0.075 }, 0)
    .to(".site-header", { yPercent: 0, opacity: 1, duration: 0.9 }, 0.1)
    .to(lineup, { opacity: 1, yPercent: 0, duration: 1.25 }, 0.2)
    .to(doodle, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(2.4)" }, 0.5)
    .to(sticker, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(2.4)" }, 0.6);

  /* Espera as fontes (a altura das linhas muda com elas) e a foto dos copos,
     mas com teto: rede ruim não pode segurar a abertura indefinidamente. */
  const decoded = lineup.complete
    ? Promise.resolve()
    : new Promise((resolve) => lineup.addEventListener("load", resolve, { once: true }));

  Promise.race([
    Promise.all([document.fonts?.ready, decoded]),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).then(() => intro.play());

  /* Paralaxe na saída.

     Com o fundo chapado não existe camada de trás para contrastar,
     então o que sobra é a diferença entre título e copos. E essa folga não
     pode crescer: eles sobem no mesmo sentido, o título um pouco mais rápido,
     afastando-se no máximo ~40px no percurso inteiro. Movê-los em sentidos
     opostos — a paralaxe "clássica" — abre um vão de quase 100px entre o
     texto e os copos bem no meio da rolagem. */
  const drift = {
    trigger: ".opening",
    start: "top top",
    end: "bottom top",
    scrub: 0.6,
    invalidateOnRefresh: true,
  };

  /** Deslocamento em fração da altura da tela, recalculado a cada refresh. */
  const vh = (factor) => () => window.innerHeight * factor;

  gsap.to(lineup, {
    y: vh(-0.2),
    scale: 1.12,
    // Origem no topo: a escala cresce para baixo e não muda a distância
    // entre a borda de cima dos copos e a base do título.
    transformOrigin: "50% 0%",
    ease: "none",
    scrollTrigger: drift,
  });

  gsap.to(".opening-inner", {
    y: vh(-0.24),
    opacity: 0.1,
    ease: "none",
    scrollTrigger: drift,
  });
}

/* =========================================================
   Verticais — peças 3D + roda giratória

   A seção está fora do HTML no momento. O markup está guardado em
   docs/secao-verticais.html: colar de volta dentro do <main> religa tudo,
   inclusive o three.js, sem tocar em JavaScript.
   ========================================================= */

const verticals = document.querySelector(".hero");

if (verticals && !reducedMotion) {
  setupVerticals(verticals);
}

async function setupVerticals(section) {
  const canvasEl = section.querySelector("[data-hero-canvas]");
  const fallbackEl = section.querySelector("[data-hero-fallback]");
  const loaderEl = section.querySelector("[data-hero-loader]");
  const loaderFill = section.querySelector("[data-hero-loader-fill]");
  const wheel = section.querySelector("[data-hero-wheel]");
  const bg = section.querySelector("[data-hero-bg]");
  const indexEl = section.querySelector("[data-hero-index]");

  // Import dinâmico de propósito: sem a seção no HTML, o three.js e os quatro
  // modelos ficam num chunk à parte que o navegador nunca baixa.
  const { createHeroScene, supportsWebGL } = await import("./scene.js");

  let hero = null;

  if (supportsWebGL()) {
    hero = createHeroScene(canvasEl, {
      onProgress: (p) => {
        loaderFill.style.width = `${Math.round(p * 100)}%`;
      },
    });

    hero.ready.then(() => {
      loaderEl.classList.add("is-done");
      // O layout pode ter mudado enquanto as peças eram montadas.
      ScrollTrigger.refresh();
    });
  } else {
    canvasEl.hidden = true;
    fallbackEl.hidden = false;
    loaderEl.classList.add("is-done");
  }

  let lastIndex = -1;

  /* A timeline alterna giro e pausa. Sem a pausa as três transições ficam
     coladas e nenhum passo chega a ficar parado para ser lido. */
  const LEAD_IN = 0.5; // pausa inicial no passo 01
  const TURN = 0.8; // duração do giro de 90°
  const HOLD = 0.55; // pausa depois de cada giro
  const TAIL = 0.5; // pausa final antes de liberar o scroll

  /* O contador, a troca de peça e o 3D são atualizados no onUpdate da
     própria timeline, não no do ScrollTrigger: com `scrub`, o ScrollTrigger
     dispara antes de a timeline renderizar o quadro, e a rotação lida ali
     fica um passo atrás. */
  const timeline = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onUpdate: () => {
      hero?.setProgress(timeline.progress());

      // O passo ativo segue o ângulo real da roda, não o progresso bruto —
      // as pausas tornam a timeline irregular e o ângulo não mente.
      const rotation = Number(gsap.getProperty(wheel, "rotation")) || 0;
      const index = Math.min(
        STEP_COLORS.length - 1,
        Math.max(0, Math.round(-rotation / 90))
      );
      if (index !== lastIndex) {
        lastIndex = index;
        indexEl.textContent = String(index + 1).padStart(2, "0");
        hero?.setStep(index);
      }
    },
  });

  STEP_COLORS.slice(1).forEach((color, i) => {
    const at = LEAD_IN + i * (TURN + HOLD);
    timeline
      .to(wheel, { rotation: -90 * (i + 1), duration: TURN }, at)
      // A cor do fundo troca no miolo do giro, quando a divisa das fatias
      // cruza a tela — assim a mudança não é percebida como um corte.
      .to(bg, { backgroundColor: color, duration: TURN * 0.7 }, at + TURN * 0.2);
  });

  timeline.to({}, { duration: TAIL }, LEAD_IN + 3 * (TURN + HOLD));

  ScrollTrigger.create({
    animation: timeline,
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    scrub: 0.8,
    invalidateOnRefresh: true,
  });

  ScrollTrigger.refresh();
}

/* =========================================================
   Reel — o vídeo abrindo na tela conforme o scroll
   ========================================================= */

{
  const section = document.querySelector(".reel");
  const videos = gsap.utils.toArray("[data-reel-video]");

  /* O blend de inversão da frase é puro CSS (ver .reel-text), então aqui só
     sobra o controle de reprodução.

     Os vídeos só rodam enquanto a seção está por perto: decodificar três
     streams fora de vista gasta bateria à toa. A margem de 25% faz eles
     começarem antes de entrar em cena — assim chegam rodando em vez de
     aparecer congelados no primeiro quadro, e sobra folga para o callback do
     observer, que é entregue junto com a renderização. */
  new IntersectionObserver(
    ([entry]) => {
      videos.forEach((video) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      });
    },
    { rootMargin: "25% 0px" }
  ).observe(section);
}

/* =========================================================
   Camada de interação — títulos e botões
   ========================================================= */

if (!reducedMotion) {
  tornarMagnetico(".btn");

  /* A abertura fica de fora: o título dela já tem a própria entrada, e as
     duas animações disputariam o mesmo elemento. */
  revelarTitulos(".secao-titulo, .sobre-lead, .numeros-titulo");
}

/* =========================================================
   Marcas — marquise contínua
   ========================================================= */

/* Troca fora do guarda de movimento reduzido: as logos não são animação. */
trocarLogosDasMarcas();

/* =========================================================
   Orçamento — questionário que fecha no WhatsApp
   ========================================================= */

/* Também fora do guarda: sem ele o formulário ficaria travado no passo 1
   para quem pediu menos movimento. A transição entre passos é que respeita
   a preferência, e isso está no CSS. */
montarOrcamento();

if (!reducedMotion) {
  /* A lista existe duas vezes no HTML; deslocar metade da largura devolve o
     mesmo quadro e o laço fecha sem emenda. Mesma lógica das fitas. */
  gsap.to("[data-marcas-track]", {
    xPercent: -50,
    duration: 42,
    ease: "none",
    repeat: -1,
  });
}

/* =========================================================
   Números — contagem ao entrar em cena
   ========================================================= */

if (!reducedMotion) {
  gsap.utils.toArray("[data-numero]").forEach((el) => {
    const alvo = Number(el.dataset.numero);
    const contador = { valor: 0 };

    /* O valor final já está no HTML: quem não tem JavaScript lê o número
       certo, e a contagem só reescreve o texto por cima. */
    gsap.to(contador, {
      valor: alvo,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = Math.round(contador.valor).toLocaleString("pt-BR");
      },
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        once: true, // conta uma vez; recontar a cada passagem vira tique
        onEnter: () => {
          el.textContent = "0";
        },
      },
    });
  });
}

/* =========================================================
   Faixa horizontal — scroll vertical vira deslocamento X
   ========================================================= */

/* Fora daqui a seção vira um carrossel de arrastar, feito só com CSS
   (`scroll-snap`, ver styles.css). Nada deste bloco roda lá: prender a
   página por 320vh e reposicionar sete cards a cada quadro custa caro num
   telefone, e ainda sequestra o gesto que o dedo já faz sozinho.

   A consulta é o complemento exato da que está no styles.css — as duas
   precisam continuar casando, ou sobra um estado em que nem o pin monta nem
   o carrossel aparece, e a faixa fica com 320vh de altura e pista parada:

   - `min-width: 761px` exclui o celular em pé;
   - `pointer: fine` exclui o celular deitado e o tablet, que passariam pela
     largura mas não deveriam receber o pin;
   - `no-preference` exclui quem pediu menos movimento.

   `gsap.matchMedia` e não um `if` com `matchMedia().matches`: o `if` lê a
   medida uma vez, no load. Quem girasse o aparelho ficaria preso no modo
   errado. Aqui o GSAP monta ao entrar na medida e desfaz tudo ao sair. */
gsap.matchMedia().add(
  "(min-width: 761px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  () => {
    const strip = document.querySelector(".strip");
    const stage = document.querySelector(".strip-stage");
    const track = document.querySelector("[data-strip-track]");

    // clientWidth do palco, não innerWidth: descontar a barra de rolagem evita
    // que o último card pare meio cortado.
    const travel = () => Math.max(track.scrollWidth - stage.clientWidth, 0);

    /* A altura da seção sai da distância horizontal a percorrer, então 1px de
       scroll vertical move 1px na faixa. Com altura fixa no CSS, cada card
       novo acelerava a faixa inteira e obrigava a recalibrar o valor na mão. */
    const sizeStrip = () => {
      strip.style.height = `${window.innerHeight + travel()}px`;
    };

    /* ── Onda ──────────────────────────────────────────────
       Cada card sobe e desce conforme a posição horizontal dele, então a onda
       fica parada no espaço e os cards é que atravessam — sobem de um lado,
       descem do outro. Amarrar o Y ao índice, em vez da posição, daria um
       zigue-zague rígido que anda junto com a fileira. */

    const cards = gsap.utils.toArray(".strip-card");
    const AMPLITUDE = 42; // px de sobe-e-desce

    /* Um ciclo cobre cerca de cinco cards. Perto do espaçamento entre eles
       (~470px), vizinhos caem em fase oposta e o resultado lê como zigue-zague
       em vez de onda — é preciso o ciclo ser bem maior que o passo. */
    const COMPRIMENTO = 2400;

    /* Centros medidos uma vez por refresh. Ler getBoundingClientRect dos sete
       cards a cada quadro forçaria recálculo de layout no meio da rolagem. */
    let centros = [];
    const medirCards = () => {
      centros = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
    };

    const ondular = () => {
      const deslocamento = Number(gsap.getProperty(track, "x")) || 0;
      cards.forEach((card, i) => {
        const x = centros[i] + deslocamento;
        gsap.set(card, {
          y: Math.sin((x / COMPRIMENTO) * Math.PI * 2) * AMPLITUDE,
        });
      });
    };

    const aoRemedir = () => {
      medirCards();
      ondular();
    };

    ScrollTrigger.addEventListener("refreshInit", sizeStrip);
    ScrollTrigger.addEventListener("refresh", aoRemedir);

    sizeStrip();
    medirCards();
    ondular();

    gsap.to(track, {
      x: () => -travel(),
      ease: "none",
      onUpdate: ondular,
      scrollTrigger: {
        trigger: strip,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });

    /* Desmontagem ao sair da medida — girar o aparelho para retrato cai aqui.
       O matchMedia desfaz sozinho o que o GSAP criou (o tween, o gatilho e os
       transforms dos cards), mas a altura da seção foi escrita direto no
       style: sem limpar, a faixa ficaria com 3000px de altura no carrossel de
       arrastar. Os dois listeners também são nossos, e não do GSAP. */
    return () => {
      ScrollTrigger.removeEventListener("refreshInit", sizeStrip);
      ScrollTrigger.removeEventListener("refresh", aoRemedir);
      strip.style.removeProperty("height");
    };
  }
);

// As fontes mudam a altura do texto; recalcula os gatilhos quando chegarem.
document.fonts?.ready.then(() => ScrollTrigger.refresh());
