# Visão do Salão — Bovinu's Grill & Beer (Augusta)

Projeto do **Hackathon Tech FMU 2026.2**. Usamos as câmeras Intelbras que a casa já tem, mais visão computacional, para:

- **Mesas:** avisar o metre quando uma mesa espera atendimento ou limpeza além do tempo configurado (sugestão: 1–2 min).
- **Mix do prato:** mostrar a proporção de carne, carboidrato, salada e sobremesa junto do peso que o sistema já registra.
- **Fila e lotação:** simular o pico do almoço e mostrar a ocupação do salão.
- **Buffet e avaliação:** reposição das cubas e QR code na mesa que abre a avaliação no Google.

Nada de pagamento, cozinha, compras ou estoque é alterado, e a balança não é o foco. O atendimento continua humano; a IA só avisa.

**Isto é uma proposta de análise, não a solução definitiva.** Ao estudar o caso percebemos que faltam dados e métricas para apontar com certeza onde está o problema; só a fila tem número informado pela empresa (4 min contra 2,5 ideais). O protótipo mostra como medir o salão com o que a casa já tem, e o plano propõe uma fase 0 de coleta para confirmar onde está o ganho antes de qualquer compra.

Equipe **BIG Tech**: **B**reno, **I**gor e **G**iovana.

## Ver funcionando

Abra `site/index.html` por um servidor estático (a página carrega bibliotecas locais e, na demo de mesas, um modelo de detecção):

```bash
python -m http.server 8765
# depois abra http://localhost:8765/site/
```

| Demo | O que é real | O que é simulado |
|---|---|---|
| Mesas | Detector de pessoas (COCO-SSD / TensorFlow.js) rodando no navegador sobre o vídeo ou foto enviados. Regra de estados da mesa. | O sinal "garçom atendeu" (botão) e o modo roteiro. |
| Fila e lotação | Simulação de eventos discretos executada no navegador. | Chegadas e permanência são hipóteses; o tempo de atendimento foi calibrado para os ~4 min relatados. |
| Mix do prato | Heurística de cor sobre os pixels da foto. | O prato de exemplo é uma ilustração sintética. |
| Custo e retorno | Cálculo ao vivo. | Todos os valores são hipóteses, não da empresa. |

## Estrutura

```
site/      página (HTML, CSS, JS e bibliotecas em vendor/)
docs/      documento de instalação (IA paga × ML local)
ml/        scripts Python de apoio
amostras/  imagens e vídeos de exemplo (nossos ou públicos)
video/     vídeo de apresentação
```

## Limites e transparência

- Números da empresa (600 clientes/dia, 450 lugares, fila de 4 min, pico 11h50–13h30) foram informados no evento. Não os medimos.
- Integração com JS Softcom e RTSP/ONVIF das câmeras são **premissas** a verificar numa fase 0.
- Sem reconhecimento facial. A IA lê mesas e pratos, não pessoas.
- Projeto acadêmico. Uma implantação comercial exige revisar licenças dos modelos e patentes.
- A Bovinu's não endossa nem validou esta proposta.

## Bibliotecas

GSAP e ScrollTrigger (animação), TensorFlow.js e COCO-SSD (detecção), qrcode-generator (QR code). Cada uma segue a própria licença.
