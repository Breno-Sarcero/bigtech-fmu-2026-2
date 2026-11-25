/* Testes do núcleo de mesas. Rodar: node site/js/mesas-core.test.js */
const assert = require('assert');
const M = require('./mesas-core.js');

const BLUE = [20, 60, 160];                         // uniforme escolhido
const colorAt = (region, d) => d.shirt || [200, 190, 180]; // cor "vista" no tronco (campo falso para o teste)
const person = (x, y, shirt) => ({ cls: 'person', x, y, w: 60, h: 160, shirt });
const cup = (x, y) => ({ cls: 'cup', x, y, w: 20, h: 20 });
const mk = () => { const z = { name: 'Mesa 1', x: 100, y: 100, w: 200, h: 150 }; M.init(z, 0); return z; };
const cfg = { thr: 2, dirty: 5, waiterSecs: 2 };
const logs = []; const hooks = { log: (m) => logs.push(m) };
const tick = (z, dets, vt, dt = 0.5) => { M.assign([z], M.split(dets, colorAt, BLUE, 60), dt); M.step(z, vt, cfg, hooks); };

// 1) separa garçom de cliente pela cor do uniforme
let s = M.split([person(0, 0, [25, 55, 150]), person(0, 0, [210, 200, 190])], colorAt, BLUE, 60);
assert.strictEqual(s.waiters.length, 1); assert.strictEqual(s.customers.length, 1);
// sem uniforme configurado, todo mundo é cliente
s = M.split([person(0, 0, BLUE)], colorAt, null, 60);
assert.strictEqual(s.customers.length, 1); assert.strictEqual(s.waiters.length, 0);
// objetos de mesa entram, outros ignorados
s = M.split([cup(0, 0), { cls: 'chair', x: 0, y: 0, w: 5, h: 5 }], colorAt, null, 60);
assert.strictEqual(s.items.length, 1);

// 2) cliente sentou, ninguém atendeu: alerta aos 2 min e só uma vez
let z = mk(); let vt = 0;
for (; vt < 125; vt += 1) tick(z, [person(150, 100)], vt);
assert.strictEqual(z.state, 'wait'); assert.ok(z.alerted);
assert.strictEqual(logs.filter(l => l.startsWith('ALERTA')).length, 1);

// 3) garçom na mesa por 2 s reais → atendida automaticamente
logs.length = 0; z = mk();
for (vt = 0; vt < 10; vt += 1) tick(z, [person(150, 100)], vt);
for (let i = 0; i < 5; i++) { vt += 1; tick(z, [person(150, 100), person(260, 100, [25, 55, 150])], vt, 0.5); }
assert.strictEqual(z.state, 'served', 'garçom deveria marcar atendimento: ' + z.state);

// 4) clientes saem com copo na mesa → suja; copo retirado → livre sozinho
logs.length = 0; z = mk();
for (vt = 0; vt < 20; vt++) tick(z, [person(150, 100), cup(200, 180)], vt);
z.state = 'served'; z.tSince = vt;
for (let i = 0; i < 12; i++) { vt++; tick(z, [cup(200, 180)], vt); }
assert.strictEqual(z.state, 'dirty');
for (let i = 0; i < 12; i++) { vt++; tick(z, [], vt); }
assert.strictEqual(z.state, 'free');

// 5) mesa suja esquecida gera alerta após o limite
z = mk(); logs.length = 0;
for (vt = 0; vt < 20; vt++) tick(z, [person(150, 100), cup(200, 180)], vt);
z.state = 'served'; z.tSince = vt;
for (let i = 0; i < 12; i++) { vt++; tick(z, [cup(200, 180)], vt); }
const t0 = vt;
for (; vt < t0 + 320; vt++) tick(z, [cup(200, 180)], vt);
assert.ok(logs.some(l => l.includes('suja há 5 min')), 'faltou alerta de mesa suja');

// 6) cliente que sai sem ser atendido e sem deixar objeto: mesa volta a livre sem alerta de sujeira
z = mk(); logs.length = 0;
for (vt = 0; vt < 15; vt++) tick(z, [person(150, 100)], vt);
for (let i = 0; i < 12; i++) { vt++; tick(z, [], vt); }
assert.strictEqual(z.state, 'free');

// 7) garçom passando longe não atende
z = mk();
for (vt = 0; vt < 10; vt++) tick(z, [person(150, 100)], vt);
for (let i = 0; i < 10; i++) { vt++; tick(z, [person(150, 100), person(700, 100, [25, 55, 150])], vt, 0.5); }
assert.strictEqual(z.state, 'wait');

console.log('mesas-core: todos os testes passaram');
