# Playbar

Site de uma página: abertura em rosa chapado com a foto dos copos, faixa
horizontal de serviços, tríptico de vídeos e seções de conteúdo. A mecânica
veio do site de referência em `referencia playbar.zip`.

## Rodar

```bash
npm install && npm run dev
```

## A abertura

`.opening` é a primeira tela: rosa chapado, título gigante branco e a foto
dos copos cortada pela borda de baixo. Cada linha do `<h1>` é uma janela com
`overflow: hidden` e o `<span>` de dentro sobe no load; o rabisco e o sticker
moram dentro do próprio `<h1>` e são posicionados em `em`, para acompanharem a
tipografia em qualquer largura.

A timeline de entrada espera as fontes e a foto, mas com teto de 1,5 s — rede
ruim não segura a abertura. O estado inicial é aplicado com `gsap.set` antes de
qualquer pintura, senão a página apareceria montada e depois saltaria para o
começo da animação.

Toda recarga começa do topo (`history.scrollRestoration = "manual"` em
`src/main.js`). O padrão do navegador é devolver o visitante ao ponto onde ele
parou, o que num site movido a scroll significa cair no meio de uma animação,
com a abertura já consumida e o Lenis inicializando em cima disso.

### A pilha de camadas

A ordem importa e é fácil de quebrar sem perceber:

| z-index | camada |
| --- | --- |
| 1 | granulado |
| 2 | linhas do título |
| 3 | foto dos copos |
| 4 | rabisco e sticker |

Os copos ficam **na frente** do título e comem a base da última linha — é
disso que vem a sensação de camadas de cartaz. O granulado entra abaixo de
qualquer foto, então dá textura ao fundo sem sujar as imagens.

Por causa disso, `.opening-inner` e `.opening-title` **não** têm `z-index`:
qualquer valor ali criaria um contexto de empilhamento e prenderia o sticker
atrás dos copos. Quem carrega o `z-index: 2` são as `.line` do título, que são
justamente o que deve passar por baixo.

### As cores

`--pink`, em `:root` de `src/styles.css`, é a **única** fonte do rosa. As
fitas da faixa de serviços leem esse token em tempo de execução via
[src/tokens.js](src/tokens.js), em vez de carregar hex próprio. Sem isso, o
desenho de fundo tinha um rosa e a interface tinha outro, e mudar um não mexia
no outro.

Mudar o rosa do site inteiro é mudar `--pink` e mais nada.

### A troca do header sobre o rosa

A abertura é a **única seção colorida** do site; todo o resto é escuro. O logo
branco e o botão vazado funcionam nos dois fundos, mas o "Reservar" é rosa —
sobre o rosa da abertura ele sumiria. A classe `is-on-pink` inverte só ele,
para branco com texto rosa.

Quem liga e desliga a classe é um `IntersectionObserver` cujo `rootMargin`
encolhe a área de observação até sobrar só a altura do header. A pergunta que
ele responde é "o que está atrás do header agora?", e não "onde a seção começa
e termina" — por isso não depende de remedição nem de refresh. A primeira
tentativa, com `ScrollTrigger` medindo início e fim da seção, deixava o header
preso no tema errado dentro da faixa escura.

Pelo mesmo motivo, o rabisco e o sticker da abertura são brancos ali, e não
rosas como no resto do site.

### A paralaxe da saída

Copos e título sobem no mesmo sentido, com o título um pouco mais rápido —
eles se afastam no máximo ~40px no percurso inteiro. Movê-los em sentidos
opostos, que é a paralaxe "clássica", abre um vão de quase 100px entre o texto
e os copos bem no meio da rolagem.

A escala dos copos usa `transformOrigin: "50% 0%"`: crescendo a partir do topo,
ela não altera a distância entre a borda de cima deles e a base do título.

> Com o fundo chapado não sobrou camada de trás para contrastar, então
> a paralaxe é contida por natureza. Já passaram por ali as ondas e, depois,
> um splash de bebida nas bordas — os dois foram removidos. Ficam guardados em
> [docs/waves.js](docs/waves.js) e [docs/splash.png](docs/splash.png) caso a
> profundidade faça falta.

