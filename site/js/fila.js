/* Módulo 2 — simulação de fila e lotação, com cenário fixo (cálculo em fila-core.js).
   Duas linhas: situação atual (4 churrasqueiros) e com um churrasqueiro a mais. */
(function () {
  const $ = id => document.getElementById(id);
  const SEATS = 450, META = 2.5;
  const BASE = { clientes: 600, servidores: 4, servSeg: 50, pctChurras: 0.8, permMin: 40 };
  const MAIS_UM = Object.assign({}, BASE, { servidores: 5 });
  const hhmm = m => { const t = 11 * 60 + m; return String(Math.floor(t / 60)).padStart(2, '0') + 'h' + String(Math.round(t % 60)).padStart(2, '0'); };
  const min = v => v.toFixed(1).replace('.', ',') + ' min';

  // Desenha uma ou mais séries no mesmo gráfico. series = [{ys, color, dashed}]
  function chart(canvas, series, opts) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const L = 52, R = 14, T = 16, B = 30;
    ctx.clearRect(0, 0, W, H);
    const n = series[0].ys.length, ymax = opts.ymax;
    const X = i => L + (W - L - R) * i / (n - 1), Y = v => H - B - (H - T - B) * Math.min(v, ymax) / ymax;
    ctx.font = '12px system-ui'; ctx.fillStyle = '#8a8176'; ctx.strokeStyle = '#2b2520'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) { const v = ymax * g / 4; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(W - R, Y(v)); ctx.stroke(); ctx.fillText(opts.fmtY(v), 6, Y(v) + 4); }
    for (let m = 0; m <= 210; m += 30) ctx.fillText(hhmm(m), X(m / opts.step) - 14, H - 8);
    const px0 = X(50 / opts.step), px1 = X(150 / opts.step);          // faixa do pico: 11h50–13h30
    ctx.fillStyle = 'rgba(255,90,31,.07)'; ctx.fillRect(px0, T, px1 - px0, H - T - B);
    ctx.fillStyle = '#8a8176'; ctx.fillText('pico', px0 + 6, T + 14);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = opts.refColor; ctx.beginPath(); ctx.moveTo(L, Y(opts.ref)); ctx.lineTo(W - R, Y(opts.ref)); ctx.stroke(); ctx.setLineDash([]);
    series.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.setLineDash(s.dashed ? [8, 5] : []); ctx.beginPath();
      s.ys.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function kpi(label, value, cls) { const d = document.createElement('div'); d.className = 'kpi ' + (cls || ''); const b = document.createElement('b'); b.textContent = value; const s = document.createElement('span'); s.textContent = label; d.append(b, s); return d; }

  const a = FilaCore.simulate(BASE, 40), b = FilaCore.simulate(MAIS_UM, 40);
  const box = $('filaKpis');
  box.append(
    kpi('espera média no pico, hoje (4 churrasqueiros)', min(a.mediaPico), a.mediaPico <= META ? 'good' : 'bad'),
    kpi('espera média no pico, com 5 churrasqueiros', min(b.mediaPico), b.mediaPico <= META ? 'good' : 'bad'),
    kpi('90% esperam até (hoje)', min(a.p90Pico)),
    kpi('maior lotação: ' + hhmm(a.ocupMaxEm), Math.round(a.ocupMax) + ' de ' + SEATS + ' lugares')
  );
  chart($('chartFila'), [{ ys: a.espera, color: '#ff5a1f' }, { ys: b.espera, color: '#3ddc84', dashed: true }],
    { step: a.BIN, ymax: Math.max(8, Math.ceil(Math.max(...a.espera) + 1)), ref: META, refColor: '#8a8176', fmtY: v => v.toFixed(0) + ' min' });
  const occ = a.ocup.slice(0, 211);
  chart($('chartOcup'), [{ ys: occ, color: '#5ab0ff' }],
    { step: 1, ymax: Math.max(500, Math.ceil(a.ocupMax / 50) * 50 + 50), ref: SEATS, refColor: '#ff4d4d', fmtY: v => Math.round(v) + '' });
})();
