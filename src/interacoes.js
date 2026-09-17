import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

/**
 * Camada de interação do site: revelação de títulos e botões magnéticos.
 * Tudo que responde a ponteiro ou entrada em cena mora aqui, para o main.js
 * seguir sendo só o roteiro das seções.
 *
 * Nada disso roda com `prefers-reduced-motion`; quem decide é o main.js.
 */

/* =========================================================
   Títulos que se revelam palavra a palavra
   ========================================================= */

/** Quebra o texto em palavras, cada uma numa janela com overflow escondido. */
function dividirEmPalavras(el) {
  const palavras = el.textContent.trim().split(/\s+/);
  el.textContent = "";

  return palavras.map((palavra, i) => {
    const janela = document.createElement("span");
    janela.className = "palavra";

    const interno = document.createElement("span");
    interno.textContent = palavra;
    janela.appendChild(interno);

    el.appendChild(janela);
    // Espaço real entre as janelas: sem ele as palavras colam.
    if (i < palavras.length - 1) el.appendChild(document.createTextNode(" "));

    return interno;
  });
}

export function revelarTitulos(seletor) {
  gsap.utils.toArray(seletor).forEach((titulo) => {
    const palavras = dividirEmPalavras(titulo);

    gsap.from(palavras, {
      yPercent: 115,
      duration: 0.9,
      ease: "expo.out",
      stagger: 0.055,
      scrollTrigger: {
        trigger: titulo,
        start: "top 85%",
        once: true, // revelar de novo a cada passagem vira tique
      },
    });
  });
}

/* =========================================================
   Logos das marcas
   ========================================================= */

/* Proporção de um letreiro típico — "BEEFEATER", "SAGATIBA". É a régua: uma
   logo nessa proporção fica na altura base, e o resto é corrigido em relação
   a ela. */
const PROPORCAO_REFERENCIA = 3.2;

/* Os limites existem porque a raiz sozinha exagera nos extremos: o rótulo
   retrato do Jack Daniel's pediria mais que o dobro da altura base, e o
   letreiro longuíssimo do Casillero encolheria até sumir. */
const MENOR = 0.72;
const MAIOR = 1.5;

/**
 * Quanto esticar a altura desta logo para ela pesar como as vizinhas.
 *
 * Dimensionar logos por altura fixa é o erro clássico da fita de marcas: um
 * brasão quadrado vira um selinho perdido ao lado de um letreiro de seis
 * palavras. A raiz equaliza a *área* aproximada em vez da altura — marca
 * estreita sobe, marca larga desce — que é o que o olho lê como "mesmo
 * tamanho".
 */
function escalaOptica(largura, altura) {
  const proporcao = largura / altura;
  const bruta = Math.sqrt(PROPORCAO_REFERENCIA / proporcao);
  return Math.min(MAIOR, Math.max(MENOR, bruta));
}

/* PNG primeiro, SVG depois — e a ordem importa mais do que parece.

   Servidor de site estático costuma responder o `index.html` para caminho que
   não existe, em vez de um 404 seco. Quem pedisse o SVG de cada marca sem ele
   estar lá receberia a página inteira de volta: 26 KB por marca, 12 marcas,
   ~300 KB jogados fora antes de a primeira logo aparecer — mais que a imagem
   da abertura. Como a decodificação falha, o código caía no PNG e funcionava;
   o desperdício não dava sinal nenhum.

   Pedindo o PNG primeiro, o caso comum acerta de primeira. Para usar vetor
   numa marca, ponha o `.svg` e apague o `.png` dela. */
const EXTENSOES = ["png", "svg"];

