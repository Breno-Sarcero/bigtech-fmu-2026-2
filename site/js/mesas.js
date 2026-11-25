/* Módulo 1 — Mesas.
   Fonte de pessoas: detector COCO-SSD (real, no navegador) ou roteiro SIMULADO.
   A regra de estados da mesa é a mesma nos dois modos. O relógio da demo é acelerado. */
(function () {
  const W = 960, H = 540;
  const canvas = document.getElementById('mesaCanvas');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('mesaVideo');
  const hint = document.getElementById('mesaHint');
  const modePill = document.getElementById('mesaMode');
  const zonesBox = document.getElementById('zones');
  const alertsBox = document.getElementById('alerts');
  const $ = id => document.getElementById(id);

  const cfg = { thr: 2, dirty: 5, speed: 30 };
  [['thr', 'thrOut', v => v.toFixed(1).replace('.', ',')], ['dirty', 'dirtyOut', v => v], ['speed', 'speedOut', v => v]].forEach(([id, out, fmt]) => {
    const el = $(id);
    const upd = () => { cfg[id] = +el.value; $(out).textContent = fmt(+el.value); };
    el.addEventListener('input', upd); upd();
  });

  let source = 'none';       // none | video | image | cam | sim
  let imageEl = null;
  let model = null, modelLoading = false;
  let zones = [];
  let vt = 0;                 // relógio virtual em segundos
  let lastTs = performance.now();
  let lastDetect = 0;
  let detections = [];        // caixas em coordenadas do canvas
  let drag = null;
  let nextId = 1;

  const fmtT = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  // ---------- carregamento do modelo (só quando o usuário liga uma fonte real) ----------
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  async function ensureModel() {
    if (model || modelLoading) return;
    modelLoading = true;
    hint.textContent = 'Baixando o modelo de detecção (uma vez)...';
    try {
      await loadScript('vendor/tf.min.js');
      await loadScript('vendor/coco-ssd.min.js');
      model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      hint.textContent = 'Modelo pronto. Arraste sobre a imagem para marcar cada mesa.';
    } catch (e) {
      hint.textContent = 'Não consegui carregar o modelo (precisa de internet na primeira vez). Use o modo simulado.';
    }
    modelLoading = false;
  }

  // ---------- fontes ----------
  function setMode(m, label) { source = m; modePill.textContent = label; modePill.className = 'pill ' + (m === 'sim' ? 'sim' : m === 'none' ? '' : 'real'); }
  function stopMedia() {
    if (video.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
    video.pause(); video.removeAttribute('src'); video.load();
    imageEl = null; detections = [];
  }
  function resetZones() { zones.forEach(z => z.row.remove()); zones = []; alertsBox.textContent = ''; vt = 0; }

  $('mesaFile').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    stopMedia(); resetZones();
    const url = URL.createObjectURL(f);
    if (f.type.startsWith('image/')) {
      imageEl = new Image(); imageEl.onload = () => { setMode('image', 'foto · detecção real'); ensureModel(); }; imageEl.src = url;
    } else {
      video.src = url; video.loop = true; await video.play().catch(() => {}); setMode('video', 'vídeo · detecção real'); ensureModel();
    }
    hint.textContent = 'Arraste sobre a imagem para marcar cada mesa.';
  });
  $('mesaCam').addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stopMedia(); resetZones(); video.srcObject = stream; await video.play();
      setMode('cam', 'webcam · detecção real'); ensureModel();
    } catch (e) { hint.textContent = 'Webcam indisponível ou negada.'; }
  });
  $('mesaSim').addEventListener('click', () => { stopMedia(); resetZones(); startSim(); });
  $('mesaClear').addEventListener('click', () => { resetZones(); });

  // ---------- marcação de mesas com o mouse ----------
  function pos(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener('pointerdown', ev => { if (source === 'none' || source === 'sim') return; drag = { a: pos(ev), b: pos(ev) }; canvas.setPointerCapture(ev.pointerId); });
  canvas.addEventListener('pointermove', ev => { if (drag) drag.b = pos(ev); });
  canvas.addEventListener('pointerup', () => {
    if (!drag) return;
    const x = Math.min(drag.a.x, drag.b.x), y = Math.min(drag.a.y, drag.b.y);
    const w = Math.abs(drag.a.x - drag.b.x), h = Math.abs(drag.a.y - drag.b.y);
    drag = null;
    if (w > 25 && h > 25) addZone(x, y, w, h);
  });

  // ---------- zonas e máquina de estados ----------
  // livre → aguardando (ocupada sem atendimento) → atendida → suja (saiu) → livre
  function addZone(x, y, w, h, scripted) {
    const id = nextId++;
    const z = { id, name: 'Mesa ' + (zones.length + 1), x, y, w, h, state: 'free', persons: 0, tSince: vt, lastSeen: -999, alerted: false, scripted: scripted || null };
    const row = document.createElement('div'); row.className = 'zone';
    const chip = document.createElement('span'); chip.className = 'chip free'; chip.textContent = 'livre';
    const info = document.createElement('div'); const nm = document.createElement('b'); nm.textContent = z.name;
    const sm = document.createElement('small'); sm.textContent = '—'; info.append(nm, sm);
    const acts = document.createElement('div'); acts.className = 'acts';
    const b1 = document.createElement('button'); b1.textContent = 'Garçom atendeu';
    const b2 = document.createElement('button'); b2.textContent = 'Mesa limpa';
    b1.addEventListener('click', () => serve(z)); b2.addEventListener('click', () => clean(z));
    acts.append(b1, b2); row.append(chip, info, acts); zonesBox.appendChild(row);
    Object.assign(z, { row, chip, sm, b1, b2 });
    zones.push(z);
    return z;
  }
  function log(msg, ok) {
    const d = document.createElement('div'); if (ok) d.className = 'ok';
    d.textContent = '[' + fmtT(vt) + '] ' + msg; alertsBox.prepend(d);
    while (alertsBox.childNodes.length > 40) alertsBox.lastChild.remove();
  }
  function serve(z) { if (z.state === 'wait') { z.state = 'served'; z.tSince = vt; z.alerted = false; log(z.name + ' atendida após ' + fmtT(vt - z.tOcc), true); } }
  function clean(z) { if (z.state === 'dirty') { z.state = 'free'; z.tSince = vt; z.alerted = false; log(z.name + ' limpa e liberada.', true); } }

  function step(z) {
    const present = z.persons > 0;
    if (present) z.lastSeen = vt;
    const absent = vt - z.lastSeen > 8;    // tolera falha de detecção de até 8 s
    switch (z.state) {
      case 'free': if (present) { z.state = 'wait'; z.tOcc = vt; z.tSince = vt; z.alerted = false; } break;
      case 'wait':
        if (absent) { z.state = 'free'; z.tSince = vt; break; }       // quem sentou foi embora antes de ser atendido
        if (!z.alerted && vt - z.tSince > cfg.thr * 60) { z.alerted = true; log('ALERTA ' + z.name + ': ' + cfg.thr.toString().replace('.', ',') + ' min sem atendimento. Avisar o metre da praça.'); }
        break;
      case 'served': if (absent) { z.state = 'dirty'; z.tSince = vt; z.alerted = false; log(z.name + ' vagou: aguardando limpeza.', true); } break;
      case 'dirty':
        if (present) { z.state = 'wait'; z.tOcc = vt; z.tSince = vt; z.alerted = false; break; }
        if (!z.alerted && vt - z.tSince > cfg.dirty * 60) { z.alerted = true; log('ALERTA ' + z.name + ': suja há ' + cfg.dirty + ' min. Enviar limpeza.'); }
        break;
    }
  }
  const LABEL = { free: ['livre', 'free'], wait: ['aguardando', 'wait'], served: ['atendida', 'served'], dirty: ['suja', 'dirty'] };
  function paintRow(z) {
    let [txt, cls] = LABEL[z.state];
    if (z.state === 'wait' && z.alerted) { txt = 'sem atendimento'; cls = 'late'; }
    if (z.state === 'dirty' && z.alerted) { txt = 'limpar já'; cls = 'late'; }
    z.chip.textContent = txt; z.chip.className = 'chip ' + cls;
    z.sm.textContent = z.persons + ' pessoa(s) · ' + (z.state === 'free' ? 'há ' : 'estado há ') + fmtT(vt - z.tSince);
    z.b1.disabled = z.state !== 'wait'; z.b2.disabled = z.state !== 'dirty';
    z.cls = cls;
  }
  const COLORS = { free: '#3ddc84', wait: '#ffb02e', late: '#ff4d4d', served: '#5ab0ff', dirty: '#ff9a6b' };

  // ---------- detecção real ----------
  function fitTransform(vw, vh) {
    const s = Math.min(W / vw, H / vh);
    return { s, ox: (W - vw * s) / 2, oy: (H - vh * s) / 2 };
  }
  async function detect(el, vw, vh) {
    if (!model) return;
    const preds = await model.detect(el);
    const t = fitTransform(vw, vh);
    detections = preds.filter(p => p.class === 'person' && p.score > 0.45).map(p => ({
      x: p.bbox[0] * t.s + t.ox, y: p.bbox[1] * t.s + t.oy, w: p.bbox[2] * t.s, h: p.bbox[3] * t.s, score: p.score
    }));
    zones.forEach(z => {
      z.persons = detections.filter(d => { const cx = d.x + d.w / 2, cy = d.y + d.h * 0.75; return cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h; }).length;
    });
  }

  // ---------- modo simulado (roteiro rotulado) ----------
  const SIM_LEN = 480;
  function startSim() {
    setMode('sim', 'SIMULADO · roteiro de exemplo');
    hint.textContent = 'Modo simulado: pessoas e atendimentos seguem um roteiro. A regra de alerta é a mesma da detecção real.';
    const mk = (x, y, script) => addZone(x, y, 200, 130, script);
    // script: [chegada, saída, atendimento (ou null = ninguém atende)]
    mk(110, 130, { in: 10, out: 300, serve: 70, n: 2 });
    mk(380, 130, { in: 25, out: 420, serve: null, n: 3 });
    mk(650, 130, { in: 50, out: 360, serve: 190, n: 4 });
    mk(245, 340, { in: 140, out: 250, serve: 160, n: 2 });
    mk(515, 340, { in: 200, out: 470, serve: 215, n: 1 });
    vt = 0;
  }
  function simUpdate() {
    if (vt > SIM_LEN) { zones.forEach(z => { z.state = 'free'; z.persons = 0; z.lastSeen = -999; z.tSince = 0; z.alerted = false; z.servedDone = false; }); vt = 0; alertsBox.textContent = ''; }
    zones.forEach(z => {
      const s = z.scripted;
      z.persons = (vt >= s.in && vt < s.out) ? s.n : 0;
      if (s.serve !== null && vt >= s.serve && vt < s.out && z.state === 'wait') serve(z);
      if (vt >= s.out + 40 && z.state === 'dirty' && !z.servedDone) { z.servedDone = true; clean(z); }
      if (vt < s.in) z.servedDone = false;
    });
  }
  function drawSim() {
    ctx.fillStyle = '#17120e'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    zones.forEach(z => {
      ctx.fillStyle = '#3a2d22'; roundRect(z.x + 40, z.y + 28, z.w - 80, z.h - 56, 12); ctx.fill();
      const n = z.persons;
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(n, 1)) * Math.PI * 2;
        ctx.fillStyle = '#e8d5bf'; ctx.beginPath(); ctx.arc(z.x + z.w / 2 + Math.cos(a) * 62, z.y + z.h / 2 + Math.sin(a) * 38, 11, 0, 7); ctx.fill();
      }
      if (z.state === 'dirty') { ctx.fillStyle = 'rgba(255,154,107,.5)'; roundRect(z.x + 60, z.y + 40, 40, 20, 4); ctx.fill(); }
    });
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  // ---------- laço principal ----------
  function frame(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.25); lastTs = ts;
    if (source !== 'none') vt += dt * cfg.speed;
    ctx.clearRect(0, 0, W, H);
    if (source === 'sim') { simUpdate(); drawSim(); }
    else if (source === 'video' || source === 'cam') {
      if (video.videoWidth) {
        const t = fitTransform(video.videoWidth, video.videoHeight);
        ctx.drawImage(video, t.ox, t.oy, video.videoWidth * t.s, video.videoHeight * t.s);
        if (ts - lastDetect > 450 && model) { lastDetect = ts; detect(video, video.videoWidth, video.videoHeight); }
      }
    } else if (source === 'image' && imageEl) {
      const t = fitTransform(imageEl.naturalWidth, imageEl.naturalHeight);
      ctx.drawImage(imageEl, t.ox, t.oy, imageEl.naturalWidth * t.s, imageEl.naturalHeight * t.s);
      if (model && ts - lastDetect > 1500) { lastDetect = ts; detect(imageEl, imageEl.naturalWidth, imageEl.naturalHeight); }
    } else {
      ctx.fillStyle = '#0d0b09'; ctx.fillRect(0, 0, W, H);
    }
    // caixas de pessoas (detecção real)
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.font = '14px system-ui'; ctx.fillStyle = '#fff';
    detections.forEach(d => { ctx.strokeRect(d.x, d.y, d.w, d.h); ctx.fillText('pessoa ' + Math.round(d.score * 100) + '%', d.x + 4, d.y + 16); });
    // mesas
    zones.forEach(z => {
      step(z); paintRow(z);
      const c = COLORS[z.cls] || '#fff';
      ctx.lineWidth = 4; ctx.strokeStyle = c; ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = c + '22'; ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = c; ctx.font = 'bold 15px system-ui';
      ctx.fillText(z.name + ' · ' + fmtT(vt - z.tSince), z.x + 8, z.y + 20);
    });
    if (drag) { ctx.setLineDash([6, 4]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(Math.min(drag.a.x, drag.b.x), Math.min(drag.a.y, drag.b.y), Math.abs(drag.a.x - drag.b.x), Math.abs(drag.a.y - drag.b.y)); ctx.setLineDash([]); }
    // selo de modo
    if (source === 'sim') { ctx.fillStyle = 'rgba(255,176,46,.9)'; ctx.font = 'bold 13px system-ui'; ctx.fillText('SIMULADO', W - 92, 24); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
