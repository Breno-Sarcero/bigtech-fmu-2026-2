/* Testes do núcleo de cubas. Rodar: node site/js/cubas-core.test.js */
const assert = require('assert');
const C = require('./cubas-core.js');

// imagem falsa w×h: a faixa da esquerda (frac) é comida avermelhada, o resto é inox cinza
function cuba(w, h, frac) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, food = x < w * frac;
    d[i] = food ? 160 : 150; d[i + 1] = food ? 70 : 152; d[i + 2] = food ? 40 : 155; d[i + 3] = 255;
  }
  return d;
}

// 1) a proporção de comida acompanha o quanto da cuba está preenchido
[0, 0.25, 0.5, 0.85, 1].forEach(f => {
  const r = C.fillRatio(cuba(100, 60, f), 100, 60).ratio;
  assert.ok(Math.abs(r - f) < 0.03, `esperado ~${f}, veio ${r}`);
});

// 2) só a região da cuba conta
const img = cuba(200, 60, 0.5);                       // metade esquerda cheia, direita vazia
assert.ok(C.fillRatio(img, 200, 60, { x: 0, y: 0, w: 100, h: 60 }).ratio > 0.97);
assert.ok(C.fillRatio(img, 200, 60, { x: 100, y: 0, w: 100, h: 60 }).ratio < 0.03);

// 3) sombra preta é ignorada
const preto = new Uint8ClampedArray(10 * 10 * 4).fill(0);
assert.strictEqual(C.fillRatio(preto, 10, 10).pixels, 0);

// 4) faixas de aviso
assert.strictEqual(C.status(85), 'ok');
assert.strictEqual(C.status(45), 'atencao');
assert.strictEqual(C.status(12), 'repor');
assert.strictEqual(C.status(25), 'atencao');          // 25 já não é "repor"

// 5) reposições: subida grande conta; oscilação pequena não
const serie = [100, 80, 55, 30, 12, 95, 70, 50, 28, 100, 90];
assert.deepStrictEqual(C.detectRefills(serie), [5, 9]);
assert.deepStrictEqual(C.detectRefills([100, 98, 101, 97, 100]), []);

// 6) resumo: nº de reposições, intervalo médio e tempo para esvaziar
const r = C.summarize(serie, 5);
assert.strictEqual(r.refills, 2);
assert.strictEqual(r.meanGapMin, 20);                  // 4 leituras × 5 min
assert.ok(r.minToEmptyFromFull > 0 && r.minToEmptyFromFull < 120);
assert.strictEqual(C.summarize([50, 50, 50], 5).refills, 0);
assert.strictEqual(C.summarize([50, 50, 50], 5).meanGapMin, null);

console.log('cubas-core: todos os testes passaram');
