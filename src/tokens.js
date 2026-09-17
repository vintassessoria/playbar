/**
 * Ponte entre os tokens de cor do CSS e o JavaScript.
 *
 * Os desenhos de fundo (ondas e fitas) precisam das cores da marca em hex,
 * e cravar o valor neles criaria uma segunda verdade: mudar `--pink` no CSS
 * deixaria o fundo com outro tom. Aqui o CSS continua sendo a única fonte.
 */

/**
 * @param {string} name      nome da custom property, com os dois traços
 * @param {string} fallback  usado se o token não existir
 */
export function token(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}
