/* Módulo 4 — cubas do buffet (interface). Cálculo em cubas-core.js.
   Parte 1: estima o nível de cada cuba numa imagem (buffet de exemplo ilustrado ou foto enviada).
   Parte 2: série SIMULADA de uma cuba ao longo do almoço, onde o algoritmo conta as reposições. */
(function () {
  const C = CubasCore;
  const $ = id => document.getElementById(id);
  const W = 960, H = 540;
  const canvas = $('cubaCanvas'), ctx = canvas.getContext('2d');
  const scene = document.createElement('canvas'); scene.width = W; scene.height = H;     // cena limpa (sem textos) para analisar
  const sctx = scene.getContext('2d', { willReadFrequently: true });

  // Quatro cubas ilustradas. A cor precisa ser saturada para se distinguir do inox (limite: arroz branco puro confunde).
  const ITENS = [
    { nome: 'Picanha', cor: ['#8a4b2a', '#7a3f22', '#9a5530'] },
    { nome: 'Arroz com cenoura', cor: ['#e3cf8a', '#dcc479', '#ecd998'] },
    { nome: 'Farofa', cor: ['#d9a441', '#c89433', '#e4b24f'] },
    { nome: 'Feijão', cor: ['#4a2a1a', '#5b3320', '#3d2214'] }
  ];
  const PAN = { x0: 50, w: 190, gap: 30, y: 90, h: 320 };      // geometria das cubas
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const regiao = i => ({ x: PAN.x0 + i * (PAN.w + PAN.gap) + 14, y: PAN.y + 14, w: PAN.w - 28, h: PAN.h - 28 });

  function desenharBuffet(niveis) {
    sctx.fillStyle = '#2b2118'; sctx.fillRect(0, 0, W, H);                 // bancada
    ITENS.forEach((it, i) => {
      const x = PAN.x0 + i * (PAN.w + PAN.gap), r = regiao(i);
      const g = sctx.createLinearGradient(x, PAN.y, x + PAN.w, PAN.y + PAN.h);
      g.addColorStop(0, '#9aa0a6'); g.addColorStop(1, '#7d8389');
      sctx.fillStyle = g; sctx.fillRect(x, PAN.y, PAN.w, PAN.h);           // borda de inox
      sctx.fillStyle = '#aeb3b8'; sctx.fillRect(r.x, r.y, r.w, r.h);       // fundo da cuba (inox à mostra)
      const alt = r.h * niveis[i];                                          // comida ocupa a parte de trás
      sctx.fillStyle = it.cor[0]; sctx.fillRect(r.x, r.y, r.w, alt);
      for (let k = 0; k < 260 * niveis[i]; k++) {                           // textura
        sctx.fillStyle = it.cor[1 + (k % 2)];
        sctx.beginPath(); sctx.arc(r.x + rnd() * r.w, r.y + rnd() * alt, 3 + rnd() * 5, 0, 7); sctx.fill();
      }
    });
  }

  const hhmm = m => { const t = 11 * 60 + m; return String(Math.floor(t / 60)).padStart(2, '0') + 'h' + String(Math.round(t % 60)).padStart(2, '0'); };
  const COR = { ok: '#3ddc84', atencao: '#ffb02e', repor: '#ff4d4d' };
  const TXT = { ok: 'OK', atencao: 'ATENÇÃO', repor: 'REPOR' };

  // Analisa as regiões na cena limpa, depois desenha o resultado por cima.
  function analisar(regioes, nomes, calib) {
    const img = sctx.getImageData(0, 0, W, H).data;
    const res = regioes.map(r => Math.round((calib ? C.fillRatioRef(img, W, H, r, calib.ref, calib.tol) : C.fillRatio(img, W, H, r)).ratio * 100));
    ctx.drawImage(scene, 0, 0);
    const lista = $('cubaList'); lista.textContent = '';
    regioes.forEach((r, i) => {
      const st = C.status(res[i]);
      ctx.lineWidth = 4; ctx.strokeStyle = COR[st]; ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(r.x, r.y + r.h - 34, r.w, 34);
      ctx.fillStyle = COR[st]; ctx.font = 'bold 18px system-ui'; ctx.fillText(res[i] + '% · ' + TXT[st], r.x + 10, r.y + r.h - 11);
      const li = document.createElement('div'); li.className = 'cuba-row';
      const chip = document.createElement('span'); chip.className = 'cchip ' + st; chip.textContent = TXT[st];
      const b = document.createElement('b'); b.textContent = nomes[i];
      const p = document.createElement('span'); p.textContent = res[i] + '% da cuba com comida';
      li.append(chip, b, p); lista.appendChild(li);
    });
  }

  function exemplo() {
    seed = Math.floor(Math.random() * 2e9) + 1;
    const op = [0.92, 0.78, 0.6, 0.45, 0.3, 0.18, 0.1];
    const niveis = ITENS.map(() => op[Math.floor(rnd() * op.length)]);
    if (!niveis.some(n => n < 0.25)) niveis[Math.floor(rnd() * 4)] = 0.12;   // garante uma cuba para repor
    desenharBuffet(niveis);
    analisar(ITENS.map((_, i) => regiao(i)), ITENS.map(i => i.nome));
  }
  // Foto hiper-realista de exemplo com 4 cubas lado a lado (gerada por IA).
  // Se o arquivo existir, a demo usa a foto; se não, cai no buffet desenhado acima.
  const real = new Image(); let realOk = false;
  // 4 colunas iguais (a foto de exemplo tem as 4 cubas ocupando a largura toda); a cor do inox vem do topo da 1ª cuba,
  // que está vazia nessa foto: é a "calibração de cuba vazia" que a fase 0 faria uma vez por câmera.
  const colunas = () => [0, 1, 2, 3].map(i => ({ x: i * 240 + 55, y: 60, w: 130, h: 420 }));
  function exemploReal() {
    const s = Math.max(W / real.width, H / real.height), w = real.width * s, h = real.height * s;
    sctx.fillStyle = '#000'; sctx.fillRect(0, 0, W, H); sctx.drawImage(real, (W - w) / 2, (H - h) / 2, w, h);
    const c0 = colunas()[0], ref = C.meanColor(sctx.getImageData(0, 0, W, H).data, W, H, { x: c0.x, y: c0.y, w: c0.w, h: 60 });
    analisar(colunas(), ITENS.map(i => i.nome), { ref, tol: 70 });
  }
  real.onload = () => { realOk = true; exemploReal(); };
  real.src = 'img/cubas-exemplo.webp?v=1';
  $('cubaGen').addEventListener('click', () => realOk ? exemploReal() : exemplo());

  // Foto enviada: analisa a parte central da imagem como uma única cuba.
  $('cubaFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
      sctx.fillStyle = '#000'; sctx.fillRect(0, 0, W, H); sctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      analisar([{ x: W * 0.15, y: H * 0.12, w: W * 0.7, h: H * 0.76 }], ['Cuba da foto']);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  });

  // ---------- série simulada de uma cuba ----------
  const PASSO = 5, N = 43;                                   // 11h00 a 14h30, leitura a cada 5 min
  function serieSimulada() {
    const s = []; let nivel = 100;
    for (let i = 0; i < N; i++) {
      const t = i * PASSO, demanda = Math.exp(-((t - 100) ** 2) / (2 * 44 * 44));   // pico às 12h40, mesma curva da fila
      const ruido = ((i * 37) % 7 - 3) * 0.4;
      nivel = Math.max(0, nivel - (0.6 + 11.4 * demanda) + ruido);
      if (nivel <= 22) nivel = 100;                          // alguém repôs a cuba
      s.push(Math.min(100, nivel));
    }
    return s;
  }
  function kpi(label, value, cls) { const d = document.createElement('div'); d.className = 'kpi ' + (cls || ''); const b = document.createElement('b'); b.textContent = value; const s = document.createElement('span'); s.textContent = label; d.append(b, s); return d; }
  function grafico(serie, repos) {
    const cv = $('chartCuba'), c = cv.getContext('2d'), Wc = cv.width, Hc = cv.height, L = 46, R = 14, T = 16, B = 30;
    const X = i => L + (Wc - L - R) * i / (serie.length - 1), Y = v => Hc - B - (Hc - T - B) * v / 100;
    c.clearRect(0, 0, Wc, Hc); c.font = '12px system-ui'; c.fillStyle = '#8a8176'; c.strokeStyle = '#2b2520'; c.lineWidth = 1;
    for (let g = 0; g <= 4; g++) { const v = 25 * g; c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(Wc - R, Y(v)); c.stroke(); c.fillText(v + '%', 6, Y(v) + 4); }
    for (let m = 0; m <= 210; m += 30) c.fillText(hhmm(m), X(m / PASSO) - 14, Hc - 8);
    const p0 = X(50 / PASSO), p1 = X(150 / PASSO); c.fillStyle = 'rgba(255,90,31,.07)'; c.fillRect(p0, T, p1 - p0, Hc - T - B);
    c.setLineDash([6, 5]); c.strokeStyle = '#ff4d4d'; c.beginPath(); c.moveTo(L, Y(C.REPOR_ABAIXO)); c.lineTo(Wc - R, Y(C.REPOR_ABAIXO)); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#5ab0ff'; c.lineWidth = 3; c.beginPath(); serie.forEach((v, i) => { i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)); }); c.stroke();
    c.fillStyle = '#3ddc84'; repos.forEach(i => { c.beginPath(); c.arc(X(i), Y(serie[i]), 6, 0, 7); c.fill(); });
  }
  const serie = serieSimulada(), repos = C.detectRefills(serie);
  const pico = C.summarize(serie.slice(10, 31), PASSO);       // 11h50 a 13h30
  $('cubaKpis').append(
    kpi('reposições detectadas no almoço', String(repos.length)),
    kpi('reposições no pico (11h50–13h30)', String(pico.refills)),
    kpi('essa cuba esvazia em cerca de', pico.minToEmptyFromFull ? Math.round(pico.minToEmptyFromFull) + ' min' : '—')
  );
  grafico(serie, repos);

  exemplo();
})();
