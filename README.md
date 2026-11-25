# VisÃ£o do SalÃ£o â€” Bovinu's Grill & Beer (Augusta)

Projeto do **Hackathon Tech FMU 2026.2**. Usamos as cÃ¢meras Intelbras que a casa jÃ¡ tem, mais visÃ£o computacional, para:

- **Mesas:** avisar o metre quando uma mesa espera atendimento ou limpeza alÃ©m do tempo configurado (sugestÃ£o: 1â€“2 min).
- **Mix do prato:** mostrar a proporÃ§Ã£o de carne, carboidrato, salada e sobremesa junto do peso que o sistema jÃ¡ registra.
- **Fila e lotaÃ§Ã£o:** simular o pico do almoÃ§o e mostrar a ocupaÃ§Ã£o do salÃ£o.
- **Buffet e avaliaÃ§Ã£o:** reposiÃ§Ã£o das cubas e QR code na mesa que abre a avaliaÃ§Ã£o no Google.

Nada de pagamento, cozinha, compras ou estoque Ã© alterado, e a balanÃ§a nÃ£o Ã© o foco. O atendimento continua humano; a IA sÃ³ avisa.

**Isto Ã© uma proposta de anÃ¡lise, nÃ£o a soluÃ§Ã£o definitiva.** Ao estudar o caso percebemos que faltam dados e mÃ©tricas para apontar com certeza onde estÃ¡ o problema; sÃ³ a fila tem nÃºmero informado pela empresa (4 min contra 2,5 ideais). O protÃ³tipo mostra como medir o salÃ£o com o que a casa jÃ¡ tem, e o plano propÃµe uma fase 0 de coleta para confirmar onde estÃ¡ o ganho antes de qualquer compra.

Equipe **BIG Tech**: **B**reno, **I**gor e **G**iovana.

## Ver funcionando

Abra `site/index.html` por um servidor estÃ¡tico (a pÃ¡gina carrega bibliotecas locais e, na demo de mesas, um modelo de detecÃ§Ã£o):

```bash
python -m http.server 8765
# depois abra http://localhost:8765/site/
```

| Demo | O que Ã© real | O que Ã© simulado |
|---|---|---|
| Mesas | Detector de pessoas (COCO-SSD / TensorFlow.js) rodando no navegador sobre o vÃ­deo ou foto enviados. Regra de estados da mesa. | O sinal "garÃ§om atendeu" (botÃ£o) e o modo roteiro. |
| Fila e lotaÃ§Ã£o | SimulaÃ§Ã£o de eventos discretos executada no navegador. | Chegadas e permanÃªncia sÃ£o hipÃ³teses; o tempo de atendimento foi calibrado para os ~4 min relatados. |
| Mix do prato | HeurÃ­stica de cor sobre os pixels da foto. | O prato de exemplo Ã© uma ilustraÃ§Ã£o sintÃ©tica. |
| Custo e retorno | CÃ¡lculo ao vivo. | Todos os valores sÃ£o hipÃ³teses, nÃ£o da empresa. |

## Estrutura

```
site/      pÃ¡gina (HTML, CSS, JS e bibliotecas em vendor/)
docs/      documento de instalaÃ§Ã£o (IA paga Ã— ML local)
ml/        scripts Python de apoio
amostras/  imagens e vÃ­deos de exemplo (nossos ou pÃºblicos)
video/     vÃ­deo de apresentaÃ§Ã£o
```

## Limites e transparÃªncia

- NÃºmeros da empresa (600 clientes/dia, 450 lugares, fila de 4 min, pico 11h50â€“13h30) foram informados no evento. NÃ£o os medimos.
- IntegraÃ§Ã£o com JS Softcom e RTSP/ONVIF das cÃ¢meras sÃ£o **premissas** a verificar numa fase 0.
- Sem reconhecimento facial. A IA lÃª mesas e pratos, nÃ£o pessoas.
- Projeto acadÃªmico. Uma implantaÃ§Ã£o comercial exige revisar licenÃ§as dos modelos e patentes.
- A Bovinu's nÃ£o endossa nem validou esta proposta.

## Bibliotecas

GSAP e ScrollTrigger (animaÃ§Ã£o), TensorFlow.js e COCO-SSD (detecÃ§Ã£o), qrcode-generator (QR code). Cada uma segue a prÃ³pria licenÃ§a.
