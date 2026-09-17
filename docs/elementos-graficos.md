# Elementos gráficos desligados

Faíscas e respingos, no traço dos posts da Playbar. Removidos do site; ficam
aqui para voltar sem precisar redesenhar.

## 1. Os símbolos

Colar logo depois de `<body>` em `index.html`. Ficam como `<symbol>` e são
reaproveitados por `<use>`: o caminho existe uma vez só e cada aparição é um
nó leve, com a própria cor e posição.

```html
<svg class="sr-only" aria-hidden="true" focusable="false">
  <symbol id="faisca" viewBox="0 0 100 100">
    <path
      d="M50 1C53.5 32 68 46.5 99 50C68 53.5 53.5 68 50 99C46.5 68 32 53.5 1 50C32 46.5 46.5 32 50 1Z"
    />
  </symbol>

  <!-- Respingo: cápsulas de pontas redondas girando em torno do centro, em
       leque. Cada <rect> nasce deitado à direita do centro e o `rotate` em
       torno de (50 50) leva ela para o ângulo dela — assim comprimento e
       distância ficam legíveis nos próprios atributos. -->
  <symbol id="respingo" viewBox="0 0 100 100">
    <rect x="20" y="46.5" width="30" height="7" rx="3.5" transform="rotate(-168 50 50)" />
    <rect x="27" y="47" width="19" height="6" rx="3" transform="rotate(-139 50 50)" />
    <rect x="22" y="46" width="32" height="8" rx="4" transform="rotate(-108 50 50)" />
    <rect x="29" y="47.5" width="16" height="5" rx="2.5" transform="rotate(-88 50 50)" />
    <rect x="21" y="46" width="29" height="8" rx="4" transform="rotate(-58 50 50)" />
    <rect x="30" y="47.5" width="15" height="5" rx="2.5" transform="rotate(-24 50 50)" />
    <rect x="24" y="46.5" width="24" height="7" rx="3.5" transform="rotate(8 50 50)" />
  </symbol>
</svg>
```

## 2. Onde cada um aparecia

```html
<!-- em .opening, antes de .opening-inner -->
<svg class="faisca faisca--abertura" aria-hidden="true"><use href="#faisca" /></svg>

<!-- em .reel, antes de .reel-stage -->
<svg class="faisca faisca--reel-topo" aria-hidden="true"><use href="#faisca" /></svg>
<svg class="faisca faisca--reel-base faisca--vazada" aria-hidden="true">
  <use href="#faisca" />
</svg>

<!-- em .plain, antes do kicker -->
<svg class="faisca faisca--sobre" aria-hidden="true"><use href="#faisca" /></svg>
```

Os respingos precisavam de um wrapper em volta da foto dos copos, porque
posição e tamanho eram em % **dele**, e não da viewport — ancorados na seção,
descolariam da borda do copo quando a foto mudasse de tamanho:

```html
<div class="opening-cups-wrap">
  <img class="opening-cups" data-opening-cups src="/brand/copos.png" ... />
  <svg class="respingo respingo--esquerda" aria-hidden="true"><use href="#respingo" /></svg>
  <svg class="respingo respingo--direita" aria-hidden="true"><use href="#respingo" /></svg>
</div>
```

> Com o wrapper de volta, a paralaxe da abertura precisa mirar **ele**, e não
> a `<img>`. Animando só a imagem, os respingos ficam parados enquanto os
> copos se movem e descolam da borda. Em `src/main.js`:
> ```js
> const cupsImg = document.querySelector("[data-opening-cups]"); // só para o load
> const cups = cupsImg.closest(".opening-cups-wrap");            // alvo das animações
> ```
> E `.opening-cups-wrap` assume a largura, as margens e o `z-index: 3` que
> hoje estão na `.opening-cups`; a `<img>` fica com `width: 100%`.

## 3. O CSS

`.reel` e `.plain` precisam de `position: relative` para as faíscas se
ancorarem na seção, e não na viewport.

```css
/* A cor sai de `color` e o desenho usa `currentColor`: cada aparição herda o
   tom da seção sem precisar de regra de preenchimento própria. */
.faisca {
  position: absolute;
  color: var(--pink);
  fill: currentColor;
  pointer-events: none;
}

/* `vector-effect` mantém a espessura do traço mesmo com o SVG esticado — sem
   ele, faíscas grandes teriam a linha proporcionalmente mais grossa. */
.faisca--vazada {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  vector-effect: non-scaling-stroke;
}

.faisca--abertura {
  z-index: 4;
  top: clamp(96px, 15svh, 180px);
  right: clamp(16px, 7vw, 120px);
  width: clamp(34px, 5vw, 74px);
  aspect-ratio: 1;
  color: var(--white);
}

.faisca--reel-topo {
  top: clamp(24px, 5svh, 64px);
  left: clamp(16px, 6vw, 110px);
  width: clamp(28px, 4vw, 62px);
  aspect-ratio: 1;
}

.faisca--reel-base {
  bottom: clamp(20px, 4svh, 56px);
  right: clamp(16px, 7vw, 130px);
  width: clamp(36px, 5.5vw, 88px);
  aspect-ratio: 1;
}

.faisca--sobre {
  top: clamp(40px, 8svh, 110px);
  right: clamp(20px, 10vw, 180px);
  width: clamp(30px, 4.5vw, 70px);
  aspect-ratio: 1;
}

/* Tamanho e posição em % do wrapper dos copos, nunca da viewport. */
.respingo {
  position: absolute;
  width: 27%;
  aspect-ratio: 1;
  color: var(--white);
  fill: currentColor;
  pointer-events: none;
}

.respingo--esquerda {
  top: 0%;
  left: -9%;
}

/* Espelhado para o leque abrir para fora dos dois lados, e mais abaixo que o
   da esquerda: na altura do topo ele esbarraria no sticker @playbar. */
.respingo--direita {
  top: 20%;
  right: -8%;
  width: 22%;
  transform: scaleX(-1) rotate(-14deg);
}
```
