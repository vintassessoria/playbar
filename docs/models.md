# Modelos 3D

Coloque o arquivo aqui com o nome **`playbar.glb`**.

A cena carrega `/models/playbar.glb`. Se o arquivo não existir, o site cai
automaticamente no modelo provisório (a coqueteleira procedural) — nada quebra.

Para usar outro nome ou caminho, altere `MODEL_URL` em `src/main.js`.

## O que o loader já resolve sozinho

- **Escala e origem**: o modelo é redimensionado e recentrado automaticamente,
  então não importa se ele foi exportado em milímetros ou com o pivô no pé.
- **Draco**: geometria comprimida com Draco funciona sem configuração extra.
- **Animação embutida**: se o `.glb` tiver clipes, o scroll controla o tempo
  deles (rolar para frente avança a animação, rolar para trás volta).

## Peso do arquivo

Acima de ~5 MB a abertura começa a demorar. Para comprimir:

```bash
npx gltf-transform optimize entrada.glb public/models/playbar.glb --compress draco --texture-compress webp
```
