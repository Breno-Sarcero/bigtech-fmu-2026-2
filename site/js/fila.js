/* Módulo 2 — interface do simulador de fila e lotação (cálculo em fila-core.js). */
(function () {
  const $ = id => document.getElementById(id);
  const ids = { fN: 'clientes', fC: 'servidores', fS: 'servSeg', fP: 'pctChurras', fT: 'permMin' };
  const SEATS = 450, META = 2.5;

  function params() {
    return { clientes: +$('fN').value, servidores: +$('fC').value, servSeg: +$('fS').value, pctChurras: +$('fP').value / 100, permMin: +$('fT').value };
  }
  const hhmm = m => { const t = 11 * 60 + m; return String(Math.floor(t / 60)).padStart(2, '0') + 'h' + String(Math.round(t % 60)).padStart(2, '0'); };

  function line(canvas, ys, opts) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const L = 52, R = 14, T = 16, B = 30;
    ctx.clearRect(0, 0, W, H);
    const xmax = opts.n - 1, ymax = opts.ymax;
    const X = i => L + (W - L - R) * i / xmax, Y = v => H - B - (H - T - B) * Math.min(v, ymax) / ymax;
    ctx.font = '12px system-ui'; ctx.fillStyle = '#8a8176'; ctx.strokeStyle = '#2b2520'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) { const v = ymax * g / 4; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(W - R, Y(v)); ctx.stroke(); ctx.fillText(opts.fmtY(v), 6, Y(v) + 4); }
    for (let m = 0; m <= opts.xTicksMax; m += 30) { const i = m / opts.step; ctx.fillText(hhmm(m), X(i) - 14, H - 8); }
    // faixa do pico (11h50–13h30)
    const px0 = X(50 / opts.step), px1 = X(150 / opts.step);
    ctx.fillStyle = 'rgba(255,90,31,.07)'; ctx.fillRect(px0, T, px1 - px0, H - T - B);
    ctx.fillStyle = '#8a8176'; ctx.fillText('pico', px0 + 6, T + 14);
    // linha de referência
    ctx.setLineDash([6, 5]); ctx.strokeStyle = opts.refColor; ctx.beginPath(); ctx.moveTo(L, Y(opts.ref)); ctx.lineTo(W - R, Y(opts.ref)); ctx.stroke(); ctx.setLineDash([]);
    // série
    ctx.strokeStyle = opts.color; ctx.lineWidth = 3; ctx.beginPath();
    ys.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  }

  function kpi(label, value, cls) { const d = document.createElement('div'); d.className = 'kpi ' + (cls || ''); const b = document.createElement('b'); b.textContent = value; const s = document.createElement('span'); s.textContent = label; d.append(b, s); return d; }

  function run() {
    const p = params();
    Object.keys(ids).forEach(k => { $(k + 'Out').textContent = $(k).value; });
    const r = FilaCore.simulate(p, 40);
    const mean = r.mediaPico;
    const box = $('filaKpis'); box.textContent = '';
    box.append(
      kpi('espera média no pico (11h50–13h30)', mean.toFixed(1).replace('.', ',') + ' min', mean <= META ? 'good' : 'bad'),
      kpi('90% esperam até', r.p90Pico.toFixed(1).replace('.', ',') + ' min'),
      kpi('máx. de lugares ocupados', Math.round(r.ocupMax) + ' de ' + SEATS + ' (' + Math.round(100 * r.ocupMax / SEATS) + '%)', r.ocupMax > SEATS * 0.9 ? 'bad' : ''),
      kpi('hora de maior lotação', hhmm(r.ocupMaxEm))
    );
    line($('chartFila'), r.espera, { n: r.espera.length, step: r.BIN, xTicksMax: 210, ymax: Math.max(8, Math.ceil(Math.max(...r.espera) + 1)), ref: META, refColor: '#3ddc84', color: '#ff5a1f', fmtY: v => v.toFixed(0) + ' min' });
    const occ = r.ocup.slice(0, 211);
    line($('chartOcup'), occ, { n: occ.length, step: 1, xTicksMax: 210, ymax: Math.max(500, Math.ceil(r.ocupMax / 50) * 50 + 50), ref: SEATS, refColor: '#ff4d4d', color: '#5ab0ff', fmtY: v => Math.round(v) + '' });
  }

  Object.keys(ids).forEach(k => $(k).addEventListener('input', run));
  $('fRun').addEventListener('click', run);
  run();
})();
