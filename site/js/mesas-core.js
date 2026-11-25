/* Núcleo do módulo de mesas (sem DOM, testável em Node).
   Entrada: caixas detectadas pelo modelo (pessoas e objetos) já em coordenadas do quadro.
   Regras (todas verificáveis, nenhuma é "mágica"):
   - GARÇOM: pessoa cuja cor do tronco é parecida com a cor de uniforme escolhida pelo gerente.
   - CLIENTE: qualquer outra pessoa dentro da mesa.
   - MESA SUJA: objetos de mesa (copo, prato/tigela, garrafa, talher) sobrando depois que os clientes saem.
   - ATENDIDA: garçom por perto da mesa por alguns segundos enquanto há cliente sem atendimento. */
(function (root) {
  const ITEMS = new Set(['cup', 'bowl', 'bottle', 'wine glass', 'fork', 'knife', 'spoon']);
  const ABSENT_SECS = 8;           // tolera falha de detecção antes de dar a pessoa/objeto como ausente
  const WAITER_MARGIN = 40;        // o garçom conta como "na mesa" um pouco antes da borda

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // região do tronco: faixa central do corpo, onde fica a camisa do uniforme
  function torso(b) { return { x: b.x + b.w * 0.3, y: b.y + b.h * 0.22, w: b.w * 0.4, h: b.h * 0.3 }; }

  const inside = (z, px, py, m) => px >= z.x - m && px <= z.x + z.w + m && py >= z.y - m && py <= z.y + z.h + m;

  // Separa as detecções em clientes, garçons e objetos.
  // colorAt(região) devolve [r,g,b] médio ou null; uniform = [r,g,b] ou null (sem garçom configurado).
  function split(dets, colorAt, uniform, tol) {
    const out = { customers: [], waiters: [], items: [] };
    dets.forEach(d => {
      if (d.cls === 'person') {
        let waiter = false;
        if (uniform) { const c = colorAt(torso(d), d); waiter = !!c && dist(c, uniform) <= tol; }
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
        if (z.waiterSecs >= cfg.waiterSecs) { serve(z, vt, hooks, true); break; }
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

  const api = { ITEMS, dist, torso, split, assign, init, step, serve, mmss };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MesasCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
