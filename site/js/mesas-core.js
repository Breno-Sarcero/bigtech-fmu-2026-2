/* Núcleo do módulo de mesas (sem DOM, testável em Node).
   Entrada: caixas detectadas pelo modelo (pessoas e objetos) já em coordenadas do quadro.
   Regras (todas verificáveis, nenhuma é "mágica"):
   - GARÇOM: pessoa cuja cor do tronco é parecida com a cor de uniforme escolhida pelo gerente.
   - CLIENTE: qualquer outra pessoa dentro da mesa.
   - MESA SUJA: objetos de mesa (copo, prato/tigela, garrafa, talher) sobrando depois que os clientes saem.
   - ATENDIDA: alguém em pé junto da mesa por alguns segundos (sem só passar) depois que os clientes já sentaram e assentaram. */
(function (root) {
  const ITEMS = new Set(['cup', 'bowl', 'bottle', 'wine glass', 'fork', 'knife', 'spoon']);
  const ABSENT_SECS = 8;           // tolera falha de detecção antes de dar a pessoa/objeto como ausente
  const WAITER_MARGIN = 40;        // o garçom conta como "na mesa" um pouco antes da borda
  const SETTLE_SECS = 12;          // cliente que acabou de chegar ainda está de pé arrumando a cadeira: só vale atendimento depois que a mesa assentou

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // região do tronco: faixa central do corpo, onde fica a camisa do uniforme
  function torso(b) { return { x: b.x + b.w * 0.3, y: b.y + b.h * 0.22, w: b.w * 0.4, h: b.h * 0.3 }; }

  const inside = (z, px, py, m) => px >= z.x - m && px <= z.x + z.w + m && py >= z.y - m && py <= z.y + z.h + m;

  // Pessoa em pé tem a caixa bem mais alta que larga; sentada, a caixa fica mais "quadrada".
  const STANDING_RATIO = 2.0;
  const isStanding = d => d.h / d.w >= STANDING_RATIO;

  // Separa as detecções em clientes, garçons e objetos.
  // Garçom: se o gerente escolheu a cor do uniforme, vale a cor; sem cor escolhida, vale a postura
  // (pessoa em pé junto à mesa). A cor é um ajuste fino, a postura funciona sem configurar nada.
  // colorAt(região) devolve [r,g,b] médio ou null; uniform = [r,g,b] ou null.
  function split(dets, colorAt, uniform, tol) {
    const out = { customers: [], waiters: [], items: [] };
    dets.forEach(d => {
      if (d.cls === 'person') {
        let waiter;
        if (uniform) { const c = colorAt(torso(d), d); waiter = !!c && dist(c, uniform) <= tol; }
        else waiter = isStanding(d);
        (waiter ? out.waiters : out.customers).push(d);
      } else if (ITEMS.has(d.cls)) out.items.push(d);
    });
    return out;
  }

  // Distribui o que foi visto entre as mesas. dtReal = segundos reais desde a última detecção.
  function assign(zones, s, dtReal) {
    zones.forEach(z => {
      z.persons = s.customers.filter(d => inside(z, d.x + d.w / 2, d.y + d.h * 0.75, 0)).length;
      z.items = s.items.filter(d => inside(z, d.x + d.w / 2, d.y + d.h / 2, 0)).length;
      const w = s.waiters.some(d => inside(z, d.x + d.w / 2, d.y + d.h * 0.75, WAITER_MARGIN));
      z.waiterSecs = w ? (z.waiterSecs || 0) + dtReal : 0;
    });
  }

  // ---------- detecção automática das mesas ----------
  // 1) o modelo reconhece "dining table": cada caixa vira uma mesa (com folga para os lugares).
  // 2) se a câmera não enxerga a mesa (muito alto, coberta por pratos), clientes sentados que
  //    ficam juntos por alguns quadros formam uma mesa "inferida".
  const MAX_ZONES = 16, INFER_HITS = 4, TABLE_MIN_SCORE = 0.35, MIN_PEOPLE_INFER = 2;
  function iou(a, b) {
    const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
    const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    return i / ((a.w * a.h + b.w * b.h - i) || 1);
  }
  function grow(b, f, W, H) {
    const dx = b.w * f / 2, dy = b.h * f / 2, x = Math.max(0, b.x - dx), y = Math.max(0, b.y - dy);
    return { x, y, w: Math.min(W - x, b.w + 2 * dx), h: Math.min(H - y, b.h + 2 * dy) };
  }
  // zones: mesas já existentes; dets: caixas do quadro; track: objeto que guarda candidatas entre quadros.
  // Atualiza as mesas automáticas existentes e devolve as novas ({x,y,w,h,auto}) para o chamador criar.
  function autoZones(zones, dets, track, W, H) {
    const out = [];
    dets.filter(d => d.cls === 'dining table' && d.score >= TABLE_MIN_SCORE).forEach(d => {
      const t = grow(d, 0.15, W, H);
      const z = zones.find(q => q.auto && iou(q, t) > 0.2);
      if (z) { ['x', 'y', 'w', 'h'].forEach(k => { z[k] = z[k] * 0.7 + t[k] * 0.3; }); z.auto = 'mesa'; return; }
      if (zones.some(q => iou(q, t) > 0.2) || out.some(o => iou(o, t) > 0.2) || zones.length + out.length >= MAX_ZONES) return;
      out.push(Object.assign(t, { auto: 'mesa' }));
    });
    // clientes sentados fora de qualquer mesa conhecida
    const all = zones.concat(out);
    const lone = dets.filter(d => d.cls === 'person' && !isStanding(d) && !all.some(z => inside(z, d.x + d.w / 2, d.y + d.h * 0.75, 0)));
    const clusters = [];
    lone.forEach(p => {
      const gap = Math.max(140, p.w * 2);
      const c = clusters.find(c => Math.hypot((c.x + c.w / 2) - (p.x + p.w / 2), (c.y + c.h / 2) - (p.y + p.h / 2)) < gap + Math.max(c.w, c.h) / 2);
      if (c) { const x1 = Math.min(c.x, p.x), y1 = Math.min(c.y, p.y), x2 = Math.max(c.x + c.w, p.x + p.w), y2 = Math.max(c.y + c.h, p.y + p.h); Object.assign(c, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, n: c.n + 1 }); }
      else clusters.push({ x: p.x, y: p.y, w: p.w, h: p.h, n: 1 });
    });
    track.pending = track.pending || [];
    const seen = new Set();
    clusters.forEach(c => {
      const p = track.pending.find(q => iou(q.box, c) > 0.25);
      if (p) { p.box = c; p.hits++; seen.add(p); } else { const n = { box: c, hits: 1, miss: 0 }; track.pending.push(n); seen.add(n); }
    });
    track.pending = track.pending.filter(p => { if (!seen.has(p)) p.miss++; return p.miss <= 3; });
    track.pending = track.pending.filter(p => {
      if (p.hits < INFER_HITS) return true;
      if (p.box.n < MIN_PEOPLE_INFER) return false;   // uma pessoa sozinha não basta: evita falso positivo (cozinha, fila)
      const t = grow(p.box, 0.3, W, H);
      if (zones.length + out.length < MAX_ZONES && !zones.concat(out).some(q => iou(q, t) > 0.2)) out.push(Object.assign(t, { auto: 'inferida' }));
      return false;
    });
    return out;
  }

  function init(z, vt) {
    Object.assign(z, { state: 'free', persons: 0, items: 0, waiterSecs: 0, tSince: vt, lastSeen: -999, lastItem: -999, alerted: false });
  }

  // Estados: free → wait (cliente sem atendimento) → served → dirty (clientes saíram, sobrou objeto) → free.
  // hooks.log(msg, ok) recebe os alertas. cfg: thr (min), dirty (min), waiterSecs (s).
  function step(z, vt, cfg, hooks) {
    const present = z.persons > 0;
    if (present) z.lastSeen = vt;
    if (z.items > 0) z.lastItem = vt;
    const absent = vt - z.lastSeen > ABSENT_SECS;
    const itemsOn = z.items > 0 || vt - z.lastItem <= ABSENT_SECS;
    const fmt = n => String(n).replace('.', ',');
    switch (z.state) {
      case 'free':
        if (present) { z.state = 'wait'; z.tOcc = vt; z.tSince = vt; z.alerted = false; }
        break;
      case 'wait':
        if (z.waiterSecs >= cfg.waiterSecs && vt - z.tOcc >= SETTLE_SECS) { serve(z, vt, hooks, true); break; }
        if (absent) { leave(z, vt, itemsOn, hooks); break; }
        if (!z.alerted && vt - z.tSince > cfg.thr * 60) { z.alerted = true; hooks.log('ALERTA ' + z.name + ': ' + fmt(cfg.thr) + ' min sem atendimento. Avisar o metre da praça.'); }
        break;
      case 'served':
        if (absent) leave(z, vt, itemsOn, hooks);
        break;
      case 'dirty':
        if (present) { z.state = 'wait'; z.tOcc = vt; z.tSince = vt; z.alerted = false; break; }
        if (!itemsOn) { z.state = 'free'; z.tSince = vt; z.alerted = false; hooks.log(z.name + ' limpa e liberada (objetos retirados).', true); break; }
        if (!z.alerted && vt - z.tSince > cfg.dirty * 60) { z.alerted = true; hooks.log('ALERTA ' + z.name + ': suja há ' + cfg.dirty + ' min. Enviar limpeza.'); }
        break;
    }
  }
  function leave(z, vt, itemsOn, hooks) {
    z.alerted = false; z.tSince = vt;
    if (itemsOn) { z.state = 'dirty'; hooks.log(z.name + ' vagou: ainda há objetos na mesa, aguardando limpeza.', true); }
    else z.state = 'free';
  }
  function serve(z, vt, hooks, auto) {
    if (z.state !== 'wait') return;
    z.state = 'served'; z.alerted = false;
    hooks.log(z.name + (auto ? ' atendida (garçom detectado)' : ' atendida') + ' após ' + mmss(vt - z.tOcc) + '.', true);
    z.tSince = vt;
  }
  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }

  const api = { ITEMS, dist, torso, isStanding, split, assign, autoZones, iou, init, step, serve, mmss };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MesasCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
