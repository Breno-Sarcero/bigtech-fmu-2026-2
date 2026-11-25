/* Calculadora de custo e retorno. Todos os valores são HIPÓTESES ajustáveis, não dados da empresa. */
(function () {
  const $ = id => document.getElementById(id);
  const ids = ['rT', 'rN', 'rM', 'rV', 'rI', 'rC'];
  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = v => String(v).replace('.', ',');
  function kpi(label, value, cls) { const d = document.createElement('div'); d.className = 'kpi ' + (cls || ''); const b = document.createElement('b'); b.textContent = value; const s = document.createElement('span'); s.textContent = label; d.append(b, s); return d; }

  function calc() {
    const v = {}; ids.forEach(i => v[i] = +$(i).value);
    $('rTOut').textContent = v.rT; $('rNOut').textContent = v.rN; $('rMOut').textContent = pct(v.rM); $('rVOut').textContent = pct(v.rV);
    $('rIOut').textContent = v.rI; $('rCOut').textContent = v.rC;
    const fat = v.rN * v.rT * 30;
    const ganho = fat * (v.rM + v.rV) / 100;
    const liquido = ganho - v.rC;
    const box = $('roiKpis'); box.textContent = '';
    box.append(
      kpi('faturamento mensal estimado', brl(fat)),
      kpi('ganho bruto por mês', brl(ganho)),
      kpi('ganho líquido por mês', brl(liquido), liquido > 0 ? 'good' : 'bad'),
      kpi('retorno do investimento', liquido > 0 ? (v.rI / liquido).toFixed(1).replace('.', ',') + ' meses' : 'não se paga', liquido > 0 && v.rI / liquido <= 12 ? 'good' : 'bad')
    );
  }
  ids.forEach(i => $(i).addEventListener('input', calc));
  calc();
})();