/** Carrega a logo da marca. Resolve com a imagem pronta. */
function carregarLogo(slug, nome) {
  return new Promise((pronto, falhou) => {
    const tentar = (extensoes) => {
      if (!extensoes.length) return falhou();
      const [extensao, ...resto] = extensoes;

      const img = new Image();

      /* Fim da fila de rede. A fita está oito telas abaixo; o que importa
         na primeira é a imagem da abertura, e ela tem `preload`. */
      img.fetchPriority = "low";

      img.onload = () => {
        img.alt = nome;

        /* naturalWidth já está disponível aqui, e é a única fonte da
           proporção: o CSS não tem como saber o formato do arquivo. */
        const escala = escalaOptica(img.naturalWidth, img.naturalHeight);
        img.style.setProperty("--optica", escala.toFixed(3));

        /* Declarar as dimensões dá ao navegador a proporção antes da
           pintura. Sem elas, cada logo entra com largura zero e a fita
           inteira se reacomoda a cada arquivo que chega. */
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;

        pronto(img);
      };
      img.onerror = () => tentar(resto);
      img.src = `/brand/marcas/${slug}.${extensao}`;
    };

    tentar(EXTENSOES);
  });
}

/** Busca as logos e as coloca no lugar dos nomes. */
function montarLogos(porSlug) {
  for (const [slug, repeticoes] of porSlug) {
    const nome = repeticoes[0].textContent.trim();

    carregarLogo(slug, nome)
      .then((img) => {
        repeticoes.forEach((item, i) => {
          // O original vai para o primeiro; os demais levam um clone.
          item.replaceChildren(i === 0 ? img : img.cloneNode());
        });
      })
      // Sem arquivo, o nome em texto que já está no HTML continua valendo.
      .catch(() => {});
  }
}

/**
 * Troca o nome da marca pela logo, quando o arquivo existir.
 *
 * O nome fica no HTML e só é substituído se a imagem carregar. Assim a
 * marquise nunca mostra ícone quebrado, funciona sem os arquivos e mantém o
 * texto para leitor de tela.
 *
 * Duas economias que não são visíveis no resultado:
 *
 * Cada marca é buscada uma vez só, e as repetições recebem um clone. A fita
 * duplica a lista inteira para o laço fechar sem emenda, então sem isto
 * seriam 24 buscas para 12 arquivos.
 *
 * E as buscas saem com `fetchPriority: "low"`. São 172 KB para uma fita que
 * fica umas oito telas abaixo da abertura, e sem isso elas disputavam banda
 * com a imagem do hero na primeira tela. A prioridade quem respeita é o
 * próprio navegador, na fila de rede: não há callback para não chegar, e
 * onde o atributo não existe ele é ignorado e tudo segue como antes.
 *
 * Adiar de verdade — por `IntersectionObserver` ou por `requestIdleCallback`
 * — economizaria mais, mas os dois dependem de um callback que a aba em
 * segundo plano não entrega. O risco é a fita ficar só com os nomes em texto
 * num cenário difícil de reproduzir, e o ganho não paga isso.
 * `loading="lazy"` também não servia: vale para `<img>` que já está no
 * documento, e estas nascem em `new Image()`.
 *
 * Arquivos em public/brand/marcas/<slug>.
 */
export function trocarLogosDasMarcas() {
  const itens = [...document.querySelectorAll("[data-marca]")];
  if (!itens.length) return;

  const porSlug = new Map();
  for (const item of itens) {
    const slug = item.dataset.marca;
    if (!porSlug.has(slug)) porSlug.set(slug, []);
    porSlug.get(slug).push(item);
  }

  montarLogos(porSlug);
}

/* =========================================================
   Botões magnéticos
   ========================================================= */

export function tornarMagnetico(seletor, forca = 0.32) {
  gsap.utils.toArray(seletor).forEach((el) => {
    const mover = (e) => {
      const caixa = el.getBoundingClientRect();
      /* Deslocamento proporcional à distância do centro: o botão é puxado na
         direção do ponteiro, sem nunca sair de baixo dele. */
      gsap.to(el, {
        x: (e.clientX - (caixa.left + caixa.width / 2)) * forca,
        y: (e.clientY - (caixa.top + caixa.height / 2)) * forca,
        duration: 0.4,
        ease: "power3.out",
      });
    };

    const soltar = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    };

    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", soltar);
  });
}

gsap.registerPlugin(ScrollTrigger);