> **Peso da foto**: `public/brand/copos.png` tem 1,8 MB e é a maior imagem do
> primeiro quadro. Vale converter:
> ```bash
> npx --yes sharp-cli -i public/brand/copos.png -o public/brand -- webp --quality 82
> ```
> Depois troque a extensão em `index.html` (no `<img>` e no `<link rel=preload>`).

## As quatro verticais (seção 3D) — **fora do HTML no momento**

O markup está guardado em [docs/secao-verticais.html](docs/secao-verticais.html).
Colar de volta dentro do `<main>` religa tudo, inclusive o three.js, sem tocar
em JavaScript: `src/main.js` procura por `.hero` e só monta a cena se achar.

Esse desligamento tem peso real. `src/scene.js` entra por `import()` dinâmico,
então com a seção fora o bundle principal fica em **139 kB** (52 kB gzip) e o
three.js mais os quatro modelos ficam num chunk `scene-*.js` de 767 kB que o
navegador nunca baixa.

`.hero` tem 400vh de pista de scroll e `.hero-stage` fica `sticky` ocupando a
tela. Dentro dele:

- **`.hero-wheel`** — um círculo de 360vmax recortado em 4 fatias de ±48°, uma
  por vertical. Girar a roda 90° traz a fatia seguinte para a vertical, e a
  sobreposição de 6° entre fatias produz a divisa diagonal que varre a tela.
- **`.hero-step::after`** — o hairline rosa na borda de ataque de cada fatia.
  Como todas as fatias são quase pretas, é ele que torna o giro legível.
- **`.hero-canvas`** — a cena Three.js, onde a peça troca a cada passo.

O raio da roda (`--wheel`) e o ângulo das fatias estão amarrados: raio maior
joga os cantos da tela para um ângulo menor, o que permite fatias mais justas
sem o passo vizinho vazar no canto. Mexer em um pede recalcular o outro.

## As quatro peças

| Passo | Peça | Material |
| --- | --- | --- |
| 01 · Eventos sociais | Taça com o print `#aperteoplay` | vidro transparente |
| 02 · Shows | Copo com o shaka e o olho | plástico leitoso |
| 03 · Festivais | Sacola de pista | plástico translúcido |
| 04 · Corporativo | Copo facetado com aro rosa | vidro fumê |

Cada peça é um perfil revolucionado (`LatheGeometry`) mais uma "casca de
estampa": a mesma curva deslocada uma fração para fora, carregando a arte.
Nascendo do mesmo perfil, ela acompanha a curvatura sem deformar o print. A
sacola foge disso — é um `ExtrudeGeometry` com recorte de alça e a arte num
plano à frente.

Peça chata girando 360° passa a maior parte do tempo de perfil, então a sacola
está marcada com `sway: true` em `src/models.js` e balança em vez de girar.

### Trocar as estampas pelas artes reais

As artes atuais são **desenhadas em código** e aproximam as peças das fotos —
o shaka com o olho é a mais aproximada delas. Para usar os arquivos originais,
salve em `public/brand/` com estes nomes:

```
art-taca.png  art-copo.png  art-sacola.png  art-corporativo.png
```

PNG com fundo transparente. O código detecta o arquivo e ignora o desenho
procedural, sem mais nenhuma alteração. O tamanho da arte na peça é o
`ART_WIDTH` de `src/brand.js`, em unidades de cena, e vale para os dois
caminhos.

## Onde mexer

| O quê | Onde |
| --- | --- |
| Texto e stickers da abertura | `.opening` em `index.html` |
| Ritmo da entrada | a timeline `intro` em `src/main.js` |
| Altura dos copos na abertura | `margin` de `.opening-cups` em `src/styles.css` |
| Intensidade do granulado | `opacity` de `body::after` em `src/styles.css` |
| Rosa da marca e demais cores | `BRAND` em `src/brand.js` e `--pink` em `src/styles.css` |
| Fundo de cada passo | `--step-N` em `src/styles.css` e `STEP_COLORS` em `src/main.js` |
| Ritmo da animação | `LEAD_IN` / `TURN` / `HOLD` / `TAIL` em `src/main.js` |
| Textos dos passos | `.hero-step` em `index.html` |
| Luz e materiais | `src/scene.js` e `glass()` / `frosted()` em `src/models.js` |

