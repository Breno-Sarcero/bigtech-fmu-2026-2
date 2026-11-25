/* Módulo 1 — Mesas (interface). A lógica de estados vive em mesas-core.js (testada em Node).
   Fonte de dados: detector COCO-SSD no navegador (real) ou roteiro SIMULADO. */
(function () {
  const M = MesasCore;
  const W = 960, H = 540;
  const canvas = document.getElementById('mesaCanvas');
  const ctx = canvas.getContext('2d');
  const snap = document.createElement('canvas'); snap.width = W; snap.height = H;     // quadro limpo, sem caixas, para amostrar cores
  const sctx = snap.getContext('2d', { willReadFrequently: true });
  const video = document.getElementById('mesaVideo');
  const hint = document.getElementById('mesaHint');
  const modePill = document.getElementById('mesaMode');
  const zonesBox = document.getElementById('zones');
  const alertsBox = document.getElementById('alerts');
  const $ = id => document.getElementById(id);

  // Regras fixas da demo: alerta de atendimento (min), mesa suja (min), tempo de garçom na mesa (s reais).
  // A velocidade do relógio é acelerada para caber num vídeo curto: 30x no roteiro simulado, 8x em vídeo real.
  const cfg = { thr: 2, dirty: 5, speed: 30, waiterSecs: 2 };
  const SPEED_SIM = 30, SPEED_REAL = 8, UNI_TOL = 60;

  let source = 'none';       // none | video | image | cam | sim
  let imageEl = null, model = null, modelLoading = false;
  let epoch = 0;                // muda a cada troca de fonte: descarta detecções que ainda estavam em andamento
  let zones = [], vt = 0, lastTs = performance.now(), lastDetect = 0, lastDetectTs = 0;
  let dets = [];              // detecções desenhadas: {cls, x, y, w, h, score, role}
  let drag = null, nextId = 1, picking = false;
  let uniform = null, tol = UNI_TOL;          // sem cor escolhida, o garçom é reconhecido pela postura (em pé)
  const track = {};                            // candidatas a mesa entre quadros (mesas inferidas)

  function hexToRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
  const rgbToHex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  $('uni').addEventListener('input', e => { uniform = hexToRgb(e.target.value); $('uniState').textContent = 'usando a cor do uniforme'; });
  $('uniPick').addEventListener('click', () => { picking = true; hint.textContent = 'Clique sobre a camisa de um garçom no vídeo para copiar a cor do uniforme.'; });

  const hooks = { log };
  function log(msg, ok) {
    const d = document.createElement('div'); if (ok) d.className = 'ok';
    d.textContent = '[' + M.mmss(vt) + '] ' + msg; alertsBox.prepend(d);
    while (alertsBox.childNodes.length > 40) alertsBox.lastChild.remove();
  }

  // ---------- modelo (carregado só quando o usuário liga uma fonte real) ----------
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function ensureModel() {
    if (model || modelLoading) return;
    modelLoading = true; hint.textContent = 'Baixando o modelo de detecção (uma vez)...';
    try {
      await loadScript('vendor/tf.min.js'); await loadScript('vendor/coco-ssd.min.js');
      model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      hint.textContent = 'Modelo pronto. As mesas são detectadas sozinhas; arraste sobre a imagem só para ajustar.';
    } catch (e) { hint.textContent = 'Não consegui carregar o modelo (precisa de internet na primeira vez). Use o modo simulado.'; }
    modelLoading = false;
  }

  // ---------- fontes ----------
  function setMode(m, label) { source = m; modePill.textContent = label; modePill.className = 'pill ' + (m === 'sim' ? 'sim' : m === 'none' ? '' : 'real'); cfg.speed = m === 'sim' ? SPEED_SIM : SPEED_REAL; }
  function stopMedia() {
    epoch++;
    if (video.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
    video.pause(); video.removeAttribute('src'); video.load(); imageEl = null; dets = [];
  }
  const relayout = () => { if (window.refreshScroll) window.refreshScroll(); };
  function resetZones() { zones.forEach(z => z.row.remove()); zones = []; alertsBox.textContent = ''; vt = 0; dets = []; track.pending = []; relayout(); }

  $('mesaFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    stopMedia(); resetZones(); calibrated = false;
    const url = URL.createObjectURL(f);
    if (f.type.startsWith('image/')) { imageEl = new Image(); imageEl.onload = () => { setMode('image', 'foto · detecção real'); ensureModel(); }; imageEl.src = url; }
    else { video.src = url; video.loop = true; await video.play().catch(() => {}); setMode('video', 'vídeo · detecção real'); ensureModel(); }
    hint.textContent = 'As mesas são detectadas sozinhas. Se alguma falhar, arraste sobre a imagem para ajustar.';
  });
  $('mesaSim').addEventListener('click', () => { stopMedia(); resetZones(); calibrated = false; startSim(); });

  // Câmeras reais do salão (cortes de 2 min cedidos pela Bovinu's no material do hackathon; rostos já borrados na origem).
  // Câmera fixa = mesas calibradas uma vez por câmera (caixas em coordenadas 960x540). A IA só olha dentro delas:
  // assim a bancada do buffet nunca vira "mesa". Em produção isso é a calibração da fase 0.
  const CAMERAS = {
    b1: { src: 'video/bovinus-buffet1.mp4', label: 'Câmera real · buffet 1', mesas: [
      [560, 115, 80, 60], [690, 130, 75, 60], [800, 125, 95, 60], [608, 185, 140, 70],
      [785, 280, 170, 85], [600, 270, 180, 95], [690, 430, 260, 110]] },
    b2: { src: 'video/bovinus-buffet2.mp4', label: 'Câmera real · buffet 2', mesas: [
      [40, 130, 75, 60], [90, 235, 100, 70], [135, 430, 250, 110], [35, 445, 95, 95]] }
  };
  let calibrated = false;
  async function loadCamera(key) {
    const c = CAMERAS[key];
    stopMedia(); resetZones(); calibrated = true;
    video.src = c.src; video.loop = true; await video.play().catch(() => {});
    setMode('video', c.label); ensureModel(); ensureYolo();
    c.mesas.forEach(m => addZone(m[0], m[1], m[2], m[3], null, 'calibrada'));
    hint.textContent = 'Mesas calibradas nesta câmera. O modelo conta clientes, garçom e objetos dentro de cada uma.';
  }
  $('mesaB1').addEventListener('click', () => loadCamera('b1'));
  $('mesaB2').addEventListener('click', () => loadCamera('b2'));

  // ---------- mouse: marcar mesas ou pegar a cor do uniforme ----------
  function pos(ev) { const r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height }; }
  canvas.addEventListener('pointerdown', ev => {
    if (source === 'none' || source === 'sim') return;
    const p = pos(ev);
    if (picking) {
      picking = false;
      const c = avgColor({ x: p.x - 6, y: p.y - 6, w: 12, h: 12 });
      if (c) { uniform = c; $('uni').value = rgbToHex(c); $('uniState').textContent = 'usando a cor do uniforme'; hint.textContent = 'Cor do uniforme definida.'; }
      return;
    }
    drag = { a: p, b: p }; canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', ev => { if (drag) drag.b = pos(ev); });
  canvas.addEventListener('pointerup', () => {
    if (!drag) return;
    const x = Math.min(drag.a.x, drag.b.x), y = Math.min(drag.a.y, drag.b.y), w = Math.abs(drag.a.x - drag.b.x), h = Math.abs(drag.a.y - drag.b.y);
    drag = null; if (w > 25 && h > 25) addZone(x, y, w, h);
  });

  // ---------- mesas ----------
  function addZone(x, y, w, h, script, auto) {
    const z = { id: nextId++, name: 'Mesa ' + (zones.length + 1), x, y, w, h, script: script || null, auto: auto || null };
    M.init(z, vt);
    const row = document.createElement('div'); row.className = 'zone';
    const chip = document.createElement('span'); chip.className = 'chip free'; chip.textContent = 'livre';
    const info = document.createElement('div'); const nm = document.createElement('b'); nm.textContent = z.name;
    const sm = document.createElement('small'); sm.textContent = '—'; info.append(nm, sm);
    const acts = document.createElement('div'); acts.className = 'acts';
    const b1 = document.createElement('button'); b1.textContent = 'Garçom atendeu'; b1.title = 'Correção manual, caso o detector não reconheça o garçom';
    const b2 = document.createElement('button'); b2.textContent = 'Mesa limpa'; b2.title = 'Correção manual, caso o detector não veja a limpeza';
    b1.addEventListener('click', () => M.serve(z, vt, hooks, false));
    b2.addEventListener('click', () => { if (z.state === 'dirty') { M.init(z, vt); z.lastSeen = z.lastItem = -999; log(z.name + ' limpa e liberada.', true); } });
    acts.append(b1, b2); row.append(chip, info, acts); zonesBox.appendChild(row);
    Object.assign(z, { row, chip, sm, b1, b2 }); zones.push(z); relayout(); return z;
  }
  const LABEL = { free: ['livre', 'free'], wait: ['aguardando', 'wait'], served: ['atendida', 'served'], dirty: ['suja', 'dirty'] };
  function paintRow(z) {
    let [txt, cls] = LABEL[z.state];
    if (z.state === 'wait' && z.alerted) { txt = 'sem atendimento'; cls = 'late'; }
    if (z.state === 'dirty' && z.alerted) { txt = 'limpar já'; cls = 'late'; }
    z.chip.textContent = txt; z.chip.className = 'chip ' + cls;
    const origem = z.auto === 'calibrada' ? 'mesa calibrada na câmera' : z.auto === 'mesa' ? 'mesa detectada' : z.auto === 'inferida' ? 'mesa inferida pelos clientes' : z.script ? 'roteiro' : 'marcada à mão';
    z.sm.textContent = z.persons + ' cliente(s) · ' + z.items + ' objeto(s) · ' + origem + ' · há ' + M.mmss(vt - z.tSince);
    z.b1.disabled = z.state !== 'wait'; z.b2.disabled = z.state !== 'dirty'; z.cls = cls;
  }
  const COLORS = { free: '#3ddc84', wait: '#ffb02e', late: '#ff4d4d', served: '#5ab0ff', dirty: '#ff9a6b' };

  // ---------- detecção real ----------
  function fit(vw, vh) { const s = Math.min(W / vw, H / vh); return { s, ox: (W - vw * s) / 2, oy: (H - vh * s) / 2 }; }
  function avgColor(r) {                           // cor média de uma região do quadro limpo
    const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y));
    const w = Math.min(W - x, Math.floor(r.w)), h = Math.min(H - y, Math.floor(r.h));
    if (w < 2 || h < 2) return null;
    const d = sctx.getImageData(x, y, w, h).data; let R = 0, G = 0, B = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
    return n ? [R / n, G / n, B / n] : null;
  }
  // ---------- detector de pessoas treinado nas câmeras da Bovinu's (YOLOv8 nano, ONNX no navegador) ----------
  // Ajustado (fine-tune) com quadros dos vídeos cedidos; roda localmente, sem enviar nada a servidor.
  const YOLO_SIZE = 960, YOLO_CONF = 0.35, YOLO_IOU = 0.5;
  let yolo = null, yoloLoading = false;
  const lc = document.createElement('canvas'); lc.width = lc.height = YOLO_SIZE;
  const lctx = lc.getContext('2d', { willReadFrequently: true });
  async function ensureYolo() {
    if (yolo || yoloLoading) return;
    yoloLoading = true;
    try {
      await loadScript('vendor/ort/ort.wasm.min.js');
      ort.env.wasm.wasmPaths = new URL('vendor/ort/', location.href).href; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = true;   // proxy: a inferência roda num worker e não trava a página
      yolo = await ort.InferenceSession.create('models/mesas-yolov8n.onnx', { executionProviders: ['wasm'] });
    } catch (e) { console.warn('YOLO indisponível, usando COCO-SSD', e); }
    yoloLoading = false;
  }
  async function yoloPersons(el, vw, vh) {
    const s = Math.min(YOLO_SIZE / vw, YOLO_SIZE / vh), ox = (YOLO_SIZE - vw * s) / 2, oy = (YOLO_SIZE - vh * s) / 2;
    lctx.fillStyle = 'rgb(114,114,114)'; lctx.fillRect(0, 0, YOLO_SIZE, YOLO_SIZE);
    lctx.drawImage(el, ox, oy, vw * s, vh * s);
    const px = lctx.getImageData(0, 0, YOLO_SIZE, YOLO_SIZE).data, n = YOLO_SIZE * YOLO_SIZE, inp = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { inp[i] = px[i * 4] / 255; inp[n + i] = px[i * 4 + 1] / 255; inp[2 * n + i] = px[i * 4 + 2] / 255; }
    const out = (await yolo.run({ [yolo.inputNames[0]]: new ort.Tensor('float32', inp, [1, 3, YOLO_SIZE, YOLO_SIZE]) }))[yolo.outputNames[0]];
    const N = out.dims[2], d = out.data, boxes = [];
    for (let i = 0; i < N; i++) {                       // saída [1, 5, N]: cx, cy, w, h, confiança
      const sc = d[4 * N + i]; if (sc < YOLO_CONF) continue;
      const cx = d[i], cy = d[N + i], w = d[2 * N + i], h = d[3 * N + i];
      boxes.push({ class: 'person', score: sc, bbox: [(cx - w / 2 - ox) / s, (cy - h / 2 - oy) / s, w / s, h / s] });
    }
    boxes.sort((a, b) => b.score - a.score);            // supressão de caixas repetidas (NMS)
    const keep = [];
    for (const b of boxes) if (keep.every(k => iouXYWH(k.bbox, b.bbox) < YOLO_IOU)) keep.push(b);
    return keep;
  }
  function iouXYWH(a, b) {
    const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
    const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); return i / (a[2] * a[3] + b[2] * b[3] - i || 1);
  }
  let detecting = false;
  async function detect(el, vw, vh) {
    if (!model || detecting) return;
    detecting = true;
    const my = epoch;
    try { await detectInner(el, vw, vh, my); } finally { detecting = false; }
  }
  async function detectInner(el, vw, vh, my) {
    const t = fit(vw, vh);
    sctx.drawImage(el, t.ox, t.oy, vw * t.s, vh * t.s);      // congela o quadro que será analisado
    let preds = await model.detect(el, 40, 0.4);
    if (calibrated && yolo) preds = preds.filter(p => p.class !== 'person').concat(await yoloPersons(el, vw, vh));
    if (my !== epoch) return;                     // a fonte foi trocada durante a análise: não mostrar nada deste quadro
    const now = performance.now(), dtReal = lastDetectTs ? (now - lastDetectTs) / 1000 : 0.5; lastDetectTs = now;
    const raw = preds.filter(p => p.class === 'person' || p.class === 'dining table' || M.ITEMS.has(p.class)).map(p => ({ cls: p.class, x: p.bbox[0] * t.s + t.ox, y: p.bbox[1] * t.s + t.oy, w: p.bbox[2] * t.s, h: p.bbox[3] * t.s, score: p.score }));
    // mesas novas aparecem sozinhas (a marcação à mão é só ajuste)
    if (!calibrated) M.autoZones(zones, raw, track, W, H).forEach(b => addZone(b.x, b.y, b.w, b.h, null, b.auto));
    const s = M.split(raw, avgColor, uniform, tol);
    s.waiters.forEach(d => d.role = 'garçom'); s.customers.forEach(d => d.role = 'cliente');
    dets = raw;
    M.assign(zones, s, Math.min(dtReal, 2));
  }

  // ---------- modo simulado (roteiro rotulado) ----------
  const SIM_LEN = 720;
  function startSim() {
    setMode('sim', 'SIMULADO · roteiro de exemplo');
    hint.textContent = 'Modo simulado: clientes, garçom e objetos seguem um roteiro. A regra de alerta é a mesma da detecção real.';
    const mk = (x, y, s) => addZone(x, y, 200, 130, s);
    //            chegada saída  garçom  clientes  objetos na mesa (de, até)
    mk(110, 130, { in: 10, out: 300, serve: 70, n: 2, it: [40, 340] });
    mk(380, 130, { in: 25, out: 330, serve: null, n: 3, it: [45, 670] });   // ninguém atende; objetos esquecidos
    mk(650, 130, { in: 50, out: 360, serve: 190, n: 4, it: [80, 400] });
    mk(245, 340, { in: 140, out: 250, serve: 160, n: 2, it: [150, 290] });
    mk(515, 340, { in: 200, out: 470, serve: 215, n: 1, it: [210, 510] });
    vt = 0;
  }
  function simUpdate() {
    if (vt > SIM_LEN) { zones.forEach(z => M.init(z, 0)); vt = 0; alertsBox.textContent = ''; }
    zones.forEach(z => {
      const s = z.script;
      z.persons = (vt >= s.in && vt < s.out) ? s.n : 0;
      z.items = (vt >= s.it[0] && vt < s.it[1]) ? 2 : 0;
      z.waiterNear = s.serve !== null && vt >= s.serve && vt < s.serve + 6;
      z.waiterSecs = z.waiterNear ? cfg.waiterSecs : 0;
    });
  }
  function drawSim() {
    ctx.fillStyle = '#17120e'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    zones.forEach(z => {
      ctx.fillStyle = '#3a2d22'; ctx.beginPath(); ctx.rect(z.x + 40, z.y + 28, z.w - 80, z.h - 56); ctx.fill();
      for (let i = 0; i < z.persons; i++) { const a = (i / Math.max(z.persons, 1)) * Math.PI * 2; ctx.fillStyle = '#e8d5bf'; ctx.beginPath(); ctx.arc(z.x + z.w / 2 + Math.cos(a) * 62, z.y + z.h / 2 + Math.sin(a) * 38, 11, 0, 7); ctx.fill(); }
      for (let i = 0; i < z.items; i++) { ctx.fillStyle = '#f2c94c'; ctx.fillRect(z.x + z.w / 2 - 20 + i * 24, z.y + z.h / 2 - 6, 14, 14); }
      if (z.waiterNear) { ctx.fillStyle = '#4fd1ff'; ctx.beginPath(); ctx.arc(z.x + z.w + 16, z.y + z.h / 2, 12, 0, 7); ctx.fill(); }
    });
  }

  // ---------- laço principal ----------
  function frame(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.25); lastTs = ts;
    if (source !== 'none') vt += dt * cfg.speed;
    ctx.clearRect(0, 0, W, H);
    if (source === 'sim') { simUpdate(); drawSim(); }
    else if (source === 'video' || source === 'cam') {
      if (video.videoWidth) {
        const t = fit(video.videoWidth, video.videoHeight);
        ctx.drawImage(video, t.ox, t.oy, video.videoWidth * t.s, video.videoHeight * t.s);
        if (ts - lastDetect > 450 && model) { lastDetect = ts; detect(video, video.videoWidth, video.videoHeight); }
      }
    } else if (source === 'image' && imageEl) {
      const t = fit(imageEl.naturalWidth, imageEl.naturalHeight);
      ctx.drawImage(imageEl, t.ox, t.oy, imageEl.naturalWidth * t.s, imageEl.naturalHeight * t.s);
      if (model && ts - lastDetect > 1500) { lastDetect = ts; detect(imageEl, imageEl.naturalWidth, imageEl.naturalHeight); }
    } else { ctx.fillStyle = '#0d0b09'; ctx.fillRect(0, 0, W, H); }
    // caixas: cliente (branco), garçom (azul), objeto (amarelo)
    ctx.lineWidth = 2; ctx.font = '13px system-ui';
    (source === 'sim' || source === 'none' ? [] : dets).filter(d => d.cls !== 'dining table').forEach(d => {
      const c = d.role === 'garçom' ? '#4fd1ff' : d.cls === 'person' ? 'rgba(255,255,255,.8)' : '#f2c94c';
      ctx.strokeStyle = c; ctx.fillStyle = c; ctx.strokeRect(d.x, d.y, d.w, d.h);
      ctx.fillText((d.role || d.cls) + ' ' + Math.round(d.score * 100) + '%', d.x + 4, d.y + 14);
    });
    zones.forEach(z => {
      M.step(z, vt, cfg, hooks); paintRow(z);
      const c = COLORS[z.cls] || '#fff';
      ctx.lineWidth = 4; ctx.strokeStyle = c; ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = c + '22'; ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = c; ctx.font = 'bold 15px system-ui'; ctx.fillText(z.name + ' · ' + M.mmss(vt - z.tSince), z.x + 8, z.y + 20);
      // ícone sobre a mesa: ✓ atendida, … aguardando, ! sem atendimento / limpar já, ✕ suja, vazio = livre
      const glyph = { served: '✓', wait: '…', late: '!', dirty: '✕' }[z.cls];
      if (glyph) {
        const gx = z.x + z.w / 2, gy = z.y + z.h / 2, r = Math.max(11, Math.min(20, z.w / 6));
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(gx, gy, r, 0, 7); ctx.fill();
        ctx.fillStyle = '#0d0b09'; ctx.font = 'bold ' + Math.round(r * 1.3) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(glyph, gx, gy + 1); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
      }
    });
    if (drag) { ctx.setLineDash([6, 4]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(Math.min(drag.a.x, drag.b.x), Math.min(drag.a.y, drag.b.y), Math.abs(drag.a.x - drag.b.x), Math.abs(drag.a.y - drag.b.y)); ctx.setLineDash([]); }
    if (source === 'sim') { ctx.fillStyle = 'rgba(255,176,46,.9)'; ctx.font = 'bold 13px system-ui'; ctx.fillText('SIMULADO', W - 92, 24); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
