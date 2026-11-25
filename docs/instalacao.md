# Documento de instalação — Vendo o invisível

Proposta da equipe **BIG Tech** (Breno, Igor e Giovanna) para a Bovinu's Grill & Beer – Augusta, no Hackathon Tech FMU 2026.2.

> **Isto é uma proposta de análise, não a solução definitiva.** Percebemos que faltam dados e métricas para apontar com certeza onde está o problema; só a fila tem número informado pela empresa. Este documento descreve como **instalar a coleta** que falta, com o que a casa já tem, e como decidir o próximo passo com base em dados.

## 1. Resumo

| | |
|---|---|
| **Ideia** | Câmeras que já existem + IA geram as métricas que hoje ninguém registra: tempo de mesa sem atendimento, mesa suja, fila, mix do prato e nível das cubas. |
| **O que muda para a equipe** | Nada no atendimento. A IA só avisa; quem atende e limpa continua sendo gente. |
| **O que não mexemos** | Pagamento, cozinha, compras e estoque (a pedido da empresa). A balança não é o foco. Nenhum sistema é trocado. |
| **Primeiro passo** | **Fase 0** de levantamento, sem comprar nada. |
| **Duas rotas de IA** | A) IA paga na nuvem. B) Machine learning local, em um computador dentro da loja. |

## 2. O que sabemos e o que assumimos

Dados abaixo foram ditos pela equipe da Bovinu's na sessão de perguntas e respostas do hackathon. Nada foi medido por nós.

| Fato | Valor | Fonte |
|---|---|---|
| Refeições por dia | ~600 de segunda a sexta; ~250 no sábado e ~250 no domingo | Empresa |
| Lugares | ~450 (cerca de 90 mesas) | Empresa |
| Horário de pico | 11h50 às 13h30 | Empresa |
| Fila da churrasqueira | "Chegou a bater 4 minutos"; o ideal seria 2,5 | Empresa |
| Churrasqueiros | 4 no pico, 3 atendendo o público e 1 no fogo | Empresa |
| Concentração no pico | 70 a 80% das refeições do dia | **Estimativa da equipe** |
| Sistema | JS Softcom, em servidor local, guarda peso e valor por comanda e só o horário de fechamento da conta | Empresa |
| Câmeras | Intelbras, com gravação local e na nuvem | Empresa |

### Premissas (nada disto foi confirmado pela Bovinu's)

Legenda: 🟢 fonte sólida · 🟡 inferência razoável · 🔴 sem informação.

| # | Premissa | Confiança | O que fazer na fase 0 |
|---|---|---|---|
| 1 | O JS Softcom pode entregar dados por **exportação CSV** ou **leitura somente-leitura do banco local**. Não achamos documentação pública. | 🔴 | Perguntar ao fornecedor. O sistema de IA funciona **com ou sem** essa integração. |
| 2 | As câmeras IP Intelbras entregam vídeo por **RTSP/ONVIF** (padrão em câmeras IP da marca). A analítica embarcada via RTSP não foi confirmada. | 🟡 | Testar o modelo instalado, com a câmera real. |
| 3 | Os ângulos das câmeras mostram o salão, mas talvez **não** o buffet e a balança. | 🔴 | Levantar e, se faltar, **recomendar** câmera adicional. |
| 4 | Os metres têm celular, já que os garçons usam celulares ligados ao servidor por Wi-Fi. | 🟡 | Alerta por **painel web (PWA)** no celular, sem exigir hardware novo. |
| 5 | O servidor local do JS Softcom **provavelmente não tem GPU** e talvez não tenha folga para IA. | 🔴 | Prever um computador dedicado (rota B) ou a nuvem (rota A). |
| 6 | Só investimento pequeno; hardware novo apenas se a métrica justificar. | 🟢 | Piloto mínimo e crescimento por etapa. |
| 7 | **Número de cubas do buffet: desconhecido.** | 🔴 | Contar na fase 0; define o custo do módulo e do sensor. |
| 8 | Aceitam trocar para um prato maior e raso (melhora a leitura do mix). | 🔴 | Tratar como ajuste **opcional**; o sistema funciona com o prato atual, com menor precisão. |
| 9 | Aceitam um aviso de câmera/IA no salão. | 🟡 | Prever o aviso (seção 8). |

## 3. Fase 0 — Levantamento (sem comprar nada)

Duração sugerida: 1 a 2 semanas. Resultado: um relatório curto que diz **o que dá para medir hoje**, o que falta e quanto custa cada módulo.