Duas listas precisam andar juntas: `STEP_COLORS` (`src/main.js`) com os
`--step-N` do CSS, e a ordem de `MODELS` (`src/models.js`) com a ordem dos
`.hero-step` no HTML.

## A faixa horizontal

Sete cards que percorrem uma operação de ponta a ponta: equipe, bar montado,
cardápio e combos, caixa, baldes, copo da casa e o brinde.

A altura da seção **não** é fixa no CSS — o JS a calcula a partir da largura
real da faixa (`window.innerHeight + distância a percorrer`), então 1px de
scroll vertical vale 1px de deslocamento horizontal. Com altura fixa, cada
card novo acelerava a faixa inteira e obrigava a recalibrar o valor na mão.

Os cards sobem e descem numa onda. O Y de cada um sai da **posição horizontal
dele**, não do índice: assim a onda fica parada no espaço e os cards é que
atravessam por ela. Amarrado ao índice daria um zigue-zague rígido andando
junto com a fileira.

O comprimento da onda (`COMPRIMENTO` em `src/main.js`) precisa ser bem maior
que o espaçamento entre cards (~470px). Perto dele, vizinhos caem em fase
oposta e o resultado lê como zigue-zague — 2400px cobre cerca de cinco cards
por ciclo.

Os centros dos cards são medidos uma vez por refresh, e não a cada quadro: ler
`getBoundingClientRect` dos sete no meio da rolagem forçaria recálculo de
layout.

As fitas rosas de fundo (as "minhocas") vêm de [src/ribbons.js](src/ribbons.js).
São paths preenchidos, não linhas grossas: `preserveAspectRatio="none"` estica
o desenho para cobrir qualquer tela, e stroke esticado assim sai com espessura
irregular. A inclinação fica no container e o deslocamento no track, para os
dois transforms não brigarem.

Os cards têm fundo opaco de propósito: sem ele as fitas atravessam o card
enquanto a foto ainda não carregou.

## O reel

Três vídeos verticais lado a lado (`public/media/reel-1..3.mp4`), alinhados e
sem animação de entrada. Em telas abaixo de 760px eles empilham numa coluna.

Os vídeos **não** têm `autoplay`: quem dá play é um `IntersectionObserver`,
com 25% de margem para começarem antes de entrar em cena. Com `autoplay`, os
três streams começariam a decodificar no carregamento da página, muito antes
de alguém chegar na seção.

### O texto com franja cromática

