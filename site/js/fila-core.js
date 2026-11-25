/* Núcleo do simulador de fila (sem DOM, testável em Node).
   Modelo: chegadas seguem uma curva em sino com pico às 12h40 (janela 11h–14h30),
   atendimento por N churrasqueiros em fila única (FIFO), tempo de atendimento lognormal.
   Ocupação do salão = clientes que chegaram e ainda estão dentro da permanência. */
(function (root) {
  const WINDOW = 210;          // minutos simulados: 11h00 a 14h30
  const PEAK_AT = 100;         // 12h40
  const SIGMA = 32;            // largura do pico, em minutos
  const PEAK_FROM = 50, PEAK_TO = 150;   // 11h50 a 13h30

  function rng(seed) {         // mulberry32: determinístico, bom o bastante para simulação
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function normal(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
  function lognormal(r, mean, cv) {
    const s2 = Math.log(1 + cv * cv), mu = Math.log(mean) - s2 / 2;
    return Math.exp(mu + Math.sqrt(s2) * normal(r));
  }
  function arrivalTime(r) {    // normal truncada na janela
    for (;;) { const t = PEAK_AT + SIGMA * normal(r); if (t >= 0 && t < WINDOW) return t; }
  }

  function once(p, seed) {
    const r = rng(seed);
    const nGrill = Math.round(p.clientes * p.pctChurras);
    const arr = Array.from({ length: nGrill }, () => arrivalTime(r)).sort((a, b) => a - b);
    const free = new Array(p.servidores).fill(0);
    const waits = new Array(nGrill);
    for (let i = 0; i < nGrill; i++) {
      let k = 0; for (let j = 1; j < free.length; j++) if (free[j] < free[k]) k = j;
      const start = Math.max(arr[i], free[k]);
      waits[i] = start - arr[i];
      free[k] = start + lognormal(r, p.servSeg / 60, 0.5);
    }
    // ocupação por minuto
    const occ = new Array(WINDOW + 120).fill(0);
    for (let i = 0; i < p.clientes; i++) {
      const t0 = arrivalTime(r), t1 = t0 + lognormal(r, p.permMin, 0.4);
      for (let m = Math.ceil(t0); m < Math.min(occ.length, Math.floor(t1)); m++) occ[m]++;
    }
    return { arr, waits, occ };
  }

  function simulate(p, replicas) {
    replicas = replicas || 40;
    const BIN = 5, nb = WINDOW / BIN;
    const sumW = new Array(nb).fill(0), cntW = new Array(nb).fill(0);
    const occSum = new Array(WINDOW + 120).fill(0);
    let peakWaits = [];
    for (let k = 0; k < replicas; k++) {
      const { arr, waits, occ } = once(p, 1000 + k);
      for (let i = 0; i < arr.length; i++) {
        const b = Math.min(nb - 1, Math.floor(arr[i] / BIN));
        sumW[b] += waits[i]; cntW[b]++;
        if (arr[i] >= PEAK_FROM && arr[i] <= PEAK_TO) peakWaits.push(waits[i]);
      }
      for (let m = 0; m < occ.length; m++) occSum[m] += occ[m];
    }
    const espera = sumW.map((s, i) => cntW[i] ? s / cntW[i] : 0);
    const ocup = occSum.map(s => s / replicas);
    peakWaits.sort((a, b) => a - b);
    const mean = peakWaits.length ? peakWaits.reduce((a, b) => a + b, 0) / peakWaits.length : 0;
    const p90 = peakWaits.length ? peakWaits[Math.floor(peakWaits.length * 0.9)] : 0;
    let occMax = 0, occAt = 0; ocup.forEach((v, i) => { if (v > occMax) { occMax = v; occAt = i; } });
    return { BIN, espera, ocup, mediaPico: mean, p90Pico: p90, ocupMax: occMax, ocupMaxEm: occAt };
  }

  const api = { simulate, WINDOW, PEAK_FROM, PEAK_TO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FilaCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