**Checklist**
- [ ] Listar as câmeras: modelo, resolução, posição, altura, campo de visão, gravador (NVR) e se o **RTSP/ONVIF** está habilitado.
- [ ] Marcar, em uma planta ou foto, quais câmeras enxergam: salão, buffet (cubas), balanças e churrasqueira.
- [ ] Verificar rede e Wi-Fi no salão (celular do metre) e a internet da loja (necessária na rota A).
- [ ] Perguntar ao fornecedor do JS Softcom se há exportação CSV ou acesso somente-leitura ao banco.
- [ ] **Contar as cubas** do buffet e anotar os tipos (Gastronorm 1/1, profundidades).
- [ ] Descobrir a **cor do uniforme** do garçom (ajuste opcional do detector).
- [ ] Gravar uma amostra curta de cada câmera (com autorização e aviso) para testar o modelo.
- [ ] Definir com a gerência os 3 parâmetros: tempo até o alerta de atendimento, tempo de mesa suja e quem recebe cada alerta.

**Critério de saída (vale a pena seguir?)**
- Pelo menos 1 câmera enxerga as mesas com resolução suficiente para ver pessoas sentadas.
- O vídeo chega a um computador da rede da loja (RTSP funcionando).
- A gerência concorda com os parâmetros e com o aviso aos clientes.

Se algum item falhar, o relatório diz o que corrigir (por exemplo, reposicionar uma câmera) antes de avançar.

## 4. Arquitetura

```
 Câmeras Intelbras ──RTSP/ONVIF*──▶ Nó de IA ──▶ Regras e eventos ──▶ Painel do metre (PWA)
 (já instaladas)                   (rota A ou B)   mesa · cuba · prato        no celular
                                        ▲
 JS Softcom (servidor local) ── CSV / leitura somente-leitura (opcional)
```
\* Caminho provável para câmeras IP Intelbras; a fase 0 confirma.

Princípios:
- **Nada é trocado.** A IA roda ao lado dos sistemas atuais.
- **Só eventos e contagens saem do nó de IA** (por exemplo, "Mesa 7 sem atendimento há 2 min"). Vídeo e imagens não são armazenados por padrão.
- **O painel funciona sem a integração do JS Softcom.** Se ela existir, as comandas abertas melhoram a estimativa de lotação.

## 5. Duas rotas de IA

### Rota A — IA paga na nuvem (API de visão)
- **Como funciona:** a loja envia quadros do vídeo para um serviço pago, que devolve o que viu.
- **Vantagens:** integração rápida; nenhum computador novo para rodar o modelo; modelos mantidos pelo fornecedor.
- **Desvantagens:** **custo por uso**, que cresce com câmeras × horas × quadros por minuto; **as imagens saem da loja** (exige atenção redobrada de LGPD); depende de internet estável.
- **Cálculo do custo:** `custo mensal ≈ câmeras × horas por dia × dias × quadros por hora × preço por quadro`. O preço vigente deve ser consultado no fornecedor na fase 0; **não usamos número inventado aqui.**

### Rota B — Machine learning local (modelos abertos)
- **Como funciona:** um computador dentro da loja roda o modelo. O protótipo desta proposta usa o mesmo tipo de modelo (COCO-SSD) e já roda no navegador de um computador comum.
- **Vantagens:** **sem custo por uso**; **as imagens nunca saem da casa**; funciona sem internet; custo previsível.
- **Desvantagens:** exige um computador dedicado (o servidor do JS Softcom provavelmente não tem folga nem GPU), instalação e atualização do modelo.
- **Requisito de hardware:** depende do número de câmeras e de quadros por segundo; **dimensionar na fase 0** com a amostra real. Um mini-PC dedicado, na rede da loja, é o ponto de partida.

### Como escolher

| Pergunta | Rota A | Rota B |
|---|---|---|
| A casa quer que as imagens fiquem dentro? | Não é possível garantir | **Sim** |
| Precisa começar rápido, com poucas câmeras? | **Sim** | Possível, com um mini-PC |
| A internet da loja é estável? | Obrigatória | Não necessária |
| Quer custo previsível? | Cresce com o uso | **Sim** |

**Recomendação da equipe:** **começar pela rota B no piloto** (privacidade e custo previsível). A rota A fica como alternativa para algum módulo que o modelo local não resolva bem ou para uma prova de conceito muito rápida.

## 6. Como cada módulo é instalado

