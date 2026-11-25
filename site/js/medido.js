/* Gráficos medidos: ocupação de mesas nos cortes reais (data/medicao-cortes.json, gerado por ml/medir_cortes.py). */
(function () {
  const cvs = { buffet1: document.getElementById('mdC1'), buffet2: document.getElementById('mdC2') };
  if (!cvs.buffet1) return;
  const COR = { pico: '#ff7a1a', apos: '#5ab0ff' };

  function draw(canvas, series, passo) {
    const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth || 520, H = canvas.clientHeight || 220;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const c = canvas.getContext('2d'); c.scale(dpr, dpr); c.clearRect(0, 0, W, H);
    const L = 34, R = 12, T = 14, B = 26, mesas = series[0].mesas, tmax = 120;
    const X = t => L + (W - L - R) * t / tmax, Y = v => T + (H - T - B) * (1 - v / mesas);
    c.font = '11px system-ui'; c.fillStyle = '#8b8277'; c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1;
    for (let v = 0; v <= mesas; v++) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(W - R, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(v, L - 6, Y(v) + 4); }
    c.textAlign = 'center';
    [0, 30, 60, 90, 120].forEach(t => c.fillText(t + 's', X(t), H - 8));
    series.forEach(s => {
      c.strokeStyle = COR[s.janela]; c.lineWidth = 2.5; c.beginPath();
      s.ocupadas.forEach((v, i) => { const x = X(i * passo), y = Y(v); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.stroke();
    });
  }
  const media = a => a.reduce((x, y) => x + y, 0) / a.length;

  fetch('data/medicao-cortes.json').then(r => r.json()).then(d => {
    ['buffet1', 'buffet2'].forEach((cam, i) => {
      const ss = d.series.filter(s => s.camera === cam);
      const p = ss.find(s => s.janela === 'pico'), a = ss.find(s => s.janela === 'apos');
      document.getElementById('mdSub' + (i + 1)).textContent =
        'média de mesas ocupadas: ' + media(p.ocupadas).toFixed(1) + ' no pico, ' + media(a.ocupadas).toFixed(1) + ' depois · de ' + p.mesas + ' mesas · pessoas vistas: ' + Math.round(media(p.pessoas)) + ' e ' + Math.round(media(a.pessoas));
      const go = () => draw(cvs[cam], ss, d.passo_s);
      go(); window.addEventListener('resize', go);
    });
    if (window.refreshScroll) window.refreshScroll();   // o texto das legendas mudou a altura da seção
  }).catch(() => { document.getElementById('medido').style.display = 'none'; });
})();
