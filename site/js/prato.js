/* Módulo 3 — mix do prato por heurística de cor (demonstração, roda no navegador).
   Separa os pixels de comida por faixa de matiz/saturação e estima a PROPORÇÃO DE ÁREA por categoria.
   Área não é volume: o resultado é um indicador, não uma medida de massa. */
(function () {
  const $ = id => document.getElementById(id);
  const S = 560;
  // Valores fixos de exemplo (não ajustáveis na página): peso lido na balança, parte do prato analisada e limite de carne.
  const PESO_G = 482, RAIO_PCT = 92, LIMITE_CARNE = 45;
  const canvas = $('pratoCanvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const base = document.createElement('canvas'); base.width = base.height = S;
  const bctx = base.getContext('2d', { willReadFrequently: true });

  const CATS = [
    { k: 'carne', n: 'Carne', c: [196, 85, 45] },
    { k: 'carb', n: 'Carboidrato', c: [233, 196, 106] },
    { k: 'salada', n: 'Salada', c: [61, 174, 106] },
    { k: 'outros', n: 'Sobremesa / outros', c: [192, 86, 128] }
  ];

  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx];
  }
  function classify(r, g, b) {
    const [h, s, v] = rgb2hsv(r, g, b);
    if (v < 0.12) return -1;                       // sombra
    if (s < 0.12 && v > 0.62) return -1;           // prato branco / reflexo
    if (h >= 70 && h <= 170 && s > 0.22) return 2; // salada
    if (h >= 260 && h < 345) return 3;             // rosa/roxo: sobremesa
    if (h >= 36 && h < 70 && s > 0.18) return 1;   // amarelo/dourado: arroz, farofa, batata, massa
    if ((h < 36 || h >= 345) && s > 0.3) return v < 0.62 ? 0 : 3; // marrom/vermelho escuro: carne; vermelho vivo: molho/fruta
    return s > 0.2 ? (v < 0.7 ? 0 : 3) : -1;
  }

  // Acha o prato na foto: o prato é a maior área clara e pouco saturada. Usa os percentis das posições desses pixels
  // (ignora guardanapo e copo soltos) para estimar centro e raio. Sem prato claro suficiente, cai no círculo central fixo.
  function detectPlate(data) {
    const xs = [], ys = [];
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
      const i = (y * S + x) * 4, [, sat, v] = rgb2hsv(data[i], data[i + 1], data[i + 2]);
      if (sat < 0.14 && v > 0.68) { xs.push(x); ys.push(y); }
    }
    if (xs.length < (S * S / 4) * 0.04) return null;
    const q = (a, p) => { a.sort((m, n) => m - n); return a[Math.floor(p * (a.length - 1))]; };
    const x0 = q(xs, 0.02), x1 = q(xs, 0.98), y0 = q(ys, 0.02), y1 = q(ys, 0.98);
    const r = Math.min(x1 - x0, y1 - y0) / 2;
    if (r < S * 0.18) return null;
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: Math.min(r, S * 0.62) };
  }

  function analyze() {
    const peso = PESO_G, limCarne = LIMITE_CARNE;
    const img = bctx.getImageData(0, 0, S, S), out = ctx.createImageData(S, S);
    const cnt = [0, 0, 0, 0]; let inside = 0;
    const pl = detectPlate(img.data);
    const cx = pl ? pl.cx : S / 2, cy = pl ? pl.cy : S / 2;
    const raio = RAIO_PCT / 100 * (pl ? pl.r : S / 2);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4, dx = x - cx, dy = y - cy;
      let r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
      if (dx * dx + dy * dy <= raio * raio) {
        inside++;
        const c = classify(r, g, b);
        if (c >= 0) cnt[c]++;                    // a foto fica como está: sem camada de cor por cima da comida
      } else { r *= 0.25; g *= 0.25; b *= 0.25; }
      out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    ctx.strokeStyle = '#ff5a1f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, raio, 0, 7); ctx.stroke();

    const food = cnt.reduce((a, b) => a + b, 0) || 1;
    const share = cnt.map(c => c / food);
    const bar = $('mixbar'), leg = $('mixlegend'), al = $('pratoAlert');
    bar.textContent = ''; leg.textContent = ''; al.textContent = '';
    CATS.forEach((c, i) => {
      const seg = document.createElement('div'); seg.style.width = (share[i] * 100) + '%'; seg.style.background = `rgb(${c.c.join(',')})`; bar.appendChild(seg);
      const row = document.createElement('div'); const dot = document.createElement('i'); dot.style.background = `rgb(${c.c.join(',')})`;
      row.append(dot, document.createTextNode(`${c.n}: ${Math.round(share[i] * 100)}% · ~${Math.round(peso * share[i])} g`)); leg.appendChild(row);
    });
    const say = (t, ok) => { const d = document.createElement('div'); if (ok) d.className = 'ok'; d.textContent = t; al.appendChild(d); };
    const cover = food / Math.max(inside, 1);
    if (cover < 0.35) say('Pouca comida identificada (' + Math.round(cover * 100) + '% do prato): leitura pouco confiável. Ajuste o raio ou use outra foto.');
    if (share[0] * 100 > limCarne) say('Mix: carne em ' + Math.round(share[0] * 100) + '% (limite ' + limCarne + '%). Exemplo de alerta de mix.');
    else if (cover >= 0.35) say('Mix dentro do limite configurado.', true);
  }

  // ---------- entradas ----------
  function drawCover(img) {
    const s = Math.max(S / img.width, S / img.height), w = img.width * s, h = img.height * s;
    bctx.fillStyle = '#000'; bctx.fillRect(0, 0, S, S); bctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h); analyze();
  }
  $('pratoFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(); img.onload = () => { drawCover(img); URL.revokeObjectURL(img.src); }; img.src = URL.createObjectURL(f);
  });

  // Prato de exemplo: ilustração sintética (não é foto real), com semente para variar.
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  function blob(x, y, rx, ry, fill, n) {
    for (let i = 0; i < n; i++) {
      bctx.fillStyle = fill[Math.floor(rnd() * fill.length)];
      bctx.beginPath(); bctx.ellipse(x + (rnd() - .5) * rx * 1.4, y + (rnd() - .5) * ry * 1.4, rx * (0.25 + rnd() * .35), ry * (0.25 + rnd() * .35), rnd() * 3, 0, 7); bctx.fill();
    }
  }
  function sample() {
    seed = Math.floor(Math.random() * 2e9) + 1;
    bctx.fillStyle = '#2b2118'; bctx.fillRect(0, 0, S, S);
    bctx.fillStyle = '#f3f0ea'; bctx.beginPath(); bctx.arc(S / 2, S / 2, 255, 0, 7); bctx.fill();
    bctx.strokeStyle = '#ddd6cb'; bctx.lineWidth = 10; bctx.stroke();
    const q = 0.7 + rnd() * 0.6;                         // varia o peso relativo de cada grupo
    blob(200, 210, 90 * q, 70 * q, ['#6b3a1e', '#7d4524', '#8a4b2a'], 14);          // carne
    blob(370, 190, 85, 80, ['#e0c070', '#d9b865', '#e8cc82'], 60);                  // carboidrato
    blob(200, 370, 80 * (1.5 - q + .3), 75, ['#3f9d49', '#6bbf4a', '#2e7d32'], 40); // salada
    blob(390, 360, 52, 46, ['#d86a9a', '#c85a8c'], 8);                              // sobremesa
    analyze();
  }
  // Foto hiper-realista de exemplo (gerada por IA). Se o arquivo existir, a demo usa a foto;
  // se não, cai no desenho sintético acima.
  const real = new Image(); let realOk = false;
  real.onload = () => { realOk = true; $('pratoPill').textContent = 'imagem ilustrativa · heurística de cor'; drawCover(real); };
  real.src = 'img/prato-exemplo.webp?v=1';
  $('pratoGen').addEventListener('click', () => realOk ? drawCover(real) : sample());
  sample();
})();