### 6.1 Mesas
- **Precisa de:** uma ou mais câmeras com visão oblíqua do salão. Câmeras muito altas ou com pessoas pequenas reduzem a precisão.
- **O que o sistema faz:** detecta as mesas (ou as infere pelos clientes sentados), acompanha o estado (livre → aguardando → atendida → suja → livre), identifica o atendimento (alguém em pé junto à mesa por alguns segundos; a cor do uniforme afina) e a mesa suja (objetos sobrando depois que os clientes saem).
- **Saída:** alerta ao metre da praça. Padrões de partida: 2 min sem atendimento e 5 min de mesa suja, **configuráveis pela gerência**.
- **Referência de mercado:** casos públicos usam limites parecidos, como 3 min sem garçom e 10 min de mesa suja.

### 6.2 Mix do prato
- **Precisa de:** uma câmera sobre o ponto de pesagem, de cima.
- **O que o sistema faz:** separa o prato em carne, carboidrato, salada e sobremesa e estima a **proporção por área**, junto do peso que o sistema já registra.
- **Limite:** área não é volume nem densidade. Prato maior e raso melhora a leitura. Em produção, entra um modelo de segmentação treinado com imagens do próprio buffet.

### 6.3 Fila e lotação
- **Precisa de:** nada novo para a simulação; câmera na fila e/ou as comandas abertas para a medição real.
- **O que o sistema faz:** simula o pico, estima a espera e mostra a lotação. Com dados reais da fase 0, a simulação é calibrada.
- **Observação:** a empresa já oferece 10% de desconto antes das 12h e depois das 13h30 para aliviar o pico; as métricas dizem se isso funciona.

### 6.4 Cubas do buffet
- **Precisa de:** câmera sobre o buffet com cada cuba marcada uma única vez na instalação. Se não houver câmera bem posicionada, **recomendamos instalar uma.**
- **O que o sistema faz:** estima o nível de cada cuba pela área visível com comida, avisa a hora de repor (abaixo de 25% é "repor") e conta as reposições para mostrar o que mais sai.
- **Fase 2, opcional — sensor de peso sob a cuba:** a cuba Gastronorm 1/1 (530 × 325 mm) tem tara conhecida; o sensor conta cada reposição como um salto de peso e estima o consumo em gramas por minuto. Não dá o peso exato de cada porção, mas dá uma estimativa boa do que sobra. Cuidados: calor e vapor do banho-maria, peça própria para alimentos e calibração por tipo de cuba e de alimento. **Piloto em 2 ou 3 cubas de maior saída**, e o custo depende do número de cubas (desconhecido).

### 6.5 Avaliação por QR code
- **Precisa de:** adesivos impressos com QR e, se quiserem, um cartão de aproximação (NFC), na mesa junto aos guardanapos.
- **O que faz:** abre direto a avaliação no Google. Para gerar o código, a casa precisa fornecer o ID do local no Google (Place ID).
- **Regra:** sem brinde por avaliação (a política do Google não permite incentivo).

## 7. Painel e alertas

- **Painel do metre:** página web instalável no celular (PWA), com a lista de mesas por praça e os alertas.
- **Alternativa:** notificação por aplicativo de mensagens, se a casa preferir. A integração é a mesma.
- **Quem configura:** a gerência, em **3 ajustes**: tempo até o alerta de atendimento, tempo de mesa suja e a cor do uniforme (opcional).

## 8. Privacidade e LGPD

Recomenda-se **validação jurídica** antes da implantação; o que segue são os princípios do projeto.

- **Sem reconhecimento facial.** O sistema distingue cliente de garçom pela **postura e pelo uniforme**, não por quem a pessoa é.
- **Privacidade por design:** guardar só eventos e contagens; **não armazenar vídeo** por padrão. Se a fase 0 gravar amostras, definir antes quem acessa e por quanto tempo.
- **Processamento local** na rota B; na rota A, as imagens saem da loja, o que exige cláusulas com o fornecedor e mais cuidado.
- **Aviso no salão:** placa visível informando que câmeras com análise de imagem são usadas só para organizar o atendimento, sem identificar pessoas.
- **Retenção mínima** e acesso restrito à gerência.

## 9. Cronograma sugerido (sujeito à fase 0)

| Etapa | O que acontece | Duração sugerida |
|---|---|---|
| Fase 0 | Levantamento, amostras e relatório | 1 a 2 semanas |
| Piloto 1 | Mesas em uma praça, com alertas ao metre | 2 a 4 semanas |
| Piloto 2 | Cubas (2 ou 3) e mix do prato, comparando câmera e sensor | 2 a 4 semanas |
| Revisão | Métricas, decisão de expandir ou ajustar | 1 semana |

## 10. Custos (estrutura, sem números inventados)

Os valores dependem do levantamento. A conta do projeto soma:

