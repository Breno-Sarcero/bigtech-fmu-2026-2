/* Núcleo da análise de cubas do buffet (sem DOM, testável em Node).
   Ideia: uma câmera sobre o buffet vê cada cuba de inox. Onde há comida, a cor tem saturação;
   onde a cuba está vazia, aparece o inox (cinza, pouca saturação). A proporção de "comida" na
   área da cuba é um indicador do nível. É área visível, não volume: serve para avisar, não para pesar. */
(function (root) {
  const REPOR_ABAIXO = 25;      // % : abaixo disso, avisar que é hora de repor
  const ATENCAO_ABAIXO = 50;    // % : abaixo disso, ficar de olho
  const SALTO_REPOSICAO = 25;   // pontos: subida entre duas leituras que conta como reposição

  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    return [0, mx ? d / mx : 0, mx];   // só saturação e brilho importam aqui
  }

  // data: RGBA (Uint8ClampedArray ou array); w, h: tamanho da imagem; region: {x,y,w,h} da cuba.
  // Devolve { ratio (0..1), pixels } onde ratio = comida / (comida + inox visível).
  function fillRatio(data, w, h, region) {
    const r = region || { x: 0, y: 0, w, h };
    let food = 0, steel = 0;
    for (let y = Math.max(0, r.y | 0); y < Math.min(h, (r.y + r.h) | 0); y++) {
      for (let x = Math.max(0, r.x | 0); x < Math.min(w, (r.x + r.w) | 0); x++) {
        const i = (y * w + x) * 4;
        const [, s, v] = rgb2hsv(data[i], data[i + 1], data[i + 2]);
        if (v < 0.08) continue;                 // sombra profunda: ignora
        if (s < 0.18) steel++; else food++;     // pouca saturação = inox; senão, comida
      }
    }
    const n = food + steel;
    return { ratio: n ? food / n : 0, pixels: n };
  }

  // Variante calibrada: em vez de supor "inox = cinza", usa a cor do inox daquela cuba vazia (ref = [r,g,b], lida numa área
  // vazia) e conta como comida o que se afasta dela mais que tol (distância RGB). Serve para fotos reais, em que o inox
  // tem reflexo quente e a saturação não separa bem. É a calibração de "cuba vazia" que a fase 0 faria uma vez por câmera.
  function fillRatioRef(data, w, h, region, ref, tol) {
    const r = region, lim = (tol || 60) * (tol || 60);
    let food = 0, n = 0;
    for (let y = Math.max(0, r.y | 0); y < Math.min(h, (r.y + r.h) | 0); y++) {
      for (let x = Math.max(0, r.x | 0); x < Math.min(w, (r.x + r.w) | 0); x++) {
        const i = (y * w + x) * 4, dr = data[i] - ref[0], dg = data[i + 1] - ref[1], db = data[i + 2] - ref[2];
        n++; if (dr * dr + dg * dg + db * db > lim) food++;
      }
    }
    return { ratio: n ? food / n : 0, pixels: n };
  }
  // cor média de uma região (para pegar a referência do inox vazio)
  function meanColor(data, w, h, region) {
    let R = 0, G = 0, B = 0, n = 0;
    for (let y = Math.max(0, region.y | 0); y < Math.min(h, (region.y + region.h) | 0); y++)
      for (let x = Math.max(0, region.x | 0); x < Math.min(w, (region.x + region.w) | 0); x++) { const i = (y * w + x) * 4; R += data[i]; G += data[i + 1]; B += data[i + 2]; n++; }
    return n ? [R / n, G / n, B / n] : [0, 0, 0];
  }

  // ok / atenção / repor, a partir do nível em % (0..100)
  function status(pct) { return pct < REPOR_ABAIXO ? 'repor' : pct < ATENCAO_ABAIXO ? 'atencao' : 'ok'; }

  // Detecta reposições numa série de níveis (%) lidos em intervalos regulares:
  // uma reposição é uma subida de pelo menos SALTO_REPOSICAO pontos entre duas leituras seguidas.
  function detectRefills(series, salto) {
    const s = salto || SALTO_REPOSICAO, idx = [];
    for (let i = 1; i < series.length; i++) if (series[i] - series[i - 1] >= s) idx.push(i);
    return idx;
  }

  // Resumo de uma cuba: reposições, intervalo médio entre elas e ritmo de consumo (pontos por minuto)
  // no trecho em que o nível só desce. stepMin = minutos entre leituras.
  function summarize(series, stepMin) {
    const refills = detectRefills(series);
    const gaps = refills.slice(1).map((v, i) => (v - refills[i]) * stepMin);
    let drop = 0, mins = 0;
    for (let i = 1; i < series.length; i++) if (series[i] < series[i - 1]) { drop += series[i - 1] - series[i]; mins += stepMin; }
    const rate = mins ? drop / mins : 0;                 // % por minuto
    return {
      refills: refills.length, refillAt: refills,
      meanGapMin: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
      minToEmptyFromFull: rate ? 100 / rate : null
    };
  }

  const api = { fillRatio, fillRatioRef, meanColor, status, detectRefills, summarize, REPOR_ABAIXO, ATENCAO_ABAIXO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CubasCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
