/* Testes da simulação de fila. Rodar: node site/js/fila-core.test.js
   Guardam as duas calibrações que a página afirma: concentração no pico e pico de espera. */
const assert = require('assert');
const F = require('./fila-core.js');

const BASE = { clientes: 600, servidores: 3, servSeg: 44, pctChurras: 0.8, permMin: 40 };   // igual a site/js/fila.js
const r = F.simulate(BASE, 40);

// 1) o pico (11h50–13h30) concentra de 70% a 80% das chegadas (estimativa da equipe)
assert.ok(r.shareNoPico >= 0.70 && r.shareNoPico <= 0.80, 'concentração no pico fora de 70–80%: ' + r.shareNoPico);

// 2) o pico da espera fica perto dos ~4 min relatados pela empresa ("chegou a bater 4 minutos")
const pico = Math.max(...r.espera);
assert.ok(pico >= 3.5 && pico <= 4.8, 'pico da espera fora de 3,5–4,8 min: ' + pico);

// 3) um atendente a mais reduz o pico de espera
const mais = F.simulate(Object.assign({}, BASE, { servidores: 4 }), 40);
assert.ok(Math.max(...mais.espera) < pico);

// 4) é determinístico: mesma entrada, mesmo resultado
assert.strictEqual(F.simulate(BASE, 40).mediaPico, r.mediaPico);

console.log('fila-core: todos os testes passaram (pico no horário de pico = ' + Math.round(r.shareNoPico * 100) + '%, pico da espera = ' + pico.toFixed(1) + ' min)');