`#aperteoplay` atravessa o meio das três colunas. O efeito imita o
[Liquid Chroma](https://amusing-grocery-573318.framer.app/), que é WebGL; aqui
é filtro SVG, para não trazer de volta um bundle de 767 kB só por causa dele.

São **duas cópias do mesmo texto** no mesmo lugar: a limpa e a distorcida. O
filtro `#liquid-chroma` (no `index.html`) faz duas coisas — `feDisplacementMap`
com turbulência deforma os glifos, e os canais R/G/B saem deslocados por
`feOffset`, o que produz a franja colorida.

Máscaras **complementares** revelam uma cópia e escondem a outra no mesmo
ponto: é isso que faz parecer uma lente passando por cima, em vez de duas
camadas somadas. O centro das duas é a posição do cursor, que o JS grava em
`--mx` / `--my`. Escrever só duas custom properties por evento evita
recalcular layout — o navegador apenas repinta a máscara.

Sem ponteiro (toque, teclado) as variáveis ficam em `50%` e o efeito descansa
no centro do texto.

> Já testamos duas coisas que não vingaram: sangrar um vídeo só na largura da
> tela (o arquivo é vertical, a tela 16:9 cortava dois terços da altura) e uma
> animação de abertura das molduras por scroll.

O vídeo pausa quando a seção sai de vista, com 25% de margem para começar a
rodar antes de entrar em cena — assim chega em movimento em vez de aparecer
congelado no primeiro quadro.

## Fotos e vídeos

Os cards da faixa horizontal são slots de mídia: o primeiro filho de cada
`.strip-card` é um `<img class="strip-media">` (um `<video>` com a mesma classe
funciona igual) apontando para `public/media/`. A mídia preenche a moldura, o
gradiente de leitura entra por cima e o texto fica acima dos dois.

A foto fica em `z-index: -2` e o gradiente em `-1`. Com os dois no mesmo nível,
o `::before` é pintado antes dos filhos do elemento e a imagem cobriria
justamente o gradiente que existe para o texto continuar legível.

### Peso das mídias

`public/` tem 5,5 MB. Eram 14 MB — os arquivos como vieram da câmera estão
guardados em `midias-originais/`, fora de `public/`, então não sobem no build.
Para refazer qualquer passo, a fonte está lá.

O que foi feito, e por quê:

| | antes | depois | |
|---|---|---|---|
| `lineup.webp` | 2,7 MB PNG | 306 KB | era o pior: tem `preload` e é a maior imagem da primeira tela |
| 3 vídeos | 6,7 MB | 4,0 MB | 720p, sem trilha de áudio (tocam mudos) |
| 7 fotos | 4,0 MB | 944 KB | 1200px de largura; `equipe.jpg` vinha com 3024 para renderizar em 420 |

```bash
# Fotos dos cards
ffmpeg -i midias-originais/FOTO.jpg -vf "scale='min(1200,iw)':-2" -q:v 5 public/media/FOTO.jpg

# Vídeos: 720p, sem áudio, com o índice no começo do arquivo
ffmpeg -i midias-originais/reel-N.mp4 -vf "scale='min(720,iw)':-2" \
  -c:v libx264 -crf 28 -preset slow -an -movflags +faststart public/media/reel-N.mp4

# Pôster de cada vídeo (primeiro quadro)
ffmpeg -i public/media/reel-N.mp4 -vf "select=eq(n\,0),scale=480:-2" -vframes 1 -q:v 6 \
  public/media/reel-N-poster.jpg
```

O `lineup` é WebP sem fallback PNG de propósito: o site já usa `aspect-ratio`,
`svh` e `scroll-snap`, que pedem Safari 15+ — mais novo que o suporte a WebP.
Um fallback cobriria navegador nenhum que consiga renderizar o resto da página.

Depois de trocar qualquer arquivo, rode:

```bash
node scripts/corrigir-dimensoes.mjs
```

Ele relê o tamanho real de cada imagem e acerta os `width`/`height` do HTML.
Esses dois atributos são o que faz o navegador reservar o espaço antes de a
imagem chegar; defasados, a página salta no meio do carregamento.

## Acessibilidade e fallback

- `prefers-reduced-motion: reduce` desliga o Lenis, as timelines e a cena
  WebGL, e mostra só o primeiro passo estático.
- Sem WebGL, o canvas é substituído por um volume em CSS.

## Publicação

Hospedado na Vercel, importado do GitHub: cada push na `main` republica.
O `vercel.json` traz o build e dois blocos de cache. JSON não aceita
comentário, então o porquê de cada um fica aqui.

**`/assets/*` — um ano, `immutable`.** São os arquivos que o Vite gera com
hash no nome: mudou o conteúdo, muda o nome do arquivo. Não existe risco de
servir versão velha, porque uma versão nova nunca reusa o mesmo endereço.

**`/media/*` e `/brand/*` — um dia no navegador, uma semana na CDN.** Estes
mantêm o nome quando o conteúdo muda: trocar `equipe.jpg` por outra foto
guarda o mesmo endereço. Cache longo aqui deixaria a foto antiga em pé por
semanas. O `stale-while-revalidate` serve a versão em cache na hora e busca
a nova em segundo plano, então a troca aparece na visita seguinte sem
ninguém esperar download.

O `.vercelignore` vale só para deploy pelo CLI. Importado do GitHub, a
Vercel clona o repositório inteiro — `midias-originais/` incluso. Isso pesa
no clone da build, não no que o visitante baixa.
