# Logos das marcas

As doze logos da marquise. Trocar ou acrescentar uma marca não exige mexer em
código.

## Nomes dos arquivos

O nome tem que bater com o `data-marca` do `<li>` em `index.html`:

```
absolut          beefeater      campari       casillero-del-diablo
chivas           heineken       jack-daniels  jose-cuervo
red-bull         sagatiba       spaten        tanqueray
```

Extensão `.png` ou `.svg`. O código procura o PNG primeiro. Para usar vetor
numa marca, ponha o `.svg` e **apague o `.png` dela**.

A ordem não é gosto, é economia. Servidor de site estático costuma responder
o `index.html` para caminho que não existe, em vez de um 404 seco — então
procurar um `.svg` que não está lá baixava a página inteira de volta, 26 KB
por marca. Eram ~300 KB jogados fora antes de a primeira logo aparecer, sem
sinal nenhum: a decodificação falhava, o código caía no PNG e tudo parecia
funcionar.

## De onde vieram estes arquivos

Do seeklogo.com, que serve PNG de preview a 600px **com fundo branco chapado,
sem canal alpha**. Jogado direto na seção escura, cada um vira um cartão
branco. Os arquivos aqui já passaram por `scripts/preparar-logos.mjs`, que
recorta o fundo pela luminância, corta na caixa do conteúdo e reduz para 160px
de altura — 172 kB para as doze.

Para preparar um arquivo novo:

```bash
node scripts/preparar-logos.mjs <pasta-com-os-png> public/brand/marcas
```

O script assume tinta escura sobre fundo claro. Um arquivo que já venha branco
sobre transparente passa intacto; um arquivo branco sobre fundo escuro sai
vazio — inverta antes.

## Como funciona na página

O nome da marca fica no HTML e só é substituído **se a imagem carregar**. Sem
os arquivos, a marquise mostra os nomes em texto — nunca um ícone quebrado. O
nome também vira o `alt` da imagem, então o leitor de tela continua lendo a
marca.

As logos são achatadas para branco por CSS (`brightness(0) invert(1)`). Os
arquivos daqui já são brancos, então o filtro não muda nada neles; ele existe
para o dia em que entrar uma logo colorida vinda de um press kit — sem ele,
uma marca em cor destoaria das outras onze. Se quiser as cores originais,
remova o `filter` de `.marcas-lista img` em `src/styles.css`.

A altura de cada logo é calculada por peso óptico no `trocarLogosDasMarcas()`
(`src/interacoes.js`), e não fixada no CSS: um rótulo retrato como o do Jack
Daniel's e um letreiro largo como o do Casillero del Diablo precisam de
alturas bem diferentes para ocuparem a mesma presença na fita.

## Antes de publicar

São marcas registradas de terceiros, e o seeklogo é um agregador — **não é
distribuidor autorizado de nenhuma delas**. O arquivo continua sendo marca
registrada independentemente de onde foi baixado. Vale confirmar três coisas:

- Se vocês têm autorização para exibir cada logo. O caminho mais rápido é o
  distribuidor ou representante comercial de cada marca, que costuma ter o kit
  de identidade pronto e a autorização implícita na relação comercial.
- Que o manual de uso de cada marca permite a alteração de cor. O achatamento
  para branco é, tecnicamente, uma alteração, e vários manuais proíbem.
- Se o texto da seção não sugere parceria oficial. Hoje ele diz "marcas que
  passam pelo balcão", que descreve o que vocês servem sem afirmar contrato.

Um detalhe que vale registrar: as entradas de Red Bull que existiam no
seeklogo foram removidas de lá (as páginas devolvem `removed-logo.png`), o que
sugere que a marca reclama ativamente. A única que restou é a que está aqui.
