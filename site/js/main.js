/* Animações de rolagem (GSAP + ScrollTrigger), QR code e vídeo de apresentação. */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.registerPlugin(ScrollTrigger);

  // Barra de progresso da página
  gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { scrub: 0.2, start: 0, end: 'max' } });

  if (!reduce) {
    // Entrada do hero, linha por linha
    gsap.from('#hero h1 .line > span', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.15, delay: 0.2 });
    gsap.from(['#heroPill', '#heroAsk', '#heroLead'], { opacity: 0, y: 24, duration: 1, delay: 0.5, stagger: 0.15 });
    // "invisível." começa só como contorno e é preenchida da esquerda para a direita: a resposta é revelada
    gsap.fromTo('#hero .inv .fill', { clipPath: 'inset(-10% 100% -10% 0)' }, { clipPath: 'inset(-10% 0% -10% 0)', duration: 1.6, delay: 1, ease: 'power2.inOut' });

    // Métricas escondidas: cada uma acende aos poucos, fica um instante e apaga, em tempos diferentes
    gsap.utils.toArray('.hidden-metrics span').forEach((el, i) => {
      gsap.timeline({ repeat: -1, delay: 1.6 + i * 0.5, repeatDelay: 1.5 + (i % 4) })
        .to(el, { opacity: 0.8, duration: 1.8, ease: 'sine.inOut' })
        .to(el, { opacity: 0, duration: 1.8, ease: 'sine.inOut' }, '+=1.4');
    });

    // Nome da equipe: as iniciais entram primeiro e o resto do nome aparece depois
    gsap.from('.wordmark b', { yPercent: 60, opacity: 0, duration: 0.9, ease: 'power4.out', stagger: 0.12, scrollTrigger: { trigger: '.wordmark', start: 'top 85%', once: true } });
    gsap.from('.wordmark i', { opacity: 0, x: -14, duration: 0.7, ease: 'power2.out', stagger: 0.12, delay: 0.5, scrollTrigger: { trigger: '.wordmark', start: 'top 85%', once: true } });

    // Revelação ao rolar
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%', once: true,
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 })
    });

    // Seção pinada: 4 passos da solução trocam conforme a rolagem
    const steps = gsap.utils.toArray('.step');
    const vis = ['#i1', '#v2,#i2,#b2', '#i3', '#v4,#i4,#b4'];   // desenho SVG + imagem (se existir)
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '#solucao', start: 'top top', end: '+=3200', scrub: 0.6, pin: '#solucao .pin', anticipatePin: 1 }
      });
      steps.forEach((s, i) => {
        tl.fromTo(s, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 }, i * 3)
          .fromTo(vis[i], { opacity: 0, scale: 0.9, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 1 }, i * 3);
        if (i < steps.length - 1) {
          tl.to(s, { opacity: 0, y: -40, duration: 1 }, i * 3 + 2)
            .to(vis[i], { opacity: 0, scale: 1.08, duration: 1 }, i * 3 + 2);
        }
      });
    });
    mm.add('(max-width: 860px)', () => { gsap.set('.vis', { opacity: 1 }); });
    // posições do pin são medidas no carregamento; recalcula quando fontes e imagens terminam e quando o layout acima muda
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.refreshScroll = (() => { let t; return () => { clearTimeout(t); t = setTimeout(refresh, 150); }; })();
    // qualquer mudança de altura acima da seção pinada (lista de mesas, textos, imagens) recalcula as posições
    if (window.ResizeObserver) {
      let ultima = document.documentElement.scrollHeight;
      new ResizeObserver(() => { const h = document.documentElement.scrollHeight; if (Math.abs(h - ultima) > 2) { ultima = h; window.refreshScroll(); } }).observe(document.body);
    }
  } else {
    gsap.set('.vis', { opacity: 1 });
  }

  // Contadores
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = +el.dataset.count;
    if (reduce) { el.textContent = target; return; }
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } })
    });
  });


  // Chamadas para o teste: depois de enviar o vídeo ou pedir o exemplo, leva o usuário ao painel de mesas
  const goMesas = () => document.getElementById('mesas').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  document.getElementById('mesaFile').addEventListener('change', goMesas);
  document.getElementById('ctaSim').addEventListener('click', () => { document.getElementById('mesaSim').click(); goMesas(); });

  // Vídeo de apresentação: só aparece se o arquivo existir
  const v = document.getElementById('pitchVideo');
  v.addEventListener('loadedmetadata', () => {
    v.style.display = 'block';
    document.getElementById('videoPh').style.display = 'none';
  });
  v.load();
})();