| Item | Quando aparece | Observação |
|---|---|---|
| Computador dedicado (rota B) | Piloto | Dimensionar pelo nº de câmeras |
| Câmeras adicionais | Só se a fase 0 achar pontos cegos (buffet, balança) | Recomendação, não obrigação |
| Uso da nuvem (rota A) | Mensal | Fórmula da seção 5 |
| Sensores de peso (fase 2) | Opcional, após o piloto | Depende do nº de cubas |
| Instalação e configuração | Piloto | Horas de técnico |
| Energia e manutenção | Mensal | Baixo |

Para decidir, a gerência compara o custo de cada módulo com o que ele pode evitar: perda de clientes por espera, margem perdida por mix do prato e desperdício por reposição mal feita. **A fase 0 e o piloto servem para medir esses ganhos antes de qualquer expansão.**

## 11. Riscos e como reduzi-los

| Risco | Efeito | Mitigação |
|---|---|---|
| Câmera sem RTSP ou ângulo ruim | Não há vídeo utilizável | Fase 0 testa antes; recomendar câmera adicional |
| Falso alerta (por exemplo, cliente em pé confundido com garçom) | Metre perde a confiança | Cor do uniforme como ajuste; botão de correção; medir a taxa de acerto no piloto |
| Pessoas muito pequenas na imagem | Detecção falha | Reposicionar câmera; afinar o modelo com imagens do salão |
| Servidor sem folga | Lentidão | Computador dedicado (rota B) ou nuvem (rota A) |
| Wi-Fi fraco no salão | Alerta não chega | Testar na fase 0 |
| Resistência da equipe | Alerta ignorado | Alertas poucos e úteis; a IA avisa, não vigia pessoas |
| LGPD | Problema legal | Sem reconhecimento facial, sem vídeo guardado, aviso, validação jurídica |
| Licenças e patentes | Impedimento comercial | Ver nota abaixo |

**Licenças e patentes.** Este é um projeto acadêmico e demonstrativo. Alguns detectores populares usam licença AGPL, e existe patente americana ampla (US11562500B2) sobre classificação de mesa por visão. Uma implantação comercial exigiria revisar licenças e patentes.

## 12. Como saberemos que deu certo (piloto)

| Métrica | Pergunta que responde |
|---|---|
| Tempo até o 1º atendimento | Quanto a mesa espera de fato? |
| Tempo de mesa suja | Quanto demora a limpeza? |
| % de alertas úteis | O metre confia no sistema? |
| Espera na churrasqueira no pico | O gargalo é o que pensamos? |
| Reposições por cuba e horário | O que acaba cedo? |
| Mix do prato × peso | Há margem escondida no prato? |

**Decisão ao final do piloto:** expandir, ajustar (câmera, parâmetros) ou parar. A solução definitiva nasce desses números.

## 13. Perguntas para a Bovinu's na fase 0

1. Quantas cubas tem o buffet e de que tipo?
2. Qual o modelo das câmeras, quantas são e quais áreas enxergam?
3. O gravador libera vídeo por RTSP?
4. O JS Softcom exporta dados? O fornecedor aceita acesso somente-leitura?
5. Os metres usam celular? Qual canal de alerta preferem?
6. A casa aceita colocar o aviso de câmeras e IA no salão?
7. Qual a cor do uniforme dos garçons?
8. Aceitam testar um prato maior e raso?

## 14. Limites do protótipo desta proposta

- A demonstração roda no navegador com um modelo genérico (COCO-SSD). **Foi testada em vídeos de estoque**, e não em imagens da Bovinu's.
- A **fila**, a **lotação** e a **série de reposições das cubas** são **simulações** com hipóteses declaradas, rotuladas como "simulado" na página.
- O mix do prato e o nível das cubas usam **heurísticas de cor**, e não modelos treinados.
- Nenhum número da página foi inventado como se fosse da Bovinu's.

## 15. Referências

- Casos públicos de limites por zona de mesa: [Sciforce — atendimento multizona em restaurantes](https://dev.to/sciforce/optimizing-multi-zone-restaurant-service-with-computer-vision-for-hospitality-1ha8) e [projeto YOLO + ByteTrack de mesas](https://aaryan-kamdar.github.io/projects/cafevision.html).
- [Datasheet Intelbras VIP 9420](https://backend.intelbras.com/sites/default/files/2025-04/Datasheet%20%20V3-%20VIP%209420%203D%20FT%20-%20Site.pdf), sobre os protocolos de vídeo das câmeras IP.
- Parte das fontes é material comercial, patente e projeto de aluno; alegações de precisão **não foram verificadas**.
