/**
 * Questionário de orçamento que termina no WhatsApp.
 *
 * Não existe servidor neste site, então o formulário não "envia" nada: ele
 * monta uma mensagem legível com as respostas e abre a conversa já
 * preenchida. Quem aperta enviar é a pessoa, dentro do WhatsApp — o que
 * também significa que o contato chega de um número real, e não de um
 * formulário anônimo que alguém precisa responder por e-mail.
 *
 * Em três passos, e não numa página só, porque nove campos de uma vez num
 * fundo preto é o tipo de parede que faz a pessoa fechar a aba.
 */

const PLACEHOLDER = "5511999999999";

/** Rótulo de cada campo na mensagem, na ordem em que aparecem lá. */
const ROTULOS = {
  tipo: "Evento",
  data: "Data",
  cidade: "Cidade",
  publico: "Público",
  modelo: "Modelo",
  duracao: "Duração",
  nome: "Nome",
  telefone: "WhatsApp",
  recado: "Recado",
};

/** `2027-03-12` do input date vira `12/03/2027`, que é como se lê aqui. */
function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return ano ? `${dia}/${mes}/${ano}` : iso;
}

/** Monta o texto da mensagem a partir do que foi respondido. */
function montarMensagem(form) {
  const dados = new FormData(form);

  const linhas = Object.entries(ROTULOS)
    // O recado é opcional: vazio não vira linha em branco na conversa.
    .filter(([campo]) => (dados.get(campo) || "").trim())
    .map(([campo, rotulo]) => {
      const valor = dados.get(campo).trim();
      return `• ${rotulo}: ${campo === "data" ? formatarData(valor) : valor}`;
    });

  return [
    "Olá! Quero um orçamento de bar para um evento.",
    "",
    ...linhas,
    "",
    "— enviado pelo site",
  ].join("\n");
}

/**
 * Valida só o passo visível.
 *
 * O `novalidate` no formulário existe por causa disto: sem ele o navegador
 * tentaria validar os passos escondidos no submit e travaria tentando focar
 * um campo que ninguém consegue ver. Aqui a validação nativa continua sendo
 * usada — `reportValidity` desenha a mensagem do próprio navegador — só que
 * apontada para os campos que estão em cena.
 */
function validar(passo) {
  for (const campo of passo.elements) {
    if (!campo.checkValidity()) {
      campo.reportValidity();
      return false;
    }
  }
  return true;
}

export function montarOrcamento() {
  const secao = document.querySelector(".orcamento");
  if (!secao) return;

  const form = secao.querySelector(".orcamento-form");
  const passos = [...form.querySelectorAll("[data-passo]")];
  const voltar = form.querySelector("[data-voltar]");
  const avancar = form.querySelector("[data-avancar]");
  const enviar = form.querySelector("[data-enviar]");
  const aviso = form.querySelector(".orcamento-aviso");

  const numero = (secao.dataset.whatsapp || "").replace(/\D/g, "");
  if (!numero || numero === PLACEHOLDER) {
    console.warn(
      "Orçamento: data-whatsapp ainda está no número de exemplo. " +
        "Troque em index.html, na seção #orcamento."
    );
  }

  let atual = 0;

  function mostrar(indice, mover = true) {
    atual = indice;

    passos.forEach((passo, i) => {
      passo.hidden = i !== indice;
      if (i === indice) passo.classList.remove("is-entrando");
    });

    // Reflow entre remover e recolocar a classe: sem isso a transição não
    // reinicia quando o passo volta a aparecer.
    const passo = passos[indice];
    void passo.offsetWidth;
    passo.classList.add("is-entrando");

    const ultimo = indice === passos.length - 1;
    voltar.hidden = indice === 0;
    avancar.hidden = ultimo;
    enviar.hidden = !ultimo;

    aviso.textContent = `Passo ${indice + 1} de ${passos.length}.`;

    /* Só move o foco quando foi a pessoa que pediu para trocar de passo.
       Na montagem inicial isso roubaria o foco de onde ela estivesse. */
    if (mover) passo.querySelector("input, textarea, select")?.focus();
  }

  avancar.addEventListener("click", () => {
    if (validar(passos[atual])) mostrar(atual + 1);
  });

  voltar.addEventListener("click", () => mostrar(atual - 1));

  /* Enter num campo continua para o próximo passo em vez de disparar o envio.
     Sem isto o navegador acha o botão de submit — que está escondido, mas
     existe — e manda o formulário pela metade. */
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.tagName === "TEXTAREA") return;
    if (atual === passos.length - 1) return;

    e.preventDefault();
    if (validar(passos[atual])) mostrar(atual + 1);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validar(passos[atual])) return;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(
      montarMensagem(form)
    )}`;

    /* Aba nova para o site não sumir atrás do WhatsApp. Se o bloqueador de
       pop-up recusar, navega na mesma aba — perder o contato é pior que
       perder a aba. */
    const nova = window.open(url, "_blank", "noopener");
    if (!nova) window.location.href = url;

    aviso.textContent = "Abrindo o WhatsApp com suas respostas.";
  });

  mostrar(0, false);
}
