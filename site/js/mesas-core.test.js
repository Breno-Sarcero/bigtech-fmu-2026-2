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
// sem uniforme configurado vale a postura: pessoa sentada (caixa quase quadrada) é cliente
s = M.split([{ cls: 'person', x: 0, y: 0, w: 90, h: 100, shirt: BLUE }], colorAt, null, 60);
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

// ---------- detecção automática ----------
const W = 960, H = 540;
const table = (x, y, w = 200, h = 120, score = 0.8) => ({ cls: 'dining table', x, y, w, h, score });
const seated = (x, y) => ({ cls: 'person', x, y, w: 80, h: 100, score: 0.9 });   // caixa quase quadrada = sentado
const standing = (x, y) => ({ cls: 'person', x, y, w: 60, h: 170, score: 0.9 });  // caixa alta = em pé

// 8) sem cor de uniforme, quem está em pé é garçom e quem está sentado é cliente
s = M.split([standing(0, 0), seated(100, 0)], colorAt, null, 60);
assert.strictEqual(s.waiters.length, 1); assert.strictEqual(s.customers.length, 1);
assert.ok(M.isStanding(standing(0, 0))); assert.ok(!M.isStanding(seated(0, 0)));

// 9) mesas detectadas viram zonas, uma por mesa, sem duplicar nos quadros seguintes
let zs = []; const track = {};
let novas = M.autoZones(zs, [table(100, 100), table(500, 300)], track, W, H);
assert.strictEqual(novas.length, 2); assert.ok(novas.every(n => n.auto === 'mesa'));
zs = novas.map(n => Object.assign({ name: 'M' }, n));
novas = M.autoZones(zs, [table(102, 101), table(498, 302)], track, W, H);
assert.strictEqual(novas.length, 0, 'não deveria duplicar mesas');
assert.strictEqual(zs.length, 2);

// 10) mesa com pontuação baixa é ignorada
assert.strictEqual(M.autoZones([], [table(100, 100, 200, 120, 0.2)], {}, W, H).length, 0);

// 11) sem mesa visível: clientes sentados juntos por alguns quadros formam uma mesa inferida
zs = []; const tr2 = {}; let criadas = [];
for (let i = 0; i < 4; i++) criadas = criadas.concat(M.autoZones(zs, [seated(300, 200), seated(380, 210), seated(340, 260)], tr2, W, H));
assert.strictEqual(criadas.length, 1); assert.strictEqual(criadas[0].auto, 'inferida');
// só pessoas em pé não formam mesa
const tr3 = {}; let c3 = [];
for (let i = 0; i < 6; i++) c3 = c3.concat(M.autoZones([], [standing(300, 200), standing(380, 210)], tr3, W, H));
assert.strictEqual(c3.length, 0);
// um quadro isolado não basta
assert.strictEqual(M.autoZones([], [seated(300, 200)], {}, W, H).length, 0);
// uma única pessoa sentada, mesmo por muitos quadros, não forma mesa inferida
const tr5 = {}; let c5 = [];
for (let i = 0; i < 8; i++) c5 = c5.concat(M.autoZones([], [seated(300, 200)], tr5, W, H));
assert.strictEqual(c5.length, 0);

// 12) mesa já coberta por zona existente não é recriada pela inferência
zs = [Object.assign({ name: 'M', auto: 'mesa' }, { x: 250, y: 150, w: 300, h: 220 })]; const tr4 = {}; let c4 = [];
for (let i = 0; i < 6; i++) c4 = c4.concat(M.autoZones(zs, [seated(300, 200), seated(380, 210)], tr4, W, H));
assert.strictEqual(c4.length, 0);

// 13) limite de mesas
const muitas = Array.from({ length: 30 }, (_, i) => table((i % 6) * 150, Math.floor(i / 6) * 100, 100, 60));
assert.ok(M.autoZones([], muitas, {}, 960, 540).length <= 16);

// 14) fluxo completo sem configurar nada: cliente senta, garçom em pé chega, mesa é atendida sozinha
logs.length = 0; z = mk(); M.init(z, 0); vt = 0;
const run = dets => { M.assign([z], M.split(dets, colorAt, null, 60), 0.5); M.step(z, vt, cfg, hooks); };
for (; vt < 10; vt++) run([seated(130, 130)]);
assert.strictEqual(z.state, 'wait');
for (let i = 0; i < 6; i++) { vt++; run([seated(130, 130), standing(240, 120)]); }
assert.strictEqual(z.state, 'served', 'garçom em pé deveria atender: ' + z.state);

// 15) cliente que acabou de chegar e ainda está de pé junto da mesa NÃO conta como atendimento
logs.length = 0; z = mk(); M.init(z, 0); vt = 0;
run([seated(130, 130)]); vt++;                                   // mesa passa a ter cliente
for (let i = 0; i < 6; i++) { vt += 1; run([seated(130, 130), standing(240, 120)]); }   // alguém em pé logo em seguida (< 12 s)
assert.strictEqual(z.state, 'wait', 'chegada recente não deve marcar atendimento: ' + z.state);
// 16) quem só passa pela mesa (menos que o tempo mínimo de permanência) também não conta
logs.length = 0; z = mk(); M.init(z, 0); vt = 0;
for (; vt < 30; vt++) run([seated(130, 130)]);
run([seated(130, 130), standing(240, 120)]); vt++; run([seated(130, 130)]); vt++;   // um quadro só e sumiu
for (let i = 0; i < 20; i++) { vt++; run([seated(130, 130)]); }
assert.strictEqual(z.state, 'wait', 'quem só passa não deve atender: ' + z.state);

console.log('mesas-core: todos os testes passaram');
